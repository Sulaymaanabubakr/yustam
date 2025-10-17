<?php
require_once __DIR__ . '/session-path.php';
session_start();

require_once __DIR__ . '/buyer-storage.php';

if (!isset($_SESSION['buyer_id'])) {
    header('Location: buyer-login.php');
    exit;
}

$buyerId = (int)($_SESSION['buyer_id'] ?? 0);
$buyer = yustam_buyers_find($buyerId);
$buyer = yustam_buyers_ensure_uid($buyer ?? []);

if (!$buyer) {
    session_destroy();
    header('Location: buyer-login.php');
    exit;
}

$buyerName = trim((string)($buyer['name'] ?? ($_SESSION['buyer_name'] ?? 'Buyer')));
if ($buyerName === '') {
    $buyerName = 'Buyer';
}
$_SESSION['buyer_name'] = $buyerName;

$buyerUid = trim((string)($buyer['buyer_uid'] ?? ($_SESSION['buyer_uid'] ?? '')));
if ($buyerUid === '') {
    $buyerUid = sprintf('YUSTAM-BYR-%04d', (int)($buyer['id'] ?? $buyerId));
}
$_SESSION['buyer_uid'] = $buyerUid;

$buyerAvatar = trim((string)($buyer['avatar'] ?? $buyer['profile_photo'] ?? ''));
$chatBootstrap = [
    'role' => 'buyer',
    'buyer' => [
        'uid' => $buyerUid,
        'name' => $buyerName,
        'avatar' => $buyerAvatar,
    ],
];
$chatBootstrapJson = json_encode($chatBootstrap, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
?>
<!DOCTYPE html>
<html lang="en" data-theme="buyer-chat">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
    <title>Messages | YUSTAM Marketplace</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/remixicon@4.2.0/fonts/remixicon.css">
    <style>
        :root {
            color-scheme: light;
            --emerald: #00564b;
            --emerald-soft: rgba(0, 86, 75, 0.4);
            --emerald-glass: rgba(0, 86, 75, 0.15);
            --orange: #f3731e;
            --beige: #f6efe6;
            --beige-glass: rgba(246, 239, 230, 0.92);
            --ink: rgba(9, 20, 16, 0.86);
            --muted: rgba(9, 20, 16, 0.58);
            --line: rgba(255, 255, 255, 0.35);
            --bubble: rgba(255, 255, 255, 0.64);
            --glass-border: rgba(255, 255, 255, 0.42);
        }

        * {
            box-sizing: border-box;
        }

        body {
            margin: 0;
            font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
            background: linear-gradient(160deg, rgba(246, 239, 230, 0.92), rgba(255, 255, 255, 0.66));
            min-height: 100vh;
            padding: env(safe-area-inset-top, 16px) env(safe-area-inset-right, 16px) env(safe-area-inset-bottom, 16px) env(safe-area-inset-left, 16px);
            display: flex;
            flex-direction: column;
            color: var(--ink);
        }

        header {
            position: sticky;
            top: 0;
            z-index: 12;
            backdrop-filter: blur(16px);
            background: var(--beige-glass);
            border-radius: 24px;
            padding: 18px 22px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            box-shadow: 0 24px 48px rgba(0, 0, 0, 0.08);
            margin-bottom: 16px;
        }

        header h1 {
            font-size: 1.25rem;
            font-weight: 700;
            margin: 0;
        }

        header span {
            color: var(--muted);
            font-size: 0.9rem;
        }

        .chat-grid {
            flex: 1;
            display: flex;
            flex-direction: column;
            gap: 12px;
        }

        .chat-card {
            display: grid;
            grid-template-columns: auto 1fr auto;
            gap: 14px;
            align-items: center;
            padding: 14px 18px;
            border-radius: 22px;
            background: rgba(255, 255, 255, 0.78);
            border: 1px solid var(--glass-border);
            backdrop-filter: blur(14px);
            cursor: pointer;
            transition: transform 180ms ease, box-shadow 180ms ease;
        }

        .chat-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 16px 32px rgba(0, 0, 0, 0.08);
        }

        .chat-avatar {
            width: 54px;
            height: 54px;
            border-radius: 18px;
            overflow: hidden;
            position: relative;
            background: linear-gradient(135deg, rgba(243, 115, 30, 0.12), rgba(0, 86, 75, 0.12));
        }

        .chat-avatar img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            display: block;
        }

        .chat-content {
            display: flex;
            flex-direction: column;
            gap: 4px;
            min-width: 0;
        }

        .chat-content strong {
            font-size: 1rem;
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 8px;
            color: var(--ink);
        }

        .chat-content small {
            font-size: 0.84rem;
            color: var(--muted);
            display: flex;
            align-items: center;
            gap: 6px;
        }

        .chat-meta {
            display: flex;
            flex-direction: column;
            align-items: flex-end;
            gap: 6px;
        }

        .badge {
            background: linear-gradient(135deg, rgba(0, 86, 75, 0.85), rgba(0, 86, 75, 0.72));
            color: #fff;
            font-weight: 600;
            font-size: 0.75rem;
            padding: 4px 10px;
            border-radius: 999px;
            box-shadow: 0 12px 24px rgba(0, 86, 75, 0.25);
        }

        .typing-indicator {
            color: var(--orange);
            font-weight: 600;
            font-size: 0.8rem;
            display: inline-flex;
            align-items: center;
            gap: 4px;
        }

        .chat-list-empty {
            margin: auto;
            text-align: center;
            padding: 48px 32px;
            background: rgba(255, 255, 255, 0.72);
            border-radius: 28px;
            border: 1px dashed rgba(0, 86, 75, 0.25);
            backdrop-filter: blur(12px);
        }

        .fab {
            position: fixed;
            right: 20px;
            bottom: calc(20px + env(safe-area-inset-bottom, 0px));
            width: 60px;
            height: 60px;
            border-radius: 50%;
            background: linear-gradient(135deg, var(--orange), #ff8a3c);
            box-shadow: 0 24px 38px rgba(243, 115, 30, 0.35);
            display: inline-flex;
            align-items: center;
            justify-content: center;
            color: #fff;
            font-size: 1.6rem;
            cursor: pointer;
            border: none;
            z-index: 20;
        }

        .yustam-toast-root {
            position: fixed;
            inset: auto 50% 24px auto;
            translate: 50% 0;
            display: flex;
            flex-direction: column;
            gap: 10px;
            z-index: 4000;
        }

        .yustam-toast {
            background: rgba(0, 86, 75, 0.9);
            color: #fff;
            padding: 14px 18px;
            border-radius: 18px;
            min-width: 240px;
            transform: translateY(16px);
            opacity: 0;
            transition: transform 220ms ease, opacity 220ms ease;
            box-shadow: 0 18px 36px rgba(0, 0, 0, 0.25);
        }

        .yustam-toast.is-visible {
            transform: translateY(0);
            opacity: 1;
        }

        @media (min-width: 768px) {
            body {
                max-width: 680px;
                margin: 0 auto;
            }
        }
    </style>
</head>
<body>
<header>
    <div>
        <h1>Chats</h1>
        <span><?= htmlspecialchars($buyerName, ENT_QUOTES, 'UTF-8'); ?></span>
    </div>
    <button class="fab" id="newChatBtn" aria-label="Start a new chat">
        <i class="ri-message-3-line"></i>
    </button>
</header>
<main class="chat-grid" id="chatList" role="list"></main>
<div class="chat-list-empty" id="emptyState" hidden>
    <h2>No conversations yet</h2>
    <p>When you chat with a vendor, messages will appear here instantly.</p>
</div>
<script>
    window.__CHAT_BOOTSTRAP__ = <?= $chatBootstrapJson ?: 'null'; ?>;
</script>
<script type="module" src="./buyer-chats.js"></script>
</body>
</html>
