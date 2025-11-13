<?php
declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';

yustam_api_headers();

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    yustam_api_json_response(['success' => true]);
    return;
}

try {
    $result = yustam_api_dispatch();
    if ($result === null) {
        $result = ['success' => true];
    }
    yustam_api_json_response($result);
} catch (YustamApiException $apiError) {
    $payload = ['success' => false, 'message' => $apiError->getMessage()] + $apiError->context;
    yustam_api_json_response($payload, $apiError->statusCode);
} catch (Throwable $unexpected) {
    error_log('API error: ' . $unexpected->getMessage());
    yustam_api_json_response(['success' => false, 'message' => 'Internal server error.'], 500);
}

function yustam_api_dispatch(): array
{
    $method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
    $uriPath = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?? '/';
    $path = preg_replace('#^/api#i', '', $uriPath);
    $segments = array_values(array_filter(explode('/', trim((string) $path, '/'))));
    $resource = strtolower($segments[0] ?? '');
    $subSegments = array_slice($segments, 1);

    if ($resource === '' || $resource === 'index.php') {
        return [
            'success' => true,
            'message' => 'Yustam API is online.',
        ];
    }

    switch ($resource) {
        case 'auth':
            return yustam_api_handle_auth($method, $subSegments);
        case 'home':
            return yustam_api_handle_home();
        case 'categories':
            return yustam_api_handle_categories();
        case 'products':
            return yustam_api_handle_products($method, $subSegments);
        case 'vendor':
            return yustam_api_handle_vendor($method, $subSegments);
        case 'plans':
            return yustam_api_handle_plans($method, $subSegments);
        case 'favorites':
            return yustam_api_handle_favorites($method, $subSegments);
        case 'notifications':
            return yustam_api_handle_notifications($method, $subSegments);
        case 'support':
            return yustam_api_handle_support($method, $subSegments);
        case 'verification':
            return yustam_api_handle_verification($method, $subSegments);
        case 'chats':
            return yustam_api_handle_chats($method, $subSegments);
        case 'admin':
            return yustam_api_handle_admin($method, $subSegments);
        default:
            yustam_api_error(404, 'Endpoint not found.');
    }
}

function yustam_api_handle_auth(string $method, array $segments): array
{
    $action = strtolower($segments[0] ?? '');

    if ($action === 'register' && $method === 'POST') {
        return yustam_api_auth_register();
    }
    if ($action === 'session' && $method === 'POST') {
        return yustam_api_auth_session();
    }
    if ($action === 'me') {
        if ($method === 'GET') {
            $user = yustam_api_require_auth();
            return ['success' => true, 'user' => $user];
        }
        if ($method === 'PATCH') {
            return yustam_api_auth_update_profile();
        }
    }
    if ($action === '' && $method === 'GET') {
        $admin = yustam_api_require_auth('admin');
        return yustam_api_auth_list_users($admin);
    }

    yustam_api_error(404, 'Auth endpoint not found.');
}

function yustam_api_handle_home(): array
{
    return ['success' => true, 'data' => yustam_api_build_home_feed()];
}

function yustam_api_handle_categories(): array
{
    return ['success' => true, 'categories' => yustam_api_category_list()];
}

function yustam_api_handle_products(string $method, array $segments): array
{
    if ($method === 'GET' && empty($segments)) {
        return yustam_api_products_list();
    }
    if ($method === 'POST' && empty($segments)) {
        return yustam_api_products_create();
    }
    $productId = $segments[0] ?? '';
    if ($productId === '') {
        yustam_api_error(404, 'Product ID missing.');
    }
    if ($method === 'GET') {
        return yustam_api_products_get($productId);
    }
    if ($method === 'PATCH') {
        return yustam_api_products_update($productId);
    }
    if ($method === 'DELETE') {
        return yustam_api_products_delete($productId);
    }
    yustam_api_error(405, 'Method not allowed for products.');
}

function yustam_api_handle_vendor(string $method, array $segments): array
{
    $action = strtolower($segments[0] ?? '');
    if ($action === 'activate' && $method === 'POST') {
        return yustam_api_vendor_activate();
    }
    if ($action === 'storefront' && $method === 'GET' && isset($segments[1])) {
        return yustam_api_vendor_storefront($segments[1]);
    }
    if ($action === 'me') {
        if ($method === 'GET' && empty($segments[1])) {
            return yustam_api_vendor_profile();
        }
        $subAction = strtolower($segments[1] ?? '');
        if ($subAction === '' && $method === 'PATCH') {
            return yustam_api_vendor_update_profile();
        }
        if ($subAction === 'dashboard' && $method === 'GET') {
            return yustam_api_vendor_dashboard();
        }
        if ($subAction === 'analytics' && $method === 'GET') {
            return yustam_api_vendor_analytics();
        }
    }
    yustam_api_error(404, 'Vendor endpoint not found.');
}

function yustam_api_handle_plans(string $method, array $segments): array
{
    if ($method === 'GET' && empty($segments)) {
        return ['success' => true, 'plans' => yustam_api_plan_catalog()];
    }
    if ($method === 'GET' && $segments[0] === 'subscriptions' && ($segments[1] ?? '') === 'me') {
        return yustam_api_plan_subscriptions();
    }
    if ($method === 'POST' && isset($segments[0], $segments[1]) && $segments[1] === 'subscribe') {
        return yustam_api_plan_subscribe($segments[0]);
    }
    if ($method === 'POST' && isset($segments[0], $segments[1]) && $segments[1] === 'checkout') {
        return yustam_api_plan_checkout($segments[0]);
    }
    if (
        ($method === 'POST' && empty($segments)) ||
        ($method === 'GET' && isset($segments[0]) && $segments[0] === 'callback')
    ) {
        return yustam_api_plan_callback();
    }
    yustam_api_error(404, 'Plans endpoint not found.');
}

function yustam_api_handle_favorites(string $method, array $segments): array
{
    if ($method === 'GET' && empty($segments)) {
        return yustam_api_favorites_list();
    }
    if ($method === 'POST' && empty($segments)) {
        return yustam_api_favorites_add();
    }
    if ($method === 'DELETE' && isset($segments[0])) {
        return yustam_api_favorites_remove($segments[0]);
    }
    yustam_api_error(405, 'Favorites endpoint not found.');
}

function yustam_api_handle_notifications(string $method, array $segments): array
{
    if ($method === 'GET') {
        return yustam_api_notifications_list();
    }
    $action = strtolower($segments[0] ?? '');
    if ($method === 'POST' && $action === 'read') {
        return yustam_api_notifications_mark_many();
    }
    if ($method === 'POST' && $action === 'read-all') {
        return yustam_api_notifications_mark_all();
    }
    if ($method === 'POST' && $action === '') {
        return yustam_api_notifications_create();
    }
    yustam_api_error(405, 'Notifications endpoint not found.');
}

function yustam_api_handle_support(string $method, array $segments): array
{
    if ($method === 'GET' && empty($segments)) {
        return yustam_api_support_list();
    }
    if ($method === 'POST' && empty($segments)) {
        return yustam_api_support_create();
    }
    $ticketId = $segments[0] ?? '';
    if ($ticketId === '') {
        yustam_api_error(404, 'Ticket not found.');
    }
    if ($method === 'GET') {
        return yustam_api_support_get($ticketId);
    }
    if ($method === 'POST' && isset($segments[1]) && $segments[1] === 'messages') {
        return yustam_api_support_add_message($ticketId);
    }
    yustam_api_error(405, 'Support endpoint not found.');
}

function yustam_api_handle_verification(string $method, array $segments): array
{
    if (empty($segments)) {
        if ($method === 'GET') {
            return yustam_api_verification_get_current();
        }
        if ($method === 'POST') {
            return yustam_api_verification_submit();
        }
    }
    if ($segments[0] === 'requests') {
        if ($method === 'GET') {
            return yustam_api_verification_list_requests();
        }
        if ($method === 'PATCH' && isset($segments[1])) {
            return yustam_api_verification_update_request($segments[1]);
        }
    }
    yustam_api_error(404, 'Verification endpoint not found.');
}

function yustam_api_handle_chats(string $method, array $segments): array
{
    if ($method === 'GET' && empty($segments)) {
        return yustam_api_chats_list();
    }
    if ($method === 'POST' && empty($segments)) {
        return yustam_api_chats_open();
    }
    $threadId = $segments[0] ?? '';
    if ($threadId === '') {
        yustam_api_error(404, 'Chat thread not found.');
    }
    if ($method === 'POST' && isset($segments[1])) {
        $action = strtolower($segments[1]);
        if ($action === 'assign') {
            return yustam_api_chats_assign($threadId);
        }
        if ($action === 'messages') {
            return yustam_api_chats_send_message($threadId);
        }
        if ($action === 'read') {
            return yustam_api_chats_mark_read($threadId);
        }
    }
    if ($method === 'GET' && isset($segments[1]) && $segments[1] === 'messages') {
        return yustam_api_chats_list_messages($threadId);
    }
    yustam_api_error(405, 'Chat endpoint not found.');
}

function yustam_api_handle_admin(string $method, array $segments): array
{
    $admin = yustam_api_require_auth('admin');
    $resource = strtolower($segments[0] ?? '');

    switch ($resource) {
        case 'dashboard':
            return yustam_api_admin_dashboard();
        case 'products':
            return yustam_api_admin_products();
        case 'users':
            return yustam_api_admin_users();
        case 'vendors':
            return yustam_api_admin_vendors();
        case 'verifications':
            return yustam_api_admin_verifications();
        case 'support':
            if (($segments[1] ?? '') === 'tickets') {
                return yustam_api_admin_support_tickets();
            }
            break;
        case 'plans':
            return yustam_api_admin_plans();
    }

    yustam_api_error(404, 'Admin endpoint not found.');
}

/**
 * --------------------------------------------------------------------------
 * Authentication
 * --------------------------------------------------------------------------
 */
function yustam_api_auth_register(): array
{
    $body = yustam_api_read_json_body();
    $email = strtolower(trim((string) ($body['email'] ?? '')));
    $password = (string) ($body['password'] ?? '');
    $displayName = trim((string) ($body['displayName'] ?? $body['name'] ?? ''));
    $phone = trim((string) ($body['phone'] ?? $body['phoneNumber'] ?? ''));

    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        yustam_api_error(422, 'A valid email address is required.');
    }
    if (strlen($password) < 6) {
        yustam_api_error(422, 'Password must be at least 6 characters.');
    }

    try {
        $firebaseUser = yustam_firebase_create_user($email, $password, $displayName);
    } catch (YustamFirebaseAuthException $authError) {
        yustam_api_error(400, $authError->getMessage());
    }

    $profile = [
        'localId' => $firebaseUser['localId'] ?? '',
        'email' => $email,
        'displayName' => $displayName,
        'phoneNumber' => $phone,
        'photoUrl' => $body['photoUrl'] ?? null,
    ];

    $user = yustam_api_sync_backend_user($profile);
    $token = yustam_api_issue_token($user);

    return [
        'success' => true,
        'user' => $user,
        'token' => $token,
    ];
}

function yustam_api_auth_session(): array
{
    $body = yustam_api_read_json_body();
    $idToken = trim((string) ($body['idToken'] ?? ''));
    if ($idToken === '') {
        yustam_api_error(400, 'Firebase idToken is required.');
    }

    try {
        $firebaseUser = yustam_firebase_lookup_id_token($idToken);
    } catch (YustamFirebaseAuthException $authError) {
        yustam_api_error(401, $authError->getMessage());
    }

    $user = yustam_api_sync_backend_user($firebaseUser);
    $token = yustam_api_issue_token($user);

    return [
        'success' => true,
        'user' => $user,
        'token' => $token,
    ];
}

