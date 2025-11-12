<?php
require_once __DIR__ . '/session-path.php';
session_start();

require_once __DIR__ . '/buyer-storage.php';
require_once __DIR__ . '/send-email.php';
require_once __DIR__ . '/firebase-admin.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'message' => 'Invalid request method']);
    exit;
}

$idToken = trim($_POST['idToken'] ?? '');
$explicitEmail = strtolower(trim($_POST['email'] ?? ''));
$explicitName = trim($_POST['name'] ?? '');
$provider = trim($_POST['provider'] ?? 'google');

if ($idToken === '') {
    echo json_encode(['success' => false, 'message' => 'Missing Google sign-in token.']);
    exit;
}

try {
    $firebaseUser = yustam_firebase_lookup_id_token($idToken);
} catch (Throwable $e) {
    error_log('Buyer Google login token verification failed: ' . $e->getMessage());
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

$email = strtolower(trim($firebaseUser['email'] ?? $explicitEmail));
if ($email === '') {
    echo json_encode(['success' => false, 'message' => 'Your Google account does not have an email address.']);
    exit;
}

$displayName = trim($firebaseUser['displayName'] ?? $explicitName);
if ($displayName === '') {
    $displayName = 'Google Buyer';
}

$buyer = yustam_buyers_find_by_firebase_uid($firebaseUid);
if (!$buyer) {
    $existingByEmail = yustam_buyers_find_by_email($email);
    if ($existingByEmail) {
        yustam_buyers_set_firebase_uid((int) $existingByEmail['id'], $firebaseUid);
        $buyer = yustam_buyers_find((int) $existingByEmail['id']);
    }
}

$createdNewBuyer = false;

if (!$buyer) {
    $randomPassword = password_hash(bin2hex(random_bytes(16)), PASSWORD_DEFAULT);
    try {
        $buyer = yustam_buyers_create($firebaseUid, $displayName, $email, '', $randomPassword, $provider ?: 'google');
        $createdNewBuyer = true;
    } catch (Throwable $createError) {
        error_log('Buyer Google login storage error: ' . $createError->getMessage());
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Unable to create your account. Please try again.']);
        exit;
    }
} else {
    $conn = yustam_buyers_connection();
    $update = $conn->prepare('UPDATE `buyers` SET `name` = ?, `email` = ?, `provider` = ? WHERE `id` = ? LIMIT 1');
    if ($update) {
        $update->bind_param('sssi', $displayName, $email, $provider, $buyer['id']);
        $update->execute();
        $update->close();
        $buyer = yustam_buyers_find((int) $buyer['id']);
    }
}

$buyer = yustam_buyers_ensure_uid($buyer);

$_SESSION['buyer_id'] = (int) $buyer['id'];
$_SESSION['buyer_name'] = $buyer['name'] ?? $displayName;
$_SESSION['buyer_email'] = $buyer['email'] ?? $email;
$_SESSION['buyer_uid'] = $buyer['buyer_uid'] ?? null;
$_SESSION['buyer_firebase_uid'] = $firebaseUid;
$_SESSION['firebase_uid'] = $firebaseUid;
$_SESSION['yustam_uid'] = $firebaseUid;
$_SESSION['yustam_role'] = 'buyer';

if ($createdNewBuyer) {
    $host = !empty($_SERVER['HTTP_HOST']) ? $_SERVER['HTTP_HOST'] : 'yustam.com.ng';
    $dashboardUrl = 'https://' . $host . '/buyer-dashboard.php';

    $welcomeBody = "
      <h2 style=\"margin:0 0 12px; font-family:'Inter',Arial,sans-serif; color:#0f6a53;\">Welcome to YUSTAM Marketplace, {$displayName}!</h2>
      <p style=\"margin:0 0 12px; font-family:'Inter',Arial,sans-serif; color:#333333; line-height:1.6;\">
        Your buyer account has been created via Google sign-in. Start exploring fresh listings, save your favourites, and connect with trusted vendors.
      </p>
      <p style=\"margin:0 0 18px; font-family:'Inter',Arial,sans-serif;\">
        <a href=\"{$dashboardUrl}\" style=\"display:inline-block; padding:10px 18px; background:#f3731e; color:#ffffff; text-decoration:none; border-radius:8px;\">Go to your buyer dashboard</a>
      </p>
      <p style=\"margin:0; font-family:'Inter',Arial,sans-serif; color:#333333; line-height:1.6;\">
        Keep shopping with confidence!
      </p>
      <p style=\"margin:18px 0 0; font-family:'Inter',Arial,sans-serif; color:#333333; line-height:1.6;\">
        Cheers,<br>YUSTAM Marketplace Support
      </p>
    ";

    if (!sendEmail($email, 'Welcome to YUSTAM Marketplace', $welcomeBody)) {
        error_log('Buyer Google login: failed to send welcome email to ' . $email);
    }
}

echo json_encode([
    'success' => true,
    'redirect' => 'buyer-dashboard.php',
    'message' => 'Welcome back, ' . htmlspecialchars($buyer['name'] ?? $displayName),
    'firebase_uid' => $firebaseUid,
    'uid' => $firebaseUid,
    'role' => 'buyer',
]);
