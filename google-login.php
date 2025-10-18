<?php
require_once __DIR__ . '/session-path.php';
session_start();

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/send-email.php';
require_once __DIR__ . '/firebase-admin.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'message' => 'Invalid request method']);
    exit;
}

$idToken = trim($_POST['idToken'] ?? '');
$provider = trim($_POST['provider'] ?? 'google');

if ($idToken === '') {
    echo json_encode(['success' => false, 'message' => 'Missing Google sign-in token.']);
    exit;
}

try {
    $firebaseUser = yustam_firebase_lookup_id_token($idToken);
} catch (Throwable $e) {
    error_log('Vendor Google login token verification failed: ' . $e->getMessage());
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Unable to verify Google sign-in. Please try again.']);
    exit;
}

$firebaseUid = (string) ($firebaseUser['localId'] ?? '');
if ($firebaseUid === '') {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Unable to verify your Google account.']);
    exit;
}

$email = strtolower(trim($firebaseUser['email'] ?? $_POST['email'] ?? ''));
if ($email === '') {
    echo json_encode(['success' => false, 'message' => 'Your Google account does not have an email address.']);
    exit;
}

$displayName = trim($firebaseUser['displayName'] ?? $_POST['name'] ?? '');
if ($displayName === '') {
    $displayName = 'Google Vendor';
}

$db = get_db_connection();

$vendor = yustam_vendor_find_by_firebase_uid($firebaseUid, $db);
if (!$vendor) {
    $vendor = yustam_vendor_find_by_email($email, $db);
    if ($vendor) {
        yustam_vendor_set_firebase_uid((int) $vendor['id'], $firebaseUid, $db);
        $vendor = yustam_vendor_find_by_firebase_uid($firebaseUid, $db) ?: $vendor;
    }
}

$createdNewVendor = false;

if (!$vendor) {
    $vendorTable = YUSTAM_VENDORS_TABLE;
    if (!preg_match('/^[A-Za-z0-9_]+$/', $vendorTable)) {
        throw new RuntimeException('Invalid vendor table name.');
    }

    $businessName = $displayName . ' Store';
    $category = 'General';
    $verified = 1;
    $phone = '';
    $randomPassword = password_hash(bin2hex(random_bytes(16)), PASSWORD_DEFAULT);

    $insertSql = sprintf(
        'INSERT INTO `%s` (vendor_uid, firebase_uid, full_name, email, phone, password, business_name, category, provider, verification_token, verified, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, NOW(), NOW())',
        $vendorTable
    );
    $stmt = $db->prepare($insertSql);
    if (!$stmt) {
        throw new RuntimeException('Unable to prepare vendor insert statement.');
    }

    $vendorUid = '';
    $stmt->bind_param('sssssssssi', $vendorUid, $firebaseUid, $displayName, $email, $phone, $randomPassword, $businessName, $category, $provider, $verified);

    $maxAttempts = 5;
    $created = false;

    for ($attempt = 0; $attempt < $maxAttempts; $attempt++) {
        $vendorUid = yustam_generate_vendor_uid($db);
        try {
            $stmt->execute();
            $created = true;
            break;
        } catch (mysqli_sql_exception $exception) {
            if ((int) $exception->getCode() === 1062 && stripos($exception->getMessage(), 'vendor_uid') !== false) {
                $stmt->reset();
                continue;
            }
            $stmt->close();
            throw $exception;
        }
    }

    $stmt->close();

    if (!$created) {
        throw new RuntimeException('Unable to generate a unique vendor UID. Please try again.');
    }

    $vendor = yustam_vendor_find_by_firebase_uid($firebaseUid, $db);
    if (!$vendor) {
        throw new RuntimeException('Vendor record could not be created.');
    }

    $createdNewVendor = true;
} else {
    $update = $db->prepare(sprintf('UPDATE `%s` SET full_name = ?, email = ?, provider = ?, verified = 1, updated_at = NOW() WHERE id = ? LIMIT 1', YUSTAM_VENDORS_TABLE));
    if ($update) {
        $update->bind_param('sssi', $displayName, $email, $provider, $vendor['id']);
        $update->execute();
        $update->close();
        $vendor = yustam_vendor_find_by_firebase_uid($firebaseUid, $db) ?: $vendor;
    }
}

$vendorUid = yustam_vendor_assign_uid_if_missing($db, $vendor);

$_SESSION['vendor_id'] = (int) $vendor['id'];
$_SESSION['vendor_name'] = $displayName;
$_SESSION['vendor_email'] = $email;
$_SESSION['vendor_uid'] = $vendorUid;
$_SESSION['vendor_firebase_uid'] = $firebaseUid;
$_SESSION['firebase_uid'] = $firebaseUid;
$_SESSION['yustam_uid'] = $firebaseUid;
$_SESSION['yustam_role'] = 'vendor';

if ($createdNewVendor) {
    $host = !empty($_SERVER['HTTP_HOST']) ? $_SERVER['HTTP_HOST'] : 'yustam.com.ng';
    $dashboardUrl = 'https://' . $host . '/vendor-dashboard.php';
    $profileUrl = 'https://' . $host . '/vendor-edit-profile.php';
    $welcomeBody = "
      <h2 style=\"margin:0 0 12px; font-family:'Inter',Arial,sans-serif; color:#0f6a53;\">Welcome to YUSTAM Marketplace, {$displayName}!</h2>
      <p style=\"margin:0 0 12px; font-family:'Inter',Arial,sans-serif; color:#333333; line-height:1.6;\">
        Your vendor account has been created via Google sign-in. We are excited to have you onboard.
      </p>
      <p style=\"margin:0 0 12px; font-family:'Inter',Arial,sans-serif; color:#333333; line-height:1.6;\">
        Visit your dashboard to set up your storefront, publish listings and reach buyers faster.
      </p>
      <p style=\"margin:0 0 20px; font-family:'Inter',Arial,sans-serif;\">
        <a href=\"{$dashboardUrl}\" style=\"display:inline-block; padding:10px 18px; background:#f3731e; color:#ffffff; text-decoration:none; border-radius:8px;\">Go to Dashboard</a>
      </p>
      <p style=\"margin:0; font-family:'Inter',Arial,sans-serif; color:#333333; line-height:1.6;\">
        Want to complete your profile now? <a href=\"{$profileUrl}\">Finish your vendor profile</a> to attract more buyers.
      </p>
      <p style=\"margin:20px 0 0; font-family:'Inter',Arial,sans-serif; color:#333333; line-height:1.6;\">
        Cheers,<br>YUSTAM Marketplace Support
      </p>
    ";

    if (!sendEmail($email, 'Welcome to YUSTAM Marketplace', $welcomeBody)) {
        error_log('Vendor Google login: failed to send welcome email to ' . $email);
    }
}

echo json_encode([
    'success' => true,
    'redirect' => 'vendor-dashboard.php',
    'message' => 'Welcome, ' . htmlspecialchars($displayName) . '! Your account is ready.',
    'firebase_uid' => $firebaseUid,
    'uid' => $firebaseUid,
    'role' => 'vendor',
]);