function yustam_api_auth_update_profile(): array
{
    $user = yustam_api_require_auth();
    $body = yustam_api_read_json_body();
    $displayName = isset($body['displayName']) ? trim((string) $body['displayName']) : null;
    $phone = isset($body['phone']) ? trim((string) $body['phone']) : null;
    $photoUrl = isset($body['photoUrl']) ? trim((string) $body['photoUrl']) : null;

    if ($displayName === null && $phone === null && $photoUrl === null) {
        yustam_api_error(400, 'Nothing to update.');
    }

    $db = get_db_connection();

    switch ($user['role']) {
        case 'vendor':
            $fields = [];
            $types = '';
            $values = [];
            if ($displayName !== null) {
                if (yustam_vendor_table_has_column('business_name')) {
                    $fields[] = '`business_name` = ?';
                    $types .= 's';
                    $values[] = $displayName;
                } elseif (yustam_vendor_table_has_column('full_name')) {
                    $fields[] = '`full_name` = ?';
                    $types .= 's';
                    $values[] = $displayName;
                }
            }
            if ($phone !== null && yustam_vendor_table_has_column('phone')) {
                $fields[] = '`phone` = ?';
                $types .= 's';
                $values[] = $phone;
            }
            if ($photoUrl !== null && yustam_vendor_table_has_column('profile_photo')) {
                $fields[] = '`profile_photo` = ?';
                $types .= 's';
                $values[] = $photoUrl;
            }
            if (!$fields) {
                break;
            }
            $sql = sprintf('UPDATE `%s` SET %s WHERE id = ? LIMIT 1', YUSTAM_VENDORS_TABLE, implode(', ', $fields));
            $stmt = $db->prepare($sql);
            if ($stmt instanceof mysqli_stmt) {
                $types .= 'i';
                $values[] = (int) ($user['vendorId'] ?? 0);
                $stmt->bind_param($types, ...$values);
                $stmt->execute();
                $stmt->close();
            }
            $user = yustam_api_fetch_user_profile($user['id']);
            break;

        case 'buyer':
            $fields = [];
            $types = '';
            $values = [];
            if ($displayName !== null) {
                $fields[] = '`name` = ?';
                $types .= 's';
                $values[] = $displayName;
            }
            if ($phone !== null) {
                $fields[] = '`phone` = ?';
                $types .= 's';
                $values[] = $phone;
            }
            if ($fields) {
                $sql = 'UPDATE `buyers` SET ' . implode(', ', $fields) . ' WHERE id = ? LIMIT 1';
                $stmt = $db->prepare($sql);
                if ($stmt instanceof mysqli_stmt) {
                    $types .= 'i';
                    $values[] = (int) ($user['buyerId'] ?? 0);
                    $stmt->bind_param($types, ...$values);
                    $stmt->execute();
                    $stmt->close();
                }
            }
            $user = yustam_api_fetch_user_profile($user['id']);
            break;

        case 'admin':
            $admin = yustam_api_lookup_admin_by_id((int) ($user['adminId'] ?? 0));
            if ($admin) {
                $fields = [];
                $types = '';
                $values = [];
                if ($displayName !== null && array_key_exists('name', $admin)) {
                    $fields[] = '`name` = ?';
                    $types .= 's';
                    $values[] = $displayName;
                }
                if ($phone !== null && array_key_exists('phone', $admin)) {
                    $fields[] = '`phone` = ?';
                    $types .= 's';
                    $values[] = $phone;
                }
                if ($fields) {
                    $table = defined('YUSTAM_ADMINS_TABLE') ? YUSTAM_ADMINS_TABLE : 'admins';
                    if (!preg_match('/^[A-Za-z0-9_]+$/', $table)) {
                        $table = 'admins';
                    }
                    $sql = sprintf('UPDATE `%s` SET %s WHERE id = ? LIMIT 1', $table, implode(', ', $fields));
                    $stmt = $db->prepare($sql);
                    if ($stmt instanceof mysqli_stmt) {
                        $types .= 'i';
                        $values[] = (int) $admin['id'];
                        $stmt->bind_param($types, ...$values);
                        $stmt->execute();
                        $stmt->close();
                    }
                }
                $user = yustam_api_fetch_user_profile($user['id']);
            }
            break;
    }

    return ['success' => true, 'user' => $user];
}

function yustam_api_auth_list_users(array $admin): array
{
    $conn = yustam_buyers_connection();

    $buyers = [];
    $buyerResult = $conn->query('SELECT id, buyer_uid, name, email, phone, joined_at FROM buyers ORDER BY joined_at DESC LIMIT 50');
    if ($buyerResult instanceof mysqli_result) {
        while ($row = $buyerResult->fetch_assoc()) {
            $buyers[] = [
                'id' => yustam_api_user_reference('buyer', (int) $row['id']),
                'displayName' => $row['name'] ?? 'Buyer',
                'email' => $row['email'] ?? null,
                'phone' => $row['phone'] ?? null,
                'joinedAt' => $row['joined_at'] ?? null,
            ];
        }
        $buyerResult->free();
    }

    $vendors = [];
    $vendorResult = $conn->query(sprintf(
        'SELECT id, email, phone, business_name, plan, verification_status, created_at FROM `%s` ORDER BY created_at DESC LIMIT 50',
        YUSTAM_VENDORS_TABLE
    ));
    if ($vendorResult instanceof mysqli_result) {
        while ($row = $vendorResult->fetch_assoc()) {
            $vendors[] = [
                'id' => yustam_api_user_reference('vendor', (int) $row['id']),
                'displayName' => $row['business_name'] ?? 'Vendor',
                'email' => $row['email'] ?? null,
                'phone' => $row['phone'] ?? null,
                'plan' => $row['plan'] ?? null,
                'verificationStatus' => $row['verification_status'] ?? null,
                'createdAt' => $row['created_at'] ?? null,
            ];
        }
        $vendorResult->free();
    }

    return [
        'success' => true,
        'users' => [
            'buyers' => $buyers,
            'vendors' => $vendors,
        ],
    ];
}

/**
 * --------------------------------------------------------------------------
 * Vendor
 * --------------------------------------------------------------------------
 */
function yustam_api_vendor_activate(): array
{
    $auth = yustam_api_require_auth();
    $payload = yustam_api_read_json_body();
    $businessName = trim((string) ($payload['businessName'] ?? $payload['storeName'] ?? $auth['displayName'] ?? 'Marketplace Vendor'));

    $db = get_db_connection();
    $vendor = null;

    if ($auth['role'] === 'vendor' && !empty($auth['vendorId'])) {
        $vendor = yustam_vendor_find_by_id((int) $auth['vendorId'], $db);
    }

    if (!$vendor && !empty($auth['firebaseUid'])) {
        $vendor = yustam_vendor_find_by_firebase_uid($auth['firebaseUid'], $db);
    }

    if (!$vendor && !empty($auth['email'])) {
        $vendor = yustam_vendor_find_by_email($auth['email'], $db);
    }

    if (!$vendor) {
        $passwordHash = password_hash(yustam_api_random_string(12), PASSWORD_BCRYPT);
        $vendor = yustam_vendor_create($db, [
            'firebase_uid' => $auth['firebaseUid'] ?? null,
            'email' => $auth['email'] ?? sprintf('%s@yustam.local', yustam_api_random_string(6)),
            'name' => $businessName,
            'business_name' => $businessName,
            'phone' => $auth['phone'] ?? '',
            'password_hash' => $passwordHash,
            'provider' => 'firebase',
        ]);
    }

    $vendorProfile = yustam_api_vendor_profile_payload($vendor);
    return ['success' => true, 'profile' => $vendorProfile];
}

function yustam_api_vendor_storefront(string $identifier): array
{
    $db = get_db_connection();
    $vendor = null;

    if (ctype_digit($identifier)) {
        $vendor = yustam_vendor_find_by_id((int) $identifier, $db);
    }
    if (!$vendor) {
        $vendor = yustam_vendor_find_by_uid($identifier, $db);
    }
    if (!$vendor) {
        $vendor = yustam_vendor_find_by_firebase_uid($identifier, $db);
    }
    if (!$vendor && yustam_vendor_table_has_column('storefront_slug')) {
        $stmt = $db->prepare(sprintf('SELECT * FROM `%s` WHERE `storefront_slug` = ? LIMIT 1', YUSTAM_VENDORS_TABLE));
        if ($stmt instanceof mysqli_stmt) {
            $stmt->bind_param('s', $identifier);
            $stmt->execute();
            $result = $stmt->get_result();
            $vendor = $result ? $result->fetch_assoc() : null;
            $stmt->close();
        }
    }

    if (!$vendor) {
        yustam_api_error(404, 'Vendor storefront not found.');
    }

    $vendorPayload = yustam_api_vendor_profile_payload($vendor);
    $listings = yustam_api_fetch_listings([
        'ownerId' => yustam_api_user_reference('vendor', (int) $vendor['id']),
        'limit' => 36,
    ])['items'];

    return [
        'success' => true,
        'vendor' => $vendorPayload,
        'listings' => $listings,
    ];
}

function yustam_api_vendor_profile(): array
{
    $user = yustam_api_require_auth(['vendor', 'admin']);
    $targetVendorId = null;
    if ($user['role'] === 'vendor') {
        $targetVendorId = (int) ($user['vendorId'] ?? 0);
    } elseif (isset($_GET['vendorId'])) {
        [$role, $id] = yustam_api_parse_user_reference((string) $_GET['vendorId']);
        if ($role === 'vendor') {
            $targetVendorId = $id;
        }
    }

    if (!$targetVendorId) {
        yustam_api_error(404, 'Vendor profile not found.');
    }

    $db = get_db_connection();
    $vendor = yustam_vendor_find_by_id($targetVendorId, $db);
    if (!$vendor) {
        yustam_api_error(404, 'Vendor profile not found.');
    }

    return ['success' => true, 'profile' => yustam_api_vendor_profile_payload($vendor)];
}

function yustam_api_vendor_update_profile(): array
{
    $user = yustam_api_require_auth(['vendor', 'admin']);
    $payload = yustam_api_read_json_body();
    $db = get_db_connection();

    $targetVendorId = null;
    if ($user['role'] === 'vendor') {
        $targetVendorId = (int) ($user['vendorId'] ?? 0);
    } elseif (!empty($payload['vendorId'])) {
        [$role, $id] = yustam_api_parse_user_reference((string) $payload['vendorId']);
        if ($role === 'vendor') {
            $targetVendorId = $id;
        }
    }

    if (!$targetVendorId) {
        yustam_api_error(404, 'Vendor profile not found.');
    }

    $vendor = yustam_vendor_find_by_id($targetVendorId, $db);
    if (!$vendor) {
        yustam_api_error(404, 'Vendor profile not found.');
    }

    $fields = [];
    $types = '';
    $values = [];

    $mapping = [
        'business_name' => ['businessName', 'storeName'],
        'phone' => ['phone'],
        'email' => ['email'],
        'category' => ['category'],
        'state' => ['state', 'locationState'],
        'city' => ['city', 'locationCity'],
        'address' => ['address', 'street'],
        'bio' => ['bio', 'about'],
    ];

    foreach ($mapping as $column => $keys) {
        if (!yustam_vendor_table_has_column($column)) {
            continue;
        }
        foreach ($keys as $key) {
            if (array_key_exists($key, $payload)) {
                $value = trim((string) $payload[$key]);
                $fields[] = sprintf('`%s` = ?', $column);
                $types .= 's';
                $values[] = $value;
                break;
            }
        }
    }

    if (array_key_exists('plan', $payload) && yustam_vendor_table_has_column('plan')) {
        $fields[] = '`plan` = ?';
        $types .= 's';
        $values[] = trim((string) $payload['plan']);
    }

    if (!$fields) {
        return ['success' => true, 'profile' => yustam_api_vendor_profile_payload($vendor)];
    }

    $sql = sprintf('UPDATE `%s` SET %s WHERE id = ? LIMIT 1', YUSTAM_VENDORS_TABLE, implode(', ', $fields));
    $stmt = $db->prepare($sql);
    if ($stmt instanceof mysqli_stmt) {
        $types .= 'i';
        $values[] = $targetVendorId;
        $stmt->bind_param($types, ...$values);
        $stmt->execute();
        $stmt->close();
    }

    $updated = yustam_vendor_find_by_id($targetVendorId, $db);
    return ['success' => true, 'profile' => yustam_api_vendor_profile_payload($updated ?: $vendor)];
}

