<?php
require_once __DIR__ . '/session-path.php';
session_start();

$productId = isset($_GET['id']) ? trim((string) $_GET['id']) : '';
if ($productId === '') {
    $productId = 'listing-preview';
}
$productTitle = 'Loading listing...';
$productPrice = 0;
$vendorUidParam = isset($_GET['vendorUid']) ? trim((string) $_GET['vendorUid']) : '';
$vendorIdParam = isset($_GET['vendorId']) ? trim((string) $_GET['vendorId']) : '';
$vendorUidSession = isset($_SESSION['vendor_uid']) ? (string) $_SESSION['vendor_uid'] : '';
$vendorNumericIdSession = isset($_SESSION['vendor_id']) ? (string) $_SESSION['vendor_id'] : '';
$vendorId = $vendorUidParam !== '' ? $vendorUidParam : ($vendorIdParam !== '' ? $vendorIdParam : ($vendorUidSession !== '' ? $vendorUidSession : $vendorNumericIdSession));
$vendorName = 'Marketplace Vendor';
$buyerNumericId = isset($_SESSION['buyer_id']) ? (string) $_SESSION['buyer_id'] : '';
$buyerUid = isset($_SESSION['buyer_uid']) ? (string) $_SESSION['buyer_uid'] : '';
$buyerId = $buyerUid !== '' ? $buyerUid : $buyerNumericId;
$buyerName = $_SESSION['buyer_name'] ?? '';
$vendorNumericId = $vendorNumericIdSession;
$vendorUid = $vendorUidSession !== '' ? $vendorUidSession : ($vendorUidParam !== '' ? $vendorUidParam : '');
if ($vendorUid === '' && $vendorId !== '' && $vendorId !== $vendorNumericId) {
    $vendorUid = $vendorId;
}
if ($buyerUid === '' && $buyerId !== '' && $buyerId !== $buyerNumericId) {
    $buyerUid = $buyerId;
}

function yustam_format_plan_label(?string $plan): string
{
    $plan = trim((string)$plan);
    if ($plan === '') {
        return 'Free Plan';
    }

    return preg_match('/plan$/i', $plan) ? $plan : $plan . ' Plan';
}

