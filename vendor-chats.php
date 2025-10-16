<?php
require_once __DIR__ . '/session-path.php';
session_start();

$vendorUid = isset($_SESSION['vendor_uid']) ? trim((string) $_SESSION['vendor_uid']) : '';
$vendorName = isset($_SESSION['vendor_name']) ? trim((string) $_SESSION['vendor_name']) : 'Vendor';
$vendorAvatar = isset($_SESSION['vendor_logo']) ? trim((string) $_SESSION['vendor_logo']) : '';

if ($vendorUid === '' && isset($_SESSION['vendor_id'])) {
    $vendorUid = trim((string) $_SESSION['vendor_id']);
}

if ($vendorUid === '') {
    http_response_code(302);
    header('Location: vendor-login.html');
    exit;
}

$chatContext = [
    'role' => 'vendor',
    'vendor_uid' => $vendorUid,
    'vendor_name' => $vendorName,
];
?>
<!DOCTYPE html>
<html lang="en" data-page="vendor-chats">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Inbox | YUSTAM Vendors</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <link href="https://cdn.jsdelivr.net/npm/remixicon@4.2.0/fonts/remixicon.css" rel="stylesheet">
    <style>
        :root {
            color-scheme: dark;
            --vendor-bg: radial-gradient(circle at top left, #0b1720 0%, #020617 70%);
            --vendor-card: rgba(15, 23, 42, 0.72);
            --vendor-border: rgba(45, 212, 191, 0.2);
            --vendor-accent: #10b981;
            --vendor-text: #f8fafc;
            --vendor-muted: rgba(226, 232, 240, 0.66);
            --vendor-shadow: 0 30px 50px rgba(2, 6, 23, 0.6);
            --vendor-chip-bg: rgba(16, 185, 129, 0.24);
            --vendor-chip-text: #6ee7b7;
        }

        * {
            box-sizing: border-box;
        }

        body {
            margin: 0;
            min-height: 100vh;
            font-family: 'Inter', system-ui, sans-serif;
            background: var(--vendor-bg);
            color: var(--vendor-text);
            padding: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);
        }

        header {
            padding: 32px clamp(16px, 7vw, 120px) 12px;
            display: flex;
            flex-direction: column;
            gap: 18px;
        }

        .header-top {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 16px;
        }

        h1 {
            margin: 0;
            font-size: clamp(1.9rem, 4vw, 2.8rem);
            font-weight: 700;
            letter-spacing: -0.015em;
        }

        .subtitle {
            margin: 0;
            font-size: 0.95rem;
            color: var(--vendor-muted);
        }

        .search-bar {
            position: relative;
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 12px 20px;
            border-radius: 20px;
            background: rgba(8, 47, 73, 0.52);
            border: 1px solid rgba(45, 212, 191, 0.2);
            box-shadow: inset 0 0 0 1px rgba(14, 116, 144, 0.18);
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
            background: var(--vendor-card);
            border: 1px solid var(--vendor-border);
            backdrop-filter: blur(18px);
            box-shadow: var(--vendor-shadow);
            cursor: pointer;
            text-decoration: none;
            color: inherit;
            transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .chat-card:hover,
        .chat-card:focus-visible {
            transform: translateY(-3px);
            box-shadow: 0 36px 60px rgba(15, 23, 42, 0.55);
        }

        .chat-card:focus-visible {
            outline: 2px solid rgba(45, 212, 191, 0.6);
            outline-offset: 4px;
        }

        .chat-avatar {
            width: 64px;
            height: 64px;
            border-radius: 22px;
            background: linear-gradient(135deg, rgba(45, 212, 191, 0.32), rgba(14, 116, 144, 0.58));
            display: grid;
            place-items: center;
            font-weight: 600;
            font-size: 1.2rem;
            color: var(--vendor-text);
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
            color: var(--vendor-muted);
        }

        .chat-info .last-message {
            font-size: 0.94rem;
            color: rgba(226, 232, 240, 0.82);
            overflow: hidden;
            text-overflow: ellipsis;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            max-width: clamp(200px, 40vw, 520px);
        }

        .chat-meta {
            display: flex;
            flex-direction: column;
            align-items: flex-end;
            gap: 10px;
            font-size: 0.85rem;
            color: rgba(226, 232, 240, 0.6);
        }

        .chat-meta .typing {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 4px 10px;
            border-radius: 999px;
            background: var(--vendor-chip-bg);
            color: var(--vendor-chip-text);
            font-size: 0.78rem;
            font-weight: 600;
        }

        .chat-meta .unread {
            min-width: 32px;
            padding: 4px 10px;
            border-radius: 999px;
            background: var(--vendor-accent);
            color: #022c22;
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
            background: var(--vendor-chip-text);
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
            width: 64px;
            height: 64px;
            border-radius: 18px;
            overflow: hidden;
            border: 1px solid rgba(45, 212, 191, 0.2);
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
            background: rgba(15, 23, 42, 0.62);
            border: 1px dashed var(--vendor-border);
            text-align: center;
            display: grid;
            gap: 12px;
            justify-items: center;
            color: var(--vendor-muted);
        }

        .empty-state h2 {
            margin: 0;
            font-weight: 600;
            color: var(--vendor-text);
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
            border: 3px solid rgba(45, 212, 191, 0.18);
            border-top-color: var(--vendor-accent);
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
            background: rgba(15, 23, 42, 0.92);
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
<body data-vendor-uid="<?= htmlspecialchars($vendorUid, ENT_QUOTES, 'UTF-8'); ?>">
<header>
    <div class="header-top">
        <div>
            <h1>Inbox</h1>
            <p class="subtitle">Conversations with your buyers</p>
        </div>
        <div class="chat-avatar" aria-hidden="true">
            <?php if ($vendorAvatar !== ''): ?>
                <img src="<?= htmlspecialchars($vendorAvatar, ENT_QUOTES, 'UTF-8'); ?>" alt="<?= htmlspecialchars($vendorName, ENT_QUOTES, 'UTF-8'); ?>">
            <?php else: ?>
                <?= htmlspecialchars(substr($vendorName, 0, 2) ?: 'VN', ENT_QUOTES, 'UTF-8'); ?>
            <?php endif; ?>
        </div>
    </div>
    <label class="search-bar" for="chat-search">
        <i class="ri-search-line" aria-hidden="true"></i>
        <input id="chat-search" type="search" placeholder="Search buyers or listings" autocomplete="off">
    </label>
</header>
<main>
    <section class="chat-list" id="chat-list" role="list"></section>
    <div class="loader" id="chat-loader" hidden>
        <div class="spinner" role="status" aria-label="Loading chats"></div>
    </div>
    <div class="empty-state" id="chat-empty" hidden>
        <span style="font-size:2rem">📭</span>
        <h2>No messages yet</h2>
        <p>You're all caught up. Buyers will reach out from your listings.</p>
    </div>
    <div class="loader" id="chat-error" hidden>
        <p role="alert">Unable to load chats. <button type="button" id="chat-retry">Retry</button></p>
    </div>
</main>
<script>
    window.__CHAT_CONTEXT__ = <?= json_encode($chatContext, JSON_UNESCAPED_SLASHES); ?>;
</script>
<script type="module" src="./vendor-chats.js"></script>
</body>
</html>