function yustam_api_vendor_dashboard(): array
{
    $auth = yustam_api_require_auth(['vendor', 'admin']);
    $vendorId = $auth['role'] === 'vendor'
        ? (int) ($auth['vendorId'] ?? 0)
        : (int) ($_GET['vendor'] ?? 0);
    if ($vendorId <= 0) {
        yustam_api_error(404, 'Vendor not found.');
    }

    $db = get_db_connection();
    $vendor = yustam_vendor_find_by_id($vendorId, $db);
    if (!$vendor) {
        yustam_api_error(404, 'Vendor not found.');
    }

    $counts = [
        'total' => 0,
        'active' => 0,
        'drafts' => 0,
        'archived' => 0,
    ];

    $result = $db->query(sprintf(
        "SELECT LOWER(`status`) AS status, COUNT(*) AS total FROM `listings` WHERE vendor_id = %d GROUP BY LOWER(`status`)",
        $vendorId
    ));
    if ($result instanceof mysqli_result) {
        while ($row = $result->fetch_assoc()) {
            $status = $row['status'] ?? '';
            $count = (int) ($row['total'] ?? 0);
            $counts['total'] += $count;
            if (in_array($status, ['active', 'approved', 'live', 'published'], true)) {
                $counts['active'] += $count;
            } elseif (in_array($status, ['draft', 'pending'], true)) {
                $counts['drafts'] += $count;
            } else {
                $counts['archived'] += $count;
            }
        }
        $result->free();
    }

    $subscription = yustam_vendor_subscription_format_state($vendor);

    return [
        'success' => true,
        'profile' => yustam_api_vendor_profile_payload($vendor),
        'listings' => $counts,
        'plan' => $subscription,
        'verificationStatus' => $vendor['verification_status'] ?? null,
    ];
}

function yustam_api_vendor_analytics(): array
{
    $auth = yustam_api_require_auth(['vendor', 'admin']);
    $vendorId = $auth['role'] === 'vendor'
        ? (int) ($auth['vendorId'] ?? 0)
        : (int) ($_GET['vendor'] ?? 0);
    if ($vendorId <= 0) {
        yustam_api_error(404, 'Vendor not found.');
    }

    $db = get_db_connection();
    $vendor = yustam_vendor_find_by_id($vendorId, $db);
    if (!$vendor) {
        yustam_api_error(404, 'Vendor not found.');
    }

    $listings = yustam_api_fetch_listings([
        'ownerId' => yustam_api_user_reference('vendor', $vendorId),
        'pageSize' => 100,
    ]);

    $featured = array_filter($listings['items'], function ($item) {
        return !empty($item['vendor']['plan']) && stripos((string) $item['vendor']['plan'], 'featured') !== false;
    });

    $totals = [
        'totalListings' => count($listings['items']),
        'activeListings' => count(array_filter($listings['items'], fn($item) => $item['status'] === 'active')),
        'draftListings' => count(array_filter($listings['items'], fn($item) => in_array($item['status'], ['draft', 'pending'], true))),
        'featuredListings' => count($featured),
    ];

    return [
        'success' => true,
        'vendor' => yustam_api_vendor_profile_payload($vendor),
        'listings' => $listings['items'],
        'totals' => $totals,
    ];
}

function yustam_api_vendor_profile_payload(array $vendor): array
{
    $db = get_db_connection();
    $vendorUid = yustam_vendor_assign_uid_if_missing($db, $vendor);
    return [
        'id' => yustam_api_user_reference('vendor', (int) $vendor['id']),
        'vendorId' => (int) $vendor['id'],
        'vendorUid' => $vendorUid,
        'businessName' => yustam_vendor_business_name($vendor),
        'email' => $vendor['email'] ?? null,
        'phone' => $vendor['phone'] ?? null,
        'plan' => $vendor['plan'] ?? null,
        'verificationStatus' => $vendor['verification_status'] ?? null,
        'state' => $vendor['state'] ?? null,
        'city' => $vendor['city'] ?? null,
        'category' => $vendor['category'] ?? null,
        'photoUrl' => $vendor['profile_photo'] ?? ($vendor['avatar_url'] ?? null),
        'createdAt' => $vendor['created_at'] ?? null,
    ];
}

/**
 * --------------------------------------------------------------------------
 * Plans & Subscriptions
 * --------------------------------------------------------------------------
 */
function yustam_api_plan_catalog(): array
{
    $catalog = yustam_vendor_subscription_plan_catalog();
    $plans = [];
    foreach ($catalog as $slug => $plan) {
        $monthly = (float) ($plan['monthlyPrice'] ?? 0);
        $durations = [];
        foreach ($plan['durations'] ?? [] as $months => $entry) {
            $durations[] = [
                'months' => (int) $months,
                'amount' => (float) ($entry['amount'] ?? 0),
                'intervalLabel' => $entry['intervalLabel'] ?? sprintf('%d-Month', $months),
                'planCode' => $entry['planCode'] ?? null,
            ];
        }
        $plans[] = [
            'id' => $slug,
            'slug' => $slug,
            'name' => $plan['name'] ?? ucfirst($slug) . ' Plan',
            'displayName' => $plan['displayName'] ?? ucfirst($slug) . ' Plan',
            'price' => $monthly,
            'listingLimit' => $plan['listingLimit'] ?? null,
            'durations' => $durations,
            'features' => array_values($plan['features'] ?? []),
            'popular' => !empty($plan['popular']),
        ];
    }
    return $plans;
}

function yustam_api_plan_subscriptions(): array
{
    $user = yustam_api_require_auth(['vendor', 'admin']);
    $vendorId = $user['role'] === 'vendor'
        ? (int) ($user['vendorId'] ?? 0)
        : (int) ($_GET['vendor'] ?? 0);
    if ($vendorId <= 0) {
        yustam_api_error(404, 'Vendor profile not found.');
    }

    $db = get_db_connection();
    $vendor = yustam_vendor_subscription_fetch_vendor($db, $vendorId);
    if (!$vendor) {
        yustam_api_error(404, 'Vendor profile not found.');
    }
    $state = yustam_vendor_subscription_format_state($vendor);

    $subscriptions = [];
    if (!empty($state['planName'])) {
        $subscriptions[] = [
            'id' => yustam_api_random_string(12),
            'plan' => $state['planName'],
            'status' => strtolower($state['status'] ?? 'active'),
            'startsAt' => $state['activatedAt'] ?? null,
            'endsAt' => $state['expiresAt'] ?? null,
            'metadata' => $state,
        ];
    }

    return ['success' => true, 'subscriptions' => $subscriptions];
}

function yustam_api_plan_subscribe(string $planSlug): array
{
    $user = yustam_api_require_auth(['vendor', 'admin']);
    $vendorId = $user['role'] === 'vendor'
        ? (int) ($user['vendorId'] ?? 0)
        : (int) ($_GET['vendor'] ?? 0);
    if ($vendorId <= 0) {
        yustam_api_error(404, 'Vendor profile not found.');
    }

    $plan = yustam_vendor_subscription_plan_lookup($planSlug, 1);
    if (!$plan) {
        yustam_api_error(404, 'Plan not found.');
    }

    $reference = 'YUSTAM-MANUAL-' . strtoupper(yustam_api_random_string(8));
    $db = get_db_connection();

    try {
        $result = yustam_vendor_subscription_process_payment($db, $vendorId, $reference, $planSlug, 1);
    } catch (Throwable $exception) {
        yustam_api_error(500, 'Unable to activate the selected plan.');
    }

    return [
        'success' => true,
        'subscription' => $result['subscription'] ?? null,
        'reference' => $reference,
    ];
}

function yustam_api_plan_checkout(string $planSlug): array
{
    $user = yustam_api_require_auth(['vendor', 'admin']);
    $vendorId = $user['role'] === 'vendor'
        ? (int) ($user['vendorId'] ?? 0)
        : (int) ($_GET['vendor'] ?? 0);
    if ($vendorId <= 0) {
        yustam_api_error(404, 'Vendor profile not found.');
    }

    $body = yustam_api_read_json_body();
    $months = isset($body['months']) ? max(1, (int) $body['months']) : 1;
    $planDetails = yustam_vendor_subscription_plan_lookup($planSlug, $months);
    if (!$planDetails) {
        yustam_api_error(404, 'Plan or billing interval not found.');
    }

    $planCode = $planDetails['planCode'] ?? '';
    if ($planCode === '') {
        yustam_api_error(400, 'Selected plan is not configured for Paystack.');
    }

    $email = trim((string) ($user['email'] ?? ''));
    if ($email === '') {
        yustam_api_error(400, 'Vendor account does not have an email address.');
    }

    $amountNaira = (float) ($planDetails['amount'] ?? $planDetails['monthlyPrice'] ?? 0);
    $reference = sprintf(
        'YUSTAM-V%d-%s-%d',
        $vendorId,
        strtoupper(bin2hex(random_bytes(4))),
        time()
    );

    $payload = [
        'email' => $email,
        'plan' => $planCode,
        'reference' => $reference,
        'metadata' => [
            'vendor_id' => $vendorId,
            'plan_slug' => $planDetails['slug'] ?? $planSlug,
            'duration_months' => (int) ($planDetails['durationMonths'] ?? $months),
            'source' => 'mobile-app',
        ],
    ];

    if ($amountNaira > 0) {
        $payload['amount'] = (int) round($amountNaira * 100);
    }

    $callback = yustam_api_env('PAYSTACK_SUBSCRIPTION_CALLBACK');
    if ($callback) {
        $payload['callback_url'] = $callback;
    }

    try {
        $response = yustam_paystack_request('POST', 'transaction/initialize', $payload);
    } catch (Throwable $exception) {
        yustam_api_error(502, $exception->getMessage());
    }

    $authorizationUrl = $response['authorization_url'] ?? null;
    if (!$authorizationUrl) {
        yustam_api_error(500, 'Unable to start Paystack checkout.');
    }

    return [
        'success' => true,
        'checkout' => [
            'authorizationUrl' => $authorizationUrl,
            'accessCode' => $response['access_code'] ?? null,
            'reference' => $response['reference'] ?? $reference,
        ],
    ];
}

