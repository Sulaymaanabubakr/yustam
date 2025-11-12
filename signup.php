<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/send-email.php';
require_once __DIR__ . '/firebase-admin.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'message' => 'Invalid request method.']);
    exit;
}

$name         = trim($_POST['name'] ?? '');
$email        = strtolower(trim($_POST['email'] ?? ''));
$phone        = trim($_POST['phone'] ?? '');
$password     = $_POST['password'] ?? '';
$confirm      = $_POST['confirm'] ?? '';
$businessName = trim($_POST['business_name'] ?? '');
$category     = trim($_POST['category'] ?? '');

if ($name === '' || $email === '' || $phone === '' || $password === '' || $businessName === '' || $category === '') {
    echo json_encode(['success' => false, 'message' => 'Please fill in all fields.']);
    exit;
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    echo json_encode(['success' => false, 'message' => 'Invalid email address.']);
    exit;
}

if (strlen($password) < 6) {
    echo json_encode(['success' => false, 'message' => 'Password must be at least 6 characters.']);
    exit;
}

if ($password !== $confirm) {
    echo json_encode(['success' => false, 'message' => 'Passwords do not match.']);
    exit;
}

$firebaseUid = '';
$firebaseIdToken = '';

try {
    $db = get_db_connection();
    $vendorTable = YUSTAM_VENDORS_TABLE;
    if (!preg_match('/^[A-Za-z0-9_]+$/', $vendorTable)) {
        throw new RuntimeException('Invalid vendor table name.');
    }

    $check = $db->prepare(sprintf('SELECT id FROM `%s` WHERE email = ? LIMIT 1', $vendorTable));
    $check->bind_param('s', $email);
    $check->execute();
    $result = $check->get_result();
    if ($result && $result->num_rows > 0) {
        $check->close();
        echo json_encode(['success' => false, 'message' => 'This email is already registered.']);
        exit;
    }
    $check->close();

    try {
        $firebaseUser = yustam_firebase_create_user($email, $password, $name);
        $firebaseUid = (string) ($firebaseUser['localId'] ?? '');
        $firebaseIdToken = isset($firebaseUser['idToken']) ? (string) $firebaseUser['idToken'] : '';
        if ($firebaseUid === '') {
            throw new RuntimeException('Authentication service did not return a UID.');
        }
    } catch (YustamFirebaseAuthException $firebaseError) {
        if (strtoupper($firebaseError->getErrorCode()) === 'EMAIL_EXISTS') {
            echo json_encode(['success' => false, 'message' => 'This email is already registered.']);
            exit;
        }
        echo json_encode(['success' => false, 'message' => $firebaseError->getMessage()]);
        exit;
    } catch (Throwable $firebaseError) {
        error_log('Vendor signup auth error: ' . $firebaseError->getMessage());
        throw $firebaseError;
    }

    $hashedPassword = password_hash($password, PASSWORD_DEFAULT);
    $verificationToken = bin2hex(random_bytes(32));

    try {
        $vendor = yustam_vendor_create($db, [
            'firebase_uid' => $firebaseUid,
            'name' => $name,
            'email' => $email,
            'phone' => $phone,
            'password_hash' => $hashedPassword,
            'business_name' => $businessName,
            'category' => $category,
            'provider' => 'email',
            'verification_token' => $verificationToken,
            'verified' => 0,
        ]);
    } catch (RuntimeException $creationError) {
        if (stripos($creationError->getMessage(), 'already') !== false) {
            echo json_encode(['success' => false, 'message' => $creationError->getMessage()]);
            exit;
        }
        throw $creationError;
    }

    if (empty($vendor)) {
        throw new RuntimeException('Vendor record could not be created.');
    }

    $vendorUid = $vendor['vendor_uid'] ?? '';
    if ($vendorUid === '') {
        $vendorUid = yustam_vendor_assign_uid_if_missing($db, $vendor);
    }

    $verifyLink = 'https://yustam.com.ng/verify.php?token=' . urlencode($verificationToken);
    $safeName = htmlspecialchars($name, ENT_QUOTES, 'UTF-8');

    $emailBody = "
    <div style='font-family:Inter,Arial,sans-serif;background:#f5ede2;padding:40px 20px;'>
      <div style='max-width:600px;margin:auto;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 10px 40px rgba(0,0,0,0.07);border:1px solid #eee;'>
        <div style='background:#004D40;padding:24px;text-align:center;'>
          <img src='https://yustam.com.ng/logo.jpeg' alt='YUSTAM Logo' width='85' style='border-radius:8px;margin-bottom:10px;'>
          <h2 style='color:#fff;margin:0;font-size:1.6rem;'>Welcome to YUSTAM Marketplace</h2>
        </div>
        <div style='padding:32px 24px;'>
          <p style='font-size:1rem;color:#222;'>Hi <strong>{$safeName}</strong>,</p>
          <p style='font-size:1rem;color:#333;line-height:1.6;'>
            We're thrilled to have you onboard as a vendor!<br><br>
            YUSTAM Marketplace is where smart businesses like yours connect with real customers.
            Before we get started, please verify your email address to activate your account.
          </p>
          <div style='text-align:center;margin:30px 0;'>
            <a href='{$verifyLink}' style='background:#F3731E;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block;'>Verify My Account</a>
          </div>
          <p style='font-size:0.95rem;color:#555;line-height:1.6;'>
            Or copy this link into your browser:<br>
            <span style='color:#004D40;word-break:break-all;'>{$verifyLink}</span>
          </p>
          <hr style='margin:30px 0;border:none;border-top:1px solid #eee;'>
          <p style='font-size:0.9rem;color:#666;text-align:center;'>
            After verification, you can log in and start uploading your listings immediately.<br>
            If you didn't create this account, simply ignore this email.
          </p>
        </div>
        <div style='background:#f5ede2;padding:16px;text-align:center;font-size:0.85rem;color:#777;'>
          c " . date('Y') . " YUSTAM Marketplace. All rights reserved.
        </div>
      </div>
    </div>";

    sendEmail($email, 'Welcome to YUSTAM Marketplace - Verify Your Account', $emailBody);

    echo json_encode(['success' => true, 'message' => 'Account created! Please check your email to verify your account.']);
} catch (Throwable $e) {
    if ($firebaseUid !== '') {
        try {
            yustam_firebase_delete_user($firebaseUid, $firebaseIdToken ?: null);
        } catch (Throwable $cleanupError) {
            error_log('Vendor signup cleanup failed: ' . $cleanupError->getMessage());
        }
    }
    error_log('Vendor signup failed: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'We could not create your account right now. Please try again.']);
}
