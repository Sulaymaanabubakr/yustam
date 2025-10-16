<?php
require_once __DIR__ . '/session-path.php';
session_start();

$buyerNumericId = isset($_SESSION['buyer_id']) ? trim((string) $_SESSION['buyer_id']) : '';
$buyerUidSession = isset($_SESSION['buyer_uid']) ? trim((string) $_SESSION['buyer_uid']) : '';
$buyerName = isset($_SESSION['buyer_name']) ? trim((string) $_SESSION['buyer_name']) : 'Buyer';

$vendorNumericId = isset($_SESSION['vendor_id']) ? trim((string) $_SESSION['vendor_id']) : '';
$vendorUidSession = isset($_SESSION['vendor_uid']) ? trim((string) $_SESSION['vendor_uid']) : '';
$vendorName = isset($_SESSION['vendor_name']) ? trim((string) $_SESSION['vendor_name']) : 'Vendor';

$buyerUidParam = isset($_GET['buyerUid']) ? trim((string) $_GET['buyerUid']) : '';
if ($buyerUidParam === '' && isset($_GET['buyerId'])) {
    $buyerUidParam = trim((string) $_GET['buyerId']);
}

$vendorUidParam = isset($_GET['vendorUid']) ? trim((string) $_GET['vendorUid']) : '';
if ($vendorUidParam === '' && isset($_GET['vendorId'])) {
    $vendorUidParam = trim((string) $_GET['vendorId']);
}

$productId = isset($_GET['productId']) ? trim((string) $_GET['productId']) : '';
$productTitle = isset($_GET['productTitle']) ? trim((string) $_GET['productTitle']) : 'Marketplace Listing';
$productImage = isset($_GET['productImage']) ? trim((string) $_GET['productImage']) : '';

$currentRole = 'guest';
$currentUserName = 'Guest';
$currentUserId = '';
$counterpartyRole = '';
$counterpartyName = '';

$buyerUid = $buyerUidParam !== '' ? $buyerUidParam : ($buyerUidSession !== '' ? $buyerUidSession : $buyerNumericId);
$vendorUid = $vendorUidParam !== '' ? $vendorUidParam : ($vendorUidSession !== '' ? $vendorUidSession : $vendorNumericId);

if ($buyerUid !== '') {
    $currentRole = 'buyer';
    $currentUserId = $buyerUid;
    $currentUserName = $buyerName ?: 'Buyer';
    $counterpartyRole = 'vendor';
    $counterpartyName = $vendorName ?: 'Vendor';
}
if (isset($_SESSION['vendor_id']) || $vendorUidSession !== '') {
    $currentRole = 'vendor';
    $currentUserId = $vendorUid !== '' ? $vendorUid : ($vendorNumericId !== '' ? $vendorNumericId : $vendorUidSession);
    $currentUserName = $vendorName ?: 'Vendor';
    $counterpartyRole = 'buyer';
    $counterpartyName = $buyerName ?: 'Buyer';
}

if ($currentRole === 'vendor' && $buyerUidParam !== '') {
    $counterpartyName = $buyerName ?: 'Buyer';
    $buyerUid = $buyerUidParam;
}
if ($currentRole === 'buyer' && $vendorUidParam !== '') {
    $counterpartyName = $vendorName ?: 'Vendor';
    $vendorUid = $vendorUidParam;
}

if ($currentRole === 'guest' && $buyerUid !== '') {
    $currentRole = 'buyer';
    $currentUserId = $buyerUid;
    $currentUserName = $buyerName ?: 'Buyer';
    $counterpartyRole = 'vendor';
    $counterpartyName = $vendorName ?: 'Vendor';
}
if ($currentRole === 'guest' && $vendorUid !== '') {
    $currentRole = 'vendor';
    $currentUserId = $vendorUid;
    $currentUserName = $vendorName ?: 'Vendor';
    $counterpartyRole = 'buyer';
    $counterpartyName = $buyerName ?: 'Buyer';
}

