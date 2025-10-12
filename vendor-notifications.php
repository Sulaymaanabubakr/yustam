<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>YUSTAM Vendor Notifications</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Anton&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <link href="https://cdn.jsdelivr.net/npm/remixicon@4.2.0/fonts/remixicon.css" rel="stylesheet">
    <style>
        :root {
            --emerald: #004D40;
            --orange: #F3731E;
            --beige: #EADCCF;
            --white: #FFFFFF;
            --ink: rgba(17, 17, 17, 0.88);
            --shadow-soft: 0 18px 45px rgba(0, 0, 0, 0.18);
            --radius-lg: 22px;
            --radius-md: 18px;
        }

        * {
            box-sizing: border-box;
        }

        body {
            margin: 0;
            font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: linear-gradient(160deg, rgba(234, 220, 207, 0.92), rgba(255, 255, 255, 0.96));
            color: var(--ink);
            min-height: 100vh;
            display: flex;
            flex-direction: column;
        }

        h1, h2, h3, h4 {
            font-family: 'Anton', sans-serif;
            letter-spacing: 0.03em;
            color: var(--emerald);
            margin: 0;
        }

        a {
            text-decoration: none;
            color: inherit;
        }

        header {
            position: sticky;
            top: 0;
            z-index: 40;
            background: rgba(0, 77, 64, 0.92);
            backdrop-filter: blur(12px);
            color: var(--white);
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0.85rem 1.4rem;
            box-shadow: 0 12px 30px rgba(0, 0, 0, 0.18);
            border-bottom: 2px solid rgba(243, 115, 30, 0.4);
        }

        .header-section {
            display: flex;
            align-items: center;
            gap: 0.9rem;
        }

        .logo-img {
            width: 46px;
            height: 46px;
            border-radius: 16px;
            object-fit: cover;
            box-shadow: 0 6px 16px rgba(0, 0, 0, 0.22);
        }

        .header-title {
            font-size: clamp(1.4rem, 4vw, 1.85rem);
            letter-spacing: 0.08em;
        }

        .header-actions {
            display: flex;
            align-items: center;
            gap: 0.65rem;
        }

        .icon-button {
            width: 46px;
            height: 46px;
            border-radius: 50%;
            border: 1px solid rgba(255, 255, 255, 0.28);
            background: rgba(255, 255, 255, 0.1);
            color: var(--white);
            display: inline-flex;
            align-items: center;
            justify-content: center;
            transition: background 220ms ease, transform 220ms ease, box-shadow 220ms ease;
        }

        .icon-button:hover {
            background: rgba(243, 115, 30, 0.65);
            transform: translateY(-2px);
            box-shadow: 0 10px 24px rgba(243, 115, 30, 0.32);
        }

        main {
            flex: 1;
            width: min(1180px, calc(100% - clamp(1.6rem, 5vw, 6rem)));
            margin: 0 auto;
            padding: clamp(1.4rem, 5vw, 2.6rem) 0 clamp(2.4rem, 6vw, 3.2rem);
            display: flex;
            flex-direction: column;
            gap: clamp(1.6rem, 3vw, 2.6rem);
            animation: fadeIn 600ms ease forwards;
        }

        .summary-card {
            background: linear-gradient(140deg, rgba(234, 220, 207, 0.78), rgba(0, 77, 64, 0.35));
            border: 1px solid rgba(255, 255, 255, 0.32);
            border-radius: var(--radius-lg);
            padding: clamp(1.1rem, 4vw, 1.6rem);
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 1rem;
            box-shadow: var(--shadow-soft);
            backdrop-filter: blur(16px);
            position: relative;
            overflow: hidden;
        }

        .summary-card::after {
            content: "";
            position: absolute;
            inset: auto 1.2rem 0.6rem auto;
            width: 120px;
            height: 120px;
            background: radial-gradient(circle at center, rgba(243, 115, 30, 0.6), transparent 65%);
            opacity: 0.45;
            filter: blur(8px);
        }

        .summary-info {
            display: flex;
            align-items: center;
            gap: 1rem;
        }

        .summary-icon {
            width: 58px;
            height: 58px;
            border-radius: 18px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            background: rgba(0, 77, 64, 0.65);
            color: var(--white);
            font-size: 1.75rem;
            box-shadow: 0 12px 22px rgba(0, 0, 0, 0.18);
        }

        .summary-text {
            display: flex;
            flex-direction: column;
            gap: 0.35rem;
        }

        .summary-text h2 {
            font-size: clamp(1.15rem, 3vw, 1.4rem);
            color: var(--emerald);
        }

        .summary-count {
            display: inline-flex;
            align-items: center;
            gap: 0.35rem;
            font-weight: 600;
            color: var(--emerald);
        }

        .summary-count span {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            min-width: 28px;
            padding: 0.2rem 0.55rem;
            background: rgba(243, 115, 30, 0.88);
            color: var(--white);
            border-radius: 999px;
            font-size: 0.85rem;
            box-shadow: 0 8px 18px rgba(243, 115, 30, 0.32);
        }

        .summary-actions {
            display: flex;
            align-items: center;
            gap: 0.75rem;
        }

        .btn {
            border: 1px solid transparent;
            border-radius: 999px;
            padding: 0.55rem 1.4rem;
            font-weight: 600;
            font-size: 0.95rem;
            letter-spacing: 0.02em;
            cursor: pointer;
            transition: transform 220ms ease, box-shadow 220ms ease, background 220ms ease;
            backdrop-filter: blur(12px);
        }

        .btn-outline-orange {
            background: rgba(243, 115, 30, 0.08);
            color: var(--orange);
            border-color: rgba(243, 115, 30, 0.6);
        }

        .btn-outline-orange:hover {
            background: rgba(243, 115, 30, 0.2);
            transform: translateY(-2px);
            box-shadow: 0 10px 24px rgba(243, 115, 30, 0.24);
        }

        .notifications-section {
            display: flex;
            flex-direction: column;
            gap: 1.4rem;
        }

        .notifications-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: clamp(1.1rem, 3vw, 1.6rem);
        }

        .notification-card {
            background: linear-gradient(155deg, rgba(234, 220, 207, 0.78), rgba(0, 77, 64, 0.28));
            border: 1px solid rgba(255, 255, 255, 0.32);
            border-radius: var(--radius-md);
            padding: 1rem 1.2rem;
            display: flex;
            flex-direction: column;
            gap: 0.75rem;
            position: relative;
            box-shadow: 0 16px 35px rgba(0, 0, 0, 0.16);
            backdrop-filter: blur(14px);
            cursor: pointer;
            transform: translateY(12px);
            opacity: 0;
            animation: cardFadeIn 420ms ease forwards;
            transition: background 220ms ease, box-shadow 220ms ease, transform 220ms ease;
        }

        .notification-card.open {
            background: linear-gradient(155deg, rgba(234, 220, 207, 0.92), rgba(0, 77, 64, 0.4));
            box-shadow: 0 18px 40px rgba(0, 77, 64, 0.28);
        }

        .notification-header {
            display: flex;
            align-items: flex-start;
            gap: 0.9rem;
        }

        .notification-icon {
            width: 46px;
            height: 46px;
            border-radius: 18px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-size: 1.5rem;
            background: rgba(0, 77, 64, 0.72);
            color: var(--white);
            box-shadow: 0 10px 20px rgba(0, 0, 0, 0.16);
        }

        .notification-title {
            font-size: 1.05rem;
            font-weight: 700;
            color: var(--emerald);
            margin-bottom: 0.2rem;
        }

        .notification-message {
            font-size: 0.95rem;
            color: rgba(17, 17, 17, 0.8);
            line-height: 1.55;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
        }

        .notification-meta {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 0.8rem;
            font-size: 0.82rem;
            color: rgba(17, 17, 17, 0.6);
        }

        .status-badge {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            padding: 0.25rem 0.75rem;
            border-radius: 999px;
            font-size: 0.78rem;
            font-weight: 600;
            letter-spacing: 0.02em;
        }

        .status-new {
            background: rgba(243, 115, 30, 0.88);
            color: var(--white);
            box-shadow: 0 12px 22px rgba(243, 115, 30, 0.26);
        }

        .status-read {
            background: rgba(234, 220, 207, 0.85);
            color: var(--emerald);
            border: 1px solid rgba(0, 77, 64, 0.18);
        }

        .notification-detail {
            max-height: 0;
            overflow: hidden;
            font-size: 0.95rem;
            color: rgba(17, 17, 17, 0.88);
            line-height: 1.6;
            border-top: 1px solid rgba(0, 77, 64, 0.12);
            padding-top: 0.75rem;
            opacity: 0;
            transition: max-height 260ms ease, opacity 220ms ease;
        }

        .notification-card.open .notification-detail {
            max-height: 220px;
            opacity: 1;
        }

        .empty-state {
            display: none;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 0.85rem;
            padding: clamp(2.4rem, 6vw, 3rem);
            border-radius: var(--radius-lg);
            background: linear-gradient(150deg, rgba(234, 220, 207, 0.82), rgba(0, 77, 64, 0.25));
            border: 1px solid rgba(255, 255, 255, 0.3);
            box-shadow: var(--shadow-soft);
            text-align: center;
            color: rgba(17, 17, 17, 0.75);
        }

        .empty-state-icon {
            width: 82px;
            height: 82px;
            border-radius: 26px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            background: rgba(0, 77, 64, 0.2);
            color: var(--emerald);
            font-size: 2.2rem;
        }

        .empty-state h3 {
            font-size: 1.25rem;
            color: var(--emerald);
        }

        .notification-actions {
            display: flex;
            justify-content: flex-end;
            margin-top: 0.6rem;
        }

        .danger-zone {
            margin-top: 2.2rem;
            padding: 1.4rem;
            border-radius: var(--radius-md);
            background: linear-gradient(155deg, rgba(243, 115, 30, 0.1), rgba(234, 220, 207, 0.45));
            border: 1px solid rgba(243, 115, 30, 0.28);
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 1rem;
        }

        .danger-zone h4 {
            font-size: 1.05rem;
            color: var(--orange);
        }

        .btn-danger {
            background: rgba(243, 115, 30, 0.95);
            color: var(--white);
            border: none;
        }

        .btn-danger:hover {
            box-shadow: 0 12px 26px rgba(243, 115, 30, 0.35);
            transform: translateY(-2px);
        }

        footer {
            background: rgba(0, 77, 64, 0.94);
            color: rgba(255, 255, 255, 0.9);
            padding: clamp(1.8rem, 5vw, 2.6rem) clamp(1.2rem, 4vw, 2.2rem);
            margin-top: auto;
        }

        .footer-content {
            display: flex;
            flex-direction: column;
            gap: 1.2rem;
        }

        .footer-links, .footer-socials {
            display: flex;
            flex-wrap: wrap;
            gap: 0.9rem;
        }

        .footer-links a, .footer-socials a {
            color: rgba(255, 255, 255, 0.85);
            font-weight: 500;
            transition: color 200ms ease;
        }

        .footer-links a:hover, .footer-socials a:hover {
            color: rgba(243, 115, 30, 0.85);
        }

        .toast {
            position: fixed;
            left: 50%;
            bottom: 2.2rem;
            transform: translateX(-50%) translateY(120%);
            background: rgba(0, 77, 64, 0.92);
            color: var(--white);
            padding: 0.85rem 1.8rem;
            border-radius: 999px;
            box-shadow: 0 18px 30px rgba(0, 0, 0, 0.18);
            display: flex;
            align-items: center;
            gap: 0.6rem;
            font-weight: 600;
            opacity: 0;
            transition: transform 320ms ease, opacity 320ms ease;
            z-index: 60;
        }

        .toast.show {
            transform: translateX(-50%) translateY(0);
            opacity: 1;
        }

        @keyframes fadeIn {
            from {
                opacity: 0;
                transform: translateY(14px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        @keyframes cardFadeIn {
            from {
                opacity: 0;
                transform: translateY(24px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        @media (max-width: 768px) {
            header {
                padding: 0.75rem 1rem;
            }

            .header-actions {
                gap: 0.5rem;
            }

            .summary-card {
                flex-direction: column;
                align-items: flex-start;
                gap: 0.9rem;
            }

            .summary-actions {
                width: 100%;
                justify-content: flex-start;
            }

            .summary-actions .btn {
                width: 100%;
                text-align: center;
            }

            .notifications-grid {
                grid-template-columns: 1fr;
            }

            .danger-zone {
                flex-direction: column;
                align-items: flex-start;
            }

            .btn-danger {
                width: 100%;
                text-align: center;
            }

            footer {
                text-align: center;
            }

            .footer-links, .footer-socials {
                justify-content: center;
            }
        }
    </style>
</head>
<body>
<header>
    <div class="header-section">
        <img src="logo.jpeg" alt="YUSTAM Logo" class="logo-img">
        <span class="header-title">Notifications</span>
    </div>
    <div class="header-actions">
        <a class="icon-button" href="vendor-dashboard.php" aria-label="Back to dashboard">
            <i class="ri-home-3-line"></i>
        </a>
        <a class="icon-button" href="vendor-settings.php" aria-label="Settings">
            <i class="ri-settings-3-line"></i>
        </a>
        <a class="icon-button" href="logout.php" aria-label="Logout">
            <i class="ri-logout-box-r-line"></i>
        </a>
    </div>
</header>
<main>
    <section class="summary-card" id="notificationSummary" aria-live="polite">
        <div class="summary-info">
            <span class="summary-icon">
                <i class="ri-notification-3-line"></i>
            </span>
            <div class="summary-text">
                <h2>Notification Center</h2>
                <div class="summary-count">You have <span id="newCount">0</span> new alerts</div>
                <small style="color: rgba(17, 17, 17, 0.65); font-size: 0.86rem;">Stay on top of every update for your store.</small>
            </div>
        </div>
        <div class="summary-actions">
            <button class="btn btn-outline-orange" id="markAllReadTop">Mark all as read</button>
        </div>
    </section>

    <section class="notifications-section">
        <div class="notification-actions">
            <button class="btn btn-outline-orange" id="markAllRead">Mark all as read</button>
        </div>
        <div class="empty-state" id="emptyState" aria-hidden="true">
            <span class="empty-state-icon"><i class="ri-notification-off-line"></i></span>
            <h3>No new notifications yet.</h3>
            <p>You’ll see updates here as your business grows on YUSTAM.</p>
        </div>
        <div class="notifications-grid" id="notificationsGrid" aria-live="polite"></div>
    </section>

    <section class="danger-zone">
        <div>
            <h4>Danger Zone</h4>
            <p style="margin: 0; color: rgba(17, 17, 17, 0.72);">Clear all notifications to start fresh. This action cannot be undone.</p>
        </div>
        <button class="btn btn-danger" id="clearAll">Clear all notifications</button>
    </section>
</main>

<div class="toast" id="toast" role="status" aria-live="assertive"></div>

<footer>
    <div class="footer-content">
        <div class="footer-links">
            <a href="vendor-dashboard.php">Dashboard</a>
            <a href="vendor-plans.php">Plans</a>
            <a href="help.html">Help</a>
            <a href="contact.html">Contact Support</a>
        </div>
        <div class="footer-socials">
            <a href="https://wa.me/2347089709931" target="_blank" rel="noopener">WhatsApp</a>
            <a href="https://instagram.com" target="_blank" rel="noopener">Instagram</a>
            <a href="https://facebook.com" target="_blank" rel="noopener">Facebook</a>
        </div>
        <small style="color: rgba(255, 255, 255, 0.7);">© 2025 YUSTAM Marketplace — Built for Nigeria.</small>
    </div>
</footer>

<script src="vendor-notifications.js" defer></script>
</body>
</html>
