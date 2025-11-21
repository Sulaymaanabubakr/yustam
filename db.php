<?php
// Database connection file for YUSTAM Marketplace
error_reporting(E_ALL);
ini_set('display_errors', 1);

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

// Database credentials
define('DB_HOST', 'localhost');
define('DB_USER', 'yustamco_yustam_admin');   // your cPanel DB username
define('DB_PASS', 'Aduagbemi24434$');          // your database password
define('DB_NAME', 'yustamco_yustam_users');    // your database name

// Connection function
function get_db_connection(): mysqli {
    static $conn = null;

    if ($conn instanceof mysqli) {
        return $conn;
    }

    try {
        $conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
        $conn->set_charset('utf8mb4');
    } catch (Exception $e) {
        die('Database connection failed: ' . $e->getMessage());
    }

    return $conn;
}

// Define table constants for clarity
define('YUSTAM_VENDORS_TABLE', 'vendors');
define('YUSTAM_ADMINS_TABLE', 'admins');
if (!defined('YUSTAM_USERS_TABLE')) {
    define('YUSTAM_USERS_TABLE', YUSTAM_VENDORS_TABLE);
}
if (!defined('YUSTAM_LISTINGS_TABLE')) {
    define('YUSTAM_LISTINGS_TABLE', 'listings');
}

/**
 * Retrieve and cache the list of column names on the vendors table.
 */
function yustam_vendor_ensure_uid_column(mysqli $conn): void
{
    try {
        $table = YUSTAM_VENDORS_TABLE;
        $check = $conn->query("SHOW COLUMNS FROM `{$table}` LIKE 'vendor_uid'");
        $hasVendorUid = false;
        if ($check instanceof mysqli_result) {
            $hasVendorUid = $check->num_rows > 0;
            $check->free();
        }
        if (!$hasVendorUid) {
            $conn->query("ALTER TABLE `{$table}` ADD COLUMN `vendor_uid` VARCHAR(20) DEFAULT NULL UNIQUE AFTER `id`");
        }

        $firebaseCheck = $conn->query("SHOW COLUMNS FROM `{$table}` LIKE 'firebase_uid'");
        $hasFirebaseUid = false;
        if ($firebaseCheck instanceof mysqli_result) {
            $hasFirebaseUid = $firebaseCheck->num_rows > 0;
            $firebaseCheck->free();
        }
        if (!$hasFirebaseUid) {
            $conn->query("ALTER TABLE `{$table}` ADD COLUMN `firebase_uid` VARCHAR(128) DEFAULT NULL UNIQUE AFTER `vendor_uid`");
        }
    } catch (Throwable $exception) {
        error_log('Unable to ensure vendor uid columns: ' . $exception->getMessage());
    }
}

function yustam_vendor_table_columns(): array
{
    static $columns = null;

    if (is_array($columns)) {
        return $columns;
    }

    $columns = [];

    try {
        $conn = get_db_connection();
        yustam_vendor_ensure_uid_column($conn);
        $result = $conn->query('SHOW COLUMNS FROM `' . YUSTAM_VENDORS_TABLE . '`');
        if ($result instanceof mysqli_result) {
            while ($row = $result->fetch_assoc()) {
                if (isset($row['Field'])) {
                    $columns[] = $row['Field'];
                }
            }
            $result->free();
        }
    } catch (Throwable $e) {
        error_log('Unable to inspect vendor table columns: ' . $e->getMessage());
    }

    return $columns;
}

function yustam_vendor_table_has_column(string $column): bool
{
    return in_array($column, yustam_vendor_table_columns(), true);
}

function yustam_vendor_name_column(): string
{
    foreach (['full_name', 'name'] as $candidate) {
        if (yustam_vendor_table_has_column($candidate)) {
            return $candidate;
        }
    }

    return 'full_name';
}

