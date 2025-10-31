<?php
require_once __DIR__ . '/session-path.php';
session_start();

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/buyer-storage.php';
require_once __DIR__ . '/api/chat/firebase.php';
require_once __DIR__ . '/verification-badge.php';

if (!isset($_SESSION['buyer_id']) && !isset($_SESSION['vendor_id']) && !isset($_SESSION['yustam_role'])) {
    header('Location: buyer-login.php');
    exit;
}

$db = get_db_connection();
$roleParam = strtolower(trim((string)($_GET['role'] ?? '')));
$role = isset($_SESSION['yustam_role']) ? strtolower((string)$_SESSION['yustam_role']) : null;
if ($roleParam === 'buyer' || $roleParam === 'vendor') {
    $role = $roleParam;
}
if ($role !== 'buyer' && $role !== 'vendor') {
    $role = isset($_SESSION['vendor_id']) ? 'vendor' : 'buyer';
}
$_SESSION['yustam_role'] = $role;

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

function yustam_vendor_plan_meta(array $vendor): array
{
    $planValue = '';
    foreach (['plan', 'subscription_plan', 'current_plan', 'plan_name', 'package'] as $planColumn) {
        if (isset($vendor[$planColumn]) && trim((string) $vendor[$planColumn]) !== '') {
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
    $verificationState = yustam_verification_state_from_value($verificationValue ?? null);
    $isVerified = $verificationState === 'verified';

    return [
        'value' => $planValue,
        'slug' => $planSlug,
        'label' => $planLabel,
        'state' => $verificationState,
        'verified' => $isVerified,
        'badge' => yustam_render_verification_badge($planValue, $isVerified, ['role_label' => $planLabel]),
    ];
}

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
    $viewerMeta = yustam_vendor_plan_meta($vendor);
    $viewer['plan'] = $viewerMeta['value'];
    $viewer['plan_slug'] = $viewerMeta['slug'];
    $viewer['plan_label'] = $viewerMeta['label'];
    $viewer['verified'] = $viewerMeta['verified'];
    $viewer['verification_state'] = $viewerMeta['state'];
    $viewer['verification_badge'] = $viewerMeta['badge'];
}

$chatIdParam = trim((string)($_GET['chat'] ?? ''));
$buyerUidParam = trim((string)($_GET['buyer'] ?? $_GET['buyer_uid'] ?? ''));
$vendorUidParam = trim((string)($_GET['vendor'] ?? $_GET['vendor_uid'] ?? ''));
$listing['id'] = trim((string)($_GET['listing'] ?? $_GET['listing_id'] ?? ''));
$listing['title'] = trim((string)($_GET['listing_title'] ?? ''));
$listing['image'] = trim((string)($_GET['listing_image'] ?? ''));

$buyerUid = $role === 'buyer' ? $viewer['uid'] : $buyerUidParam;
$vendorUid = $role === 'vendor' ? $viewer['uid'] : $vendorUidParam;
$contextIncomplete = false;

if ($buyerUid === '' && $buyerUidParam !== '') {
    $buyerUid = $buyerUidParam;
}
if ($vendorUid === '' && $vendorUidParam !== '') {
    $vendorUid = $vendorUidParam;
}

if ($role === 'buyer' && $viewer['uid'] === '' && $buyerUid !== '') {
    $viewer['uid'] = $buyerUid;
}
if ($role === 'vendor' && $viewer['uid'] === '' && $vendorUid !== '') {
    $viewer['uid'] = $vendorUid;
}
$chatId = $chatIdParam;
$chatSummary = null;

if ($chatId !== '') {
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

if ($buyerUid === '' || $vendorUid === '') {
    $contextIncomplete = true;
}

if ($chatId === '') {
    $chatId = yustam_chat_build_id($buyerUid, $vendorUid);
}

$canSendMessages = !$contextIncomplete && trim((string)($viewer['uid'] ?? '')) !== '';

$vendorRecord = null;
if ($vendorUid !== '') {
    try {
        $vendorRecord = yustam_vendor_find_by_uid($vendorUid, $db);
    } catch (Throwable $vendorLookupError) {
        error_log('chat-thread: unable to lookup vendor by uid: ' . $vendorLookupError->getMessage());
    }
}
$counterpartyMeta = null;
if ($vendorRecord) {
    $counterpartyMeta = yustam_vendor_plan_meta($vendorRecord);
    if ($role === 'buyer') {
        $counterparty['plan'] = $counterpartyMeta['value'];
        $counterparty['plan_slug'] = $counterpartyMeta['slug'];
        $counterparty['plan_label'] = $counterpartyMeta['label'];
        $counterparty['verified'] = $counterpartyMeta['verified'];
        $counterparty['verification_state'] = $counterpartyMeta['state'];
        $counterparty['verification_badge'] = $counterpartyMeta['badge'];
    }
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

$vendorPlanValue = $counterpartyMeta['value'] ?? ($viewer['plan'] ?? '');
$vendorPlanSlug = $counterpartyMeta['slug'] ?? ($viewer['plan_slug'] ?? yustam_verification_plan_slug($vendorPlanValue));
$vendorPlanLabel = $counterpartyMeta['label'] ?? ($viewer['plan_label'] ?? yustam_verification_plan_label($vendorPlanValue));
$vendorVerificationState = $counterpartyMeta['state'] ?? ($viewer['verification_state'] ?? 'unverified');
$vendorVerifiedFlag = $counterpartyMeta['verified'] ?? ($viewer['verified'] ?? false);
$vendorBadgeHtml = $counterpartyMeta['badge'] ?? ($viewer['verification_badge'] ?? yustam_render_verification_badge(
    $vendorPlanValue,
    $vendorVerifiedFlag,
    ['role_label' => $vendorPlanLabel]
));

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
        'plan' => $vendorPlanValue,
        'plan_slug' => $vendorPlanSlug,
        'plan_label' => $vendorPlanLabel,
        'verified' => $vendorVerifiedFlag,
        'verification_state' => $vendorVerificationState,
        'verification_badge' => $vendorBadgeHtml,
    ],
    'listing' => $listing,
    'prefill' => trim((string)($_GET['prefill'] ?? '')),
    'contextIncomplete' => $contextIncomplete,
    'canSend' => $canSendMessages,
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

        .sr-only {
            position: absolute;
            width: 1px;
            height: 1px;
            padding: 0;
            margin: -1px;
            overflow: hidden;
            clip: rect(0, 0, 0, 0);
            white-space: nowrap;
            border: 0;
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
            overflow-x: hidden;
        }

        .chat-shell {
            min-height: 100vh;
            width: min(960px, 100%);
            margin: 0 auto;
            display: flex;
            flex-direction: column;
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

        .chat-confirm {
            position: fixed;
            inset: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 24px;
            background: rgba(18, 37, 35, 0.4);
            backdrop-filter: blur(2px);
            z-index: 999;
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.2s ease;
        }

        .chat-confirm.is-visible {
            opacity: 1;
            pointer-events: auto;
        }

        .chat-confirm__dialog {
            background: var(--surface);
            border-radius: 18px;
            padding: clamp(20px, 4vw, 28px);
            max-width: 420px;
            width: min(100%, 420px);
            box-shadow: 0 20px 36px rgba(18, 37, 35, 0.18);
            transform: translateY(12px);
            transition: transform 0.2s ease;
        }

        .chat-confirm.is-visible .chat-confirm__dialog {
            transform: translateY(0);
        }

        .chat-confirm__icon {
            width: 56px;
            height: 56px;
            border-radius: 16px;
            display: grid;
            place-items: center;
            background: rgba(220, 65, 47, 0.12);
            color: #dc412f;
            font-size: 1.6rem;
            margin-bottom: 18px;
        }

        .chat-confirm__title {
            margin: 0 0 8px;
            font-size: 1.15rem;
            color: var(--emerald);
        }

        .chat-confirm__message {
            margin: 0 0 20px;
            color: var(--muted);
            line-height: 1.5;
        }

        .chat-confirm__actions {
            display: flex;
            gap: 12px;
            justify-content: flex-end;
        }

        .chat-confirm__actions button {
            border-radius: 14px;
            padding: 10px 16px;
            font-weight: 600;
            cursor: pointer;
            border: 1px solid transparent;
            background: rgba(18, 37, 35, 0.08);
            color: var(--emerald);
            transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
        }

        .chat-confirm__actions button.danger {
            background: rgba(220, 65, 47, 0.12);
            color: #dc412f;
            border-color: rgba(220, 65, 47, 0.2);
        }

        .chat-confirm__actions button:hover {
            transform: translateY(-1px);
            box-shadow: 0 10px 20px rgba(18, 37, 35, 0.12);
        }

        .chat-confirm__actions button.danger:hover {
            box-shadow: 0 10px 20px rgba(220, 65, 47, 0.16);
        }

        body.chat-confirm-active {
            overflow: hidden;
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
            flex: 1 1 auto;
            min-height: 0;
            padding: clamp(16px, 4vw, 28px);
            padding-bottom: clamp(48px, 10vw, 64px);
            overflow-y: auto;
            display: grid;
            gap: 18px;
            background: linear-gradient(180deg, rgba(15, 106, 83, 0.04) 0%, rgba(244, 245, 247, 1) 100%);
        }

        #typingBanner {
            display: none;
            align-items: center;
            gap: 8px;
            color: var(--muted);
            font-size: 0.85rem;
            padding: 4px 6px;
            margin-bottom: 6px;
        }

        #typingBanner i {
            font-size: 1rem;
        }

        #typingBanner.is-visible {
            display: flex;
        }

        .composer #typingBanner {
            order: 0;
            align-self: stretch;
            justify-content: flex-start;
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
            word-break: break-word;
        }

        .message.sent {
            margin-left: auto;
            background: var(--emerald);
            color: #fff;
            border-color: transparent;
        }

        .message.message--pending {
            opacity: 0.8;
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

        .message.message--pending .meta {
            font-style: italic;
        }

        .message.received.message--pending .meta {
            color: rgba(15, 106, 83, 0.55);
        }

        .message .meta time {
            font-size: inherit;
        }

        .message-status {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            font-size: inherit;
            line-height: 1;
        }

        .message-status i {
            font-size: 0.95rem;
        }

        .message-status__label {
            font-size: inherit;
            text-transform: none;
        }

        .message-status--sending {
            color: rgba(243, 115, 30, 0.9);
        }

        .message.sent .message-status--sending {
            color: rgba(255, 255, 255, 0.9);
        }

        .message.sent .message-status--delivered {
            color: rgba(255, 255, 255, 0.7);
        }

        .message.sent .message-status--read {
            color: #9ef6d5;
        }

        .message.received .message-status {
            color: var(--muted);
        }

        .message-image img {
            max-width: 100%;
            border-radius: 12px;
            display: block;
        }

        .voice-player {
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .voice-player audio {
            width: 100%;
        }

        .scroll-bottom {
            position: sticky;
            bottom: clamp(72px, 14vw, 96px);
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
            padding: clamp(12px, 3vw, 18px);
            padding-bottom: calc(clamp(12px, 3vw, 18px) + env(safe-area-inset-bottom));
            display: flex;
            flex-direction: column;
            gap: 10px;
            position: sticky;
            bottom: 0;
            z-index: 10;
            box-shadow: 0 -8px 16px rgba(15, 106, 83, 0.08);
        }

        .chat-notice {
            width: min(960px, 100%);
            margin: 12px auto 0;
            padding: 12px 16px;
            border-radius: 14px;
            border: 1px solid transparent;
            display: none;
            align-items: center;
            gap: 10px;
            font-weight: 600;
            letter-spacing: 0.01em;
        }

        .chat-notice.is-visible {
            display: flex;
        }

        .chat-notice i {
            font-size: 1.2rem;
        }

        .chat-notice--info {
            background: rgba(15, 106, 83, 0.1);
            border-color: rgba(15, 106, 83, 0.32);
            color: #0f6a53;
        }

        .chat-notice--success {
            background: rgba(33, 150, 83, 0.12);
            border-color: rgba(33, 150, 83, 0.34);
            color: #137148;
        }

        .chat-notice--error {
            background: rgba(220, 65, 47, 0.12);
            border-color: rgba(220, 65, 47, 0.32);
            color: #a13327;
        }

        .composer-toolbar {
            display: flex;
            align-items: flex-end;
            gap: 12px;
            width: 100%;
        }

        .icon-btn {
            border: none;
            background: var(--emerald-soft);
            color: var(--emerald);
            width: 46px;
            height: 46px;
            border-radius: 16px;
            font-size: 1.1rem;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            transition: transform 0.2s ease, background 0.2s ease, color 0.2s ease;
        }

        .icon-btn:hover {
            transform: translateY(-1px);
        }

        .icon-btn:disabled {
            opacity: 0.55;
            cursor: default;
            transform: none;
        }

        #voiceButton.recording {
            background: rgba(220, 65, 47, 0.16);
            color: #dc412f;
        }

        .send-btn {
            border: none;
            background: var(--emerald);
            color: #fff;
            width: 56px;
            height: 46px;
            border-radius: 16px;
            font-size: 1.15rem;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            transition: background 0.2s ease, transform 0.2s ease;
        }

        .send-btn:hover {
            transform: translateY(-1px);
        }

        .send-btn:disabled {
            background: rgba(15, 106, 83, 0.18);
            color: rgba(15, 106, 83, 0.7);
            cursor: default;
            transform: none;
        }

        #messageInput {
            flex: 1;
            border: 1px solid var(--border);
            border-radius: 16px;
            padding: 12px 16px;
            font-size: 1rem;
            resize: none;
            line-height: 1.45;
            min-height: 48px;
            max-height: 140px;
            background: #fff;
            transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }

        #messageInput:focus {
            outline: none;
            border-color: rgba(15, 106, 83, 0.4);
            box-shadow: 0 0 0 3px rgba(15, 106, 83, 0.12);
        }

        #attachmentPreview {
            display: none;
            background: rgba(15, 106, 83, 0.05);
            border-radius: 16px;
            padding: 10px 14px;
            display: flex;
            align-items: center;
            gap: 14px;
        }

        #attachmentPreview[hidden] {
            display: none !important;
        }

        #attachmentPreview figure {
            margin: 0;
            position: relative;
        }

        #attachmentPreview img {
            max-width: 160px;
            border-radius: 14px;
            box-shadow: 0 10px 18px rgba(15, 106, 83, 0.12);
        }

        #attachmentPreview button {
            position: absolute;
            top: 8px;
            right: 8px;
            border: none;
            background: rgba(0, 0, 0, 0.68);
            color: #fff;
            border-radius: 50%;
            width: 30px;
            height: 30px;
            cursor: pointer;
        }

        .recording-indicator {
            display: none;
            align-items: center;
            gap: 8px;
            font-size: 0.9rem;
            font-weight: 600;
            color: rgba(220, 65, 47, 0.9);
        }

        .recording-indicator.is-visible {
            display: inline-flex;
        }

        .recording-indicator__dot {
            width: 10px;
            height: 10px;
            border-radius: 50%;
            background: #dc412f;
            box-shadow: 0 0 0 6px rgba(220, 65, 47, 0.18);
            animation: recordingPulse 1.2s ease-in-out infinite;
        }

        .recording-indicator__timer {
            font-variant-numeric: tabular-nums;
            letter-spacing: 0.05em;
        }

        @keyframes recordingPulse {
            0% {
                transform: scale(1);
                opacity: 1;
            }
            50% {
                transform: scale(1.15);
                opacity: 0.6;
            }
            100% {
                transform: scale(1);
                opacity: 1;
            }
        }

        .composer--disabled textarea,
        .composer--disabled .icon-btn,
        .composer--disabled .send-btn {
            opacity: 0.55;
            pointer-events: none;
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
            .thread-main {
                padding: 16px 16px clamp(52px, 18vw, 80px);
            }
            .composer {
                padding: 10px 16px calc(10px + env(safe-area-inset-bottom));
                gap: 8px;
            }
            .composer-toolbar {
                gap: 10px;
            }
            #messageInput {
                min-height: 44px;
                font-size: 0.96rem;
            }
            .icon-btn,
            .send-btn {
                width: 42px;
                height: 42px;
                border-radius: 14px;
                font-size: 1rem;
            }
        }

        .loading-overlay {
            position: fixed;
            inset: 0;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 18px;
            background: rgba(7, 14, 13, 0.78);
            backdrop-filter: blur(18px);
            z-index: 1200;
            color: rgba(255, 255, 255, 0.88);
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
            border: 4px solid rgba(73, 160, 130, 0.24);
            border-top-color: #49a082;
            animation: chatOverlaySpin 1s linear infinite;
        }

        .loading-overlay p {
            margin: 0;
            font-size: 0.82rem;
            opacity: 0.85;
        }

        @keyframes chatOverlaySpin {
            to {
                transform: rotate(360deg);
            }
        }

        body.is-loading .chat-shell {
            filter: blur(6px);
            pointer-events: none;
            user-select: none;
        }
    </style>
