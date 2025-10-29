<?php
require_once __DIR__ . '/session-path.php';
session_start();

if (!isset($_SESSION['vendor_id'])) {
    header('Location: vendor-login.html');
    exit;
}

require_once __DIR__ . '/db.php';

$vendorId = (int)$_SESSION['vendor_id'];
$db = get_db_connection();

yustam_listings_ensure_table($db);

$vendor = yustam_vendor_find_by_id($vendorId, $db);
if (!$vendor) {
    header('Location: logout.php');
    exit;
}

$vendorUid = yustam_vendor_assign_uid_if_missing($db, $vendor);
$_SESSION['vendor_uid'] = $vendorUid;

$nameColumn = yustam_vendor_name_column();
$vendorName = trim((string)($vendor[$nameColumn] ?? 'Vendor'));
$businessName = yustam_vendor_table_has_column('business_name') ? trim((string)($vendor['business_name'] ?? '')) : '';
$plan = yustam_vendor_table_has_column('plan') ? trim((string)($vendor['plan'] ?? 'Free')) : 'Free';

$profilePhoto = '';
if (yustam_vendor_table_has_column('profile_photo')) {
    $profilePhoto = (string)($vendor['profile_photo'] ?? '');
} elseif (yustam_vendor_table_has_column('avatar_url')) {
    $profilePhoto = (string)($vendor['avatar_url'] ?? '');
}
$avatarFallback = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMjgiIGhlaWdodD0iMTI4IiB2aWV3Qm94PSIwIDAgMTI4IDEyOCI+PHJlY3Qgd2lkdGg9IjEyOCIgaGVpZ2h0PSIxMjgiIGZpbGw9IiNFQTVDQTQiLz48Y2lyY2xlIGN4PSI2NCIgY3k9IjQ4IiByPSIyOCIgZmlsbD0iIzAwNEQ0MCIvPjxwYXRoIGQ9Ik0yMCAxMThDMjAgOTQgNDAgNzQgNjQgNzRzNDQgMjAgNDQgNDRIMjAiIGZpbGw9IiMwMDRENDAiLz48L3N2Zz4=';
$profilePhotoUrl = $profilePhoto !== '' ? $profilePhoto : $avatarFallback;
if ($profilePhotoUrl !== '' && stripos($profilePhotoUrl, 'http') !== 0 && strpos($profilePhotoUrl, 'data:') !== 0) {
    $profilePhotoUrl = '/' . ltrim($profilePhotoUrl, '/');
}