function yustam_vendor_business_name(array $vendor): string
{
    $candidates = [
        'business_name',
        'businessName',
        'store_name',
        'storeName',
        'company_name',
        'companyName',
        'brand_name',
        'brandName',
        'trading_name',
        'tradingName',
    ];

    foreach ($candidates as $candidate) {
        if (array_key_exists($candidate, $vendor)) {
            $value = trim((string) $vendor[$candidate]);
            if ($value !== '') {
                return $value;
            }
        }
    }

    foreach (['display_name', 'displayName', 'profile_name', 'profileName'] as $displayKey) {
        if (array_key_exists($displayKey, $vendor)) {
            $value = trim((string) $vendor[$displayKey]);
            if ($value !== '') {
                return $value;
            }
        }
    }

    $nameColumn = yustam_vendor_name_column();
    if (array_key_exists($nameColumn, $vendor)) {
        $value = trim((string) $vendor[$nameColumn]);
        if ($value !== '') {
            return $value;
        }
    }

    foreach (['name', 'full_name', 'fullName'] as $fallback) {
        if (array_key_exists($fallback, $vendor)) {
            $value = trim((string) $vendor[$fallback]);
            if ($value !== '') {
                return $value;
            }
        }
    }

    return '';
}

// Backwards-compatible helpers
function yustam_users_column($name) {
    if ($name === 'name') {
        return yustam_vendor_name_column();
    }
    return $name;
}

function yustam_users_table_has_column($column) {
    return yustam_vendor_table_has_column($column);
}

function yustam_vendor_format_uid(int $sequence): string
{
    if ($sequence < 1) {
        $sequence = 1;
    }

    return sprintf('YUSTAM-VND-%04d', $sequence);
}

function yustam_vendor_next_sequence(mysqli $conn): int
{
    $table = YUSTAM_VENDORS_TABLE;
    $sql = sprintf('SELECT IFNULL(MAX(`id`), 0) + 1 AS next_id FROM `%s`', $table);
    $result = $conn->query($sql);
    if ($result instanceof mysqli_result) {
        $row = $result->fetch_assoc();
        $result->free();
        if (isset($row['next_id'])) {
            $sequence = (int) $row['next_id'];
            return $sequence > 0 ? $sequence : 1;
        }
    }

    return 1;
}

function yustam_generate_vendor_uid(mysqli $conn): string
{
    return yustam_vendor_format_uid(yustam_vendor_next_sequence($conn));
}

/**
 * Create a vendor record while adapting to the current table schema.
 *
 * @return array Created vendor record.
 */
