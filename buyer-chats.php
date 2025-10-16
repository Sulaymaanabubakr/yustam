<?php
require_once __DIR__ . '/session-path.php';
session_start();

$buyerNumericId = isset($_SESSION['buyer_id']) ? trim((string) $_SESSION['buyer_id']) : '';
$buyerUid = isset($_SESSION['buyer_uid']) ? trim((string) $_SESSION['buyer_uid']) : '';
$buyerName = isset($_SESSION['buyer_name']) ? trim((string) $_SESSION['buyer_name']) : 'Buyer';

if ($buyerUid === '' && $buyerNumericId !== '') {
    $buyerUid = $buyerNumericId;
}

$buyerUidParam = isset($_GET['buyerUid']) ? trim((string) $_GET['buyerUid']) : '';
if ($buyerUidParam !== '') {
    $buyerUid = $buyerUidParam;
}
?>
<!DOCTYPE html>
<html lang="en" data-role="buyer">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Your Messages | YUSTAM Buyer</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Anton&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <link href="https://cdn.jsdelivr.net/npm/remixicon@4.2.0/fonts/remixicon.css" rel="stylesheet">
    <style>
        :root {
            --emerald: #004D40;
            --orange: #F3731E;
            --beige: #EADCCF;
            --glass: rgba(255, 255, 255, 0.82);
            --shadow: 0 22px 45px rgba(0, 0, 0, 0.12);
        }

        * {
            box-sizing: border-box;
        }

        body {
            margin: 0;
            min-height: 100vh;
            background: radial-gradient(circle at top, rgba(234, 220, 207, 0.9), rgba(255, 255, 255, 0.9));
            font-family: 'Inter', system-ui, sans-serif;
            color: rgba(17, 17, 17, 0.92);
        }

        header {
            padding: clamp(20px, 6vw, 48px) clamp(16px, 10vw, 120px) clamp(12px, 4vw, 32px);
            display: flex;
            flex-direction: column;
            gap: 24px;
        }

        .page-title {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 16px;
        }

        h1 {
            margin: 0;
            font-family: 'Anton', sans-serif;
            font-size: clamp(2rem, 5vw, 3rem);
            letter-spacing: 0.08em;
        }

        .subtitle {
            margin: 0;
            font-size: 0.94rem;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            color: rgba(0, 77, 64, 0.68);
        }

        .search-bar {
            position: relative;
            display: flex;
            align-items: center;
            padding: 0 20px;
            height: 60px;
            border-radius: 20px;
            background: var(--glass);
            box-shadow: inset 0 0 0 1px rgba(0, 77, 64, 0.18);
            backdrop-filter: blur(18px);
        }

        .search-bar input {
            border: none;
            background: transparent;
            width: 100%;
            font-size: 1rem;
            color: inherit;
            font-family: inherit;
            outline: none;
            padding-left: 12px;
        }

        main {
            padding: 0 clamp(16px, 10vw, 120px) 72px;
        }

        .chat-grid {
            display: grid;
            gap: 18px;
        }

        .chat-card {
            position: relative;
            display: grid;
            grid-template-columns: auto 1fr auto;
            gap: 18px;
            align-items: center;
            padding: 20px;
            border-radius: 24px;
            background: rgba(255, 255, 255, 0.86);
            box-shadow: var(--shadow);
            cursor: pointer;
            transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .chat-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 24px 60px rgba(0, 0, 0, 0.18);
        }

        .chat-card .avatar {
            width: 64px;
            height: 64px;
            border-radius: 20px;
            background: linear-gradient(135deg, rgba(0, 77, 64, 0.92), rgba(0, 128, 108, 0.8));
            color: var(--beige);
            font-weight: 700;
            font-size: 1.4rem;
            display: grid;
            place-items: center;
        }

        .chat-info {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }

        .chat-info h2 {
            margin: 0;
            font-size: 1.1rem;
            font-weight: 600;
        }

        .chat-info p {
            margin: 0;
            color: rgba(17, 17, 17, 0.6);
            font-size: 0.92rem;
        }

        .chat-product {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 0.85rem;
            color: rgba(0, 77, 64, 0.75);
        }

        .chat-meta {
            text-align: right;
            display: flex;
            flex-direction: column;
            gap: 10px;
            font-size: 0.84rem;
        }

        .chat-meta .time {
            color: rgba(0, 0, 0, 0.5);
        }

        .badge {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            min-width: 32px;
            padding: 4px 10px;
            border-radius: 999px;
            background: rgba(243, 115, 30, 0.12);
            color: rgba(243, 115, 30, 0.8);
            font-size: 0.78rem;
            font-weight: 600;
        }

        .empty-state {
            padding: 80px 20px;
            text-align: center;
            background: rgba(255, 255, 255, 0.7);
            border-radius: 28px;
            box-shadow: var(--shadow);
        }

        .empty-state h2 {
            font-family: 'Anton', sans-serif;
            font-size: 1.9rem;
            margin-bottom: 12px;
        }

        .loader {
            display: grid;
            place-items: center;
            padding: 60px 0;
        }

        .loader span {
            width: 32px;
            height: 32px;
            border-radius: 50%;
            border: 3px solid rgba(0, 77, 64, 0.12);
            border-top-color: var(--emerald);
            animation: spin 1s linear infinite;
        }

        @keyframes spin {
            from { transform: rotate(0); }
            to { transform: rotate(360deg); }
        }

        @media (max-width: 768px) {
            header {
                padding-inline: 16px;
            }

            main {
                padding-inline: 16px;
            }

            .chat-card {
                grid-template-columns: auto 1fr;
                grid-template-rows: auto auto;
            }

            .chat-meta {
                grid-column: 1 / -1;
                flex-direction: row;
                justify-content: space-between;
            }
        }
    </style>
</head>
<body data-buyer-uid="<?= htmlspecialchars($buyerUid, ENT_QUOTES, 'UTF-8'); ?>" data-buyer-name="<?= htmlspecialchars($buyerName, ENT_QUOTES, 'UTF-8'); ?>">
    <header>
        <div class="page-title">
            <div>
                <h1>Messages</h1>
                <p class="subtitle">Stay in touch with vendors</p>
            </div>
            <a href="buyer-dashboard.php" class="subtitle" style="text-decoration:none;">Back to dashboard</a>
        </div>
        <div class="search-bar">
            <i class="ri-search-line" aria-hidden="true"></i>
            <input id="chatSearch" type="search" placeholder="Search vendors or listings">
        </div>
    </header>
    <main>
        <div id="chatLoader" class="loader" hidden>
            <span></span>
        </div>
        <section id="chatList" class="chat-grid" aria-live="polite"></section>
        <div id="chatEmpty" class="empty-state" hidden>
            <h2>No conversations yet</h2>
            <p>Find a product you love and tap <strong>Chat with Vendor</strong> to start talking instantly.</p>
        </div>
    </main>

    <script type="module" src="buyer-chats.js"></script>
</body>
</html>