function yustam_slugify_plan(?string $plan): string
{
    $plan = strtolower(trim((string)$plan));
    $plan = preg_replace('/plan$/', '', $plan);
    $plan = preg_replace('/[^a-z0-9]+/', '-', $plan);
    $plan = trim((string)$plan, '-');

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

    $value = strtolower(trim((string)$value));

    if (in_array($value, ['true', 'yes', 'verified', 'approved', 'active'], true)) {
        return 'verified';
    }

    if (in_array($value, ['pending', 'submitted', 'processing', 'in_review', 'in-review', 'under review'], true)) {
        return 'pending';
    }

    if (in_array($value, ['rejected', 'declined', 'failed', 'needs_changes', 'needs update', 'needs-update', 'no', 'false'], true)) {
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

$chatId = $vendorId && $buyerId ? $vendorId . '_' . $buyerId . '_' . $productId : '';
$vendorProfileUrl = 'vendor-storefront.php';
if (is_string($vendorId) && trim($vendorId) !== '') {
    $vendorProfileUrl .= '?vendorId=' . rawurlencode($vendorId);
}
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
    <style>
        :root {
            --emerald: #004D40;
            --emerald-dark: #00695C;
            --orange: #F3731E;
            --orange-deep: #E05E0E;
            --beige: #EADCCF;
            --white: #FFFFFF;
            --ink: #111111;
            --shadow-soft: 0 10px 30px rgba(0, 0, 0, 0.12);
            --glass-bg: rgba(255, 255, 255, 0.85);
        }

        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        body {
            font-family: 'Inter', sans-serif;
            background: linear-gradient(135deg, var(--emerald), var(--emerald-dark));
            min-height: 100vh;
            color: var(--ink);
            display: flex;
            flex-direction: column;
        }

        a {
            color: inherit;
            text-decoration: none;
        }

        button {
            font-family: inherit;
            cursor: pointer;
        }

        .save-btn {
            background: rgba(255, 255, 255, 0.85);
            border: 1px solid rgba(0, 77, 64, 0.2);
            border-radius: 14px;
            padding: 10px 16px;
            font-weight: 600;
            color: #004D40;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 8px;
            transition: all 0.25s ease;
        }

        .save-btn:hover {
            background: linear-gradient(135deg, #F3731E, #FF8A3C);
            color: #fff;
        }

        .save-btn.active {
            background: linear-gradient(135deg, #F3731E, #FF8A3C);
            color: #fff;
        }

        .save-btn.active i {
            content: "\f004";
        }

        .page-wrapper {
            width: 100%;
            max-width: 1100px;
            margin: 0 auto;
            padding: 100px 20px 120px;
        }

        h1, h2, h3, h4 {
            font-family: 'Anton', sans-serif;
            letter-spacing: 0.5px;
        }

        .glass-card {
            background: var(--glass-bg);
            border-radius: 20px;
            box-shadow: var(--shadow-soft);
            border: 1px solid rgba(255, 255, 255, 0.25);
            backdrop-filter: blur(10px);
            padding: 24px;
            margin-bottom: 24px;
            animation: fadeUp 0.6s ease forwards;
            opacity: 0;
        }

        header {
            position: sticky;
            top: 0;
            z-index: 100;
            backdrop-filter: blur(12px);
            background: rgba(234, 220, 207, 0.6);
            border-bottom: 2px solid rgba(243, 115, 30, 0.5);
            box-shadow: 0 8px 20px rgba(0, 0, 0, 0.12);
        }

        .topbar {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 16px 20px;
        }

        .topbar .title {
            font-size: clamp(18px, 2.8vw, 26px);
            color: var(--emerald);
        }

        .topbar button {
            background: rgba(255, 255, 255, 0.7);
            border: none;
            border-radius: 12px;
            width: 44px;
            height: 44px;
            display: grid;
            place-items: center;
            color: var(--emerald);
            transition: transform 0.25s ease, box-shadow 0.25s ease;
        }

        .topbar button:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12);
        }

        /* Header placeholder for accent line */
        .accent-bar {
            height: 3px;
            background: linear-gradient(135deg, var(--orange), #FF8A3C);
        }

        /* <!-- Gallery --> */
        .gallery {
            display: flex;
            flex-direction: column;
            gap: 16px;
        }

        .gallery-main {
            width: 100%;
            aspect-ratio: 16 / 9;
            background: rgba(255, 255, 255, 0.4);
            border-radius: 18px;
            overflow: hidden;
            display: flex;
            align-items: center;
            justify-content: center;
            position: relative;
        }

        .gallery-main img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            transition: opacity 0.4s ease;
        }

        .thumb-strip {
            display: flex;
            gap: 12px;
            overflow-x: auto;
            padding-bottom: 6px;
        }

        .thumb-strip button {
            background: transparent;
            border: none;
            border-radius: 14px;
            overflow: hidden;
            min-width: 92px;
            height: 64px;
            box-shadow: 0 4px 14px rgba(0, 0, 0, 0.12);
            opacity: 0.7;
            transition: opacity 0.3s ease, transform 0.3s ease;
        }

        .thumb-strip button.active,
        .thumb-strip button:hover {
            opacity: 1;
            transform: translateY(-3px);
        }

        .thumb-strip img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }

        /* <!-- Product Details Section --> */
        .product-details {
            display: grid;
            gap: 20px;
        }

        .product-header {
            display: flex;
            flex-direction: column;
            gap: 12px;
        }

        .product-title {
            font-size: clamp(24px, 4vw, 36px);
            color: var(--emerald);
        }

        .price-tag {
            font-size: clamp(24px, 4vw, 32px);
            font-weight: 700;
            background: linear-gradient(135deg, var(--orange), #FF9E50);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }

        .status-chip {
            display: inline-flex;
            align-items: center;
            padding: 6px 14px;
            border-radius: 999px;
            font-weight: 600;
            font-size: 0.9rem;
            background: rgba(0, 128, 0, 0.12);
            color: var(--emerald);
        }
        .status-chip.status-pending {
            background: rgba(243, 115, 30, 0.16);
            color: var(--orange);
        }

        .status-chip.status-suspended,
        .status-chip.status-disabled,
        .status-chip.status-unavailable {
            background: rgba(17, 17, 17, 0.12);
            color: rgba(17, 17, 17, 0.7);
        }

        .status-chip.status-sold,
        .status-chip.status-soldout {
            background: rgba(216, 67, 21, 0.16);
            color: #d84315;
        }

        .category-line {
            font-size: 0.95rem;
            color: rgba(17, 17, 17, 0.7);
            display: flex;
            gap: 8px;
            align-items: center;
        }

        .divider {
            height: 1px;
            width: 100%;
            background: rgba(0, 0, 0, 0.08);
        }

        .product-description {
            color: rgba(17, 17, 17, 0.78);
            line-height: 1.7;
        }

        .feature-list {
            margin-top: 12px;
            display: grid;
            gap: 8px;
        }

        .feature-list li {
            list-style: none;
            display: flex;
            align-items: flex-start;
            gap: 8px;
            color: rgba(17, 17, 17, 0.75);
        }


        .btn-primary,
        .btn-accent {
            flex: 1 1 200px;
            min-height: 50px;
            border-radius: 12px;
            border: none;
            font-weight: 600;
            letter-spacing: 0.3px;
            transition: transform 0.25s ease, box-shadow 0.25s ease, filter 0.25s ease;
        }

        .btn-primary {
            background: rgba(0, 77, 64, 0.92);
            color: var(--white);
        }

        .btn-accent {
            background: linear-gradient(135deg, var(--orange), #FF8A3C);
            color: var(--white);
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
        }

        .btn-primary:hover,
        .btn-accent:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 24px rgba(0, 0, 0, 0.16);
            filter: brightness(1.03);
        }

        /* <!-- Specifications --> */
        .spec-card details {
            background: rgba(255, 255, 255, 0.75);
            border-radius: 16px;
            padding: 16px 18px;
            border: 1px solid rgba(0, 0, 0, 0.08);
        }

        .spec-card summary {
            cursor: pointer;
            font-weight: 600;
            font-size: 1.1rem;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .spec-list {
            margin-top: 14px;
            display: grid;
            gap: 12px;
        }

        .spec-row {
            display: flex;
            justify-content: space-between;
            gap: 16px;
            padding-bottom: 10px;
            border-bottom: 1px solid rgba(0, 0, 0, 0.05);
            color: rgba(17, 17, 17, 0.75);
        }
        .spec-empty {
            margin-top: 12px;
            font-size: 0.9rem;
            color: rgba(17, 17, 17, 0.55);
        }

        .spec-row:last-child {
            border-bottom: none;
            padding-bottom: 0;
        }

        /* <!-- Vendor Information Card --> */
        .vendor-card {
            display: grid;
            gap: 16px;
        }

        .vendor-header {
            display: flex;
            align-items: center;
            gap: 14px;
        }

        .vendor-avatar {
            width: 60px;
            height: 60px;
            border-radius: 50%;
            object-fit: cover;
            border: 3px solid rgba(243, 115, 30, 0.4);
        }

        .vendor-text {
            display: flex;
            flex-direction: column;
            gap: 6px;
        }
        .vendor-business {
            margin: 0;
            color: var(--muted);
            font-size: 0.95rem;
        }

        .vendor-badges {
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
            margin-top: 2px;
        }

        .vendor-badge {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 6px 12px;
            border-radius: 999px;
            font-size: 0.75rem;
            font-weight: 600;
            letter-spacing: 0.02em;
            background: rgba(0, 77, 64, 0.12);
            color: var(--emerald);
        }

        .vendor-badge i {
            font-size: 0.9rem;
        }

        .vendor-plan-premium {
            background: rgba(243, 115, 30, 0.16);
            color: var(--orange-deep);
        }

        .vendor-plan-pro {
            background: rgba(0, 77, 64, 0.16);
            color: var(--emerald);
        }

        .vendor-plan-plus {
            background: rgba(0, 77, 64, 0.12);
            color: var(--emerald);
        }

        .vendor-plan-starter {
            background: rgba(17, 17, 17, 0.08);
            color: rgba(17, 17, 17, 0.68);
        }

        .vendor-plan-elite {
            background: linear-gradient(125deg, rgba(243, 115, 30, 0.2), rgba(0, 77, 64, 0.22));
            color: var(--emerald);
        }

        .vendor-plan-free {
            background: rgba(17, 17, 17, 0.08);
            color: rgba(17, 17, 17, 0.68);
        }

        .vendor-badge.verified {
            background: rgba(0, 77, 64, 0.18);
            color: var(--emerald);
        }

        .vendor-badge.pending {
            background: rgba(255, 193, 7, 0.22);
            color: #a46f00;
        }

        .vendor-badge.unverified {
            background: rgba(217, 48, 37, 0.16);
            color: #a32018;
        }

        .vendor-actions {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
        }
        .vendor-actions .is-disabled {
            pointer-events: none;
            opacity: 0.6;
        }

        .vendor-actions a {
            padding: 10px 18px;
            border-radius: 12px;
            background: linear-gradient(135deg, rgba(243, 115, 30, 0.9), rgba(255, 138, 60, 0.9));
            color: var(--white);
            font-weight: 600;
            transition: transform 0.25s ease;
        }

        .vendor-actions a:hover {
            transform: translateY(-2px);
        }

        .quick-chat-card {
            display: grid;
            gap: 14px;
        }

        .quick-chat-card h3 {
            font-family: 'Anton', sans-serif;
            letter-spacing: 0.04em;
            font-size: clamp(1.2rem, 3.4vw, 1.6rem);
            color: var(--emerald);
        }

        .quick-chat-card p {
            margin: 0;
            color: rgba(17, 17, 17, 0.72);
        }

        .quick-chat-card .quick-input {
            display: grid;
            grid-template-columns: 1fr auto;
            background: rgba(255, 255, 255, 0.82);
            border-radius: 20px;
            padding: 10px 12px;
            gap: 10px;
            border: 1px solid rgba(0, 0, 0, 0.08);
            box-shadow: 0 14px 28px rgba(0, 0, 0, 0.12);
            backdrop-filter: blur(10px);
        }

        #quickMessageInput {
            border: none;
            background: transparent;
            font-size: 1rem;
            color: rgba(17, 17, 17, 0.86);
            outline: none;
        }

        #quickMessageSubmit {
            border: none;
            border-radius: 16px;
            padding: 0 18px;
            font-weight: 600;
            background: linear-gradient(135deg, rgba(243, 115, 30, 0.95), rgba(255, 138, 60, 0.9));
            color: #fff;
            display: inline-flex;
            align-items: center;
            gap: 6px;
            cursor: pointer;
            transition: transform 0.25s ease, box-shadow 0.25s ease;
        }

        #quickMessageSubmit:hover {
            transform: translateY(-1px);
            box-shadow: 0 12px 24px rgba(243, 115, 30, 0.4);
        }

        .quick-suggestions {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
        }

        .suggestion-chip {
            border: none;
            border-radius: 999px;
            padding: 8px 14px;
            background: rgba(234, 220, 207, 0.6);
            color: rgba(17, 17, 17, 0.75);
            font-weight: 600;
            cursor: pointer;
            transition: transform 0.25s ease, box-shadow 0.25s ease, background 0.25s ease;
        }

        .suggestion-chip:hover {
            transform: translateY(-2px);
            background: rgba(243, 115, 30, 0.15);
            box-shadow: 0 10px 20px rgba(0, 0, 0, 0.12);
        }

        .quick-chat-card small {
            color: rgba(17, 17, 17, 0.6);
        }

        /* <!-- Related Products --> */
        .related-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
            gap: 18px;
        }

        .related-card {
            background: rgba(255, 255, 255, 0.78);
            border-radius: 18px;
            overflow: hidden;
            box-shadow: 0 8px 18px rgba(0, 0, 0, 0.12);
            transition: transform 0.25s ease, box-shadow 0.25s ease;
            display: flex;
            flex-direction: column;
        }

        .related-card img {
            width: 100%;
            aspect-ratio: 4 / 3;
            object-fit: cover;
        }

        .related-card .info {
            padding: 14px 16px 18px;
            display: grid;
            gap: 6px;
        }

        .related-card .info h4 {
            font-size: 1rem;
            color: var(--emerald);
        }

        .related-card .info p {
            font-size: 0.9rem;
            color: rgba(17, 17, 17, 0.7);
        }

        .related-card button {
            margin-top: 6px;
            padding: 10px 12px;
            border-radius: 10px;
            border: none;
            background: rgba(0, 77, 64, 0.92);
            color: var(--white);
            font-weight: 600;
        }

        .related-card:hover {
            transform: translateY(-6px);
            box-shadow: 0 14px 26px rgba(0, 0, 0, 0.16);
        }

        /* <!-- Floating Action Buttons --> */
        .floating-cta {
            position: fixed;
            bottom: 24px;
            right: 20px;
            display: grid;
            gap: 14px;
            z-index: 90;
        }

        .floating-cta button {
            width: 56px;
            height: 56px;
            border-radius: 50%;
            border: none;
            display: grid;
            place-items: center;
            color: var(--white);
            font-size: 1.4rem;
            box-shadow: 0 12px 24px rgba(0, 0, 0, 0.16);
            position: relative;
            transition: transform 0.25s ease, box-shadow 0.25s ease;
        }

        .floating-cta button:hover {
            transform: translateY(-3px);
            box-shadow: 0 16px 30px rgba(0, 0, 0, 0.2);
        }

        .floating-cta button span {
            position: absolute;
            right: 65px;
            background: rgba(0, 0, 0, 0.85);
            color: var(--white);
            padding: 6px 12px;
            border-radius: 999px;
            font-size: 0.85rem;
            opacity: 0;
            transform: translateY(10px);
            transition: opacity 0.25s ease, transform 0.25s ease;
            pointer-events: none;
            white-space: nowrap;
        }

        .floating-cta button:hover span,
        .floating-cta button:focus-visible span {
            opacity: 1;
            transform: translateY(0);
        }

        .fab-chat {
            background: linear-gradient(135deg, #25d366, #1ebe57);
        }

        .fab-yustam {
            background: linear-gradient(135deg, var(--orange), #ff8c42);
        }

        .fab-yustam.is-loading::after {
            content: '';
            width: 20px;
            height: 20px;
            border-radius: 50%;
            border: 2px solid rgba(255, 255, 255, 0.4);
            border-top-color: #fff;
            animation: spin 1s linear infinite;
        }

        .fab-yustam.is-loading i {
            display: none;
        }

        .floating-cta .is-disabled {
            opacity: 0.55;
            cursor: not-allowed;
        }

        .floating-cta .is-disabled:hover {
            transform: none;
            box-shadow: 0 10px 18px rgba(0, 0, 0, 0.12);
        }

        footer {
            margin-top: auto;
            background: rgba(234, 220, 207, 0.7);
            backdrop-filter: blur(12px);
            padding: 40px 20px 30px;
            color: var(--emerald);
        }

        .footer-content {
            max-width: 1100px;
            margin: 0 auto;
            display: grid;
            gap: 18px;
            text-align: center;
        }

        .footer-links {
            display: flex;
            justify-content: center;
            gap: 16px;
            flex-wrap: wrap;
        }

        .footer-links a {
            color: var(--emerald);
            font-weight: 600;
        }

        .footer-social {
            display: flex;
            gap: 12px;
            justify-content: center;
            font-size: 1.2rem;
        }

        .footer-social a {
            color: var(--emerald);
            transition: color 0.25s ease;
        }

        .footer-social a:hover {
            color: var(--orange);
        }

        .empty-state {
            text-align: center;
            padding: 40px 20px;
            color: rgba(17, 17, 17, 0.6);
        }

        @keyframes fadeUp {
            from {
                opacity: 0;
                transform: translateY(20px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        @media (max-width: 768px) {
            .page-wrapper {
                padding: 90px 16px 110px;
            }


            .floating-cta {
                right: 16px;
                gap: 12px;
            }

            .floating-cta button span {
                right: auto;
                left: -10px;
                transform: translate(-100%, 10px);
            }

            .floating-cta button:hover span {
                transform: translate(-100%, 0);
            }
        }

        @media (prefers-reduced-motion: reduce) {
            *, *::before, *::after {
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
    data-buyer-name="<?= htmlspecialchars($buyerName ?: 'Buyer', ENT_QUOTES, 'UTF-8'); ?>"
    data-vendor-id="<?= htmlspecialchars($vendorNumericId, ENT_QUOTES, 'UTF-8'); ?>"
    data-vendor-uid="<?= htmlspecialchars($vendorUid, ENT_QUOTES, 'UTF-8'); ?>"
    data-vendor-name="<?= htmlspecialchars($vendorName, ENT_QUOTES, 'UTF-8'); ?>"
    data-vendor-plan="<?= htmlspecialchars($vendorPlan, ENT_QUOTES, 'UTF-8'); ?>"
    data-vendor-verified="<?= htmlspecialchars($vendorVerificationState, ENT_QUOTES, 'UTF-8'); ?>"
>
    <!-- Header -->
    <header>
        <div class="topbar">
            <button aria-label="Back to shop" onclick="window.location.href='shop.html'">
                <i class="ri-arrow-left-line"></i>
            </button>
            <h1 class="title">Product Details</h1>
            <button aria-label="Go home" onclick="window.location.href='index.html'">
                <i class="ri-home-4-line"></i>
            </button>
        </div>
        <div class="accent-bar" aria-hidden="true"></div>
    </header>

    <main class="page-wrapper">
        <!-- Gallery -->
        <section class="glass-card gallery" aria-label="Product image gallery">
            <div class="gallery-main">
                <img id="productImage" src="https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=1200&q=80" alt="Product main image">
            </div>
            <div id="thumbStrip" class="thumb-strip" role="list">
                <button class="active" data-image="https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=1200&q=80" aria-label="View image 1" role="listitem">
                    <img src="https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=400&q=80" alt="Thumbnail image 1">
                </button>
                <button data-image="https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1200&q=80" aria-label="View image 2" role="listitem">
                    <img src="https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=400&q=80" alt="Thumbnail image 2">
                </button>
                <button data-image="https://images.unsplash.com/photo-1458063048042-6e7bf3929aca?auto=format&fit=crop&w=1200&q=80" aria-label="View image 3" role="listitem">
                    <img src="https://images.unsplash.com/photo-1458063048042-6e7bf3929aca?auto=format&fit=crop&w=400&q=80" alt="Thumbnail image 3">
                </button>
            </div>
        </section>

        <!-- Product Details Section -->
        <section class="glass-card product-details" aria-labelledby="productName">
            <div class="product-header">
                <h2 id="productName" class="product-title"><?= htmlspecialchars($productTitle, ENT_QUOTES, 'UTF-8'); ?></h2>
                <p id="productPrice" class="price-tag">&mdash;</p>
                <button id="saveListingBtn" class="save-btn" type="button">
                    <i class="ri-heart-line" aria-hidden="true"></i>
                    Save
                </button>
                <span class="status-chip" id="productStatus">Checking availability</span>
                <div class="category-line" id="categoryLine" hidden>
                    <i class="ri-smartphone-line"></i>
                    <span id="categoryLabel">Listing category</span>
                </div>
                <div class="divider" aria-hidden="true"></div>
                <p id="productDesc" class="product-description">
                    Listing description will appear here once loaded from the vendor.
                </p>
                <ul id="featureList" class="feature-list" hidden></ul>
            </div>
            <input type="hidden" id="productId" value="<?= htmlspecialchars($productId, ENT_QUOTES, 'UTF-8'); ?>">
        </section>

        <!-- Specifications -->
        <section class="glass-card spec-card" aria-label="Product specifications">
            <details open>
                <summary>
                    <i class="ri-slideshow-line" aria-hidden="true"></i>
                    Specifications
                </summary>
                <div id="specList" class="spec-list"></div>
                <p id="specFallback" class="spec-empty" hidden>No additional specifications provided.</p>
            </details>
        </section>
        <!-- Quick Message Card -->
        <section
            id="quickChatCard"
            class="glass-card quick-chat-card"
            data-chat-id="<?= htmlspecialchars($chatId, ENT_QUOTES, 'UTF-8'); ?>"
            data-vendor-id="<?= htmlspecialchars($vendorNumericId, ENT_QUOTES, 'UTF-8'); ?>"
            data-vendor-uid="<?= htmlspecialchars($vendorUid !== '' ? $vendorUid : $vendorNumericId, ENT_QUOTES, 'UTF-8'); ?>"
            data-vendor-numeric-id="<?= htmlspecialchars($vendorNumericId, ENT_QUOTES, 'UTF-8'); ?>"
            data-vendor-name="<?= htmlspecialchars($vendorName, ENT_QUOTES, 'UTF-8'); ?>"
            data-buyer-id="<?= htmlspecialchars($buyerNumericId, ENT_QUOTES, 'UTF-8'); ?>"
            data-buyer-uid="<?= htmlspecialchars($buyerUid !== '' ? $buyerUid : $buyerNumericId, ENT_QUOTES, 'UTF-8'); ?>"
            data-buyer-numeric-id="<?= htmlspecialchars($buyerNumericId, ENT_QUOTES, 'UTF-8'); ?>"
            data-product-id="<?= htmlspecialchars($productId, ENT_QUOTES, 'UTF-8'); ?>"
            data-product-title="<?= htmlspecialchars($productTitle, ENT_QUOTES, 'UTF-8'); ?>"
            data-product-image="https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=400&q=80"
        >
            <h3>Chat with <?= htmlspecialchars($vendorName, ENT_QUOTES, 'UTF-8'); ?></h3>
            <p>Send a quick message about this listing. We'll open a secure YUSTAM chat with the vendor.</p>
            <form id="quickChatForm" class="quick-form">
                <div class="quick-input">
                    <input
                        id="quickMessageInput"
                        type="text"
                        name="quickMessage"
                        placeholder="Ask about delivery, availability, or pricing"
                        autocomplete="off"
                    >
                    <button id="quickMessageSubmit" type="submit">
                        <i class="ri-send-plane-fill" aria-hidden="true"></i>
                        Send
                    </button>
                </div>
            </form>
            <div class="quick-suggestions" aria-label="Quick message suggestions">
                <button type="button" class="suggestion-chip" data-quick-message="Is this still available?">Is this still available?</button>
                <button type="button" class="suggestion-chip" data-quick-message="Can I get a better price?">Can I get a better price?</button>
                <button type="button" class="suggestion-chip" data-quick-message="Final price please?">Final price please?</button>
                <button type="button" class="suggestion-chip" data-quick-message="Can you deliver to my area?">Can you deliver to my area?</button>
            </div>
            <small>We'll pop open chat and drop your message in instantly.</small>
        </section>

        <!-- Vendor Information Card -->
        <section class="glass-card vendor-card" aria-labelledby="vendorTitle">
            <div class="vendor-header">
                <img id="vendorAvatar" src="logo.jpeg" alt="Vendor profile photo" class="vendor-avatar">
                <div class="vendor-text">
                    <h3 id="vendorTitle"><?= htmlspecialchars($vendorName, ENT_QUOTES, 'UTF-8'); ?></h3>
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
            </div>
            <div id="vendorInfo" class="vendor-details">
                <p><strong>Contact:</strong> <a id="vendorEmailLink" href="#" aria-disabled="true">Unavailable</a> &middot; <a id="vendorPhoneLink" href="#" aria-disabled="true">Unavailable</a></p>
                <p id="vendorLocationRow" hidden><strong>Location:</strong> <span id="vendorLocation"></span></p>
                <p id="vendorSinceRow" hidden><strong>Member since:</strong> <span id="vendorSince"></span></p>
            </div>
            <div class="vendor-actions">
                <a id="vendorStorefrontLink" href="<?= htmlspecialchars($vendorProfileUrl, ENT_QUOTES, 'UTF-8'); ?>" class="view-profile" target="_blank" rel="noopener noreferrer">View Vendor Storefront</a>
                <a id="vendorWhatsappLink" href="#" class="email-vendor" target="_blank" rel="noopener" aria-disabled="true">WhatsApp Vendor</a>
            </div>
        </section>


        <!-- Related Products -->
        <section class="glass-card" aria-labelledby="relatedHeading">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
                <h3 id="relatedHeading" style="font-size: clamp(20px, 3vw, 26px); color: var(--emerald);">More from this Category</h3>
                <a href="shop.html" style="color: var(--orange); font-weight: 600;">View all ▸</a>
            </div>
            <div id="relatedGrid" class="related-grid">
                <article class="related-card" data-category="Phones" data-price="1200000">
                    <img src="https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?auto=format&fit=crop&w=600&q=80" alt="Related product 1">
                    <div class="info">
                        <h4>Samsung Galaxy S24 Ultra</h4>
                        <p>₦980,000</p>
                        <button type="button" onclick="window.location.href='product.html?id=galaxyS24'">View</button>
                    </div>
                </article>
                <article class="related-card" data-category="Phones" data-price="650000">
                    <img src="https://images.unsplash.com/photo-1580915411954-282cb1c83cfe?auto=format&fit=crop&w=600&q=80" alt="Related product 2">
                    <div class="info">
                        <h4>Google Pixel 8 Pro</h4>
                        <p>₦720,000</p>
                        <button type="button" onclick="window.location.href='product.html?id=pixel8'">View</button>
                    </div>
                </article>
                <article class="related-card" data-category="Phones" data-price="450000">
                    <img src="https://images.unsplash.com/photo-1549923746-c502d488b3ea?auto=format&fit=crop&w=600&q=80" alt="Related product 3">
                    <div class="info">
                        <h4>OnePlus 12</h4>
                        <p>₦540,000</p>
                        <button type="button" onclick="window.location.href='product.html?id=oneplus12'">View</button>
                    </div>
                </article>
                <article class="related-card" data-category="Phones" data-price="350000">
                    <img src="https://images.unsplash.com/photo-1608897013039-887f21d8c804?auto=format&fit=crop&w=600&q=80" alt="Related product 4">
                    <div class="info">
                        <h4>Xiaomi 14 Pro</h4>
                        <p>₦420,000</p>
                        <button type="button" onclick="window.location.href='product.html?id=xiaomi14'">View</button>
                    </div>
                </article>
            </div>
        </section>
    </main>

    <!-- Floating Action Buttons -->
    <div class="floating-cta" aria-label="Quick purchase actions">
        <button id="chatWithVendorBtn" class="fab-yustam" type="button" aria-label="Chat with vendor">
            <i class="ri-message-3-fill" aria-hidden="true"></i>
            <span>Chat with Vendor</span>
        </button>
        <button id="floatingWhatsappBtn" class="fab-chat is-disabled" type="button" aria-label="Chat on WhatsApp" aria-disabled="true">
            <i class="ri-whatsapp-line" aria-hidden="true"></i>
            <span>Chat on WhatsApp</span>
        </button>
    </div>

    <!-- Footer -->
    <footer>
        <div class="footer-content">
            <nav class="footer-links" aria-label="Footer navigation">
                <a href="index.html">Home</a>
                <a href="shop.html">Shop</a>
                <a href="vendor-register.html">Become a Vendor</a>
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
            <small>© 2025 YUSTAM - All Rights Reserved.</small>
        </div>
    </footer>

    <!-- Firebase Logic placeholder -->
  <script src="theme-manager.js" defer></script>
<script type="module" src="product.js"></script>
<script type="module" src="firebase.js"></script>
</body>
</html>






