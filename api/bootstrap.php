<?php
declare(strict_types=1);

require_once __DIR__ . '/../session-path.php';
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../firebase-admin.php';
require_once __DIR__ . '/../send-email.php';
require_once __DIR__ . '/../buyer-storage.php';
require_once __DIR__ . '/../vendor-subscriptions.php';
require_once __DIR__ . '/../notifications-storage.php';
require_once __DIR__ . '/chat/firebase.php';

const YUSTAM_API_DEFAULT_TTL = 604800; // 7 days
const YUSTAM_API_JSON_FLAGS = JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES;

yustam_api_load_env();

final class YustamApiException extends RuntimeException
{
    public int $statusCode;
    public array $context;

    public function __construct(int $statusCode, string $message, array $context = [], ?Throwable $previous = null)
    {
        parent::__construct($message, 0, $previous);
        $this->statusCode = $statusCode;
        $this->context = $context;
    }
}

function yustam_api_load_env(): void
{
    static $loaded = false;
    if ($loaded) {
        return;
    }
    $loaded = true;

    $envPath = dirname(__DIR__) . '/.env';
    if (!is_file($envPath) || !is_readable($envPath)) {
        return;
    }

    $lines = file($envPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    if (!is_array($lines)) {
        return;
    }

    foreach ($lines as $line) {
        $trimmed = ltrim($line);
        if ($trimmed === '' || $trimmed[0] === '#') {
            continue;
        }
        if (!str_contains($line, '=')) {
            continue;
        }
        [$key, $value] = explode('=', $line, 2);
        $key = trim($key);
        if ($key === '') {
            continue;
        }
        $value = trim($value);
        if (getenv($key) === false) {
            putenv($key . '=' . $value);
            $_ENV[$key] = $value;
            if (!array_key_exists($key, $_SERVER)) {
                $_SERVER[$key] = $value;
            }
        }
    }
}

function yustam_api_env(string $key, ?string $default = null): ?string
{
    $value = $_ENV[$key] ?? $_SERVER[$key] ?? getenv($key);
    if ($value === false || $value === null) {
        return $default;
    }
    $trimmed = trim((string) $value);
    return $trimmed === '' ? $default : $trimmed;
}

function yustam_api_headers(): void
{
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Authorization, Content-Type, X-Requested-With');
    header('Access-Control-Max-Age: 86400');
    header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
    header('Pragma: no-cache');
    header('Expires: 0');
    header('Content-Type: application/json');
}

function yustam_api_json_response(array $payload, int $status = 200): void
{
    http_response_code($status);
    echo json_encode($payload, YUSTAM_API_JSON_FLAGS);
}

function yustam_api_error(int $status, string $message, array $context = []): void
{
    throw new YustamApiException($status, $message, $context);
}

function yustam_api_read_json_body(): array
{
    $raw = file_get_contents('php://input');
    if ($raw === false || trim($raw) === '') {
        return [];
    }
    $decoded = json_decode($raw, true);
    if (json_last_error() !== JSON_ERROR_NONE || !is_array($decoded)) {
        yustam_api_error(400, 'Invalid JSON payload.');
    }
    return $decoded;
}

function yustam_api_jwt_secret(): string
{
    static $secret = null;
    if ($secret !== null) {
        return $secret;
    }
    $envSecret = yustam_api_env('API_JWT_SECRET');
    if ($envSecret && strlen($envSecret) >= 32) {
        return $secret = $envSecret;
    }
    // Fall back to a deterministic hash so tokens remain stable if the secret isn't configured.
    $fallbackSource = yustam_api_env('DB_PASS', 'yustam-marketplace');
    return $secret = hash('sha256', $fallbackSource);
}

function yustam_api_base64url_encode(string $value): string
{
    return rtrim(strtr(base64_encode($value), '+/', '-_'), '=');
}

function yustam_api_base64url_decode(string $value): string
{
    $remainder = strlen($value) % 4;
    if ($remainder) {
        $value .= str_repeat('=', 4 - $remainder);
    }
    return base64_decode(strtr($value, '-_', '+/')) ?: '';
}

function yustam_api_issue_token(array $user, int $ttl = YUSTAM_API_DEFAULT_TTL): string
{
    $now = time();
    $payload = [
        'sub' => $user['id'],
        'role' => $user['role'],
        'uid' => $user['firebaseUid'] ?? null,
        'exp' => $now + max(60, $ttl),
        'iat' => $now,
    ];

    $segments = [
        yustam_api_base64url_encode(json_encode(['alg' => 'HS256', 'typ' => 'JWT'], JSON_THROW_ON_ERROR)),
        yustam_api_base64url_encode(json_encode($payload, JSON_THROW_ON_ERROR)),
    ];

    $signature = hash_hmac('sha256', implode('.', $segments), yustam_api_jwt_secret(), true);
    $segments[] = yustam_api_base64url_encode($signature);

    return implode('.', $segments);
}

function yustam_api_decode_token(string $token): array
{
    $parts = explode('.', $token);
    if (count($parts) !== 3) {
        yustam_api_error(401, 'Invalid authorization token.');
    }
    [$headerB64, $payloadB64, $signatureB64] = $parts;
    $expected = yustam_api_base64url_encode(
        hash_hmac('sha256', $headerB64 . '.' . $payloadB64, yustam_api_jwt_secret(), true)
    );
    if (!hash_equals($expected, $signatureB64)) {
        yustam_api_error(401, 'Invalid authorization token.');
    }
    $payloadJson = yustam_api_base64url_decode($payloadB64);
    $payload = json_decode($payloadJson, true);
    if (!is_array($payload)) {
        yustam_api_error(401, 'Invalid authorization token.');
    }
    if (!empty($payload['exp']) && time() >= (int) $payload['exp']) {
        yustam_api_error(401, 'Session expired. Please sign in again.');
    }
    return $payload;
}

function yustam_api_authorization_token(): ?string
{
    $header = $_SERVER['HTTP_AUTHORIZATION'] ?? ($_SERVER['Authorization'] ?? null);
    if (!$header && function_exists('apache_request_headers')) {
        $headers = apache_request_headers();
        foreach ($headers as $key => $value) {
            if (strcasecmp($key, 'Authorization') === 0) {
                $header = $value;
                break;
            }
        }
    }
    if (!$header) {
        return null;
    }
    if (stripos($header, 'Bearer ') === 0) {
        return trim(substr($header, 7));
    }
    return null;
}

function yustam_api_optional_auth(): ?array
{
    $token = yustam_api_authorization_token();
    if (!$token) {
        return null;
    }
    try {
        $claims = yustam_api_decode_token($token);
        return yustam_api_fetch_user_profile((string) ($claims['sub'] ?? ''));
    } catch (Throwable $exception) {
        return null;
    }
}

function yustam_api_require_auth($roles = null): array
{
    $token = yustam_api_authorization_token();
    if (!$token) {
        yustam_api_error(401, 'Authorization header missing.');
    }
    $claims = yustam_api_decode_token($token);
    $userRef = (string) ($claims['sub'] ?? '');
    if ($userRef === '') {
        yustam_api_error(401, 'Invalid authorization token.');
    }
    $user = yustam_api_fetch_user_profile($userRef);
    if (!$user) {
        yustam_api_error(401, 'Account not found.');
    }
    if ($roles !== null) {
        $allowed = is_array($roles) ? $roles : [$roles];
        if (!in_array($user['role'], $allowed, true)) {
            yustam_api_error(403, 'Insufficient permissions for this action.');
        }
    }
    return $user;
}

function yustam_api_user_reference(string $role, int $id): string
{
    return sprintf('%s:%d', strtolower($role), $id);
}

function yustam_api_parse_user_reference(string $reference): array
{
    $parts = explode(':', $reference, 2);
    if (count($parts) !== 2) {
        return ['', 0];
    }
    return [strtolower($parts[0]), (int) $parts[1]];
}

function yustam_api_fetch_user_profile(string $reference): array
{
    if ($reference === '') {
        return [];
    }
    [$role, $id] = yustam_api_parse_user_reference($reference);
    if ($role === '' || $id <= 0) {
        return [];
    }
    $db = get_db_connection();

    if ($role === 'vendor') {
        $vendor = yustam_vendor_find_by_id($id, $db);
        if (!$vendor) {
            return [];
        }
        $vendorUid = yustam_vendor_assign_uid_if_missing($db, $vendor);
        return [
            'id' => yustam_api_user_reference('vendor', $id),
            'firebaseUid' => $vendor['firebase_uid'] ?? null,
            'role' => 'vendor',
            'email' => $vendor['email'] ?? null,
            'displayName' => yustam_vendor_business_name($vendor),
            'phone' => $vendor['phone'] ?? null,
            'photoUrl' => $vendor['profile_photo'] ?? ($vendor['avatar_url'] ?? null),
            'vendorId' => $vendor['id'],
            'vendorUid' => $vendorUid,
        ];
    }

    if ($role === 'buyer') {
        $buyer = yustam_buyers_find($id);
        if (!$buyer) {
            return [];
        }
        return [
            'id' => yustam_api_user_reference('buyer', $id),
            'firebaseUid' => $buyer['firebase_uid'] ?? null,
            'role' => 'buyer',
            'email' => $buyer['email'] ?? null,
            'displayName' => $buyer['name'] ?? 'Buyer',
            'phone' => $buyer['phone'] ?? null,
            'photoUrl' => null,
            'buyerId' => $buyer['id'],
        ];
    }

    if ($role === 'admin') {
        $admin = yustam_api_lookup_admin_by_id($id);
        if (!$admin) {
            return [];
        }
        return [
            'id' => yustam_api_user_reference('admin', $id),
            'firebaseUid' => $admin['firebase_uid'] ?? null,
            'role' => 'admin',
            'email' => $admin['email'],
            'displayName' => $admin['name'] ?? 'Administrator',
            'phone' => $admin['phone'] ?? null,
            'photoUrl' => null,
            'adminId' => $admin['id'],
        ];
    }

    return [];
}

function yustam_api_lookup_admin_by_email(string $email): ?array
{
    $db = get_db_connection();
    $table = defined('YUSTAM_ADMINS_TABLE') && YUSTAM_ADMINS_TABLE
        ? YUSTAM_ADMINS_TABLE
        : 'admins';
    if (!preg_match('/^[A-Za-z0-9_]+$/', $table)) {
        $table = 'admins';
    }
    $stmt = $db->prepare(sprintf('SELECT * FROM `%s` WHERE email = ? LIMIT 1', $table));
    if (!$stmt instanceof mysqli_stmt) {
        return null;
    }
    $stmt->bind_param('s', $email);
    $stmt->execute();
    $result = $stmt->get_result();
    $admin = $result ? $result->fetch_assoc() : null;
    $stmt->close();
    if (!$admin) {
        return null;
    }
    $admin['id'] = (int) ($admin['id'] ?? 0);
    $admin['email'] = strtolower((string) $admin['email']);
    return $admin;
}

function yustam_api_lookup_admin_by_id(int $adminId): ?array
{
    $db = get_db_connection();
    $table = defined('YUSTAM_ADMINS_TABLE') && YUSTAM_ADMINS_TABLE
        ? YUSTAM_ADMINS_TABLE
        : 'admins';
    if (!preg_match('/^[A-Za-z0-9_]+$/', $table)) {
        $table = 'admins';
    }
    $stmt = $db->prepare(sprintf('SELECT * FROM `%s` WHERE id = ? LIMIT 1', $table));
    if (!$stmt instanceof mysqli_stmt) {
        return null;
    }
    $stmt->bind_param('i', $adminId);
    $stmt->execute();
    $result = $stmt->get_result();
    $admin = $result ? $result->fetch_assoc() : null;
    $stmt->close();
    if (!$admin) {
        return null;
    }
    $admin['id'] = (int) ($admin['id'] ?? 0);
    $admin['email'] = strtolower((string) $admin['email']);
    return $admin;
}

function yustam_api_sync_backend_user(array $firebaseUser): array
{
    $firebaseUid = (string) ($firebaseUser['localId'] ?? $firebaseUser['uid'] ?? '');
    if ($firebaseUid === '') {
        yustam_api_error(422, 'Firebase user information missing.');
    }

    $email = strtolower((string) ($firebaseUser['email'] ?? ''));
    $displayName = trim((string) ($firebaseUser['displayName'] ?? ''));
    $phone = trim((string) ($firebaseUser['phoneNumber'] ?? ''));
    $photoUrl = trim((string) ($firebaseUser['photoUrl'] ?? $firebaseUser['photoURL'] ?? ''));

    $defaultAdminEmail = strtolower(yustam_api_env('DEFAULT_ADMIN_EMAIL', 'admin@yustam.com'));
    $role = 'buyer';
    $vendor = null;
    $buyer = null;
    $admin = null;

    if ($email !== '' && $email === $defaultAdminEmail) {
        $admin = yustam_api_lookup_admin_by_email($email);
        if ($admin) {
            if (!empty($firebaseUid) && (!isset($admin['firebase_uid']) || $admin['firebase_uid'] === '')) {
                $db = get_db_connection();
                $table = defined('YUSTAM_ADMINS_TABLE') ? YUSTAM_ADMINS_TABLE : 'admins';
                if (preg_match('/^[A-Za-z0-9_]+$/', $table)) {
                    $stmt = $db->prepare(sprintf('UPDATE `%s` SET firebase_uid = ? WHERE id = ?', $table));
                    if ($stmt instanceof mysqli_stmt) {
                        $stmt->bind_param('si', $firebaseUid, $admin['id']);
                        $stmt->execute();
                        $stmt->close();
                    }
                }
            }
            $role = 'admin';
        }
    }

    if ($role === 'buyer') {
        $vendor = yustam_vendor_find_by_firebase_uid($firebaseUid);
        if (!$vendor && $email !== '') {
            $vendor = yustam_vendor_find_by_email($email);
        }
        if ($vendor) {
            $role = 'vendor';
            $db = get_db_connection();
            yustam_vendor_set_firebase_uid((int) $vendor['id'], $firebaseUid, $db);
            $vendorUid = yustam_vendor_assign_uid_if_missing($db, $vendor);
            $vendor['vendor_uid'] = $vendorUid;
        }
    }

    if ($role === 'buyer') {
        $buyer = yustam_buyers_find_by_firebase_uid($firebaseUid);
        if (!$buyer && $email !== '') {
            $buyer = yustam_buyers_find_by_email($email);
        }
        if (!$buyer) {
            $buyer = yustam_buyers_create(
                $firebaseUid,
                $displayName ?: ($email !== '' ? explode('@', $email)[0] : 'Buyer'),
                $email !== '' ? $email : sprintf('%s@yustam.local', $firebaseUid),
                $phone,
                password_hash(bin2hex(random_bytes(8)), PASSWORD_BCRYPT),
                'firebase'
            );
        } else {
            yustam_buyers_set_firebase_uid((int) $buyer['id'], $firebaseUid);
        }
    }

    if ($role === 'admin' && $admin) {
        return [
            'id' => yustam_api_user_reference('admin', (int) $admin['id']),
            'role' => 'admin',
            'firebaseUid' => $firebaseUid,
            'email' => $email,
            'displayName' => $displayName ?: ($admin['name'] ?? 'Administrator'),
            'phone' => $phone ?: ($admin['phone'] ?? null),
            'photoUrl' => $photoUrl ?: null,
            'adminId' => (int) $admin['id'],
        ];
    }

    if ($role === 'vendor' && $vendor) {
        if (!yustam_vendor_is_verified($vendor)) {
            $vendor = yustam_vendor_force_verify($vendor);
        }
        $vendorId = (int) $vendor['id'];
        $vendorUid = $vendor['vendor_uid'] ?? yustam_vendor_assign_uid_if_missing(get_db_connection(), $vendor);
        return [
            'id' => yustam_api_user_reference('vendor', $vendorId),
            'role' => 'vendor',
            'firebaseUid' => $firebaseUid,
            'email' => $email,
            'displayName' => yustam_vendor_business_name($vendor),
            'phone' => $vendor['phone'] ?? $phone,
            'photoUrl' => $photoUrl ?: ($vendor['profile_photo'] ?? $vendor['avatar_url'] ?? null),
            'vendorId' => $vendorId,
            'vendorUid' => $vendorUid,
        ];
    }

    $buyerId = (int) ($buyer['id'] ?? 0);
    return [
        'id' => yustam_api_user_reference('buyer', $buyerId),
        'role' => 'buyer',
        'firebaseUid' => $firebaseUid,
        'email' => $email,
        'displayName' => $displayName ?: ($buyer['name'] ?? 'Buyer'),
        'phone' => $buyer['phone'] ?? $phone,
        'photoUrl' => $photoUrl ?: null,
        'buyerId' => $buyerId,
    ];
}

function yustam_vendor_is_verified(array $vendor): bool
{
    if (array_key_exists('verified', $vendor)) {
        return (int) $vendor['verified'] === 1;
    }
    if (array_key_exists('verification_status', $vendor)) {
        $status = strtolower(trim((string) $vendor['verification_status']));
        return in_array($status, ['verified', 'approved', 'active', 'completed', 'complete'], true);
    }
    if (array_key_exists('verificationStatus', $vendor)) {
        $status = strtolower(trim((string) $vendor['verificationStatus']));
        return in_array($status, ['verified', 'approved', 'active', 'completed', 'complete'], true);
    }
    return true;
}

function yustam_vendor_force_verify(array $vendor): array
{
    $vendorId = (int) ($vendor['id'] ?? 0);
    if ($vendorId <= 0) {
        return $vendor;
    }

    $db = get_db_connection();
    $columns = yustam_vendor_table_columns();
    $table = YUSTAM_VENDORS_TABLE;

    $assignments = [];
    $types = '';
    $values = [];

    if (in_array('verified', $columns, true)) {
        $assignments[] = '`verified` = ?';
        $types .= 'i';
        $values[] = 1;
    }
    if (in_array('verification_status', $columns, true)) {
        $assignments[] = "`verification_status` = 'verified'";
    }
    if (in_array('verificationStatus', $columns, true)) {
        $assignments[] = "`verificationStatus` = 'verified'";
    }
    if (in_array('verification_token', $columns, true)) {
        $assignments[] = '`verification_token` = NULL';
    }
    if (in_array('updated_at', $columns, true)) {
        $assignments[] = '`updated_at` = NOW()';
    }

    if (!$assignments) {
        return $vendor;
    }

    $assignmentsSql = implode(', ', $assignments);
    $sql = sprintf('UPDATE `%s` SET %s WHERE id = ? LIMIT 1', $table, $assignmentsSql);
    $stmt = $db->prepare($sql);
    if ($stmt instanceof mysqli_stmt) {
        $types .= 'i';
        $values[] = $vendorId;
        if ($types !== '') {
            $stmt->bind_param($types, ...$values);
        }
        $stmt->execute();
        $stmt->close();
    }

    $updated = yustam_vendor_find_by_id($vendorId, $db);
    return $updated ?? $vendor;
}

function yustam_api_random_string(int $length = 12): string
{
    return substr(bin2hex(random_bytes($length)), 0, $length);
}

function yustam_api_require_vendor(array $authUser): array
{
    if ($authUser['role'] === 'vendor') {
        return $authUser;
    }
    yustam_api_error(403, 'Vendor access required for this action.');
}

function yustam_api_listings_columns(mysqli $db): array
{
    static $columns = null;
    if ($columns !== null) {
        return $columns;
    }
    yustam_listings_ensure_table($db);
    $columns = [];
    $result = $db->query('SHOW COLUMNS FROM `listings`');
    if ($result instanceof mysqli_result) {
        while ($row = $result->fetch_assoc()) {
            if (isset($row['Field'])) {
                $columns[] = $row['Field'];
            }
        }
        $result->free();
    }
    return $columns;
}

function yustam_api_normalise_listing_row(array $row, ?array $vendor = null): array
{
    $images = [];
    if (!empty($row['image_urls'])) {
        $decoded = json_decode((string) $row['image_urls'], true);
        if (is_array($decoded)) {
            $images = array_values(array_filter(array_map('trim', $decoded)));
        }
    }
    $primary = $row['primary_image'] ?? ($images[0] ?? null);
    $vendor = $vendor ?: [];
    $vendorDisplayName = $vendor ? yustam_vendor_business_name($vendor) : ($row['vendor_name'] ?? 'Vendor');
    return [
        'id' => (string) ($row['public_id'] ?? $row['firestore_id'] ?? $row['id'] ?? ''),
        'title' => $row['title'] ?? $row['name'] ?? 'Listing',
        'description' => $row['description'] ?? '',
        'price' => isset($row['price']) ? (float) $row['price'] : null,
        'status' => strtolower((string) ($row['status'] ?? '')),
        'category' => $row['category'] ?? null,
        'subcategory' => $row['subcategory'] ?? null,
        'location' => $row['location'] ?? null,
        'city' => $row['city'] ?? null,
        'state' => $row['state'] ?? null,
        'country' => $row['country'] ?? null,
        'tags' => [],
        'primaryImage' => $primary,
        'images' => $images,
        'ownerId' => isset($vendor['id']) ? yustam_api_user_reference('vendor', (int) $vendor['id']) : null,
        'vendor' => $vendor ? [
            'id' => yustam_api_user_reference('vendor', (int) $vendor['id']),
            'vendorUid' => yustam_vendor_assign_uid_if_missing(get_db_connection(), $vendor),
            'displayName' => $vendorDisplayName,
            'plan' => $vendor['plan'] ?? null,
            'verification' => $vendor['verification_status'] ?? null,
        ] : null,
        'createdAt' => $row['created_at'] ?? null,
        'updatedAt' => $row['updated_at'] ?? null,
    ];
}

function yustam_api_ensure_favorites_table(): void
{
    static $ensured = false;
    if ($ensured) {
        return;
    }
    $db = get_db_connection();
    $sql = <<<SQL
CREATE TABLE IF NOT EXISTS `api_favorites` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_ref` VARCHAR(64) NOT NULL,
    `user_role` VARCHAR(16) NOT NULL,
    `product_id` VARCHAR(128) NOT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY `uniq_user_product` (`user_ref`,`product_id`),
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
SQL;
    $db->query($sql);
    $ensured = true;
}

function yustam_api_ensure_notifications_table(): void
{
    static $ensured = false;
    if ($ensured) {
        return;
    }
    $db = get_db_connection();
    $sql = <<<SQL
CREATE TABLE IF NOT EXISTS `app_notifications` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_ref` VARCHAR(64) NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `body` TEXT NOT NULL,
    `type` VARCHAR(50) NOT NULL DEFAULT 'system',
    `data` JSON NULL,
    `is_read` TINYINT(1) NOT NULL DEFAULT 0,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `read_at` DATETIME NULL,
    PRIMARY KEY (`id`),
    KEY `idx_user_ref` (`user_ref`),
    KEY `idx_is_read` (`is_read`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
SQL;
    $db->query($sql);
    $ensured = true;
}

function yustam_api_ensure_support_tables(): void
{
    static $ensured = false;
    if ($ensured) {
        return;
    }
    $db = get_db_connection();
    $db->query(<<<SQL
CREATE TABLE IF NOT EXISTS `support_tickets` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_ref` VARCHAR(64) NOT NULL,
    `user_role` VARCHAR(16) NOT NULL,
    `subject` VARCHAR(255) NOT NULL,
    `category` VARCHAR(120) NOT NULL,
    `description` TEXT NOT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'open',
    `priority` VARCHAR(20) NOT NULL DEFAULT 'medium',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_user_ref` (`user_ref`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
SQL);

    $db->query(<<<SQL
CREATE TABLE IF NOT EXISTS `support_messages` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `ticket_id` INT UNSIGNED NOT NULL,
    `sender_ref` VARCHAR(64) NOT NULL,
    `sender_role` VARCHAR(16) NOT NULL,
    `body` TEXT NOT NULL,
    `is_internal` TINYINT(1) NOT NULL DEFAULT 0,
    `status` VARCHAR(20) NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_ticket_id` (`ticket_id`),
    CONSTRAINT `fk_support_ticket` FOREIGN KEY (`ticket_id`) REFERENCES `support_tickets`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
SQL);
    $ensured = true;
}

function yustam_api_ensure_verification_table(): void
{
    static $ensured = false;
    if ($ensured) {
        return;
    }
    $db = get_db_connection();
    $db->query(<<<SQL
CREATE TABLE IF NOT EXISTS `vendor_verifications` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `vendor_id` INT NOT NULL,
    `status` VARCHAR(32) NOT NULL DEFAULT 'pending',
    `notes` TEXT NULL,
    `feedback` TEXT NULL,
    `files` LONGTEXT NULL,
    `submitted_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `reviewed_at` DATETIME NULL,
    `reviewer_id` INT NULL,
    PRIMARY KEY (`id`),
    KEY `idx_vendor_id` (`vendor_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
SQL);
    $ensured = true;
}

function yustam_api_ensure_chat_table(): void
{
    static $ensured = false;
    if ($ensured) {
        return;
    }
    $db = get_db_connection();
    $db->query(<<<SQL
CREATE TABLE IF NOT EXISTS `api_chat_threads` (
    `chat_id` VARCHAR(120) NOT NULL,
    `buyer_ref` VARCHAR(64) NOT NULL,
    `vendor_ref` VARCHAR(64) NOT NULL,
    `vendor_uid` VARCHAR(64) NOT NULL,
    `buyer_uid` VARCHAR(64) NOT NULL,
    `admin_ref` VARCHAR(64) NULL,
    `metadata` JSON NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`chat_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
SQL);
    $ensured = true;
}

function yustam_api_vendor_record(array $vendor): array
{
    $conn = get_db_connection();
    $vendorUid = yustam_vendor_assign_uid_if_missing($conn, $vendor);
    return [
        'id' => (int) $vendor['id'],
        'vendorUid' => $vendorUid,
        'displayName' => yustam_vendor_business_name($vendor),
        'email' => $vendor['email'] ?? null,
        'phone' => $vendor['phone'] ?? null,
        'plan' => $vendor['plan'] ?? null,
        'verificationStatus' => $vendor['verification_status'] ?? null,
    ];
}
