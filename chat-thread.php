<?php
require_once __DIR__ . '/session-path.php';
session_start();

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/buyer-storage.php';
require_once __DIR__ . '/api/chat/firebase.php';

if (!isset($_SESSION['buyer_id']) && !isset($_SESSION['vendor_id'])) {
    header('Location: buyer-login.php');
    exit;
}

$db = get_db_connection();
$role = isset($_SESSION['buyer_id']) ? 'buyer' : 'vendor';
$viewer = [
    'uid' => '',
    'name' => '',
    'email' => '',
    'avatar' => '',
];
$counterparty = [
    'uid' => '',
    'name' => '',
    'email' => '',
    'avatar' => '',
];
$listing = [
    'id' => '',
    'title' => '',
    'image' => '',
];

if ($role === 'buyer') {
    $buyerId = (int)($_SESSION['buyer_id'] ?? 0);
    $buyer = $buyerId > 0 ? yustam_buyers_find($buyerId) : null;
    if (!$buyer) {
        session_destroy();
        header('Location: buyer-login.php');
        exit;
    }
    $buyer = yustam_buyers_ensure_uid($buyer);
    $viewer['uid'] = trim((string)($buyer['firebase_uid'] ?? ($_SESSION['buyer_firebase_uid'] ?? ($_SESSION['firebase_uid'] ?? ''))));
    if ($viewer['uid'] === '') {
        $viewer['uid'] = trim((string)($buyer['buyer_uid'] ?? ''));
    }
    $viewer['name'] = trim((string)($buyer['name'] ?? ($_SESSION['buyer_name'] ?? 'Buyer')));
    $viewer['email'] = trim((string)($buyer['email'] ?? ($_SESSION['buyer_email'] ?? '')));
    $viewer['avatar'] = trim((string)($buyer['avatar'] ?? $buyer['profile_photo'] ?? ''));
} else {
    $vendorId = (int)($_SESSION['vendor_id'] ?? 0);
    $vendorTable = defined('YUSTAM_VENDORS_TABLE') && preg_match('/^[A-Za-z0-9_]+$/', YUSTAM_VENDORS_TABLE) ? YUSTAM_VENDORS_TABLE : 'vendors';
    $stmt = $db->prepare(sprintf('SELECT * FROM `%s` WHERE id = ? LIMIT 1', $vendorTable));
    $stmt->bind_param('i', $vendorId);
    $stmt->execute();
    $result = $stmt->get_result();
    $vendor = $result ? $result->fetch_assoc() : null;
    $stmt->close();

    if (!$vendor) {
        session_destroy();
        header('Location: vendor-login.html');
        exit;
    }

    yustam_vendor_assign_uid_if_missing($db, $vendor);

    $viewer['uid'] = trim((string)($vendor['firebase_uid'] ?? ($_SESSION['vendor_firebase_uid'] ?? ($_SESSION['firebase_uid'] ?? ''))));
    if ($viewer['uid'] === '') {
        $viewer['uid'] = trim((string)($vendor['vendor_uid'] ?? ''));
    }
    $nameColumn = yustam_vendor_name_column();
    $viewer['name'] = trim((string)($vendor[$nameColumn] ?? ($_SESSION['vendor_name'] ?? 'Vendor')));
    $viewer['email'] = trim((string)($vendor['email'] ?? ($_SESSION['vendor_email'] ?? '')));
    if (yustam_vendor_table_has_column('profile_photo')) {
        $viewer['avatar'] = trim((string)($vendor['profile_photo'] ?? ''));
    } elseif (yustam_vendor_table_has_column('avatar_url')) {
        $viewer['avatar'] = trim((string)($vendor['avatar_url'] ?? ''));
    }
}

$chatIdParam = trim((string)($_GET['chat'] ?? ''));
$buyerUidParam = trim((string)($_GET['buyer'] ?? $_GET['buyer_uid'] ?? ''));
$vendorUidParam = trim((string)($_GET['vendor'] ?? $_GET['vendor_uid'] ?? ''));
$listing['id'] = trim((string)($_GET['listing'] ?? $_GET['listing_id'] ?? ''));
$listing['title'] = trim((string)($_GET['listing_title'] ?? ''));
$listing['image'] = trim((string)($_GET['listing_image'] ?? ''));

