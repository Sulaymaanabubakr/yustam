<?php
require_once __DIR__ . '/session-path.php';
session_start();

require_once __DIR__ . '/buyer-storage.php';
require_once __DIR__ . '/send-email.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'message' => 'Invalid request method']);
    exit;
}

$name = trim($_POST['name'] ?? '');
$email = strtolower(trim($_POST['email'] ?? ''));
$provider = trim($_POST['provider'] ?? 'google');

if ($email === '') {
    echo json_encode(['success' => false, 'message' => 'Email is required.']);
    exit;
}

try {
    $existing = yustam_buyers_find_by_email($email);
    if ($existing) {
        $existing = yustam_buyers_ensure_uid($existing);
        $_SESSION['buyer_id'] = (int)$existing['id'];
        $_SESSION['buyer_name'] = $existing['name'] ?? ($name ?: 'Buyer');
        $_SESSION['buyer_email'] = $existing['email'];
        $_SESSION['buyer_uid'] = $existing['buyer_uid'] ?? null;

        echo json_encode([
            'success' => true,
            'redirect' => 'buyer-dashboard.php',
            'message' => 'Welcome back, ' . htmlspecialchars($existing['name'] ?? ($name ?: 'Buyer')),
            'uid' => $existing['buyer_uid'] ?? null,
            'role' => 'buyer'
        ]);
        exit;
    }

    $fallbackName = $name !== '' ? $name : 'Google Buyer';
    $randomPassword = bin2hex(random_bytes(12));
    $passwordHash = password_hash($randomPassword, PASSWORD_DEFAULT);

    $buyer = yustam_buyers_create($fallbackName, $email, '', $passwordHash, $provider ?: 'google');

    $_SESSION['buyer_id'] = (int)$buyer['id'];
    $_SESSION['buyer_name'] = $buyer['name'];
    $_SESSION['buyer_email'] = $buyer['email'];
    $_SESSION['buyer_uid'] = $buyer['buyer_uid'] ?? null;

    $host = !empty($_SERVER['HTTP_HOST']) ? $_SERVER['HTTP_HOST'] : 'yustam.com.ng';
    $dashboardUrl = 'https://' . $host . '/buyer-dashboard.php';

    $welcomeBody = "
      <h2 style=\"margin:0 0 12px; font-family:'Inter',Arial,sans-serif; color:#0f6a53;\">Welcome to YUSTAM Marketplace, {$buyer['name']}!</h2>
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

    if (!sendEmail($buyer['email'], 'Welcome to YUSTAM Marketplace', $welcomeBody)) {
        error_log('Buyer Google login: failed to send welcome email to ' . $buyer['email']);
    }

    echo json_encode([
        'success' => true,
        'redirect' => 'buyer-dashboard.php',
        'message' => 'Welcome, ' . htmlspecialchars($buyer['name']) . '! Your account has been created.',
        'uid' => $buyer['buyer_uid'] ?? null,
        'role' => 'buyer'
    ]);
} catch (Throwable $e) {
    error_log('Buyer Google login error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
}
