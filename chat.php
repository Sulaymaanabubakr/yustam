<?php
require_once __DIR__ . '/session-path.php';
session_start();

$buyerUid = isset($_SESSION['buyer_uid']) ? trim((string) $_SESSION['buyer_uid']) : '';
$buyerName = isset($_SESSION['buyer_name']) ? trim((string) $_SESSION['buyer_name']) : 'Buyer';
$buyerAvatar = isset($_SESSION['buyer_avatar']) ? trim((string) $_SESSION['buyer_avatar']) : '';

$vendorUid = isset($_SESSION['vendor_uid']) ? trim((string) $_SESSION['vendor_uid']) : '';
$vendorName = isset($_SESSION['vendor_name']) ? trim((string) $_SESSION['vendor_name']) : 'Vendor';
$vendorAvatar = isset($_SESSION['vendor_logo']) ? trim((string) $_SESSION['vendor_logo']) : '';

$chatParam = isset($_GET['chat']) ? trim((string) $_GET['chat']) : '';
$chatId = '';
$listingId = isset($_GET['listing']) ? trim((string) $_GET['listing']) : '';
$listingTitle = isset($_GET['listing_title']) ? trim((string) $_GET['listing_title']) : 'Listing';
$listingImage = isset($_GET['listing_image']) ? trim((string) $_GET['listing_image']) : '';

if ($chatParam !== '') {
    $chatId = $chatParam;
    $parts = explode('__', $chatParam);
    if (count($parts) >= 3) {
        $vendorUid = $parts[0] ?: $vendorUid;
        $buyerUid = $parts[1] ?: $buyerUid;
        $listingId = $parts[2] ?: $listingId;
    }
}

if ($listingId === '' && isset($_GET['productId'])) {
    $listingId = trim((string) $_GET['productId']);
}
if ($listingTitle === '' && isset($_GET['productTitle'])) {
    $listingTitle = trim((string) $_GET['productTitle']);
}
if ($listingImage === '' && isset($_GET['productImage'])) {
    $listingImage = trim((string) $_GET['productImage']);
}

if ($buyerUid === '' && isset($_GET['buyerUid'])) {
    $buyerUid = trim((string) $_GET['buyerUid']);
}
if ($vendorUid === '' && isset($_GET['vendorUid'])) {
    $vendorUid = trim((string) $_GET['vendorUid']);
}

$currentRole = 'guest';
$currentUid = '';
$currentName = 'Guest';
$counterpartyRole = '';
$counterpartyUid = '';
$counterpartyName = '';

if ($vendorUid !== '' && isset($_SESSION['vendor_id'])) {
    $currentRole = 'vendor';
    $currentUid = $vendorUid;
    $currentName = $vendorName ?: 'Vendor';
    $counterpartyRole = 'buyer';
    $counterpartyUid = $buyerUid;
    $counterpartyName = $buyerName ?: 'Buyer';
}

if ($buyerUid !== '' && isset($_SESSION['buyer_id']) && $currentRole === 'guest') {
    $currentRole = 'buyer';
    $currentUid = $buyerUid;
    $currentName = $buyerName ?: 'Buyer';
    $counterpartyRole = 'vendor';
    $counterpartyUid = $vendorUid;
    $counterpartyName = $vendorName ?: 'Vendor';
}

if ($currentRole === 'guest' && $buyerUid !== '') {
    $currentRole = 'buyer';
    $currentUid = $buyerUid;
    $currentName = $buyerName ?: 'Buyer';
    $counterpartyRole = 'vendor';
    $counterpartyUid = $vendorUid;
    $counterpartyName = $vendorName ?: 'Vendor';
}

if ($currentRole === 'guest' && $vendorUid !== '') {
    $currentRole = 'vendor';
    $currentUid = $vendorUid;
    $currentName = $vendorName ?: 'Vendor';
    $counterpartyRole = 'buyer';
    $counterpartyUid = $buyerUid;
    $counterpartyName = $buyerName ?: 'Buyer';
}

if ($counterpartyRole === 'buyer' && isset($_GET['buyerName'])) {
    $counterpartyName = trim((string) $_GET['buyerName']);
}
if ($counterpartyRole === 'vendor' && isset($_GET['vendorName'])) {
    $counterpartyName = trim((string) $_GET['vendorName']);
}