$displayTitle = $businessName !== '' ? $businessName : $vendorName;
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Your Listings · YUSTAM</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <link href="https://cdn.jsdelivr.net/npm/remixicon@4.2.0/fonts/remixicon.css" rel="stylesheet">
    <style>
        :root {
            --emerald: #004D40;
            --orange: #F3731E;
            --beige: #F6F1EA;
            --ink: #111111;
            --white: #FFFFFF;
            --muted: #6B7280;
            --border: #E5E7EB;
            --bg: #FCFCFC;
            --shadow: 0 16px 42px rgba(17, 17, 17, 0.12);
            --radius-lg: 20px;
            --radius-md: 16px;
            --radius-sm: 12px;
        }

        * {
            box-sizing: border-box;
        }

        body {
            margin: 0;
            font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: var(--bg);
            color: var(--ink);
        }

        a {
            color: inherit;
            text-decoration: none;
        }

        header {
            position: sticky;
            top: 0;
            z-index: 10;
            background: rgba(252, 252, 252, 0.94);
            backdrop-filter: blur(12px);
            border-bottom: 1px solid rgba(0, 0, 0, 0.06);
        }

        .header-inner {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 1rem clamp(1rem, 4vw, 2.5rem);
            gap: 1rem;
        }

        .header-brand {
            display: flex;
            align-items: center;
            gap: 0.85rem;
        }

        .brand-avatar {
            width: 44px;
            height: 44px;
            border-radius: 50%;
            object-fit: cover;
            border: 2px solid rgba(243, 115, 30, 0.32);
            background: var(--white);
        }

        .brand-meta {
            display: flex;
            flex-direction: column;
            gap: 0.2rem;
        }

        .brand-meta span {
            display: block;
            line-height: 1.2;
        }

        .brand-title {
            font-weight: 700;
            font-size: 1rem;
        }

        .brand-subtitle {
            font-size: 0.85rem;
            color: var(--muted);
        }

        .header-actions {
            display: flex;
            gap: 0.6rem;
            align-items: center;
        }

        .ghost-btn {
            border: 1px solid rgba(0, 77, 64, 0.16);
            background: rgba(255, 255, 255, 0.8);
            color: var(--emerald);
            padding: 0.6rem 1.1rem;
            border-radius: 999px;
            font-weight: 600;
            display: inline-flex;
            align-items: center;
            gap: 0.4rem;
            font-size: 0.95rem;
            cursor: pointer;
            transition: all 0.2s ease;
        }

        .ghost-btn:hover,
        .ghost-btn:focus-visible {
            background: rgba(0, 77, 64, 0.08);
            border-color: rgba(0, 77, 64, 0.28);
        }

        main {
            padding: clamp(1.25rem, 4vw, 2.75rem);
            max-width: 1200px;
            margin: 0 auto;
            display: flex;
            flex-direction: column;
            gap: clamp(1.5rem, 4vw, 2.5rem);
        }

        .page-hero {
            background: linear-gradient(120deg, rgba(0, 77, 64, 0.12), rgba(243, 115, 30, 0.10));
            border: 1px solid rgba(0, 77, 64, 0.08);
            box-shadow: var(--shadow);
            border-radius: var(--radius-lg);
            padding: clamp(1.6rem, 5vw, 2.8rem);
            display: grid;
            gap: 1rem;
        }

        .page-hero h1 {
            font-size: clamp(1.55rem, 4.8vw, 2.2rem);
            margin: 0;
        }

        .page-hero p {
            margin: 0;
            color: var(--muted);
            font-size: 0.95rem;
        }

        .filters-bar {
            background: var(--white);
            border-radius: var(--radius-lg);
            border: 1px solid rgba(0, 0, 0, 0.06);
            display: flex;
            flex-wrap: wrap;
            gap: 1rem;
            padding: clamp(1rem, 3.4vw, 1.4rem);
            align-items: center;
            justify-content: space-between;
        }

        .filters-group {
            display: flex;
            flex-wrap: wrap;
            gap: 0.75rem;
            align-items: center;
        }

        .form-field {
            display: flex;
            flex-direction: column;
            gap: 0.4rem;
            min-width: min(230px, 100%);
        }

        .form-field label {
            font-size: 0.85rem;
            font-weight: 600;
            color: var(--muted);
        }

        .form-field input,
        .form-field select {
            appearance: none;
            border: 1px solid rgba(0, 0, 0, 0.12);
            border-radius: var(--radius-sm);
            padding: 0.65rem 0.95rem;
            font-size: 0.95rem;
            background: rgba(255, 255, 255, 0.95);
            transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }

        .form-field input:focus-visible,
        .form-field select:focus-visible {
            outline: none;
            border-color: rgba(0, 77, 64, 0.45);
            box-shadow: 0 0 0 3px rgba(0, 77, 64, 0.16);
        }

        .accent-btn {
            background: var(--orange);
            border: none;
            color: var(--white);
            padding: 0.8rem 1.25rem;
            border-radius: 999px;
            font-weight: 600;
            cursor: pointer;
            display: inline-flex;
            gap: 0.5rem;
            align-items: center;
            transition: transform 0.2s ease, box-shadow 0.2s ease;
            font-size: 0.95rem;
        }

        .accent-btn:hover,
        .accent-btn:focus-visible {
            transform: translateY(-1px);
            box-shadow: 0 14px 28px rgba(243, 115, 30, 0.24);
        }

        .listings-section {
            display: grid;
            gap: 1.4rem;
        }

        .listings-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(min(260px, 100%), 1fr));
            gap: clamp(1rem, 4vw, 1.75rem);
        }

        .listing-card {
            background: var(--white);
            border-radius: var(--radius-lg);
            border: 1px solid rgba(0, 0, 0, 0.05);
            display: grid;
            gap: 0.9rem;
            padding: 1.1rem;
            position: relative;
            box-shadow: 0 12px 32px rgba(17, 17, 17, 0.08);
            transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .listing-card:hover,
        .listing-card:focus-within {
            transform: translateY(-3px);
            box-shadow: 0 18px 48px rgba(17, 17, 17, 0.12);
        }

        .listing-thumb {
            width: 100%;
            aspect-ratio: 4 / 3;
            border-radius: var(--radius-md);
            background: rgba(0, 0, 0, 0.06);
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 700;
            font-size: 1.6rem;
            color: rgba(0, 0, 0, 0.32);
            overflow: hidden;
        }

        .listing-thumb img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }

        .listing-info {
            display: grid;
            gap: 0.3rem;
        }

        .listing-info h3 {
            margin: 0;
            font-size: 1.05rem;
            line-height: 1.4;
        }

        .listing-meta {
            display: flex;
            flex-wrap: wrap;
            gap: 0.6rem;
            align-items: center;
        }

        .price-badge {
            padding: 0.35rem 0.65rem;
            border-radius: 999px;
            background: rgba(0, 77, 64, 0.10);
            color: var(--emerald);
            font-weight: 600;
            font-size: 0.85rem;
        }

        .status-pill {
            padding: 0.35rem 0.65rem;
            border-radius: 999px;
            font-size: 0.85rem;
            font-weight: 600;
            text-transform: capitalize;
            background: rgba(107, 114, 128, 0.16);
            color: #374151;
        }

        .status-pill.status-approved {
            background: rgba(0, 77, 64, 0.16);
            color: var(--emerald);
        }

        .status-pill.status-pending {
            background: rgba(243, 115, 30, 0.16);
            color: var(--orange);
        }

        .status-pill.status-draft {
            background: rgba(107, 114, 128, 0.18);
        }

        .status-pill.status-unlisted,
        .status-pill.status-archived {
            background: rgba(55, 65, 81, 0.14);
            color: #1F2937;
        }

        .status-pill.status-sold {
            background: rgba(16, 185, 129, 0.16);
            color: #047857;
        }

        .listing-actions {
            display: flex;
            flex-wrap: wrap;
            gap: 0.6rem;
        }

        .listing-actions a,
        .listing-actions button {
            border: none;
            border-radius: 999px;
            padding: 0.55rem 1.05rem;
            font-size: 0.9rem;
            font-weight: 600;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            gap: 0.35rem;
            transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .listing-actions a {
            background: rgba(0, 77, 64, 0.12);
            color: var(--emerald);
        }

        .listing-actions button {
            background: rgba(243, 115, 30, 0.16);
            color: var(--orange);
        }

        .listing-actions a:hover,
        .listing-actions button:hover,
        .listing-actions a:focus-visible,
        .listing-actions button:focus-visible {
            transform: translateY(-2px);
            box-shadow: 0 12px 24px rgba(17, 17, 17, 0.12);
        }

        .empty-state {
            border: 1px dashed rgba(0, 0, 0, 0.12);
            border-radius: var(--radius-lg);
            padding: 2.2rem 1.4rem;
            text-align: center;
            color: var(--muted);
            background: rgba(255, 255, 255, 0.8);
            display: grid;
            gap: 0.7rem;
            place-items: center;
        }

        .empty-state i {
            font-size: 2rem;
            color: rgba(0, 77, 64, 0.35);
        }

        .load-more {
            align-self: center;
            padding: 0.75rem 1.6rem;
            border-radius: 999px;
            border: 1px solid rgba(0, 77, 64, 0.28);
            background: rgba(255, 255, 255, 0.96);
            color: var(--emerald);
            font-weight: 600;
            font-size: 0.95rem;
            cursor: pointer;
            display: inline-flex;
            gap: 0.4rem;
            align-items: center;
            transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .load-more:hover,
        .load-more:focus-visible {
            transform: translateY(-2px);
            box-shadow: 0 14px 28px rgba(17, 17, 17, 0.1);
        }

        .page-loader {
            position: fixed;
            inset: 0;
            background: rgba(252, 252, 252, 0.88);
            display: none;
            align-items: center;
            justify-content: center;
            z-index: 20;
        }

        .page-loader.active {
            display: flex;
        }

        .spinner {
            width: 36px;
            height: 36px;
            border-radius: 50%;
            border: 3px solid rgba(0, 77, 64, 0.25);
            border-top-color: var(--orange);
            animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
            to {
                transform: rotate(360deg);
            }
        }

        @media (max-width: 720px) {
            .header-inner {
                padding: 0.85rem 1rem;
            }

            .header-actions {
                display: none;
            }

            main {
                padding: 1.2rem;
            }

            .filters-bar {
                flex-direction: column;
                align-items: stretch;
            }

            .filters-group {
                width: 100%;
            }

            .form-field {
                width: 100%;
            }

            .accent-btn {
                justify-content: center;
                width: 100%;
            }
        }

        .listing-editor {
            position: fixed;
            inset: 0;
            display: none;
            align-items: center;
            justify-content: center;
            padding: 16px;
            z-index: 140;
        }

        .listing-editor.is-open {
            display: flex;
        }

        .listing-editor[hidden] {
            display: none !important;
        }

        .listing-editor__overlay {
            position: absolute;
            inset: 0;
            background: rgba(17, 17, 17, 0.48);
            backdrop-filter: blur(2px);
        }

        .listing-editor__dialog {
            position: relative;
            background: #ffffff;
            border-radius: 20px;
            width: min(540px, 100%);
            max-height: min(90vh, 640px);
            overflow: hidden auto;
            box-shadow: 0 28px 60px rgba(0, 0, 0, 0.16);
            display: flex;
            flex-direction: column;
        }

        .listing-editor__form {
            display: flex;
            flex-direction: column;
            gap: 1rem;
            padding: 1.5rem;
        }

        .listing-editor__header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 1rem;
        }

        .listing-editor__header h2 {
            margin: 0;
            font-size: 1.25rem;
        }

        .listing-editor__close {
            border: none;
            background: rgba(0, 0, 0, 0.06);
            border-radius: 50%;
            width: 36px;
            height: 36px;
            display: grid;
            place-items: center;
            cursor: pointer;
        }

        .listing-editor__status {
            min-height: 1.2rem;
            font-size: 0.85rem;
            color: rgba(17, 17, 17, 0.6);
        }

        .listing-editor__field {
            display: flex;
            flex-direction: column;
            gap: 0.35rem;
        }

        .listing-editor__field label {
            font-size: 0.9rem;
            font-weight: 600;
            color: rgba(17, 17, 17, 0.72);
        }

        .listing-editor__field input,
        .listing-editor__field select,
        .listing-editor__field textarea {
            width: 100%;
            border: 1px solid rgba(17, 17, 17, 0.12);
            border-radius: 12px;
            padding: 0.65rem 0.75rem;
            font-size: 0.95rem;
            font-family: inherit;
            transition: border 160ms ease, box-shadow 160ms ease;
        }

        .listing-editor__field input:focus,
        .listing-editor__field select:focus,
        .listing-editor__field textarea:focus {
            outline: none;
            border-color: rgba(0, 77, 64, 0.4);
            box-shadow: 0 0 0 4px rgba(0, 77, 64, 0.12);
        }

        .listing-editor__grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 0.75rem;
        }

        .listing-editor__preview {
            border-radius: 14px;
            background: rgba(0, 77, 64, 0.08);
            padding: 0.75rem;
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
        }

        .listing-editor__preview[hidden] {
            display: none !important;
        }

        .listing-editor__preview-label {
            font-size: 0.82rem;
            font-weight: 600;
            color: rgba(17, 17, 17, 0.62);
        }

        .listing-editor__preview img {
            width: 100%;
            border-radius: 12px;
            object-fit: cover;
            max-height: 220px;
        }

        .listing-editor__actions {
            display: flex;
            justify-content: flex-end;
            gap: 0.85rem;
            margin-top: 0.5rem;
        }

        .listing-editor__secondary {
            border: none;
            background: rgba(17, 17, 17, 0.08);
            color: rgba(17, 17, 17, 0.82);
            padding: 0.65rem 1.3rem;
            border-radius: 999px;
            cursor: pointer;
            font-weight: 600;
        }

        .listing-editor__submit {
            border: none;
            background: linear-gradient(135deg, var(--orange), #ff8845);
            color: #fff;
            padding: 0.7rem 1.6rem;
            border-radius: 999px;
            cursor: pointer;
            font-weight: 700;
            display: inline-flex;
            align-items: center;
            gap: 0.6rem;
        }

        .listing-editor__submit[disabled] {
            opacity: 0.7;
            cursor: wait;
        }

        .listing-editor__spinner {
            width: 18px;
            height: 18px;
            border-radius: 50%;
            border: 2px solid rgba(255, 255, 255, 0.4);
            border-top-color: #fff;
            animation: spin 720ms linear infinite;
            display: none;
        }

        .listing-editor__submit[disabled] .listing-editor__spinner {
            display: inline-block;
        }

        @keyframes spin {
            to {
                transform: rotate(360deg);
            }
        }

        @media (max-width: 768px) {
            .listing-editor__dialog {
                width: min(480px, 100%);
            }

            .listing-editor__form {
                padding: 1.25rem;
            }
        }

        @media (max-width: 600px) {
            .listing-editor {
                align-items: flex-end;
                padding: 0;
            }

            .listing-editor__dialog {
                width: 100%;
                border-radius: 20px 20px 0 0;
            }
        }
    </style>
</head>
<body>
    <div id="pageLoader" class="page-loader" aria-hidden="true">
        <div class="spinner" role="status" aria-label="Loading"></div>
    </div>
    <header>
        <div class="header-inner">
            <div class="header-brand">
                <img src="<?php echo htmlspecialchars($profilePhotoUrl, ENT_QUOTES); ?>" alt="Vendor avatar" class="brand-avatar">
                <div class="brand-meta">
                    <span class="brand-title"><?php echo htmlspecialchars($displayTitle, ENT_QUOTES); ?></span>
                    <span class="brand-subtitle">Plan: <?php echo htmlspecialchars($plan, ENT_QUOTES); ?></span>
                </div>
            </div>
            <div class="header-actions">
                <button type="button" class="ghost-btn" id="backToDashboard">
                    <i class="ri-arrow-left-line"></i>
                    Dashboard
                </button>
                <button type="button" class="ghost-btn" id="viewStorefront">
                    <i class="ri-store-2-line"></i>
                    View storefront
                </button>
            </div>
        </div>
    </header>

    <main>
        <section class="page-hero">
            <h1>Manage your listings</h1>
            <p>Track every product in one view. Edit quickly, spot stalled items, and keep your storefront fresh for shoppers.</p>
        </section>

        <section class="filters-bar" aria-label="Filter listings">
            <div class="filters-group">
                <div class="form-field">
                    <label for="searchListings">Search listings</label>
                    <input type="search" id="searchListings" placeholder="Search by title or description">
                </div>
                <div class="form-field">
                    <label for="statusFilter">Status</label>
                    <select id="statusFilter">
                        <option value="all">All statuses</option>
                        <option value="approved">Approved</option>
                        <option value="pending">Pending</option>
                        <option value="draft">Draft</option>
                        <option value="unlisted">Unlisted</option>
                        <option value="sold">Sold</option>
                        <option value="archived">Archived</option>
                    </select>
                </div>
                <div class="form-field">
                    <label for="sortOrder">Sort by</label>
                    <select id="sortOrder">
                        <option value="recent">Newest first</option>
                        <option value="views">Most views</option>
                        <option value="price_desc">Price: High to low</option>
                        <option value="price_asc">Price: Low to high</option>
                    </select>
                </div>
            </div>
            <button type="button" class="accent-btn" id="addListing">
                <i class="ri-add-line"></i>
                Add new listing
            </button>
        </section>

        <section class="listings-section" aria-live="polite">
            <div id="emptyState" class="empty-state" hidden>
                <i class="ri-inbox-archive-line" aria-hidden="true"></i>
                <div>No listings yet. Start by adding your first product to the marketplace.</div>
                <button type="button" class="accent-btn" id="emptyStateCTA">
                    <i class="ri-add-line"></i>
                    Create listing
                </button>
            </div>
            <div id="listingsGrid" class="listings-grid"></div>
            <button type="button" class="load-more" id="loadMoreBtn" hidden>
                <i class="ri-refresh-line"></i>
                Load more
            </button>
        </section>
    </main>

    <?php require __DIR__ . '/vendor-listing-editor-modal.php'; ?>
    <script src="theme-manager.js" defer></script>
    <script type="module" src="vendor-listings.js"></script>
</body>
</html>
