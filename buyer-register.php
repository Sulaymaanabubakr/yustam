<?php
require_once __DIR__ . '/session-path.php';
session_start();

require_once __DIR__ . '/buyer-storage.php';

if (isset($_SESSION['buyer_id'])) {
    header('Location: buyer-dashboard.php');
    exit;
}

$errors = [];
$old = [
    'name' => '',
    'email' => '',
    'phone' => '',
];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $name = trim($_POST['name'] ?? '');
    $email = trim($_POST['email'] ?? '');
    $phone = trim($_POST['phone'] ?? '');
    $password = (string)($_POST['password'] ?? '');
    $confirmPassword = (string)($_POST['confirm_password'] ?? '');

    $old['name'] = $name;
    $old['email'] = $email;
    $old['phone'] = $phone;

    if ($name === '') {
        $errors['name'] = 'Please enter your full name.';
    }

    if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        $errors['email'] = 'Enter a valid email address.';
    } elseif (yustam_buyers_find_by_email($email)) {
        $errors['email'] = 'An account with this email already exists.';
    }

    if ($phone === '') {
        $errors['phone'] = 'Please provide a phone number.';
    } elseif (!preg_match('/^[0-9+()\-\s]{7,20}$/', $phone)) {
        $errors['phone'] = 'Use digits only (with optional +, (), or -).';
    }

    if (strlen($password) < 6) {
        $errors['password'] = 'Password must be at least 6 characters long.';
    }

    if ($confirmPassword === '') {
        $errors['confirm_password'] = 'Confirm your password.';
    } elseif ($password !== $confirmPassword) {
        $errors['confirm_password'] = 'Passwords do not match.';
    }

    if (!$errors) {
        $passwordHash = password_hash($password, PASSWORD_DEFAULT);
        $buyer = yustam_buyers_create($name, $email, $phone, $passwordHash, 'email');

        $_SESSION['buyer_id'] = $buyer['id'];
        $_SESSION['buyer_name'] = $buyer['name'];

        header('Location: buyer-dashboard.php');
        exit;
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Create Buyer Account | YUSTAM Marketplace</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Anton&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
        :root {
            --emerald: #004D40;
            --orange: #F3731E;
            --beige: #EADCCF;
            --glass: rgba(255, 255, 255, 0.82);
            --error: #D93025;
        }

        * { box-sizing: border-box; }

        body {
            margin: 0;
            min-height: 100vh;
            font-family: 'Inter', system-ui, sans-serif;
            background: radial-gradient(circle at top, rgba(234, 220, 207, 0.95), rgba(255, 255, 255, 0.92));
            display: flex;
            align-items: center;
            justify-content: center;
            padding: clamp(24px, 6vw, 48px);
            color: rgba(17, 17, 17, 0.82);
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

        label {
            font-weight: 600;
            font-size: 0.9rem;
            color: rgba(0, 77, 64, 0.9);
        }

        .field-group {
            display: grid;
            gap: 8px;
        }

        input[type="text"],
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

        input.error {
            border-color: rgba(217, 48, 37, 0.7);
            box-shadow: 0 0 0 4px rgba(217, 48, 37, 0.16);
        }

        .field-error {
            color: var(--error);
            font-size: 0.82rem;
            margin: 0;
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

        @media (max-width: 480px) {
            .auth-shell {
                border-radius: 16px;
            }

            .auth-header {
                border-bottom-width: 3px;
            }
        }
    </style>
</head>
<body>
    <div class="auth-shell" id="buyerRegister">
        <div class="auth-header">
            <h1>Join YUSTAM</h1>
            <p style="margin: 8px 0 0; font-size: 0.95rem; font-weight: 500; letter-spacing: 0.01em; color: rgba(255,255,255,0.85);">Create a free buyer account to explore the marketplace.</p>
        </div>
        <form method="post" novalidate>
            <div class="auth-body">
                <div class="field-group">
                    <label for="name">Full Name</label>
                    <input type="text" id="name" name="name" value="<?= htmlspecialchars($old['name']) ?>" <?= isset($errors['name']) ? 'class="error"' : '' ?> required>
                    <?php if (isset($errors['name'])): ?><p class="field-error"><?= htmlspecialchars($errors['name']) ?></p><?php endif; ?>
                </div>
                <div class="field-group">
                    <label for="email">Email Address</label>
                    <input type="email" id="email" name="email" value="<?= htmlspecialchars($old['email']) ?>" <?= isset($errors['email']) ? 'class="error"' : '' ?> required>
                    <?php if (isset($errors['email'])): ?><p class="field-error"><?= htmlspecialchars($errors['email']) ?></p><?php endif; ?>
                </div>
                <div class="field-group">
                    <label for="phone">Phone Number</label>
                    <input type="text" id="phone" name="phone" value="<?= htmlspecialchars($old['phone']) ?>" <?= isset($errors['phone']) ? 'class="error"' : '' ?> required>
                    <?php if (isset($errors['phone'])): ?><p class="field-error"><?= htmlspecialchars($errors['phone']) ?></p><?php endif; ?>
                </div>
                <div class="field-group">
                    <label for="password">Password</label>
                    <input type="password" id="password" name="password" <?= isset($errors['password']) ? 'class="error"' : '' ?> required>
                    <?php if (isset($errors['password'])): ?><p class="field-error"><?= htmlspecialchars($errors['password']) ?></p><?php endif; ?>
                </div>
                <div class="field-group">
                    <label for="confirm_password">Confirm Password</label>
                    <input type="password" id="confirm_password" name="confirm_password" <?= isset($errors['confirm_password']) ? 'class="error"' : '' ?> required>
                    <?php if (isset($errors['confirm_password'])): ?><p class="field-error"><?= htmlspecialchars($errors['confirm_password']) ?></p><?php endif; ?>
                </div>
            </div>
            <div class="auth-footer">
                <button type="submit" class="action-button">Create Account</button>
                <p class="auth-switch">Already have an account? <a href="buyer-login.php">Sign in</a></p>
            </div>
        </form>
    </div>
  <script src="theme-manager.js" defer></script>
<script>
        const form = document.querySelector('form');
        const fields = ['name', 'email', 'phone', 'password', 'confirm_password'];

        const validators = {
            name: (value) => value.trim() !== '' ? '' : 'Please enter your full name.',
            email: (value) => /[^@\s]+@[^@\s]+\.[^@\s]+/.test(value) ? '' : 'Enter a valid email address.',
            phone: (value) => /^[0-9+()\-\s]{7,20}$/.test(value.trim()) ? '' : 'Use digits only (with optional +, (), or -).',
            password: (value) => value.length >= 6 ? '' : 'Password must be at least 6 characters long.',
            confirm_password: (value) => value === document.getElementById('password').value ? '' : 'Passwords do not match.'
        };

        function showError(field, message) {
            const input = document.getElementById(field);
            if (!input) return;
            let error = input.parentElement.querySelector('.field-error');
            if (!error) {
                error = document.createElement('p');
                error.className = 'field-error';
                input.parentElement.appendChild(error);
            }
            if (message) {
                error.textContent = message;
                input.classList.add('error');
            } else {
                error.textContent = '';
                input.classList.remove('error');
            }
        }

        fields.forEach((field) => {
            const input = document.getElementById(field);
            if (!input) return;
            input.addEventListener('blur', () => {
                const value = input.value || '';
                const error = validators[field] ? validators[field](value) : '';
                showError(field, error);
            });
        });

        form?.addEventListener('submit', (event) => {
            let hasError = false;
            fields.forEach((field) => {
                const input = document.getElementById(field);
                if (!input) return;
                const value = input.value || '';
                const message = validators[field] ? validators[field](value) : '';
                if (message) {
                    hasError = true;
                }
                showError(field, message);
            });
            if (hasError) {
                event.preventDefault();
            }
        });
    </script>
</body>
</html>





