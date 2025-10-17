<?php
require_once __DIR__ . '/session-path.php';
session_start();

require_once __DIR__ . '/db.php';

$chatId = isset($_GET['ch']) ? trim((string)$_GET['ch']) : '';
if ($chatId === '') {
    $chatId = isset($_GET['chat']) ? trim((string)$_GET['chat']) : '';
}

$role = isset($_GET['as']) ? strtolower(trim((string)$_GET['as'])) : '';
if (!in_array($role, ['buyer', 'vendor'], true)) {
    $role = isset($_SESSION['buyer_id']) ? 'buyer' : 'vendor';
}

$listingId = isset($_GET['listing']) ? trim((string)$_GET['listing']) : '';
$listingTitle = isset($_GET['listing_title']) ? trim((string)$_GET['listing_title']) : '';
$listingImage = isset($_GET['listing_image']) ? trim((string)$_GET['listing_image']) : '';
$counterpartyAvatar = '';

if ($role === 'buyer') {
    if (!isset($_SESSION['buyer_id'])) {
        header('Location: buyer-login.php');
        exit;
    }
    require_once __DIR__ . '/buyer-storage.php';
    $buyerId = (int)($_SESSION['buyer_id'] ?? 0);
    $buyer = yustam_buyers_find($buyerId);
    $buyer = yustam_buyers_ensure_uid($buyer ?? []);
    $buyerUid = trim((string)($buyer['buyer_uid'] ?? ($_SESSION['buyer_uid'] ?? '')));
    if ($buyerUid === '') {
        $buyerUid = sprintf('YUSTAM-BYR-%04d', $buyerId ?: 1);
    }
    $_SESSION['buyer_uid'] = $buyerUid;
    $buyerName = trim((string)($buyer['name'] ?? ($_SESSION['buyer_name'] ?? 'Buyer')));
    if ($buyerName === '') {
        $buyerName = 'Buyer';
    }
    $_SESSION['buyer_name'] = $buyerName;
    $viewer = [
        'role' => 'buyer',
        'uid' => $buyerUid,
        'name' => $buyerName,
        'avatar' => trim((string)($buyer['avatar'] ?? $buyer['profile_photo'] ?? '')),
    ];
    $counterpartyRole = 'vendor';
    $counterpartyUid = isset($_GET['vendor_uid']) ? trim((string)$_GET['vendor_uid']) : '';
    $counterpartyName = isset($_GET['vendor_name']) ? trim((string)$_GET['vendor_name']) : '';
    $counterpartyAvatar = isset($_GET['vendor_avatar']) ? trim((string)$_GET['vendor_avatar']) : '';
} else {
    if (!isset($_SESSION['vendor_id'])) {
        header('Location: vendor-login.html');
        exit;
    }
    $vendorId = (int)($_SESSION['vendor_id'] ?? 0);
    $db = get_db_connection();
    $vendorTable = 'vendors';
    if (defined('YUSTAM_VENDORS_TABLE') && preg_match('/^[A-Za-z0-9_]+$/', YUSTAM_VENDORS_TABLE)) {
        $vendorTable = YUSTAM_VENDORS_TABLE;
    }
    $stmt = $db->prepare(sprintf('SELECT * FROM %s WHERE id = ? LIMIT 1', $vendorTable));
    $stmt->bind_param('i', $vendorId);
    $stmt->execute();
    $result = $stmt->get_result();
    $vendor = $result->fetch_assoc();
    $stmt->close();
    if (!$vendor) {
        session_destroy();
        header('Location: vendor-login.html');
        exit;
    }
    $vendorUid = yustam_vendor_assign_uid_if_missing($db, $vendor);
    $_SESSION['vendor_uid'] = $vendorUid;
    $nameColumn = yustam_vendor_name_column();
    $vendorName = trim((string)($vendor[$nameColumn] ?? ($_SESSION['vendor_name'] ?? 'Vendor')));
    if ($vendorName === '') {
        $vendorName = 'Vendor';
    }
    $_SESSION['vendor_name'] = $vendorName;
    $avatar = '';
    if (yustam_vendor_table_has_column('profile_photo')) {
        $avatar = trim((string)($vendor['profile_photo'] ?? ''));
    } elseif (yustam_vendor_table_has_column('avatar_url')) {
        $avatar = trim((string)($vendor['avatar_url'] ?? ''));
    }
    $viewer = [
        'role' => 'vendor',
        'uid' => $vendorUid,
        'name' => $vendorName,
        'avatar' => $avatar,
    ];
    $counterpartyRole = 'buyer';
    $counterpartyUid = isset($_GET['buyer_uid']) ? trim((string)$_GET['buyer_uid']) : '';
    $counterpartyName = isset($_GET['buyer_name']) ? trim((string)$_GET['buyer_name']) : '';
    $counterpartyAvatar = isset($_GET['buyer_avatar']) ? trim((string)$_GET['buyer_avatar']) : '';
}

