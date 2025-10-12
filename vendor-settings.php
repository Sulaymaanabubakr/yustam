<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Vendor Settings & Preferences | YUSTAM Marketplace</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Anton&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <link href="https://cdn.jsdelivr.net/npm/remixicon@4.2.0/fonts/remixicon.css" rel="stylesheet">
    <style>
        :root {
            --emerald: #004D40;
            --orange: #F3731E;
            --orange-bright: #FF8A3C;
            --beige: #EADCCF;
            --white: #FFFFFF;
            --danger: #E74C3C;
            --shadow-soft: 0 12px 32px rgba(0, 0, 0, 0.12);
            --radius-large: 20px;
            --radius-medium: 18px;
            --transition-base: all 220ms ease;
        }

        * {
            box-sizing: border-box;
        }

        body {
            margin: 0;
            font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: radial-gradient(circle at top left, rgba(234, 220, 207, 0.92), rgba(255, 255, 255, 0.96));
            color: #1A1A1A;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            transition: background 320ms ease, color 320ms ease;
        }

        body.theme-dark {
            background: radial-gradient(circle at top left, rgba(0, 77, 64, 0.92), rgba(18, 18, 18, 0.96));
            color: rgba(255, 255, 255, 0.92);
        }

        h1, h2, h3, h4 {
            font-family: 'Anton', sans-serif;
            letter-spacing: 0.03em;
            color: var(--emerald);
            margin: 0;
        }

        body.theme-dark h1,
        body.theme-dark h2,
        body.theme-dark h3,
        body.theme-dark h4 {
            color: rgba(234, 220, 207, 0.95);
        }

        a {
            color: inherit;
            text-decoration: none;
        }

        img {
            display: block;
            max-width: 100%;
        }

        main {
            width: min(1140px, calc(100% - clamp(2rem, 6vw, 7rem)));
            margin: 0 auto;
            flex: 1;
            padding: clamp(1.5rem, 3.5vw, 3.2rem) 0 clamp(5rem, 6vw, 6.5rem);
            display: flex;
            flex-direction: column;
            gap: clamp(1.8rem, 3vw, 3rem);
        }

        /* Header */
        header {
            position: sticky;
            top: 0;
            z-index: 90;
            background: rgba(0, 77, 64, 0.95);
            color: var(--white);
            padding: 0.85rem clamp(1.2rem, 4vw, 2.6rem);
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 1.2rem;
            backdrop-filter: blur(14px);
            box-shadow: 0 12px 26px rgba(0, 0, 0, 0.18);
        }

        .header-left {
            display: flex;
            align-items: center;
            gap: 0.75rem;
        }

        .header-logo {
            width: 48px;
            height: 48px;
            border-radius: 14px;
            background: var(--white);
            display: grid;
            place-items: center;
            box-shadow: 0 10px 20px rgba(0, 0, 0, 0.22);
            overflow: hidden;
        }

        .header-logo img {
            width: 42px;
            height: 42px;
            object-fit: cover;
            border-radius: 12px;
        }

        .header-title {
            display: flex;
            flex-direction: column;
            gap: 0.1rem;
        }

        .header-title span {
            font-size: clamp(1.45rem, 4vw, 1.9rem);
            font-family: 'Anton', sans-serif;
            letter-spacing: 0.08em;
        }

        .header-actions {
            display: flex;
            align-items: center;
            gap: 0.8rem;
        }

        .icon-button {
            width: 46px;
            height: 46px;
            border-radius: 50%;
            border: none;
            background: rgba(255, 255, 255, 0.16);
            color: var(--white);
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-size: 1.25rem;
            box-shadow: 0 8px 18px rgba(0, 0, 0, 0.2);
            cursor: pointer;
            transition: var(--transition-base);
        }

        .icon-button:hover {
            background: rgba(243, 115, 30, 0.85);
            transform: translateY(-2px) scale(1.04);
        }

        .header-underline {
            position: absolute;
            bottom: -4px;
            left: 50%;
            width: 140px;
            height: 4px;
            background: linear-gradient(120deg, var(--orange), var(--orange-bright));
            border-radius: 999px;
            transform: translateX(-50%);
        }

        .page-heading {
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
        }

        .page-heading h1 {
            font-size: clamp(2.1rem, 5vw, 2.9rem);
        }

        .page-heading p {
            margin: 0;
            font-size: clamp(0.96rem, 2.3vw, 1.1rem);
            color: rgba(17, 17, 17, 0.7);
            max-width: 540px;
        }

        body.theme-dark .page-heading p {
            color: rgba(234, 220, 207, 0.75);
        }

        .settings-grid {
            display: grid;
            gap: clamp(1.2rem, 2.5vw, 2rem);
        }

        @media (min-width: 820px) {
            .settings-grid {
                grid-template-columns: repeat(2, minmax(0, 1fr));
            }
        }

        .settings-card {
            background: rgba(255, 255, 255, 0.85);
            border: 1px solid rgba(255, 255, 255, 0.3);
            backdrop-filter: blur(9px);
            border-radius: var(--radius-large);
            padding: clamp(1.3rem, 2.8vw, 2rem);
            box-shadow: var(--shadow-soft);
            display: flex;
            flex-direction: column;
            gap: 1.1rem;
            position: relative;
            overflow: hidden;
            transition: var(--transition-base);
        }

        .settings-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 18px 40px rgba(0, 0, 0, 0.18);
        }

        body.theme-dark .settings-card {
            background: rgba(10, 26, 22, 0.8);
            border: 1px solid rgba(255, 255, 255, 0.08);
        }

        .settings-card h2 {
            font-size: clamp(1.4rem, 3.3vw, 1.9rem);
        }

        .settings-card p.description {
            margin: 0;
            font-size: 0.95rem;
            color: rgba(17, 17, 17, 0.65);
        }

        body.theme-dark .settings-card p.description {
            color: rgba(234, 220, 207, 0.68);
        }

        .toggle-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 1rem;
            padding: 0.9rem 1rem;
            border-radius: 16px;
            background: rgba(234, 220, 207, 0.4);
        }

        body.theme-dark .toggle-row {
            background: rgba(234, 220, 207, 0.08);
        }

        .toggle-row span {
            font-weight: 600;
            font-size: 1rem;
        }

        .switch {
            position: relative;
            width: 56px;
            height: 30px;
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
            background: rgba(243, 115, 30, 0.35);
            border-radius: 999px;
            transition: var(--transition-base);
            border: 1px solid rgba(243, 115, 30, 0.4);
        }

        .slider::before {
            position: absolute;
            content: "";
            height: 24px;
            width: 24px;
            left: 3px;
            bottom: 3px;
            background: var(--white);
            border-radius: 50%;
            box-shadow: 0 6px 16px rgba(243, 115, 30, 0.35);
            transition: var(--transition-base);
        }

        input:checked + .slider {
            background: linear-gradient(120deg, var(--orange), var(--orange-bright));
        }

        input:checked + .slider::before {
            transform: translateX(26px);
        }

        .action-button {
            align-self: flex-start;
            padding: 0.85rem 1.6rem;
            border-radius: 999px;
            border: none;
            font-weight: 600;
            font-size: 0.98rem;
            letter-spacing: 0.02em;
            background: linear-gradient(135deg, var(--orange), var(--orange-bright));
            color: var(--white);
            cursor: pointer;
            box-shadow: 0 14px 28px rgba(243, 115, 30, 0.28);
            transition: var(--transition-base);
        }

        .action-button:hover {
            transform: scale(1.03) translateY(-1px);
            box-shadow: 0 22px 34px rgba(243, 115, 30, 0.35);
        }

        .theme-options {
            display: flex;
            flex-direction: column;
            gap: 0.75rem;
        }

        .theme-option {
            display: flex;
            align-items: center;
            gap: 0.85rem;
            padding: 0.9rem 1rem;
            border-radius: 18px;
            border: 1px solid rgba(243, 115, 30, 0.18);
            background: rgba(234, 220, 207, 0.45);
            transition: var(--transition-base);
        }

        .theme-option input[type="radio"] {
            accent-color: var(--orange);
            width: 18px;
            height: 18px;
        }

        .theme-option.active {
            border-color: rgba(243, 115, 30, 0.6);
            box-shadow: 0 8px 22px rgba(243, 115, 30, 0.2);
            transform: translateY(-2px);
        }

        body.theme-dark .theme-option {
            background: rgba(10, 26, 22, 0.7);
            border-color: rgba(234, 220, 207, 0.18);
        }

        body.theme-dark .theme-option.active {
            border-color: rgba(243, 115, 30, 0.7);
        }

        .danger-card {
            background: rgba(255, 255, 255, 0.82);
            border: 1px solid rgba(231, 76, 60, 0.35);
        }

        .danger-card .danger-header {
            display: flex;
            align-items: center;
            gap: 0.6rem;
            color: var(--danger);
            font-size: 1.1rem;
        }

        .danger-card p.warning {
            margin: 0;
            color: rgba(192, 57, 43, 0.9);
            font-weight: 500;
        }

        body.theme-dark .danger-card {
            background: rgba(64, 8, 8, 0.6);
            border-color: rgba(231, 76, 60, 0.5);
        }

        .danger-button {
            background: linear-gradient(135deg, #ff6b5f, #ff3b2f);
            box-shadow: 0 18px 36px rgba(231, 76, 60, 0.28);
        }

        .danger-button:hover {
            box-shadow: 0 24px 44px rgba(231, 76, 60, 0.36);
        }

        .sticky-save-bar {
            position: fixed;
            bottom: 24px;
            left: 50%;
            transform: translateX(-50%);
            width: min(560px, calc(100% - 2.2rem));
            background: rgba(255, 255, 255, 0.9);
            backdrop-filter: blur(10px);
            border-radius: 999px;
            padding: 0.85rem 1rem;
            box-shadow: 0 18px 30px rgba(0, 0, 0, 0.18);
            display: flex;
            justify-content: center;
            z-index: 95;
        }

        body.theme-dark .sticky-save-bar {
            background: rgba(10, 26, 22, 0.8);
            border: 1px solid rgba(255, 255, 255, 0.08);
        }

        .save-button {
            width: min(260px, 100%);
            padding: 0.95rem 1rem;
            border: none;
            border-radius: 999px;
            font-size: 1.05rem;
            font-weight: 700;
            letter-spacing: 0.04em;
            color: var(--white);
            background: linear-gradient(135deg, var(--orange), var(--orange-bright));
            cursor: pointer;
            box-shadow: 0 18px 36px rgba(243, 115, 30, 0.4);
            transition: var(--transition-base);
        }

        .save-button:hover {
            transform: scale(1.03);
            box-shadow: 0 26px 44px rgba(243, 115, 30, 0.48);
        }

        /* Modals */
        .modal-backdrop {
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.45);
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 1.5rem;
            z-index: 120;
            visibility: hidden;
            opacity: 0;
            pointer-events: none;
            transition: opacity 220ms ease;
        }

        .modal-backdrop.active {
            visibility: visible;
            opacity: 1;
            pointer-events: auto;
        }

        .modal-card {
            width: min(420px, 100%);
            background: rgba(255, 255, 255, 0.92);
            border-radius: 22px;
            padding: 1.8rem;
            box-shadow: 0 26px 52px rgba(0, 0, 0, 0.28);
            border: 1px solid rgba(255, 255, 255, 0.35);
            display: flex;
            flex-direction: column;
            gap: 1.2rem;
            backdrop-filter: blur(12px);
        }

        .modal-card h3 {
            font-size: 1.5rem;
            color: var(--emerald);
        }

        .modal-card label {
            font-weight: 600;
            font-size: 0.92rem;
            color: rgba(17, 17, 17, 0.75);
        }

        .modal-card input[type="password"] {
            width: 100%;
            padding: 0.85rem 1rem;
            border-radius: 14px;
            border: 1px solid rgba(0, 0, 0, 0.1);
            background: rgba(255, 255, 255, 0.9);
            font-size: 1rem;
            transition: var(--transition-base);
        }

        .modal-card input[type="password"]:focus {
            outline: none;
            border-color: rgba(243, 115, 30, 0.6);
            box-shadow: 0 0 0 3px rgba(243, 115, 30, 0.18);
        }

        .modal-actions {
            display: flex;
            gap: 0.75rem;
            flex-wrap: wrap;
        }

        .modal-actions button {
            flex: 1;
            min-width: 140px;
        }

        .ghost-button {
            background: rgba(0, 0, 0, 0.08);
            color: rgba(17, 17, 17, 0.8);
            box-shadow: none;
        }

        .ghost-button:hover {
            background: rgba(0, 0, 0, 0.12);
            transform: none;
        }

        body.theme-dark .modal-card {
            background: rgba(10, 26, 22, 0.88);
            border-color: rgba(255, 255, 255, 0.12);
        }

        body.theme-dark .modal-card label {
            color: rgba(234, 220, 207, 0.8);
        }

        body.theme-dark .modal-card input[type="password"] {
            background: rgba(234, 220, 207, 0.12);
            color: rgba(255, 255, 255, 0.92);
            border-color: rgba(234, 220, 207, 0.2);
        }

        body.theme-dark .ghost-button {
            background: rgba(255, 255, 255, 0.12);
            color: rgba(234, 220, 207, 0.88);
        }

        /* Toast */
        .toast-container {
            position: fixed;
            bottom: 96px;
            left: 50%;
            transform: translateX(-50%);
            display: flex;
            flex-direction: column;
            gap: 0.65rem;
            align-items: center;
            z-index: 140;
        }

        .toast {
            min-width: 260px;
            padding: 0.85rem 1.4rem;
            border-radius: 999px;
            color: var(--white);
            font-weight: 600;
            box-shadow: 0 12px 28px rgba(0, 0, 0, 0.25);
            opacity: 0;
            transform: translateY(20px);
            transition: opacity 220ms ease, transform 220ms ease;
            pointer-events: none;
        }

        .toast.show {
            opacity: 1;
            transform: translateY(0);
        }

        .toast.success { background: linear-gradient(135deg, #2ecc71, #27ae60); }
        .toast.error { background: linear-gradient(135deg, #ff6b5f, #ff3b2f); }
        .toast.info { background: linear-gradient(135deg, var(--orange), var(--orange-bright)); }

        /* Footer */
        footer {
            margin-top: auto;
            padding: 2.8rem clamp(1.5rem, 5vw, 3.4rem);
            background: rgba(234, 220, 207, 0.82);
            border-top: 1px solid rgba(255, 255, 255, 0.4);
            backdrop-filter: blur(12px);
            display: flex;
            flex-direction: column;
            gap: 1.4rem;
        }

        body.theme-dark footer {
            background: rgba(10, 26, 22, 0.75);
            border-top-color: rgba(255, 255, 255, 0.1);
        }

        .footer-links,
        .footer-social {
            display: flex;
            flex-wrap: wrap;
            gap: 1rem;
            font-weight: 600;
            color: rgba(0, 77, 64, 0.82);
        }

        body.theme-dark .footer-links,
        body.theme-dark .footer-social {
            color: rgba(234, 220, 207, 0.78);
        }

        .footer-social i {
            font-size: 1.25rem;
        }

        .footer-bottom {
            font-size: 0.9rem;
            color: rgba(0, 0, 0, 0.6);
        }

        body.theme-dark .footer-bottom {
            color: rgba(234, 220, 207, 0.6);
        }

        @media (max-width: 640px) {
            header {
                flex-direction: column;
                align-items: flex-start;
            }

            .header-actions {
                width: 100%;
                justify-content: flex-end;
            }

            .toggle-row {
                flex-direction: column;
                align-items: flex-start;
            }

            .sticky-save-bar {
                bottom: 16px;
            }

            .footer-links,
            .footer-social {
                flex-direction: column;
                align-items: flex-start;
            }
        }
    </style>
</head>
<body class="theme-light">
    <!-- Header -->
    <header>
        <div class="header-left">
            <div class="header-logo">
                <img src="logo.jpeg" alt="YUSTAM Logo">
            </div>
            <div class="header-title">
                <span>YUSTAM Vendors</span>
            </div>
        </div>
        <div class="header-actions">
            <a class="icon-button" href="vendor-dashboard.php" aria-label="Dashboard">
                <i class="ri-home-4-line"></i>
            </a>
            <a class="icon-button" href="vendor-plans.php" aria-label="Plans">
                <i class="ri-vip-crown-line"></i>
            </a>
            <a class="icon-button" href="logout.php" aria-label="Logout">
                <i class="ri-logout-box-r-line"></i>
            </a>
        </div>
        <span class="header-underline" aria-hidden="true"></span>
    </header>
    <main>
        <div class="page-heading">
            <h1>Settings &amp; Preferences</h1>
            <p>Manage your notifications, security, and account preferences.</p>
        </div>
        <div class="settings-grid">
            <!-- Notification Settings -->
            <section class="settings-card">
                <h2>Notification Settings</h2>
                <p class="description">Choose the updates you want to receive so you never miss important activity.</p>
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
            <!-- Account Security -->
            <section class="settings-card">
                <h2>Account Security</h2>
                <p class="description">Strengthen your account with password updates and smarter authentication.</p>
                <button class="action-button" id="changePasswordBtn">Change Password</button>
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
            <!-- Theme Preferences -->
            <section class="settings-card">
                <h2>Theme Preferences</h2>
                <p class="description">Personalise the experience with a look that matches your energy.</p>
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
            <!-- Danger Zone -->
            <section class="settings-card danger-card">
                <div class="danger-header">
                    <i class="ri-error-warning-line"></i>
                    <h2>Danger Zone</h2>
                </div>
                <p class="description">Handle with care. Certain actions here cannot be reversed.</p>
                <button class="action-button danger-button" id="deleteAccountBtn">Delete My Account</button>
                <p class="warning">This action is permanent and cannot be undone.</p>
            </section>
        </div>
    </main>
    <!-- Footer -->
    <footer>
        <div class="footer-links">
            <a href="help.html">Help</a>
            <a href="privacy.html">Privacy</a>
            <a href="privacy.html#terms">Terms</a>
            <a href="contact.html">Contact</a>
        </div>
        <div class="footer-social">
            <span><i class="ri-whatsapp-line"></i> WhatsApp</span>
            <span><i class="ri-instagram-line"></i> Instagram</span>
            <span><i class="ri-facebook-circle-line"></i> Facebook</span>
        </div>
        <div class="footer-bottom">© 2025 YUSTAM Marketplace — Built for Nigeria.</div>
    </footer>

    <div class="sticky-save-bar">
        <button class="save-button" id="saveSettingsBtn">Save Changes</button>
    </div>

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
                <button class="action-button" id="updatePasswordBtn">Update Password</button>
                <button class="action-button ghost-button" id="cancelPasswordBtn">Cancel</button>
            </div>
        </div>
    </div>

    <div class="modal-backdrop" id="deleteAccountModal" role="dialog" aria-modal="true" aria-hidden="true">
        <div class="modal-card">
            <h3>Are you sure?</h3>
            <p class="description">Deleting your vendor account will remove all your listings and data permanently.</p>
            <div class="modal-actions">
                <button class="action-button danger-button" id="confirmDeleteBtn">Yes, Delete Account</button>
                <button class="action-button ghost-button" id="cancelDeleteBtn">Cancel</button>
            </div>
        </div>
    </div>

    <div class="toast-container" id="toastContainer"></div>

    <script src="vendor-settings.js" defer></script>
</body>
</html>