function yustam_api_plan_callback(): array
{
    $raw = file_get_contents('php://input') ?: '';
    $parsed = json_decode($raw, true);
    $body = [];
    if (is_array($parsed)) {
        $body = $parsed['data'] ?? $parsed;
    } elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $body = $_POST;
    } else {
        $body = $_GET;
    }

    $reference = trim((string) ($body['reference'] ?? $body['trxref'] ?? $_GET['reference'] ?? $_GET['trxref'] ?? ''));
    if ($reference === '') {
        yustam_api_error(400, 'Transaction reference is required.');
    }

    $vendorId = 0;
    $metadata = $body['metadata'] ?? ($body['data']['metadata'] ?? null);
    if (is_string($metadata)) {
        $decoded = json_decode($metadata, true);
        if (is_array($decoded)) {
            $metadata = $decoded;
        }
    }
    if (is_array($metadata)) {
        $vendorId = (int) ($metadata['vendor_id'] ?? $metadata['vendorId'] ?? 0);
        if ($vendorId <= 0 && isset($metadata['vendor'])) {
            [$role, $id] = yustam_api_parse_user_reference((string) $metadata['vendor']);
            if ($role === 'vendor') {
                $vendorId = $id;
            }
        }
    }

    if ($vendorId <= 0 && preg_match('/YUSTAM-V(\d+)-/i', $reference, $matches)) {
        $vendorId = (int) $matches[1];
    }

    if ($vendorId <= 0) {
        try {
            $transaction = yustam_paystack_verify_transaction($reference);
            $meta = $transaction['metadata'] ?? ($transaction['data']['metadata'] ?? null);
            if (is_string($meta)) {
                $decoded = json_decode($meta, true);
                if (is_array($decoded)) {
                    $meta = $decoded;
                }
            }
            if (is_array($meta)) {
                $vendorId = (int) ($meta['vendor_id'] ?? $meta['vendorId'] ?? 0);
                if ($vendorId <= 0 && isset($meta['vendor'])) {
                    [$role, $id] = yustam_api_parse_user_reference((string) $meta['vendor']);
                    if ($role === 'vendor') {
                        $vendorId = $id;
                    }
                }
            }
        } catch (Throwable $exception) {
            yustam_api_error(400, 'Unable to verify transaction reference.');
        }
    }

    if ($vendorId <= 0) {
        yustam_api_error(400, 'Vendor identifier missing.');
    }

    $db = get_db_connection();
    try {
        $result = yustam_vendor_subscription_process_payment($db, $vendorId, $reference);
    } catch (Throwable $exception) {
        yustam_api_error(400, $exception->getMessage());
    }

    $payload = [
        'success' => true,
        'subscription' => $result['subscription'] ?? null,
    ];

    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        header('Content-Type: text/html; charset=utf-8');
        echo '<!doctype html><html><head>';
        echo '<meta name="viewport" content="width=device-width, initial-scale=1">';
        echo '<title>Payment Complete</title>';
        echo '<style>body{font-family:Arial,sans-serif;padding:24px;text-align:center;color:#0F6A53;}button{margin-top:20px;padding:10px 20px;border:none;background:#0F6A53;color:#fff;border-radius:6px;font-size:16px;}p{font-size:16px;margin-top:16px;}</style>';
        echo '</head><body>';
        echo '<h1>Payment Verified</h1>';
        echo '<p>You can close this window and return to the app.</p>';
        echo '<button onclick="window.close()">Close</button>';
        echo '<script>setTimeout(function(){window.close();},4000);</script>';
        echo '</body></html>';
        return $payload;
    }

    return $payload;
}

/**
 * --------------------------------------------------------------------------
 * Favorites
 * --------------------------------------------------------------------------
 */
function yustam_api_favorites_list(): array
{
    $user = yustam_api_require_auth();
    yustam_api_ensure_favorites_table();

    $db = get_db_connection();
    $stmt = $db->prepare('SELECT product_id FROM `api_favorites` WHERE user_ref = ? ORDER BY created_at DESC LIMIT 100');
    $items = [];
    if ($stmt instanceof mysqli_stmt) {
        $stmt->bind_param('s', $user['id']);
        $stmt->execute();
        $result = $stmt->get_result();
        if ($result instanceof mysqli_result) {
            while ($row = $result->fetch_assoc()) {
                $items[] = $row['product_id'];
            }
            $result->free();
        }
        $stmt->close();
    }

    $listings = [];
    foreach ($items as $productId) {
        $row = yustam_api_find_listing($productId);
        if ($row) {
            $vendor = null;
            if (!empty($row['v_id'])) {
                $vendor = [
                    'id' => (int) $row['v_id'],
                    'business_name' => $row['business_name'] ?? null,
                    'vendor_uid' => $row['vendor_uid'] ?? null,
                    'email' => $row['v_email'] ?? null,
                    'phone' => $row['v_phone'] ?? null,
                    'plan' => $row['v_plan'] ?? null,
                    'verification_status' => $row['v_verification'] ?? null,
                ];
            }
            $listings[] = yustam_api_normalise_listing_row($row, $vendor);
        }
    }

    return ['success' => true, 'items' => $listings];
}

function yustam_api_favorites_add(): array
{
    $user = yustam_api_require_auth();
    $body = yustam_api_read_json_body();
    $productId = trim((string) ($body['productId'] ?? $body['listingId'] ?? ''));
    if ($productId === '') {
        yustam_api_error(422, 'productId is required.');
    }

    if (!yustam_api_find_listing($productId)) {
        yustam_api_error(404, 'Listing not found.');
    }

    yustam_api_ensure_favorites_table();
    $db = get_db_connection();
    $stmt = $db->prepare('INSERT INTO `api_favorites` (user_ref, user_role, product_id) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE created_at = VALUES(created_at)');
    if ($stmt instanceof mysqli_stmt) {
        $stmt->bind_param('sss', $user['id'], $user['role'], $productId);
        $stmt->execute();
        $stmt->close();
    }

    return ['success' => true];
}

function yustam_api_favorites_remove(string $productId): array
{
    $user = yustam_api_require_auth();
    yustam_api_ensure_favorites_table();
    $db = get_db_connection();
    $stmt = $db->prepare('DELETE FROM `api_favorites` WHERE user_ref = ? AND product_id = ? LIMIT 1');
    if ($stmt instanceof mysqli_stmt) {
        $stmt->bind_param('ss', $user['id'], $productId);
        $stmt->execute();
        $stmt->close();
    }

    return ['success' => true];
}

/**
 * --------------------------------------------------------------------------
 * Notifications
 * --------------------------------------------------------------------------
 */
function yustam_api_notifications_list(): array
{
    $user = yustam_api_require_auth();
    yustam_api_ensure_notifications_table();

    $db = get_db_connection();
    $typeFilter = trim((string) ($_GET['type'] ?? ''));
    $unreadOnly = filter_var($_GET['unreadOnly'] ?? false, FILTER_VALIDATE_BOOLEAN);

    $where = ['user_ref = ?'];
    $types = 's';
    $params = [$user['id']];

    if ($typeFilter !== '') {
        $where[] = 'type = ?';
        $types .= 's';
        $params[] = $typeFilter;
    }
    if ($unreadOnly) {
        $where[] = 'is_read = 0';
    }

    $sql = 'SELECT * FROM `app_notifications` WHERE ' . implode(' AND ', $where) . ' ORDER BY created_at DESC LIMIT 200';
    $stmt = $db->prepare($sql);
    if (!$stmt instanceof mysqli_stmt) {
        yustam_api_error(500, 'Unable to load notifications.');
    }
    $stmt->bind_param($types, ...$params);
    $stmt->execute();
    $result = $stmt->get_result();
    $notifications = [];
    if ($result instanceof mysqli_result) {
        while ($row = $result->fetch_assoc()) {
            $notifications[] = [
                'id' => (int) $row['id'],
                'title' => $row['title'],
                'body' => $row['body'],
                'type' => $row['type'],
                'data' => $row['data'] ? json_decode($row['data'], true) : null,
                'isRead' => (bool) $row['is_read'],
                'createdAt' => $row['created_at'],
                'readAt' => $row['read_at'],
            ];
        }
        $result->free();
    }
    $stmt->close();

    return ['success' => true, 'notifications' => $notifications];
}

function yustam_api_notifications_mark_many(): array
{
    $user = yustam_api_require_auth();
    $body = yustam_api_read_json_body();
    $ids = isset($body['ids']) && is_array($body['ids']) ? array_filter(array_map('intval', $body['ids'])) : [];
    if (!$ids) {
        return ['success' => true, 'updated' => 0];
    }

    yustam_api_ensure_notifications_table();
    $db = get_db_connection();
    $placeholders = implode(', ', array_fill(0, count($ids), '?'));
    $types = str_repeat('i', count($ids)) . 's';
    $params = $ids;
    $params[] = $user['id'];

    $sql = sprintf('UPDATE `app_notifications` SET is_read = 1, read_at = NOW() WHERE id IN (%s) AND user_ref = ?', $placeholders);
    $stmt = $db->prepare($sql);
    if ($stmt instanceof mysqli_stmt) {
        $stmt->bind_param($types, ...$params);
        $stmt->execute();
        $updated = $stmt->affected_rows;
        $stmt->close();
    } else {
        $updated = 0;
    }

    return ['success' => true, 'updated' => $updated];
}

function yustam_api_notifications_mark_all(): array
{
    $user = yustam_api_require_auth();
    yustam_api_ensure_notifications_table();
    $db = get_db_connection();
    $stmt = $db->prepare('UPDATE `app_notifications` SET is_read = 1, read_at = NOW() WHERE user_ref = ? AND is_read = 0');
    $updated = 0;
    if ($stmt instanceof mysqli_stmt) {
        $stmt->bind_param('s', $user['id']);
        $stmt->execute();
        $updated = $stmt->affected_rows;
        $stmt->close();
    }
    return ['success' => true, 'updated' => $updated];
}

function yustam_api_notifications_create(): array
{
    $admin = yustam_api_require_auth('admin');
    $body = yustam_api_read_json_body();
    $userRef = trim((string) ($body['userId'] ?? ''));
    $title = trim((string) ($body['title'] ?? ''));
    $message = trim((string) ($body['body'] ?? $body['message'] ?? ''));
    if ($userRef === '' || $title === '' || $message === '') {
        yustam_api_error(422, 'userId, title and body are required.');
    }

    yustam_api_ensure_notifications_table();
    $db = get_db_connection();
    $stmt = $db->prepare('INSERT INTO `app_notifications` (user_ref, title, body, type, data) VALUES (?, ?, ?, ?, ?)');
    if ($stmt instanceof mysqli_stmt) {
        $type = trim((string) ($body['type'] ?? 'system'));
        $data = isset($body['data']) ? json_encode($body['data'], YUSTAM_API_JSON_FLAGS) : null;
        $stmt->bind_param('sssss', $userRef, $title, $message, $type, $data);
        $stmt->execute();
        $stmt->close();
    }

    return ['success' => true];
}

/**
 * --------------------------------------------------------------------------
 * Support Tickets
 * --------------------------------------------------------------------------
 */
function yustam_api_support_list(): array
{
    $user = yustam_api_require_auth();
    yustam_api_ensure_support_tables();
    $db = get_db_connection();

    $scopeAll = $user['role'] === 'admin' && filter_var($_GET['all'] ?? false, FILTER_VALIDATE_BOOL);
    $where = $scopeAll ? '' : 'WHERE t.user_ref = ?';
    $sql = 'SELECT t.* FROM `support_tickets` t ' . $where . ' ORDER BY t.created_at DESC';
    $stmt = $db->prepare($sql);
    $tickets = [];
    if ($stmt instanceof mysqli_stmt) {
        if (!$scopeAll) {
            $stmt->bind_param('s', $user['id']);
        }
        $stmt->execute();
        $result = $stmt->get_result();
        if ($result instanceof mysqli_result) {
            while ($row = $result->fetch_assoc()) {
                $tickets[] = [
                    'id' => (int) $row['id'],
                    'subject' => $row['subject'],
                    'category' => $row['category'],
                    'status' => $row['status'],
                    'priority' => $row['priority'],
                    'createdAt' => $row['created_at'],
                    'updatedAt' => $row['updated_at'],
                ];
            }
            $result->free();
        }
        $stmt->close();
    }

    return ['success' => true, 'tickets' => $tickets];
}

function yustam_api_support_create(): array
{
    $user = yustam_api_require_auth();
    $body = yustam_api_read_json_body();
    $subject = trim((string) ($body['subject'] ?? ''));
    $category = trim((string) ($body['category'] ?? 'General'));
    $description = trim((string) ($body['description'] ?? ''));
    $priority = strtoupper(trim((string) ($body['priority'] ?? 'medium')));

    if ($subject === '' || $description === '') {
        yustam_api_error(422, 'Subject and description are required.');
    }

    yustam_api_ensure_support_tables();
    $db = get_db_connection();
    $stmt = $db->prepare('INSERT INTO `support_tickets` (user_ref, user_role, subject, category, description, priority) VALUES (?, ?, ?, ?, ?, ?)');
    if (!$stmt instanceof mysqli_stmt) {
        yustam_api_error(500, 'Unable to create ticket.');
    }
    $stmt->bind_param('ssssss', $user['id'], $user['role'], $subject, $category, $description, $priority);
    $stmt->execute();
    $ticketId = $stmt->insert_id;
    $stmt->close();

    return ['success' => true, 'ticket' => ['id' => $ticketId]];
}

