<?php
require_once __DIR__ . '/session-path.php';
session_start();

require_once __DIR__ . '/db.php';

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

$chatBootstrap = [
    'role' => 'vendor',
    'vendor' => [
        'uid' => $vendorUid,
        'name' => $vendorName,
        'avatar' => $avatar,
    ],
];
$chatBootstrapJson = json_encode($chatBootstrap, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
?>
<!DOCTYPE html>
<html lang="en" data-theme="vendor-chat">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
    <title>Inbox | YUSTAM Vendor</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/remixicon@4.2.0/fonts/remixicon.css">
    <style>
        :root {
            color-scheme: dark;
            --emerald: #00312a;
            --emerald-strong: rgba(0, 49, 42, 0.88);
            --emerald-soft: rgba(0, 49, 42, 0.55);
            --orange: #f3731e;
            --ink: rgba(255, 255, 255, 0.88);
            --muted: rgba(255, 255, 255, 0.62);
            --bubble: rgba(0, 0, 0, 0.35);
            --glass-bg: rgba(10, 44, 37, 0.72);
            --glass-border: rgba(255, 255, 255, 0.15);
        }

        * {
            box-sizing: border-box;
        }

        body {
            margin: 0;
            min-height: 100vh;
            background: radial-gradient(circle at 0% 0%, rgba(0, 49, 42, 0.92), rgba(0, 19, 16, 0.92));
            font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
            color: var(--ink);
            display: flex;
            flex-direction: column;
            padding: env(safe-area-inset-top, 20px) env(safe-area-inset-right, 20px) env(safe-area-inset-bottom, 20px) env(safe-area-inset-left, 20px);
        }

        header {
            position: sticky;
            top: 0;
            z-index: 12;
            background: var(--glass-bg);
            backdrop-filter: blur(18px);
            border-radius: 28px;
            padding: 20px 24px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            box-shadow: 0 26px 44px rgba(0, 0, 0, 0.28);
            margin-bottom: 18px;
            border: 1px solid var(--glass-border);
        }

        header h1 {
            font-size: 1.3rem;
            font-weight: 700;
            margin: 0;
        }

        header span {
            color: var(--muted);
            font-size: 0.92rem;
        }

        .chat-grid {
            flex: 1;
            display: flex;
            flex-direction: column;
            gap: 14px;
        }

        .chat-card {
            display: grid;
            grid-template-columns: auto 1fr auto;
            align-items: center;
            gap: 14px;
            padding: 16px 22px;
            border-radius: 24px;
            background: rgba(12, 52, 44, 0.78);
            border: 1px solid var(--glass-border);
            box-shadow: 0 20px 38px rgba(0, 0, 0, 0.24);
            cursor: pointer;
            transition: transform 180ms ease, box-shadow 180ms ease;
        }

        .chat-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 26px 48px rgba(0, 0, 0, 0.36);
        }

        .chat-avatar {
            width: 56px;
            height: 56px;
            border-radius: 18px;
            overflow: hidden;
            background: linear-gradient(135deg, rgba(243, 115, 30, 0.4), rgba(0, 86, 75, 0.32));
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
            gap: 5px;
            min-width: 0;
        }

        .chat-content strong {
            font-size: 1.05rem;
            font-weight: 600;
            color: var(--ink);
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .chat-content small {
            color: var(--muted);
            font-size: 0.85rem;
        }

        .chat-meta {
            display: flex;
            flex-direction: column;
            align-items: flex-end;
            gap: 6px;
        }

        .badge {
            background: linear-gradient(135deg, #f3731e, #ff9a54);
            color: #111;
            font-weight: 700;
            font-size: 0.78rem;
            padding: 4px 10px;
            border-radius: 999px;
            box-shadow: 0 18px 36px rgba(243, 115, 30, 0.45);
        }

        .typing-indicator {
            color: #ffb77a;
            font-weight: 600;
            font-size: 0.82rem;
        }

        .chat-list-empty {
            margin: auto;
            padding: 52px 34px;
            text-align: center;
            background: rgba(11, 45, 38, 0.78);
            border-radius: 26px;
            border: 1px dashed rgba(255, 255, 255, 0.18);
            color: var(--muted);
            max-width: 380px;
        }

        .fab {
            position: fixed;
            right: 24px;
            bottom: calc(24px + env(safe-area-inset-bottom, 0px));
            width: 64px;
            height: 64px;
            border-radius: 32px;
            border: 1px solid rgba(255, 255, 255, 0.24);
            background: rgba(255, 255, 255, 0.1);
            color: #fff;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.6rem;
            backdrop-filter: blur(16px);
            box-shadow: 0 22px 44px rgba(0, 0, 0, 0.3);
            cursor: pointer;
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
            background: rgba(243, 115, 30, 0.9);
            color: #111;
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
                max-width: 760px;
                margin: 0 auto;
            }
        }
    </style>
</head>
<body>
<header>
    <div>
        <h1>Inbox</h1>
        <span><?= htmlspecialchars($vendorName, ENT_QUOTES, 'UTF-8'); ?></span>
    </div>
    <button class="fab" id="newChatBtn" aria-label="View listings">
        <i class="ri-store-2-line"></i>
    </button>
</header>
<main class="chat-grid" id="chatList" role="list"></main>
<div class="chat-list-empty" id="emptyState" hidden>
    <h2>No chats yet</h2>
    <p>Your buyer conversations will appear here in real time.</p>
</div>
<script>
    window.__CHAT_BOOTSTRAP__ = <?= $chatBootstrapJson ?: 'null'; ?>;
</script>
<script type="module" src="./vendor-chats.js"></script>
</body>
</html>
