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

        .saved-grid {
            display: grid;
            gap: clamp(18px, 3vw, 28px);
            grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
        }

        .saved-card {
            background: var(--glass);
            border-radius: 20px;
            border: 1px solid rgba(255, 255, 255, 0.6);
            box-shadow: 0 16px 28px rgba(0, 0, 0, 0.12);
            backdrop-filter: blur(18px);
            overflow: hidden;
            display: grid;
            gap: 16px;
            padding: 18px;
        }

        .saved-card img {
            width: 100%;
            height: 180px;
            object-fit: cover;
            border-radius: 16px;
        }

        .saved-card h3 {
            margin: 0;
            font-size: 1.05rem;
            color: rgba(17, 17, 17, 0.9);
        }

        .saved-card .price {
            font-weight: 600;
            color: var(--emerald);
            font-size: 0.95rem;
        }

        .saved-card .actions {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
        }

        .saved-card .btn {
            flex: 1;
            padding: 10px 16px;
            border-radius: 14px;
            border: none;
            font-weight: 600;
            background: linear-gradient(135deg, rgba(243, 115, 30, 0.95), rgba(255, 138, 60, 0.95));
            color: #fff;
            text-align: center;
            transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .saved-card .btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 18px 32px rgba(243, 115, 30, 0.3);
        }

        .remove-btn {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            border: none;
            background: rgba(255, 255, 255, 0.85);
            border-radius: 14px;
            padding: 10px 14px;
            font-weight: 600;
            color: rgba(217, 48, 37, 0.88);
            cursor: pointer;
            transition: background 0.2s ease, transform 0.2s ease;
        }

        .remove-btn:hover {
            background: rgba(217, 48, 37, 0.14);
            transform: translateY(-2px);
        }

        .empty-state {
            padding: 28px;
            border-radius: 20px;
            background: rgba(255, 255, 255, 0.8);
            border: 1px dashed rgba(0, 77, 64, 0.28);
            text-align: center;
            font-weight: 600;
            color: rgba(0, 77, 64, 0.76);
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
        <section class="saved-grid" id="savedGrid" aria-live="polite"></section>
        <div class="empty-state" id="emptyState" role="status" hidden>You haven’t saved any listings yet.</div>
    </main>
  <script src="theme-manager.js" defer></script>
<script type="module" src="buyer-saved.js"></script>
</body>
</html>




