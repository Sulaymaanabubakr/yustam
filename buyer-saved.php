<?php
ini_set('session.save_path', '/home2/yustamco/tmp');
session_start();

require_once __DIR__ . '/buyer-storage.php';

if (!isset($_SESSION['buyer_id'])) {
    header('Location: buyer-login.php');
    exit;
}

$buyerId = (int)$_SESSION['buyer_id'];
$buyer = yustam_buyers_find($buyerId);
$buyerName = $buyer['name'] ?? ($_SESSION['buyer_name'] ?? 'Buyer');
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
    <style>
        :root {
            --emerald: #004D40;
            --orange: #F3731E;
            --beige: #EADCCF;
            --glass: rgba(255, 255, 255, 0.78);
            --muted: rgba(17, 17, 17, 0.68);
        }

        * { box-sizing: border-box; }

        body {
            margin: 0;
            min-height: 100vh;
            font-family: 'Inter', system-ui, sans-serif;
            background: linear-gradient(180deg, rgba(234, 220, 207, 0.95), rgba(255, 255, 255, 0.9));
            color: rgba(17, 17, 17, 0.85);
            display: flex;
            flex-direction: column;
        }

        header {
            position: sticky;
            top: 0;
            z-index: 40;
            padding: clamp(18px, 5vw, 32px);
            display: flex;
            align-items: center;
            justify-content: space-between;
            background: linear-gradient(120deg, rgba(0, 77, 64, 0.98), rgba(0, 77, 64, 0.85));
            color: #fff;
            border-bottom: 2px solid rgba(243, 115, 30, 0.4);
            box-shadow: 0 16px 32px rgba(0, 0, 0, 0.22);
        }

        .header-brand {
            display: flex;
            align-items: center;
            gap: 14px;
            text-decoration: none;
            color: inherit;
        }

        .header-brand strong {
            font-family: 'Anton', sans-serif;
            letter-spacing: 0.08em;
            font-size: clamp(1.4rem, 4vw, 2rem);
        }

        .header-actions {
            display: inline-flex;
            gap: 12px;
        }

        .header-actions a {
            width: 44px;
            height: 44px;
            border-radius: 14px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            background: rgba(255, 255, 255, 0.14);
            transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
            font-size: 1.15rem;
        }

        .header-actions a:hover,
        .header-actions a:focus-visible {
            transform: translateY(-2px);
            background: rgba(243, 115, 30, 0.75);
            box-shadow: 0 14px 26px rgba(243, 115, 30, 0.35);
        }

        main {
            flex: 1;
            padding: clamp(24px, 6vw, 56px);
            display: grid;
            gap: 24px;
        }

        h1 {
            margin: 0;
            font-family: 'Anton', sans-serif;
            letter-spacing: 0.06em;
            color: var(--emerald);
            font-size: clamp(1.6rem, 4vw, 2.2rem);
        }

        .grid {
            display: grid;
            gap: clamp(18px, 3vw, 28px);
            grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
        }

        .listing-card {
            background: var(--glass);
            border-radius: 18px;
            border: 1px solid rgba(255, 255, 255, 0.6);
            box-shadow: 0 12px 24px rgba(0, 0, 0, 0.12);
            backdrop-filter: blur(16px);
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }

        .listing-card img {
            width: 100%;
            aspect-ratio: 4 / 3;
            object-fit: cover;
        }

        .listing-body {
            padding: 16px 18px 20px;
            display: grid;
            gap: 12px;
        }

        .listing-body h2 {
            margin: 0;
            font-size: 1.05rem;
            color: rgba(17, 17, 17, 0.88);
        }

        .listing-body span {
            font-size: 0.9rem;
            color: var(--muted);
        }

        .listing-actions {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
        }

        .view-button {
            flex: 1;
            padding: 12px 16px;
            border-radius: 16px;
            border: none;
            font-weight: 600;
            letter-spacing: 0.02em;
            background: linear-gradient(135deg, #F3731E, #FF8A3D);
            color: #fff;
            cursor: pointer;
            transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .view-button:hover {
            transform: translateY(-1px);
            box-shadow: 0 16px 26px rgba(243, 115, 30, 0.28);
        }

        .save-toggle {
            width: 44px;
            height: 44px;
            border-radius: 50%;
            border: none;
            background: rgba(255, 255, 255, 0.85);
            box-shadow: 0 8px 20px rgba(0, 0, 0, 0.1);
            font-size: 1.2rem;
            cursor: pointer;
            transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
        }

        .save-toggle.is-active {
            background: rgba(243, 115, 30, 0.92);
            color: #fff;
        }

        .save-toggle:hover {
            transform: translateY(-2px);
        }

        .empty-state {
            padding: 24px;
            border-radius: 18px;
            background: rgba(255, 255, 255, 0.78);
            border: 1px dashed rgba(0, 77, 64, 0.28);
            text-align: center;
            font-weight: 600;
            color: rgba(0, 77, 64, 0.72);
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

        @media (max-width: 600px) {
            header {
                flex-direction: column;
                align-items: stretch;
                gap: 16px;
            }

            .header-actions {
                justify-content: space-between;
            }
        }
    </style>
</head>
<body data-buyer-id="<?= htmlspecialchars((string)$buyerId) ?>" data-buyer-name="<?= htmlspecialchars($buyerName) ?>">
    <header>
        <a href="buyer-dashboard.php" class="header-brand">
            <div style="width:46px;height:46px;border-radius:16px;background:rgba(255,255,255,0.16);display:grid;place-items:center;font-family:'Anton',sans-serif;letter-spacing:0.04em;font-size:1.1rem;">YU</div>
            <div>
                <strong>Saved listings</strong>
                <p style="margin:4px 0 0;font-size:0.9rem;color:rgba(255,255,255,0.78);">Curate favourites for quick access.</p>
            </div>
        </a>
        <nav class="header-actions" aria-label="Saved navigation">
            <a href="buyer-dashboard.php" title="Home">🏠</a>
            <a href="buyer-chats.php" title="Chats">💬</a>
            <a href="buyer-logout.php" title="Logout">🔐</a>
        </nav>
    </header>

    <main id="buyerSaved" data-buyer-id="<?= htmlspecialchars((string)$buyerId) ?>">
        <div style="display:flex;flex-direction:column;gap:8px;">
            <h1>Hello <?= htmlspecialchars(explode(' ', $buyerName)[0] ?? $buyerName) ?>,</h1>
            <p style="margin:0;font-size:1rem;color:var(--muted);">Here are the listings you’ve bookmarked.</p>
        </div>
        <section class="grid" id="savedGrid" aria-live="polite"></section>
        <div class="empty-state" id="savedEmpty" role="status" style="display:none;">No saved items yet. Explore products to save them for later!</div>
    </main>

    <div class="toast" id="savedToast" role="status" aria-live="polite"></div>

    <script type="module" src="buyer-saved.js"></script>
</body>
</html>
