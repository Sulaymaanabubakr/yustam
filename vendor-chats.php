<?php
ini_set('session.save_path', '/home2/yustamco/tmp');
session_start();

$vendorId = $_SESSION['vendor_id'] ?? '';
$vendorName = $_SESSION['vendor_name'] ?? 'Vendor';
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Messages | YUSTAM Vendor</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Anton&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <link href="https://cdn.jsdelivr.net/npm/remixicon@4.2.0/fonts/remixicon.css" rel="stylesheet">
    <style>
        :root {
            --emerald: #004D40;
            --orange: #F3731E;
            --beige: #EADCCF;
            --glass: rgba(255, 255, 255, 0.78);
        }

        * { box-sizing: border-box; }

        body {
            margin: 0;
            font-family: 'Inter', system-ui, sans-serif;
            background: linear-gradient(160deg, rgba(234, 220, 207, 0.8), rgba(255, 255, 255, 0.92));
            min-height: 100vh;
            color: rgba(17, 17, 17, 0.9);
            display: flex;
            flex-direction: column;
        }

        header {
            background: rgba(0, 77, 64, 0.95);
            color: #fff;
            padding: 18px clamp(18px, 6vw, 42px);
            border-bottom: 3px solid rgba(243, 115, 30, 0.5);
            box-shadow: 0 14px 28px rgba(0, 0, 0, 0.25);
            position: sticky;
            top: 0;
            z-index: 40;
        }

        header h1 {
            font-family: 'Anton', sans-serif;
            letter-spacing: 0.05em;
            margin: 0;
            font-size: clamp(1.6rem, 4vw, 2.3rem);
        }

        header span {
            font-size: 0.9rem;
            opacity: 0.82;
        }

        main {
            flex: 1;
            padding: 26px clamp(16px, 5vw, 48px);
            display: grid;
            gap: 20px;
        }

        .chat-card {
            display: grid;
            grid-template-columns: auto 1fr auto;
            align-items: center;
            gap: 14px;
            padding: 18px 20px;
            background: var(--glass);
            border-radius: 20px;
            border: 1px solid rgba(255, 255, 255, 0.45);
            box-shadow: 0 16px 30px rgba(0, 0, 0, 0.16);
            backdrop-filter: blur(14px);
            cursor: pointer;
            transition: transform 0.25s ease, box-shadow 0.25s ease;
        }

        .chat-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 22px 34px rgba(0, 0, 0, 0.18);
        }

        .avatar {
            width: 52px;
            height: 52px;
            border-radius: 50%;
            background: linear-gradient(135deg, rgba(243, 115, 30, 0.95), rgba(255, 138, 60, 0.85));
            color: #fff;
            font-weight: 700;
            display: grid;
            place-items: center;
            font-size: 1.2rem;
        }

        .chat-info {
            display: grid;
            gap: 6px;
        }

        .chat-info strong {
            font-size: 1.04rem;
            letter-spacing: 0.02em;
        }

        .chat-info span {
            display: flex;
            gap: 8px;
            align-items: center;
            font-size: 0.9rem;
            color: rgba(17, 17, 17, 0.68);
        }

        .last-message {
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            max-width: clamp(160px, 38vw, 320px);
        }

        .meta {
            display: grid;
            gap: 10px;
            justify-items: flex-end;
            font-size: 0.82rem;
            color: rgba(17, 17, 17, 0.6);
        }

        .meta img {
            width: 48px;
            height: 48px;
            border-radius: 16px;
            object-fit: cover;
            border: 2px solid rgba(243, 115, 30, 0.45);
        }

        .empty-state {
            margin: 12vh auto;
            max-width: 360px;
            text-align: center;
            background: rgba(255, 255, 255, 0.8);
            border-radius: 22px;
            padding: 34px 26px;
            box-shadow: 0 18px 32px rgba(0, 0, 0, 0.14);
            backdrop-filter: blur(16px);
        }

        .empty-state i {
            font-size: 2.8rem;
            color: rgba(0, 77, 64, 0.8);
        }

        .empty-state h2 {
            font-family: 'Anton', sans-serif;
            color: var(--emerald);
            margin-bottom: 12px;
        }

        .empty-state p {
            color: rgba(17, 17, 17, 0.68);
            line-height: 1.6;
        }

        footer {
            padding: 24px;
            text-align: center;
            color: rgba(17, 17, 17, 0.6);
            font-size: 0.82rem;
        }
    </style>
</head>
<body>
    <header>
        <h1>Messages</h1>
        <span>Conversations with your buyers, <?= htmlspecialchars($vendorName, ENT_QUOTES, 'UTF-8'); ?></span>
    </header>
    <main id="vendorChatList" data-user-id="<?= htmlspecialchars($vendorId, ENT_QUOTES, 'UTF-8'); ?>">
        <section id="vendorChatContainer" style="display:grid; gap:20px;" aria-live="polite"></section>
        <aside id="vendorEmptyState" class="empty-state" hidden>
            <i class="ri-customer-service-2-line" aria-hidden="true"></i>
            <h2>No conversations yet</h2>
            <p>Once buyers reach out about your listings, their messages will appear here for quick follow-up.</p>
        </aside>
    </main>
    <footer>© <?= date('Y'); ?> YUSTAM Marketplace</footer>
    <script type="module" src="firebase.js"></script>
    <script type="module" src="vendor-chats.js"></script>
</body>
</html>
