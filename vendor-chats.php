<?php
require_once __DIR__ . '/session-path.php';
session_start();

require_once __DIR__ . '/db.php';

if (!isset($_SESSION['vendor_id'])) {
    header('Location: vendor-login.html');
    exit;
}

$vendorId = (int)($_SESSION['vendor_id'] ?? 0);
$conn = get_db_connection();
$vendorTable = defined('YUSTAM_VENDORS_TABLE') && preg_match('/^[A-Za-z0-9_]+$/', YUSTAM_VENDORS_TABLE) ? YUSTAM_VENDORS_TABLE : 'vendors';

$stmt = $conn->prepare(sprintf('SELECT * FROM `%s` WHERE id = ? LIMIT 1', $vendorTable));
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

yustam_vendor_assign_uid_if_missing($conn, $vendor);

$firebaseUid = trim((string)($vendor['firebase_uid'] ?? ($_SESSION['vendor_firebase_uid'] ?? ($_SESSION['firebase_uid'] ?? ''))));
if ($firebaseUid === '') {
    $firebaseUid = trim((string)($vendor['vendor_uid'] ?? ''));
}

$nameColumn = yustam_vendor_name_column();
$vendorName = trim((string)($vendor[$nameColumn] ?? ($_SESSION['vendor_name'] ?? 'Vendor')));
if ($vendorName === '') {
    $vendorName = 'Vendor';
}

$vendorEmail = trim((string)($vendor['email'] ?? ($_SESSION['vendor_email'] ?? '')));
$vendorAvatar = '';
if (yustam_vendor_table_has_column('profile_photo')) {
    $vendorAvatar = trim((string)($vendor['profile_photo'] ?? ''));
} elseif (yustam_vendor_table_has_column('avatar_url')) {
    $vendorAvatar = trim((string)($vendor['avatar_url'] ?? ''));
}

$_SESSION['vendor_name'] = $vendorName;
$_SESSION['vendor_email'] = $vendorEmail;
$_SESSION['vendor_uid'] = $vendor['vendor_uid'] ?? null;
$_SESSION['vendor_firebase_uid'] = $firebaseUid;
$_SESSION['firebase_uid'] = $firebaseUid;
$_SESSION['yustam_uid'] = $firebaseUid;
$_SESSION['yustam_role'] = 'vendor';