function yustam_vendor_create(mysqli $conn, array $fields): array
{
    yustam_vendor_ensure_uid_column($conn);

    $columns = yustam_vendor_table_columns();
    $table = YUSTAM_VENDORS_TABLE;

    $bindColumns = [];
    $bindValues = [];
    $bindTypes = '';

    $addColumn = function (string $column, string $type, &$value) use (&$bindColumns, &$bindValues, &$bindTypes, $columns): bool {
        if (!in_array($column, $columns, true)) {
            return false;
        }
        $bindColumns[] = $column;
        $bindValues[] = &$value;
        $bindTypes .= $type;
        return true;
    };

    $vendorUidColumnExists = in_array('vendor_uid', $columns, true);
    $vendorUidValue = '';
    if ($vendorUidColumnExists) {
        $addColumn('vendor_uid', 's', $vendorUidValue);
    }

    $firebaseUidValue = isset($fields['firebase_uid']) ? (string) $fields['firebase_uid'] : '';
    if ($firebaseUidValue !== '' && in_array('firebase_uid', $columns, true)) {
        $addColumn('firebase_uid', 's', $firebaseUidValue);
    }

    $emailValue = strtolower(trim((string) ($fields['email'] ?? '')));
    if ($emailValue === '') {
        throw new InvalidArgumentException('Vendor email is required.');
    }

    if (!in_array('email', $columns, true)) {
        throw new RuntimeException('Vendors table is missing the email column.');
    }
    $addColumn('email', 's', $emailValue);

    $nameValue = trim((string) ($fields['name'] ?? ''));
    $nameColumn = yustam_vendor_name_column();
    if ($nameValue !== '' && in_array($nameColumn, $columns, true)) {
        $addColumn($nameColumn, 's', $nameValue);
    }

    $phoneValue = trim((string) ($fields['phone'] ?? ''));
    if (in_array('phone', $columns, true)) {
        $addColumn('phone', 's', $phoneValue);
    }

    $passwordHashValue = (string) ($fields['password_hash'] ?? '');
    if ($passwordHashValue !== '' && in_array('password', $columns, true)) {
        $addColumn('password', 's', $passwordHashValue);
    }

    $businessNameValue = trim((string) ($fields['business_name'] ?? ''));
    if (in_array('business_name', $columns, true)) {
        $addColumn('business_name', 's', $businessNameValue);
    }

    $categoryValue = trim((string) ($fields['category'] ?? ''));
    if (in_array('category', $columns, true)) {
        $addColumn('category', 's', $categoryValue);
    }

    $providerValue = trim((string) ($fields['provider'] ?? ''));
    if (in_array('provider', $columns, true)) {
        if ($providerValue === '') {
            $providerValue = 'email';
        }
        $addColumn('provider', 's', $providerValue);
    }

    if (array_key_exists('verification_token', $fields) && in_array('verification_token', $columns, true)) {
        $verificationTokenValue = $fields['verification_token'];
        if ($verificationTokenValue === null) {
            $verificationTokenValue = '';
        }
        $addColumn('verification_token', 's', $verificationTokenValue);
    }

    if (array_key_exists('verified', $fields) && in_array('verified', $columns, true)) {
        $verifiedValue = (int) $fields['verified'];
        $addColumn('verified', 'i', $verifiedValue);
    }

    if (in_array('created_at', $columns, true)) {
        $createdAtValue = $fields['created_at'] ?? date('Y-m-d H:i:s');
        $addColumn('created_at', 's', $createdAtValue);
    }

    if (in_array('updated_at', $columns, true)) {
        $updatedAtValue = $fields['updated_at'] ?? date('Y-m-d H:i:s');
        $addColumn('updated_at', 's', $updatedAtValue);
    }

    if (!$bindColumns) {
        throw new RuntimeException('Unable to build vendor insert statement for the current schema.');
    }

    $columnSql = implode(', ', array_map(static fn(string $column): string => "`{$column}`", $bindColumns));
    $placeholders = implode(', ', array_fill(0, count($bindColumns), '?'));
    $sql = sprintf('INSERT INTO `%s` (%s) VALUES (%s)', $table, $columnSql, $placeholders);

    $stmt = $conn->prepare($sql);
    if (!$stmt) {
        throw new RuntimeException('Unable to prepare vendor insert statement: ' . $conn->error);
    }

    $stmt->bind_param($bindTypes, ...$bindValues);

    $maxAttempts = 5;
    for ($attempt = 0; $attempt < $maxAttempts; $attempt++) {
        if ($vendorUidColumnExists) {
            $vendorUidValue = yustam_generate_vendor_uid($conn);
        }

        try {
            $stmt->execute();
            break;
        } catch (mysqli_sql_exception $exception) {
            if ($vendorUidColumnExists && (int) $exception->getCode() === 1062 && stripos($exception->getMessage(), 'vendor_uid') !== false) {
                $stmt->reset();
                continue;
            }

            $stmt->close();

            if ((int) $exception->getCode() === 1062) {
                $message = $exception->getMessage();
                if (stripos($message, 'email') !== false) {
                    throw new RuntimeException('This email is already registered.');
                }
                if (stripos($message, 'firebase_uid') !== false) {
                    throw new RuntimeException('This account is already linked to another sign-in method.');
                }
            }

            throw $exception;
        }
    }

    $stmt->close();

    if ($firebaseUidValue !== '' && in_array('firebase_uid', $columns, true)) {
        $vendor = yustam_vendor_find_by_firebase_uid($firebaseUidValue, $conn);
        if ($vendor) {
            return $vendor;
        }
    }

    $vendor = yustam_vendor_find_by_email($emailValue, $conn);
    if (!empty($vendor)) {
        return $vendor;
    }

    throw new RuntimeException('Vendor record could not be created.');
}

