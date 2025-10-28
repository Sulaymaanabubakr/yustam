<?php
require_once __DIR__ . '/session-path.php';
session_start();
require_once __DIR__ . '/verification-badge.php';

$productId = isset($_GET['id']) ? trim((string) $_GET['id']) : '';
if ($productId === '') {
    $productId = 'listing-preview';
}
$productTitle = 'Loading listing...';
$productPrice = 0;

$vendorUidParam = isset($_GET['vendorUid']) ? trim((string) $_GET['vendorUid']) : '';
$vendorIdParam = isset($_GET['vendorId']) ? trim((string) $_GET['vendorId']) : '';
$vendorFirebaseUidSession = isset($_SESSION['vendor_firebase_uid']) ? trim((string) $_SESSION['vendor_firebase_uid']) : '';
$vendorLegacyUidSession = isset($_SESSION['vendor_uid']) ? trim((string) $_SESSION['vendor_uid']) : '';
$vendorNumericIdSession = isset($_SESSION['vendor_id']) ? trim((string) $_SESSION['vendor_id']) : '';

$vendorId = '';
foreach ([$vendorUidParam, $vendorIdParam, $vendorFirebaseUidSession, $vendorLegacyUidSession, $vendorNumericIdSession] as $candidate) {
    if ($candidate !== '') {
        $vendorId = $candidate;
        break;
    }
}

$vendorUid = $vendorFirebaseUidSession;
if ($vendorUid === '' && $vendorUidParam !== '') {
    $vendorUid = $vendorUidParam;
} elseif ($vendorUid === '' && $vendorLegacyUidSession !== '') {
    $vendorUid = $vendorLegacyUidSession;
} elseif ($vendorUid === '' && $vendorIdParam !== '' && $vendorIdParam !== $vendorNumericIdSession) {
    $vendorUid = $vendorIdParam;
}
if ($vendorUid === '' && $vendorId !== '' && $vendorId !== $vendorNumericIdSession) {
    $vendorUid = $vendorId;
}
$vendorUid = trim((string) $vendorUid);

$vendorName = 'Marketplace Vendor';

$buyerNumericId = isset($_SESSION['buyer_id']) ? (string) $_SESSION['buyer_id'] : '';
$buyerFirebaseUidSession = isset($_SESSION['buyer_firebase_uid']) ? trim((string) $_SESSION['buyer_firebase_uid']) : '';
$buyerUidSession = isset($_SESSION['buyer_uid']) ? trim((string) $_SESSION['buyer_uid']) : '';
$buyerGenericUidSession = isset($_SESSION['firebase_uid']) ? trim((string) $_SESSION['firebase_uid']) : '';

$buyerUid = '';
foreach ([$buyerFirebaseUidSession, $buyerUidSession, $buyerGenericUidSession] as $candidate) {
    if ($candidate !== '') {
        $buyerUid = $candidate;
        break;
    }
}
$buyerId = $buyerUid !== '' ? $buyerUid : $buyerNumericId;
$buyerName = trim((string) ($_SESSION['buyer_name'] ?? ''));
if ($buyerUid === '' && $buyerId !== '' && $buyerId !== $buyerNumericId) {
    $buyerUid = $buyerId;
}

$buyerUid = trim((string) $buyerUid);
if ($buyerUid !== '') {
    if (empty($_SESSION['buyer_uid'])) {
        $_SESSION['buyer_uid'] = $buyerUid;
    }
    if (empty($_SESSION['buyer_firebase_uid'])) {
        $_SESSION['buyer_firebase_uid'] = $buyerUid;
    }
    if (empty($_SESSION['firebase_uid'])) {
        $_SESSION['firebase_uid'] = $buyerUid;
    }
}

$vendorNumericId = $vendorNumericIdSession;
$buyerLabel = $buyerName !== '' ? $buyerName : 'Buyer';

function yustam_format_plan_label(?string $plan): string
{
    $plan = trim((string) $plan);
    if ($plan === '') {
        return 'Free Plan';
    }

    return preg_match('/plan$/i', $plan) ? $plan : $plan . ' Plan';
}

function yustam_slugify_plan(?string $plan): string
{
    $plan = strtolower(trim((string) $plan));
    $plan = preg_replace('/plan$/', '', $plan);
    $plan = preg_replace('/[^a-z0-9]+/', '-', $plan);
    $plan = trim((string) $plan, '-');

    return $plan !== '' ? $plan : 'free';
}