function yustam_api_support_get(string $ticketId): array
{
    $user = yustam_api_require_auth();
    yustam_api_ensure_support_tables();
    $db = get_db_connection();

    $stmt = $db->prepare('SELECT * FROM `support_tickets` WHERE id = ? LIMIT 1');
    if (!$stmt instanceof mysqli_stmt) {
        yustam_api_error(500, 'Unable to load ticket.');
    }
    $id = (int) $ticketId;
    $stmt->bind_param('i', $id);
    $stmt->execute();
    $result = $stmt->get_result();
    $ticket = $result ? $result->fetch_assoc() : null;
    $stmt->close();
    if (!$ticket) {
        yustam_api_error(404, 'Ticket not found.');
    }
    if ($user['role'] !== 'admin' && $ticket['user_ref'] !== $user['id']) {
        yustam_api_error(403, 'You do not have access to this ticket.');
    }

    $messages = [];
    $msgStmt = $db->prepare('SELECT * FROM `support_messages` WHERE ticket_id = ? ORDER BY created_at ASC');
    if ($msgStmt instanceof mysqli_stmt) {
        $msgStmt->bind_param('i', $id);
        $msgStmt->execute();
        $res = $msgStmt->get_result();
        if ($res instanceof mysqli_result) {
            while ($row = $res->fetch_assoc()) {
                $messages[] = [
                    'id' => (int) $row['id'],
                    'body' => $row['body'],
                    'sender' => $row['sender_ref'],
                    'role' => $row['sender_role'],
                    'status' => $row['status'],
                    'isInternal' => (bool) $row['is_internal'],
                    'createdAt' => $row['created_at'],
                ];
            }
            $res->free();
        }
        $msgStmt->close();
    }

    return [
        'success' => true,
        'ticket' => [
            'id' => (int) $ticket['id'],
            'subject' => $ticket['subject'],
            'category' => $ticket['category'],
            'status' => $ticket['status'],
            'priority' => $ticket['priority'],
            'description' => $ticket['description'],
            'messages' => $messages,
        ],
    ];
}

function yustam_api_support_add_message(string $ticketId): array
{
    $user = yustam_api_require_auth();
    $body = yustam_api_read_json_body();
    $text = trim((string) ($body['body'] ?? $body['message'] ?? ''));
    if ($text === '') {
        yustam_api_error(422, 'Message body is required.');
    }

    yustam_api_ensure_support_tables();
    $db = get_db_connection();
    $ticket = yustam_api_support_fetch_ticket($db, (int) $ticketId);
    if (!$ticket) {
        yustam_api_error(404, 'Ticket not found.');
    }
    if ($user['role'] !== 'admin' && $ticket['user_ref'] !== $user['id']) {
        yustam_api_error(403, 'You do not have access to this ticket.');
    }

    $isInternal = filter_var($body['internal'] ?? false, FILTER_VALIDATE_BOOL) && $user['role'] === 'admin';
    $status = $body['status'] ?? null;
    if ($status !== null) {
        $status = strtolower((string) $status);
        if (!in_array($status, ['open', 'pending', 'closed'], true)) {
            $status = null;
        }
    }

    $stmt = $db->prepare('INSERT INTO `support_messages` (ticket_id, sender_ref, sender_role, body, is_internal, status) VALUES (?, ?, ?, ?, ?, ?)');
    if ($stmt instanceof mysqli_stmt) {
        $flag = $isInternal ? 1 : 0;
        $stmt->bind_param('isssis', $ticket['id'], $user['id'], $user['role'], $text, $flag, $status);
        $stmt->execute();
        $stmt->close();
    }

    if ($status !== null) {
        $updateStmt = $db->prepare('UPDATE `support_tickets` SET status = ?, updated_at = NOW() WHERE id = ? LIMIT 1');
        if ($updateStmt instanceof mysqli_stmt) {
            $updateStmt->bind_param('si', $status, $ticket['id']);
            $updateStmt->execute();
            $updateStmt->close();
        }
    }

    return ['success' => true];
}

function yustam_api_support_fetch_ticket(mysqli $db, int $ticketId): ?array
{
    $stmt = $db->prepare('SELECT * FROM `support_tickets` WHERE id = ? LIMIT 1');
    if (!$stmt instanceof mysqli_stmt) {
        return null;
    }
    $stmt->bind_param('i', $ticketId);
    $stmt->execute();
    $result = $stmt->get_result();
    $row = $result ? $result->fetch_assoc() : null;
    $stmt->close();
    return $row ?: null;
}

/**
 * --------------------------------------------------------------------------
 * Verification
 * --------------------------------------------------------------------------
 */
function yustam_api_verification_get_current(): array
{
    $user = yustam_api_require_auth(['vendor', 'admin']);
    $vendorId = $user['role'] === 'vendor'
        ? (int) ($user['vendorId'] ?? 0)
        : (int) ($_GET['vendor'] ?? 0);
    if ($vendorId <= 0) {
        yustam_api_error(404, 'Vendor not found.');
    }

    yustam_api_ensure_verification_table();
    $db = get_db_connection();
    $stmt = $db->prepare('SELECT * FROM `vendor_verifications` WHERE vendor_id = ? ORDER BY submitted_at DESC, id DESC LIMIT 1');
    $request = null;
    if ($stmt instanceof mysqli_stmt) {
        $stmt->bind_param('i', $vendorId);
        $stmt->execute();
        $result = $stmt->get_result();
        $request = $result ? $result->fetch_assoc() : null;
        $stmt->close();
    }

    return ['success' => true, 'request' => yustam_api_format_verification_request($request)];
}

function yustam_api_verification_submit(): array
{
    $user = yustam_api_require_auth(['vendor', 'admin']);
    $vendorId = $user['role'] === 'vendor'
        ? (int) ($user['vendorId'] ?? 0)
        : (int) ($_POST['vendorId'] ?? 0);
    if ($vendorId <= 0) {
        yustam_api_error(404, 'Vendor not found.');
    }

    $body = yustam_api_read_json_body();
    $documents = $body['documents'] ?? [];
    if (is_string($documents)) {
        $decoded = json_decode($documents, true);
        if (is_array($decoded)) {
            $documents = $decoded;
        }
    }
    if (!is_array($documents) || count($documents) === 0) {
        yustam_api_error(422, 'At least one verification document is required.');
    }

    $cleanFiles = [];
    foreach ($documents as $doc) {
        if (!is_array($doc)) {
            continue;
        }
        $url = trim((string) ($doc['url'] ?? ''));
        if ($url === '') {
            continue;
        }
        $cleanFiles[] = [
            'type' => $doc['type'] ?? 'document',
            'url' => $url,
        ];
    }

    if (!$cleanFiles) {
        yustam_api_error(422, 'Verification documents are invalid.');
    }

    yustam_api_ensure_verification_table();
    $db = get_db_connection();
    $stmt = $db->prepare('INSERT INTO `vendor_verifications` (vendor_id, status, notes, files, submitted_at) VALUES (?, \'pending\', ?, ?, NOW())');
    if (!$stmt instanceof mysqli_stmt) {
        yustam_api_error(500, 'Unable to submit verification.');
    }
    $notes = trim((string) ($body['notes'] ?? ''));
    $filesJson = json_encode($cleanFiles, YUSTAM_API_JSON_FLAGS);
    $stmt->bind_param('iss', $vendorId, $notes, $filesJson);
    $stmt->execute();
    $stmt->close();

    yustam_api_update_vendor_verification_state($vendorId, 'pending', $notes);

    return ['success' => true];
}

function yustam_api_verification_list_requests(): array
{
    yustam_api_require_auth('admin');
    yustam_api_ensure_verification_table();
    $db = get_db_connection();

    $sql = sprintf(
        'SELECT vr.*, v.business_name, v.email, v.phone FROM `vendor_verifications` vr
         LEFT JOIN `%s` v ON v.id = vr.vendor_id
         ORDER BY vr.submitted_at DESC, vr.id DESC LIMIT 200',
        YUSTAM_VENDORS_TABLE
    );
    $result = $db->query($sql);
    $requests = [];
    if ($result instanceof mysqli_result) {
        while ($row = $result->fetch_assoc()) {
            $requests[] = yustam_api_format_verification_request($row, true);
        }
        $result->free();
    }

    return ['success' => true, 'requests' => $requests];
}

function yustam_api_verification_update_request(string $requestId): array
{
    yustam_api_require_auth('admin');
    $body = yustam_api_read_json_body();
    $status = strtolower(trim((string) ($body['status'] ?? '')));
    if (!in_array($status, ['approved', 'rejected', 'pending'], true)) {
        yustam_api_error(422, 'Invalid status.');
    }
    $notes = trim((string) ($body['notes'] ?? ''));

    yustam_api_ensure_verification_table();
    $db = get_db_connection();
    $stmt = $db->prepare('UPDATE `vendor_verifications` SET status = ?, feedback = ?, reviewed_at = NOW() WHERE id = ? LIMIT 1');
    if (!$stmt instanceof mysqli_stmt) {
        yustam_api_error(500, 'Unable to update verification.');
    }
    $id = (int) $requestId;
    $stmt->bind_param('ssi', $status, $notes, $id);
    $stmt->execute();
    $stmt->close();

    $vendorStmt = $db->prepare('SELECT vendor_id FROM `vendor_verifications` WHERE id = ? LIMIT 1');
    $vendorId = 0;
    if ($vendorStmt instanceof mysqli_stmt) {
        $vendorStmt->bind_param('i', $id);
        $vendorStmt->execute();
        $result = $vendorStmt->get_result();
        $row = $result ? $result->fetch_assoc() : null;
        $vendorId = (int) ($row['vendor_id'] ?? 0);
        $vendorStmt->close();
    }
    if ($vendorId > 0) {
        yustam_api_update_vendor_verification_state($vendorId, $status, $notes);
    }

    return ['success' => true];
}

function yustam_api_format_verification_request(?array $row, bool $includeVendor = false): ?array
{
    if (!$row) {
        return null;
    }
    return [
        'id' => (int) $row['id'],
        'vendorId' => (int) ($row['vendor_id'] ?? 0),
        'status' => $row['status'] ?? 'pending',
        'notes' => $row['notes'] ?? '',
        'feedback' => $row['feedback'] ?? '',
        'files' => $row['files'] ? json_decode($row['files'], true) : [],
        'submittedAt' => $row['submitted_at'] ?? null,
        'reviewedAt' => $row['reviewed_at'] ?? null,
        'vendor' => $includeVendor ? [
            'businessName' => $row['business_name'] ?? null,
            'email' => $row['email'] ?? null,
            'phone' => $row['phone'] ?? null,
        ] : null,
    ];
}

function yustam_api_update_vendor_verification_state(int $vendorId, string $status, ?string $notes = null): void
{
    $db = get_db_connection();
    $fields = [];
    $types = '';
    $values = [];

    if (yustam_vendor_table_has_column('verification_status')) {
        $fields[] = '`verification_status` = ?';
        $types .= 's';
        $values[] = strtoupper($status);
    }
    if ($status === 'pending' && yustam_vendor_table_has_column('verification_submitted_at')) {
        $fields[] = '`verification_submitted_at` = NOW()';
    }
    if (in_array($status, ['approved', 'rejected'], true) && yustam_vendor_table_has_column('verification_reviewed_at')) {
        $fields[] = '`verification_reviewed_at` = NOW()';
    }
    if ($notes !== null && yustam_vendor_table_has_column('verification_notes')) {
        $fields[] = '`verification_notes` = ?';
        $types .= 's';
        $values[] = $notes;
    }
    if (!$fields) {
        return;
    }

    $sql = sprintf('UPDATE `%s` SET %s WHERE id = ? LIMIT 1', YUSTAM_VENDORS_TABLE, implode(', ', $fields));
    $stmt = $db->prepare($sql);
    if ($stmt instanceof mysqli_stmt) {
        $types .= 'i';
        $values[] = $vendorId;
        $stmt->bind_param($types, ...$values);
        $stmt->execute();
        $stmt->close();
    }
}