function yustam_vendor_assign_uid_if_missing(mysqli $conn, array &$vendor): string
{
    if (!empty($vendor['vendor_uid'])) {
        $vendor['vendor_uid'] = (string) $vendor['vendor_uid'];
        return $vendor['vendor_uid'];
    }

    $id = isset($vendor['id']) ? (int) $vendor['id'] : 0;
    if ($id <= 0) {
        throw new InvalidArgumentException('Vendor record is missing an id for UID assignment.');
    }

    $sql = sprintf('UPDATE `%s` SET `vendor_uid` = ? WHERE `id` = ? LIMIT 1', YUSTAM_VENDORS_TABLE);
    $stmt = $conn->prepare($sql);
    if (!$stmt) {
        throw new RuntimeException('Unable to prepare vendor UID update statement: ' . $conn->error);
    }

    $uidParam = '';
    $stmt->bind_param('si', $uidParam, $id);

    $maxAttempts = 5;
    for ($attempt = 0; $attempt < $maxAttempts; $attempt++) {
        $uidParam = yustam_generate_vendor_uid($conn);
        try {
            $stmt->execute();
            $vendor['vendor_uid'] = $uidParam;
            $stmt->close();
            return $uidParam;
        } catch (mysqli_sql_exception $exception) {
            if ((int) $exception->getCode() === 1062) {
                $stmt->reset();
                continue;
            }
            $stmt->close();
            throw $exception;
        }
    }

    $stmt->close();
    throw new RuntimeException('Unable to assign vendor UID after multiple attempts.');
}

function yustam_vendor_set_firebase_uid(int $vendorId, string $firebaseUid, ?mysqli $conn = null): void
{
    $trimmed = trim($firebaseUid);
    if ($trimmed === '') {
        throw new InvalidArgumentException('Firebase UID cannot be empty.');
    }

    $conn = $conn ?: get_db_connection();
    yustam_vendor_ensure_uid_column($conn);

    $sql = sprintf('UPDATE `%s` SET `firebase_uid` = ? WHERE `id` = ? LIMIT 1', YUSTAM_VENDORS_TABLE);
    $stmt = $conn->prepare($sql);
    if (!$stmt) {
        throw new RuntimeException('Unable to prepare vendor firebase UID update statement: ' . $conn->error);
    }
    $stmt->bind_param('si', $trimmed, $vendorId);
    $stmt->execute();
    $stmt->close();
}

function yustam_vendor_find_by_firebase_uid(string $firebaseUid, ?mysqli $conn = null): ?array
{
    $trimmed = trim($firebaseUid);
    if ($trimmed === '') {
        return null;
    }

    $conn = $conn ?: get_db_connection();
    yustam_vendor_ensure_uid_column($conn);

    $sql = sprintf('SELECT * FROM `%s` WHERE `firebase_uid` = ? LIMIT 1', YUSTAM_VENDORS_TABLE);
    $stmt = $conn->prepare($sql);
    if (!$stmt) {
        throw new RuntimeException('Unable to prepare vendor firebase lookup statement: ' . $conn->error);
    }
    $stmt->bind_param('s', $trimmed);
    $stmt->execute();
    $result = $stmt->get_result();
    $vendor = $result ? $result->fetch_assoc() : null;
    $stmt->close();

    return $vendor ?: null;
}

function yustam_vendor_find_by_id(int $vendorId, ?mysqli $conn = null): ?array
{
    if ($vendorId <= 0) {
        return null;
    }

    $conn = $conn ?: get_db_connection();
    yustam_vendor_ensure_uid_column($conn);

    $sql = sprintf('SELECT * FROM `%s` WHERE `id` = ? LIMIT 1', YUSTAM_VENDORS_TABLE);
    $stmt = $conn->prepare($sql);
    if (!$stmt) {
        throw new RuntimeException('Unable to prepare vendor id lookup statement: ' . $conn->error);
    }
    $stmt->bind_param('i', $vendorId);
    $stmt->execute();
    $result = $stmt->get_result();
    $vendor = $result ? $result->fetch_assoc() : null;
    $stmt->close();

    return $vendor ?: null;
}

function yustam_vendor_find_by_email(string $email, ?mysqli $conn = null): ?array
{
    $normalized = strtolower(trim($email));
    if ($normalized === '') {
        return null;
    }

    $conn = $conn ?: get_db_connection();
    yustam_vendor_ensure_uid_column($conn);
    $table = YUSTAM_VENDORS_TABLE;
    if (!preg_match('/^[A-Za-z0-9_]+$/', $table)) {
        throw new RuntimeException('Invalid vendor table name.');
    }

    $sql = sprintf('SELECT * FROM `%s` WHERE `email` = ? LIMIT 1', $table);
    $stmt = $conn->prepare($sql);
    if (!$stmt) {
        throw new RuntimeException('Unable to prepare vendor email lookup statement: ' . $conn->error);
    }
    $stmt->bind_param('s', $normalized);
    $stmt->execute();
    $result = $stmt->get_result();
    $vendor = $result ? $result->fetch_assoc() : null;
    $stmt->close();

    return $vendor ?: null;
}

