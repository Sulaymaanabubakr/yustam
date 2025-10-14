<?php
require_once __DIR__ . '/db.php';
$message = '';
$token = $_GET['token'] ?? '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $token = $_POST['token'] ?? '';
    $password = $_POST['password'] ?? '';
    $confirm = $_POST['confirm'] ?? '';

    if (strlen($password) < 6) {
        $message = 'Password must be at least 6 characters long.';
    } elseif ($password !== $confirm) {
        $message = 'Passwords do not match.';
    } else {
        $db = get_db_connection();

        // Find the token and related user
        $vendorTable = YUSTAM_VENDORS_TABLE;
        $reset = null;
        if (!preg_match('/^[A-Za-z0-9_]+$/', $vendorTable)) {
            $message = 'Configuration error. Please contact support.';
        } else {
            $stmt = $db->prepare("
                SELECT pr.id, pr.user_id, pr.token, pr.expires_at, pr.used, v.email
                FROM password_resets pr
                INNER JOIN `{$vendorTable}` v ON pr.user_id = v.id
                WHERE pr.token = ?
                LIMIT 1
            ");
            $stmt->bind_param('s', $token);
            $stmt->execute();
            $reset = $stmt->get_result()->fetch_assoc();
            $stmt->close();
        }

        if (empty($message)) {
            if (!$reset) {
                $message = 'Invalid reset link.';
            } elseif ((int)$reset['used'] === 1) {
                $message = 'This reset link has already been used.';
            } elseif (strtotime($reset['expires_at']) < time()) {
                $message = 'This reset link has expired. Please request a new one.';
            } else {
                // Update user password
                $hashed = password_hash($password, PASSWORD_DEFAULT);
                $update = $db->prepare("UPDATE `{$vendorTable}` SET password = ?, updated_at = NOW() WHERE id = ?");
                $update->bind_param('si', $hashed, $reset['user_id']);
                $update->execute();
                $update->close();

                // Mark the reset token as used
                $markUsed = $db->prepare("UPDATE password_resets SET used = 1 WHERE id = ?");
                $markUsed->bind_param('i', $reset['id']);
                $markUsed->execute();
                $markUsed->close();

                header("Location: vendor-login.html?message=Password+reset+successful!+Please+log+in.&status=success");
                exit;
            }
        }
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Reset Password | YUSTAM</title>
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
  <h2>Reset Password</h2>
  <?php if (!$token): ?>
    <p class="msg">Invalid or expired link.</p>
  <?php else: ?>
    <form method="POST">
      <input type="hidden" name="token" value="<?= htmlspecialchars($token) ?>" />
      <input type="password" name="password" placeholder="Enter new password" required />
      <input type="password" name="confirm" placeholder="Confirm new password" required />
      <button type="submit">Reset Password</button>
    </form>
  <?php endif; ?>
  <?php if ($message): ?>
    <p class="msg"><?= htmlspecialchars($message) ?></p>
  <?php endif; ?>
  <a href="vendor-login.html">Back to Login</a>
</div>
</body>
</html>

