<?php
ini_set('session.save_path', '/home2/yustamco/tmp');
session_start();

require_once __DIR__ . '/buyer-storage.php';

if (isset($_SESSION['buyer_id'])) {
    header('Location: buyer-dashboard.php');
    exit;
}

$errorMessage = '';
$emailValue = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $email = trim($_POST['email'] ?? '');
    $password = (string)($_POST['password'] ?? '');
    $emailValue = $email;

    if ($email === '' || $password === '') {
        $errorMessage = 'Enter both your email and password.';
    } else {
        $buyer = yustam_buyers_find_by_email($email);
        if (!$buyer || !password_verify($password, $buyer['password'])) {
            $errorMessage = 'Incorrect email or password';
        } else {
            $_SESSION['buyer_id'] = (int)$buyer['id'];
            $_SESSION['buyer_name'] = $buyer['name'] ?? 'Buyer';
            header('Location: buyer-dashboard.php');
            exit;
        }
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sign in to YUSTAM | Buyer</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Anton&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
        :root {
            --emerald: #004D40;
            --orange: #F3731E;
            --beige: #EADCCF;
            --glass: rgba(255, 255, 255, 0.82);
        }

        * { box-sizing: border-box; }

        body {
            margin: 0;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: 'Inter', system-ui, sans-serif;
            background: radial-gradient(circle at top, rgba(234, 220, 207, 0.94), rgba(255, 255, 255, 0.9));
            padding: clamp(24px, 6vw, 48px);
            color: rgba(17, 17, 17, 0.85);
        }

        .auth-shell {
            width: min(100%, 420px);
            background: var(--glass);
            border-radius: 18px;
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
            border: 1px solid rgba(255, 255, 255, 0.7);
            backdrop-filter: blur(18px);
            overflow: hidden;
        }

        .auth-header {
            background: linear-gradient(135deg, rgba(0, 77, 64, 0.95), rgba(0, 77, 64, 0.85));
            padding: clamp(28px, 8vw, 36px) clamp(24px, 6vw, 32px);
            color: #fff;
            border-bottom: 4px solid rgba(243, 115, 30, 0.7);
        }

        .auth-header h1 {
            margin: 0;
            font-family: 'Anton', sans-serif;
            letter-spacing: 0.06em;
            font-size: clamp(1.8rem, 5vw, 2.4rem);
            text-transform: uppercase;
        }

        .auth-body {
            padding: clamp(24px, 6vw, 36px);
            display: grid;
            gap: 18px;
        }

        .field-group {
            display: grid;
            gap: 8px;
        }

        label {
            font-weight: 600;
            font-size: 0.9rem;
            color: rgba(0, 77, 64, 0.9);
        }

        input[type="email"],
        input[type="password"] {
            width: 100%;
            padding: 14px 16px;
            border-radius: 16px;
            border: 1px solid rgba(0, 77, 64, 0.18);
            background: rgba(255, 255, 255, 0.86);
            font-size: 1rem;
            transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }

        input:focus {
            outline: none;
            border-color: rgba(243, 115, 30, 0.8);
            box-shadow: 0 0 0 4px rgba(243, 115, 30, 0.2);
        }

        .auth-footer {
            display: grid;
            gap: 16px;
            padding: 0 clamp(24px, 6vw, 36px) clamp(28px, 8vw, 36px);
        }

        .action-button {
            border: none;
            border-radius: 18px;
            padding: 14px 18px;
            background: linear-gradient(135deg, #F3731E, #FF8A3D);
            color: #fff;
            font-weight: 600;
            font-size: 1rem;
            letter-spacing: 0.02em;
            cursor: pointer;
            transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .action-button:hover {
            transform: translateY(-1px);
            box-shadow: 0 16px 24px rgba(243, 115, 30, 0.3);
        }

        .auth-switch {
            text-align: center;
            font-size: 0.92rem;
        }

        .auth-switch a {
            color: var(--emerald);
            font-weight: 600;
            text-decoration: none;
        }

        .auth-switch a:hover {
            text-decoration: underline;
        }

        .toast {
            position: fixed;
            left: 50%;
            bottom: 32px;
            transform: translateX(-50%) translateY(120%);
            min-width: 260px;
            padding: 14px 18px;
            border-radius: 18px;
            background: rgba(217, 48, 37, 0.9);
            color: #fff;
            font-weight: 600;
            text-align: center;
            box-shadow: 0 12px 24px rgba(0, 0, 0, 0.2);
            backdrop-filter: blur(12px);
            opacity: 0;
            transition: opacity 0.3s ease, transform 0.3s ease;
            z-index: 60;
        }

        .toast.is-visible {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
        }
    </style>
</head>
<body>
    <div class="auth-shell" id="buyerLogin">
        <div class="auth-header">
            <h1>Welcome Back</h1>
            <p style="margin: 8px 0 0; font-size: 0.95rem; font-weight: 500; letter-spacing: 0.01em; color: rgba(255,255,255,0.85);">Sign in to continue exploring YUSTAM Marketplace.</p>
        </div>
        <form method="post" novalidate>
            <div class="auth-body">
                <div class="field-group">
                    <label for="email">Email Address</label>
                    <input type="email" id="email" name="email" value="<?= htmlspecialchars($emailValue) ?>" required>
                </div>
                <div class="field-group">
                    <label for="password">Password</label>
                    <input type="password" id="password" name="password" required>
                </div>
            </div>
            <div class="auth-footer">
                <button type="submit" class="action-button">Sign In</button>
                <p class="auth-switch">Don’t have an account? <a href="buyer-register.php">Sign up now</a></p>
            </div>
        </form>
    </div>
    <div class="toast" id="authToast">Incorrect email or password</div>
    <script>
        const toast = document.getElementById('authToast');
        const hasError = <?= $errorMessage ? 'true' : 'false' ?>;

        function showToast(message) {
            if (!toast) return;
            toast.textContent = message;
            toast.classList.add('is-visible');
            setTimeout(() => {
                toast.classList.remove('is-visible');
            }, 2800);
        }

        if (hasError) {
            showToast('<?= htmlspecialchars($errorMessage ?: 'Incorrect email or password') ?>');
        }
    </script>
</body>
</html>
