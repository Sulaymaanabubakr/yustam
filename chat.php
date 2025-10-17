<?php
require_once __DIR__ . '/session-path.php';
session_start();

$buyerUid = isset($_SESSION['buyer_uid']) ? trim((string) $_SESSION['buyer_uid']) : '';
$buyerName = isset($_SESSION['buyer_name']) ? trim((string) $_SESSION['buyer_name']) : 'Buyer';
$buyerAvatar = isset($_SESSION['buyer_avatar']) ? trim((string) $_SESSION['buyer_avatar']) : '';

$vendorUid = isset($_SESSION['vendor_uid']) ? trim((string) $_SESSION['vendor_uid']) : '';
$vendorName = isset($_SESSION['vendor_name']) ? trim((string) $_SESSION['vendor_name']) : 'Vendor';
$vendorAvatar = isset($_SESSION['vendor_logo']) ? trim((string) $_SESSION['vendor_logo']) : '';

require_once __DIR__ . '/chat-storage.php';

$chatParam = isset($_GET['chat']) ? trim((string) $_GET['chat']) : '';
$chatId = '';
$listingId = isset($_GET['listing']) ? trim((string) $_GET['listing']) : '';
$listingTitle = isset($_GET['listing_title']) ? trim((string) $_GET['listing_title']) : 'Listing';
$listingImage = isset($_GET['listing_image']) ? trim((string) $_GET['listing_image']) : '';

if ($chatParam !== '') {
    $chatId = $chatParam;
    $parts = [];
    if (strpos($chatParam, '__') !== false) {
        $parts = explode('__', $chatParam);
    } elseif (strpos($chatParam, '_') !== false) {
        $parts = explode('_', $chatParam);
    }
    if (count($parts) >= 3) {
        $vendorUid = $parts[0] ?: $vendorUid;
        $buyerUid = $parts[1] ?: $buyerUid;
        $listingId = $parts[2] ?: $listingId;
    }
}

if ($listingId === '' && isset($_GET['productId'])) {
    $listingId = trim((string) $_GET['productId']);
}
if ($listingTitle === '' && isset($_GET['productTitle'])) {
    $listingTitle = trim((string) $_GET['productTitle']);
}
if ($listingImage === '' && isset($_GET['productImage'])) {
    $listingImage = trim((string) $_GET['productImage']);
}

$conversationRecord = null;
if ($chatId !== '') {
    try {
        $chatDb = yustam_chat_connection();
        $conversationRecord = yustam_chat_fetch_conversation($chatDb, $chatId);
    } catch (Throwable $exception) {
        error_log('[chat] Unable to load conversation metadata: ' . $exception->getMessage());
    }
    if (is_array($conversationRecord) && !empty($conversationRecord)) {
        if ($vendorUid === '' && !empty($conversationRecord['vendor_uid'])) {
            $vendorUid = (string) $conversationRecord['vendor_uid'];
        }
        if ($buyerUid === '' && !empty($conversationRecord['buyer_uid'])) {
            $buyerUid = (string) $conversationRecord['buyer_uid'];
        }
        if ($listingId === '' && !empty($conversationRecord['product_id'])) {
            $listingId = (string) $conversationRecord['product_id'];
        }
        if (($listingTitle === '' || $listingTitle === 'Listing') && !empty($conversationRecord['product_title'])) {
            $listingTitle = (string) $conversationRecord['product_title'];
        }
        if ($listingImage === '' && !empty($conversationRecord['product_image'])) {
            $listingImage = (string) $conversationRecord['product_image'];
        }
        if (($buyerName === '' || $buyerName === 'Buyer') && !empty($conversationRecord['buyer_name'])) {
            $buyerName = (string) $conversationRecord['buyer_name'];
        }
        if (($vendorName === '' || $vendorName === 'Vendor') && !empty($conversationRecord['vendor_name'])) {
            $vendorName = (string) $conversationRecord['vendor_name'];
        }
    }
}

if ($buyerUid === '' && isset($_GET['buyerUid'])) {
    $buyerUid = trim((string) $_GET['buyerUid']);
}
if ($vendorUid === '' && isset($_GET['vendorUid'])) {
    $vendorUid = trim((string) $_GET['vendorUid']);
}

$currentRole = 'guest';
$currentUid = '';
$currentName = 'Guest';
$counterpartyRole = '';
$counterpartyUid = '';
$counterpartyName = '';