function yustam_vendor_find_by_uid(string $vendorUid, ?mysqli $conn = null): ?array
{
    $trimmed = trim($vendorUid);
    if ($trimmed === '') {
        return null;
    }

    $conn = $conn ?: get_db_connection();
    yustam_vendor_ensure_uid_column($conn);

    $sql = sprintf('SELECT * FROM `%s` WHERE `vendor_uid` = ? OR `firebase_uid` = ? LIMIT 1', YUSTAM_VENDORS_TABLE);
    $stmt = $conn->prepare($sql);
    if (!$stmt) {
        throw new RuntimeException('Unable to prepare vendor uid lookup statement: ' . $conn->error);
    }
    $stmt->bind_param('ss', $trimmed, $trimmed);
    $stmt->execute();
    $result = $stmt->get_result();
    $vendor = $result ? $result->fetch_assoc() : null;
    $stmt->close();

    return $vendor ?: null;
}

/**
 * Admin table helpers
 */
function yustam_admin_table_columns(): array
{
    static $columns = null;

    if (is_array($columns)) {
        return $columns;
    }

    $columns = [];

    try {
        $conn = get_db_connection();
        $result = $conn->query('SHOW COLUMNS FROM `' . YUSTAM_ADMINS_TABLE . '`');
        if ($result instanceof mysqli_result) {
            while ($row = $result->fetch_assoc()) {
                if (isset($row['Field'])) {
                    $columns[] = $row['Field'];
                }
            }
            $result->free();
        }
    } catch (Throwable $e) {
        error_log('Unable to inspect admin table columns: ' . $e->getMessage());
    }

    return $columns;
}

function yustam_admin_table_has_column(string $column): bool
{
    return in_array($column, yustam_admin_table_columns(), true);
}

function yustam_admin_email_column(): string
{
    foreach (['email', 'admin_email', 'username'] as $candidate) {
        if (yustam_admin_table_has_column($candidate)) {
            return $candidate;
        }
    }
    return 'email';
}

function yustam_admin_password_column(): string
{
    foreach (['password', 'password_hash', 'passcode'] as $candidate) {
        if (yustam_admin_table_has_column($candidate)) {
            return $candidate;
        }
    }
    return 'password';
}

function yustam_admin_name_column(): string
{
    foreach (['name', 'full_name', 'admin_name'] as $candidate) {
        if (yustam_admin_table_has_column($candidate)) {
            return $candidate;
        }
    }
    return 'name';
}

function yustam_admin_role_column(): ?string
{
    foreach (['role', 'admin_role', 'type'] as $candidate) {
        if (yustam_admin_table_has_column($candidate)) {
            return $candidate;
        }
    }
    return null;
}

function yustam_admin_id_column(): string
{
    foreach (['id', 'admin_id'] as $candidate) {
        if (yustam_admin_table_has_column($candidate)) {
            return $candidate;
        }
    }
    return 'id';
}

function yustam_admin_last_login_column(): ?string
{
    foreach (['last_login_at', 'last_login', 'last_active_at'] as $candidate) {
        if (yustam_admin_table_has_column($candidate)) {
            return $candidate;
        }
    }
    return null;
}

function yustam_admin_updated_column(): ?string
{
    foreach (['updated_at', 'updated_on', 'modified_at'] as $candidate) {
        if (yustam_admin_table_has_column($candidate)) {
            return $candidate;
        }
    }
    return null;
}

function yustam_listings_table_name(): string
{
    return YUSTAM_LISTINGS_TABLE;
}

