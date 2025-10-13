<?php
ini_set('session.save_path', '/home2/yustamco/tmp');
session_start();

$buyerId = $_SESSION['buyer_id'] ?? '';
$buyerName = $_SESSION['buyer_name'] ?? 'Buyer';
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
            --orange: #F3731E;
            --beige: #EADCCF;
            --glass: rgba(255, 255, 255, 0.75);
            --shadow: 0 18px 38px rgba(17, 17, 17, 0.16);
        }

        * {
            box-sizing: border-box;
        }

        body {
            margin: 0;
            font-family: 'Inter', system-ui, sans-serif;
            background: radial-gradient(circle at top, rgba(234, 220, 207, 0.78), rgba(255, 255, 255, 0.88));
            min-height: 100vh;
            color: rgba(17, 17, 17, 0.9);
            display: flex;
            flex-direction: column;
        }

        header {
            background: rgba(0, 77, 64, 0.95);
            color: white;
            padding: 16px clamp(16px, 6vw, 40px);
            display: flex;
            flex-direction: column;
            gap: 4px;
            border-bottom: 3px solid rgba(243, 115, 30, 0.55);
            box-shadow: 0 12px 26px rgba(0, 0, 0, 0.22);
            position: sticky;
            top: 0;
            z-index: 50;
        }

        header h1 {
            font-family: 'Anton', sans-serif;
            letter-spacing: 0.06em;
            font-size: clamp(1.65rem, 4vw, 2.2rem);
            margin: 0;
        }

        header span {
            font-size: 0.9rem;
            opacity: 0.82;
        }

        main {
            flex: 1;
            padding: 24px clamp(16px, 5vw, 48px);
            display: flex;
            flex-direction: column;
            gap: 18px;
        }

        .chat-card {
            display: grid;
            grid-template-columns: auto 1fr auto;
            gap: 14px;
            align-items: center;
            padding: 16px 18px;
            border-radius: 20px;
            background: var(--glass);
            backdrop-filter: blur(12px);
            box-shadow: 0 16px 28px rgba(0, 0, 0, 0.12);
            border: 1px solid rgba(255, 255, 255, 0.4);
            transition: transform 0.25s ease, box-shadow 0.25s ease;
            cursor: pointer;
        }

        .chat-card:hover {
            transform: translateY(-4px);
            box-shadow: var(--shadow);
        }

        .avatar {
            width: 52px;
            height: 52px;
            border-radius: 50%;
            display: grid;
            place-items: center;
            font-weight: 700;
            font-size: 1.2rem;
            color: white;
            background: linear-gradient(135deg, rgba(0, 77, 64, 0.95), rgba(0, 128, 96, 0.85));
            box-shadow: 0 12px 24px rgba(0, 0, 0, 0.14);
        }

        .chat-info {
            display: grid;
            gap: 6px;
        }

        .chat-info strong {
            font-size: 1.02rem;
            letter-spacing: 0.02em;
        }

        .chat-info span {
            display: flex;
            gap: 8px;
            align-items: center;
            font-size: 0.9rem;
            color: rgba(17, 17, 17, 0.66);
        }

        .last-message {
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            max-width: clamp(140px, 40vw, 280px);
        }

        .meta {
            display: grid;
            gap: 10px;
            justify-items: flex-end;
            font-size: 0.82rem;
            color: rgba(17, 17, 17, 0.65);
        }

        .meta img {
            width: 48px;
            height: 48px;
            border-radius: 16px;
            object-fit: cover;
            border: 2px solid rgba(243, 115, 30, 0.5);
        }

        .empty-state {
            margin: 10vh auto;
            max-width: 360px;
            text-align: center;
            padding: 32px 28px;
            border-radius: 22px;
            background: rgba(255, 255, 255, 0.78);
            backdrop-filter: blur(14px);
            box-shadow: 0 16px 30px rgba(0, 0, 0, 0.12);
        }

        .empty-state i {
            font-size: 2.6rem;
            color: rgba(0, 77, 64, 0.8);
        }

        .empty-state h2 {
            font-family: 'Anton', sans-serif;
            letter-spacing: 0.04em;
            color: var(--emerald);
            margin-bottom: 10px;
        }

        .empty-state p {
            color: rgba(17, 17, 17, 0.65);
            line-height: 1.6;
        }

        footer {
            padding: 24px;
            text-align: center;
            color: rgba(17, 17, 17, 0.6);
            font-size: 0.82rem;
        }

        @media (min-width: 640px) {
            .chat-card {
                grid-template-columns: auto 1fr auto;
            }
        }
    </style>
</head>
<body>
    <header>
        <h1>Messages</h1>
        <span>Welcome back, <?= htmlspecialchars($buyerName, ENT_QUOTES, 'UTF-8'); ?></span>
    </header>
    <main id="buyerChatList" data-user-id="<?= htmlspecialchars($buyerId, ENT_QUOTES, 'UTF-8'); ?>">
        <section id="chatList" aria-live="polite" class="chat-list" style="display:grid; gap:18px;"></section>
        <aside id="emptyState" class="empty-state" hidden>
            <i class="ri-chat-smile-2-line" aria-hidden="true"></i>
            <h2>No chats yet</h2>
            <p>Start a conversation with a vendor to see your messages here. Explore listings and ask sellers anything.</p>
        </aside>
    </main>
    <footer>© <?= date('Y'); ?> YUSTAM Marketplace</footer>
    <script type="module" src="firebase.js"></script>
    <script type="module" src="buyer-chats.js"></script>
</body>
</html>
