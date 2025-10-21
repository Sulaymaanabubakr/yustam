<?php
require_once __DIR__ . '/session-path.php';
session_start();

require_once __DIR__ . '/buyer-storage.php';

if (!isset($_SESSION['buyer_id'])) {
    header('Location: buyer-login.php');
    exit;
}

$buyerId = (int) ($_SESSION['buyer_id'] ?? 0);
$buyer = $buyerId > 0 ? yustam_buyers_find($buyerId) : null;

if (!$buyer) {
    session_destroy();
    header('Location: buyer-login.php');
    exit;
}

$buyer = yustam_buyers_ensure_uid($buyer);

$firebaseUid = trim((string)($buyer['firebase_uid'] ?? ($_SESSION['buyer_firebase_uid'] ?? ($_SESSION['firebase_uid'] ?? ''))));
if ($firebaseUid === '') {
    // As a safety net, fall back to the legacy UID so the customer can continue,
    // even though chats will not function without a Firebase UID.
    $firebaseUid = trim((string)($buyer['buyer_uid'] ?? ''));
}

$buyerName = trim((string)($buyer['name'] ?? ($_SESSION['buyer_name'] ?? 'Buyer')));
if ($buyerName === '') {
    $buyerName = 'Buyer';
}

$buyerEmail = trim((string)($buyer['email'] ?? ($_SESSION['buyer_email'] ?? '')));
$buyerAvatar = trim((string)($buyer['avatar'] ?? $buyer['profile_photo'] ?? ''));

$_SESSION['buyer_name'] = $buyerName;
$_SESSION['buyer_email'] = $buyerEmail;
$_SESSION['buyer_uid'] = $buyer['buyer_uid'] ?? null;
$_SESSION['buyer_firebase_uid'] = $firebaseUid;
$_SESSION['firebase_uid'] = $firebaseUid;
$_SESSION['yustam_uid'] = $firebaseUid;
$_SESSION['yustam_role'] = 'buyer';

