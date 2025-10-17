<?php
require_once __DIR__ . '/session-path.php';
require_once __DIR__ . '/buyer-storage.php';
session_start();

$buyerUid = isset($_SESSION['buyer_uid']) ? trim((string) $_SESSION['buyer_uid']) : '';
$buyerName = isset($_SESSION['buyer_name']) ? trim((string) $_SESSION['buyer_name']) : 'Buyer';
$buyerAvatar = isset($_SESSION['buyer_avatar']) ? trim((string) $_SESSION['buyer_avatar']) : '';
$buyerId = isset($_SESSION['buyer_id']) ? (int) $_SESSION['buyer_id'] : 0;

if ($buyerUid === '' && $buyerId > 0) {
    try {
        $buyer = yustam_buyers_find($buyerId);
    } catch (Throwable $exception) {
        error_log('[buyer-chats] Unable to load buyer: ' . $exception->getMessage());
        $buyer = null;
    }

    if (is_array($buyer) && !empty($buyer)) {
        $buyer = yustam_buyers_ensure_uid($buyer);
        if (!empty($buyer['buyer_uid'])) {
            $buyerUid = (string) $buyer['buyer_uid'];
            $_SESSION['buyer_uid'] = $buyerUid;
        }
        if (array_key_exists('name', $buyer)) {
            $normalizedName = trim((string) $buyer['name']);
            if ($normalizedName !== '') {
                $buyerName = $normalizedName;
                $_SESSION['buyer_name'] = $buyerName;
            }
        }
    } else {
        session_destroy();
        http_response_code(302);
        header('Location: buyer-login.php');
        exit;
    }
}