/**
 * --------------------------------------------------------------------------
 * Admin helpers
 * --------------------------------------------------------------------------
 */
function yustam_api_admin_dashboard(): array
{
    $db = get_db_connection();
    $stats = [
        'users' => 0,
        'vendors' => 0,
        'products' => 0,
        'openTickets' => 0,
    ];

    $result = $db->query('SELECT COUNT(*) AS total FROM `buyers`');
    if ($result instanceof mysqli_result) {
        $stats['users'] = (int) ($result->fetch_assoc()['total'] ?? 0);
        $result->free();
    }
    $result = $db->query(sprintf('SELECT COUNT(*) AS total FROM `%s`', YUSTAM_VENDORS_TABLE));
    if ($result instanceof mysqli_result) {
        $stats['vendors'] = (int) ($result->fetch_assoc()['total'] ?? 0);
        $result->free();
    }
    $result = $db->query('SELECT COUNT(*) AS total FROM `listings`');
    if ($result instanceof mysqli_result) {
        $stats['products'] = (int) ($result->fetch_assoc()['total'] ?? 0);
        $result->free();
    }
    $result = $db->query("SELECT COUNT(*) AS total FROM `support_tickets` WHERE status IN ('open','pending')");
    if ($result instanceof mysqli_result) {
        $stats['openTickets'] = (int) ($result->fetch_assoc()['total'] ?? 0);
        $result->free();
    }

    return ['success' => true, 'stats' => $stats];
}

function yustam_api_admin_products(): array
{
    $data = yustam_api_fetch_listings(['pageSize' => 100]);
    return ['success' => true, 'products' => $data['items']];
}

function yustam_api_admin_users(): array
{
    return yustam_api_auth_list_users(yustam_api_require_auth('admin'));
}

function yustam_api_admin_vendors(): array
{
    $db = get_db_connection();
    $result = $db->query(sprintf('SELECT id, business_name, email, phone, plan, verification_status, created_at FROM `%s` ORDER BY created_at DESC LIMIT 200', YUSTAM_VENDORS_TABLE));
    $vendors = [];
    if ($result instanceof mysqli_result) {
        while ($row = $result->fetch_assoc()) {
            $vendors[] = [
                'id' => yustam_api_user_reference('vendor', (int) $row['id']),
                'businessName' => $row['business_name'] ?? 'Vendor',
                'email' => $row['email'] ?? null,
                'phone' => $row['phone'] ?? null,
                'plan' => $row['plan'] ?? null,
                'verificationStatus' => $row['verification_status'] ?? null,
                'createdAt' => $row['created_at'] ?? null,
            ];
        }
        $result->free();
    }
    return ['success' => true, 'vendors' => $vendors];
}

function yustam_api_admin_verifications(): array
{
    return yustam_api_verification_list_requests();
}

function yustam_api_admin_support_tickets(): array
{
    $_GET['all'] = 'true';
    return yustam_api_support_list();
}

function yustam_api_admin_plans(): array
{
    return ['success' => true, 'plans' => yustam_api_plan_catalog()];
}

/**
 * --------------------------------------------------------------------------
 * Chats
 * --------------------------------------------------------------------------
 */
function yustam_api_chats_list(): array
{
    $user = yustam_api_require_auth();
    $context = yustam_api_chat_context($user);
    $fieldPath = $context['role'] === 'vendor' ? 'vendor_uid' : 'buyer_uid';

    $query = [
        'structuredQuery' => [
            'from' => [
                ['collectionId' => 'chats'],
            ],
            'where' => [
                'fieldFilter' => [
                    'field' => ['fieldPath' => $fieldPath],
                    'op' => 'EQUAL',
                    'value' => yustam_firestore_string($context['uid']),
                ],
            ],
            'orderBy' => [
                [
                    'field' => ['fieldPath' => 'last_ts'],
                    'direction' => 'DESCENDING',
                ],
            ],
            'limit' => 50,
        ],
    ];

    $threads = [];
    try {
        $results = yustam_firestore_run_query($query);
        foreach ($results as $result) {
            if (!isset($result['document']['fields'])) {
                continue;
            }
            $fields = [];
            foreach ($result['document']['fields'] as $key => $value) {
                $fields[$key] = yustam_firestore_decode($value);
            }
            $threads[] = yustam_api_chat_thread_from_fields($fields);
        }
    } catch (Throwable $exception) {
        error_log('Chat list failed: ' . $exception->getMessage());
    }

    return ['success' => true, 'threads' => $threads];
}

function yustam_api_chats_open(): array
{
    $user = yustam_api_require_auth();
    $context = yustam_api_chat_context($user);
    $body = yustam_api_read_json_body();

    $buyerUid = trim((string) ($body['buyer_uid'] ?? $body['buyerUid'] ?? ($context['role'] === 'buyer' ? $context['uid'] : '')));
    $vendorUid = trim((string) ($body['vendor_uid'] ?? $body['vendorUid'] ?? ($context['role'] === 'vendor' ? $context['uid'] : '')));
    if ($buyerUid === '' || $vendorUid === '') {
        yustam_api_error(422, 'buyer_uid and vendor_uid are required.');
    }

    $buyerName = $body['buyer_name'] ?? $body['buyerName'] ?? ($context['role'] === 'buyer' ? $context['name'] : 'Buyer');
    $vendorName = $body['vendor_name'] ?? $body['vendorName'] ?? ($context['role'] === 'vendor' ? $context['name'] : 'Vendor');
    $vendorBusinessName = $body['vendor_business_name'] ?? $body['vendorBusinessName'] ?? $vendorName;

    $listingId = $body['listing_id'] ?? $body['listingId'] ?? '';
    $listingTitle = $body['listing_title'] ?? $body['listingTitle'] ?? '';
    $listingImage = $body['listing_image'] ?? $body['listingImage'] ?? '';

    $chatId = yustam_chat_build_id($buyerUid, $vendorUid);

    $chatFields = [
        'chat_id' => yustam_firestore_string($chatId),
        'buyer_uid' => yustam_firestore_string($buyerUid),
        'buyer_name' => yustam_firestore_string($buyerName),
        'vendor_uid' => yustam_firestore_string($vendorUid),
        'vendor_name' => yustam_firestore_string($vendorName),
        'vendor_business_name' => yustam_firestore_string($vendorBusinessName),
        'listing_id' => yustam_firestore_string($listingId),
        'listing_title' => yustam_firestore_string($listingTitle),
        'listing_image' => yustam_firestore_string($listingImage),
        'last_text' => yustam_firestore_string('Conversation started'),
        'last_sender_role' => yustam_firestore_string($context['role']),
        'unread_for_buyer' => yustam_firestore_integer(0),
        'unread_for_vendor' => yustam_firestore_integer(0),
    ];

    try {
        yustam_firestore_commit([
            [
                'update' => [
                    'name' => yustam_firestore_document_path('chats', $chatId),
                    'fields' => $chatFields,
                ],
                'currentDocument' => ['exists' => false],
            ],
            [
                'transform' => [
                    'document' => yustam_firestore_document_path('chats', $chatId),
                    'fieldTransforms' => [
                        ['fieldPath' => 'last_ts', 'setToServerValue' => 'REQUEST_TIME'],
                    ],
                ],
            ],
        ]);
    } catch (Throwable $exception) {
        error_log('Chat open failed: ' . $exception->getMessage());
        yustam_api_error(500, 'Unable to open chat thread.');
    }

    yustam_api_chat_store_metadata($chatId, [
        'buyer_ref' => $context['role'] === 'buyer' ? $user['id'] : ($body['buyerRef'] ?? ''),
        'vendor_ref' => $context['role'] === 'vendor' ? $user['id'] : ($body['vendorRef'] ?? ''),
        'buyer_uid' => $buyerUid,
        'vendor_uid' => $vendorUid,
    ]);

    return ['success' => true, 'thread' => yustam_api_chat_thread_from_fields([
        'chat_id' => $chatId,
        'buyer_uid' => $buyerUid,
        'buyer_name' => $buyerName,
        'vendor_uid' => $vendorUid,
        'vendor_name' => $vendorBusinessName,
        'listing_id' => $listingId,
        'listing_title' => $listingTitle,
        'listing_image' => $listingImage,
        'last_text' => 'Conversation started',
    ])];
}

function yustam_api_chats_assign(string $threadId): array
{
    $admin = yustam_api_require_auth('admin');
    yustam_api_ensure_chat_table();
    $db = get_db_connection();
    $stmt = $db->prepare('UPDATE `api_chat_threads` SET admin_ref = ?, updated_at = NOW() WHERE chat_id = ?');
    if ($stmt instanceof mysqli_stmt) {
        $stmt->bind_param('ss', $admin['id'], $threadId);
        $stmt->execute();
        $stmt->close();
    }
    return ['success' => true];
}

function yustam_api_chats_send_message(string $threadId): array
{
    $user = yustam_api_require_auth();
    $context = yustam_api_chat_context($user);
    $body = yustam_api_read_json_body();
    $text = trim((string) ($body['text'] ?? $body['message'] ?? ''));
    $imageUrl = trim((string) ($body['image_url'] ?? $body['imageUrl'] ?? ''));
    $voiceUrl = trim((string) ($body['voice_url'] ?? $body['voiceUrl'] ?? ''));

    if ($text === '' && $imageUrl === '' && $voiceUrl === '') {
        yustam_api_error(422, 'Message content required.');
    }

    $buyerUid = trim((string) ($body['buyer_uid'] ?? $body['buyerUid'] ?? ''));
    $vendorUid = trim((string) ($body['vendor_uid'] ?? $body['vendorUid'] ?? ''));
    if ($buyerUid === '' || $vendorUid === '') {
        yustam_api_error(422, 'buyer_uid and vendor_uid are required.');
    }

    $messageId = 'msg_' . yustam_api_random_string(12);
    $type = 'text';
    if ($voiceUrl !== '') {
        $type = 'voice';
    } elseif ($imageUrl !== '') {
        $type = 'image';
    }
    $preview = $type === 'text' ? $text : ($type === 'image' ? 'Photo' : 'Voice note');

    $messageFields = [
        'sender_uid' => yustam_firestore_string($context['uid']),
        'sender_role' => yustam_firestore_string($context['role']),
        'type' => yustam_firestore_string($type),
        'text' => yustam_firestore_string($text),
        'read_by' => yustam_firestore_map([$context['uid'] => yustam_firestore_boolean(true)]),
    ];
    if ($imageUrl !== '') {
        $messageFields['image_url'] = yustam_firestore_string($imageUrl);
    }
    if ($voiceUrl !== '') {
        $messageFields['voice_url'] = yustam_firestore_string($voiceUrl);
    }

    $chatPath = yustam_firestore_document_path('chats', $threadId);
    $messagePath = yustam_firestore_document_path('chats', $threadId, 'messages', $messageId);

    $transforms = [
        ['fieldPath' => 'last_ts', 'setToServerValue' => 'REQUEST_TIME'],
    ];
    $chatUpdate = [
        'last_text' => yustam_firestore_string($preview),
        'last_sender_role' => yustam_firestore_string($context['role']),
    ];

    if ($context['role'] === 'buyer') {
        $transforms[] = ['fieldPath' => 'unread_for_vendor', 'increment' => yustam_firestore_integer(1)];
        $chatUpdate['unread_for_buyer'] = yustam_firestore_integer(0);
    } else {
        $transforms[] = ['fieldPath' => 'unread_for_buyer', 'increment' => yustam_firestore_integer(1)];
        $chatUpdate['unread_for_vendor'] = yustam_firestore_integer(0);
    }

    try {
        yustam_firestore_commit([
            [
                'update' => [
                    'name' => $messagePath,
                    'fields' => $messageFields,
                ],
            ],
            [
                'transform' => [
                    'document' => $messagePath,
                    'fieldTransforms' => [
                        ['fieldPath' => 'ts', 'setToServerValue' => 'REQUEST_TIME'],
                    ],
                ],
            ],
            [
                'update' => [
                    'name' => $chatPath,
                    'fields' => $chatUpdate,
                ],
            ],
            [
                'transform' => [
                    'document' => $chatPath,
                    'fieldTransforms' => $transforms,
                ],
            ],
        ]);
    } catch (Throwable $exception) {
        error_log('Chat send failed: ' . $exception->getMessage());
        yustam_api_error(500, 'Unable to send message.');
    }

    return ['success' => true, 'messageId' => $messageId];
}

