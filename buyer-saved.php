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
$buyerName = $buyer['name'] ?? ($_SESSION['buyer_name'] ?? 'Buyer');

$firstName = trim((string)$buyerName);
if ($firstName === '') {
    $firstName = 'Buyer';
} else {
    $firstName = explode(' ', $firstName)[0] ?? 'Buyer';
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Saved Listings | YUSTAM Buyer</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Anton&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/remixicon@3.5.0/fonts/remixicon.css">
        <style>
        :root {
            --emerald: #004d40;
            --emerald-soft: rgba(0, 77, 64, 0.82);
            --orange: #f3731e;
            --beige: #eadccf;
            --glass-bg: rgba(255, 255, 255, 0.88);
            --glass-border: rgba(255, 255, 255, 0.6);
            --ink: rgba(17, 17, 17, 0.88);
            --muted: rgba(17, 17, 17, 0.64);
        }

        * {
            box-sizing: border-box;
        }

        body {
            margin: 0;
            min-height: 100vh;
            font-family: 'Inter', system-ui, sans-serif;
            background:
                radial-gradient(circle at top right, rgba(0, 77, 64, 0.16), transparent 55%),
                radial-gradient(circle at bottom left, rgba(243, 115, 30, 0.18), transparent 60%),
                linear-gradient(165deg, rgba(234, 220, 207, 0.94), rgba(255, 255, 255, 0.92));
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

        .buyer-header {
            position: sticky;
            top: 0;
            z-index: 70;
            backdrop-filter: blur(18px);
            background: rgba(0, 77, 64, 0.94);
            color: #ffffff;
            border-bottom: 2px solid rgba(243, 115, 30, 0.32);
            box-shadow: 0 20px 36px rgba(0, 0, 0, 0.22);
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
            font-family: 'Anton', sans-serif;
            letter-spacing: 0.08em;
            color: #ffffff;
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
            color: rgba(255, 255, 255, 0.8);
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
            background: rgba(243, 115, 30, 0.92);
            box-shadow: 0 16px 30px rgba(243, 115, 30, 0.36);
            transform: translateY(-2px);
        }

        .page-shell {
            width: min(1100px, 92vw);
            margin: clamp(28px, 6vw, 48px) auto clamp(40px, 8vw, 72px);
            display: grid;
            gap: clamp(24px, 5vw, 32px);
        }

        h1, h2, h3 {
            margin: 0;
            font-family: 'Anton', sans-serif;
            letter-spacing: 0.06em;
            color: var(--emerald);
        }

        .glass-card {
            background: var(--glass-bg);
            border-radius: 24px;
            border: 1px solid var(--glass-border);
            box-shadow: 0 26px 48px rgba(15, 106, 83, 0.12);
            backdrop-filter: blur(18px);
            padding: clamp(22px, 5vw, 30px);
            display: grid;
            gap: 18px;
        }

        .intro-card {
            display: grid;
            gap: 14px;
        }

        .intro-card p {
            margin: 0;
            color: var(--muted);
            font-size: 1rem;
        }

        .meta-chips {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
        }

        .meta-chip {
            padding: 9px 16px;
            border-radius: 999px;
            background: rgba(0, 77, 64, 0.12);
            color: var(--emerald);
            font-weight: 600;
            font-size: 0.9rem;
        }

        .section-head {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            flex-wrap: wrap;
        }

        .section-head p {
            margin: 0;
            color: var(--muted);
            font-size: 0.95rem;
        }

        .saved-grid {
            display: grid;
            gap: clamp(18px, 3vw, 28px);
            grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
        }

        .saved-card {
            background: rgba(255, 255, 255, 0.92);
            border-radius: 22px;
            border: 1px solid rgba(0, 77, 64, 0.12);
            box-shadow: 0 20px 40px rgba(15, 106, 83, 0.12);
            display: grid;
            gap: 16px;
            padding: 18px;
            transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .saved-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 26px 46px rgba(15, 106, 83, 0.18);
        }

        .saved-card img {
            width: 100%;
            height: 180px;
            object-fit: cover;
            border-radius: 18px;
        }

        .saved-card h3 {
            margin: 0;
            font-size: 1.05rem;
            color: rgba(17, 17, 17, 0.9);
        }

        .saved-card .price {
            margin: 0;
            font-weight: 600;
            color: var(--emerald);
            font-size: 0.98rem;
        }

        .actions {
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .btn {
            flex: 1;
            padding: 12px 16px;
            border-radius: 16px;
            border: none;
            font-weight: 600;
            letter-spacing: 0.02em;
            text-align: center;
            background: linear-gradient(135deg, #f3731e, #ff9448);
            color: #ffffff;
            transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .btn:hover,
        .btn:focus-visible {
            transform: translateY(-2px);
            box-shadow: 0 20px 34px rgba(243, 115, 30, 0.28);
        }

        .remove-btn {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 11px 16px;
            border-radius: 16px;
            border: 1px solid rgba(217, 48, 37, 0.18);
            background: rgba(217, 48, 37, 0.08);
            color: rgba(176, 0, 32, 0.88);
            font-weight: 600;
            cursor: pointer;
            transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
        }

        .remove-btn:hover,
        .remove-btn:focus-visible {
            background: rgba(217, 48, 37, 0.16);
            transform: translateY(-2px);
            box-shadow: 0 16px 30px rgba(176, 0, 32, 0.22);
        }

        .empty-state {
            padding: 28px;
            border-radius: 22px;
            background: rgba(0, 77, 64, 0.08);
            border: 1px dashed rgba(0, 77, 64, 0.26);
            text-align: center;
            font-weight: 600;
            color: rgba(0, 77, 64, 0.78);
        }

        .support-link {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            color: var(--orange);
            font-weight: 600;
        }

        @media (max-width: 720px) {
            .header-shell {
                flex-direction: column;
                align-items: stretch;
            }

            .header-actions {
                justify-content: space-between;
            }

            .saved-grid {
                grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
            }
        }

        @media (max-width: 520px) {
            .saved-card {
                padding: 16px;
            }

            .saved-card img {
                height: 160px;
            }

            .actions {
                flex-direction: column;
                align-items: stretch;
            }

            .remove-btn {
                width: 100%;
                justify-content: center;
            }
        }
    </style>
</head>
<body data-buyer-id="<?= htmlspecialchars((string)$buyerId) ?>" data-buyer-name="<?= htmlspecialchars($buyerName) ?>">
    <header class="buyer-header">
        <div class="header-shell">
            <a class="brand" href="buyer-dashboard.php" aria-label="Back to dashboard">
                <span class="brand-badge">
                    <img src="logo.jpeg" alt="YUSTAM logo">
                </span>
                <span class="brand-text">
                    <span class="brand-title">Saved listings</span>
                    <span class="brand-subtitle">Hello <?= htmlspecialchars($firstName) ?>, your favourites live here.</span>
                </span>
            </a>
            <nav class="header-actions" aria-label="Buyer navigation">
                <a class="action-btn" href="buyer-dashboard.php" title="Dashboard" aria-label="Dashboard">
                    <i class="ri-home-5-line" aria-hidden="true"></i>
                </a>
                <a class="action-btn is-active" href="buyer-saved.php" title="Saved items" aria-label="Saved items">
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

    <main class="page-shell" id="buyerSaved" data-buyer-id="<?= htmlspecialchars((string)$buyerId) ?>">
        <section class="glass-card intro-card">
            <h1>Curate and compare</h1>
            <p>Track your favourite listings and jump back in when you're ready to buy.</p>
            <div class="meta-chips">
                <span class="meta-chip">Buyer ID #<?= htmlspecialchars((string)$buyerId) ?></span>
                <span class="meta-chip">Signed in as <?= htmlspecialchars($firstName) ?></span>
            </div>
        </section>

        <section class="glass-card">
            <div class="section-head">
                <h2>Your saved listings</h2>
                <p>Tap a card to view details or remove items you no longer need.</p>
            </div>
            <div class="saved-grid" id="savedGrid" aria-live="polite"></div>
            <div class="empty-state" id="emptyState" role="status" hidden>You haven't saved any listings yet. Start exploring the marketplace to bookmark your top picks.</div>
        </section>

    </main>
  <script src="theme-manager.js" defer></script>
<script type="module" src="buyer-saved.js"></script>
</body>
</html>







