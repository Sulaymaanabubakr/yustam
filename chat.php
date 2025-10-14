<?php
require_once __DIR__ . '/session-path.php';
session_start();

$currentUserId = $_SESSION['vendor_id'] ?? $_SESSION['buyer_id'] ?? '';
$currentRole = isset($_SESSION['vendor_id']) ? 'vendor' : (isset($_SESSION['buyer_id']) ? 'buyer' : 'guest');
$buyerId = $_GET['buyerId'] ?? ($_SESSION['buyer_id'] ?? '');
$vendorId = $_GET['vendorId'] ?? ($_SESSION['vendor_id'] ?? '');
$productId = $_GET['productId'] ?? '';
$chatId = $_GET['chatId'] ?? '';

if (!$chatId && $vendorId && $buyerId && $productId) {
    $chatId = $vendorId . '_' . $buyerId . '_' . $productId;
}

$participantName = $_GET['participantName'] ?? 'YUSTAM User';
$statusText = $_GET['status'] ?? 'Online';
$productTitle = $_GET['productTitle'] ?? 'Marketplace Listing';
$productImage = $_GET['productImage'] ?? 'https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?auto=format&fit=crop&w=120&q=80';
$coverGradient = 'linear-gradient(135deg, rgba(0,77,64,0.92), rgba(0,77,64,0.88))';
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Chat | YUSTAM Marketplace</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Anton&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <link href="https://cdn.jsdelivr.net/npm/remixicon@4.2.0/fonts/remixicon.css" rel="stylesheet">
    <style>
        :root {
            --emerald: #004D40;
            --orange: #F3731E;
            --beige: #EADCCF;
            --white: #FFFFFF;
            --ink: rgba(17, 17, 17, 0.92);
            --bubble-radius: 18px;
            --glass: rgba(255, 255, 255, 0.72);
        }

        * {
            box-sizing: border-box;
        }

        body {
            margin: 0;
            font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: radial-gradient(circle at top, rgba(234, 220, 207, 0.8), rgba(255, 255, 255, 0.85));
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            color: var(--ink);
        }

        .chat-shell {
            display: flex;
            flex-direction: column;
            min-height: 100vh;
            backdrop-filter: blur(18px);
        }

        .chat-header {
            position: sticky;
            top: 0;
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 12px 18px;
            background: rgba(0, 77, 64, 0.95);
            color: var(--white);
            z-index: 80;
            box-shadow: 0 16px 32px rgba(0, 0, 0, 0.25);
            border-bottom: 3px solid rgba(243, 115, 30, 0.55);
        }

        .chat-header .profile {
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .chat-header .profile img {
            width: 42px;
            height: 42px;
            border-radius: 16px;
            object-fit: cover;
            border: 2px solid rgba(255, 255, 255, 0.55);
            box-shadow: 0 10px 18px rgba(0, 0, 0, 0.25);
        }

        .chat-header button {
            background: rgba(255, 255, 255, 0.16);
            border: none;
            color: var(--white);
            width: 42px;
            height: 42px;
            border-radius: 14px;
            display: grid;
            place-items: center;
            font-size: 1.25rem;
            transition: transform 0.25s ease, background 0.25s ease;
        }

        .chat-header button:hover {
            transform: translateY(-2px);
            background: rgba(255, 255, 255, 0.24);
        }

        .chat-header .profile-info {
            display: flex;
            flex-direction: column;
            gap: 2px;
        }

        .chat-header .profile-info strong {
            font-family: 'Anton', sans-serif;
            letter-spacing: 0.04em;
            font-size: 1.05rem;
        }

        .chat-header .profile-info span {
            font-size: 0.8rem;
            opacity: 0.82;
        }

        .chat-body {
            flex: 1;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            background: linear-gradient(160deg, rgba(234, 220, 207, 0.78), rgba(255, 255, 255, 0.9));
        }

        .message-area {
            flex: 1;
            padding: clamp(14px, 4vw, 26px) clamp(12px, 4vw, 32px);
            overflow-y: auto;
            display: flex;
            flex-direction: column;
            gap: 12px;
        }

        .message-bubble {
            position: relative;
            max-width: min(82%, 520px);
            padding: 12px 14px 18px;
            border-radius: var(--bubble-radius);
            box-shadow: 0 14px 32px rgba(0, 0, 0, 0.14);
            display: grid;
            gap: 8px;
            animation: fadeUp 0.35s ease forwards;
            opacity: 0;
        }

        .message-bubble.incoming {
            align-self: flex-start;
            background: rgba(255, 255, 255, 0.85);
            color: rgba(17, 17, 17, 0.85);
            border: 1px solid rgba(17, 17, 17, 0.08);
        }

        .message-bubble.outgoing {
            align-self: flex-end;
            background: linear-gradient(140deg, rgba(0, 77, 64, 0.95), rgba(0, 118, 100, 0.88));
            color: var(--white);
        }

        .message-text {
            font-size: 0.95rem;
            line-height: 1.45;
            word-break: break-word;
        }

        .message-image {
            border-radius: 16px;
            overflow: hidden;
            max-height: 260px;
            border: 1px solid rgba(255, 255, 255, 0.32);
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
            font-size: 0.72rem;
            opacity: 0.86;
        }

        .message-meta i {
            font-size: 0.82rem;
        }

        .typing-indicator {
            align-self: flex-start;
            background: rgba(255, 255, 255, 0.78);
            border-radius: 18px;
            padding: 10px 16px;
            box-shadow: 0 10px 24px rgba(0, 0, 0, 0.12);
            display: none;
            margin-left: 12px;
            margin-bottom: 10px;
            font-size: 0.86rem;
            color: rgba(17, 17, 17, 0.7);
        }

        .typing-indicator.active {
            display: inline-flex;
            align-items: center;
            gap: 8px;
        }

        .typing-indicator span {
            display: inline-flex;
            gap: 4px;
        }

        .typing-indicator span i {
            animation: blink 1.2s infinite ease-in-out;
        }

        .typing-indicator span i:nth-child(2) {
            animation-delay: 0.2s;
        }

        .typing-indicator span i:nth-child(3) {
            animation-delay: 0.4s;
        }

        .chat-composer {
            padding: 12px clamp(12px, 4vw, 28px) clamp(16px, 5vw, 28px);
            background: rgba(255, 255, 255, 0.68);
            backdrop-filter: blur(14px);
            border-top: 1px solid rgba(0, 0, 0, 0.08);
            display: grid;
            gap: 12px;
        }

        .image-preview {
            display: none;
            background: rgba(255, 255, 255, 0.82);
            border-radius: 18px;
            padding: 10px;
            box-shadow: 0 12px 24px rgba(0, 0, 0, 0.14);
            border: 1px dashed rgba(0, 77, 64, 0.45);
        }

        .image-preview.active {
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .image-preview img {
            width: 72px;
            height: 72px;
            object-fit: cover;
            border-radius: 16px;
        }

        .image-preview button {
            background: rgba(0, 0, 0, 0.08);
            border: none;
            border-radius: 12px;
            width: 36px;
            height: 36px;
            display: grid;
            place-items: center;
            cursor: pointer;
        }

        .composer-row {
            display: grid;
            grid-template-columns: auto 1fr auto;
            gap: 10px;
            align-items: center;
            background: rgba(255, 255, 255, 0.8);
            border-radius: 20px;
            padding: 10px 12px;
            border: 1px solid rgba(0, 0, 0, 0.08);
            box-shadow: 0 14px 28px rgba(0, 0, 0, 0.12);
        }

        .composer-row button,
        .composer-row label {
            width: 44px;
            height: 44px;
            border-radius: 16px;
            display: grid;
            place-items: center;
            border: none;
            background: rgba(234, 220, 207, 0.6);
            color: var(--emerald);
            font-size: 1.15rem;
            cursor: pointer;
            transition: transform 0.24s ease, box-shadow 0.24s ease;
        }

        .composer-row label:hover,
        .composer-row button:hover {
            transform: translateY(-1px);
            box-shadow: 0 8px 18px rgba(0, 0, 0, 0.12);
        }

        .composer-row input[type="text"] {
            border: none;
            background: transparent;
            font-size: 1rem;
            color: var(--ink);
            outline: none;
        }

        .composer-row button.send {
            background: linear-gradient(135deg, var(--orange), #ff8a3c);
            color: var(--white);
            font-size: 1.2rem;
        }

        .hidden-input {
            display: none;
        }

        .empty-state {
            margin: auto;
            text-align: center;
            color: rgba(17, 17, 17, 0.65);
        }

        @keyframes fadeUp {
            from {
                transform: translateY(16px);
                opacity: 0;
            }
            to {
                transform: translateY(0);
                opacity: 1;
            }
        }

        @keyframes blink {
            0%, 80%, 100% { opacity: 0.2; }
            40% { opacity: 1; }
        }

        @media (min-width: 768px) {
            .chat-header {
                padding: 16px 28px;
            }

            .message-area {
                padding: 28px 48px;
            }
        }
    </style>
</head>
<body>
    <div id="chatApp" class="chat-shell" data-chat-id="<?= htmlspecialchars($chatId, ENT_QUOTES, 'UTF-8'); ?>" data-product-id="<?= htmlspecialchars($productId, ENT_QUOTES, 'UTF-8'); ?>" data-product-title="<?= htmlspecialchars($productTitle, ENT_QUOTES, 'UTF-8'); ?>" data-product-image="<?= htmlspecialchars($productImage, ENT_QUOTES, 'UTF-8'); ?>" data-participant-name="<?= htmlspecialchars($participantName, ENT_QUOTES, 'UTF-8'); ?>" data-participant-status="<?= htmlspecialchars($statusText, ENT_QUOTES, 'UTF-8'); ?>" data-current-user-id="<?= htmlspecialchars((string)$currentUserId, ENT_QUOTES, 'UTF-8'); ?>" data-current-role="<?= htmlspecialchars($currentRole, ENT_QUOTES, 'UTF-8'); ?>" data-buyer-id="<?= htmlspecialchars($buyerId, ENT_QUOTES, 'UTF-8'); ?>" data-vendor-id="<?= htmlspecialchars($vendorId, ENT_QUOTES, 'UTF-8'); ?>">
        <header class="chat-header" role="banner">
            <button type="button" aria-label="Go back" onclick="window.history.back()">
                <i class="ri-arrow-left-line" aria-hidden="true"></i>
            </button>
            <div class="profile" role="button" tabindex="0">
                <img src="<?= htmlspecialchars($productImage, ENT_QUOTES, 'UTF-8'); ?>" alt="Product thumbnail">
                <div class="profile-info">
                    <strong><?= htmlspecialchars($participantName, ENT_QUOTES, 'UTF-8'); ?></strong>
                    <span id="participantStatus"><?= htmlspecialchars($statusText, ENT_QUOTES, 'UTF-8'); ?></span>
                </div>
            </div>
            <button type="button" aria-label="Chat options">
                <i class="ri-more-2-fill" aria-hidden="true"></i>
            </button>
        </header>
        <section class="chat-body">
            <div id="messageArea" class="message-area" aria-live="polite"></div>
            <div id="typingIndicator" class="typing-indicator" role="status" aria-live="polite">
                <span>
                    <i class="ri-checkbox-blank-circle-fill"></i>
                    <i class="ri-checkbox-blank-circle-fill"></i>
                    <i class="ri-checkbox-blank-circle-fill"></i>
                </span>
                typing…
            </div>
            <footer class="chat-composer" role="contentinfo">
                <div id="imagePreview" class="image-preview" aria-live="polite">
                    <img src="" alt="Selected preview" id="previewImage">
                    <div>
                        <span style="display:block; font-size:0.8rem; color:rgba(17,17,17,0.65);">Attachment ready</span>
                        <button type="button" id="removeImage" aria-label="Remove image">
                            <i class="ri-close-line"></i>
                        </button>
                    </div>
                </div>
                <form id="composerForm" class="composer-row">
                    <label for="fileInput" aria-label="Attach image">
                        <i class="ri-attachment-2"></i>
                        <input id="fileInput" class="hidden-input" type="file" accept="image/*">
                    </label>
                    <input id="messageInput" type="text" placeholder="Type a message…" autocomplete="off">
                    <button id="sendButton" class="send" type="submit" aria-label="Send message">
                        <i class="ri-send-plane-fill"></i>
                    </button>
                </form>
            </footer>
        </section>
    </div>
    <script type="module" src="firebase.js"></script>
    <script type="module" src="cloudinary.js"></script>
    <script type="module" src="chat.js"></script>
</body>
</html>
