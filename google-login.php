<?php
require_once __DIR__ . '/session-path.php';
session_start();

require_once __DIR__ . '/db.php';
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
    $db = get_db_connection();
    $vendorTable = YUSTAM_VENDORS_TABLE;
    if (!preg_match('/^[A-Za-z0-9_]+$/', $vendorTable)) {
        throw new RuntimeException('Invalid vendor table name.');
    }

    $check = $db->prepare(sprintf('SELECT id, vendor_uid, full_name FROM `%s` WHERE email = ? LIMIT 1', $vendorTable));
    $check->bind_param('s', $email);
    $check->execute();
    $result = $check->get_result();

    if ($result && $result->num_rows > 0) {
        $user = $result->fetch_assoc();
        $check->close();
        $vendorUid = yustam_vendor_assign_uid_if_missing($db, $user);

        $_SESSION['vendor_id'] = $user['id'];
        $_SESSION['vendor_name'] = $user['full_name'] ?? $name;
        $_SESSION['vendor_email'] = $email;
        $_SESSION['vendor_uid'] = $vendorUid;

        echo json_encode([
            'success' => true,
            'redirect' => 'vendor-dashboard.php',
            'message' => 'Welcome back, ' . htmlspecialchars($user['full_name'] ?? $name),
            'uid' => $vendorUid,
            'role' => 'vendor'
        ]);
        exit;
    }

    $check->close();

    $fallbackName = $name !== '' ? $name : 'Google Vendor';
    $randomPassword = bin2hex(random_bytes(12));
    $hashedPassword = password_hash($randomPassword, PASSWORD_DEFAULT);
    $businessName = $fallbackName . ' Store';
    $defaultCategory = 'General';
    $emptyPhone = '';

    $insertSql = sprintf(
        'INSERT INTO `%s` (vendor_uid, full_name, email, phone, password, business_name, category, provider, verified, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW())',
        $vendorTable
    );
    $insert = $db->prepare($insertSql);
    if ($insert === false) {
        throw new RuntimeException('Unable to prepare vendor creation statement.');
    }

    $vendorUid = '';
    $insert->bind_param(
        'ssssssss',
        $vendorUid,
        $fallbackName,
        $email,
        $emptyPhone,
        $hashedPassword,
        $businessName,
        $defaultCategory,
        $provider
    );

    $maxAttempts = 5;
    $created = false;

    for ($attempt = 0; $attempt < $maxAttempts; $attempt++) {
        $vendorUid = yustam_generate_vendor_uid($db);

        try {
            $insert->execute();
            $created = true;
            break;
        } catch (mysqli_sql_exception $exception) {
            if ((int) $exception->getCode() === 1062) {
                $message = $exception->getMessage();
                if (stripos($message, 'vendor_uid') !== false) {
                    $insert->reset();
                    continue;
                }

                if (stripos($message, 'email') !== false) {
                    $insert->close();
                    echo json_encode(['success' => false, 'message' => 'This email is already registered.']);
                    exit;
                }
            }

            $insert->close();
            throw $exception;
        }
    }

    if (!$created) {
        $insert->close();
        throw new RuntimeException('Unable to generate a unique vendor UID. Please try again.');
    }

    $newVendorId = (int) $db->insert_id;
    $insert->close();

    $_SESSION['vendor_id'] = $newVendorId;
    $_SESSION['vendor_name'] = $fallbackName;
    $_SESSION['vendor_email'] = $email;
    $_SESSION['vendor_uid'] = $vendorUid;

    $host = !empty($_SERVER['HTTP_HOST']) ? $_SERVER['HTTP_HOST'] : 'yustam.com.ng';
    $dashboardUrl = 'https://' . $host . '/vendor-dashboard.php';
    $profileUrl = 'https://' . $host . '/vendor-edit-profile.php';
    $welcomeBody = "
      <h2 style=\"margin:0 0 12px; font-family:'Inter',Arial,sans-serif; color:#0f6a53;\">Welcome to YUSTAM Marketplace, {$fallbackName}!</h2>
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
      error_log('Google login: failed to send welcome email to ' . $email);
    }

    echo json_encode([
        'success' => true,
        'redirect' => 'vendor-dashboard.php',
        'message' => 'Welcome, ' . htmlspecialchars($fallbackName) . '! Your account has been created.',
        'uid' => $vendorUid,
        'role' => 'vendor'
    ]);
} catch (Throwable $e) {
    error_log('Google login error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
}

?>
