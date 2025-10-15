<?php
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');

$mockPlan = [
    'planName' => 'Pro Seller',
    'planBadge' => 'pro-seller',
    'monthlyPrice' => 5000,
    'currency' => 'NGN',
    'expiresOn' => date('Y-m-d', strtotime('+12 days')),
    'remainingListings' => 18,
    'contactEmail' => 'vendor@yustam.test',
    'vendorName' => 'YUSTAM Vendor',
];

if (isset($_GET['format']) && $_GET['format'] === 'json') {
    header('Content-Type: application/json');
    echo json_encode([
        'success' => true,
        'data' => $mockPlan,
    ], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Renew Subscription | YUSTAM Marketplace</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Anton&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
    <link href="https://cdn.jsdelivr.net/npm/remixicon@4.2.0/fonts/remixicon.css" rel="stylesheet" />
    <style>
        :root {
            --emerald: #0f6a53;
            --emerald-deep: #0b4f3c;
            --orange: #f3731e;
            --orange-bright: #ff9448;
            --beige: #f1e5d9;
            --ink: #152521;
            --white: #ffffff;
            --glass-bg: rgba(255, 255, 255, 0.85);
            --glass-border: rgba(255, 255, 255, 0.55);
            --shadow-soft: 0 24px 48px rgba(17, 17, 17, 0.14);
            --radius-large: 20px;
            --radius-medium: 18px;
        }

        *, *::before, *::after {
            box-sizing: border-box;
        }

        body {
            margin: 0;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background:
                radial-gradient(circle at top right, rgba(15, 106, 83, 0.18), transparent 50%),
                radial-gradient(circle at bottom left, rgba(243, 115, 30, 0.18), transparent 50%),
                linear-gradient(135deg, rgba(234, 220, 207, 0.92), rgba(255, 255, 255, 0.96));
            color: var(--ink);
        }

        img {
            max-width: 100%;
            display: block;
        }

        a {
            color: inherit;
            text-decoration: none;
        }

        header {
            position: sticky;
            top: 0;
            z-index: 40;
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 14px clamp(16px, 4vw, 32px);
            backdrop-filter: blur(16px);
            background: rgba(15, 106, 83, 0.94);
            border-bottom: 3px solid rgba(243, 115, 30, 0.65);
            box-shadow: 0 18px 36px rgba(0, 0, 0, 0.22);
            color: var(--white);
        }

        .header-brand {
            display: flex;
            align-items: center;
            gap: 14px;
        }

        .logo-shell {
            width: 54px;
            height: 54px;
            border-radius: 18px;
            background: rgba(255, 255, 255, 0.16);
            border: 1px solid rgba(255, 255, 255, 0.28);
            display: grid;
            place-items: center;
            overflow: hidden;
            box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.28);
            cursor: pointer;
        }

        .logo-shell img {
            width: 48px;
            height: 48px;
            object-fit: cover;
            border-radius: 16px;
        }

        .header-title {
            display: flex;
            flex-direction: column;
            gap: 4px;
        }

        .header-title span {
            font-size: 0.82rem;
            letter-spacing: 0.08em;
            opacity: 0.78;
        }

        .header-title h1 {
            margin: 0;
            font-family: 'Anton', sans-serif;
            letter-spacing: 0.08em;
            font-size: clamp(1.35rem, 4vw, 1.85rem);
            text-transform: uppercase;
        }

        .header-actions {
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .header-icon {
            width: 44px;
            height: 44px;
            border-radius: 50%;
            border: 1px solid rgba(255, 255, 255, 0.22);
            background: rgba(255, 255, 255, 0.14);
            color: var(--white);
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-size: 1.2rem;
            transition: transform 200ms ease, background 200ms ease, box-shadow 200ms ease;
        }

        .header-icon:hover,
        .header-icon:focus-visible {
            transform: translateY(-3px);
            background: rgba(255, 255, 255, 0.3);
            box-shadow: 0 14px 30px rgba(243, 115, 30, 0.4);
        }

        main {
            flex: 1;
            width: min(1180px, 92vw);
            margin: 0 auto;
            padding: clamp(42px, 6vw, 72px) 0 clamp(60px, 8vw, 90px);
            display: flex;
            flex-direction: column;
            gap: clamp(26px, 4vw, 40px);
        }

        .page-intro {
            display: flex;
            flex-direction: column;
            gap: 10px;
        }

        .page-intro h2 {
            margin: 0;
            font-family: 'Anton', sans-serif;
            font-size: clamp(1.6rem, 5vw, 2.2rem);
            letter-spacing: 0.06em;
            color: var(--emerald-deep);
        }

        .page-intro p {
            margin: 0;
            max-width: 620px;
            color: rgba(21, 37, 33, 0.72);
            font-size: 0.98rem;
            line-height: 1.65;
        }

        .glass-card {
            background: var(--glass-bg);
            border: 1px solid var(--glass-border);
            border-radius: var(--radius-large);
            backdrop-filter: blur(8px);
            box-shadow: var(--shadow-soft);
            padding: clamp(22px, 4vw, 32px);
        }

        .current-plan-card {
            display: grid;
            gap: 16px;
            position: relative;
            overflow: hidden;
        }

        .current-plan-card::after {
            content: '';
            position: absolute;
            top: -60px;
            right: -40px;
            width: 160px;
            height: 160px;
            background: radial-gradient(circle, rgba(243, 115, 30, 0.32), transparent 62%);
            filter: blur(6px);
            opacity: 0.85;
        }

        .plan-badge {
            align-self: start;
            padding: 8px 18px;
            border-radius: 999px;
            font-weight: 600;
            letter-spacing: 0.02em;
            display: inline-flex;
            align-items: center;
            gap: 8px;
            font-size: 0.85rem;
        }

        .plan-badge.free {
            background: rgba(17, 17, 17, 0.08);
            color: rgba(17, 17, 17, 0.72);
        }

        .plan-badge.starter {
            background: rgba(243, 115, 30, 0.16);
            color: var(--orange);
        }

        .plan-badge.pro-seller {
            background: rgba(15, 106, 83, 0.18);
            color: var(--emerald-deep);
        }

        .plan-badge.elite-seller {
            background: linear-gradient(135deg, rgba(243, 115, 30, 0.65), rgba(255, 192, 120, 0.65));
            color: var(--white);
        }

        .plan-badge.power-vendor {
            background: linear-gradient(135deg, rgba(79, 33, 141, 0.78), rgba(243, 115, 30, 0.78));
            color: var(--white);
        }

        .plan-name {
            margin: 0;
            font-family: 'Anton', sans-serif;
            font-size: clamp(1.5rem, 5vw, 2.3rem);
            letter-spacing: 0.06em;
            color: var(--emerald-deep);
        }

        .plan-meta {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
            gap: 16px;
            font-size: 0.95rem;
            color: rgba(21, 37, 33, 0.74);
        }

        .plan-meta span {
            display: flex;
            flex-direction: column;
            gap: 6px;
            background: rgba(255, 255, 255, 0.65);
            border-radius: var(--radius-medium);
            padding: 12px 16px;
            border: 1px solid rgba(15, 106, 83, 0.12);
        }

        .plan-meta small {
            text-transform: uppercase;
            letter-spacing: 0.08em;
            font-weight: 600;
            color: rgba(15, 106, 83, 0.76);
        }

        .plan-expiry {
            margin: 0;
            font-weight: 600;
            font-size: 1rem;
            color: rgba(243, 115, 30, 0.9);
        }

        .renewal-section {
            display: grid;
            gap: 22px;
        }

        .renewal-section h3 {
            margin: 0;
            font-family: 'Anton', sans-serif;
            letter-spacing: 0.05em;
            font-size: clamp(1.25rem, 4vw, 1.7rem);
            color: var(--emerald-deep);
        }

        .duration-grid {
            display: grid;
            gap: 16px;
        }

        .duration-option {
            position: relative;
            display: flex;
            align-items: center;
            gap: 14px;
            padding: 14px 16px;
            border-radius: var(--radius-medium);
            border: 1px solid rgba(15, 106, 83, 0.14);
            background: rgba(255, 255, 255, 0.72);
            transition: border 200ms ease, box-shadow 200ms ease, transform 200ms ease;
            cursor: pointer;
        }

        .duration-option input[type="radio"] {
            accent-color: var(--emerald);
            width: 18px;
            height: 18px;
        }

        .duration-option .duration-label {
            flex: 1;
            display: flex;
            flex-direction: column;
            gap: 4px;
        }

        .duration-option strong {
            font-size: 1.05rem;
        }

        .duration-option .discount-text {
            font-size: 0.86rem;
            color: rgba(243, 115, 30, 0.8);
        }

        .duration-option .duration-price {
            font-weight: 600;
            color: var(--emerald-deep);
        }

        .duration-option:hover,
        .duration-option:focus-within {
            border-color: rgba(243, 115, 30, 0.65);
            box-shadow: 0 16px 32px rgba(15, 106, 83, 0.18);
            transform: translateY(-2px);
        }

        .duration-option.active {
            border-color: rgba(243, 115, 30, 0.75);
            background: rgba(255, 255, 255, 0.86);
            box-shadow: 0 18px 36px rgba(243, 115, 30, 0.18);
        }

        .total-display {
            font-size: 1rem;
            font-weight: 600;
            color: var(--emerald-deep);
            background: rgba(255, 255, 255, 0.7);
            border-radius: var(--radius-medium);
            padding: 14px 18px;
            border: 1px solid rgba(15, 106, 83, 0.16);
        }

        .renew-button {
            appearance: none;
            border: none;
            border-radius: 999px;
            padding: 14px 28px;
            font-size: 1.02rem;
            font-weight: 600;
            letter-spacing: 0.04em;
            text-transform: uppercase;
            color: var(--white);
            background: linear-gradient(135deg, var(--orange), var(--orange-bright));
            box-shadow: 0 16px 30px rgba(243, 115, 30, 0.3);
            cursor: pointer;
            transition: transform 200ms ease, box-shadow 200ms ease, filter 200ms ease;
        }

        .renew-button:hover,
        .renew-button:focus-visible {
            transform: translateY(-3px);
            box-shadow: 0 22px 40px rgba(243, 115, 30, 0.35);
            filter: brightness(1.05);
        }

        .renew-button[disabled] {
            cursor: not-allowed;
            opacity: 0.75;
            transform: none;
            box-shadow: none;
        }

        footer {
            margin-top: auto;
            padding: 32px clamp(20px, 4vw, 48px);
            background: rgba(241, 229, 217, 0.82);
            backdrop-filter: blur(12px);
            border-top: 1px solid rgba(255, 255, 255, 0.6);
            color: rgba(21, 37, 33, 0.75);
        }

        .footer-shell {
            width: min(1100px, 94vw);
            margin: 0 auto;
            display: flex;
            flex-direction: column;
            gap: 12px;
            text-align: center;
        }

        .footer-shell a {
            color: rgba(15, 106, 83, 0.85);
            font-weight: 600;
        }

        @media (min-width: 720px) {
            .duration-grid {
                grid-template-columns: repeat(2, minmax(0, 1fr));
            }
        }

        @media (min-width: 980px) {
            .duration-grid {
                grid-template-columns: repeat(4, minmax(0, 1fr));
            }

            .duration-option {
                flex-direction: column;
                align-items: flex-start;
            }

            .duration-option input[type="radio"] {
                align-self: flex-start;
            }

            .duration-option .duration-price {
                font-size: 1.05rem;
            }
        }
    </style>
</head>
<body>
    <header>
        <div class="header-brand logo-area" tabindex="0">
            <div class="logo-shell">
                <img src="logo.jpeg" alt="YUSTAM Logo" />
            </div>
            <div class="header-title">
                <span>Vendor Suite</span>
                <h1>Renew Subscription</h1>
            </div>
        </div>
        <nav class="header-actions">
            <a href="vendor-notifications.php" class="header-icon" aria-label="Notifications">
                <i class="ri-notification-3-line"></i>
            </a>
            <a href="vendor-settings.php" class="header-icon" aria-label="Settings">
                <i class="ri-settings-3-line"></i>
            </a>
            <a href="vendor-profile.php" class="header-icon" aria-label="Profile">
                <i class="ri-user-3-line"></i>
            </a>
            <a href="logout.php" class="header-icon" aria-label="Logout">
                <i class="ri-logout-box-r-line"></i>
            </a>
        </nav>
    </header>

    <main>
        <section class="page-intro">
            <h2>Keep your store live without interruption</h2>
            <p>Renew your current plan in a few clicks. Choose how long you want to stay active, enjoy built-in discounts on longer commitments, and complete your payment securely via Paystack.</p>
        </section>

        <section class="glass-card current-plan-card" aria-live="polite">
            <span class="plan-badge" id="currentPlanBadge">Current Plan</span>
            <h3 class="plan-name" id="currentPlanName">—</h3>
            <div class="plan-meta">
                <span>
                    <small>Expiry date</small>
                    <strong id="currentPlanExpiry">—</strong>
                </span>
                <span>
                    <small>Remaining listings</small>
                    <strong id="currentPlanListings">—</strong>
                </span>
                <span>
                    <small>Plan price</small>
                    <strong id="currentPlanPrice">—</strong>
                </span>
                <span>
                    <small>Days left</small>
                    <strong id="currentPlanCountdown">—</strong>
                </span>
            </div>
            <p class="plan-expiry" id="planExpiryText">Your plan status will update shortly.</p>
        </section>

        <section class="glass-card renewal-section">
            <h3>Choose Renewal Duration</h3>
            <div class="duration-grid" role="radiogroup" aria-label="Renewal duration">
                <label class="duration-option active">
                    <input type="radio" name="renewDuration" value="1" checked />
                    <div class="duration-label">
                        <strong>1 Month</strong>
                        <span class="discount-text">Standard pricing</span>
                    </div>
                    <span class="duration-price" data-months="1">—</span>
                </label>
                <label class="duration-option">
                    <input type="radio" name="renewDuration" value="3" />
                    <div class="duration-label">
                        <strong>3 Months</strong>
                        <span class="discount-text">10% discount applied</span>
                    </div>
                    <span class="duration-price" data-months="3">—</span>
                </label>
                <label class="duration-option">
                    <input type="radio" name="renewDuration" value="6" />
                    <div class="duration-label">
                        <strong>6 Months</strong>
                        <span class="discount-text">20% discount applied</span>
                    </div>
                    <span class="duration-price" data-months="6">—</span>
                </label>
                <label class="duration-option">
                    <input type="radio" name="renewDuration" value="12" />
                    <div class="duration-label">
                        <strong>12 Months</strong>
                        <span class="discount-text">30% discount applied</span>
                    </div>
                    <span class="duration-price" data-months="12">—</span>
                </label>
            </div>
            <div class="total-display" id="renewalSummary">Select a duration to see your total.</div>
            <button class="renew-button" id="renewButton" type="button">Renew Now</button>
        </section>
    </main>

    <footer>
        <div class="footer-shell">
            <p>Need help with your renewal? <a href="help.html">Visit support</a>.</p>
            <small>© <?php echo date('Y'); ?> YUSTAM Marketplace. All rights reserved.</small>
        </div>
    </footer>
  <script src="theme-manager.js" defer></script>
<script src="https://js.paystack.co/v1/inline.js" defer></script>
<script src="vendor-renew-plan.js" defer></script>
</body>
</html>