if ($chatId === '') {
    http_response_code(400);
    echo '<p>Chat not found.</p>';
    exit;
}

$threadBootstrap = [
    'chatId' => $chatId,
    'role' => $viewer['role'],
    'viewer' => $viewer,
    'counterparty' => [
        'role' => $counterpartyRole,
        'uid' => $counterpartyUid,
        'name' => $counterpartyName,
        'avatar' => $counterpartyAvatar ?? '',
    ],
    'listing' => [
        'id' => $listingId,
        'title' => $listingTitle,
        'image' => $listingImage,
    ],
];
$threadBootstrapJson = json_encode($threadBootstrap, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
?>
<!DOCTYPE html>
<html lang="en" data-theme="chat-thread">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
    <title>Chat | YUSTAM Marketplace</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/remixicon@4.2.0/fonts/remixicon.css">
    <style>
        :root {
            --emerald: #004d40;
            --emerald-dark: #002f27;
            --orange: #f3731e;
            --beige: #f6efe6;
            --ink: rgba(14, 25, 21, 0.9);
            --muted: rgba(14, 25, 21, 0.65);
            --bubble-sent: linear-gradient(135deg, rgba(0, 77, 64, 0.92), rgba(0, 128, 107, 0.82));
            --bubble-received: rgba(255, 255, 255, 0.78);
            --surface: rgba(255, 255, 255, 0.86);
            --glass: rgba(255, 255, 255, 0.72);
            --glass-dark: rgba(0, 50, 40, 0.75);
            --header-height: 72px;
        }

        * {
            box-sizing: border-box;
        }

        body {
            margin: 0;
            min-height: 100vh;
            background: url('https://res.cloudinary.com/dpc16a0vd/image/upload/v1715442114/yustam/chat-wallpaper.png') repeat;
            background-size: 420px;
            font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
            color: var(--ink);
            display: flex;
            flex-direction: column;
            padding: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);
        }

        .chat-shell {
            flex: 1;
            display: grid;
            grid-template-rows: auto 1fr auto;
            max-width: 920px;
            margin: 0 auto;
            width: 100%;
            height: 100vh;
        }

        header.chat-header {
            position: sticky;
            top: 0;
            z-index: 20;
            display: flex;
            align-items: center;
            gap: 16px;
            padding: 18px 20px;
            backdrop-filter: blur(18px);
            background: var(--glass);
            border-bottom: 1px solid rgba(0, 0, 0, 0.04);
        }

        .header-avatar {
            width: 48px;
            height: 48px;
            border-radius: 18px;
            overflow: hidden;
            background: linear-gradient(135deg, rgba(243, 115, 30, 0.22), rgba(0, 77, 64, 0.18));
            flex-shrink: 0;
        }

        .header-avatar img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }

        .header-meta {
            display: flex;
            flex-direction: column;
            gap: 4px;
        }

        .header-meta strong {
            font-size: 1.05rem;
            font-weight: 600;
        }

        .header-meta span {
            font-size: 0.84rem;
            color: var(--muted);
            display: flex;
            align-items: center;
            gap: 6px;
        }

        .chat-back {
            border: none;
            background: rgba(0, 77, 64, 0.12);
            color: var(--emerald);
            width: 42px;
            height: 42px;
            border-radius: 14px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
        }

        .header-actions {
            margin-left: auto;
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .header-actions button {
            border: none;
            background: rgba(0, 77, 64, 0.12);
            color: var(--emerald);
            width: 42px;
            height: 42px;
            border-radius: 14px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
        }

        .chat-scroll {
            position: relative;
            overflow-y: auto;
            padding: 18px 20px 100px;
            scroll-behavior: smooth;
        }

        .chat-scroll::-webkit-scrollbar {
            width: 6px;
        }

        .chat-scroll::-webkit-scrollbar-thumb {
            background: rgba(0, 0, 0, 0.12);
            border-radius: 999px;
        }

        .message {
            display: inline-flex;
            flex-direction: column;
            max-width: min(420px, 75%);
            margin-bottom: 12px;
            padding: 12px 16px;
            border-radius: 18px;
            gap: 6px;
            position: relative;
            box-shadow: 0 12px 24px rgba(0, 0, 0, 0.08);
            line-height: 1.4;
            font-size: 0.95rem;
        }

        .message.sent {
            margin-left: auto;
            background: var(--bubble-sent);
            color: #fefefe;
        }

        .message.received {
            background: var(--bubble-received);
            color: var(--ink);
        }

        .message .meta {
            font-size: 0.75rem;
            display: flex;
            align-items: center;
            justify-content: flex-end;
            gap: 6px;
            opacity: 0.76;
        }

        .message-image {
            border-radius: 16px;
            overflow: hidden;
            max-height: 280px;
            display: block;
        }

        .message-image img {
            display: block;
            width: 100%;
            height: 100%;
            object-fit: cover;
        }

        .voice-player {
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .voice-wave {
            flex: 1;
            height: 4px;
            background: rgba(255, 255, 255, 0.5);
            border-radius: 999px;
            overflow: hidden;
            position: relative;
        }

        .voice-wave span {
            position: absolute;
            left: 0;
            top: 0;
            height: 100%;
            width: 0%;
            background: rgba(255, 255, 255, 0.9);
            transition: width 120ms linear;
        }

        .typing-banner {
            position: absolute;
            bottom: 100px;
            left: 0;
            right: 0;
            display: flex;
            justify-content: center;
            pointer-events: none;
        }

        .typing-pill {
            background: rgba(0, 77, 64, 0.92);
            color: #fff;
            padding: 8px 14px;
            border-radius: 999px;
            font-size: 0.82rem;
            box-shadow: 0 10px 20px rgba(0, 0, 0, 0.18);
        }

        .composer {
            position: sticky;
            bottom: 0;
            padding: 16px;
            background: rgba(255, 255, 255, 0.86);
            backdrop-filter: blur(16px);
            display: grid;
            grid-template-columns: auto 1fr auto;
            gap: 12px;
            align-items: flex-end;
            border-top: 1px solid rgba(0, 0, 0, 0.08);
        }

        .composer-tools {
            display: flex;
            gap: 8px;
        }

        .composer-input {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }

        .composer button {
            border: none;
            background: rgba(0, 0, 0, 0.04);
            width: 44px;
            height: 44px;
            border-radius: 14px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-size: 1.25rem;
            color: var(--emerald);
            cursor: pointer;
        }

        .composer textarea {
            resize: none;
            border: none;
            background: rgba(0, 0, 0, 0.04);
            padding: 12px 14px;
            border-radius: 18px;
            font-size: 0.95rem;
            font-family: inherit;
            max-height: 120px;
            line-height: 1.4;
            min-height: 44px;
            outline: none;
        }

        .composer textarea:focus {
            background: rgba(0, 77, 64, 0.08);
        }

        .attachment-preview {
            display: flex;
            gap: 12px;
            padding: 0 16px;
            margin-bottom: 6px;
        }

        .attachment-preview figure {
            position: relative;
            width: 72px;
            height: 72px;
            border-radius: 18px;
            overflow: hidden;
            margin: 0;
        }

        .attachment-preview img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }

        .attachment-preview button {
            position: absolute;
            top: 6px;
            right: 6px;
            background: rgba(0, 0, 0, 0.6);
            color: #fff;
            border: none;
            width: 28px;
            height: 28px;
            border-radius: 50%;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
        }

        .scroll-bottom {
            position: absolute;
            right: 20px;
            bottom: 120px;
            border: none;
            background: rgba(0, 77, 64, 0.85);
            color: #fff;
            border-radius: 20px;
            padding: 10px 16px;
            display: none;
            align-items: center;
            gap: 6px;
            cursor: pointer;
            box-shadow: 0 16px 32px rgba(0, 0, 0, 0.18);
        }

        .scroll-bottom.is-visible {
            display: inline-flex;
        }

        .offline-banner {
            position: sticky;
            top: 0;
            background: #fbe9e7;
            color: #bf360c;
            padding: 10px 16px;
            text-align: center;
            font-size: 0.85rem;
            display: none;
        }

        .offline-banner.is-visible {
            display: block;
        }

        @media (max-width: 640px) {
            .chat-shell {
                max-width: none;
                height: 100vh;
            }

            .composer {
                padding-bottom: calc(16px + env(safe-area-inset-bottom));
            }
        }
    </style>
</head>
<body>
<div class="chat-shell" data-role="<?= htmlspecialchars($viewer['role'], ENT_QUOTES, 'UTF-8'); ?>">
    <header class="chat-header">
        <button class="chat-back" id="backButton" aria-label="Back">
            <i class="ri-arrow-left-line"></i>
        </button>
        <div class="header-avatar" id="headerAvatar">
            <img src="<?= htmlspecialchars($listingImage ?: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=300&q=80', ENT_QUOTES, 'UTF-8'); ?>" alt="Listing thumbnail">
        </div>
        <div class="header-meta">
            <strong id="chatTitle">Chat</strong>
            <span id="chatSubtitle">Loading…</span>
        </div>
        <div class="header-actions">
            <button id="infoButton" aria-label="Listing details"><i class="ri-information-line"></i></button>
        </div>
    </header>
    <div class="offline-banner" id="offlineBanner">You are offline. Messages will send automatically when you are back online.</div>
    <section class="chat-scroll" id="messageList"></section>
    <button class="scroll-bottom" id="scrollToBottom"><i class="ri-arrow-down-line"></i> New messages</button>
    <div class="typing-banner" id="typingBanner" hidden>
        <div class="typing-pill">Typing…</div>
    </div>
    <footer class="composer" id="composer">
        <input type="file" id="imageInput" accept="image/*" hidden>
        <div class="composer-tools">
            <button id="emojiButton" aria-label="Emoji picker"><i class="ri-emotion-line"></i></button>
            <button id="attachButton" aria-label="Attach media"><i class="ri-attachment-2"></i></button>
        </div>
        <div class="composer-input">
            <div class="attachment-preview" id="attachmentPreview" hidden></div>
            <textarea id="messageInput" rows="1" placeholder="Message" aria-label="Message"></textarea>
        </div>
        <button id="sendButton" aria-label="Send message or hold to record voice note" title="Tap to send, hold to record a voice note"><i class="ri-mic-line"></i></button>
    </footer>
</div>
<script>
    window.__CHAT_THREAD__ = <?= $threadBootstrapJson ?: 'null'; ?>;
</script>
<script type="module" src="./chat.js"></script>
</body>
</html>
