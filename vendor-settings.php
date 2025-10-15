<?php
require_once __DIR__ . '/session-path.php';
session_start();

if (!isset($_SESSION['vendor_id'])) {
    if (isset($_GET['format']) && $_GET['format'] === 'json') {
        header('Content-Type: application/json');
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Please sign in to manage your settings.']);
        exit;
    }
    header('Location: vendor-login.html');
    exit;
}

$vendorId = (int)$_SESSION['vendor_id'];

$settingsDir = __DIR__ . '/data/vendor-settings';
if (!is_dir($settingsDir) && !mkdir($settingsDir, 0755, true) && !is_dir($settingsDir)) {
    throw new RuntimeException(sprintf('Directory "%s" was not created', $settingsDir));
}

$settingsFile = $settingsDir . "/vendor_{$vendorId}.json";
$defaultSettings = [
    'notifApproved' => true,
    'notifPlanExpiry' => true,
    'notifBuyerMsg' => false,
    'notifUpdates' => true,
    'twoFactor' => false,
    'loginAlert' => true,
    'theme' => 'system',
];

$settings = $defaultSettings;
if (is_file($settingsFile)) {
    $decoded = json_decode((string)file_get_contents($settingsFile), true);
    if (is_array($decoded)) {
        $settings = array_merge($defaultSettings, $decoded);
    }
}