function yustam_normalise_verification($value): string
{
    if ($value === true || $value === 1 || $value === '1') {
        return 'verified';
    }

    if ($value === false || $value === 0 || $value === '0' || $value === null) {
        return 'unverified';
    }

    $value = strtolower(trim((string) $value));

    if (in_array($value, ['1', 'true', 'yes', 'verified', 'approved', 'active'], true)) {
        return 'verified';
    }

    if (in_array($value, ['pending', 'submitted', 'processing', 'in_review', 'in-review', 'under review'], true)) {
        return 'pending';
    }

    if (in_array($value, ['rejected', 'declined', 'failed', 'needs_changes', 'needs update', 'needs-update', '0', 'false', 'no', 'unverified'], true)) {
        return 'unverified';
    }

    return 'unverified';
}

function yustam_verification_label(string $state): string
{
    switch ($state) {
        case 'verified':
            return 'Verified Vendor';
        case 'pending':
            return 'Pending Review';
        default:
            return 'Not Verified';
    }
}

function yustam_verification_icon(string $state): string
{
    if ($state === 'verified') {
        return 'ri-shield-check-line';
    }

    if ($state === 'pending') {
        return 'ri-time-line';
    }

    return 'ri-alert-line';
}

$vendorPlanInput = $_GET['plan'] ?? '';
if (!is_string($vendorPlanInput)) {
    $vendorPlanInput = '';
}
$vendorPlanInput = trim($vendorPlanInput);
$vendorPlan = $vendorPlanInput !== '' ? $vendorPlanInput : 'Free';
$vendorPlanLabel = yustam_format_plan_label($vendorPlan);
$vendorPlanSlug = yustam_slugify_plan($vendorPlan);

$vendorVerifiedInput = $_GET['verified'] ?? 'unverified';
if (!is_string($vendorVerifiedInput)) {
    $vendorVerifiedInput = 'verified';
}
$vendorVerificationState = yustam_normalise_verification($vendorVerifiedInput);
$vendorVerificationLabel = yustam_verification_label($vendorVerificationState);
$vendorVerificationIcon = yustam_verification_icon($vendorVerificationState);
$vendorIsVerified = $vendorVerificationState === 'verified';
$vendorVerificationBadge = yustam_render_verification_badge(
    $vendorPlan,
    $vendorIsVerified,
    [
        'role_label' => yustam_verification_plan_label($vendorPlan),
    ]
);

$chatId = $vendorId && $buyerId ? $vendorId . '_' . $buyerId . '_' . $productId : '';
$vendorProfileUrl = 'vendor-storefront.php';
if (is_string($vendorId) && trim($vendorId) !== '') {
    $vendorProfileUrl .= '?vendorId=' . rawurlencode($vendorId);
}

$placeholderImage = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= htmlspecialchars($productTitle, ENT_QUOTES, 'UTF-8'); ?> | YUSTAM Marketplace</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Anton&family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/remixicon@3.5.0/fonts/remixicon.css">
    <link rel="stylesheet" href="verification-badges.css">
    <style>
        :root {
            --emerald: #004D40;
            --emerald-dark: #01382F;
            --emerald-soft: rgba(0, 77, 64, 0.12);
            --orange: #F3731E;
            --orange-deep: #D95D12;
            --beige: #F7F0E9;
            --white: #FFFFFF;
            --ink: #101613;
            --muted: rgba(16, 22, 19, 0.65);
            --shadow-key: 0 24px 48px rgba(0, 0, 0, 0.14);
            --shadow-soft: 0 16px 38px rgba(1, 56, 47, 0.12);
            --radius-lg: 32px;
            --radius-md: 18px;
            --radius-sm: 12px;
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
            color: var(--ink);
            background:
                radial-gradient(circle at top left, rgba(234, 220, 207, 0.92), rgba(255, 255, 255, 0.95)),
                linear-gradient(145deg, rgba(243, 115, 30, 0.08), rgba(0, 77, 64, 0.06));
            display: flex;
            flex-direction: column;
        }

        a {
            color: inherit;
            text-decoration: none;
        }

        button {
            font-family: inherit;
            border: none;
            background: none;
            cursor: pointer;
        }

        button:disabled,
        [aria-disabled="true"] {
            cursor: not-allowed;
        }