$bootstrap = [
    'role' => 'buyer',
    'buyer' => [
        'uid' => $firebaseUid,
        'name' => $buyerName,
        'email' => $buyerEmail,
        'avatar' => $buyerAvatar,
    ],
];
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Buyer Messages | YUSTAM Marketplace</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
        :root {
            color-scheme: light;
            --emerald: #004d40;
            --emerald-soft: rgba(0, 77, 64, 0.08);
            --sunset: #f3731e;
            --stone: rgba(17, 17, 17, 0.72);
            --muted: rgba(17, 17, 17, 0.48);
            --border: rgba(0, 77, 64, 0.12);
            --background: #f5f4f2;
            --white: #ffffff;
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
            color: var(--stone);
            display: flex;
            flex-direction: column;
        }

        header.chat-header {
            padding: clamp(20px, 4vw, 32px) clamp(20px, 6vw, 48px) clamp(12px, 2vw, 20px);
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 16px;
        }

        header h1 {
            margin: 0;
            font-size: clamp(1.6rem, 3vw, 2.1rem);
            font-weight: 700;
            color: var(--emerald);
        }

        .new-chat-btn {
            display: inline-flex;
            align-items: center;
            gap: 10px;
            padding: 12px 18px;
            border-radius: 9999px;
            border: 1px solid var(--emerald);
            background: var(--white);
            color: var(--emerald);
            font-weight: 600;
            font-size: 0.95rem;
            cursor: pointer;
            transition: transform 0.2s ease, box-shadow 0.2s ease, border 0.2s ease;
        }

        .new-chat-btn:hover {
            transform: translateY(-1px);
            box-shadow: 0 12px 24px rgba(0, 77, 64, 0.12);
            border-color: rgba(0, 77, 64, 0.4);
        }

        main.chat-main {
            flex: 1 1 auto;
            display: flex;
            flex-direction: column;
            gap: 16px;
            padding: 0 clamp(20px, 6vw, 48px) clamp(32px, 6vw, 48px);
        }

        #emptyState {
            background: var(--white);
            border-radius: 20px;
            padding: clamp(24px, 5vw, 36px);
            text-align: center;
            box-shadow: 0 20px 40px rgba(15, 106, 83, 0.08);
            border: 1px solid var(--border);
        }

        #emptyState h2 {
            margin: 0 0 12px;
            font-size: 1.3rem;
            color: var(--emerald);
        }

        #emptyState p {
            margin: 0;
            color: var(--muted);
            font-size: 0.95rem;
        }

        #chatList {
            display: grid;
            gap: 12px;
        }

        .chat-card {
            display: grid;
            grid-template-columns: 44px 1fr;
            align-items: center;
            gap: 12px;
            padding: 12px 16px;
            border-radius: 14px;
            background: var(--white);
            border: 1px solid rgba(0, 77, 64, 0.12);
            box-shadow: 0 10px 20px rgba(15, 106, 83, 0.08);
            min-height: 68px;
            cursor: pointer;
            transition: transform 0.2s ease, box-shadow 0.2s ease, border 0.2s ease;
        }

        .chat-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 16px 26px rgba(15, 106, 83, 0.12);
            border-color: rgba(0, 77, 64, 0.24);
        }

        .chat-avatar {
            width: 48px;
            height: 48px;
            border-radius: 12px;
            background: var(--emerald-soft);
            display: grid;
            place-items: center;
            overflow: hidden;
        }

        .chat-avatar img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }

        .chat-content {
            display: flex;
            flex-direction: column;
            gap: 4px;
        }

        .chat-header {
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .chat-header strong {
            flex: 1;
            min-width: 0;
            font-size: 0.98rem;
            color: var(--emerald);
        }

        .chat-time {
            margin-left: auto;
            font-size: 0.78rem;
            color: rgba(0, 77, 64, 0.55);
            font-weight: 500;
        }

        .chat-header .badge {
            margin-left: 8px;
        }

        .chat-listing {
            font-size: 0.82rem;
            color: var(--muted);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .chat-preview {
            font-size: 0.86rem;
            color: var(--stone);
            display: inline-flex;
            align-items: center;
            gap: 6px;
        }

        .chat-preview i {
            font-size: 1rem;
            color: var(--sunset);
        }

        .typing-indicator {
            color: var(--sunset);
            font-weight: 600;
        }
        .badge {
            min-width: 28px;
            padding: 4px 8px;
            border-radius: 999px;
            background: var(--sunset);
            color: #fff;
            font-weight: 600;
            font-size: 0.75rem;
            text-align: center;
        }

        @media (max-width: 640px) {
            .chat-card {
                grid-template-columns: 44px 1fr;
            }
        }

        .loading-overlay {
            position: fixed;
            inset: 0;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 16px;
            background: rgba(245, 244, 242, 0.82);
            backdrop-filter: blur(14px);
            z-index: 1000;
            color: var(--emerald);
            letter-spacing: 0.06em;
            text-transform: uppercase;
            font-weight: 600;
        }

        .loading-overlay[hidden] {
            display: none;
        }

        .loading-overlay .spinner {
            width: 48px;
            height: 48px;
            border-radius: 50%;
            border: 4px solid rgba(0, 77, 64, 0.15);
            border-top-color: var(--emerald);
            animation: spin 1s linear infinite;
        }

        .loading-overlay p {
            margin: 0;
            font-size: 0.82rem;
            opacity: 0.75;
        }

        @keyframes spin {
            to {
                transform: rotate(360deg);
            }
        }

        body.is-loading header,
        body.is-loading .chat-main {
            filter: blur(6px);
            pointer-events: none;
            user-select: none;
        }
    </style>
</head>
<body class="is-loading">
    <div class="loading-overlay" id="loadingOverlay">
        <div class="spinner" aria-hidden="true"></div>
        <p>Loading messages...</p>
    </div>
    <header class="chat-header">
        <h1>Messages</h1>
        <button type="button" class="new-chat-btn" id="newChatBtn">
            <span aria-hidden="true">✧</span>
            Start New Chat
        </button>
    </header>
    <main class="chat-main">
        <section id="emptyState" hidden>
            <h2>No messages yet</h2>
            <p>Start a conversation with a vendor to keep track of your enquiries.</p>
        </section>
        <section id="chatList" role="list" aria-live="polite"></section>
    </main>
    <script>
        window.__CHAT_BOOTSTRAP__ = <?= json_encode($bootstrap, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES); ?>;
    </script>
    <script src="theme-manager.js" defer></script>
    <script type="module" src="buyer-chats.js"></script>
</body>
</html>