if (isset($_GET['format']) && $_GET['format'] === 'json') {
    header('Content-Type: application/json');
    echo json_encode(['success' => true, 'settings' => $settings], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Vendor Settings & Preferences | YUSTAM Marketplace</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Anton&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <link href="https://cdn.jsdelivr.net/npm/remixicon@4.2.0/fonts/remixicon.css" rel="stylesheet" />
  <style>
    :root {
      --emerald: #0f6a53;
      --emerald-dark: #0c5441;
      --orange: #f3731e;
      --orange-bright: #ff9448;
      --beige: #f3ebe0;
      --danger: #dc412f;
      --ink: #161616;
      --muted: rgba(22, 22, 22, 0.65);
      --glass: rgba(255, 255, 255, 0.88);
      --shadow: 0 26px 50px rgba(15, 106, 83, 0.16);
      --radius-card: 22px;
      --transition: 200ms ease;
    }

    *,
    *::before,
    *::after {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      min-height: 100vh;
      font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background:
        radial-gradient(circle at top right, rgba(15, 106, 83, 0.14), transparent 50%),
        radial-gradient(circle at bottom left, rgba(243, 115, 30, 0.12), transparent 50%),
        var(--beige);
      color: var(--ink);
      display: flex;
      flex-direction: column;
      transition: background 0.3s ease, color 0.3s ease;
    }

    body.theme-light {
      color: var(--ink);
    }

    body.theme-dark {
      background:
        radial-gradient(circle at top right, rgba(12, 84, 65, 0.25), transparent 55%),
        radial-gradient(circle at bottom left, rgba(0, 0, 0, 0.5), transparent 50%),
        #0b1c18;
      color: rgba(250, 250, 250, 0.9);
    }

    a {
      color: inherit;
      text-decoration: none;
    }

    .app-header {
      position: sticky;
      top: 0;
      z-index: 40;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 18px;
      background: rgba(15, 106, 83, 0.94);
      color: #ffffff;
      backdrop-filter: blur(10px);
      box-shadow: 0 12px 28px rgba(0, 0, 0, 0.18);
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .header-logo {
      width: 42px;
      height: 42px;
      border-radius: 14px;
      background: rgba(255, 255, 255, 0.2);
      overflow: hidden;
      display: grid;
      place-items: center;
      box-shadow: 0 12px 20px rgba(0, 0, 0, 0.25);
    }

    .header-logo img {
      width: 38px;
      height: 38px;
      object-fit: cover;
      border-radius: 12px;
    }

    .header-title {
      font-family: 'Anton', sans-serif;
      font-size: clamp(20px, 4.5vw, 24px);
      letter-spacing: 0.08em;
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .header-icon {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.18);
      color: #ffffff;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      transition: transform var(--transition), background var(--transition), box-shadow var(--transition);
    }

    .header-icon:hover,
    .header-icon:focus-visible {
      transform: translateY(-2px);
      background: rgba(255, 255, 255, 0.26);
      box-shadow: 0 14px 28px rgba(0, 0, 0, 0.22);
    }

    main {
      flex: 1;
      padding: 72px 18px 90px;
      display: flex;
      justify-content: center;
    }

    .page-shell {
      width: min(100%, 780px);
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .page-heading {
      display: flex;
      flex-direction: column;
      gap: 12px;
      text-align: left;
    }

    .page-heading h1 {
      margin: 0;
      font-family: 'Anton', sans-serif;
      font-size: clamp(24px, 5vw, 30px);
      letter-spacing: 0.06em;
    }

    .page-heading p {
      margin: 0;
      color: var(--muted);
      font-size: 15px;
      line-height: 1.6;
    }

    body.theme-dark .page-heading p {
      color: rgba(240, 240, 240, 0.72);
    }

    .glass-card {
      background: var(--glass);
      border-radius: var(--radius-card);
      border: 1px solid rgba(255, 255, 255, 0.6);
      backdrop-filter: blur(10px);
      box-shadow: var(--shadow);
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    body.theme-dark .glass-card {
      background: rgba(14, 34, 28, 0.9);
      border-color: rgba(255, 255, 255, 0.1);
    }

    .glass-card h2 {
      margin: 0;
      font-family: 'Anton', sans-serif;
      font-size: clamp(20px, 4vw, 26px);
      letter-spacing: 0.05em;
      color: var(--emerald-dark);
    }

    body.theme-dark .glass-card h2 {
      color: rgba(240, 240, 240, 0.9);
    }

    .glass-card p.description {
      margin: 0;
      color: var(--muted);
      font-size: 15px;
      line-height: 1.6;
    }

    body.theme-dark .glass-card p.description {
      color: rgba(240, 240, 240, 0.7);
    }

    .toggle-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding: 14px 16px;
      border-radius: 18px;
      background: rgba(243, 235, 224, 0.6);
    }

    body.theme-dark .toggle-row {
      background: rgba(255, 255, 255, 0.06);
    }

    .toggle-row span {
      font-weight: 600;
      font-size: 15px;
      color: var(--ink);
    }

    body.theme-dark .toggle-row span {
      color: rgba(240, 240, 240, 0.88);
    }

    .switch {
      position: relative;
      width: 56px;
      height: 30px;
      flex-shrink: 0;
    }

    .switch input {
      opacity: 0;
      width: 0;
      height: 0;
    }

    .slider {
      position: absolute;
      cursor: pointer;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(243, 115, 30, 0.25);
      border-radius: 999px;
      transition: var(--transition);
      border: 1px solid rgba(243, 115, 30, 0.4);
    }

    .slider::before {
      content: '';
      position: absolute;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      left: 3px;
      bottom: 3px;
      background: #ffffff;
      box-shadow: 0 10px 24px rgba(243, 115, 30, 0.25);
      transition: var(--transition);
    }

    input:checked + .slider {
      background: linear-gradient(135deg, var(--orange), var(--orange-bright));
    }

    input:checked + .slider::before {
      transform: translateX(26px);
    }

    .action-button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      width: 100%;
      padding: 14px 18px;
      border-radius: 999px;
      border: none;
      background: linear-gradient(135deg, var(--orange), var(--orange-bright));
      color: #ffffff;
      font-weight: 600;
      letter-spacing: 0.02em;
      cursor: pointer;
      box-shadow: 0 18px 34px rgba(243, 115, 30, 0.32);
      transition: transform var(--transition), box-shadow var(--transition);
    }

    .action-button:hover,
    .action-button:focus-visible {
      transform: translateY(-2px);
      box-shadow: 0 24px 40px rgba(243, 115, 30, 0.36);
    }

    .theme-options {
      display: grid;
      gap: 12px;
    }

    .theme-option {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 14px 16px;
      border-radius: 18px;
      border: 1px solid rgba(15, 106, 83, 0.2);
      background: rgba(243, 235, 224, 0.6);
      transition: var(--transition);
    }

    .theme-option input[type="radio"] {
      accent-color: var(--orange);
      width: 18px;
      height: 18px;
    }

    .theme-option.active {
      border-color: rgba(15, 106, 83, 0.45);
      box-shadow: 0 14px 28px rgba(15, 106, 83, 0.2);
      transform: translateY(-2px);
    }

    body.theme-dark .theme-option {
      background: rgba(255, 255, 255, 0.06);
      border-color: rgba(255, 255, 255, 0.1);
    }

    .danger-card {
      border: 1px solid rgba(220, 65, 47, 0.35);
      background: rgba(255, 255, 255, 0.85);
    }

    .danger-card h2 {
      color: var(--danger);
    }

    .danger-card p.description {
      color: rgba(220, 65, 47, 0.78);
    }

    .danger-button {
      background: linear-gradient(135deg, #ff6b5f, #ff3424);
      box-shadow: 0 22px 36px rgba(220, 65, 47, 0.28);
    }

    .save-bar {
      position: sticky;
      bottom: 16px;
      margin-top: auto;
      display: flex;
      justify-content: center;
    }

    .save-button {
      width: 100%;
      max-width: 360px;
      padding: 16px 18px;
      border-radius: 999px;
      border: none;
      font-size: 16px;
      font-weight: 700;
      letter-spacing: 0.04em;
      color: #ffffff;
      background: linear-gradient(135deg, var(--orange), var(--orange-bright));
      box-shadow: 0 24px 40px rgba(243, 115, 30, 0.35);
      cursor: pointer;
      transition: transform var(--transition), box-shadow var(--transition);
    }

    .save-button:hover,
    .save-button:focus-visible {
      transform: translateY(-2px);
      box-shadow: 0 30px 50px rgba(243, 115, 30, 0.4);
    }

    footer {
      margin-top: auto;
      padding: 28px 16px 36px;
      background: rgba(234, 220, 207, 0.82);
      text-align: center;
      font-size: 14px;
      color: rgba(22, 22, 22, 0.7);
      backdrop-filter: blur(8px);
    }

    .toast-tray {
      position: fixed;
      left: 50%;
      bottom: 24px;
      transform: translateX(-50%);
      display: flex;
      flex-direction: column;
      gap: 12px;
      z-index: 120;
      pointer-events: none;
    }

    .toast {
      min-width: 240px;
      max-width: 320px;
      padding: 14px 18px;
      border-radius: 16px;
      background: rgba(15, 106, 83, 0.95);
      color: #ffffff;
      font-weight: 600;
      letter-spacing: 0.02em;
      box-shadow: 0 18px 40px rgba(15, 106, 83, 0.35);
      opacity: 0;
      transform: translateY(16px);
      transition: opacity 240ms ease, transform 240ms ease;
    }

    .toast.success {
      background: rgba(15, 106, 83, 0.95);
    }

    .toast.error {
      background: rgba(220, 65, 47, 0.95);
      box-shadow: 0 18px 40px rgba(220, 65, 47, 0.32);
    }

    .toast.show {
      opacity: 1;
      transform: translateY(0);
    }

    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.45);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      opacity: 0;
      visibility: hidden;
      pointer-events: none;
      transition: opacity 220ms ease;
      z-index: 140;
    }

    .modal-backdrop.active {
      opacity: 1;
      visibility: visible;
      pointer-events: auto;
    }

    .modal-card {
      width: min(420px, 100%);
      background: var(--glass);
      border-radius: 22px;
      padding: 24px;
      box-shadow: 0 32px 64px rgba(0, 0, 0, 0.28);
      border: 1px solid rgba(255, 255, 255, 0.6);
      display: flex;
      flex-direction: column;
      gap: 16px;
      backdrop-filter: blur(12px);
    }

    .modal-card h3 {
      margin: 0;
      font-family: 'Anton', sans-serif;
      font-size: 24px;
      letter-spacing: 0.05em;
      color: var(--emerald-dark);
    }

    .modal-card label {
      font-weight: 600;
      font-size: 14px;
      color: var(--muted);
    }

    .modal-card input[type="password"] {
      width: 100%;
      padding: 12px 14px;
      border-radius: 14px;
      border: 1px solid rgba(22, 22, 22, 0.15);
      background: rgba(255, 255, 255, 0.92);
      font-size: 15px;
      transition: border var(--transition), box-shadow var(--transition);
    }

    .modal-card input[type="password"]:focus {
      outline: none;
      border-color: rgba(243, 115, 30, 0.6);
      box-shadow: 0 0 0 3px rgba(243, 115, 30, 0.25);
    }

    .modal-actions {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .ghost-button {
      background: rgba(15, 106, 83, 0.12);
      color: var(--emerald-dark);
      box-shadow: none;
    }

    .ghost-button:hover,
    .ghost-button:focus-visible {
      box-shadow: none;
      background: rgba(15, 106, 83, 0.16);
      transform: none;
    }

    @media (min-width: 640px) {
      .action-button {
        width: auto;
        align-self: flex-start;
      }

      .modal-actions {
        flex-direction: row;
      }

      .modal-actions .action-button {
        flex: 1;
      }
    }

    @media (min-width: 960px) {
      main {
        padding-top: 96px;
      }

      .page-shell {
        gap: 32px;
      }
    }
  </style>
</head>
<body class="theme-light">
  <header class="app-header">
    <div class="header-left logo-area">
      <a class="header-logo" href="/index.html" aria-label="YUSTAM home">
        <img src="logo.jpeg" alt="YUSTAM logo">
      </a>
      <span class="header-title" role="link" tabindex="0">Vendor</span>
    </div>
    <nav class="header-actions" aria-label="Vendor shortcuts">
      <a class="header-icon notif-icon" href="vendor-notifications.php" aria-label="Notifications" title="Notifications">
        <i class="ri-notification-3-line" aria-hidden="true"></i>
      </a>
      <a class="header-icon" href="vendor-plans.php" aria-label="Plans">
        <i class="ri-vip-crown-line" aria-hidden="true"></i>
      </a>
      <a class="header-icon" href="vendor-profile.php" aria-label="Profile">
        <i class="ri-user-3-line" aria-hidden="true"></i>
      </a>
      <a class="header-icon" href="logout.php" aria-label="Logout">
        <i class="ri-logout-box-r-line" aria-hidden="true"></i>
      </a>
    </nav>
  </header>

  <main>
    <div class="page-shell">
      <div class="page-heading">
        <h1>Settings &amp; Preferences</h1>
        <p>Fine-tune notifications, keep your account secure, and set the mood for your YUSTAM workspace.</p>
      </div>

      <section class="glass-card" aria-labelledby="notificationsHeading">
        <h2 id="notificationsHeading">Notification Settings</h2>
        <p class="description">Choose the alerts that keep you informed about orders, plans, and platform updates.</p>
        <div class="toggle-row">
          <span>New Listing Approved</span>
          <label class="switch">
            <input type="checkbox" id="notifApproved">
            <span class="slider"></span>
          </label>
        </div>
        <div class="toggle-row">
          <span>Plan Expiry Reminder</span>
          <label class="switch">
            <input type="checkbox" id="notifPlanExpiry">
            <span class="slider"></span>
          </label>
        </div>
        <div class="toggle-row">
          <span>Message from Buyer</span>
          <label class="switch">
            <input type="checkbox" id="notifBuyerMsg">
            <span class="slider"></span>
          </label>
        </div>
        <div class="toggle-row">
          <span>Platform Updates &amp; Offers</span>
          <label class="switch">
            <input type="checkbox" id="notifUpdates">
            <span class="slider"></span>
          </label>
        </div>
      </section>

      <section class="glass-card" aria-labelledby="securityHeading">
        <h2 id="securityHeading">Security Settings</h2>
        <p class="description">Strengthen your storefront with layered protections and quick account management.</p>
        <button class="action-button" id="changePasswordBtn" type="button">
          <i class="ri-shield-check-line" aria-hidden="true"></i>
          Change Password
        </button>
        <div class="toggle-row">
          <span>Two-Factor Authentication</span>
          <label class="switch">
            <input type="checkbox" id="twoFactorToggle">
            <span class="slider"></span>
          </label>
        </div>
        <div class="toggle-row">
          <span>Login Alerts</span>
          <label class="switch">
            <input type="checkbox" id="loginAlertToggle">
            <span class="slider"></span>
          </label>
        </div>
      </section>

      <section class="glass-card" aria-labelledby="themeHeading">
        <h2 id="themeHeading">Theme Preferences</h2>
        <p class="description">Personalise the dashboard vibe to suit your workflow and lighting.</p>
        <div class="theme-options">
          <label class="theme-option" for="themeLight">
            <input type="radio" name="theme" id="themeLight" value="light">
            <span>Light Mode</span>
          </label>
          <label class="theme-option" for="themeDark">
            <input type="radio" name="theme" id="themeDark" value="dark">
            <span>Dark Mode</span>
          </label>
          <label class="theme-option" for="themeSystem">
            <input type="radio" name="theme" id="themeSystem" value="system">
            <span>System Default</span>
          </label>
        </div>
      </section>

      <section class="glass-card danger-card" aria-labelledby="dangerHeading">
        <h2 id="dangerHeading">Danger Zone</h2>
        <p class="description">Handle with care – certain actions here cannot be reversed once confirmed.</p>
        <button class="action-button danger-button" id="deleteAccountBtn" type="button">
          <i class="ri-delete-bin-6-line" aria-hidden="true"></i>
          Delete My Account
        </button>
      </section>

      <div class="save-bar">
        <button class="save-button" id="saveSettingsBtn" type="button">Save Changes</button>
      </div>
    </div>
  </main>

  <footer>© 2025 YUSTAM Marketplace · Support</footer>

  <div class="toast-tray" id="toastContainer" role="status" aria-live="polite"></div>

  <div class="modal-backdrop" id="changePasswordModal" role="dialog" aria-modal="true" aria-hidden="true">
    <div class="modal-card">
      <h3>Update Password</h3>
      <label for="currentPassword">Current Password</label>
      <input type="password" id="currentPassword" placeholder="Enter current password">
      <label for="newPassword">New Password</label>
      <input type="password" id="newPassword" placeholder="Enter new password">
      <label for="confirmPassword">Confirm New Password</label>
      <input type="password" id="confirmPassword" placeholder="Re-enter new password">
      <div class="modal-actions">
        <button class="action-button" id="updatePasswordBtn" type="button">Update Password</button>
        <button class="action-button ghost-button" id="cancelPasswordBtn" type="button">Cancel</button>
      </div>
    </div>
  </div>

  <div class="modal-backdrop" id="deleteAccountModal" role="dialog" aria-modal="true" aria-hidden="true">
    <div class="modal-card">
      <h3>Delete Account</h3>
      <p class="description">This action is permanent. All listings, orders, and plan data will be removed.</p>
      <div class="modal-actions">
        <button class="action-button danger-button" id="confirmDeleteBtn" type="button">Delete Account</button>
        <button class="action-button ghost-button" id="cancelDeleteBtn" type="button">Cancel</button>
      </div>
    </div>
  </div>
  <script>
    window.__INITIAL_VENDOR_SETTINGS__ = <?php echo json_encode($settings, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES); ?>;
    window.__VENDOR_SETTINGS_ENDPOINT__ = 'update-vendor-settings.php';
    window.__VENDOR_SETTINGS_REFRESH__ = 'vendor-settings.php?format=json';
  </script>
  <script src="theme-manager.js" defer></script>
  <script src="vendor-settings.js" defer></script>
</body>
</html>