$buyerUid = $role === 'buyer' ? $viewer['uid'] : $buyerUidParam;
$vendorUid = $role === 'vendor' ? $viewer['uid'] : $vendorUidParam;
$chatId = $chatIdParam;
$chatSummary = null;

if ($chatId !== '') {
    try {
        $chatSummary = yustam_chat_fetch_summary($chatId);
    } catch (Throwable $error) {
        error_log('chat-thread summary lookup failed: ' . $error->getMessage());
    }
    if ($chatSummary) {
        $buyerUid = trim((string)$chatSummary['buyer_uid']);
        $vendorUid = trim((string)$chatSummary['vendor_uid']);
        $listing['id'] = $listing['id'] ?: trim((string)$chatSummary['listing_id']);
        $listing['title'] = $listing['title'] ?: trim((string)$chatSummary['listing_title']);
        $listing['image'] = $listing['image'] ?: trim((string)$chatSummary['listing_image']);
        $counterparty['name'] = $role === 'buyer'
            ? trim((string)$chatSummary['vendor_name'])
            : trim((string)$chatSummary['buyer_name']);
    } else {
        try {
            $document = yustam_firestore_get_document('chats/' . $chatId);
            if ($document && isset($document['fields'])) {
                $fields = [];
                foreach ($document['fields'] as $key => $value) {
                    $fields[$key] = yustam_firestore_decode($value);
                }
                $buyerUid = $buyerUid ?: trim((string)($fields['buyer_uid'] ?? ''));
                $vendorUid = $vendorUid ?: trim((string)($fields['vendor_uid'] ?? ''));
                $listing['id'] = $listing['id'] ?: trim((string)($fields['listing_id'] ?? ''));
                $listing['title'] = $listing['title'] ?: trim((string)($fields['listing_title'] ?? ''));
                $listing['image'] = $listing['image'] ?: trim((string)($fields['listing_image'] ?? ''));
                if ($counterparty['name'] === '') {
                    $counterparty['name'] = $role === 'buyer'
                        ? trim((string)($fields['vendor_name'] ?? ''))
                        : trim((string)($fields['buyer_name'] ?? ''));
                }
            }
        } catch (Throwable $fireError) {
            error_log('chat-thread Firestore summary lookup failed: ' . $fireError->getMessage());
        }
    }
}

if ($buyerUid === '' || $vendorUid === '') {
    http_response_code(400);
    echo '<p style="font-family:Inter,system-ui,sans-serif;padding:24px;">Chat context missing.</p>';
    exit;
}

if ($chatId === '') {
    $chatId = yustam_chat_build_id($buyerUid, $vendorUid);
}

if ($role === 'buyer') {
    $counterparty['uid'] = $vendorUid;
    if ($counterparty['name'] === '') {
        $counterparty['name'] = 'Vendor';
    }
} else {
    $counterparty['uid'] = $buyerUid;
    if ($counterparty['name'] === '') {
        $counterparty['name'] = 'Buyer';
    }
}

$_SESSION['firebase_uid'] = $viewer['uid'];
$_SESSION['yustam_uid'] = $viewer['uid'];
$_SESSION['yustam_role'] = $role;
if ($role === 'buyer') {
    $_SESSION['buyer_firebase_uid'] = $viewer['uid'];
} else {
    $_SESSION['vendor_firebase_uid'] = $viewer['uid'];
}