if ($chatId === '' && $vendorUid !== '' && $buyerUid !== '' && $listingId !== '') {
    $chatId = $vendorUid . '__' . $buyerUid . '__' . $listingId;
}

if ($chatId === '') {
    http_response_code(302);
    header('Location: index.html');
    exit;
}

$chatContext = [
    'role' => $currentRole,
];
if ($currentRole === 'buyer') {
    $chatContext['buyer_uid'] = $currentUid;
    $chatContext['buyer_name'] = $currentName;
}
if ($currentRole === 'vendor') {
    $chatContext['vendor_uid'] = $currentUid;
    $chatContext['vendor_name'] = $currentName;
}

$threadContext = [
    'chatId' => $chatId,
    'buyer_uid' => $buyerUid,
    'buyer_name' => $buyerName ?: 'Buyer',
    'vendor_uid' => $vendorUid,
    'vendor_name' => $vendorName ?: 'Vendor',
    'listing_id' => $listingId,
    'listing_title' => $listingTitle ?: 'Listing',
    'listing_image' => $listingImage,
];

$backLink = $currentRole === 'vendor' ? 'vendor-chats.php' : 'buyer-chats.php';
$counterAvatar = $counterpartyRole === 'vendor' ? $vendorAvatar : $buyerAvatar;
$defaultAvatar = 'https://images.unsplash.com/photo-1521120413309-42fb5463e6da?auto=format&fit=crop&w=160&q=80';
?>
<!DOCTYPE html>
<html lang="en" data-role="<?= htmlspecialchars($currentRole, ENT_QUOTES, 'UTF-8'); ?>">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Chat | YUSTAM Marketplace</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <link href="https://cdn.jsdelivr.net/npm/remixicon@4.2.0/fonts/remixicon.css" rel="stylesheet">
    <style>
        :root {
            --buyer-bubble: rgba(241, 245, 249, 0.9);
            --buyer-text: #0f172a;
            --vendor-bubble: linear-gradient(135deg, #fb923c, #f97316);
            --vendor-text: #ffffff;
            --surface-bg: linear-gradient(180deg, rgba(240, 253, 250, 0.85), rgba(255, 255, 255, 0.9));
            --surface-dark: linear-gradient(180deg, rgba(2, 6, 23, 0.92), rgba(2, 44, 34, 0.82));
            --border-soft: rgba(148, 163, 184, 0.2);
            --accent: #14b8a6;
            --danger: #ef4444;
            --ink: #0f172a;
        }

        * {
            box-sizing: border-box;
        }

        body {
            margin: 0;
            font-family: 'Inter', system-ui, sans-serif;
            background: var(--surface-bg);
            color: var(--ink);
            min-height: 100vh;
            display: flex;
            justify-content: center;
            padding: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);
        }

        html[data-role="vendor"] body {
            background: var(--surface-dark);
            color: #f8fafc;
        }

        .chat-app {
            width: min(960px, 100%);
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            backdrop-filter: blur(18px);
            background: rgba(255, 255, 255, 0.2);
        }

        html[data-role="vendor"] .chat-app {
            background: rgba(15, 23, 42, 0.36);
        }

        .chat-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            padding: 18px clamp(12px, 5vw, 32px);
            backdrop-filter: blur(18px);
            background: rgba(255, 255, 255, 0.6);
            border-bottom: 1px solid rgba(148, 163, 184, 0.3);
            position: sticky;
            top: 0;
            z-index: 20;
        }

        html[data-role="vendor"] .chat-header {
            background: rgba(15, 23, 42, 0.7);
            border-bottom-color: rgba(148, 163, 184, 0.18);
        }

        .back-button {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 40px;
            height: 40px;
            border-radius: 14px;
            border: 1px solid rgba(148, 163, 184, 0.3);
            background: rgba(255, 255, 255, 0.7);
            color: inherit;
            text-decoration: none;
            transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .back-button:hover,
        .back-button:focus-visible {
            transform: translateY(-2px);
            box-shadow: 0 12px 30px rgba(15, 23, 42, 0.18);
        }

        html[data-role="vendor"] .back-button {
            background: rgba(15, 23, 42, 0.6);
            border-color: rgba(148, 163, 184, 0.4);
        }

        .chat-peer {
            display: flex;
            align-items: center;
            gap: 14px;
            flex: 1;
            min-width: 0;
        }

        .chat-peer .avatar {
            width: 48px;
            height: 48px;
            border-radius: 18px;
            overflow: hidden;
            background: rgba(20, 184, 166, 0.16);
            display: grid;
            place-items: center;
            font-weight: 600;
        }

        .chat-peer .avatar img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }

        .chat-peer h1 {
            margin: 0;
            font-size: 1.06rem;
            font-weight: 600;
        }

        .chat-peer p {
            margin: 4px 0 0;
            font-size: 0.85rem;
            color: rgba(15, 23, 42, 0.6);
        }

        html[data-role="vendor"] .chat-peer p {
            color: rgba(226, 232, 240, 0.7);
        }

        .chat-actions {
            display: flex;
            gap: 8px;
        }

        .chat-actions button {
            width: 40px;
            height: 40px;
            border-radius: 14px;
            border: none;
            background: rgba(20, 184, 166, 0.12);
            color: inherit;
            cursor: pointer;
        }

        .chat-body {
            flex: 1;
            overflow-y: auto;
            padding: 24px clamp(12px, 5vw, 32px) 12px;
            display: flex;
            flex-direction: column;
            gap: 12px;
        }

        .chat-stream {
            display: flex;
            flex-direction: column;
            gap: 10px;
        }

        .message-row {
            display: flex;
            flex-direction: column;
            max-width: min(75%, 420px);
            padding: 0;
            animation: fadeIn 0.25s ease;
        }

        .message-row.is-own {
            align-self: flex-end;
        }

        .message-bubble {
            padding: 12px 14px;
            border-radius: 22px;
            position: relative;
            display: inline-flex;
            flex-direction: column;
            gap: 8px;
            box-shadow: 0 12px 24px rgba(15, 23, 42, 0.12);
        }

        .message-bubble.role-vendor {
            background: var(--vendor-bubble);
            color: var(--vendor-text);
        }

        .message-bubble.role-buyer {
            background: var(--buyer-bubble);
            color: var(--buyer-text);
        }

        .message-text {
            margin: 0;
            white-space: pre-wrap;
            word-break: break-word;
            font-size: 0.96rem;
        }

        .message-image {
            border-radius: 18px;
            overflow: hidden;
            max-height: 320px;
        }

        .message-image img {
            width: 100%;
            display: block;
            object-fit: cover;
        }

        .message-meta {
            display: flex;
            align-items: center;
            justify-content: flex-end;
            gap: 6px;
            font-size: 0.75rem;
            opacity: 0.75;
        }

        .message-divider {
            display: flex;
            align-items: center;
            gap: 12px;
            color: rgba(15, 23, 42, 0.6);
            font-size: 0.78rem;
            margin: 12px 0;
        }

        .message-divider::before,
        .message-divider::after {
            content: '';
            flex: 1;
            height: 1px;
            background: rgba(148, 163, 184, 0.3);
        }

        html[data-role="vendor"] .message-divider {
            color: rgba(226, 232, 240, 0.7);
        }

        html[data-role="vendor"] .message-divider::before,
        html[data-role="vendor"] .message-divider::after {
            background: rgba(148, 163, 184, 0.4);
        }

        .chat-banner {
            align-self: center;
            margin-top: auto;
            margin-bottom: 8px;
            background: rgba(20, 184, 166, 0.2);
            color: #0f172a;
            padding: 6px 16px;
            border-radius: 999px;
            font-size: 0.85rem;
            cursor: pointer;
            display: none;
        }

        html[data-role="vendor"] .chat-banner {
            background: rgba(94, 234, 212, 0.25);
            color: #f8fafc;
        }

        .chat-banner.is-visible {
            display: inline-flex;
            align-items: center;
            gap: 6px;
        }

        .composer {
            padding: 16px clamp(12px, 5vw, 32px) max(16px, env(safe-area-inset-bottom));
            border-top: 1px solid rgba(148, 163, 184, 0.2);
            backdrop-filter: blur(16px);
            background: rgba(255, 255, 255, 0.85);
            display: flex;
            flex-direction: column;
            gap: 12px;
        }

        html[data-role="vendor"] .composer {
            background: rgba(15, 23, 42, 0.78);
            border-top-color: rgba(148, 163, 184, 0.24);
        }

        .attachment-row {
            display: flex;
            gap: 8px;
            overflow-x: auto;
            padding-bottom: 4px;
        }

        .attachment-card {
            position: relative;
            width: 72px;
            height: 72px;
            border-radius: 18px;
            overflow: hidden;
            background: rgba(148, 163, 184, 0.12);
        }

        .attachment-card img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }

        .attachment-remove {
            position: absolute;
            top: 6px;
            right: 6px;
            width: 24px;
            height: 24px;
            border-radius: 50%;
            border: none;
            background: rgba(15, 23, 42, 0.7);
            color: #fff;
            cursor: pointer;
        }

        .attachment-progress {
            position: absolute;
            inset: 0;
            display: grid;
            place-items: center;
            background: rgba(15, 23, 42, 0.55);
            color: #fff;
            font-size: 0.85rem;
        }

        .composer-form {
            display: flex;
            align-items: flex-end;
            gap: 12px;
            background: rgba(241, 245, 249, 0.8);
            border-radius: 22px;
            padding: 10px 14px;
            border: 1px solid rgba(148, 163, 184, 0.25);
        }

        html[data-role="vendor"] .composer-form {
            background: rgba(15, 23, 42, 0.55);
            border-color: rgba(148, 163, 184, 0.32);
        }

        .composer textarea {
            flex: 1;
            resize: none;
            border: none;
            background: transparent;
            font-size: 0.98rem;
            max-height: 120px;
            color: inherit;
            font-family: inherit;
            outline: none;
        }

        .composer button,
        .composer label {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 40px;
            height: 40px;
            border-radius: 14px;
        }

        .attach-button {
            border: none;
            background: rgba(20, 184, 166, 0.15);
            color: inherit;
            cursor: pointer;
        }

        .send-button {
            border: none;
            background: var(--accent);
            color: white;
            cursor: pointer;
            transition: transform 0.2s ease;
        }

        .send-button:disabled {
            opacity: 0.6;
            cursor: not-allowed;
        }

        .typing-indicator {
            font-size: 0.84rem;
            color: rgba(15, 23, 42, 0.6);
            display: inline-flex;
            align-items: center;
            gap: 6px;
        }

        html[data-role="vendor"] .typing-indicator {
            color: rgba(226, 232, 240, 0.7);
        }

        .typing-indicator span {
            display: inline-flex;
            gap: 3px;
        }

        .typing-indicator span i {
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background: currentColor;
            opacity: 0.3;
            animation: typingDots 1s infinite;
        }

        .typing-indicator span i:nth-child(2) {
            animation-delay: 0.18s;
        }

        .typing-indicator span i:nth-child(3) {
            animation-delay: 0.36s;
        }

        @keyframes typingDots {
            0%, 80%, 100% {
                opacity: 0.2;
                transform: translateY(0);
            }
            40% {
                opacity: 1;
                transform: translateY(-3px);
            }
        }

        @keyframes fadeIn {
            from {
                opacity: 0;
                transform: translateY(6px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        @media (max-width: 640px) {
            .chat-app {
                border-radius: 0;
            }

            .chat-header {
                padding: 14px 18px;
            }

            .chat-body {
                padding: 18px;
            }

            .composer {
                padding: 12px 18px max(12px, env(safe-area-inset-bottom));
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
            background: rgba(15, 23, 42, 0.88);
            color: #f8fafc;
            padding: 12px 20px;
            border-radius: 999px;
            opacity: 0;
            transform: translateY(12px);
            transition: opacity 0.26s ease, transform 0.26s ease;
        }

        .chat-toast.is-visible {
            opacity: 1;
            transform: translateY(0);
        }
    </style>
</head>
<body>
<div
    class="chat-app"
    id="chat-app"
    data-chat-id="<?= htmlspecialchars($chatId, ENT_QUOTES, 'UTF-8'); ?>"
    data-role="<?= htmlspecialchars($currentRole, ENT_QUOTES, 'UTF-8'); ?>"
    data-current-uid="<?= htmlspecialchars($currentUid, ENT_QUOTES, 'UTF-8'); ?>"
    data-counterparty-uid="<?= htmlspecialchars($counterpartyUid, ENT_QUOTES, 'UTF-8'); ?>"
    data-counterparty-role="<?= htmlspecialchars($counterpartyRole, ENT_QUOTES, 'UTF-8'); ?>"
    data-counterparty-name="<?= htmlspecialchars($counterpartyName, ENT_QUOTES, 'UTF-8'); ?>"
    data-buyer-uid="<?= htmlspecialchars($buyerUid, ENT_QUOTES, 'UTF-8'); ?>"
    data-buyer-name="<?= htmlspecialchars($buyerName, ENT_QUOTES, 'UTF-8'); ?>"
    data-vendor-uid="<?= htmlspecialchars($vendorUid, ENT_QUOTES, 'UTF-8'); ?>"
    data-vendor-name="<?= htmlspecialchars($vendorName, ENT_QUOTES, 'UTF-8'); ?>"
    data-listing-id="<?= htmlspecialchars($listingId, ENT_QUOTES, 'UTF-8'); ?>"
    data-listing-title="<?= htmlspecialchars($listingTitle, ENT_QUOTES, 'UTF-8'); ?>"
    data-listing-image="<?= htmlspecialchars($listingImage, ENT_QUOTES, 'UTF-8'); ?>"
    data-back-link="<?= htmlspecialchars($backLink, ENT_QUOTES, 'UTF-8'); ?>"
>
    <header class="chat-header">
        <a class="back-button" href="<?= htmlspecialchars($backLink, ENT_QUOTES, 'UTF-8'); ?>" aria-label="Back to chats">
            <i class="ri-arrow-left-line" aria-hidden="true"></i>
        </a>
        <div class="chat-peer">
            <div class="avatar">
                <?php if ($counterAvatar !== ''): ?>
                    <img src="<?= htmlspecialchars($counterAvatar, ENT_QUOTES, 'UTF-8'); ?>" alt="<?= htmlspecialchars($counterpartyName, ENT_QUOTES, 'UTF-8'); ?>">
                <?php else: ?>
                    <?= htmlspecialchars(substr($counterpartyName, 0, 2) ?: 'YU', ENT_QUOTES, 'UTF-8'); ?>
                <?php endif; ?>
            </div>
            <div class="peer-info">
                <h1 id="participant-name"><?= htmlspecialchars($counterpartyName, ENT_QUOTES, 'UTF-8'); ?></h1>
                <p id="participant-status"><?= htmlspecialchars($listingTitle, ENT_QUOTES, 'UTF-8'); ?></p>
            </div>
        </div>
        <div class="chat-actions">
            <button type="button" id="chat-menu" aria-label="More options"><i class="ri-more-2-line"></i></button>
        </div>
    </header>
    <main class="chat-body" id="chat-body">
        <div class="chat-stream" id="chat-stream"></div>
        <button class="chat-banner" id="new-messages" hidden><i class="ri-arrow-down-s-line"></i> New messages</button>
    </main>
    <footer class="composer">
        <div class="attachment-row" id="attachment-row" hidden></div>
        <form class="composer-form" id="composer-form" autocomplete="off">
            <label class="attach-button" for="file-input" id="attach-button"><i class="ri-attachment-2"></i></label>
            <input type="file" accept="image/*" id="file-input" multiple hidden>
            <textarea id="message-input" rows="1" placeholder="Write a message…"></textarea>
            <button class="send-button" type="submit" id="send-button" disabled>
                <i class="ri-send-plane-2-fill"></i>
            </button>
        </form>
    </footer>
</div>
<script>
    window.__CHAT_CONTEXT__ = <?= json_encode($chatContext, JSON_UNESCAPED_SLASHES | JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT); ?>;
    window.__CHAT_THREAD__ = <?= json_encode($threadContext, JSON_UNESCAPED_SLASHES | JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT); ?>;
</script>
<script type="module" src="./chat.js"></script>
</body>
</html>
