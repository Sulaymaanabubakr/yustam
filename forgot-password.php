<?php
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/send-email.php';

$message = isset($_GET['message']) ? trim($_GET['message']) : '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    header('Content-Type: application/json');

    $email = strtolower(trim($_POST['email'] ?? ''));

    if ($email === '') {
        echo json_encode(['success' => false, 'message' => 'Please enter your email address.']);
        exit;
    }

    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        echo json_encode(['success' => false, 'message' => 'Invalid email address.']);
        exit;
    }

    try {
        $db = get_db_connection();
        $vendorTable = YUSTAM_VENDORS_TABLE;
        if (!preg_match('/^[A-Za-z0-9_]+$/', $vendorTable)) {
            throw new RuntimeException('Invalid vendor table name.');
        }

        $stmt = $db->prepare(sprintf('SELECT id, full_name FROM `%s` WHERE email = ? LIMIT 1', $vendorTable));
        $stmt->bind_param('s', $email);
        $stmt->execute();
        $result = $stmt->get_result();
        $user = $result->fetch_assoc();
        $stmt->close();

        if (!$user) {
            echo json_encode(['success' => false, 'message' => 'No account found with that email.']);
            exit;
        }

        $delete = $db->prepare('DELETE FROM password_resets WHERE user_id = ?');
        $delete->bind_param('i', $user['id']);
        $delete->execute();
        $delete->close();

        $token = bin2hex(random_bytes(32));
        $expires = date('Y-m-d H:i:s', strtotime('+1 hour'));

        $insert = $db->prepare('INSERT INTO password_resets (user_id, token, expires_at, used) VALUES (?, ?, ?, 0)');
        $insert->bind_param('iss', $user['id'], $token, $expires);
        $insert->execute();
        $insert->close();

        $resetLink = "https://yustam.com.ng/reset-password.php?token=$token";
        $friendlyName = htmlspecialchars($user['full_name'] ?? 'Vendor');

        $emailBody = "
            <div style='font-family:Poppins,Arial,sans-serif;background:#f8f8f8;padding:30px;border-radius:10px;'>
                <div style='max-width:600px;margin:auto;background:white;border-radius:10px;padding:25px;border:1px solid #eee;'>
                    <div style='text-align:center;'>
                        <img src='https://yustam.com.ng/logo.jpeg' alt='YUSTAM Logo' width='80' style='margin-bottom:15px;border-radius:8px;'>
                        <h2 style='color:#004D40;'>Reset Your Password</h2>
                    </div>
                    <p>Hi <strong>{$friendlyName}</strong>,</p>
                    <p>We received a request to reset your password for YUSTAM Marketplace.</p>
                    <p style='text-align:center;margin:25px 0;'>
                        <a href='{$resetLink}' style='background:#F3731E;color:#fff;padding:12px 20px;text-decoration:none;border-radius:6px;'>Reset Password</a>
                    </p>
                    <p>If you didn't request this, please ignore this email.</p>
                    <p style='word-break:break-all;color:#004D40;'>{$resetLink}</p>
                    <hr style='margin:25px 0;border:none;border-top:1px solid #ddd;'>
                    <p style='font-size:13px;color:#999;text-align:center;'>c " . date('Y') . " YUSTAM Marketplace. All rights reserved.</p>
                </div>
            </div>
        ";

        if (!sendEmail($email, 'Reset Your YUSTAM Password', $emailBody)) {
            echo json_encode(['success' => false, 'message' => 'Unable to send reset email at the moment.']);
            exit;
        }

        echo json_encode(['success' => true, 'message' => 'A password reset link has been sent to your email.']);
    } catch (Throwable $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Server error: ' . $e->getMessage()]);
    }
    exit;
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Forgot Password | YUSTAM</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap" rel="stylesheet" />
<style>
body {
  font-family: 'Inter', sans-serif;
  background: linear-gradient(135deg, #eadccf, #fff);
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  margin: 0;
}
.card {
  background: #fff;
  padding: 40px 30px;
  border-radius: 16px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.08);
  text-align: center;
  width: 90%;
  max-width: 400px;
}
h2 { color: #004D40; margin-bottom: 20px; }
input {
  width: 100%; padding: 12px; border: 1px solid #ddd;
  border-radius: 8px; margin-bottom: 16px; font-size: 1rem;
}
button {
  width: 100%; background: #F3731E; color: white;
  padding: 12px; border: none; border-radius: 8px;
  cursor: pointer; font-weight: 600; font-size: 1rem;
}
button:hover { background: #004D40; }
.msg { margin-top: 16px; color: #004D40; font-weight: 500; }
a { display: inline-block; margin-top: 16px; color: #004D40; text-decoration: none; font-weight: 600; }
</style>
</head>
<body>
<div class="card">
  <h2>Forgot Password</h2>
  <form method="POST">
    <input type="email" name="email" placeholder="Enter your email address" required />
    <button type="submit">Send Reset Link</button>
  </form>
  <?php if ($message): ?>
    <p class="msg"><?= htmlspecialchars($message) ?></p>
  <?php endif; ?>
  <a href="vendor-login.html">Back to Login</a>
</div>
</body>
</html>