</head>
<body class="<?php echo $contextIncomplete ? 'chat-disabled is-loading' : 'is-loading'; ?>" data-can-send="<?php echo $canSendMessages ? '1' : '0'; ?>" data-vendor-plan="<?= htmlspecialchars($vendorPlanValue, ENT_QUOTES, 'UTF-8'); ?>" data-vendor-plan-slug="<?= htmlspecialchars($vendorPlanSlug, ENT_QUOTES, 'UTF-8'); ?>" data-vendor-verified="<?= htmlspecialchars($vendorVerificationState, ENT_QUOTES, 'UTF-8'); ?>">
    <div class="loading-overlay" id="loadingOverlay">
        <div class="spinner" aria-hidden="true"></div>
        <p>Loading conversation...</p>
    </div>
    <div class="chat-shell">
        <header class="thread-header">
            <button type="button" id="backButton">
                <i class="ri-arrow-left-line"></i>
            </button>
            <div class="header-avatar" id="headerAvatar">
                <img src="<?= htmlspecialchars($counterparty['avatar'] ?: $listing['image'] ?: 'https://images.unsplash.com/photo-1618005198919-d3d4b5a92eee?auto=format&fit=crop&w=120&q=80', ENT_QUOTES) ?>" alt="Profile photo">
            </div>
            <div class="header-details">
                <h1 id="chatTitle"><?= htmlspecialchars($counterparty['name'] ?: ($role === 'buyer' ? 'Vendor' : 'Buyer')) ?><?php if ($role === 'buyer') { echo $vendorBadgeHtml; } ?></h1>
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
        <div id="chatNotice" class="chat-notice chat-notice--info" role="status" aria-live="polite" hidden>
            <i id="chatNoticeIcon" class="ri-information-line" aria-hidden="true"></i>
            <span id="chatNoticeText"></span>
        </div>
        <div id="offlineBanner">You are offline. Messages will send when you're back online.</div>
        <main class="thread-main">
            <section id="messageList" class="message-list" aria-live="polite"></section>
            <button type="button" id="scrollToBottom" class="scroll-bottom">
                <i class="ri-arrow-down-line"></i>
                New messages
            </button>
        </main>
        <footer class="composer">
            <div id="typingBanner">
                <i class="ri-chat-3-line"></i>
                <span id="typingBannerText">Typing…</span>
            </div>
            <div id="attachmentPreview" hidden></div>
            <div class="recording-indicator" id="recordingIndicator" aria-live="polite">
                <span class="recording-indicator__dot" aria-hidden="true"></span>
                <span class="recording-indicator__label" id="recordingStatusLabel">Recording&hellip;</span>
                <span class="recording-indicator__timer" id="recordingTimer">00:00</span>
            </div>
            <div class="composer-toolbar">
                <button type="button" id="emojiButton" class="icon-btn" aria-label="Insert emoji"><i class="ri-emotion-line"></i></button>
                <button type="button" id="attachButton" class="icon-btn" aria-label="Attach image"><i class="ri-attachment-2"></i></button>
                <textarea id="messageInput" rows="1" placeholder="Write a message..." aria-label="Message"></textarea>
                <button type="button" id="voiceButton" class="icon-btn" aria-label="Record voice note"><i class="ri-mic-line"></i></button>
                <button type="button" id="sendButton" class="send-btn" aria-label="Send message" disabled><i class="ri-send-plane-2-line"></i></button>
            </div>
            <input type="file" accept="image/*" id="imageInput" hidden>
        </footer>
    </div>
    <div id="deleteConfirmModal" class="chat-confirm" role="presentation" hidden>
        <div class="chat-confirm__dialog" role="alertdialog" aria-modal="true" aria-labelledby="deleteConfirmTitle" aria-describedby="deleteConfirmMessage">
            <div class="chat-confirm__icon" aria-hidden="true">
                <i class="ri-delete-bin-6-line"></i>
            </div>
            <h2 id="deleteConfirmTitle" class="chat-confirm__title">Delete conversation?</h2>
            <p id="deleteConfirmMessage" class="chat-confirm__message">This will permanently remove the messages for both participants. You can't undo this action.</p>
            <div class="chat-confirm__actions">
                <button type="button" id="cancelDeleteBtn">Cancel</button>
                <button type="button" id="confirmDeleteBtn" class="danger">Delete</button>
            </div>
        </div>
    </div>
    <script>
        window.__CHAT_THREAD__ = <?= json_encode($bootstrap, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES); ?>;
    </script>
    <script src="theme-manager.js" defer></script>
    <script type="module" src="chat.js"></script>
</body>
</html>

