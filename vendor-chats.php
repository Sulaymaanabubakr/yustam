<?php
require_once __DIR__ . '/session-path.php';
session_start();

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/cometchat.php';

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

$vendorUid = yustam_vendor_assign_uid_if_missing($db, $vendor);
$_SESSION['vendor_uid'] = $vendorUid;
$_SESSION['yustam_uid'] = $vendorUid;
$_SESSION['yustam_role'] = 'vendor';

$nameColumn = yustam_vendor_name_column();
$vendorName = trim((string)($vendor[$nameColumn] ?? ($_SESSION['vendor_name'] ?? 'Vendor')));
if ($vendorName === '') {
    $vendorName = 'Vendor';
}
$_SESSION['vendor_name'] = $vendorName;

$avatarField = '';
if (yustam_vendor_table_has_column('profile_photo')) {
    $avatarField = trim((string)($vendor['profile_photo'] ?? ''));
} elseif (yustam_vendor_table_has_column('avatar_url')) {
    $avatarField = trim((string)($vendor['avatar_url'] ?? ''));
}

yustam_cometchat_call_internal_endpoint(
    $vendorUid,
    $vendorName,
    'vendor',
    $avatarField !== '' ? $avatarField : null
);

$uidJson = json_encode($vendorUid, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
    <title>Vendor Messages | YUSTAM Marketplace</title>
    <style>
        :root {
            color-scheme: light dark;
        }

        html, body {
            margin: 0;
            padding: 0;
            height: 100%;
            background: #091815;
            font-family: "Inter", system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
        }

        .chat-frame {
            width: 100%;
            height: 100%;
            border: none;
            display: block;
        }

        .chat-shell {
            position: relative;
            min-height: 100vh;
        }

        .chat-shell::after {
            content: "";
            position: fixed;
            inset: 0;
            background: linear-gradient(180deg, rgba(15, 106, 83, 0.22), transparent 45%);
            pointer-events: none;
            z-index: -1;
        }

        .chat-fallback {
            position: absolute;
            inset: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 32px;
            text-align: center;
            color: #f5f7f9;
            background: rgba(9, 24, 21, 0.9);
        }
    </style>
</head>
<body>
<div class="chat-shell">
    <script>
        (function () {
            var uid = <?php echo $uidJson; ?>;
            if (!uid) return;
            try {
                localStorage.setItem('yustam_uid', uid);
            } catch (error) {
                console.warn('Unable to persist vendor uid in localStorage', error);
            }
            try {
                sessionStorage.setItem('yustam_uid', uid);
            } catch (error) {
                console.warn('Unable to persist vendor uid in sessionStorage', error);
            }
        })();
    </script>
    <iframe
        class="chat-frame"
        src="/chats"
        title="YUSTAM Vendor Chats"
        loading="lazy"
        allow="microphone; camera"
    ></iframe>
    <noscript>
        <div class="chat-fallback">
            <p>Chat requires JavaScript. Enable JavaScript to load the messaging experience.</p>
        </div>
    </noscript>
</div>
</body>
</html>