if ($vendorUid !== '' && isset($_SESSION['vendor_id'])) {
    $currentRole = 'vendor';
    $currentUid = $vendorUid;
    $currentName = $vendorName ?: 'Vendor';
    $counterpartyRole = 'buyer';
    $counterpartyUid = $buyerUid;
    $counterpartyName = $buyerName ?: 'Buyer';
}

if ($buyerUid !== '' && isset($_SESSION['buyer_id']) && $currentRole === 'guest') {
    $currentRole = 'buyer';
    $currentUid = $buyerUid;
    $currentName = $buyerName ?: 'Buyer';
    $counterpartyRole = 'vendor';
    $counterpartyUid = $vendorUid;
    $counterpartyName = $vendorName ?: 'Vendor';
}

if ($currentRole === 'guest' && $buyerUid !== '') {
    $currentRole = 'buyer';
    $currentUid = $buyerUid;
    $currentName = $buyerName ?: 'Buyer';
    $counterpartyRole = 'vendor';
    $counterpartyUid = $vendorUid;
    $counterpartyName = $vendorName ?: 'Vendor';
}

if ($currentRole === 'guest' && $vendorUid !== '') {
    $currentRole = 'vendor';
    $currentUid = $vendorUid;
    $currentName = $vendorName ?: 'Vendor';
    $counterpartyRole = 'buyer';
    $counterpartyUid = $buyerUid;
    $counterpartyName = $buyerName ?: 'Buyer';
}

if ($counterpartyRole === 'buyer' && isset($_GET['buyerName'])) {
    $counterpartyName = trim((string) $_GET['buyerName']);
}
if ($counterpartyRole === 'vendor' && isset($_GET['vendorName'])) {
    $counterpartyName = trim((string) $_GET['vendorName']);
}

if ($chatId === '' && $vendorUid !== '' && $buyerUid !== '' && $listingId !== '') {
    $chatId = $vendorUid . '__' . $buyerUid . '__' . $listingId;
}

if ($chatId === '') {
    http_response_code(302);
    header('Location: index.html');
    exit;
}

$pageRoleClass = $currentRole === 'vendor' ? 'chat-page--vendor' : 'chat-page--buyer';

$chatContext = [
    'role' => $currentRole,
];
if ($currentRole === 'buyer') {
    $chatContext['buyer_uid'] = $currentUid;
    $chatContext['buyer_name'] = $currentName;
}
if ($currentRole === 'vendor') {
    $chatContext['vendor_uid'] = $currentUid;
    $chatContext['vendor_name'] = $currentName;
}

$threadContext = [
    'chatId' => $chatId,
    'buyer_uid' => $buyerUid,
    'buyer_name' => $buyerName ?: 'Buyer',
    'vendor_uid' => $vendorUid,
    'vendor_name' => $vendorName ?: 'Vendor',
    'listing_id' => $listingId,
    'listing_title' => $listingTitle ?: 'Listing',
    'listing_image' => $listingImage,
];