function yustam_api_chats_list_messages(string $threadId): array
{
    yustam_api_require_auth();
    $query = [
        'parent' => yustam_firestore_document_path('chats', $threadId),
        'structuredQuery' => [
            'from' => [
                ['collectionId' => 'messages'],
            ],
            'orderBy' => [
                ['field' => ['fieldPath' => 'ts'], 'direction' => 'ASCENDING'],
            ],
            'limit' => 100,
        ],
    ];

    $messages = [];
    try {
        $results = yustam_firestore_run_query($query);
        foreach ($results as $result) {
            if (!isset($result['document']['fields'])) {
                continue;
            }
            $fields = [];
            foreach ($result['document']['fields'] as $key => $value) {
                $fields[$key] = yustam_firestore_decode($value);
            }
            $messages[] = [
                'id' => basename($result['document']['name']),
                'text' => $fields['text'] ?? '',
                'type' => $fields['type'] ?? 'text',
                'sender' => $fields['sender_uid'] ?? '',
                'role' => $fields['sender_role'] ?? '',
                'image' => $fields['image_url'] ?? null,
                'voice' => $fields['voice_url'] ?? null,
                'timestamp' => $fields['ts'] ?? null,
            ];
        }
    } catch (Throwable $exception) {
        error_log('Chat messages failed: ' . $exception->getMessage());
    }

    return ['success' => true, 'messages' => $messages];
}

function yustam_api_chats_mark_read(string $threadId): array
{
    $user = yustam_api_require_auth();
    $context = yustam_api_chat_context($user);
    $field = $context['role'] === 'vendor' ? 'unread_for_vendor' : 'unread_for_buyer';

    try {
        yustam_firestore_commit([
            [
                'update' => [
                    'name' => yustam_firestore_document_path('chats', $threadId),
                    'fields' => [$field => yustam_firestore_integer(0)],
                ],
            ],
        ]);
    } catch (Throwable $exception) {
        // ignore failures
    }

    return ['success' => true];
}

function yustam_api_chat_context(array $user): array
{
    $role = $user['role'] === 'vendor' ? 'vendor' : 'buyer';
    $uid = $user['firebaseUid'] ?? null;

    if (!$uid && $role === 'vendor' && !empty($user['vendorId'])) {
        $vendor = yustam_vendor_find_by_id((int) $user['vendorId'], get_db_connection());
        if ($vendor && !empty($vendor['firebase_uid'])) {
            $uid = $vendor['firebase_uid'];
        }
    }

    if (!$uid) {
        yustam_api_error(400, 'Your Firebase session is missing. Please sign in again.');
    }

    return [
        'role' => $role,
        'uid' => $uid,
        'name' => $user['displayName'] ?? ($role === 'vendor' ? 'Vendor' : 'Buyer'),
    ];
}

function yustam_api_chat_thread_from_fields(array $fields): array
{
    return [
        'id' => $fields['chat_id'] ?? '',
        'buyerUid' => $fields['buyer_uid'] ?? null,
        'buyerName' => $fields['buyer_name'] ?? null,
        'vendorUid' => $fields['vendor_uid'] ?? null,
        'vendorName' => $fields['vendor_business_name'] ?? $fields['vendor_name'] ?? null,
        'listingId' => $fields['listing_id'] ?? null,
        'listingTitle' => $fields['listing_title'] ?? null,
        'listingImage' => $fields['listing_image'] ?? null,
        'lastMessage' => $fields['last_text'] ?? null,
        'lastSenderRole' => $fields['last_sender_role'] ?? null,
        'unreadForBuyer' => (int) ($fields['unread_for_buyer'] ?? 0),
        'unreadForVendor' => (int) ($fields['unread_for_vendor'] ?? 0),
    ];
}

function yustam_api_chat_store_metadata(string $chatId, array $meta): void
{
    yustam_api_ensure_chat_table();
    $db = get_db_connection();
    $stmt = $db->prepare('REPLACE INTO `api_chat_threads` (chat_id, buyer_ref, vendor_ref, vendor_uid, buyer_uid, metadata) VALUES (?, ?, ?, ?, ?, ?)');
    if ($stmt instanceof mysqli_stmt) {
        $metadata = json_encode($meta, YUSTAM_API_JSON_FLAGS);
        $buyerRef = $meta['buyer_ref'] ?? '';
        $vendorRef = $meta['vendor_ref'] ?? '';
        $vendorUid = $meta['vendor_uid'] ?? '';
        $buyerUid = $meta['buyer_uid'] ?? '';
        $stmt->bind_param('ssssss', $chatId, $buyerRef, $vendorRef, $vendorUid, $buyerUid, $metadata);
        $stmt->execute();
        $stmt->close();
    }
}

/**
 * --------------------------------------------------------------------------
 * Home & Categories
 * --------------------------------------------------------------------------
 */
function yustam_api_category_list(): array
{
    return [
        'Phones & Tablets',
        'Electronics',
        'Fashion',
        'Property',
        'Food & Groceries',
        'Beauty',
        'Vehicles',
        'Home & Kitchen',
        'Power Solutions',
        'Computing',
        'Services',
        'Others',
    ];
}

function yustam_api_build_home_feed(): array
{
    $db = get_db_connection();
    $categories = yustam_api_category_list();

    $featured = yustam_api_fetch_listings([
        'status' => 'active',
        'limit' => 10,
        'order' => 'recent',
    ])['items'];

    $flashSales = yustam_api_fetch_listings([
        'status' => 'active',
        'limit' => 10,
        'order' => 'price',
    ])['items'];

    $vendorTable = YUSTAM_VENDORS_TABLE;
    $vendorCount = 0;
    $verifiedCount = 0;
    $listingCount = 0;

    $result = $db->query(sprintf('SELECT COUNT(*) AS total FROM `%s`', $vendorTable));
    if ($result instanceof mysqli_result) {
        $row = $result->fetch_assoc();
        $vendorCount = (int) ($row['total'] ?? 0);
        $result->free();
    }

    if (yustam_vendor_table_has_column('verification_status')) {
        $stmt = $db->prepare(sprintf(
            'SELECT COUNT(*) AS total FROM `%s` WHERE LOWER(`verification_status`) IN (\'approved\', \'verified\')',
            $vendorTable
        ));
        if ($stmt instanceof mysqli_stmt) {
            $stmt->execute();
            $rs = $stmt->get_result();
            $row = $rs ? $rs->fetch_assoc() : null;
            $verifiedCount = (int) ($row['total'] ?? 0);
            $stmt->close();
        }
    }

    $listingResult = $db->query("SELECT COUNT(*) AS total FROM `listings` WHERE LOWER(`status`) IN ('active','approved','live','published')");
    if ($listingResult instanceof mysqli_result) {
        $row = $listingResult->fetch_assoc();
        $listingCount = (int) ($row['total'] ?? 0);
        $listingResult->free();
    }

    return [
        'hero' => [
            'title' => 'Everything you need in one trusted marketplace',
            'subtitle' => 'Discover Nigerian vendors, compare listings, and shop safely.',
            'callToAction' => 'Shop now',
        ],
        'categories' => $categories,
        'featuredProducts' => $featured,
        'flashSales' => $flashSales,
        'stats' => [
            'totalVendors' => $vendorCount,
            'verifiedVendors' => $verifiedCount,
            'activeListings' => $listingCount,
        ],
    ];
}

/**
 * --------------------------------------------------------------------------
 * Products & Listings
 * --------------------------------------------------------------------------
 */
