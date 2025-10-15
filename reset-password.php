<?php
require_once __DIR__ . '/db.php';
$isAjax = (isset($_SERVER['HTTP_X_REQUESTED_WITH']) && strtolower($_SERVER['HTTP_X_REQUESTED_WITH']) === 'xmlhttprequest')
    || (isset($_SERVER['HTTP_ACCEPT']) && stripos($_SERVER['HTTP_ACCEPT'], 'application/json') !== false);

function respond_json(bool $success, string $message, array $extra = []): void {
    header('Content-Type: application/json');
    echo json_encode(array_merge(['success' => $success, 'message' => $message], $extra));
    exit;
}

$message = '';
$token = $_GET['token'] ?? '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $token = $_POST['token'] ?? '';
    $password = $_POST['password'] ?? '';
    $confirm = $_POST['confirm'] ?? '';

    if ($token === '') {
        $message = 'Invalid reset link.';
        if ($isAjax) {
            respond_json(false, $message);
        }
    } elseif (strlen($password) < 6) {
        $message = 'Password must be at least 6 characters long.';
        if ($isAjax) {
            respond_json(false, $message);
        }
    } elseif ($password !== $confirm) {
        $message = 'Passwords do not match.';
        if ($isAjax) {
            respond_json(false, $message);
        }
    } else {
        $db = get_db_connection();

        // Find the token and related user
        $vendorTable = YUSTAM_VENDORS_TABLE;
        $reset = null;
        if (!preg_match('/^[A-Za-z0-9_]+$/', $vendorTable)) {
            $message = 'Configuration error. Please contact support.';
            if ($isAjax) {
                respond_json(false, $message);
            }
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
                if ($isAjax) {
                    respond_json(false, $message);
                }
            } elseif ((int)$reset['used'] === 1) {
                $message = 'This reset link has already been used.';
                if ($isAjax) {
                    respond_json(false, $message);
                }
            } elseif (strtotime($reset['expires_at']) < time()) {
                $message = 'This reset link has expired. Please request a new one.';
                if ($isAjax) {
                    respond_json(false, $message);
                }
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

                if ($isAjax) {
                    respond_json(true, 'Your password has been updated successfully.');
                }

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
.status-modal {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.45);
  display: none;
  align-items: center;
  justify-content: center;
  padding: 24px;
  z-index: 120;
}
.status-modal.active { display: flex; }
.status-card {
  background: #fff;
  border-radius: 16px;
  padding: 28px 24px;
  width: 100%;
  max-width: 360px;
  text-align: center;
  box-shadow: 0 18px 40px rgba(0,0,0,0.18);
}
.status-card h3 {
  margin: 0 0 12px;
  color: #004D40;
  font-size: 1.35rem;
}
.status-card p {
  margin: 0 0 18px;
  color: rgba(0,0,0,0.7);
}
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
<div class="status-modal" id="resetStatusModal" role="dialog" aria-modal="true" aria-hidden="true">
  <div class="status-card">
    <h3 id="resetStatusTitle">Password Updated</h3>
    <p id="resetStatusMessage">Your password has been updated successfully. Redirecting to login.</p>
    <button type="button" id="resetStatusAction">Go to login</button>
  </div>
</div>
  <script src="theme-manager.js" defer></script>
<script>
(function () {
  const form = document.querySelector('.card form');
  if (!form) return;

  const submitBtn = form.querySelector('button[type=\"submit\"]');
  const messageBox = document.querySelector('.msg');
  const modal = document.getElementById('resetStatusModal');
  const modalTitle = document.getElementById('resetStatusTitle');
  const modalMessage = document.getElementById('resetStatusMessage');
  const modalAction = document.getElementById('resetStatusAction');

  const showModal = (title, message, redirect = false) => {
    if (modalTitle) modalTitle.textContent = title;
    if (modalMessage) modalMessage.textContent = message;
    if (modal) {
      modal.classList.add('active');
      modal.setAttribute('aria-hidden', 'false');
    }
    if (redirect) {
      setTimeout(() => {
        window.location.href = 'vendor-login.html';
      }, 3500);
    }
  };

  const setInlineMessage = (text) => {
    if (!messageBox) return;
    messageBox.textContent = text || '';
  };

  if (modalAction) {
    modalAction.addEventListener('click', () => {
      window.location.href = 'vendor-login.html';
    });
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;

    const payload = new FormData(form);

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Updating...';
    }
    setInlineMessage('');

    try {
      const response = await fetch('reset-password.php', {
        method: 'POST',
        body: payload,
        credentials: 'same-origin',
        headers: {
          'X-Requested-With': 'XMLHttpRequest',
        },
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        const errorMessage = (result && result.message) || 'Unable to reset password.';
        setInlineMessage(errorMessage);
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Reset Password';
        }
        return;
      }

      showModal('Password Updated', result.message || 'Your password has been updated successfully.', true);
    } catch (error) {
      console.error('Reset password error:', error);
      setInlineMessage('Network error. Please try again.');
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Reset Password';
      }
    }
  });
})();
</script>
</body>
</html>