$bootstrap = [
    'role' => 'vendor',
    'vendor' => [
        'uid' => $firebaseUid,
        'name' => $vendorName,
        'email' => $vendorEmail,
        'avatar' => $vendorAvatar,
    ],
];
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Buyer Conversations | YUSTAM Marketplace</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
        :root {
            color-scheme: light;
            --charcoal: #0b1110;
            --emerald: #0f6a53;
            --emerald-soft: rgba(15, 106, 83, 0.08);
            --gold: #f6b73c;
            --stone: rgba(255, 255, 255, 0.76);
            --muted: rgba(255, 255, 255, 0.58);
            --border: rgba(255, 255, 255, 0.18);
            --accent: rgba(246, 183, 60, 0.18);
            --surface: rgba(14, 26, 24, 0.92);
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
            background: linear-gradient(135deg, #0b1c19 0%, #03100e 100%);
            color: var(--stone);
            display: flex;
            flex-direction: column;
        }

        header.chat-header {
            padding: clamp(24px, 5vw, 36px) clamp(24px, 7vw, 54px) clamp(16px, 3vw, 24px);
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 16px;
        }

        header h1 {
            margin: 0;
            font-size: clamp(1.7rem, 4vw, 2.3rem);
            font-weight: 700;
            color: #fff;
            letter-spacing: 0.02em;
        }

        .new-chat-btn {
            display: inline-flex;
            align-items: center;
            gap: 10px;
            padding: 12px 18px;
            border-radius: 999px;
            border: 1px solid rgba(246, 183, 60, 0.6);
            background: rgba(246, 183, 60, 0.18);
            color: #f6d48f;
            font-weight: 600;
            font-size: 0.95rem;
            cursor: pointer;
            transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
        }

        .new-chat-btn:hover {
            transform: translateY(-2px);
            background: rgba(246, 183, 60, 0.28);
            box-shadow: 0 18px 32px rgba(246, 183, 60, 0.18);
        }

        main.chat-main {
            flex: 1 1 auto;
            display: flex;
            flex-direction: column;
            gap: 16px;
            padding: 0 clamp(24px, 7vw, 54px) clamp(36px, 7vw, 60px);
        }

        #emptyState {
            background: var(--surface);
            border-radius: 22px;
            padding: clamp(28px, 6vw, 40px);
            text-align: center;
            border: 1px solid var(--border);
            box-shadow: 0 24px 48px rgba(0, 0, 0, 0.4);
        }

        #emptyState h2 {
            margin: 0 0 12px;
            font-size: 1.32rem;
            color: #f6d48f;
        }

        #emptyState p {
            margin: 0;
            color: var(--muted);
            font-size: 0.95rem;
        }

        #chatList {
            display: grid;
            gap: 16px;
        }

        .chat-card {
            display: grid;
            grid-template-columns: 68px 1fr auto;
            gap: 18px;
            padding: 18px 22px;
            border-radius: 20px;
            background: rgba(15, 106, 83, 0.08);
            border: 1px solid rgba(246, 183, 60, 0.18);
            backdrop-filter: blur(18px);
            cursor: pointer;
            transition: transform 0.2s ease, box-shadow 0.2s ease, border 0.2s ease;
        }

        .chat-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 20px 36px rgba(0, 0, 0, 0.35);
            border-color: rgba(246, 183, 60, 0.4);
        }

        .chat-avatar {
            width: 68px;
            height: 68px;
            border-radius: 18px;
            background: rgba(246, 183, 60, 0.12);
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
            display: grid;
            gap: 6px;
        }

        .chat-content strong {
            font-size: 1rem;
            color: #fdf6dd;
        }

        .chat-content small {
            color: rgba(255, 255, 255, 0.65);
            display: block;
            font-size: 0.92rem;
            line-height: 1.4;
        }

        .chat-content small.chat-preview {
            display: inline-flex;
            align-items: center;
            gap: 6px;
        }

        .chat-content small.chat-preview i {
            font-size: 1rem;
            color: var(--emerald);
        }

        .chat-content small.typing-indicator {
            color: #f6b73c;
            font-weight: 600;
        }

        .chat-meta {
            display: grid;
            gap: 10px;
            justify-items: end;
        }

        .chat-meta small {
            color: rgba(255, 255, 255, 0.55);
            font-size: 0.78rem;
        }

        .badge {
            min-width: 28px;
            padding: 4px 8px;
            border-radius: 999px;
            background: rgba(246, 183, 60, 0.85);
            color: #0b1110;
            font-weight: 700;
            font-size: 0.75rem;
            text-align: center;
        }

        @media (max-width: 720px) {
            .chat-card {
                grid-template-columns: 58px 1fr;
            }
            .chat-meta {
                justify-items: start;
                grid-column: 1 / -1;
                gap: 6px;
            }
        }
    </style>
</head>
<body>
    <header class="chat-header">
        <h1>Buyer Conversations</h1>
        <button type="button" class="new-chat-btn" id="newChatBtn">
            <span aria-hidden="true">＋</span>
            Create Outreach
        </button>
    </header>
    <main class="chat-main">
        <section id="emptyState" hidden>
            <h2>No active conversations</h2>
            <p>Respond to buyer enquiries quickly to keep your orders moving.</p>
        </section>
        <section id="chatList" role="list" aria-live="polite"></section>
    </main>
    <script>
        window.__CHAT_BOOTSTRAP__ = <?= json_encode($bootstrap, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES); ?>;
    </script>
    <script src="theme-manager.js" defer></script>
    <script type="module" src="vendor-chats.js"></script>
</body>
</html>