$bootstrap = [
    'chatId' => $chatId,
    'role' => $role,
    'viewer' => $viewer,
    'counterparty' => $counterparty,
    'buyer' => [
        'uid' => $buyerUid,
    ],
    'vendor' => [
        'uid' => $vendorUid,
    ],
    'listing' => $listing,
    'prefill' => trim((string)($_GET['prefill'] ?? '')),
    'quickSent' => isset($_GET['quick_sent']) && $_GET['quick_sent'] !== '' && $_GET['quick_sent'] !== '0',
];
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
    <title>Chat | YUSTAM Marketplace</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/remixicon@3.5.0/fonts/remixicon.css">
    <style>
        :root {
            color-scheme: light;
            --emerald: #0f6a53;
            --emerald-soft: rgba(15, 106, 83, 0.1);
            --sunset: #f3731e;
            --surface: #ffffff;
            --background: #f4f5f7;
            --border: rgba(15, 106, 83, 0.12);
            --muted: rgba(29, 42, 40, 0.6);
        }

        *,
        *::before,
        *::after {
            box-sizing: border-box;
        }

        body {
            margin: 0;
            min-height: 100vh;
            font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
            background: var(--background);
            display: flex;
            flex-direction: column;
        }

        .chat-shell {
            flex: 1 1 auto;
            display: grid;
            grid-template-rows: auto auto 1fr auto;
            max-width: 960px;
            margin: 0 auto;
            width: 100%;
        }

        .thread-header {
            display: grid;
            grid-template-columns: auto auto 1fr auto;
            align-items: center;
            gap: 16px;
            padding: clamp(16px, 4vw, 24px);
            background: var(--surface);
            border-bottom: 1px solid var(--border);
        }

        .thread-header button {
            border: 1px solid transparent;
            background: var(--emerald-soft);
            color: var(--emerald);
            padding: 10px 12px;
            border-radius: 14px;
            font-weight: 600;
            font-size: 0.95rem;
            cursor: pointer;
            transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .thread-header button:hover {
            transform: translateY(-1px);
            box-shadow: 0 12px 24px rgba(15, 106, 83, 0.15);
        }

        .header-actions {
            display: flex;
            gap: 10px;
        }

        .thread-header button.danger {
            background: rgba(220, 65, 47, 0.12);
            color: #dc412f;
            border: 1px solid rgba(220, 65, 47, 0.2);
        }

        .thread-header button.danger:hover {
            box-shadow: 0 12px 24px rgba(220, 65, 47, 0.18);
            background: rgba(220, 65, 47, 0.18);
        }

        .header-avatar {
            width: 48px;
            height: 48px;
            border-radius: 14px;
            overflow: hidden;
            background: var(--emerald-soft);
        }

        .header-avatar img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }

        .header-details h1 {
            margin: 0;
            font-size: 1.1rem;
            color: var(--emerald);
        }

        .header-details p {
            margin: 2px 0 0;
            font-size: 0.85rem;
            color: var(--muted);
        }

        #offlineBanner {
            display: none;
            background: rgba(243, 115, 30, 0.08);
            color: #c1560d;
            text-align: center;
            padding: 8px 16px;
            font-weight: 600;
        }

        #offlineBanner.is-visible {
            display: block;
        }

        .thread-main {
            position: relative;
            padding: clamp(16px, 4vw, 28px);
            overflow-y: auto;
            display: grid;
            gap: 18px;
            background: linear-gradient(180deg, rgba(15, 106, 83, 0.04) 0%, rgba(244, 245, 247, 1) 100%);
        }

        #typingBanner {
            display: none;
            justify-content: flex-start;
            gap: 8px;
            align-items: center;
            color: var(--muted);
            font-size: 0.85rem;
        }

        #typingBanner.is-visible {
            display: flex;
        }

        .message-list {
            display: grid;
            gap: 12px;
        }

        .message {
            max-width: min(70%, 420px);
            padding: 12px 16px;
            border-radius: 18px;
            background: var(--surface);
            border: 1px solid rgba(15, 106, 83, 0.08);
            box-shadow: 0 8px 18px rgba(15, 106, 83, 0.05);
            font-size: 0.96rem;
            line-height: 1.45;
        }

        .message.sent {
            margin-left: auto;
            background: var(--emerald);
            color: #fff;
            border-color: transparent;
        }

        .message .meta {
            display: flex;
            justify-content: flex-end;
            align-items: center;
            gap: 6px;
            font-size: 0.75rem;
            color: rgba(255, 255, 255, 0.75);
        }

        .message.received .meta {
            color: var(--muted);
        }

        .scroll-bottom {
            position: sticky;
            bottom: 24px;
            margin-left: auto;
            background: var(--emerald);
            color: #fff;
            border: none;
            border-radius: 999px;
            padding: 10px 14px;
            box-shadow: 0 12px 24px rgba(15, 106, 83, 0.32);
            cursor: pointer;
            display: none;
        }

        .scroll-bottom.is-visible {
            display: inline-flex;
            align-items: center;
            gap: 6px;
        }

        .composer {
            background: var(--surface);
            border-top: 1px solid var(--border);
            padding: clamp(16px, 4vw, 24px);
            display: grid;
            gap: 12px;
        }

        .prefill-notice {
            font-size: 0.85rem;
            color: var(--muted);
            background: rgba(15, 106, 83, 0.08);
            padding: 8px 12px;
            border-radius: 12px;
            display: inline-flex;
            align-items: center;
            gap: 8px;
        }

        #attachmentPreview {
            display: none;
            background: rgba(15, 106, 83, 0.06);
            border-radius: 16px;
            padding: 10px;
        }

        #attachmentPreview figure {
            margin: 0;
            position: relative;
        }

        #attachmentPreview img {
            max-width: 160px;
            border-radius: 12px;
        }

        #attachmentPreview button {
            position: absolute;
            top: 6px;
            right: 6px;
            border: none;
            background: rgba(0, 0, 0, 0.6);
            color: #fff;
            border-radius: 50%;
            width: 28px;
            height: 28px;
            cursor: pointer;
        }

        .composer-controls {
            display: grid;
            grid-template-columns: auto 1fr auto auto;
            align-items: center;
            gap: 12px;
        }

        #messageInput {
            width: 100%;
            border: 1px solid var(--border);
            border-radius: 16px;
            padding: 14px 16px;
            font-size: 1rem;
            resize: none;
        }

        #emojiButton,
        #attachButton,
        #sendButton {
            border: none;
            background: var(--emerald-soft);
            color: var(--emerald);
            width: 44px;
            height: 44px;
            border-radius: 14px;
            font-size: 1.05rem;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            transition: transform 0.2s ease;
        }

        #emojiButton:hover,
        #attachButton:hover,
        #sendButton:hover {
            transform: translateY(-1px);
        }

        @media (max-width: 640px) {
            .thread-header {
                grid-template-columns: auto 1fr auto;
            }
            .thread-header .header-avatar {
                display: none;
            }
            .header-actions {
                gap: 6px;
            }
            .thread-header button {
                padding: 10px;
            }
        }
    </style>
