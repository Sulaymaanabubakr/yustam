<?php
require_once __DIR__ . '/admin-session.php';

if (admin_is_authenticated()) {
    header('Location: admin-dashboard.php');
    exit;
}

$flashMessage = isset($_GET['message']) ? trim($_GET['message']) : '';
$flashStatus = isset($_GET['status']) ? trim($_GET['status']) : '';
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>YUSTAM Admin Login</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Anton&family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
  <link href="https://cdn.jsdelivr.net/npm/remixicon@4.2.0/fonts/remixicon.css" rel="stylesheet" />
  <style>
    :root {
      --emerald: #004d40;
      --emerald-dark: #00352d;
      --orange: #f3731e;
      --orange-dark: #e05e0e;
      --beige: #eadccf;
      --white: #ffffff;
      --ink: #111111;
      --card-shadow: 0 24px 48px rgba(0, 0, 0, 0.18);
    }

    *,
    *::before,
    *::after {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: radial-gradient(circle at top left, rgba(255, 255, 255, 0.08), transparent 40%),
        radial-gradient(circle at bottom right, rgba(255, 255, 255, 0.06), transparent 45%),
        linear-gradient(135deg, #005e50, #002a24);
      color: var(--ink);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      position: relative;
      overflow: hidden;
    }

    body::before,
    body::after {
      content: '';
      position: absolute;
      width: 420px;
      height: 420px;
      border-radius: 50%;
      filter: blur(90px);
      opacity: 0.35;
      animation: float 12s ease-in-out infinite;
    }

    body::before {
      background: rgba(244, 215, 182, 0.45);
      top: -160px;
      right: -100px;
    }

    body::after {
      background: rgba(0, 120, 102, 0.6);
      bottom: -180px;
      left: -120px;
      animation-delay: 3s;
    }

    @keyframes float {
      0%,
      100% {
        transform: translateY(0) scale(1);
      }
      50% {
        transform: translateY(-20px) scale(1.05);
      }
    }

    main {
      width: 100%;
      max-width: 440px;
      position: relative;
      z-index: 1;
    }

    /* Login Card */
    .login-card {
      background: rgba(234, 220, 207, 0.9);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 22px;
      padding: clamp(24px, 5vw, 36px);
      backdrop-filter: blur(18px);
      box-shadow: var(--card-shadow);
      color: var(--ink);
      display: flex;
      flex-direction: column;
      gap: 24px;
      animation: fadeUp 0.6s ease forwards;
      transform-origin: center;
      position: relative;
    }

    .login-card::after {
      content: '';
      position: absolute;
      inset: 0;
      border-radius: inherit;
      background: linear-gradient(135deg, rgba(255, 255, 255, 0.18), rgba(255, 255, 255, 0));
      pointer-events: none;
    }

    @keyframes fadeUp {
      from {
        opacity: 0;
        transform: translateY(24px) scale(0.98);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    .logo-wrap {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      gap: 12px;
    }

    .logo-wrap .badge {
      width: 64px;
      height: 64px;
      border-radius: 18px;
      background: linear-gradient(135deg, rgba(0, 77, 64, 0.9), rgba(0, 77, 64, 0.6));
      display: grid;
      place-items: center;
      color: var(--white);
      font-size: 28px;
      box-shadow: 0 18px 38px rgba(0, 77, 64, 0.35);
    }

    .logo-wrap h1 {
      font-family: 'Anton', sans-serif;
      font-size: clamp(24px, 4vw, 32px);
      letter-spacing: 0.04em;
      color: var(--emerald);
      margin: 0;
    }

    .logo-wrap p {
      margin: 0;
      font-size: clamp(14px, 2.8vw, 16px);
      color: rgba(17, 17, 17, 0.75);
    }

    .owner-note {
      margin: 0;
      font-size: 0.85rem;
      color: rgba(17, 17, 17, 0.6);
      text-align: center;
    }

    form {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    label {
      display: flex;
      flex-direction: column;
      gap: 8px;
      font-weight: 600;
      font-size: 0.95rem;
      color: rgba(17, 17, 17, 0.82);
    }

    input[type='email'],
    input[type='password'] {
      width: 100%;
      height: 48px;
      border-radius: 14px;
      border: 1px solid rgba(0, 77, 64, 0.18);
      padding: 0 16px;
      font-size: 1rem;
      background: rgba(255, 255, 255, 0.92);
      transition: border 0.2s ease, box-shadow 0.2s ease;
      outline: none;
      color: var(--ink);
    }

    input[type='email']:focus,
    input[type='password']:focus {
      border-color: rgba(0, 77, 64, 0.65);
      box-shadow: 0 0 0 3px rgba(0, 77, 64, 0.18);
    }

    .form-actions {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    button[type='submit'] {
      height: 52px;
      border-radius: 16px;
      border: none;
      background: linear-gradient(135deg, var(--orange), #ff8a3d);
      color: var(--white);
      font-weight: 600;
      font-size: clamp(15px, 3vw, 18px);
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
    }

    button[type='submit']:hover:not(:disabled) {
      transform: translateY(-1px) scale(1.01);
      background: linear-gradient(135deg, var(--orange-dark), #ff7a22);
      box-shadow: 0 18px 32px rgba(243, 115, 30, 0.28);
    }

    button[type='submit']:disabled {
      opacity: 0.7;
      cursor: not-allowed;
      box-shadow: none;
    }

    .spinner {
      width: 18px;
      height: 18px;
      border: 3px solid rgba(255, 255, 255, 0.6);
      border-top-color: #fff;
      border-radius: 50%;
      animation: spin 0.7s linear infinite;
    }

    .spinner--dark {
      border-color: rgba(0, 0, 0, 0.15);
      border-top-color: rgba(0, 77, 64, 0.55);
    }

    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }

    .error-message {
      color: #d84315;
      font-size: 0.88rem;
      min-height: 20px;
    }

    .shake {
      animation: shake 0.4s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
    }

    @keyframes shake {
      10%, 90% {
        transform: translate3d(-1px, 0, 0);
      }
      20%, 80% {
        transform: translate3d(2px, 0, 0);
      }
      30%, 50%, 70% {
        transform: translate3d(-4px, 0, 0);
      }
      40%, 60% {
        transform: translate3d(4px, 0, 0);
      }
    }

    .toast {
      position: fixed;
      bottom: 32px;
      left: 50%;
      transform: translateX(-50%) translateY(24px);
      background: rgba(0, 77, 64, 0.92);
      color: var(--white);
      padding: 14px 22px;
      border-radius: 20px;
      font-weight: 600;
      box-shadow: 0 18px 28px rgba(0, 0, 0, 0.2);
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.3s ease, transform 0.3s ease;
      z-index: 10;
    }

    .toast.show {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }

    .loader-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.15);
      display: none;
      align-items: center;
      justify-content: center;
      z-index: 5;
      backdrop-filter: blur(2px);
    }

    .loader-overlay.active {
      display: flex;
    }

    .loader-overlay .spinner {
      width: 28px;
      height: 28px;
      border-width: 4px;
    }

    @media (min-width: 768px) {
      body {
        padding: 40px;
      }
    }
  </style>
</head>
<body>
  <div class="loader-overlay" id="pageLoader" aria-hidden="true">
    <div class="spinner" role="status" aria-label="Loading"></div>
  </div>
  <main>
    <section class="login-card" id="loginCard" aria-live="polite">
      <!-- Login Card -->
      <div class="logo-wrap">
        <div class="badge" aria-hidden="true">
          <i class="ri-shield-user-line"></i>
        </div>
        <h1>YUSTAM Admin</h1>
        <p>Marketplace Owner Access</p>
        <p class="owner-note">Only authorised marketplace owners and staff should sign in here.</p>
      </div>
      <form id="adminLoginForm" novalidate>
        <label for="adminEmail">Email address
          <input type="email" id="adminEmail" name="adminEmail" placeholder="admin@yustam.com" autocomplete="email" required />
        </label>
        <label for="adminPassword">Password
          <input type="password" id="adminPassword" name="adminPassword" placeholder="Enter your password" autocomplete="current-password" required />
        </label>
        <div class="error-message" id="errorMessage" role="alert">
          <?php if ($flashMessage !== ''): ?>
            <?= htmlspecialchars($flashMessage, ENT_QUOTES, 'UTF-8'); ?>
          <?php endif; ?>
        </div>
        <div class="form-actions">
          <button type="submit" id="loginBtn">
            <span class="btn-label">Login to Dashboard</span>
          </button>
        </div>
      </form>
    </section>
  </main>

  <div class="toast" id="toast" role="status" aria-live="assertive"></div>

  <!-- Firebase Logic -->
  <script type="module" src="admin-login.js"></script>
</body>
</html>