.product-nav {
            width: min(1180px, calc(100% - 32px));
            margin: 32px auto 0;
            padding: 16px 24px;
            border-radius: var(--radius-md);
            border: 1px solid rgba(0, 77, 64, 0.12);
            background: rgba(255, 255, 255, 0.92);
            box-shadow: 0 14px 32px rgba(15, 106, 83, 0.12);
            display: flex;
            align-items: center;
            justify-content: space-between;
            color: var(--emerald);
            gap: 24px;
        }

        .product-nav__actions {
            display: inline-flex;
            align-items: center;
            gap: 12px;
        }

        .nav-icon-button {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 46px;
            height: 46px;
            border-radius: 50%;
            color: var(--emerald);
            border: 1px solid rgba(0, 77, 64, 0.18);
            background: rgba(243, 115, 30, 0.14);
            transition: background 0.25s ease, transform 0.25s ease, box-shadow 0.25s ease;
        }

        .nav-icon-button:hover {
            background: rgba(243, 115, 30, 0.2);
            transform: translateY(-1px);
            box-shadow: 0 12px 22px rgba(243, 115, 30, 0.26);
        }

        .nav-icon-button i {
            font-size: 1.3rem;
        }

        .product-nav__brand {
            display: inline-flex;
            align-items: center;
            gap: 12px;
        }

        .product-nav__brand img {
            width: 44px;
            height: 44px;
            border-radius: 50%;
            border: 1px solid rgba(0, 77, 64, 0.12);
            object-fit: cover;
        }

        .product-nav__brand-text {
            display: flex;
            flex-direction: column;
            align-items: flex-end;
        }

        .product-nav__brand-name {
            font-family: 'Anton', sans-serif;
            letter-spacing: 1px;
            font-size: clamp(1.2rem, 2vw, 1.6rem);
        }

        .product-nav__brand-tagline {
            font-size: 0.85rem;
            font-weight: 600;
            color: rgba(0, 77, 64, 0.72);
            text-transform: uppercase;
            letter-spacing: 0.04em;
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

        .product-shell {
            width: min(1180px, calc(100% - 32px));
            margin: 32px auto 64px;
            display: flex;
            flex-direction: column;
            gap: 32px;
        }

        .product-hero {
            background: var(--white);
            border-radius: var(--radius-lg);
            padding: 32px;
            display: grid;
            grid-template-columns: minmax(0, 1.05fr) minmax(0, 0.95fr);
            gap: 32px;
            box-shadow: var(--shadow-key);
        }

        .product-gallery {
            display: flex;
            flex-direction: column;
            gap: 16px;
        }

        .product-gallery__stage {
            position: relative;
            background: linear-gradient(135deg, var(--beige), rgba(243, 115, 30, 0.18));
            border-radius: var(--radius-lg);
            overflow: hidden;
            aspect-ratio: 4 / 3;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .product-gallery__stage img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            opacity: 0;
            transition: opacity 0.35s ease;
        }

        .product-gallery__thumbs {
            display: flex;
            flex-wrap: wrap;
            gap: 12px;
        }

        .product-gallery__thumbs button {
            border: 1px solid transparent;
            border-radius: var(--radius-sm);
            padding: 0;
            width: 72px;
            height: 72px;
            overflow: hidden;
            background: rgba(0, 0, 0, 0.04);
            cursor: pointer;
            transition: border-color 0.25s ease, transform 0.25s ease;
        }

        .product-gallery__thumbs button img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }

        .product-gallery__thumbs button.active {
            border-color: var(--orange);
            transform: translateY(-2px);
        }

        .product-summary {
            display: flex;
            flex-direction: column;
            gap: 24px;
        }

        .product-summary__header {
            display: flex;
            flex-direction: column;
            gap: 12px;
        }

        .category-pill {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            font-size: 0.85rem;
            font-weight: 600;
            padding: 6px 12px;
            border-radius: 999px;
            background: var(--emerald-soft);
            color: var(--emerald-dark);
        }

        .product-summary__header h1 {
            font-size: clamp(1.8rem, 3vw, 2.6rem);
            font-weight: 700;
            margin: 0;
            color: var(--emerald-dark);
        }

        .product-price {
            font-size: clamp(1.6rem, 4vw, 2.4rem);
            font-weight: 700;
            color: var(--orange);
            margin: 0;
        }

        .product-summary__cta {
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            gap: 12px;
        }

        .save-btn {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 12px 20px;
            border-radius: 999px;
            background: linear-gradient(135deg, var(--orange), var(--orange-deep));
            color: var(--white);
            font-weight: 600;
            box-shadow: var(--shadow-soft);
            transition: transform 0.25s ease, box-shadow 0.25s ease;
        }

        .save-btn i {
            font-size: 1.2rem;
        }

        .save-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 16px 38px rgba(217, 93, 18, 0.32);
        }

        .save-btn.active {
            background: linear-gradient(135deg, var(--emerald), var(--emerald-dark));
        }

        .storefront-link {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 11px 18px;
            border-radius: 999px;
            font-weight: 600;
            border: 1px solid rgba(0, 77, 64, 0.18);
            color: var(--emerald-dark);
            transition: background 0.25s ease, color 0.25s ease;
        }

        .storefront-link:hover {
            background: rgba(0, 77, 64, 0.08);
        }

        .feature-list {
            list-style: none;
            margin: 0;
            padding: 0;
            display: grid;
            gap: 10px;
        }

        .feature-list li {
            display: flex;
            align-items: center;
            gap: 10px;
            font-weight: 500;
            color: var(--muted);
        }

        .feature-list li::before {
            content: '\f13d';
            font-family: 'remixicon';
            color: var(--emerald);
            font-size: 1rem;
        }

        .product-details-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
            gap: 24px;
        }

        .detail-card {
            background: rgba(255, 255, 255, 0.96);
            border-radius: var(--radius-lg);
            padding: 28px;
            box-shadow: 0 12px 28px rgba(0, 0, 0, 0.06);
            backdrop-filter: blur(6px);
        }

        .detail-card h2 {
            margin: 0 0 16px;
            font-size: 1.25rem;
            color: var(--emerald-dark);
        }

        .product-description {
            line-height: 1.6;
            color: var(--muted);
            margin: 0;
        }

        .spec-list {
            display: grid;
            gap: 10px;
        }

        .spec-row {
            display: flex;
            justify-content: space-between;
            gap: 12px;
            padding: 10px 14px;
            border-radius: var(--radius-sm);
            background: rgba(0, 77, 64, 0.05);
            color: var(--muted);
            font-size: 0.95rem;
        }

        .spec-row span {
            font-weight: 500;
            color: var(--emerald-dark);
        }

        .spec-empty {
            margin: 0;
            color: var(--muted);
            font-size: 0.95rem;
        }

        .quick-chat-card {
            background: var(--white);
            border-radius: var(--radius-lg);
            padding: 28px;
            box-shadow: var(--shadow-soft);
            display: flex;
            flex-direction: column;
            gap: 18px;
        }

        .quick-chat-card h3 {
            margin: 0;
            font-size: 1.35rem;
            color: var(--emerald-dark);
        }

        .quick-chat-card p {
            margin: 0;
            color: var(--muted);
            line-height: 1.6;
        }

        .quick-form {
            display: flex;
            flex-direction: column;
            gap: 12px;
        }

        .quick-input {
            display: flex;
            align-items: center;
            gap: 10px;
            border: 1px solid rgba(0, 77, 64, 0.16);
            border-radius: var(--radius-md);
            padding: 6px 6px 6px 16px;
            background: rgba(0, 77, 64, 0.04);
        }

        .quick-input input {
            flex: 1;
            border: none;
            background: transparent;
            font-size: 1rem;
            font-family: inherit;
            padding: 10px 0;
            outline: none;
            color: var(--ink);
        }

        .quick-input button {
            width: 46px;
            height: 46px;
            border-radius: 50%;
            background: linear-gradient(135deg, var(--emerald), var(--emerald-dark));
            color: var(--white);
            display: grid;
            place-items: center;
            font-size: 1.25rem;
            transition: transform 0.25s ease, box-shadow 0.25s ease;
        }

        .quick-input button:hover {
            transform: translateY(-2px);
            box-shadow: 0 12px 22px rgba(1, 56, 47, 0.24);
        }

        .quick-suggestions {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
        }

        .suggestion-chip {
            border-radius: 999px;
            padding: 8px 16px;
            background: rgba(0, 77, 64, 0.08);
            color: var(--emerald-dark);
            font-size: 0.9rem;
            font-weight: 500;
            transition: background 0.25s ease, transform 0.25s ease;
        }

        .suggestion-chip:hover {
            background: rgba(0, 77, 64, 0.16);
            transform: translateY(-1px);
        }

        .quick-note {
            color: var(--muted);
            font-size: 0.85rem;
        }

        .vendor-card {
            background: rgba(255, 255, 255, 0.98);
            border-radius: var(--radius-lg);
            padding: 32px;
            box-shadow: var(--shadow-key);
            display: flex;
            flex-direction: column;
            gap: 24px;
        }

        .vendor-card__header {
            display: flex;
            gap: 18px;
            align-items: center;
        }

        .vendor-avatar {
            width: 82px;
            height: 82px;
            border-radius: 50%;
            object-fit: cover;
            border: 3px solid rgba(0, 77, 64, 0.18);
        }

        .vendor-card__header h2 {
            margin: 0;
            font-size: 1.45rem;
            color: var(--emerald-dark);
        }

        .vendor-business {
            margin: 4px 0 0;
            color: var(--muted);
            font-weight: 500;
        }

        .vendor-badges {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
            margin-top: 12px;
        }

        .vendor-badge {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 6px 14px;
            border-radius: 999px;
            font-size: 0.85rem;
            font-weight: 600;
        }

        .vendor-badge.vendor-plan {
            background: rgba(243, 115, 30, 0.15);
            color: var(--orange-deep);
        }

        .vendor-badge.vendor-verified.verified {
            background: rgba(0, 77, 64, 0.16);
            color: var(--emerald-dark);
        }

        .vendor-badge.vendor-verified.pending {
            background: rgba(243, 115, 30, 0.16);
            color: var(--orange-deep);
        }

        .vendor-badge.vendor-verified.unverified {
            background: rgba(16, 22, 19, 0.12);
            color: var(--muted);
        }

        .vendor-card__contact {
            display: flex;
            flex-wrap: wrap;
            gap: 12px;
        }

        .contact-button {
            display: inline-flex;
            align-items: center;
            gap: 10px;
            padding: 12px 18px;
            border-radius: var(--radius-md);
            font-weight: 600;
            transition: transform 0.25s ease, box-shadow 0.25s ease;
        }

        .contact-button i {
            font-size: 1.25rem;
        }

        .contact-button--phone {
            background: linear-gradient(135deg, var(--emerald), var(--emerald-dark));
            color: var(--white);
            box-shadow: 0 14px 28px rgba(1, 56, 47, 0.24);
        }

        .contact-button--whatsapp {
            background: linear-gradient(135deg, #25D366, #128C7E);
            color: var(--white);
            box-shadow: 0 14px 28px rgba(18, 140, 126, 0.26);
        }

        .contact-button.is-disabled {
            background: rgba(16, 22, 19, 0.08);
            color: rgba(16, 22, 19, 0.5);
            box-shadow: none;
        }

        .contact-button:not(.is-disabled):hover {
            transform: translateY(-2px);
        }

        .contact-button [data-contact-value] {
            font-size: 0.85rem;
            font-weight: 500;
            opacity: 0.85;
        }

        .vendor-card__details {
            display: grid;
            gap: 12px;
        }

        .vendor-card__detail {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            font-size: 0.95rem;
            color: var(--muted);
        }

        .vendor-card__detail .label {
            font-weight: 600;
            color: var(--emerald-dark);
            min-width: 120px;
        }

        .vendor-card__detail a[aria-disabled="true"] {
            pointer-events: none;
            opacity: 0.6;
        }

        .status-chip {
            position: absolute;
            top: 16px;
            left: 16px;
            padding: 6px 14px;
            border-radius: 999px;
            background: rgba(0, 77, 64, 0.85);
            color: var(--white);
            font-size: 0.85rem;
            font-weight: 600;
            letter-spacing: 0.02em;
        }

        .status-chip.status-pending {
            background: rgba(243, 115, 30, 0.85);
        }

        .status-chip.status-sold,
        .status-chip.status-soldout,
        .status-chip.unavailable,
        .status-chip.status-unavailable {
            background: rgba(16, 22, 19, 0.8);
        }

        .status-chip.status-disabled,
        .status-chip.status-suspended {
            background: rgba(189, 0, 49, 0.82);
        }

        .floating-cta {
            position: fixed;
            right: 24px;
            bottom: 24px;
            display: flex;
            flex-direction: column;
            gap: 14px;
            z-index: 20;
        }

        .floating-button {
            display: inline-flex;
            align-items: center;
            gap: 12px;
            padding: 14px 22px;
            border-radius: 999px;
            background: var(--white);
            color: var(--emerald-dark);
            font-weight: 600;
            box-shadow: var(--shadow-soft);
            transition: transform 0.25s ease, box-shadow 0.25s ease;
        }

        .floating-button i {
            font-size: 1.35rem;
        }

        .floating-button--primary {
            background: linear-gradient(135deg, var(--orange), var(--orange-deep));
            color: var(--white);
        }

        .floating-button--whatsapp {
            background: linear-gradient(135deg, #25D366, #128C7E);
            color: var(--white);
        }

        .floating-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 18px 38px rgba(0, 0, 0, 0.18);
        }

        .floating-button.is-disabled {
            background: rgba(255, 255, 255, 0.6);
            color: rgba(16, 22, 19, 0.45);
            box-shadow: none;
            cursor: not-allowed;
        }

        .product-footer {
            margin-top: auto;
            padding: 32px 16px 48px;
            background: rgba(0, 0, 0, 0.12);
            color: var(--white);
        }

        .product-footer__inner {
            width: min(1180px, calc(100% - 32px));
            margin: 0 auto;
            display: flex;
            flex-direction: column;
            gap: 18px;
            align-items: center;
            text-align: center;
        }

        .footer-links {
            display: flex;
            flex-wrap: wrap;
            gap: 16px;
            justify-content: center;
            font-weight: 500;
        }

        .footer-links a {
            color: var(--white);
            opacity: 0.85;
        }

        .footer-links a:hover {
            opacity: 1;
        }

        .footer-social {
            display: flex;
            gap: 14px;
            font-size: 1.4rem;
        }

        .footer-social a {
            color: var(--white);
            opacity: 0.85;
        }

        .footer-social a:hover {
            opacity: 1;
        }

        @media (max-width: 1024px) {
            .product-nav {
                margin-top: 24px;
            }

            .product-hero {
                grid-template-columns: 1fr;
            }

            .floating-cta {
                right: 16px;
                bottom: 16px;
            }
        }

        @media (max-width: 720px) {
            .product-nav {
                flex-direction: row;
                align-items: center;
                gap: 14px;
                padding: 14px 18px;
            }

            .product-nav__actions {
                flex: 0 0 auto;
            }

            .product-nav__brand {
                flex: 1 1 auto;
                min-width: 0;
                justify-content: flex-start;
            }

            .product-nav__brand-text {
                align-items: flex-start;
            }

            .product-nav__brand-name {
                font-size: clamp(1.05rem, 4vw, 1.3rem);
            }

            .product-nav__brand-tagline {
                font-size: 0.78rem;
            }

            .product-shell {
                margin: 24px auto 80px;
                gap: 24px;
            }

            .product-hero {
                padding: 20px;
                gap: 20px;
            }

            .product-gallery__thumbs {
                justify-content: flex-start;
            }

            .product-details-grid {
                gap: 16px;
            }

            .detail-card,
            .quick-chat-card,
            .vendor-card {
                padding: 22px;
            }

            .floating-cta {
                position: sticky;
                bottom: unset;
                right: unset;
                left: unset;
                flex-direction: row;
                justify-content: center;
                margin: 0 auto 24px;
            }

            .floating-button {
                flex: 1;
                justify-content: center;
                min-width: 0;
            }
        }

        @media (prefers-reduced-motion: reduce) {
            *,
            *::before,
            *::after {
                animation-duration: 0.01ms !important;
                animation-iteration-count: 1 !important;
                transition-duration: 0.01ms !important;
                scroll-behavior: auto !important;
            }
        }
    </style>
</head>
<body
    data-buyer-id="<?= htmlspecialchars($buyerNumericId, ENT_QUOTES, 'UTF-8'); ?>"
    data-buyer-uid="<?= htmlspecialchars($buyerUid, ENT_QUOTES, 'UTF-8'); ?>"
    data-buyer-name="<?= htmlspecialchars($buyerLabel, ENT_QUOTES, 'UTF-8'); ?>"
    data-vendor-id="<?= htmlspecialchars($vendorNumericId, ENT_QUOTES, 'UTF-8'); ?>"
    data-vendor-uid="<?= htmlspecialchars($vendorUid, ENT_QUOTES, 'UTF-8'); ?>"
    data-vendor-name="<?= htmlspecialchars($vendorName, ENT_QUOTES, 'UTF-8'); ?>"
    data-vendor-plan="<?= htmlspecialchars($vendorPlan, ENT_QUOTES, 'UTF-8'); ?>"
    data-vendor-plan-label="<?= htmlspecialchars($vendorPlanLabel, ENT_QUOTES, 'UTF-8'); ?>"
    data-vendor-plan-slug="<?= htmlspecialchars($vendorPlanSlug, ENT_QUOTES, 'UTF-8'); ?>"
    data-vendor-verified="<?= htmlspecialchars($vendorVerificationState, ENT_QUOTES, 'UTF-8'); ?>"
>
    <header class="product-nav">
        <div class="product-nav__actions">
            <button type="button" class="nav-icon-button" onclick="window.location.href='shop.html'" aria-label="Back to listings">
                <i class="ri-arrow-left-line" aria-hidden="true"></i>
                <span class="sr-only">Back to listings</span>
            </button>
            <button type="button" class="nav-icon-button" onclick="window.location.href='index.html'" aria-label="Go to homepage">
                <i class="ri-home-4-line" aria-hidden="true"></i>
                <span class="sr-only">Go to homepage</span>
            </button>
        </div>
        <div class="product-nav__brand">
            <img src="logo.jpeg" alt="YUSTAM Marketplace logo">
            <div class="product-nav__brand-text">
                <span class="product-nav__brand-name">YUSTAM Marketplace</span>
                <span class="product-nav__brand-tagline">Product overview</span>
            </div>
        </div>
    </header>
    <main class="product-shell">
        <section class="product-hero">
            <div class="product-gallery">
                <figure class="product-gallery__stage" aria-label="Product gallery">
                    <img id="productImage" src="<?= htmlspecialchars($placeholderImage, ENT_QUOTES, 'UTF-8'); ?>" alt="Listing image preview" loading="lazy">
                    <span id="productStatus" class="status-chip">Checking availability</span>
                </figure>
                <div id="thumbStrip" class="product-gallery__thumbs" aria-label="Listing gallery thumbnails"></div>
            </div>
            <div class="product-summary">
                <div class="product-summary__header">
                    <span id="categoryLine" class="category-pill" hidden>
                        <i class="ri-price-tag-3-line" aria-hidden="true"></i>
                        <span id="categoryLabel"></span>
                    </span>
                    <h1 id="productName"><?= htmlspecialchars($productTitle, ENT_QUOTES, 'UTF-8'); ?></h1>
                    <p id="productPrice" class="product-price">&ndash;</p>
                </div>
                <div class="product-summary__cta">
                    <button id="saveListingBtn" class="save-btn" type="button">
                        <i class="ri-heart-line" aria-hidden="true"></i>
                        Save listing
                    </button>
                    <a
                        id="vendorStorefrontLink"
                        class="storefront-link"
                        href="<?= htmlspecialchars($vendorProfileUrl, ENT_QUOTES, 'UTF-8'); ?>"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        Visit vendor storefront
                    </a>
                </div>
                <ul id="featureList" class="feature-list" hidden></ul>
                <input type="hidden" id="productId" value="<?= htmlspecialchars($productId, ENT_QUOTES, 'UTF-8'); ?>">
            </div>
        </section>
        <section class="product-details-grid">
            <article class="detail-card">
                <h2>About this listing</h2>
                <p id="productDesc" class="product-description">
                    We are gathering the full description from the vendor.
                </p>
            </article>
            <article class="detail-card">
                <h2>Specifications</h2>
                <div id="specList" class="spec-list"></div>
                <p id="specFallback" class="spec-empty">No additional specifications provided yet.</p>
            </article>
        </section>
        <section
            id="quickChatCard"
            class="quick-chat-card"
            data-chat-id="<?= htmlspecialchars($chatId, ENT_QUOTES, 'UTF-8'); ?>"
            data-vendor-id="<?= htmlspecialchars($vendorNumericId, ENT_QUOTES, 'UTF-8'); ?>"
            data-vendor-uid="<?= htmlspecialchars($vendorUid !== '' ? $vendorUid : ($vendorId !== '' ? $vendorId : $vendorNumericId), ENT_QUOTES, 'UTF-8'); ?>"
            data-vendor-name="<?= htmlspecialchars($vendorName, ENT_QUOTES, 'UTF-8'); ?>"
            data-buyer-id="<?= htmlspecialchars($buyerNumericId, ENT_QUOTES, 'UTF-8'); ?>"
            data-buyer-uid="<?= htmlspecialchars($buyerUid !== '' ? $buyerUid : $buyerNumericId, ENT_QUOTES, 'UTF-8'); ?>"
            data-product-id="<?= htmlspecialchars($productId, ENT_QUOTES, 'UTF-8'); ?>"
            data-product-title="<?= htmlspecialchars($productTitle, ENT_QUOTES, 'UTF-8'); ?>"
            data-product-image="<?= htmlspecialchars($placeholderImage, ENT_QUOTES, 'UTF-8'); ?>"
        >
            <h3>Chat with <?= htmlspecialchars($vendorName, ENT_QUOTES, 'UTF-8'); ?><?= $vendorVerificationBadge; ?></h3>
            <p>Send a quick message and we'll notify the vendor instantly, then open a secure YUSTAM chat so you can keep the conversation going.</p>
            <form id="quickChatForm" class="quick-form">
                <div class="quick-input">
                    <input
                        id="quickMessageInput"
                        type="text"
                        name="quickMessage"
                        placeholder="Ask about pricing, delivery, or product condition"
                        autocomplete="off"
                    >
                    <button id="quickMessageSubmit" type="submit" aria-label="Send quick message">
                        <i class="ri-send-plane-fill" aria-hidden="true"></i>
                    </button>
                </div>
            </form>
            <div class="quick-suggestions" aria-label="Quick message suggestions">
                <button type="button" class="suggestion-chip" data-quick-message="Is this still available?">Is this still available?</button>
                <button type="button" class="suggestion-chip" data-quick-message="Can I get a better price?">Can I get a better price?</button>
                <button type="button" class="suggestion-chip" data-quick-message="What condition is it in?">What condition is it in?</button>
                <button type="button" class="suggestion-chip" data-quick-message="Can you deliver to my location?">Can you deliver to my location?</button>
            </div>
            <small class="quick-note">We send your message right away so it's waiting in the chat when you arrive.</small>
        </section>
        <section class="vendor-card" aria-labelledby="vendorTitle">
            <header class="vendor-card__header">
                <img id="vendorAvatar" src="logo.jpeg" alt="Vendor profile photo" class="vendor-avatar">
                <div>
                    <h2 id="vendorTitle"><?= htmlspecialchars($vendorName, ENT_QUOTES, 'UTF-8'); ?><?= $vendorVerificationBadge; ?></h2>
                    <p id="vendorBusiness" class="vendor-business" hidden></p>
                    <div class="vendor-badges" id="vendorBadges">
                        <span
                            class="vendor-badge vendor-plan vendor-plan-<?= htmlspecialchars($vendorPlanSlug, ENT_QUOTES, 'UTF-8'); ?>"
                            id="vendorPlanBadge"
                        >
                            <i class="ri-vip-crown-fill" aria-hidden="true"></i>
                            <?= htmlspecialchars($vendorPlanLabel, ENT_QUOTES, 'UTF-8'); ?>
                        </span>
                        <span
                            class="vendor-badge vendor-verified <?= htmlspecialchars($vendorVerificationState, ENT_QUOTES, 'UTF-8'); ?>"
                            id="vendorVerifiedBadge"
                        >
                            <i class="<?= htmlspecialchars($vendorVerificationIcon, ENT_QUOTES, 'UTF-8'); ?>" aria-hidden="true"></i>
                            <?= htmlspecialchars($vendorVerificationLabel, ENT_QUOTES, 'UTF-8'); ?>
                        </span>
                    </div>
                </div>
            </header>
            <div class="vendor-card__contact">
                <a
                    id="vendorPhoneLink"
                    class="contact-button contact-button--phone is-disabled"
                    href="#"
                    aria-disabled="true"
                    data-display-label="Call Vendor"
                >
                    <i class="ri-phone-line" aria-hidden="true"></i>
                    <span data-contact-label>Call Vendor</span>
                    <span data-contact-value>Unavailable</span>
                </a>
                <a
                    id="vendorWhatsappLink"
                    class="contact-button contact-button--whatsapp is-disabled"
                    href="#"
                    target="_blank"
                    rel="noopener"
                    aria-disabled="true"
                    data-display-label="WhatsApp Vendor"
                >
                    <i class="ri-whatsapp-line" aria-hidden="true"></i>
                    <span data-contact-label>WhatsApp Vendor</span>
                </a>
            </div>
            <div class="vendor-card__details">
                <div class="vendor-card__detail">
                    <span class="label">Email</span>
                    <a id="vendorEmailLink" href="#" aria-disabled="true">Unavailable</a>
                </div>
                <div id="vendorLocationRow" class="vendor-card__detail" hidden>
                    <span class="label">Location</span>
                    <span id="vendorLocation"></span>
                </div>
                <div id="vendorSinceRow" class="vendor-card__detail" hidden>
                    <span class="label">Member since</span>
                    <span id="vendorSince"></span>
                </div>
            </div>
        </section>
    </main>
    <div class="floating-cta" aria-label="Quick actions">
        <button id="chatWithVendorBtn" class="floating-button floating-button--primary" type="button" aria-label="Chat with vendor">
            <i class="ri-message-3-fill" aria-hidden="true"></i>
            <span>Chat with vendor</span>
        </button>
        <button id="floatingCallBtn" class="floating-button is-disabled" type="button" aria-label="Call vendor" aria-disabled="true">
            <i class="ri-phone-line" aria-hidden="true"></i>
            <span>Call vendor</span>
        </button>
        <button id="floatingWhatsappBtn" class="floating-button floating-button--whatsapp is-disabled" type="button" aria-label="WhatsApp vendor" aria-disabled="true">
            <i class="ri-whatsapp-line" aria-hidden="true"></i>
            <span>WhatsApp vendor</span>
        </button>
    </div>
    <footer class="product-footer">
        <div class="product-footer__inner">
            <nav class="footer-links" aria-label="Footer navigation">
                <a href="index.html">Home</a>
                <a href="shop.html">Shop</a>
                <a href="vendor-register.html">Become a vendor</a>
                <a href="contact.html">Contact</a>
            </nav>
            <div class="footer-social" aria-label="Social media links">
                <a href="https://wa.me/2347012345678" aria-label="WhatsApp">
                    <i class="ri-whatsapp-line"></i>
                </a>
                <a href="https://instagram.com" aria-label="Instagram">
                    <i class="ri-instagram-line"></i>
                </a>
                <a href="https://facebook.com" aria-label="Facebook">
                    <i class="ri-facebook-circle-line"></i>
                </a>
            </div>
            <small>&copy; <?= date('Y'); ?> YUSTAM Marketplace. All rights reserved.</small>
        </div>
    </footer>
    <script src="theme-manager.js" defer></script>
    <script type="module" src="product.js"></script>
    <script type="module" src="firebase.js"></script>
</body>
</html>