$chatId = isset($_GET['chatId']) ? trim((string) $_GET['chatId']) : '';
if ($chatId === '' && $buyerUid !== '' && $vendorUid !== '' && $productId !== '') {
    $chatId = $buyerUid . '_' . $vendorUid . '_' . $productId;
}

$participantName = isset($_GET['participantName']) ? trim((string) $_GET['participantName']) : '';
if ($participantName !== '') {
    $counterpartyName = $participantName;
}

$defaultAvatar = 'https://images.unsplash.com/photo-1487412720507-629e7c0b5529?auto=format&fit=crop&w=240&q=80';
$productImage = $productImage !== '' ? $productImage : 'https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?auto=format&fit=crop&w=400&q=80';
?>
<!DOCTYPE html>
<html lang="en" data-role="<?= htmlspecialchars($currentRole, ENT_QUOTES, 'UTF-8'); ?>">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Conversation | YUSTAM Marketplace</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Anton&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <link href="https://cdn.jsdelivr.net/npm/remixicon@4.2.0/fonts/remixicon.css" rel="stylesheet">
    <style>
        :root {
            --emerald: #004D40;
            --emerald-soft: rgba(0, 77, 64, 0.65);
            --orange: #F3731E;
            --beige: #EADCCF;
            --white: #ffffff;
            --ink: rgba(17, 17, 17, 0.92);
            --bubble-radius: 20px;
            --glass: rgba(255, 255, 255, 0.68);
            --shadow-soft: 0 18px 45px rgba(0, 0, 0, 0.18);
        }

        *, *::before, *::after {
            box-sizing: border-box;
        }

        body {
            margin: 0;
            font-family: 'Inter', system-ui, sans-serif;
            background: radial-gradient(circle at top, rgba(234, 220, 207, 0.82), rgba(255, 255, 255, 0.94));
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            color: var(--ink);
        }

        html[data-role="vendor"] body {
            background: linear-gradient(160deg, rgba(0, 77, 64, 0.92), rgba(0, 128, 106, 0.88));
            color: var(--white);
        }

        .chat-surface {
            flex: 1;
            display: flex;
            flex-direction: column;
            width: min(960px, 100%);
            margin: 0 auto;
            backdrop-filter: blur(18px);
            background: rgba(255, 255, 255, 0.14);
        }

        html[data-role="vendor"] .chat-surface {
            background: rgba(0, 0, 0, 0.28);
        }

        .chat-header {
            position: sticky;
            top: 0;
            z-index: 50;
            display: grid;
            grid-template-columns: auto 1fr auto;
            gap: 16px;
            align-items: center;
            padding: clamp(16px, 3vw, 24px);
            background: rgba(255, 255, 255, 0.58);
            backdrop-filter: blur(20px);
            border-bottom: 1px solid rgba(0, 0, 0, 0.06);
        }

        html[data-role="vendor"] .chat-header {
            background: rgba(0, 0, 0, 0.38);
            border-bottom-color: rgba(255, 255, 255, 0.16);
        }

        .back-link {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 44px;
            height: 44px;
            border-radius: 16px;
            color: inherit;
            text-decoration: none;
            background: rgba(0, 0, 0, 0.06);
            box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.28);
            transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .back-link:hover {
            transform: translateY(-2px);
            box-shadow: inset 0 0 0 2px rgba(243, 115, 30, 0.6);
        }

        html[data-role="vendor"] .back-link {
            background: rgba(255, 255, 255, 0.08);
            box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.26);
        }

        .chat-partner {
            display: flex;
            align-items: center;
            gap: 16px;
        }

        .chat-partner img {
            width: 54px;
            height: 54px;
            border-radius: 18px;
            object-fit: cover;
            box-shadow: 0 16px 32px rgba(0, 0, 0, 0.2);
        }

        .partner-meta {
            display: flex;
            flex-direction: column;
            gap: 6px;
        }

        .partner-meta h1 {
            margin: 0;
            font-family: 'Anton', sans-serif;
            font-size: clamp(1.3rem, 4vw, 1.8rem);
            letter-spacing: 0.06em;
        }

        .partner-status {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            font-size: 0.88rem;
            opacity: 0.78;
        }

        .partner-product {
            display: inline-flex;
            align-items: center;
            gap: 12px;
            background: rgba(255, 255, 255, 0.72);
            padding: 10px 16px;
            border-radius: 16px;
            box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.08);
        }

        .partner-product img {
            width: 44px;
            height: 44px;
            border-radius: 14px;
            object-fit: cover;
        }

        .partner-product span {
            font-size: 0.9rem;
            font-weight: 600;
            color: rgba(0, 0, 0, 0.8);
        }

        html[data-role="vendor"] .partner-product {
            background: rgba(255, 255, 255, 0.16);
            color: var(--white);
            box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.16);
        }

        html[data-role="vendor"] .partner-product span {
            color: rgba(255, 255, 255, 0.92);
        }

        .message-stream {
            flex: 1;
            padding: 32px clamp(16px, 6vw, 64px) clamp(120px, 20vh, 220px);
            overflow-y: auto;
            display: flex;
            flex-direction: column;
            gap: 18px;
        }

        .message-bubble {
            max-width: min(76%, 520px);
            padding: 14px 18px;
            border-radius: var(--bubble-radius);
            background: rgba(255, 255, 255, 0.92);
            color: rgba(17, 17, 17, 0.92);
            box-shadow: 0 18px 40px rgba(0, 0, 0, 0.08);
            display: inline-flex;
            flex-direction: column;
            gap: 12px;
            animation: bubble-in 0.35s ease forwards;
        }

        .message-bubble.incoming {
            align-self: flex-start;
            border-bottom-left-radius: 6px;
        }

        .message-bubble.outgoing {
            align-self: flex-end;
            border-bottom-right-radius: 6px;
            background: linear-gradient(135deg, rgba(0, 77, 64, 0.92), rgba(0, 128, 108, 0.92));
            color: var(--white);
        }

        html[data-role="vendor"] .message-bubble.outgoing {
            background: linear-gradient(135deg, rgba(243, 115, 30, 0.92), rgba(223, 90, 10, 0.92));
        }

        .message-text {
            margin: 0;
            line-height: 1.55;
            font-size: 0.98rem;
            word-break: break-word;
        }

        .message-image img {
            max-width: 260px;
            border-radius: 14px;
            box-shadow: 0 12px 32px rgba(0, 0, 0, 0.18);
        }

        .message-meta {
            display: inline-flex;
            align-items: center;
            gap: 12px;
            font-size: 0.75rem;
            opacity: 0.66;
        }

        .message-bubble.outgoing .message-meta {
            color: rgba(255, 255, 255, 0.76);
        }

        .empty-state {
            align-self: center;
            text-align: center;
            padding: 48px 32px;
            background: rgba(255, 255, 255, 0.7);
            border-radius: 24px;
            color: rgba(0, 0, 0, 0.7);
            max-width: 320px;
            box-shadow: 0 18px 40px rgba(0, 0, 0, 0.1);
        }

        html[data-role="vendor"] .empty-state {
            background: rgba(0, 0, 0, 0.35);
            color: rgba(255, 255, 255, 0.82);
        }

        .empty-state span {
            display: block;
            font-size: 2rem;
            margin-bottom: 12px;
        }

        .empty-state h2 {
            margin: 0 0 10px;
            font-family: 'Anton', sans-serif;
            letter-spacing: 0.08em;
            color: rgba(0, 77, 64, 0.85);
        }

        .empty-state p {
            margin: 0;
            font-size: 0.92rem;
        }

        .composer {
            position: fixed;
            left: 50%;
            bottom: clamp(12px, 4vw, 28px);
            transform: translateX(-50%);
            width: min(920px, calc(100% - 32px));
            display: grid;
            grid-template-columns: auto 1fr auto;
            align-items: center;
            gap: 16px;
            padding: 16px 18px;
            border-radius: 22px;
            background: rgba(255, 255, 255, 0.92);
            box-shadow: var(--shadow-soft);
        }

        html[data-role="vendor"] .composer {
            background: rgba(0, 0, 0, 0.38);
            color: var(--white);
            box-shadow: 0 18px 50px rgba(0, 0, 0, 0.45);
        }

        .composer textarea {
            width: 100%;
            resize: none;
            border: none;
            background: transparent;
            font: inherit;
            min-height: 54px;
            color: inherit;
            outline: none;
        }

        .composer button,
        .composer label {
            width: 46px;
            height: 46px;
            border-radius: 16px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            border: none;
            background: rgba(0, 0, 0, 0.06);
            color: inherit;
            font-size: 1.3rem;
            cursor: pointer;
            transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .composer button:hover,
        .composer label:hover {
            transform: translateY(-1px);
            box-shadow: inset 0 0 0 2px rgba(243, 115, 30, 0.65);
        }

        html[data-role="vendor"] .composer button,
        html[data-role="vendor"] .composer label {
            background: rgba(255, 255, 255, 0.12);
        }

        .composer button.primary {
            background: linear-gradient(135deg, rgba(0, 77, 64, 0.96), rgba(0, 128, 106, 0.86));
            color: var(--white);
        }

        html[data-role="vendor"] .composer button.primary {
            background: linear-gradient(135deg, rgba(243, 115, 30, 0.96), rgba(224, 96, 16, 0.88));
        }

        .composer button.primary.is-loading::after {
            content: '';
            width: 18px;
            height: 18px;
            border-radius: 50%;
            border: 2px solid rgba(255, 255, 255, 0.5);
            border-top-color: var(--white);
            animation: spin 0.9s linear infinite;
        }

        .composer button.primary.is-loading > i {
            display: none;
        }

        .image-preview {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-top: 12px;
            padding: 12px;
            border-radius: 16px;
            background: rgba(0, 77, 64, 0.08);
        }

        .image-preview img {
            width: 72px;
            height: 72px;
            border-radius: 16px;
            object-fit: cover;
        }

        html[data-role="vendor"] .image-preview {
            background: rgba(255, 255, 255, 0.16);
        }

        .typing-indicator {
            display: none;
            align-items: center;
            gap: 10px;
            font-size: 0.86rem;
            padding: 4px 12px;
            border-radius: 14px;
            background: rgba(0, 77, 64, 0.08);
            color: rgba(0, 77, 64, 0.86);
            margin-top: 8px;
        }

        html[data-role="vendor"] .typing-indicator {
            background: rgba(255, 255, 255, 0.18);
            color: rgba(255, 255, 255, 0.8);
        }

        @keyframes bubble-in {
            from {
                opacity: 0;
                transform: translateY(12px) scale(0.98);
            }
            to {
                opacity: 1;
                transform: translateY(0) scale(1);
            }
        }

        @keyframes spin {
            from { transform: rotate(0); }
            to { transform: rotate(360deg); }
        }

        @media (max-width: 720px) {
            .chat-header {
                grid-template-columns: 1fr;
                text-align: center;
            }

            .chat-partner {
                justify-content: center;
            }

            .composer {
                grid-template-columns: 1fr auto;
                row-gap: 12px;
                padding: 18px;
            }

            .composer textarea {
                min-height: 64px;
            }

            .message-stream {
                padding-bottom: 180px;
            }
        }
    </style>
</head>
<body>
    <div
        id="chatApp"
        class="chat-surface"
        data-chat-id="<?= htmlspecialchars($chatId, ENT_QUOTES, 'UTF-8'); ?>"
        data-product-id="<?= htmlspecialchars($productId, ENT_QUOTES, 'UTF-8'); ?>"
        data-product-title="<?= htmlspecialchars($productTitle, ENT_QUOTES, 'UTF-8'); ?>"
        data-product-image="<?= htmlspecialchars($productImage, ENT_QUOTES, 'UTF-8'); ?>"
        data-buyer-uid="<?= htmlspecialchars($buyerUid, ENT_QUOTES, 'UTF-8'); ?>"
        data-buyer-name="<?= htmlspecialchars($buyerName, ENT_QUOTES, 'UTF-8'); ?>"
        data-vendor-uid="<?= htmlspecialchars($vendorUid, ENT_QUOTES, 'UTF-8'); ?>"
        data-vendor-name="<?= htmlspecialchars($vendorName, ENT_QUOTES, 'UTF-8'); ?>"
        data-current-role="<?= htmlspecialchars($currentRole, ENT_QUOTES, 'UTF-8'); ?>"
        data-current-user-id="<?= htmlspecialchars($currentUserId, ENT_QUOTES, 'UTF-8'); ?>"
        data-counterparty-id="<?= htmlspecialchars($currentRole === 'buyer' ? $vendorUid : $buyerUid, ENT_QUOTES, 'UTF-8'); ?>"
        data-counterparty-name="<?= htmlspecialchars($counterpartyName, ENT_QUOTES, 'UTF-8'); ?>"
        data-counterparty-role="<?= htmlspecialchars($counterpartyRole, ENT_QUOTES, 'UTF-8'); ?>"
    >
        <header class="chat-header">
            <a class="back-link" href="<?= $currentRole === 'vendor' ? 'vendor-chats.php' : 'buyer-chats.php'; ?>" aria-label="Back to chats">
                <i class="ri-arrow-left-line" aria-hidden="true"></i>
            </a>
            <div class="chat-partner">
                <img src="<?= htmlspecialchars($productImage ?: $defaultAvatar, ENT_QUOTES, 'UTF-8'); ?>" alt="Product cover">
                <div class="partner-meta">
                    <h1 id="participantNameHeading"><?= htmlspecialchars($counterpartyName, ENT_QUOTES, 'UTF-8'); ?></h1>
                    <div class="partner-status" id="participantStatus">
                        <i class="ri-shield-check-line" aria-hidden="true"></i>
                        Trusted <?= htmlspecialchars(ucfirst($counterpartyRole ?: 'partner'), ENT_QUOTES, 'UTF-8'); ?>
                    </div>
                </div>
            </div>
            <div class="partner-product">
                <img src="<?= htmlspecialchars($productImage, ENT_QUOTES, 'UTF-8'); ?>" alt="Listing">
                <span><?= htmlspecialchars($productTitle, ENT_QUOTES, 'UTF-8'); ?></span>
            </div>
        </header>
        <section id="messageArea" class="message-stream" aria-live="polite" aria-label="Conversation messages"></section>
        <div id="typingIndicator" class="typing-indicator">
            <span class="dot">•</span>
            <span>Typing…</span>
        </div>
    </div>

    <form id="composerForm" class="composer" autocomplete="off">
        <label for="fileInput" title="Send image">
            <i class="ri-image-add-line" aria-hidden="true"></i>
            <input id="fileInput" type="file" accept="image/*" hidden>
        </label>
        <textarea id="messageInput" name="message" placeholder="Write a message…" maxlength="1200"></textarea>
        <button id="sendButton" type="submit" class="primary" aria-label="Send message">
            <i class="ri-send-plane-2-fill" aria-hidden="true"></i>
        </button>
        <div id="imagePreview" class="image-preview" hidden>
            <img id="previewImage" src="" alt="Attachment preview">
            <button type="button" id="removeImage" class="secondary" title="Remove image">
                <i class="ri-close-circle-line" aria-hidden="true"></i>
            </button>
        </div>
    </form>

    <script type="module" src="chat.js"></script>
</body>
</html>