function yustam_api_fetch_listings(array $options = []): array
{
    $db = get_db_connection();
    yustam_listings_ensure_table($db);
    $columns = yustam_api_listings_columns($db);

    $page = max(1, (int) ($options['page'] ?? (int) ($_GET['page'] ?? 1)));
    $pageSize = max(1, min(100, (int) ($options['pageSize'] ?? (int) ($_GET['pageSize'] ?? 20))));
    if (!empty($options['limit'])) {
        $pageSize = min($pageSize, (int) $options['limit']);
        $page = 1;
    }
    $offset = ($page - 1) * $pageSize;

    $where = [];
    $types = '';
    $params = [];

    $search = trim((string) ($options['search'] ?? ($_GET['search'] ?? '')));
    if ($search !== '') {
        $where[] = '(l.`title` LIKE ? OR l.`description` LIKE ?)';
        $value = '%' . $search . '%';
        $types .= 'ss';
        $params[] = $value;
        $params[] = $value;
    }

    $category = trim((string) ($options['category'] ?? $options['categorySlug'] ?? ($_GET['categorySlug'] ?? $_GET['categoryId'] ?? '')));
    if ($category !== '') {
        $where[] = 'l.`category` = ?';
        $types .= 's';
        $params[] = $category;
    }

    $state = trim((string) ($options['locationState'] ?? ($_GET['locationState'] ?? '')));
    if ($state !== '' && in_array('state', $columns, true)) {
        $where[] = 'l.`state` = ?';
        $types .= 's';
        $params[] = $state;
    }

    $city = trim((string) ($options['locationCity'] ?? ($_GET['locationCity'] ?? '')));
    if ($city !== '' && in_array('city', $columns, true)) {
        $where[] = 'l.`city` = ?';
        $types .= 's';
        $params[] = $city;
    }

    $minPrice = $options['minPrice'] ?? $_GET['minPrice'] ?? null;
    if ($minPrice !== null && is_numeric($minPrice)) {
        $where[] = 'l.`price` >= ?';
        $types .= 'd';
        $params[] = (float) $minPrice;
    }

    $maxPrice = $options['maxPrice'] ?? $_GET['maxPrice'] ?? null;
    if ($maxPrice !== null && is_numeric($maxPrice)) {
        $where[] = 'l.`price` <= ?';
        $types .= 'd';
        $params[] = (float) $maxPrice;
    }

    $ownerRef = $options['ownerId'] ?? $_GET['ownerId'] ?? null;
    if ($ownerRef) {
        [$role, $id] = yustam_api_parse_user_reference((string) $ownerRef);
        if ($role === 'vendor' && $id > 0) {
            $where[] = 'l.`vendor_id` = ?';
            $types .= 'i';
            $params[] = $id;
        }
    }

    $statusFilter = strtolower((string) ($options['status'] ?? ($_GET['status'] ?? '')));
    $includeDrafts = filter_var($options['includeDrafts'] ?? $_GET['includeDrafts'] ?? false, FILTER_VALIDATE_BOOL);

    if ($statusFilter !== '') {
        $where[] = 'LOWER(l.`status`) = ?';
        $types .= 's';
        $params[] = $statusFilter;
    } elseif (!$includeDrafts && in_array('status', $columns, true)) {
        $where[] = 'LOWER(l.`status`) IN (\'active\', \'approved\', \'live\', \'published\')';
    }

    $isFeatured = $options['isFeatured'] ?? $_GET['isFeatured'] ?? null;
    if ($isFeatured !== null && in_array('is_featured', $columns, true)) {
        $where[] = 'l.`is_featured` = ?';
        $types .= 'i';
        $params[] = filter_var($isFeatured, FILTER_VALIDATE_BOOL) ? 1 : 0;
    }

    $isFlashSale = $options['isFlashSale'] ?? $_GET['isFlashSale'] ?? null;
    if ($isFlashSale !== null && in_array('is_flash_sale', $columns, true)) {
        $where[] = 'l.`is_flash_sale` = ?';
        $types .= 'i';
        $params[] = filter_var($isFlashSale, FILTER_VALIDATE_BOOL) ? 1 : 0;
    }

    $whereSql = $where ? 'WHERE ' . implode(' AND ', $where) : '';

    $countSql = 'SELECT COUNT(*) AS total FROM `listings` l ' . $whereSql;
    $countStmt = $db->prepare($countSql);
    if ($countStmt instanceof mysqli_stmt && $types !== '') {
        $countStmt->bind_param($types, ...$params);
    }
    $countStmt?->execute();
    $countResult = $countStmt ? $countStmt->get_result() : null;
    $total = $countResult ? (int) ($countResult->fetch_assoc()['total'] ?? 0) : 0;
    $countStmt?->close();

    $order = strtolower((string) ($options['order'] ?? $_GET['order'] ?? 'recent'));
    $orderBy = 'l.`created_at` DESC';
    if ($order === 'price') {
        $orderBy = 'CAST(l.`price` AS DECIMAL(18,2)) ASC';
    }

    $vendorTable = YUSTAM_VENDORS_TABLE;
    $listSql = sprintf(
        'SELECT l.*, v.id AS v_id, v.business_name, v.vendor_uid, v.email AS v_email, v.phone AS v_phone, v.plan AS v_plan, v.verification_status AS v_verification
         FROM `listings` l
         LEFT JOIN `%s` v ON v.id = l.vendor_id
         %s
         ORDER BY %s
         LIMIT ? OFFSET ?',
        $vendorTable,
        $whereSql,
        $orderBy
    );

    $dataStmt = $db->prepare($listSql);
    if ($dataStmt instanceof mysqli_stmt) {
        $bindTypes = $types . 'ii';
        $bindParams = $params;
        $bindParams[] = $pageSize;
        $bindParams[] = $offset;
        $dataStmt->bind_param($bindTypes, ...$bindParams);
        $dataStmt->execute();
        $result = $dataStmt->get_result();
    } else {
        $result = false;
    }

    $items = [];
    if ($result instanceof mysqli_result) {
        while ($row = $result->fetch_assoc()) {
            $vendor = null;
            if (!empty($row['v_id'])) {
                $vendor = [
                    'id' => (int) $row['v_id'],
                    'business_name' => $row['business_name'] ?? null,
                    'vendor_uid' => $row['vendor_uid'] ?? null,
                    'email' => $row['v_email'] ?? null,
                    'phone' => $row['v_phone'] ?? null,
                    'plan' => $row['v_plan'] ?? null,
                    'verification_status' => $row['v_verification'] ?? null,
                ];
            }
            $items[] = yustam_api_normalise_listing_row($row, $vendor);
        }
        $result->free();
    }
    $dataStmt?->close();

    return [
        'items' => $items,
        'pagination' => [
            'page' => $page,
            'pageSize' => $pageSize,
            'total' => $total,
            'totalPages' => max(1, (int) ceil($total / $pageSize)),
        ],
    ];
}

function yustam_api_find_listing(string $identifier): ?array
{
    $db = get_db_connection();
    yustam_listings_ensure_table($db);
    $vendorTable = YUSTAM_VENDORS_TABLE;

    $sql = sprintf(
        'SELECT l.*, v.id AS v_id, v.business_name, v.vendor_uid, v.email AS v_email, v.phone AS v_phone, v.plan AS v_plan, v.verification_status AS v_verification
         FROM `listings` l
         LEFT JOIN `%s` v ON v.id = l.vendor_id
         WHERE l.`public_id` = ? OR l.`firestore_id` = ? OR l.`id` = ?
         LIMIT 1',
        $vendorTable
    );

    $stmt = $db->prepare($sql);
    if (!$stmt instanceof mysqli_stmt) {
        return null;
    }
    $numericId = ctype_digit($identifier) ? (int) $identifier : 0;
    $stmt->bind_param('ssi', $identifier, $identifier, $numericId);
    $stmt->execute();
    $result = $stmt->get_result();
    $row = $result ? $result->fetch_assoc() : null;
    $stmt->close();
    return $row ?: null;
}

function yustam_api_products_list(): array
{
    $result = yustam_api_fetch_listings();
    return [
        'success' => true,
        'items' => $result['items'],
        'pagination' => $result['pagination'],
    ];
}

function yustam_api_products_get(string $productId): array
{
    $row = yustam_api_find_listing($productId);
    if (!$row) {
        yustam_api_error(404, 'Listing not found.');
    }
    $vendor = null;
    if (!empty($row['v_id'])) {
        $vendor = [
            'id' => (int) $row['v_id'],
            'business_name' => $row['business_name'] ?? null,
            'vendor_uid' => $row['vendor_uid'] ?? null,
            'email' => $row['v_email'] ?? null,
            'phone' => $row['v_phone'] ?? null,
            'plan' => $row['v_plan'] ?? null,
            'verification_status' => $row['v_verification'] ?? null,
        ];
    }
    return [
        'success' => true,
        'product' => yustam_api_normalise_listing_row($row, $vendor),
    ];
}

function yustam_api_products_create(): array
{
    $auth = yustam_api_require_auth(['vendor', 'admin']);
    $payload = yustam_api_read_json_body();

    $title = trim((string) ($payload['title'] ?? $payload['name'] ?? ''));
    if ($title === '') {
        yustam_api_error(422, 'Listing title is required.');
    }
    $description = trim((string) ($payload['description'] ?? ''));
    $price = isset($payload['price']) ? (float) $payload['price'] : null;
    if ($price === null || $price <= 0) {
        yustam_api_error(422, 'A valid price is required.');
    }

    $ownerRef = $payload['ownerId'] ?? null;
    $vendorId = null;
    if ($auth['role'] === 'vendor') {
        $vendorId = (int) ($auth['vendorId'] ?? 0);
    } elseif ($ownerRef) {
        [$role, $id] = yustam_api_parse_user_reference((string) $ownerRef);
        if ($role === 'vendor' && $id > 0) {
            $vendorId = $id;
        }
    }
    if (!$vendorId) {
        yustam_api_error(422, 'A vendor must be assigned to the listing.');
    }

    $db = get_db_connection();
    $vendor = yustam_vendor_find_by_id($vendorId, $db);
    if (!$vendor) {
        yustam_api_error(404, 'Vendor account not found.');
    }
    $vendorUid = yustam_vendor_assign_uid_if_missing($db, $vendor);

    $images = $payload['images'] ?? $payload['media'] ?? [];
    if (is_string($images)) {
        $decoded = json_decode($images, true);
        if (is_array($decoded)) {
            $images = $decoded;
        }
    }
    $imageUrls = [];
    if (is_array($images)) {
        foreach ($images as $image) {
            if (is_string($image) && trim($image) !== '') {
                $imageUrls[] = trim($image);
            } elseif (is_array($image) && isset($image['url'])) {
                $imageUrls[] = trim((string) $image['url']);
            }
        }
    }
    $primaryImage = trim((string) ($payload['primaryImage'] ?? $imageUrls[0] ?? ''));

    $listingId = 'lst_' . yustam_api_random_string(18);
    $publicId = 'yustam-' . yustam_api_random_string(10);

    yustam_listings_upsert($db, [
        'vendor_id' => $vendorId,
        'vendor_uid' => $vendorUid,
        'firestore_id' => $listingId,
        'public_id' => $publicId,
        'title' => $title,
        'description' => $description,
        'price' => $price,
        'status' => $payload['status'] ?? 'active',
        'primary_image' => $primaryImage,
        'image_urls' => $imageUrls,
        'category' => $payload['category'] ?? '',
        'subcategory' => $payload['subcategory'] ?? '',
        'location' => $payload['location'] ?? '',
        'city' => $payload['city'] ?? '',
        'state' => $payload['state'] ?? '',
        'country' => $payload['country'] ?? '',
    ]);

    return yustam_api_products_get($publicId);
}

function yustam_api_products_update(string $productId): array
{
    $auth = yustam_api_require_auth(['vendor', 'admin']);
    $row = yustam_api_find_listing($productId);
    if (!$row) {
        yustam_api_error(404, 'Listing not found.');
    }
    $vendorId = (int) ($row['vendor_id'] ?? 0);
    if ($auth['role'] !== 'admin' && (int) ($auth['vendorId'] ?? 0) !== $vendorId) {
        yustam_api_error(403, 'You can only update your own listings.');
    }

    $payload = yustam_api_read_json_body();
    $db = get_db_connection();
    $vendor = yustam_vendor_find_by_id($vendorId, $db);
    $vendorUid = $vendor ? yustam_vendor_assign_uid_if_missing($db, $vendor) : ($row['vendor_uid'] ?? '');

    $images = $payload['images'] ?? $payload['media'] ?? null;
    $imageUrls = null;
    if ($images !== null) {
        $imageUrls = [];
        if (is_string($images)) {
            $decoded = json_decode($images, true);
            if (is_array($decoded)) {
                $images = $decoded;
            }
        }
        if (is_array($images)) {
            foreach ($images as $image) {
                if (is_string($image) && trim($image) !== '') {
                    $imageUrls[] = trim($image);
                } elseif (is_array($image) && isset($image['url'])) {
                    $imageUrls[] = trim((string) $image['url']);
                }
            }
        }
    }

    $updatePayload = [
        'vendor_id' => $vendorId,
        'vendor_uid' => $vendorUid,
        'firestore_id' => $row['firestore_id'] ?? $row['public_id'] ?? $productId,
        'public_id' => $row['public_id'] ?? $productId,
    ];

    foreach (['title', 'description', 'status', 'category', 'subcategory', 'location', 'city', 'state', 'country'] as $field) {
        if (array_key_exists($field, $payload)) {
            $updatePayload[$field] = $payload[$field];
        }
    }
    if (array_key_exists('price', $payload)) {
        $updatePayload['price'] = (float) $payload['price'];
    }
    if (array_key_exists('primaryImage', $payload)) {
        $updatePayload['primary_image'] = $payload['primaryImage'];
    }
    if ($imageUrls !== null) {
        $updatePayload['image_urls'] = $imageUrls;
    }

    yustam_listings_upsert($db, $updatePayload);
    return yustam_api_products_get($productId);
}

function yustam_api_products_delete(string $productId): array
{
    $auth = yustam_api_require_auth(['vendor', 'admin']);
    $row = yustam_api_find_listing($productId);
    if (!$row) {
        yustam_api_error(404, 'Listing not found.');
    }
    $vendorId = (int) ($row['vendor_id'] ?? 0);
    if ($auth['role'] !== 'admin' && (int) ($auth['vendorId'] ?? 0) !== $vendorId) {
        yustam_api_error(403, 'You can only delete your own listings.');
    }

    $db = get_db_connection();
    $id = $row['public_id'] ?? $row['firestore_id'] ?? null;
    $stmt = $db->prepare('DELETE FROM `listings` WHERE `public_id` = ? OR `firestore_id` = ? LIMIT 1');
    if ($stmt instanceof mysqli_stmt) {
        $identifier = (string) $id;
        $stmt->bind_param('ss', $identifier, $identifier);
        $stmt->execute();
        $stmt->close();
    }

    return ['success' => true];
}
