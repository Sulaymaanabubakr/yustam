<?php
require_once __DIR__ . '/session-path.php';
session_start();

$buyerUid = isset($_SESSION['buyer_uid']) ? trim((string) $_SESSION['buyer_uid']) : '';
$buyerName = isset($_SESSION['buyer_name']) ? trim((string) $_SESSION['buyer_name']) : 'Buyer';
$buyerAvatar = isset($_SESSION['buyer_avatar']) ? trim((string) $_SESSION['buyer_avatar']) : '';

if ($buyerUid === '' && isset($_SESSION['buyer_id'])) {
    $buyerUid = trim((string) $_SESSION['buyer_id']);
}

if ($buyerUid === '') {
    http_response_code(302);
    header('Location: buyer-login.php');
    exit;
}

$chatContext = [
    'role' => 'buyer',
    'buyer_uid' => $buyerUid,
    'buyer_name' => $buyerName,
];
?>
<!DOCTYPE html>
<html lang="en" data-page="buyer-chats">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Messages | YUSTAM Marketplace</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <link href="https://cdn.jsdelivr.net/npm/remixicon@4.2.0/fonts/remixicon.css" rel="stylesheet">
    <style>
        :root {
            color-scheme: light;
            --buyer-bg: linear-gradient(180deg, #f8f2ea 0%, #ffffff 100%);
            --buyer-card: rgba(255, 255, 255, 0.82);
            --buyer-border: rgba(29, 78, 67, 0.18);
            --buyer-accent: #047857;
            --buyer-accent-soft: rgba(6, 95, 70, 0.08);
            --buyer-text: #1f2937;
            --buyer-subtle: rgba(17, 24, 39, 0.68);
            --buyer-glass: rgba(255, 255, 255, 0.65);
            --buyer-shadow: 0 24px 40px rgba(15, 23, 42, 0.12);
            --buyer-chip-bg: rgba(16, 185, 129, 0.12);
            --buyer-chip-text: #047857;
        }

        * {
            box-sizing: border-box;
        }

        body {
            margin: 0;
            min-height: 100vh;
            font-family: 'Inter', system-ui, sans-serif;
            background: var(--buyer-bg);
            color: var(--buyer-text);
            padding: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);
        }

        header {
            display: flex;
            flex-direction: column;
            gap: 18px;
            padding: 32px clamp(16px, 7vw, 120px) 12px;
        }

        .header-top {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 16px;
        }

        h1 {
            margin: 0;
            font-size: clamp(1.8rem, 4vw, 2.6rem);
            font-weight: 700;
            letter-spacing: -0.02em;
        }

        .subtitle {
            margin: 0;
            font-size: 0.95rem;
            color: var(--buyer-subtle);
        }

        .search-bar {
            position: relative;
            background: var(--buyer-glass);
            border: 1px solid var(--buyer-border);
            border-radius: 20px;
            padding: 12px 20px;
            display: flex;
            align-items: center;
            gap: 12px;
            box-shadow: var(--buyer-shadow);
            backdrop-filter: blur(14px);
        }

        .search-bar input {
            border: none;
            outline: none;
            flex: 1;
            font-size: 1rem;
            background: transparent;
            color: inherit;
        }

        main {
            padding: 0 clamp(16px, 7vw, 120px) 80px;
        }

        .chat-list {
            display: grid;
            gap: 16px;
        }

        .chat-card {
            display: grid;
            grid-template-columns: auto 1fr auto;
            gap: 16px;
            align-items: center;
            padding: 18px;
            border-radius: 24px;
            background: var(--buyer-card);
            border: 1px solid var(--buyer-border);
            backdrop-filter: blur(18px);
            box-shadow: var(--buyer-shadow);
            cursor: pointer;
            text-decoration: none;
            color: inherit;
            transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .chat-card:hover,
        .chat-card:focus-visible {
            transform: translateY(-3px);
            box-shadow: 0 30px 45px rgba(15, 23, 42, 0.18);
        }

        .chat-card:focus-visible {
            outline: 2px solid rgba(16, 185, 129, 0.6);
            outline-offset: 4px;
        }

        .chat-avatar {
            position: relative;
            width: 64px;
            height: 64px;
            border-radius: 22px;
            overflow: hidden;
            background: linear-gradient(135deg, rgba(6, 95, 70, 0.92), rgba(59, 130, 246, 0.42));
            display: grid;
            place-items: center;
            color: #f9fafb;
            font-weight: 600;
            font-size: 1.2rem;
        }

        .chat-avatar img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }

        .chat-info {
            display: flex;
            flex-direction: column;
            gap: 6px;
        }

        .chat-info h2 {
            margin: 0;
            font-size: 1.05rem;
            font-weight: 600;
        }

        .chat-info .listing {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 0.86rem;
            color: var(--buyer-subtle);
        }

        .chat-info .last-message {
            font-size: 0.94rem;
            color: rgba(17, 24, 39, 0.72);
            overflow: hidden;
            text-overflow: ellipsis;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            max-width: clamp(200px, 40vw, 520px);
        }

        .chat-meta {
            display: flex;
            align-items: flex-end;
            flex-direction: column;
            gap: 10px;
            font-size: 0.85rem;
            color: rgba(17, 24, 39, 0.6);
        }

        .chat-meta .typing {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 4px 10px;
            border-radius: 999px;
            background: var(--buyer-chip-bg);
            color: var(--buyer-chip-text);
            font-size: 0.78rem;
            font-weight: 600;
        }

        .chat-meta .unread {
            min-width: 32px;
            padding: 4px 10px;
            border-radius: 999px;
            background: var(--buyer-accent);
            color: white;
            font-weight: 600;
            text-align: center;
        }

        .typing-dots {
            display: inline-flex;
            gap: 4px;
        }

        .typing-dots span {
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background: var(--buyer-accent);
            opacity: 0.4;
            animation: typingBounce 1s infinite;
        }

        .typing-dots span:nth-child(2) {
            animation-delay: 0.16s;
        }

        .typing-dots span:nth-child(3) {
            animation-delay: 0.32s;
        }

        .chat-thumbnail {
            position: relative;
            width: 64px;
            height: 64px;
            border-radius: 18px;
            overflow: hidden;
            box-shadow: inset 0 0 0 1px rgba(6, 95, 70, 0.12);
        }

        .chat-thumbnail img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }

        .chat-card .chat-thumbnail {
            grid-column: 1;
            grid-row: 1 / span 3;
            order: -1;
        }

        .empty-state {
            margin-top: 48px;
            padding: 56px 24px;
            border-radius: 30px;
            background: rgba(255, 255, 255, 0.68);
            border: 1px dashed var(--buyer-border);
            text-align: center;
            display: grid;
            gap: 12px;
            justify-items: center;
            color: var(--buyer-subtle);
        }

        .empty-state h2 {
            margin: 0;
            font-weight: 600;
            color: var(--buyer-text);
        }

        .loader {
            display: grid;
            place-items: center;
            padding: 48px 0;
        }

        .spinner {
            width: 32px;
            height: 32px;
            border-radius: 50%;
            border: 3px solid rgba(5, 150, 105, 0.18);
            border-top-color: var(--buyer-accent);
            animation: spin 1s linear infinite;
        }

        @keyframes spin {
            to {
                transform: rotate(360deg);
            }
        }

        @keyframes typingBounce {
            0%, 80%, 100% {
                transform: translateY(0);
                opacity: 0.3;
            }
            40% {
                transform: translateY(-4px);
                opacity: 1;
            }
        }

        @media (max-width: 720px) {
            header {
                padding: 24px 18px 12px;
            }

            main {
                padding: 0 18px 120px;
            }

            .chat-card {
                grid-template-columns: auto 1fr;
            }

            .chat-card .chat-thumbnail {
                display: none;
            }
        }

        .chat-toast-root {
            position: fixed;
            bottom: clamp(16px, 4vw, 32px);
            left: 50%;
            transform: translateX(-50%);
            display: flex;
            flex-direction: column;
            gap: 12px;
            z-index: 9999;
            pointer-events: none;
        }

        .chat-toast {
            background: rgba(17, 24, 39, 0.82);
            color: white;
            padding: 12px 20px;
            border-radius: 999px;
            opacity: 0;
            transform: translateY(12px);
            transition: opacity 0.26s ease, transform 0.26s ease;
            pointer-events: auto;
        }

        .chat-toast.is-visible {
            opacity: 1;
            transform: translateY(0);
        }
    </style>
