<?php
declare(strict_types=1);

require_once __DIR__ . '/session-path.php';
session_start();

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/firebase-admin.php';

header('Content-Type: application/json');

$respond = function (bool $success, string $message, int $status = 200, array $extra = []): void {
    http_response_code($status);
    echo json_encode(array_merge([
        'success' => $success,
        'message' => $message,
    ], $extra));
    exit;
};

if (!isset($_SESSION['vendor_id'])) {
    $respond(false, 'Please sign in to update your password.', 401);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    $respond(false, 'Unsupported request method.', 405);
}

$rawInput = file_get_contents('php://input');
$payload = json_decode($rawInput, true);
if (!is_array($payload)) {
    $payload = $_POST;
}

$currentPassword = (string)($payload['currentPassword'] ?? '');
$newPassword = (string)($payload['newPassword'] ?? '');
$confirmPassword = (string)($payload['confirmPassword'] ?? '');

if ($newPassword === '' || $confirmPassword === '') {
    $respond(false, 'Enter and confirm your new password.', 400);
}

if ($newPassword !== $confirmPassword) {
    $respond(false, 'New passwords do not match.', 400);
}

if (strlen($newPassword) < 6) {
    $respond(false, 'Password must be at least 6 characters.', 400);
}

if ($currentPassword !== '' && $currentPassword === $newPassword) {
    $respond(false, 'Choose a password different from the current one.', 400);
}

$vendorId = (int)$_SESSION['vendor_id'];
$conn = get_db_connection();
$vendor = yustam_vendor_find_by_id($vendorId, $conn);
if (!$vendor) {
    $respond(false, 'Vendor account not found.', 404);
}

$email = strtolower(trim((string)($vendor['email'] ?? ($_SESSION['vendor_email'] ?? ''))));
if ($email === '') {
    $respond(false, 'This account does not have an email address on file. Please contact support.', 400);
}

$provider = strtolower(trim((string)($vendor['provider'] ?? '')));
$requiresCurrent = true;

$hasPasswordColumn = yustam_vendor_table_has_column('password');
$storedPassword = $hasPasswordColumn ? (string)($vendor['password'] ?? '') : '';

if (!$hasPasswordColumn) {
    $respond(false, 'Password storage is not configured for this account. Please contact support.', 500);
}

if ($storedPassword === '') {
    $requiresCurrent = false;
}

if (!in_array($provider, ['email', 'password'], true)) {
    $requiresCurrent = false;
}

if ($requiresCurrent && $currentPassword === '') {
    $respond(false, 'Enter your current password to continue.', 400);
}

$verifiedFirebaseUid = '';

if ($requiresCurrent) {
    try {
        $authResponse = yustam_firebase_sign_in_with_password($email, $currentPassword);
        $verifiedFirebaseUid = (string)($authResponse['localId'] ?? '');
    } catch (YustamFirebaseAuthException $authError) {
        $respond(false, 'Current password is incorrect.', 400);
    } catch (Throwable $authError) {
        error_log('Vendor password update: unable to verify current password for vendor ' . $vendorId . ': ' . $authError->getMessage());
        $respond(false, 'Unable to verify your current password right now. Please try again.', 500);
    }
}

$firebaseUid = trim((string)($vendor['firebase_uid'] ?? ''));
if ($firebaseUid === '' && $verifiedFirebaseUid !== '') {
    $firebaseUid = $verifiedFirebaseUid;
    try {
        yustam_vendor_set_firebase_uid($vendorId, $firebaseUid, $conn);
    } catch (Throwable $syncError) {
        error_log('Vendor password update: unable to store Firebase UID from verification for vendor ' . $vendorId . ': ' . $syncError->getMessage());
    }
}
if ($firebaseUid === '') {
    try {
        $firebaseRecord = yustam_firebase_get_user_by_email($email);
        if (is_array($firebaseRecord) && !empty($firebaseRecord['localId'])) {
            $firebaseUid = (string)$firebaseRecord['localId'];
            try {
                yustam_vendor_set_firebase_uid($vendorId, $firebaseUid, $conn);
            } catch (Throwable $syncError) {
                error_log('Vendor password update: unable to store Firebase UID for vendor ' . $vendorId . ': ' . $syncError->getMessage());
            }
        }
    } catch (Throwable $lookupError) {
        error_log('Vendor password update: unable to lookup Firebase account by email for vendor ' . $vendorId . ': ' . $lookupError->getMessage());
    }
}

if ($firebaseUid === '') {
    $respond(false, 'Unable to locate your authentication record. Please contact support.', 500);
}

try {
    yustam_firebase_update_user_password($firebaseUid, $newPassword);
} catch (YustamFirebaseAuthException $firebaseError) {
    $respond(false, $firebaseError->getMessage(), 400);
} catch (Throwable $firebaseError) {
    error_log('Vendor password update: unable to update Firebase password for vendor ' . $vendorId . ': ' . $firebaseError->getMessage());
    $respond(false, 'Unable to update your password right now. Please try again.', 500);
}

$passwordHash = password_hash($newPassword, PASSWORD_DEFAULT);

$setParts = [];
$types = '';
$values = [];

if ($hasPasswordColumn) {
    $setParts[] = '`password` = ?';
    $types .= 's';
    $values[] = $passwordHash;
}

if (yustam_vendor_table_has_column('provider')) {
    $setParts[] = '`provider` = ?';
    $types .= 's';
    $values[] = 'email';
}

if (yustam_vendor_table_has_column('updated_at')) {
    $setParts[] = '`updated_at` = NOW()';
}

if (!$setParts) {
    $respond(false, 'Unable to update your account record. Please contact support.', 500);
}

$types .= 'i';
$values[] = $vendorId;

$sql = sprintf(
    'UPDATE `%s` SET %s WHERE id = ? LIMIT 1',
    YUSTAM_VENDORS_TABLE,
    implode(', ', $setParts)
);

$stmt = $conn->prepare($sql);
if (!$stmt) {
    $respond(false, 'Unable to update your account record. Please contact support.', 500);
}

$params = [$types];
foreach ($values as $index => $value) {
    $params[] = &$values[$index];
}
call_user_func_array([$stmt, 'bind_param'], $params);

$stmt->execute();
$stmt->close();

$_SESSION['vendor_provider'] = 'email';

$respond(true, 'Password updated successfully. You can now sign in with your email and new password.');