if ($buyerUid === '') {
    session_destroy();
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
            font-synthesis: none;
        }

        *, *::before, *::after {
            box-sizing: border-box;
        }

        body {
            margin: 0;
            min-height: 100vh;
            font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
            background: var(--page-bg, linear-gradient(160deg, #e3f6ef 0%, #fbfefc 70%));
            color: var(--text-primary, #0f172a);
            display: flex;
            justify-content: center;
            align-items: center;
            padding: clamp(18px, 4vw, 38px);
        }

        body.chat-index {
            --accent: #047857;
            --accent-strong: #0f766e;
            --accent-soft: rgba(4, 120, 87, 0.12);
            --page-bg: linear-gradient(170deg, rgba(4, 120, 87, 0.08) 0%, rgba(255, 255, 255, 0.9) 100%);
            --surface: rgba(255, 255, 255, 0.92);
            --surface-alt: rgba(4, 120, 87, 0.08);
            --surface-strong: rgba(255, 255, 255, 0.75);
            --text-primary: #0f172a;
            --text-secondary: rgba(15, 23, 42, 0.7);
            --divider: rgba(15, 23, 42, 0.06);
            --badge-bg: #047857;
            --badge-text: #f0fdf4;
            --time-color: rgba(15, 23, 42, 0.55);
            --shadow-soft: 0 26px 60px rgba(4, 120, 87, 0.18);
        }

        body.chat-index--buyer {
            --page-bg: radial-gradient(circle at top left, rgba(4, 120, 87, 0.08), transparent 65%), linear-gradient(170deg, #f3fdf9 0%, #ffffff 70%);
        }

        body.chat-index--vendor {
            --accent: #14b8a6;
            --accent-strong: #0f766e;
            --accent-soft: rgba(20, 184, 166, 0.18);
            --page-bg: radial-gradient(circle at 80% 10%, rgba(15, 118, 110, 0.25), transparent 55%), linear-gradient(160deg, #03131a 0%, #0a2129 60%);
            --surface: rgba(12, 26, 34, 0.88);
            --surface-alt: rgba(4, 120, 87, 0.22);
            --surface-strong: rgba(12, 24, 30, 0.82);
            --text-primary: #e2f1f0;
            --text-secondary: rgba(226, 241, 240, 0.7);
            --divider: rgba(148, 210, 203, 0.2);
            --badge-bg: #38d39f;
            --badge-text: #03221d;
            --time-color: rgba(178, 228, 220, 0.75);
            --shadow-soft: 0 28px 70px rgba(3, 30, 33, 0.55);
        }

        .chat-window {
            width: min(960px, 100%);
            display: grid;
            grid-template-rows: auto auto 1fr;
            background: var(--surface);
            border-radius: 28px;
            overflow: hidden;
            border: 1px solid rgba(255, 255, 255, 0.16);
            box-shadow: var(--shadow-soft);
            backdrop-filter: blur(16px);
        }

        .chat-header {
            background: linear-gradient(135deg, rgba(4, 120, 87, 0.92), rgba(14, 165, 120, 0.78));
            color: #f0fdf4;
            padding: 24px clamp(20px, 5vw, 36px) 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 18px;
        }

        body.chat-index--vendor .chat-header {
            background: linear-gradient(135deg, rgba(20, 184, 166, 0.9), rgba(14, 165, 233, 0.8));
            color: #e6fffb;
        }

        body.chat-index--vendor .chat-header__titles p {
            color: rgba(230, 255, 251, 0.86);
        }

        .chat-header__titles h1 {
            margin: 0;
            font-size: clamp(1.4rem, 3vw, 1.95rem);
            font-weight: 700;
            letter-spacing: -0.01em;
        }

        .chat-header__titles p {
            margin: 6px 0 0;
            color: rgba(240, 253, 244, 0.88);
            font-size: 0.94rem;
        }

        .chat-header__actions {
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .chat-avatar {
            width: 54px;
            height: 54px;
            border-radius: 18px;
            background: rgba(255, 255, 255, 0.22);
            border: 1px solid rgba(255, 255, 255, 0.35);
            display: grid;
            place-items: center;
            font-weight: 600;
            letter-spacing: 0.02em;
            color: inherit;
            overflow: hidden;
        }

        .chat-avatar img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }

        .chat-tools {
            padding: 18px clamp(18px, 4vw, 32px);
            background: var(--surface-strong);
            display: flex;
            flex-direction: column;
            gap: 12px;
            border-bottom: 1px solid var(--divider);
        }

        .chat-search {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 12px 16px;
            background: rgba(255, 255, 255, 0.18);
            border-radius: 18px;
            border: 1px solid rgba(15, 23, 42, 0.05);
            box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.2);
        }

        body.chat-index--vendor .chat-search {
            background: rgba(4, 120, 87, 0.18);
            border-color: rgba(20, 184, 166, 0.28);
        }

        .chat-search i {
            font-size: 1.05rem;
            color: var(--accent);
        }

        .chat-search input {
            border: none;
            background: transparent;
            color: var(--text-primary);
            font-size: 1rem;
            width: 100%;
            outline: none;
        }

        .chat-scroll {
            position: relative;
            overflow: hidden;
        }

        .chat-list {
            display: flex;
            flex-direction: column;
        }

        .chat-item {
            display: grid;
            grid-template-columns: auto 1fr auto;
            gap: 14px;
            padding: 18px clamp(20px, 4vw, 28px);
            cursor: pointer;
            transition: background 0.18s ease;
        }

        .chat-item:not(:last-child) {
            border-bottom: 1px solid var(--divider);
        }

        .chat-item:hover,
        .chat-item:focus-visible {
            background: rgba(4, 120, 87, 0.08);
            outline: none;
        }

        .chat-item__avatar {
            width: 52px;
            height: 52px;
            border-radius: 50%;
            background: linear-gradient(135deg, rgba(4, 120, 87, 0.18), rgba(14, 165, 120, 0.22));
            display: grid;
            place-items: center;
            font-weight: 600;
            color: var(--accent);
            overflow: hidden;
        }

        body.chat-index--vendor .chat-item__avatar {
            background: linear-gradient(135deg, rgba(13, 148, 136, 0.3), rgba(56, 189, 248, 0.32));
            color: #d5fffa;
        }

        .chat-item__avatar img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }

        .chat-item__content {
            display: flex;
            flex-direction: column;
            gap: 6px;
            min-width: 0;
        }

        .chat-item__title {
            display: flex;
            align-items: center;
            gap: 6px;
            font-weight: 600;
            font-size: 1rem;
            color: var(--text-primary);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .chat-item__subtitle {
            margin: 0;
            font-size: 0.92rem;
            color: var(--text-secondary);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .chat-item__subtitle .typing-dots {
            color: var(--accent);
        }

        .chat-item__typing {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            color: var(--accent);
            font-weight: 500;
        }

        .typing-dots {
            display: inline-flex;
            gap: 4px;
        }

        .typing-dots span {
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background: currentColor;
            opacity: 0.45;
            animation: typingBounce 1.2s infinite ease-in-out;
        }

        .typing-dots span:nth-child(2) {
            animation-delay: 0.2s;
        }

        .typing-dots span:nth-child(3) {
            animation-delay: 0.4s;
        }

        .chat-item__listing {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 0.85rem;
            color: var(--time-color);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .chat-item__meta {
            display: flex;
            flex-direction: column;
            align-items: flex-end;
            gap: 10px;
            font-size: 0.8rem;
            color: var(--time-color);
        }

        .chat-item__time {
            font-weight: 600;
        }

        .chat-item__badge {
            min-width: 24px;
            padding: 2px 8px;
            border-radius: 999px;
            background: var(--badge-bg);
            color: var(--badge-text);
            font-weight: 600;
            text-align: center;
            font-size: 0.72rem;
        }

        .chat-item__status {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            color: var(--time-color);
            font-size: 0.74rem;
        }

        .chat-item__status i {
            font-size: 0.9rem;
        }

        .chat-placeholder {
            display: none;
            padding: 64px 24px;
            text-align: center;
            color: var(--text-secondary);
        }

        .chat-placeholder[hidden] {
            display: none !important;
        }

        .chat-placeholder.is-visible {
            display: grid;
            place-items: center;
            gap: 12px;
        }

        .chat-placeholder i {
            font-size: 2.4rem;
            color: var(--accent-strong);
        }

        .chat-placeholder h2 {
            margin: 0;
            font-size: 1.12rem;
            color: var(--text-primary);
        }

        .chat-placeholder p {
            margin: 0;
            max-width: 340px;
            font-size: 0.95rem;
        }

        .chat-placeholder button {
            border: none;
            background: var(--accent);
            color: var(--badge-text);
            padding: 8px 18px;
            border-radius: 999px;
            font-weight: 600;
            cursor: pointer;
        }

        .spinner {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            border: 3px solid rgba(4, 120, 87, 0.18);
            border-top-color: var(--accent);
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
            body {
                padding: 0;
                background: var(--surface);
            }

            .chat-window {
                border-radius: 0;
                min-height: 100vh;
            }

            .chat-header {
                padding: 20px 18px 16px;
            }

            .chat-tools {
                padding: 12px 16px;
            }

            .chat-item {
                padding: 16px;
            }
        }
    </style>
</head>
<body class="chat-index chat-index--buyer" data-buyer-uid="<?= htmlspecialchars($buyerUid, ENT_QUOTES, 'UTF-8'); ?>">
<div class="chat-window">
    <header class="chat-header">
        <div class="chat-header__titles">
            <h1>Messages</h1>
            <p>Stay connected with your vendors</p>
        </div>
        <div class="chat-header__actions">
            <div class="chat-avatar" aria-hidden="true">
                <?php if ($buyerAvatar !== ''): ?>
                    <img src="<?= htmlspecialchars($buyerAvatar, ENT_QUOTES, 'UTF-8'); ?>" alt="<?= htmlspecialchars($buyerName, ENT_QUOTES, 'UTF-8'); ?>">
                <?php else: ?>
                    <?= htmlspecialchars(substr($buyerName, 0, 2) ?: 'BY', ENT_QUOTES, 'UTF-8'); ?>
                <?php endif; ?>
            </div>
        </div>
    </header>
    <div class="chat-tools">
        <label class="chat-search" for="chat-search">
            <i class="ri-search-line" aria-hidden="true"></i>
            <input id="chat-search" type="search" placeholder="Search vendors or listings" autocomplete="off">
        </label>
    </div>
    <main class="chat-scroll">
        <section class="chat-list" id="chat-list" role="list"></section>

        <div class="chat-placeholder is-visible" id="chat-loader" hidden>
            <div class="spinner" role="status" aria-label="Loading chats"></div>
        </div>

        <div class="chat-placeholder is-visible" id="chat-empty" hidden>
            <i class="ri-chat-smile-2-line" aria-hidden="true"></i>
            <h2>No messages yet</h2>
            <p>Start a conversation from a product page to connect with vendors.</p>
        </div>

        <div class="chat-placeholder is-visible" id="chat-error" hidden>
            <i class="ri-signal-wifi-error-line" aria-hidden="true"></i>
            <p role="alert">Unable to load chats.</p>
            <button type="button" id="chat-retry">Retry</button>
        </div>
    </main>
</div>
<script>
    window.__CHAT_CONTEXT__ = <?= json_encode($chatContext, JSON_UNESCAPED_SLASHES | JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT); ?>;
</script>
<script type="module" src="./buyer-chats.js"></script>
</body>
</html>