function yustam_listings_ensure_table(mysqli $conn): void
{
    static $ensured = false;
    if ($ensured) {
        return;
    }

    $table = yustam_listings_table_name();
    if (!preg_match('/^[A-Za-z0-9_]+$/', $table)) {
        throw new RuntimeException('Invalid listings table name.');
    }

    $sql = sprintf(
        'CREATE TABLE IF NOT EXISTS `%s` (
            `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
            `vendor_id` INT UNSIGNED NOT NULL DEFAULT 0,
            `vendor_uid` VARCHAR(128) NOT NULL,
            `firestore_id` VARCHAR(128) NOT NULL,
            `public_id` VARCHAR(128) DEFAULT NULL,
            `title` VARCHAR(255) NOT NULL,
            `description` TEXT NULL,
            `price` DECIMAL(12,2) NULL,
            `status` VARCHAR(32) NOT NULL DEFAULT \'pending\',
            `primary_image` VARCHAR(255) NULL,
            `image_urls` LONGTEXT NULL,
            `video_url` VARCHAR(255) NULL,
            `category` VARCHAR(120) NULL,
            `subcategory` VARCHAR(120) NULL,
            `location` VARCHAR(255) NULL,
            `city` VARCHAR(120) NULL,
            `state` VARCHAR(120) NULL,
            `country` VARCHAR(120) NULL,
            `views` INT UNSIGNED NOT NULL DEFAULT 0,
            `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (`id`),
            UNIQUE KEY `uniq_firestore_id` (`firestore_id`),
            KEY `idx_vendor_id` (`vendor_id`),
            KEY `idx_vendor_uid` (`vendor_uid`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci',
        $table
    );

    $conn->query($sql);

    $columnCheck = $conn->query("SHOW COLUMNS FROM `{$table}` LIKE 'public_id'");
    $hasPublicId = $columnCheck instanceof mysqli_result && $columnCheck->num_rows > 0;
    if ($columnCheck instanceof mysqli_result) {
        $columnCheck->free();
    }
    if (!$hasPublicId) {
        $conn->query("ALTER TABLE `{$table}` ADD COLUMN `public_id` VARCHAR(128) DEFAULT NULL AFTER `firestore_id`");
    }

    $videoColumnCheck = $conn->query("SHOW COLUMNS FROM `{$table}` LIKE 'video_url'");
    $hasVideoColumn = $videoColumnCheck instanceof mysqli_result && $videoColumnCheck->num_rows > 0;
    if ($videoColumnCheck instanceof mysqli_result) {
        $videoColumnCheck->free();
    }
    if (!$hasVideoColumn) {
        $conn->query("ALTER TABLE `{$table}` ADD COLUMN `video_url` VARCHAR(255) NULL AFTER `image_urls`");
    }

    $indexCheck = $conn->query("SHOW INDEX FROM `{$table}` WHERE Key_name = 'uniq_public_id'");
    $hasPublicIndex = $indexCheck instanceof mysqli_result && $indexCheck->num_rows > 0;
    if ($indexCheck instanceof mysqli_result) {
        $indexCheck->free();
    }
    if (!$hasPublicIndex) {
        $conn->query("ALTER TABLE `{$table}` ADD UNIQUE KEY `uniq_public_id` (`public_id`)");
    }

    $ensured = true;
}

function yustam_listings_upsert(mysqli $conn, array $listing): void
{
    $firestoreId = isset($listing['firestore_id']) ? trim((string) $listing['firestore_id']) : '';
    if ($firestoreId === '') {
        return;
    }

    yustam_listings_ensure_table($conn);
    $table = yustam_listings_table_name();

    $columns = [];
    try {
        $result = $conn->query('SHOW COLUMNS FROM `' . $table . '`');
        if ($result instanceof mysqli_result) {
            while ($row = $result->fetch_assoc()) {
                if (isset($row['Field'])) {
                    $columns[] = $row['Field'];
                }
            }
            $result->free();
        }
    } catch (Throwable $exception) {
        $columns = [];
    }

    $hasColumn = static function (string $name) use ($columns): bool {
        return in_array($name, $columns, true);
    };

    $columnVendorUid = null;
    foreach (['vendor_uid', 'vendorUid'] as $candidate) {
        if ($hasColumn($candidate)) {
            $columnVendorUid = $candidate;
            break;
        }
    }

    $columnPrimaryImage = null;
    foreach (['primary_image', 'primaryImage'] as $candidate) {
        if ($hasColumn($candidate)) {
            $columnPrimaryImage = $candidate;
            break;
        }
    }

    $columnImageUrls = null;
    foreach (['image_urls', 'imageUrls'] as $candidate) {
        if ($hasColumn($candidate)) {
            $columnImageUrls = $candidate;
            break;
        }
    }

    $columnVideoUrl = null;
    foreach (['video_url', 'videoUrl'] as $candidate) {
        if ($hasColumn($candidate)) {
            $columnVideoUrl = $candidate;
            break;
        }
    }

    $columnPublicId = $hasColumn('public_id') ? 'public_id' : null;

    $vendorId = isset($listing['vendor_id']) ? (int) $listing['vendor_id'] : 0;
    $vendorUid = trim((string) ($listing['vendor_uid'] ?? ''));
    if ($vendorUid === '' && $vendorId > 0) {
        try {
            $vendorRecord = yustam_vendor_find_by_id($vendorId, $conn);
            if ($vendorRecord) {
                $vendorUid = yustam_vendor_assign_uid_if_missing($conn, $vendorRecord);
            }
        } catch (Throwable $exception) {
            $vendorUid = '';
        }
    }
    if ($vendorUid === '' && $vendorId > 0) {
        $vendorUid = sprintf('vendor-%d', $vendorId);
    }

    $title = trim((string) ($listing['title'] ?? 'Marketplace Listing'));
    if ($title === '') {
        $title = 'Marketplace Listing';
    }
    $description = (string) ($listing['description'] ?? '');
    $status = trim((string) ($listing['status'] ?? 'pending'));
    if ($status === '') {
        $status = 'pending';
    }

    $priceValue = null;
    if (isset($listing['price']) && $listing['price'] !== '') {
        $numeric = preg_replace('/[^0-9.\-]/', '', (string) $listing['price']);
        if ($numeric !== '' && is_numeric($numeric)) {
            $priceValue = (float) $numeric;
        }
    }

    $primaryImage = trim((string) ($listing['primary_image'] ?? $listing['image'] ?? ''));

    $imagePayload = $listing['image_urls'] ?? ($listing['images'] ?? null);
    if (is_array($imagePayload)) {
        $imageUrls = json_encode(array_values(array_filter(
            array_map(static fn($value) => is_string($value) ? trim($value) : '', $imagePayload)
        )), JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    } elseif (is_string($imagePayload)) {
        $imageUrls = trim($imagePayload);
    } else {
        $imageUrls = '';
    }

    $videoUrlValue = '';
    if (array_key_exists('video_url', $listing) && is_string($listing['video_url'])) {
        $videoUrlValue = trim($listing['video_url']);
    } elseif (array_key_exists('videoUrl', $listing) && is_string($listing['videoUrl'])) {
        $videoUrlValue = trim($listing['videoUrl']);
    }

    $category = trim((string) ($listing['category'] ?? ''));
    $subcategory = trim((string) ($listing['subcategory'] ?? ''));
    $location = trim((string) ($listing['location'] ?? ''));
    $city = trim((string) ($listing['city'] ?? ''));
    $state = trim((string) ($listing['state'] ?? ''));
    $country = trim((string) ($listing['country'] ?? ''));

    $publicId = trim((string) ($listing['public_id'] ?? ''));
    if ($publicId === '') {
        $publicId = $firestoreId;
    }

    if (!$hasColumn('firestore_id')) {
        throw new RuntimeException('Listings table is missing the firestore_id column.');
    }

    $insertColumns = ['`vendor_id`', '`firestore_id`'];
    $placeholders = ['?', '?'];
    $types = 'is';
    $values = [ $vendorId, $firestoreId ];
    $updateClauses = ['`vendor_id` = VALUES(`vendor_id`)'];

    if ($columnVendorUid !== null) {
        $insertColumns[] = '`' . $columnVendorUid . '`';
        $placeholders[] = '?';
        $types .= 's';
        $values[] = $vendorUid;
        $updateClauses[] = '`' . $columnVendorUid . '` = VALUES(`' . $columnVendorUid . '`)';
    }

    if ($columnPublicId !== null) {
        $insertColumns[] = '`' . $columnPublicId . '`';
        $placeholders[] = '?';
        $types .= 's';
        $values[] = $publicId;
        $updateClauses[] = '`' . $columnPublicId . '` = VALUES(`' . $columnPublicId . '`)';
    }

    if ($hasColumn('title')) {
        $insertColumns[] = '`title`';
        $placeholders[] = '?';
        $types .= 's';
        $values[] = $title;
        $updateClauses[] = '`title` = VALUES(`title`)';
    }

    if ($hasColumn('description')) {
        $insertColumns[] = '`description`';
        $placeholders[] = '?';
        $types .= 's';
        $values[] = $description;
        $updateClauses[] = '`description` = VALUES(`description`)';
    }

    if ($hasColumn('price') && $priceValue !== null) {
        $insertColumns[] = '`price`';
        $placeholders[] = '?';
        $types .= 'd';
        $values[] = $priceValue;
        $updateClauses[] = '`price` = VALUES(`price`)';
    }

    if ($hasColumn('status')) {
        $insertColumns[] = '`status`';
        $placeholders[] = '?';
        $types .= 's';
        $values[] = $status;
        $updateClauses[] = '`status` = VALUES(`status`)';
    }

    if ($columnPrimaryImage !== null) {
        $insertColumns[] = '`' . $columnPrimaryImage . '`';
        $placeholders[] = '?';
        $types .= 's';
        $values[] = $primaryImage;
        $updateClauses[] = '`' . $columnPrimaryImage . '` = VALUES(`' . $columnPrimaryImage . '`)';
    }

    if ($columnImageUrls !== null) {
        $insertColumns[] = '`' . $columnImageUrls . '`';
        $placeholders[] = '?';
        $types .= 's';
        $values[] = $imageUrls;
        $updateClauses[] = '`' . $columnImageUrls . '` = VALUES(`' . $columnImageUrls . '`)';
    }

    if ($columnVideoUrl !== null) {
        $insertColumns[] = '`' . $columnVideoUrl . '`';
        $placeholders[] = '?';
        $types .= 's';
        $values[] = $videoUrlValue;
        $updateClauses[] = '`' . $columnVideoUrl . '` = VALUES(`' . $columnVideoUrl . '`)';
    }

    if ($hasColumn('category')) {
        $insertColumns[] = '`category`';
        $placeholders[] = '?';
        $types .= 's';
        $values[] = $category;
        $updateClauses[] = '`category` = VALUES(`category`)';
    }

    if ($hasColumn('subcategory')) {
        $insertColumns[] = '`subcategory`';
        $placeholders[] = '?';
        $types .= 's';
        $values[] = $subcategory;
        $updateClauses[] = '`subcategory` = VALUES(`subcategory`)';
    }

    if ($hasColumn('location')) {
        $insertColumns[] = '`location`';
        $placeholders[] = '?';
        $types .= 's';
        $values[] = $location;
        $updateClauses[] = '`location` = VALUES(`location`)';
    }

    if ($hasColumn('city')) {
        $insertColumns[] = '`city`';
        $placeholders[] = '?';
        $types .= 's';
        $values[] = $city;
        $updateClauses[] = '`city` = VALUES(`city`)';
    }

    if ($hasColumn('state')) {
        $insertColumns[] = '`state`';
        $placeholders[] = '?';
        $types .= 's';
        $values[] = $state;
        $updateClauses[] = '`state` = VALUES(`state`)';
    }

    if ($hasColumn('country')) {
        $insertColumns[] = '`country`';
        $placeholders[] = '?';
        $types .= 's';
        $values[] = $country;
        $updateClauses[] = '`country` = VALUES(`country`)';
    }

    if (count($insertColumns) < 3) {
        return;
    }

    $sql = sprintf(
        'INSERT INTO `%s` (%s) VALUES (%s) ON DUPLICATE KEY UPDATE %s',
        $table,
        implode(', ', $insertColumns),
        implode(', ', $placeholders),
        implode(', ', $updateClauses)
    );

    $stmt = $conn->prepare($sql);
    if (!$stmt) {
        throw new RuntimeException('Unable to prepare listings upsert statement: ' . $conn->error);
    }

    $bindValues = [];
    foreach ($values as $index => $value) {
        $bindValues[$index] = $value;
    }
    $bindParams = [$types];
    foreach ($bindValues as $index => &$value) {
        $bindParams[] = &$value;
    }

    call_user_func_array([$stmt, 'bind_param'], $bindParams);
    $stmt->execute();
    $stmt->close();
}

/**
 * -------------------------------------------------------------------------
 * Chat helpers
 * -------------------------------------------------------------------------
 */
function yustam_chat_build_id(string $buyerUid, string $vendorUid): string
{
    $buyer = trim($buyerUid);
    $vendor = trim($vendorUid);
    if ($buyer === '' || $vendor === '') {
        throw new InvalidArgumentException('Buyer and vendor Firebase UIDs are required to build chat id.');
    }

    return hash('fnv164', $buyer . '|' . $vendor);
}