</head>
<body>
    <div class="chat-shell">
        <header class="thread-header">
            <button type="button" id="backButton">
                <i class="ri-arrow-left-line"></i>
            </button>
            <div class="header-avatar" id="headerAvatar">
                <img src="<?= htmlspecialchars($counterparty['avatar'] ?: $listing['image'] ?: 'https://images.unsplash.com/photo-1618005198919-d3d4b5a92eee?auto=format&fit=crop&w=120&q=80', ENT_QUOTES) ?>" alt="Profile photo">
            </div>
            <div class="header-details">
                <h1 id="chatTitle"><?= htmlspecialchars($counterparty['name'] ?: ($role === 'buyer' ? 'Vendor' : 'Buyer')) ?></h1>
                <p id="chatSubtitle"><?= htmlspecialchars($listing['title'] ?: 'Marketplace listing') ?></p>
            </div>
            <div class="header-actions">
                <button type="button" id="infoButton">
                    <i class="ri-information-line"></i>
                </button>
                <button type="button" id="deleteChatBtn" class="danger" aria-label="Delete conversation">
                    <i class="ri-delete-bin-6-line"></i>
                </button>
            </div>
        </header>
        <div id="offlineBanner">You are offline. Messages will send when you're back online.</div>
        <main class="thread-main">
            <div id="typingBanner">
                <i class="ri-chat-3-line"></i>
                <span>Typing...</span>
            </div>
            <section id="messageList" class="message-list" aria-live="polite"></section>
            <button type="button" id="scrollToBottom" class="scroll-bottom">
                <i class="ri-arrow-down-line"></i>
                New messages
            </button>
        </main>
        <footer class="composer">
            <div id="attachmentPreview" hidden></div>
            <div class="composer-controls">
                <button type="button" id="emojiButton"><i class="ri-emotion-line"></i></button>
                <textarea id="messageInput" rows="1" placeholder="Write a message..." aria-label="Message"></textarea>
                <input type="file" accept="image/*" id="imageInput" hidden>
                <button type="button" id="attachButton"><i class="ri-attachment-2"></i></button>
                <button type="button" id="sendButton" data-mode="voice"><i class="ri-mic-line"></i></button>
            </div>
            <p id="prefillNotice" class="prefill-notice" hidden>
                <i class="ri-edit-2-line" aria-hidden="true"></i>
                <span>We added your message from the product page so you can keep chatting here.</span>
            </p>
        </footer>
    </div>
    <script>
        window.__CHAT_THREAD__ = <?= json_encode($bootstrap, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES); ?>;
    </script>
    <script src="theme-manager.js" defer></script>
    <script type="module" src="chat.js"></script>
</body>
</html>