$backLink = $currentRole === 'vendor' ? 'vendor-chats.php' : 'buyer-chats.php';
$counterAvatar = $counterpartyRole === 'vendor' ? $vendorAvatar : $buyerAvatar;
$defaultAvatar = 'https://images.unsplash.com/photo-1521120413309-42fb5463e6da?auto=format&fit=crop&w=160&q=80';
?>
<!DOCTYPE html>
<html lang="en" data-role="<?= htmlspecialchars($currentRole, ENT_QUOTES, 'UTF-8'); ?>">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Chat | YUSTAM Marketplace</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <link href="https://cdn.jsdelivr.net/npm/remixicon@4.2.0/fonts/remixicon.css" rel="stylesheet">
    <style>
        :root {
            color-scheme: light;
            font-synthesis: none;
            text-rendering: optimizeLegibility;
        }

        *, *::before, *::after {
            box-sizing: border-box;
        }

        body.chat-page {
            margin: 0;
            min-height: 100vh;
            font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            padding: clamp(12px, 4vw, 32px);
            background: var(--page-bg, linear-gradient(160deg, #eef6f4 0%, #ffffff 65%));
            --accent: #0f9d58;
            --accent-strong: #0b7b46;
            --accent-contrast: #f0fff7;
            --toolbar-bg: linear-gradient(135deg, #22c55e, #0ea36b);
            --toolbar-text: #f0fff7;
            --toolbar-muted: rgba(240, 255, 247, 0.8);
            --surface: rgba(255, 255, 255, 0.9);
            --surface-muted: rgba(255, 255, 255, 0.75);
            --composer-bg: rgba(255, 255, 255, 0.94);
            --composer-border: rgba(15, 23, 42, 0.08);
            --bubble-own: linear-gradient(135deg, #34d399, #059669);
            --bubble-own-text: #eefdf6;
            --bubble-peer: rgba(255, 255, 255, 0.95);
            --bubble-peer-text: #0f172a;
            --bubble-border: rgba(15, 23, 42, 0.06);
            --bubble-buyer: rgba(255, 255, 255, 0.92);
            --bubble-vendor: rgba(240, 249, 255, 0.92);
            --banner-bg: rgba(4, 120, 87, 0.12);
            --banner-text: #03543f;
            --chat-pattern: radial-gradient(circle at top left, rgba(39, 188, 134, 0.08), transparent 55%),
                radial-gradient(circle at bottom right, rgba(59, 130, 246, 0.08), transparent 60%);
        }

        body.chat-page--buyer {
            --page-bg: radial-gradient(circle at top left, rgba(4, 120, 87, 0.12), transparent 60%),
                linear-gradient(160deg, #f0fbf6 0%, #ffffff 70%);
            --toolbar-bg: linear-gradient(135deg, #16c07b, #0f9d58);
            --toolbar-text: #edfff8;
            --toolbar-muted: rgba(226, 255, 244, 0.85);
            --bubble-buyer: rgba(255, 255, 255, 0.96);
            --bubble-vendor: rgba(236, 253, 245, 0.94);
        }

        body.chat-page--vendor {
            --page-bg: radial-gradient(circle at 15% 10%, rgba(26, 86, 219, 0.25), transparent 55%),
                linear-gradient(160deg, #02131b 0%, #04222a 65%);
            --toolbar-bg: linear-gradient(135deg, #38bdf8, #0ea5e9);
            --toolbar-text: #e0f6ff;
            --toolbar-muted: rgba(224, 246, 255, 0.75);
            --accent: #22d3ee;
            --accent-strong: #0ea5e9;
            --accent-contrast: #052e3a;
            --surface: rgba(8, 22, 30, 0.9);
            --surface-muted: rgba(12, 30, 38, 0.85);
            --composer-bg: rgba(8, 22, 30, 0.96);
            --composer-border: rgba(45, 212, 191, 0.18);
            --bubble-own: linear-gradient(135deg, #38d39f, #22d3ee);
            --bubble-own-text: #052e2b;
            --bubble-peer: rgba(13, 28, 40, 0.92);
            --bubble-peer-text: #d1f5f0;
            --bubble-buyer: rgba(14, 42, 56, 0.85);
            --bubble-vendor: rgba(32, 64, 74, 0.88);
            --banner-bg: rgba(34, 211, 238, 0.18);
            --banner-text: #cffafe;
            --chat-pattern: radial-gradient(circle at 80% 15%, rgba(56, 189, 248, 0.16), transparent 55%),
                radial-gradient(circle at 10% 85%, rgba(16, 185, 129, 0.14), transparent 60%);
        }

        .chat-app {
            position: relative;
            width: min(1000px, 100%);
            height: min(900px, 100%);
            display: grid;
            grid-template-rows: auto 1fr auto;
            background: var(--surface);
            border-radius: 28px;
            overflow: hidden;
            border: 1px solid rgba(255, 255, 255, 0.16);
            box-shadow: 0 32px 80px rgba(15, 23, 42, 0.18);
            backdrop-filter: blur(20px);
            color: var(--text-primary);
        }

        .chat-app::before,
        .chat-app::after {
            content: none;
        }

        .chat-app[data-role="vendor"] {
            border: 1px solid rgba(34, 211, 238, 0.25);
            box-shadow: 0 30px 84px rgba(2, 26, 32, 0.55);
        }

        .chat-app > * {
            position: relative;
            z-index: 1;
        }

        .chat-toolbar {
            display: flex;
            align-items: center;
            gap: 18px;
            padding: 18px 24px;
            background: var(--toolbar-bg);
            color: var(--toolbar-text);
            border-bottom: 1px solid rgba(255, 255, 255, 0.08);
            box-shadow: 0 12px 28px rgba(15, 23, 42, 0.12);
        }

        .chat-toolbar .back-button {
            width: 42px;
            height: 42px;
            border-radius: 14px;
            border: 1px solid rgba(255, 255, 255, 0.35);
            background: rgba(255, 255, 255, 0.18);
            color: var(--toolbar-text);
            display: grid;
            place-items: center;
            cursor: pointer;
            transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
        }

        .chat-toolbar .back-button:hover,
        .chat-toolbar .back-button:focus-visible {
            background: rgba(255, 255, 255, 0.28);
            transform: translateY(-1px);
            box-shadow: 0 10px 24px rgba(0, 0, 0, 0.2);
            outline: none;
        }*** End Patch

        .chat-peer {
            display: flex;
            align-items: center;
            gap: 14px;
            min-width: 0;
        }

        .chat-peer .avatar {
            width: 48px;
            height: 48px;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.18);
            border: 2px solid rgba(255, 255, 255, 0.45);
            display: grid;
            place-items: center;
            font-weight: 600;
            color: var(--toolbar-text);
            text-transform: uppercase;
            overflow: hidden;
            font-size: 1.05rem;
        }

        .chat-peer .avatar img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }

        .peer-info {
            min-width: 0;
            display: flex;
            flex-direction: column;
            gap: 3px;
        }

        .peer-info h1 {
            margin: 0;
            font-size: 1.12rem;
            font-weight: 600;
            color: var(--toolbar-text);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .peer-info p {
            margin: 0;
            font-size: 0.88rem;
            color: var(--toolbar-muted);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .toolbar-actions {
            margin-left: auto;
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .toolbar-actions button {
            width: 40px;
            height: 40px;
            border-radius: 14px;
            border: 1px solid rgba(15, 23, 42, 0.08);
            background: rgba(15, 23, 42, 0.05);
            color: var(--text-secondary);
            display: grid;
            place-items: center;
            cursor: pointer;
            transition: transform 0.2s ease, color 0.2s ease, background 0.2s ease;
        }

        .toolbar-actions button:hover,
        .toolbar-actions button:focus-visible {
            transform: translateY(-1px);
            color: var(--accent);
            background: rgba(4, 120, 87, 0.1);
            outline: none;
        }

        .chat-surface {
            position: relative;
            background: var(--surface-muted);
        }

        .chat-body {
            position: relative;
            height: 100%;
            overflow: hidden;
        }

        .chat-body::before {
            content: '';
            position: absolute;
            inset: 0;
            background: var(--chat-pattern);
            opacity: 0.25;
            pointer-events: none;
        }

        .chat-stream {
            position: absolute;
            inset: 0;
            overflow-y: auto;
            padding: 28px 28px 110px;
            display: flex;
            flex-direction: column;
            gap: 16px;
            scroll-behavior: smooth;
            scrollbar-width: thin;
            scrollbar-color: rgba(46, 196, 157, 0.4) transparent;
        }

        .chat-stream::-webkit-scrollbar {
            width: 6px;
        }

        .chat-stream::-webkit-scrollbar-thumb {
            background: rgba(46, 196, 157, 0.45);
            border-radius: 999px;
        }

        .chat-banner {
            position: absolute;
            left: 50%;
            bottom: 28px;
            transform: translate(-50%, 120%);
            border: none;
            padding: 10px 18px;
            border-radius: 999px;
            background: var(--banner-bg);
            color: var(--banner-text);
            font-weight: 600;
            display: inline-flex;
            align-items: center;
            gap: 8px;
            cursor: pointer;
            transition: transform 0.25s ease, opacity 0.25s ease;
            box-shadow: 0 20px 38px rgba(15, 23, 42, 0.2);
        }

        .chat-banner.is-visible {
            transform: translate(-50%, 0);
        }

        .message-row {
            display: flex;
            flex-direction: column;
            gap: 6px;
            max-width: 72%;
        }

        .message-row.is-own {
            margin-left: auto;
            align-items: flex-end;
        }

        .message-bubble {
            position: relative;
            padding: 14px 16px;
            border-radius: 18px;
            background: var(--bubble-peer);
            color: var(--bubble-peer-text);
            border: 1px solid var(--bubble-border);
            box-shadow: 0 16px 38px rgba(15, 23, 42, 0.18);
            display: flex;
            flex-direction: column;
            gap: 10px;
        }

        .message-row.is-own .message-bubble {
            background: var(--bubble-own);
            color: var(--bubble-own-text);
            border-color: rgba(255, 255, 255, 0.18);
        }

        .message-row.is-own .message-meta {
            color: rgba(255, 255, 255, 0.72);
        }

        body.chat-page--buyer .message-row.is-own .message-meta {
            color: rgba(240, 253, 244, 0.8);
        }

        .message-row:not(.is-own) .message-bubble.role-buyer {
            background: var(--bubble-buyer);
            color: var(--bubble-peer-text);
        }

        .message-row:not(.is-own) .message-bubble.role-vendor {
            background: var(--bubble-vendor);
            color: var(--bubble-peer-text);
        }

        .message-text {
            margin: 0;
            font-size: 0.98rem;
            line-height: 1.55;
            white-space: pre-wrap;
            word-break: break-word;
        }

        .message-image {
            border-radius: 18px;
            overflow: hidden;
            max-height: 320px;
            box-shadow: 0 24px 48px rgba(15, 23, 42, 0.22);
        }

        .message-image img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }

        .message-audio {
            display: grid;
            grid-template-columns: auto 1fr auto;
            align-items: center;
            gap: 12px;
        }
        .audio-play {
            width: 42px;
            height: 42px;
            border-radius: 50%;
            border: none;
            background: rgba(255, 255, 255, 0.25);
            color: inherit;
            display: grid;
            place-items: center;
            cursor: pointer;
            box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.35);
            transition: transform 0.2s ease, background 0.2s ease;
        }

        .audio-play:hover,
        .audio-play:focus-visible {
            transform: scale(1.05);
            outline: none;
        }

        .audio-waveform {
            flex: 1;
            width: 100%;
        }

        .audio-progress {
            position: relative;
            height: 4px;
            border-radius: 999px;
            background: rgba(255, 255, 255, 0.28);
            overflow: hidden;
        }

        .audio-progress-bar {
            position: absolute;
            inset: 0 100% 0 0;
            background: rgba(255, 255, 255, 0.65);
            transition: width 0.1s linear;
        }

        .audio-timer {
            font-size: 0.8rem;
            font-variant-numeric: tabular-nums;
            opacity: 0.85;
            min-width: 86px;
            text-align: right;
        }

        .typing-indicator {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            font-size: 0.85rem;
            color: var(--accent-strong);
        }

        .typing-indicator span {
            display: inline-flex;
            gap: 3px;
        }

        .typing-indicator span i {
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background: currentColor;
            opacity: 0.4;
            animation: typingBounce 1s ease-in-out infinite;
        }

        .typing-indicator span i:nth-child(2) {
            animation-delay: 0.15s;
        }

        .typing-indicator span i:nth-child(3) {
            animation-delay: 0.3s;
        }


        .audio-play {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            border: none;
            background: rgba(255, 255, 255, 0.28);
            color: inherit;
            display: grid;
            place-items: center;
            cursor: pointer;
            box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.28);
            transition: transform 0.2s ease;
        }

        .audio-play:hover,
        .audio-play:focus-visible {
            transform: scale(1.05);
            outline: none;
        }

        .audio-progress {
            position: relative;
            height: 4px;
            border-radius: 999px;
            background: rgba(255, 255, 255, 0.24);
            overflow: hidden;
        }

        .audio-progress-bar {
            position: absolute;
            inset: 0 100% 0 0;
            background: rgba(255, 255, 255, 0.65);
            transition: width 0.1s linear;
        }

        .audio-timer {
            font-size: 0.8rem;
            opacity: 0.85;
            min-width: 46px;
            text-align: right;
        }

        .message-meta {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 0.76rem;
            color: rgba(15, 23, 42, 0.55);
        }

        body.chat-page--vendor .message-meta {
            color: rgba(226, 241, 240, 0.75);
        }

        .message-status {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            font-size: 0.76rem;
            color: inherit;
        }

        .message-status i {
            font-size: 0.9rem;
        }

        .message-status.is-read {
            color: #22c55e;
        }

        .toolbar-actions {
            margin-left: auto;
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .toolbar-actions button {
            width: 42px;
            height: 42px;
            border-radius: 14px;
            border: 1px solid rgba(255, 255, 255, 0.3);
            background: rgba(255, 255, 255, 0.18);
            color: var(--toolbar-text);
            display: grid;
            place-items: center;
            cursor: pointer;
            transition: background 0.2s ease, transform 0.2s ease;
        }

        .toolbar-actions button:hover,
        .toolbar-actions button:focus-visible {
            background: rgba(255, 255, 255, 0.3);
            transform: translateY(-1px);
            outline: none;
        }

        .chat-banner {
            position: absolute;
            left: 50%;
            bottom: 28px;
            transform: translate(-50%, 120%);
            border: none;
            padding: 10px 18px;
            border-radius: 999px;
            background: var(--banner-bg);
            color: var(--banner-text);
            font-weight: 600;
            display: inline-flex;
            align-items: center;
            gap: 8px;
            cursor: pointer;
            transition: transform 0.25s ease, opacity 0.25s ease;
            box-shadow: 0 20px 38px rgba(15, 23, 42, 0.2);
        }

        .chat-banner.is-visible {
            transform: translate(-50%, 0);
        }

        .message-divider {
            align-self: center;
            margin: 12px 0;
            padding: 6px 14px;
            border-radius: 999px;
            background: rgba(15, 23, 42, 0.08);
            color: rgba(15, 23, 42, 0.65);
            font-size: 0.78rem;
        }

        body.chat-page--vendor .message-divider {
            background: rgba(34, 211, 238, 0.16);
            color: rgba(207, 250, 254, 0.85);
        }

        .chat-composer {
            padding: 16px 20px 20px;
            background: var(--composer-bg);
            border-top: 1px solid var(--composer-border);
            display: flex;
            flex-direction: column;
            gap: 12px;
        }

        .attachment-row {
            display: flex;
            gap: 12px;
            overflow-x: auto;
            padding: 4px 2px;
        }

        .attachment-card {
            position: relative;
            width: 82px;
            height: 82px;
            border-radius: 18px;
            overflow: hidden;
            background: rgba(15, 23, 42, 0.08);
            box-shadow: 0 12px 28px rgba(15, 23, 42, 0.15);
        }

        .attachment-card img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }

        .attachment-remove {
            position: absolute;
            top: 6px;
            right: 6px;
            width: 22px;
            height: 22px;
            border-radius: 50%;
            border: none;
            background: rgba(0, 0, 0, 0.5);
            color: #ffffff;
            display: grid;
            place-items: center;
            cursor: pointer;
        }

        .attachment-progress {
            position: absolute;
            inset: auto 0 0 0;
            height: 6px;
            background: rgba(34, 197, 94, 0.7);
        }

        .composer-form {
            display: flex;
            align-items: flex-end;
            gap: 12px;
            padding: 12px 16px;
            background: rgba(255, 255, 255, 0.82);
            border-radius: 22px;
            border: 1px solid rgba(15, 23, 42, 0.08);
            box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.4);
        }

        body.chat-page--vendor .composer-form {
            background: rgba(8, 22, 30, 0.92);
            border-color: rgba(34, 211, 238, 0.18);
            box-shadow: inset 0 1px 0 rgba(34, 211, 238, 0.24);
        }

        .composer-form textarea {
            flex: 1;
            min-height: 24px;
            max-height: 120px;
            border: none;
            background: transparent;
            color: inherit;
            font-size: 1rem;
            resize: none;
            outline: none;
        }

        .icon-button {
            width: 42px;
            height: 42px;
            border-radius: 14px;
            border: none;
            display: grid;
            place-items: center;
            cursor: pointer;
            transition: transform 0.2s ease, background 0.2s ease;
        }

        .icon-button.subtle {
            background: rgba(15, 23, 42, 0.05);
            color: rgba(15, 23, 42, 0.65);
        }

        body.chat-page--vendor .icon-button.subtle {
            background: rgba(34, 211, 238, 0.12);
            color: rgba(207, 250, 254, 0.85);
        }

        .icon-button.primary {
            background: linear-gradient(135deg, #22c55e, #0f9d58);
            color: #f0fff7;
            border: none;
            box-shadow: 0 12px 24px rgba(15, 118, 110, 0.28);
        }

        .icon-button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }

        .icon-button:hover:not(:disabled),
        .icon-button:focus-visible:not(:disabled) {
            transform: translateY(-1px);
            outline: none;
        }

        .recording-indicator {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            background: rgba(253, 162, 155, 0.18);
            border: 1px solid rgba(248, 113, 113, 0.4);
            border-radius: 18px;
            padding: 10px 16px;
        }

        body.chat-page--vendor .recording-indicator {
            background: rgba(248, 113, 113, 0.18);
            border-color: rgba(248, 113, 113, 0.4);
        }

        .recording-indicator.is-uploading {
            opacity: 0.6;
        }

        .recording-pill {
            display: inline-flex;
            align-items: center;
            gap: 10px;
            font-weight: 600;
            color: rgba(220, 38, 38, 0.9);
        }

        .recording-dot {
            width: 10px;
            height: 10px;
            border-radius: 50%;
            background: rgba(220, 38, 38, 0.85);
            box-shadow: 0 0 0 6px rgba(220, 38, 38, 0.18);
        }

        .recording-actions {
            display: inline-flex;
            align-items: center;
            gap: 10px;
        }

        .recording-actions button {
            border: none;
            border-radius: 12px;
            padding: 6px 14px;
            font-weight: 600;
            cursor: pointer;
        }

        .recording-actions button.primary {
            background: linear-gradient(135deg, #22c55e, #0ea5e9);
            color: #f0fff7;
        }

        .recording-actions button:not(.primary) {
            background: rgba(15, 23, 42, 0.08);
            color: rgba(15, 23, 42, 0.78);
        }

        body.chat-page--vendor .recording-actions button:not(.primary) {
            background: rgba(34, 211, 238, 0.16);
            color: rgba(207, 250, 254, 0.9);
        }

        .chat-toast-root {
            position: fixed;
            bottom: clamp(16px, 4vw, 32px);
            left: 50%;
            transform: translateX(-50%);
            display: flex;
            flex-direction: column;
            gap: 12px;
            z-index: 9999;
            pointer-events: none;
        }

        .chat-toast {
            background: rgba(15, 23, 42, 0.9);
            color: #ffffff;
            padding: 10px 18px;
            border-radius: 999px;
            opacity: 0;
            transform: translateY(12px);
            transition: opacity 0.26s ease, transform 0.26s ease;
            pointer-events: auto;
        }

        .chat-toast.is-visible {
            opacity: 1;
            transform: translateY(0);
        }

        .icon-button.is-recording {
            background: linear-gradient(135deg, #f97316, #ef4444);
            color: #fff7ed;
            box-shadow: 0 12px 24px rgba(239, 68, 68, 0.25);
        }

        @keyframes typingBounce {
            0%, 80%, 100% {
                transform: translateY(0);
                opacity: 0.3;
            }
            40% {
                transform: translateY(-4px);
                opacity: 1;
            }
        }

        @media (max-width: 768px) {
            body.chat-page {
                padding: 0;
            }

            .chat-app {
                border-radius: 0;
                min-height: 100vh;
            }

            .chat-toolbar {
                padding: 16px;
            }

            .chat-stream {
                padding: 20px 16px 120px;
            }

            .chat-composer {
                padding: 14px 14px 18px;
            }

            .composer-form {
                padding: 10px 12px;
            }
        }
    
</head>
<body class="chat-page <?= htmlspecialchars($pageRoleClass, ENT_QUOTES, 'UTF-8'); ?>">
<div
    class="chat-app"
    id="chat-app"
    data-chat-id="<?= htmlspecialchars($chatId, ENT_QUOTES, 'UTF-8'); ?>"
    data-role="<?= htmlspecialchars($currentRole, ENT_QUOTES, 'UTF-8'); ?>"
    data-current-uid="<?= htmlspecialchars($currentUid, ENT_QUOTES, 'UTF-8'); ?>"
    data-counterparty-uid="<?= htmlspecialchars($counterpartyUid, ENT_QUOTES, 'UTF-8'); ?>"
    data-counterparty-role="<?= htmlspecialchars($counterpartyRole, ENT_QUOTES, 'UTF-8'); ?>"
    data-counterparty-name="<?= htmlspecialchars($counterpartyName, ENT_QUOTES, 'UTF-8'); ?>"
    data-buyer-uid="<?= htmlspecialchars($buyerUid, ENT_QUOTES, 'UTF-8'); ?>"
    data-buyer-name="<?= htmlspecialchars($buyerName, ENT_QUOTES, 'UTF-8'); ?>"
    data-vendor-uid="<?= htmlspecialchars($vendorUid, ENT_QUOTES, 'UTF-8'); ?>"
    data-vendor-name="<?= htmlspecialchars($vendorName, ENT_QUOTES, 'UTF-8'); ?>"
    data-listing-id="<?= htmlspecialchars($listingId, ENT_QUOTES, 'UTF-8'); ?>"
    data-listing-title="<?= htmlspecialchars($listingTitle, ENT_QUOTES, 'UTF-8'); ?>"
    data-listing-image="<?= htmlspecialchars($listingImage, ENT_QUOTES, 'UTF-8'); ?>"
    data-back-link="<?= htmlspecialchars($backLink, ENT_QUOTES, 'UTF-8'); ?>"
>
    <div class="chat-toolbar">
        <button type="button" class="back-button" id="chat-back-button" aria-label="Back to chats">
            <i class="ri-arrow-left-line" aria-hidden="true"></i>
        </button>
        <div class="chat-peer">
            <div class="avatar">
                <?php if ($counterAvatar !== ''): ?>
                    <img src="<?= htmlspecialchars($counterAvatar, ENT_QUOTES, 'UTF-8'); ?>" alt="<?= htmlspecialchars($counterpartyName, ENT_QUOTES, 'UTF-8'); ?>">
                <?php else: ?>
                    <?= htmlspecialchars(substr($counterpartyName, 0, 2) ?: 'YU', ENT_QUOTES, 'UTF-8'); ?>
                <?php endif; ?>
            </div>
            <div class="peer-info">
                <h1 id="participant-name"><?= htmlspecialchars($counterpartyName, ENT_QUOTES, 'UTF-8'); ?></h1>
                <p id="participant-status"><?= htmlspecialchars($listingTitle, ENT_QUOTES, 'UTF-8'); ?></p>
            </div>
        </div>
        <div class="toolbar-actions">
            <button type="button" id="chat-call" aria-label="Call"><i class="ri-phone-line"></i></button>
            <button type="button" id="chat-menu" aria-label="More options"><i class="ri-more-2-line"></i></button>
        </div>
    </div>
    <div class="chat-surface">
        <main class="chat-body" id="chat-body">
            <div class="chat-stream" id="chat-stream"></div>
            <button class="chat-banner" id="new-messages" hidden>
                <i class="ri-arrow-down-s-line" aria-hidden="true"></i>
                <span>New messages</span>
            </button>
        </main>
    </div>
    <div class="chat-composer">
        <div class="recording-indicator" id="recording-indicator" hidden>
            <div class="recording-pill">
                <span class="recording-dot"></span>
                <span class="recording-label">Recording...</span>
                <span class="recording-timer" id="recording-timer">0:00</span>
            </div>
            <div class="recording-actions">
                <button type="button" id="recording-cancel">Cancel</button>
                <button type="button" class="primary" id="recording-send">Send</button>
            </div>
        </div>
        <div class="attachment-row" id="attachment-row" hidden></div>
        <form class="composer-form" id="composer-form" autocomplete="off">
            <label class="icon-button subtle" for="file-input" id="attach-button" aria-label="Attach media">
                <i class="ri-attachment-2"></i>
            </label>
            <input type="file" accept="image/*" id="file-input" multiple hidden>
            <textarea id="message-input" rows="1" placeholder="Message"></textarea>
            <button type="button" class="icon-button subtle" id="record-button" aria-label="Record voice message">
                <i class="ri-mic-line"></i>
            </button>
            <button class="icon-button primary" type="submit" id="send-button" disabled aria-label="Send message">
                <i class="ri-send-plane-2-fill"></i>
            </button>
        </form>
    </div>
</div>
<script>
    window.__CHAT_CONTEXT__ = <?= json_encode($chatContext, JSON_UNESCAPED_SLASHES | JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT); ?>;
    window.__CHAT_THREAD__ = <?= json_encode($threadContext, JSON_UNESCAPED_SLASHES | JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT); ?>;
</script>
<script type="module" src="./chat.js"></script>
</body>
</html>
