<?php
require_once __DIR__ . '/session-path.php';
session_start();

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/verification-badge.php';

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

$planValue = '';
foreach (['plan', 'subscription_plan', 'current_plan', 'plan_name', 'package'] as $planColumn) {
    if (isset($vendor[$planColumn]) && trim((string)$vendor[$planColumn]) !== '') {
        $planValue = (string) $vendor[$planColumn];
        break;
    }
}
$planSlug = yustam_verification_plan_slug($planValue);
$planLabel = yustam_verification_plan_label($planValue);

$verificationValue = null;
foreach (['verification_status', 'verification_state', 'kyc_status', 'verification_stage', 'verified'] as $statusColumn) {
    if (array_key_exists($statusColumn, $vendor)) {
        $verificationValue = $vendor[$statusColumn];
        break;
    }
}
$isVerifiedVendor = yustam_is_verified_state($verificationValue ?? $vendor['verified'] ?? null);
$verificationBadge = yustam_render_verification_badge(
    $planValue,
    $isVerifiedVendor,
    [
        'role_label' => $planLabel,
    ]
);

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
        'plan' => $planValue,
        'plan_slug' => $planSlug,
        'plan_label' => $planLabel,
        'verified' => $isVerifiedVendor,
        'verification_state' => yustam_verification_state_from_value($verificationValue ?? null),
    ],
];
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Vendor Messages | YUSTAM Marketplace</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="verification-badges.css">
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

        .header-title {
            display: flex;
            flex-direction: column;
            gap: 6px;
        }

        header h1 {
            margin: 0;
            font-size: clamp(1.7rem, 4vw, 2.3rem);
            font-weight: 700;
            color: #fff;
            letter-spacing: 0.02em;
        }

        .vendor-identity {
            display: inline-flex;
            align-items: center;
            gap: 10px;
            font-size: 0.95rem;
            color: rgba(255, 255, 255, 0.78);
        }

        .vendor-identity .verification-badge {
            margin-left: 6px;
        }

        .vendor-plan-label {
            padding: 4px 10px;
            border-radius: 999px;
            background: rgba(246, 183, 60, 0.16);
            color: #f6d48f;
            font-size: 0.78rem;
            text-transform: uppercase;
            letter-spacing: 0.06em;
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
            grid-template-columns: 48px 1fr;
            align-items: center;
            gap: 12px;
            padding: 12px 16px;
            border-radius: 16px;
            background: rgba(15, 106, 83, 0.08);
            border: 1px solid rgba(246, 183, 60, 0.18);
            backdrop-filter: blur(18px);
            min-height: 68px;
            cursor: pointer;
            transition: transform 0.2s ease, box-shadow 0.2s ease, border 0.2s ease;
        }

        .chat-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 18px 32px rgba(0, 0, 0, 0.32);
            border-color: rgba(246, 183, 60, 0.35);
        }

        .chat-avatar {
            width: 48px;
            height: 48px;
            border-radius: 12px;
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
            color: #fdf6dd;
        }

        .chat-time {
            margin-left: auto;
            font-size: 0.78rem;
            color: rgba(255, 255, 255, 0.68);
            font-weight: 500;
        }

        .chat-header .badge {
            margin-left: 8px;
        }

        .chat-listing {
            font-size: 0.82rem;
            color: rgba(255, 255, 255, 0.58);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .chat-preview {
            font-size: 0.86rem;
            color: rgba(255, 255, 255, 0.88);
            display: inline-flex;
            align-items: center;
            gap: 6px;
        }

        .chat-preview i {
            font-size: 1rem;
            color: #f6b73c;
        }

        .typing-indicator {
            color: #f6b73c;
            font-weight: 600;
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
            background: rgba(7, 13, 12, 0.78);
            backdrop-filter: blur(18px);
            z-index: 1000;
            color: #fdf6dd;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            font-weight: 600;
        }

        .loading-overlay[hidden] {
            display: none;
        }

        .loading-overlay .spinner {
            width: 54px;
            height: 54px;
            border-radius: 50%;
            border: 4px solid rgba(246, 183, 60, 0.28);
            border-top-color: #f6b73c;
            animation: spin 1s linear infinite;
        }

        .loading-overlay p {
            margin: 0;
            font-size: 0.82rem;
            opacity: 0.9;
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
<body class="is-loading" data-vendor-name="<?= htmlspecialchars($vendorName, ENT_QUOTES, 'UTF-8'); ?>" data-vendor-plan="<?= htmlspecialchars($planValue, ENT_QUOTES, 'UTF-8'); ?>" data-vendor-plan-label="<?= htmlspecialchars($planLabel, ENT_QUOTES, 'UTF-8'); ?>" data-vendor-plan-slug="<?= htmlspecialchars($planSlug, ENT_QUOTES, 'UTF-8'); ?>" data-vendor-verified="<?= $isVerifiedVendor ? 'verified' : 'unverified'; ?>">
    <div class="loading-overlay" id="loadingOverlay">
        <div class="spinner" aria-hidden="true"></div>
        <p>Loading messages.</p>
    </div>
    <header class="chat-header">
        <div class="header-title">
            <h1>Messages</h1>
            <p class="vendor-identity">
                <span id="currentVendorName"><?= htmlspecialchars($vendorName, ENT_QUOTES, 'UTF-8'); ?></span>
                <?= $verificationBadge; ?>
                <span class="vendor-plan-label"><?= htmlspecialchars($planLabel, ENT_QUOTES, 'UTF-8'); ?></span>
            </p>
        </div>
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







