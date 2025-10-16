<?php
require_once __DIR__ . '/session-path.php';
session_start();

$buyerNumericId = isset($_SESSION['buyer_id']) ? (string) $_SESSION['buyer_id'] : '';
$buyerUid = isset($_SESSION['buyer_uid']) ? (string) $_SESSION['buyer_uid'] : '';
$buyerName = $_SESSION['buyer_name'] ?? 'Buyer';
$buyerIdentifier = $buyerUid !== '' ? $buyerUid : $buyerNumericId;
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Messages | YUSTAM Buyer</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Anton&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <link href="https://cdn.jsdelivr.net/npm/remixicon@4.2.0/fonts/remixicon.css" rel="stylesheet">
    <style>
        :root {
            --emerald: #004D40;
            --emerald-soft: rgba(0, 77, 64, 0.88);
            --orange: #F3731E;
            --beige: #F6E9DD;
            --glass: rgba(255, 255, 255, 0.78);
            --muted: rgba(17, 17, 17, 0.64);
        }

        * {
            box-sizing: border-box;
        }

        body {
            margin: 0;
            font-family: 'Inter', system-ui, sans-serif;
            background: radial-gradient(circle at top left, rgba(222, 245, 237, 0.92), rgba(255, 255, 255, 0.95));
            min-height: 100vh;
            color: rgba(17, 17, 17, 0.88);
            display: flex;
            flex-direction: column;
        }

        .page-header {
            position: sticky;
            top: 0;
            z-index: 40;
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: clamp(16px, 4vw, 26px);
            background: linear-gradient(135deg, rgba(0, 77, 64, 0.96), rgba(0, 128, 109, 0.83));
            color: #fff;
            backdrop-filter: blur(14px);
            border-bottom: 2px solid rgba(0, 173, 137, 0.36);
            box-shadow: 0 16px 32px rgba(0, 77, 64, 0.28);
        }

        .header-copy {
            display: flex;
            flex-direction: column;
            gap: 4px;
            text-align: center;
        }

        .page-header h1 {
            margin: 0;
            font-family: 'Anton', sans-serif;
            font-size: clamp(1.6rem, 5vw, 2.4rem);
            letter-spacing: 0.1em;
            text-transform: uppercase;
        }

        .header-subtitle {
            margin: 0;
            font-size: 0.82rem;
            letter-spacing: 0.18em;
            text-transform: uppercase;
            color: rgba(255, 255, 255, 0.78);
        }

        .header-action {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 42px;
            height: 42px;
            border-radius: 14px;
            color: #fff;
            text-decoration: none;
            background: rgba(255, 255, 255, 0.12);
            box-shadow: 0 12px 24px rgba(0, 0, 0, 0.2);
            transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
        }

        .header-action:hover,
        .header-action:focus-visible {
            outline: none;
            background: rgba(243, 115, 30, 0.8);
            box-shadow: 0 18px 34px rgba(243, 115, 30, 0.35);
            transform: translateY(-2px);
        }

        main {
            flex: 1;
            display: flex;
            flex-direction: column;
            gap: 16px;
            padding: 20px clamp(16px, 6vw, 56px) 28px;
            background: linear-gradient(180deg, rgba(237, 250, 246, 0.65), rgba(255, 255, 255, 0.96));
        }

        .search-wrapper {
            position: relative;
            display: flex;
            align-items: center;
            background: rgba(255, 255, 255, 0.85);
            border-radius: 18px;
            box-shadow: inset 0 0 0 1px rgba(0, 128, 109, 0.12);
            padding: 0 18px;
            min-height: 52px;
            backdrop-filter: blur(16px);
            transition: box-shadow 0.2s ease, transform 0.2s ease;
        }

        .search-wrapper:hover {
            box-shadow: inset 0 0 0 2px rgba(0, 128, 109, 0.18);
            transform: translateY(-1px);
        }

        .search-wrapper i {
            color: rgba(0, 128, 109, 0.7);
            font-size: 1.3rem;
        }

        #chatSearch {
            flex: 1;
            margin-left: 12px;
            border: none;
            background: transparent;
            font-size: 1rem;
            color: rgba(17, 17, 17, 0.86);
            font-family: inherit;
            outline: none;
        }

        .search-wrapper:focus-within {
            box-shadow: inset 0 0 0 2px rgba(243, 115, 30, 0.6), 0 12px 28px rgba(0, 0, 0, 0.12);
        }

        .chat-scroll {
            flex: 1;
            display: flex;
            flex-direction: column;
            gap: 18px;
            overflow-y: auto;
            padding-bottom: 32px;
        }

        .chat-grid {
            display: grid;
            gap: 12px;
            grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
        }

        .chat-card {
            position: relative;
            display: grid;
            grid-template-columns: auto 1fr;
            align-items: center;
            gap: 12px;
            padding: 14px 16px;
            border-radius: 14px;
            background: rgba(255, 255, 255, 0.82);
            border: 1px solid rgba(0, 77, 64, 0.08);
            box-shadow: 0 12px 20px rgba(0, 0, 0, 0.08);
            transition: transform 0.2s ease, box-shadow 0.2s ease;
            opacity: 0;
            transform: translateY(12px);
            animation: card-enter 0.28s ease forwards;
        }

        .chat-card:hover,
        .chat-card:focus-visible {
            outline: none;
            transform: translateY(-2px);
            box-shadow: 0 12px 22px rgba(243, 115, 30, 0.18);
        }

        .chat-card.is-unread strong,
        .chat-card.is-unread .last-message {
            font-weight: 600;
            color: rgba(17, 17, 17, 0.92);
        }

        .avatar {
            width: 44px;
            height: 44px;
            border-radius: 12px;
            display: grid;
            place-items: center;
            background: linear-gradient(140deg, rgba(0, 77, 64, 0.92), rgba(0, 120, 90, 0.78));
            color: #fff;
            font-weight: 700;
            font-size: 1rem;
            overflow: hidden;
        }

        .avatar img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }

        .chat-info {
            display: grid;
            gap: 6px;
        }

        .chat-top {
            display: flex;
            align-items: baseline;
            justify-content: space-between;
            gap: 8px;
        }

        .chat-labels {
            display: inline-flex;
            align-items: center;
            gap: 6px;
        }

        .role-pill {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            padding: 4px 10px;
            border-radius: 999px;
            background: rgba(0, 128, 109, 0.16);
            color: rgba(0, 77, 64, 0.88);
            font-size: 0.62rem;
            font-weight: 700;
            letter-spacing: 0.12em;
            text-transform: uppercase;
        }

        .chat-name {
            font-size: 0.98rem;
            letter-spacing: 0.01em;
            color: rgba(17, 17, 17, 0.9);
        }

        .chat-time {
            font-size: 0.75rem;
            color: rgba(17, 17, 17, 0.52);
            white-space: nowrap;
        }

        .chat-bottom {
            display: flex;
            align-items: center;
            gap: 6px;
            color: rgba(17, 17, 17, 0.64);
            font-size: 0.85rem;
        }

        .last-message {
            flex: 1;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            min-width: 0;
        }

        .chat-product {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 0.75rem;
            color: rgba(17, 17, 17, 0.52);
        }

        .chat-product i {
            color: rgba(243, 115, 30, 0.7);
        }

        .meta {
            display: none;
        }

        .tick i {
            font-size: 0.95rem;
        }

        .unread-dot {
            position: absolute;
            top: 12px;
            right: 12px;
            width: 10px;
            height: 10px;
            border-radius: 50%;
            background: var(--orange);
            box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.85);
        }

        .chat-loader {
            display: grid;
            gap: 12px;
            margin-bottom: 18px;
        }

        .chat-loader-item {
            display: grid;
            grid-template-columns: auto 1fr;
            gap: 12px;
            padding: 14px 16px;
            border-radius: 14px;
            background: rgba(255, 255, 255, 0.6);
            overflow: hidden;
        }

        .chat-loader .avatar-skeleton {
            width: 44px;
            height: 44px;
            border-radius: 12px;
            background: rgba(234, 220, 207, 0.7);
        }

        .chat-loader .line {
            height: 10px;
            border-radius: 999px;
            background: rgba(0, 0, 0, 0.08);
            animation: pulse 1.3s ease-in-out infinite;
        }

        .loader-lines {
            display: grid;
            gap: 8px;
        }

        .chat-loader .line.short {
            width: 40%;
        }

        .chat-loader .line.long {
            width: 70%;
        }

        @keyframes pulse {
            0%, 100% { opacity: 0.45; }
            50% { opacity: 0.85; }
        }

        .empty-state {
            margin: 8vh auto;
            width: min(320px, 90%);
            text-align: center;
            background: rgba(255, 255, 255, 0.86);
            border-radius: 24px;
            padding: 36px 28px;
            box-shadow: 0 24px 46px rgba(0, 0, 0, 0.12);
            backdrop-filter: blur(18px);
            color: rgba(17, 17, 17, 0.7);
            display: grid;
            gap: 12px;
            justify-items: center;
        }

        .empty-state span {
            font-size: 2.8rem;
        }

        .empty-state h2 {
            margin: 0;
            font-family: 'Anton', sans-serif;
            font-size: 1.6rem;
            letter-spacing: 0.05em;
            color: var(--emerald);
        }

        footer {
            padding: 24px;
            text-align: center;
            font-size: 0.82rem;
            color: rgba(17, 17, 17, 0.54);
        }

        @keyframes card-enter {
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        @media (min-width: 720px) {
            .chat-grid {
                grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            }
        }
    </style>
</head>
<body>
    <header class="page-header">
        <a class="header-action" href="shop.html" aria-label="Back to dashboard">
            <i class="ri-arrow-left-line"></i>
        </a>
        <div class="header-copy">
            <h1>Buyer Inbox</h1>
            <p class="header-subtitle">Chat with marketplace vendors</p>
        </div>
        <a class="header-action" href="index.html" aria-label="Go to homepage">
            <i class="ri-home-3-line"></i>
        </a>
    </header>
    <main
        id="buyerChatPage"
        data-user-id="<?= htmlspecialchars($buyerIdentifier, ENT_QUOTES, 'UTF-8'); ?>"
        data-user-numeric-id="<?= htmlspecialchars($buyerNumericId, ENT_QUOTES, 'UTF-8'); ?>"
        data-user-name="<?= htmlspecialchars($buyerName, ENT_QUOTES, 'UTF-8'); ?>">
        <div class="search-wrapper">
            <i class="ri-search-line" aria-hidden="true"></i>
            <input type="search" id="chatSearch" placeholder="Search vendor chats" autocomplete="off" aria-label="Search vendor conversations">
        </div>
        <div id="chatScrollArea" class="chat-scroll">
            <div id="chatLoader" class="chat-loader" aria-hidden="true">
                <div class="chat-loader-item">
                    <div class="avatar-skeleton"></div>
                    <div class="loader-lines">
                        <div class="line long"></div>
                        <div class="line short"></div>
                    </div>
                </div>
                <div class="chat-loader-item">
                    <div class="avatar-skeleton"></div>
                    <div class="loader-lines">
                        <div class="line long"></div>
                        <div class="line short"></div>
                    </div>
                </div>
                <div class="chat-loader-item">
                    <div class="avatar-skeleton"></div>
                    <div class="loader-lines">
                        <div class="line long"></div>
                        <div class="line short"></div>
                    </div>
                </div>
            </div>
            <section id="chatList" class="chat-grid" aria-live="polite"></section>
        </div>
    </main>
    <footer>© <?= date('Y'); ?> YUSTAM Marketplace</footer>
  <script src="theme-manager.js" defer></script>
  <script src="buyer-chats.js" defer></script>
</body>
</html>





