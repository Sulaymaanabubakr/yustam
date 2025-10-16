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
$buyer = yustam_buyers_ensure_uid($buyer ?? []);

if (!$buyer) {
    session_destroy();
    header('Location: buyer-login.php');
    exit;
}

$buyerName = $buyer['name'] ?? 'Buyer';
$_SESSION['buyer_name'] = $buyerName;
if (!empty($buyer['buyer_uid'])) {
    $_SESSION['buyer_uid'] = $buyer['buyer_uid'];
}
if (!empty($buyer['email'])) {
    $_SESSION['buyer_email'] = $buyer['email'];
}
$buyerUid = isset($_SESSION['buyer_uid']) ? (string) $_SESSION['buyer_uid'] : '';
if ($buyerUid === '' && !empty($buyer['buyer_uid'])) {
    $buyerUid = (string) $buyer['buyer_uid'];
    $_SESSION['buyer_uid'] = $buyerUid;
}
$buyerIdentifier = $buyerUid !== '' ? $buyerUid : (string) $buyerId;

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

$firstName = trim((string)$buyerName);
if ($firstName === '') {
    $firstName = 'Buyer';
} else {
    $firstName = explode(' ', $firstName)[0] ?? 'Buyer';
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
    <link href="https://cdn.jsdelivr.net/npm/remixicon@4.2.0/fonts/remixicon.css" rel="stylesheet">
        <style>
        :root {
            --emerald: #004d40;
            --emerald-soft: rgba(0, 77, 64, 0.82);
            --orange: #f3731e;
            --beige: #eadccf;
            --glass-bg: rgba(255, 255, 255, 0.86);
            --glass-border: rgba(255, 255, 255, 0.65);
            --ink: rgba(17, 17, 17, 0.86);
            --muted: rgba(17, 17, 17, 0.64);
        }

        * {
            box-sizing: border-box;
        }

        body {
            margin: 0;
            font-family: 'Inter', system-ui, sans-serif;
            background:
                radial-gradient(circle at top right, rgba(0, 77, 64, 0.16), transparent 55%),
                radial-gradient(circle at bottom left, rgba(243, 115, 30, 0.16), transparent 60%),
                linear-gradient(160deg, rgba(234, 220, 207, 0.94), #ffffff);
            color: var(--ink);
            min-height: 100vh;
        }

        img {
            max-width: 100%;
            display: block;
        }

        a {
            color: inherit;
            text-decoration: none;
        }

        .buyer-header {
            position: sticky;
            top: 0;
            z-index: 80;
            backdrop-filter: blur(20px);
            background: rgba(0, 77, 64, 0.92);
            color: #ffffff;
            border-bottom: 2px solid rgba(243, 115, 30, 0.32);
            box-shadow: 0 18px 36px rgba(0, 0, 0, 0.22);
        }

        .header-shell {
            width: min(1180px, 92vw);
            margin: 0 auto;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: clamp(16px, 3vw, 28px);
            padding: clamp(16px, 4vw, 22px) 0;
        }

        .brand {
            display: inline-flex;
            align-items: center;
            gap: 16px;
        }

        .brand-badge {
            width: 50px;
            height: 50px;
            border-radius: 18px;
            background: rgba(255, 255, 255, 0.18);
            border: 1px solid rgba(255, 255, 255, 0.42);
            box-shadow: 0 14px 28px rgba(0, 0, 0, 0.26);
            display: grid;
            place-items: center;
            overflow: hidden;
        }

        .brand-badge img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }

        .brand-text {
            display: flex;
            flex-direction: column;
            gap: 4px;
        }

        .brand-title {
            font-family: 'Anton', sans-serif;
            font-size: clamp(1.4rem, 4vw, 1.85rem);
            letter-spacing: 0.08em;
        }

        .brand-subtitle {
            font-size: 0.95rem;
            color: rgba(255, 255, 255, 0.82);
        }

        .header-actions {
            display: inline-flex;
            align-items: center;
            gap: 12px;
        }

        .action-btn {
            width: 46px;
            height: 46px;
            border-radius: 16px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-size: 1.3rem;
            color: #ffffff;
            background: rgba(255, 255, 255, 0.18);
            border: 1px solid rgba(255, 255, 255, 0.28);
            transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
        }

        .action-btn:hover,
        .action-btn:focus-visible,
        .action-btn.is-active {
            background: rgba(243, 115, 30, 0.9);
            box-shadow: 0 16px 30px rgba(243, 115, 30, 0.36);
            transform: translateY(-2px);
        }

        .page-shell {
            width: min(1100px, 92vw);
            margin: clamp(28px, 7vw, 48px) auto clamp(36px, 8vw, 72px);
            display: grid;
            gap: clamp(20px, 5vw, 28px);
        }

        h1, h2, h3 {
            margin: 0;
            font-family: 'Anton', sans-serif;
            letter-spacing: 0.06em;
            color: var(--emerald);
        }

        .glass-card {
            background: var(--glass-bg);
            border-radius: 22px;
            border: 1px solid var(--glass-border);
            box-shadow: 0 26px 48px rgba(15, 106, 83, 0.12);
            backdrop-filter: blur(20px);
            padding: clamp(20px, 4vw, 28px);
            display: grid;
            gap: 16px;
        }

        .welcome-card {
            display: grid;
            gap: 12px;
        }

        .welcome-card p {
            margin: 0;
            color: var(--muted);
            font-size: 1rem;
        }

        .welcome-meta {
            display: flex;
            flex-wrap: wrap;
            gap: 12px;
        }

        .meta-pill {
            padding: 10px 18px;
            border-radius: 999px;
            background: rgba(0, 77, 64, 0.12);
            color: var(--emerald);
            font-weight: 600;
            font-size: 0.9rem;
        }

        .section-head,
        .section-title {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            flex-wrap: wrap;
        }

        .btn-orange {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 10px 18px;
            border-radius: 14px;
            font-weight: 600;
            letter-spacing: 0.02em;
            background: linear-gradient(135deg, #f3731e, #ff9448);
            color: #ffffff;
            transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .btn-orange:hover,
        .btn-orange:focus-visible {
            transform: translateY(-2px);
            box-shadow: 0 16px 30px rgba(243, 115, 30, 0.32);
        }

        #recentSavedGrid {
            display: grid;
            gap: 16px;
            grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
        }

        .mini-saved-card {
            background: rgba(0, 77, 64, 0.05);
            border-radius: 18px;
            padding: 14px;
            display: grid;
            gap: 10px;
            transition: transform 0.2s ease, box-shadow 0.2s ease;
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
            color: rgba(17, 17, 17, 0.82);
        }

        .mini-saved-card span {
            font-size: 0.9rem;
            color: rgba(17, 17, 17, 0.62);
        }

        .mini-saved-card:hover {
            transform: translateY(-3px);
            box-shadow: 0 18px 28px rgba(0, 0, 0, 0.12);
        }

        .empty-state {
            padding: 18px;
            border-radius: 16px;
            background: rgba(0, 77, 64, 0.08);
            color: rgba(0, 77, 64, 0.78);
            font-weight: 600;
            text-align: center;
        }

        #recentChatsList {
            display: grid;
            gap: 14px;
        }

        .mini-card {
            display: grid;
            grid-template-columns: auto 1fr;
            gap: 16px;
            align-items: center;
            padding: 16px;
            border-radius: 18px;
            background: rgba(255, 255, 255, 0.72);
            border: 1px solid rgba(0, 77, 64, 0.12);
            box-shadow: 0 14px 30px rgba(0, 0, 0, 0.08);
            cursor: pointer;
            transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .mini-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 20px 34px rgba(0, 0, 0, 0.14);
        }

        .mini-card .meta {
            display: grid;
            gap: 6px;
        }

        .mini-card strong {
            font-size: 1rem;
            color: var(--emerald);
        }

        .mini-card span {
            font-size: 0.9rem;
            color: var(--muted);
        }

        .mini-card span:last-child {
            font-size: 0.78rem;
            color: rgba(17, 17, 17, 0.5);
            font-weight: 500;
        }

        .shortcut-grid {
            display: grid;
            gap: 16px;
            grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
        }

        .shortcut {
            position: relative;
            display: flex;
            align-items: center;
            gap: 18px;
            padding: 18px 20px;
            border-radius: 20px;
            background: rgba(255, 255, 255, 0.86);
            border: 1px solid rgba(0, 77, 64, 0.1);
            box-shadow: 0 20px 36px rgba(15, 106, 83, 0.12);
            transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .shortcut:hover {
            transform: translateY(-3px);
            box-shadow: 0 24px 42px rgba(15, 106, 83, 0.18);
        }

        .shortcut-icon {
            width: 52px;
            height: 52px;
            border-radius: 16px;
            background: rgba(243, 115, 30, 0.16);
            color: var(--orange);
            display: grid;
            place-items: center;
            font-size: 1.5rem;
        }

        .shortcut-text {
            display: flex;
            flex-direction: column;
            gap: 6px;
        }

        .shortcut-text strong {
            font-size: 1rem;
            color: rgba(17, 17, 17, 0.9);
        }

        .shortcut-text span {
            font-size: 0.9rem;
            color: var(--muted);
        }

        .shortcut i:last-child {
            margin-left: auto;
            font-size: 1.3rem;
            color: rgba(0, 77, 64, 0.5);
        }

        .badge {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 8px 14px;
            border-radius: 999px;
            font-size: 0.85rem;
            font-weight: 600;
            background: rgba(0, 77, 64, 0.1);
            color: var(--emerald);
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
            z-index: 90;
        }

        .toast.is-error {
            background: rgba(217, 48, 37, 0.9);
        }

        .toast.is-visible {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
        }

        @media (max-width: 780px) {
            .header-shell {
                flex-direction: column;
                align-items: stretch;
            }

            .header-actions {
                justify-content: space-between;
            }

            #recentSavedGrid {
                grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
            }
        }

        @media (max-width: 520px) {
            .mini-card {
                grid-template-columns: 1fr;
                text-align: left;
            }

            .shortcut {
                align-items: flex-start;
            }

            .shortcut i:last-child {
                position: absolute;
                right: 18px;
                top: 18px;
            }
        }
    </style>
</head>
<body data-buyer-id="<?= htmlspecialchars((string)$buyerId) ?>" data-buyer-uid="<?= htmlspecialchars($buyerUid) ?>" data-buyer-name="<?= htmlspecialchars($buyerName) ?>">
    <header class="buyer-header">
        <div class="header-shell">
            <a class="brand" href="index.html" aria-label="YUSTAM home">
                <span class="brand-badge">
                    <img src="logo.jpeg" alt="YUSTAM logo">
                </span>
                <span class="brand-text">
                    <span class="brand-title">Hi, <?= htmlspecialchars($firstName) ?></span>
                    <span class="brand-subtitle">Trusted deals tailored for you</span>
                </span>
            </a>
            <nav class="header-actions" aria-label="Buyer navigation">
                <a class="action-btn is-active" href="buyer-dashboard.php" title="Dashboard" aria-label="Dashboard">
                    <i class="ri-home-5-line" aria-hidden="true"></i>
                </a>
                <a class="action-btn" href="buyer-saved.php" title="Saved items" aria-label="Saved items">
                    <i class="ri-heart-3-line" aria-hidden="true"></i>
                </a>
                <a class="action-btn" href="buyer-chats.php" title="Chats" aria-label="Chats">
                    <i class="ri-message-3-line" aria-hidden="true"></i>
                </a>
                <a class="action-btn" href="buyer-logout.php" title="Logout" aria-label="Logout">
                    <i class="ri-logout-box-r-line" aria-hidden="true"></i>
                </a>
            </nav>
        </div>
    </header>

    <main class="page-shell" id="buyerDashboard" data-buyer-id="<?= htmlspecialchars((string)$buyerId) ?>" data-buyer-uid="<?= htmlspecialchars($buyerUid) ?>">
        <section class="glass-card welcome-card">
            <h1>Welcome back, <?= htmlspecialchars($firstName) ?>!</h1>
            <p>Curate your favourites, manage conversations, and shop trusted vendors across Nigeria.</p>
            <div class="welcome-meta">
                <span class="meta-pill">Member since <?= htmlspecialchars($joined) ?></span>
                <span class="meta-pill">Buyer ID #<?= htmlspecialchars($buyerIdentifier) ?></span>
            </div>
        </section>

        <section class="glass-card recent-saved">
            <div class="section-head">
                <h2>Recently saved</h2>
                <a class="btn-orange" href="buyer-saved.php">
                    <i class="ri-heart-3-fill" aria-hidden="true"></i>
                    View all
                </a>
            </div>
            <div id="recentSavedGrid" aria-live="polite"></div>
            <div class="empty-state" id="recentSavedEmpty" role="status" hidden>You haven't saved any listings yet.</div>
        </section>

        <section class="glass-card">
            <div class="section-title">
                <h2>Recent conversations</h2>
                <a class="badge" href="buyer-chats.php">
                    <i class="ri-message-3-line" aria-hidden="true"></i>
                    Open chats
                </a>
            </div>
            <div id="recentChatsList" aria-live="polite"></div>
            <div class="empty-state" id="chatsEmptyState" role="status" style="display:none;">Start chatting with vendors from a product page.</div>
        </section>

        <section class="shortcut-grid">
            <a href="buyer-chats.php" class="shortcut" aria-label="View all messages">
                <div class="shortcut-icon">
                    <i class="ri-message-2-line" aria-hidden="true"></i>
                </div>
                <div class="shortcut-text">
                    <strong>View all messages</strong>
                    <span>Continue conversations with trusted vendors.</span>
                </div>
                <i class="ri-arrow-right-up-line" aria-hidden="true"></i>
            </a>
            <a href="buyer-saved.php" class="shortcut" aria-label="View saved listings">
                <div class="shortcut-icon">
                    <i class="ri-heart-3-line" aria-hidden="true"></i>
                </div>
                <div class="shortcut-text">
                    <strong>View saved listings</strong>
                    <span>Compare favourites and secure the best deals.</span>
                </div>
                <i class="ri-arrow-right-up-line" aria-hidden="true"></i>
            </a>
        </section>
    </main>

    <div class="toast" id="buyerToast" role="status" aria-live="polite"></div>
  <script src="theme-manager.js" defer></script>
<script type="module" src="buyer-dashboard.js"></script>
</body>
</html>














