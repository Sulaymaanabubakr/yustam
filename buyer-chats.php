<?php
require_once __DIR__ . '/session-path.php';
session_start();

require_once __DIR__ . '/buyer-storage.php';
require_once __DIR__ . '/cometchat.php';

if (!isset($_SESSION['buyer_id'])) {
    header('Location: buyer-login.php');
    exit;
}

$buyerId = (int)($_SESSION['buyer_id'] ?? 0);
$buyer = yustam_buyers_find($buyerId);
$buyer = $buyer ? yustam_buyers_ensure_uid($buyer) : null;

if (!$buyer) {
    session_destroy();
    header('Location: buyer-login.php');
    exit;
}

$buyerName = trim((string)($buyer['name'] ?? ($_SESSION['buyer_name'] ?? 'Buyer')));
if ($buyerName === '') {
    $buyerName = 'Buyer';
}
$_SESSION['buyer_name'] = $buyerName;

$buyerUid = trim((string)($buyer['buyer_uid'] ?? ($_SESSION['buyer_uid'] ?? '')));
if ($buyerUid === '') {
    $buyerUid = sprintf('YUSTAM-BYR-%04d', (int)($buyer['id'] ?? $buyerId));
}
$_SESSION['buyer_uid'] = $buyerUid;
$_SESSION['yustam_uid'] = $buyerUid;
$_SESSION['yustam_role'] = 'buyer';

$buyerAvatar = trim((string)($buyer['avatar'] ?? $buyer['profile_photo'] ?? ''));

yustam_cometchat_call_internal_endpoint(
    $buyerUid,
    $buyerName,
    'buyer',
    $buyerAvatar !== '' ? $buyerAvatar : null
);

$uidJson = json_encode($buyerUid, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
    <title>Buyer Messages | YUSTAM Marketplace</title>
    <style>
        :root {
            color-scheme: light dark;
        }

        html, body {
            margin: 0;
            padding: 0;
            height: 100%;
            background: #0b0b0b;
            font-family: "Inter", system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
        }

        .chat-shell {
            position: fixed;
            inset: 0;
            display: flex;
            flex-direction: column;
        }

        .chat-frame {
            flex: 1 1 auto;
            width: 100%;
            border: none;
            display: block;
        }

        .chat-fallback {
            flex: 1 1 auto;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 32px;
            text-align: center;
            color: #0f6a53;
            background: rgba(255, 255, 255, 0.92);
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
                console.warn('Unable to persist buyer uid in localStorage', error);
            }
            try {
                sessionStorage.setItem('yustam_uid', uid);
            } catch (error) {
                console.warn('Unable to persist buyer uid in sessionStorage', error);
            }
        })();
    </script>
    <iframe
        class="chat-frame"
        src="/chats/index.html"
        title="YUSTAM Buyer Chats"
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
