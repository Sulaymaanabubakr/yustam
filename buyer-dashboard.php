<?php
require_once __DIR__ . '/session-path.php';
session_start();

require_once __DIR__ . '/buyer-storage.php';

if (!isset($_SESSION['buyer_id'])) {
    header('Location: buyer-login.php');
    exit;
}

$buyerId = (int)$_SESSION['buyer_id'];
$buyer = yustam_buyers_find($buyerId);

if (!$buyer) {
    session_destroy();
    header('Location: buyer-login.php');
    exit;
}

$buyerName = $buyer['name'] ?? 'Buyer';
$_SESSION['buyer_name'] = $buyerName;

$joined = 'Today';
if (!empty($buyer['joined_at'])) {
    try {
        $date = new DateTimeImmutable($buyer['joined_at']);
    } catch (Exception $e) {
        $date = new DateTimeImmutable('@' . strtotime($buyer['joined_at']));
    }
    if ($date instanceof DateTimeImmutable) {
        $joined = $date->setTimezone(new DateTimeZone(date_default_timezone_get()))->format('j M Y');
    }
}
?>
<!DOCTYPE html>
<html lang="en" data-theme="buyer-dashboard">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Buyer Dashboard | YUSTAM Marketplace</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Anton&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
        :root {
            --emerald: #004D40;
            --emerald-opaque: rgba(0, 77, 64, 0.9);
            --orange: #F3731E;
            --beige: #EADCCF;
            --glass: rgba(255, 255, 255, 0.78);
            --muted: rgba(17, 17, 17, 0.68);
            --shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
        }

        * { box-sizing: border-box; }

        body {
            margin: 0;
            font-family: 'Inter', system-ui, sans-serif;
            background: linear-gradient(160deg, rgba(234, 220, 207, 0.94), rgba(255, 255, 255, 0.88));
            color: rgba(17, 17, 17, 0.85);
            min-height: 100vh;
            display: flex;
            flex-direction: column;
        }

        h1, h2, h3 {
            font-family: 'Anton', sans-serif;
            letter-spacing: 0.06em;
            color: var(--emerald);
            margin: 0;
        }

        a { color: inherit; text-decoration: none; }

        .dashboard-header {
            position: sticky;
            top: 0;
            z-index: 40;
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 18px clamp(16px, 4vw, 40px);
            background: linear-gradient(120deg, rgba(0, 77, 64, 0.98), rgba(0, 77, 64, 0.86));
            backdrop-filter: blur(14px);
            border-bottom: 2px solid rgba(243, 115, 30, 0.4);
            box-shadow: 0 16px 32px rgba(0, 0, 0, 0.22);
            color: #fff;
        }

        .brand {
            display: flex;
            align-items: center;
            gap: 14px;
        }

        .brand-mark {
            width: 44px;
            height: 44px;
            border-radius: 14px;
            background: rgba(255, 255, 255, 0.16);
            display: grid;
            place-items: center;
            font-family: 'Anton', sans-serif;
            font-size: 1.2rem;
            letter-spacing: 0.04em;
        }

        .brand span {
            font-weight: 600;
            letter-spacing: 0.08em;
            text-transform: uppercase;
        }

        .header-icons {
            display: inline-flex;
            gap: 12px;
        }

        .header-icon {
            width: 44px;
            height: 44px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            background: rgba(255, 255, 255, 0.14);
            border-radius: 14px;
            transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
            font-size: 1.15rem;
        }

        .header-icon:hover,
        .header-icon:focus-visible {
            transform: translateY(-2px);
            background: rgba(243, 115, 30, 0.75);
            box-shadow: 0 14px 26px rgba(243, 115, 30, 0.35);
        }

        main {
            flex: 1;
            padding: clamp(24px, 6vw, 56px);
            display: grid;
            gap: clamp(24px, 4vw, 36px);
        }

        .glass-card {
            background: var(--glass);
            backdrop-filter: blur(18px);
            border-radius: 18px;
            border: 1px solid rgba(255, 255, 255, 0.55);
            box-shadow: var(--shadow);
            padding: clamp(20px, 4vw, 30px);
        }

        .welcome-card {
            display: grid;
            gap: 12px;
        }

        .welcome-card p {
            margin: 0;
            font-size: 1rem;
            color: var(--muted);
        }

        .grid-two {
            display: grid;
            gap: clamp(18px, 3vw, 28px);
            grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
        }

        .recent-saved {
            display: grid;
            gap: 18px;
        }

        .recent-saved h2 {
            font-size: 1.4rem;
            margin: 0;
        }

        .recent-saved .head {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
        }

        #recentSavedGrid {
            display: grid;
            gap: 14px;
            grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        }

        .mini-saved-card {
            display: grid;
            gap: 10px;
            background: rgba(255, 255, 255, 0.86);
            border-radius: 18px;
            padding: 14px;
            border: 1px solid rgba(0, 77, 64, 0.12);
            box-shadow: 0 10px 20px rgba(0, 0, 0, 0.08);
        }

        .mini-saved-card img {
            width: 100%;
            height: 120px;
            object-fit: cover;
            border-radius: 14px;
        }

        .mini-saved-card p {
            margin: 0;
            font-weight: 600;
            color: rgba(17, 17, 17, 0.85);
        }

        .mini-saved-card span {
            color: rgba(0, 77, 64, 0.75);
            font-weight: 600;
        }

        .btn-orange {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 10px 16px;
            border-radius: 14px;
            background: linear-gradient(135deg, rgba(243, 115, 30, 0.95), rgba(255, 138, 60, 0.95));
            color: #fff;
            font-weight: 600;
            text-decoration: none;
            transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .btn-orange:hover {
            transform: translateY(-2px);
            box-shadow: 0 16px 26px rgba(243, 115, 30, 0.28);
        }

        .section-title {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 18px;
        }

        .mini-card {
            display: flex;
            align-items: center;
            gap: 14px;
            padding: 16px;
            background: rgba(255, 255, 255, 0.86);
            border-radius: 18px;
            border: 1px solid rgba(0, 77, 64, 0.1);
            box-shadow: 0 8px 18px rgba(0, 0, 0, 0.08);
        }

        .mini-card img {
            width: 56px;
            height: 56px;
            border-radius: 16px;
            object-fit: cover;
        }

        .mini-card .meta {
            display: grid;
            gap: 6px;
        }

        .mini-card .meta strong {
            font-size: 1rem;
            color: rgba(17, 17, 17, 0.88);
        }

        .mini-card .meta span {
            font-size: 0.86rem;
            color: var(--muted);
        }

        .empty-state {
            padding: 18px;
            border-radius: 16px;
            background: rgba(255, 255, 255, 0.72);
            border: 1px dashed rgba(0, 77, 64, 0.3);
            text-align: center;
            font-weight: 500;
            color: rgba(0, 77, 64, 0.7);
        }

        .shortcut-grid {
            display: grid;
            gap: 18px;
            grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        }

        .shortcut {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 18px 20px;
            border-radius: 18px;
            background: linear-gradient(135deg, rgba(243, 115, 30, 0.92), rgba(255, 138, 61, 0.92));
            color: #fff;
            font-weight: 600;
            box-shadow: 0 16px 32px rgba(243, 115, 30, 0.32);
            transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .shortcut:hover {
            transform: translateY(-2px);
            box-shadow: 0 20px 36px rgba(243, 115, 30, 0.36);
        }

        .shortcut span:last-child {
            font-size: 1.4rem;
        }

        .recent-list {
            display: grid;
            gap: 14px;
        }

        .badge {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 6px 12px;
            border-radius: 999px;
            background: rgba(0, 77, 64, 0.14);
            color: var(--emerald);
            font-size: 0.78rem;
            letter-spacing: 0.04em;
        }

        .toast {
            position: fixed;
            bottom: 32px;
            left: 50%;
            transform: translateX(-50%) translateY(120%);
            min-width: 260px;
            padding: 14px 18px;
            border-radius: 18px;
            background: rgba(0, 77, 64, 0.9);
            color: #fff;
            font-weight: 600;
            text-align: center;
            box-shadow: 0 12px 24px rgba(0, 0, 0, 0.18);
            backdrop-filter: blur(12px);
            opacity: 0;
            transition: opacity 0.3s ease, transform 0.3s ease;
            z-index: 60;
        }

        .toast.is-error { background: rgba(217, 48, 37, 0.9); }

        .toast.is-visible {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
        }

        @media (max-width: 720px) {
            .dashboard-header {
                flex-direction: column;
                align-items: stretch;
                gap: 16px;
            }

            .header-icons {
                justify-content: space-between;
            }
        }
    </style>
</head>
<body data-buyer-id="<?= htmlspecialchars((string)$buyerId) ?>" data-buyer-name="<?= htmlspecialchars($buyerName) ?>">
    <header class="dashboard-header">
        <a href="index.html" class="brand" aria-label="YUSTAM home">
            <div class="brand-mark">YU</div>
            <span>YUSTAM MARKETPLACE</span>
        </a>
        <nav class="header-icons" aria-label="Buyer shortcuts">
            <a class="header-icon" href="buyer-dashboard.php" title="Home" aria-label="Home">🏠</a>
            <a class="header-icon" href="buyer-chats.php" title="Chats" aria-label="Chats">💬</a>
            <a class="header-icon" href="buyer-saved.php" title="Saved listings" aria-label="Saved listings">❤️</a>
            <a class="header-icon" href="buyer-logout.php" title="Logout" aria-label="Logout">🔐</a>
        </nav>
    </header>
    <main id="buyerDashboard" data-buyer-id="<?= htmlspecialchars((string)$buyerId) ?>">
        <section class="glass-card welcome-card">
            <h1>Welcome back, <?= htmlspecialchars(explode(' ', $buyerName)[0] ?? $buyerName) ?>!</h1>
            <p>Joined since <strong><?= htmlspecialchars($joined) ?></strong></p>
            <span class="badge">Buyer ID #<?= htmlspecialchars((string)$buyerId) ?></span>
        </section>

        <section class="glass-card recent-saved">
            <div class="head">
                <h2>Recently Saved</h2>
                <a class="btn-orange" href="buyer-saved.php">View All</a>
            </div>
            <div id="recentSavedGrid" aria-live="polite"></div>
            <div class="empty-state" id="recentSavedEmpty" role="status" hidden>You haven’t saved any listings yet.</div>
        </section>

        <section class="glass-card">
            <div class="section-title">
                <h2 style="font-size:1.4rem;">Recent conversations</h2>
                <a class="badge" href="buyer-chats.php">Open messages</a>
            </div>
            <div class="recent-list" id="recentChatsList" aria-live="polite"></div>
            <div class="empty-state" id="chatsEmptyState" role="status" style="display:none;">Start chatting with vendors from a product page.</div>
        </section>

        <section class="shortcut-grid">
            <a href="buyer-chats.php" class="shortcut" aria-label="View all messages">
                <span>View all messages</span>
                <span>💬</span>
            </a>
            <a href="buyer-saved.php" class="shortcut" aria-label="View saved listings">
                <span>View saved listings</span>
                <span>❤️</span>
            </a>
        </section>
    </main>

    <div class="toast" id="buyerToast" role="status" aria-live="polite"></div>
  <script src="theme-manager.js" defer></script>
<script type="module" src="buyer-dashboard.js"></script>
</body>
</html>




