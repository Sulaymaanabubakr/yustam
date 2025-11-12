<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/send-email.php';

$brandColor = "#004D40";
$accentColor = "#F3731E";
$bgColor = "#F5EDE2";
$logoUrl = "https://yustam.com.ng/logo.jpeg";

function showMessage($title, $message, $type = "success")
{
    global $brandColor, $accentColor, $bgColor, $logoUrl;

    $color = $type === "error" ? "#C62828" : $brandColor;

    echo "
    <html lang='en'>
    <head>
        <meta charset='UTF-8'>
        <meta name='viewport' content='width=device-width, initial-scale=1.0'>
        <title>YUSTAM Marketplace | Account Verification</title>
        <link href='https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap' rel='stylesheet'>
        <style>
            body {
                font-family: 'Inter', sans-serif;
                background: linear-gradient(145deg, {$bgColor}, #fff);
                display: flex;
                align-items: center;
                justify-content: center;
                min-height: 100vh;
                margin: 0;
                color: #111;
            }
            .card {
                background: #fff;
                padding: 40px 30px;
                border-radius: 16px;
                box-shadow: 0 8px 30px rgba(0,0,0,0.08);
                max-width: 420px;
                text-align: center;
            }
            .logo {
                width: 80px;
                border-radius: 8px;
                margin-bottom: 16px;
            }
            h2 {
                color: {$color};
                font-size: 1.6rem;
                margin-bottom: 10px;
            }
            p {
                color: #333;
                line-height: 1.6;
                font-size: 1rem;
            }
            a.btn {
                display: inline-block;
                background: {$accentColor};
                color: #fff;
                padding: 12px 24px;
                text-decoration: none;
                border-radius: 8px;
                font-weight: 600;
                margin-top: 20px;
                transition: background 0.3s ease;
            }
            a.btn:hover {
                background: #e4630b;
            }
            footer {
                margin-top: 25px;
                font-size: 0.85rem;
                color: rgba(0,0,0,0.5);
            }
        </style>
    </head>
    <body>
        <div class='card'>
            <img src='{$logoUrl}' alt='YUSTAM Logo' class='logo'>
            <h2>{$title}</h2>
            <p>{$message}</p>
            <a href='https://yustam.com.ng/vendor-login.html' class='btn'>Go to Login</a>
            <footer>© " . date('Y') . " YUSTAM Marketplace</footer>
        </div>
    </body>
    </html>
    ";
}

if (!isset($_GET['token']) || empty($_GET['token'])) {
    showMessage("Invalid Token", "Verification link is missing or invalid.", "error");
    exit;
}

$token = trim($_GET['token']);

try {
    $db = get_db_connection();
    $vendorTable = YUSTAM_VENDORS_TABLE;
    if (!preg_match('/^[A-Za-z0-9_]+$/', $vendorTable)) {
        throw new RuntimeException('Invalid vendor table name.');
    }

    $stmt = $db->prepare("SELECT id, full_name, email, verified FROM `{$vendorTable}` WHERE verification_token = ? LIMIT 1");
    $stmt->bind_param("s", $token);
    $stmt->execute();
    $result = $stmt->get_result();
    $user = $result->fetch_assoc();
    $stmt->close();

    if (!$user) {
        showMessage("Verification Failed", "This verification link is invalid or expired.", "error");
        exit;
    }

    if ((int)$user['verified'] === 1) {
        showMessage("Already Verified", "Your account is already verified. You can log in anytime.");
        exit;
    }

    // Update user record to verified
    $update = $db->prepare("UPDATE `{$vendorTable}` SET verified = 1, verification_token = NULL, updated_at = NOW() WHERE id = ?");
    $update->bind_param("i", $user['id']);
    $update->execute();
    $update->close();

    // Send welcome email
    $name = htmlspecialchars($user['full_name']);
    $email = htmlspecialchars($user['email']);
    $welcomeEmail = "
        <div style='font-family:Poppins,Arial,sans-serif;background:#f8f8f8;padding:30px;border-radius:10px;'>
            <div style='max-width:600px;margin:auto;background:white;border-radius:10px;padding:25px;border:1px solid #eee;'>
                <div style='text-align:center;'>
                    <img src='{$logoUrl}' alt='YUSTAM Logo' width='80' style='margin-bottom:15px;border-radius:8px;'>
                    <h2 style='color:{$brandColor};'>Welcome to YUSTAM Marketplace!</h2>
                </div>
                <p>Hi <strong>{$name}</strong>,</p>
                <p>Your vendor account has been successfully verified. You can now log in and start listing your products.</p>
                <p style='text-align:center;margin:25px 0;'>
                    <a href='https://yustam.com.ng/vendor-login.html' style='background:{$brandColor};color:#fff;padding:12px 20px;text-decoration:none;border-radius:6px;'>Go to Login</a>
                </p>
                <hr style='margin:25px 0;border:none;border-top:1px solid #ddd;'>
                <p style='font-size:13px;color:#999;text-align:center;margin-top:30px;'>
                    © " . date('Y') . " YUSTAM Marketplace. All rights reserved.
                </p>
            </div>
        </div>
    ";
    sendEmail($email, "Welcome to YUSTAM Marketplace", $welcomeEmail);

    showMessage("Verification Successful", "Your email has been verified successfully. Welcome to YUSTAM Marketplace!");
} catch (Throwable $e) {
    error_log('Verification error: ' . $e->getMessage());
    showMessage("System Error", "Something went wrong while verifying your account. Please try again later.", "error");
}
?>