</head>
<body data-buyer-uid="<?= htmlspecialchars($buyerUid, ENT_QUOTES, 'UTF-8'); ?>">
<header>
    <div class="header-top">
        <div>
            <h1>Messages</h1>
            <p class="subtitle">Conversations with your vendors</p>
        </div>
        <div class="chat-avatar" aria-hidden="true">
            <?php if ($buyerAvatar !== ''): ?>
                <img src="<?= htmlspecialchars($buyerAvatar, ENT_QUOTES, 'UTF-8'); ?>" alt="<?= htmlspecialchars($buyerName, ENT_QUOTES, 'UTF-8'); ?>">
            <?php else: ?>
                <?= htmlspecialchars(substr($buyerName, 0, 2) ?: 'BY', ENT_QUOTES, 'UTF-8'); ?>
            <?php endif; ?>
        </div>
    </div>
    <label class="search-bar" for="chat-search">
        <i class="ri-search-line" aria-hidden="true"></i>
        <input id="chat-search" type="search" placeholder="Search vendors or listings" autocomplete="off">
    </label>
</header>
<main>
    <section class="chat-list" id="chat-list" role="list"></section>
    <div class="loader" id="chat-loader" hidden>
        <div class="spinner" role="status" aria-label="Loading chats"></div>
    </div>
    <div class="empty-state" id="chat-empty" hidden>
        <span style="font-size:2rem">💬</span>
        <h2>No messages yet</h2>
        <p>Start a conversation from a product page to connect with vendors.</p>
    </div>
    <div class="loader" id="chat-error" hidden>
        <p role="alert">Unable to load chats. <button type="button" id="chat-retry">Retry</button></p>
    </div>
</main>
<script>
    window.__CHAT_CONTEXT__ = <?= json_encode($chatContext, JSON_UNESCAPED_SLASHES); ?>;
</script>
<script type="module" src="./buyer-chats.js"></script>
</body>
</html>
