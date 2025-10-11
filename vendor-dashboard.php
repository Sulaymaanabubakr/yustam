<?php
ini_set('session.save_path', '/home2/yustamco/tmp');
session_start();

require_once __DIR__ . '/db.php';

if (!isset($_SESSION['vendor_id'])) {
    if (isset($_GET['format']) && $_GET['format'] === 'json') {
        header('Content-Type: application/json');
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Please sign in to access your dashboard.']);
        exit;
    }
    header('Location: vendor-login.html');
    exit;
}

$vendorId = (int)$_SESSION['vendor_id'];
$db = get_db_connection();

$stmt = $db->prepare('SELECT * FROM users WHERE id = ? LIMIT 1');
$stmt->bind_param('i', $vendorId);
$stmt->execute();
$result = $stmt->get_result();
$vendor = $result->fetch_assoc();
$stmt->close();

if (!$vendor) {
    if (isset($_GET['format']) && $_GET['format'] === 'json') {
        header('Content-Type: application/json');
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'We could not find your vendor account.']);
        exit;
    }
    header('Location: logout.php');
    exit;
}

$vendorName   = $vendor['full_name'] ?? '';
$businessName = $vendor['business_name'] ?? '';
$phone        = $vendor['phone'] ?? '';
$location     = $vendor['state'] ?? '';
$plan         = $vendor['plan'] ?? 'Free';
$createdAt    = $vendor['created_at'] ?? '';
$createdDisplay = $createdAt ? date('j M Y', strtotime($createdAt)) : '—';

$listings = [];
$stats = [
    'total_listings' => 0,
    'active_listings' => 0,
    'total_views' => 0,
];

try {
    $listingStmt = $db->prepare('SELECT id, title, price, status, created_at, views FROM listings WHERE vendor_id = ? ORDER BY created_at DESC LIMIT 25');
    $listingStmt->bind_param('i', $vendorId);
    $listingStmt->execute();
    $listingResult = $listingStmt->get_result();
    while ($row = $listingResult->fetch_assoc()) {
        $listings[] = [
            'title' => $row['title'] ?? 'Untitled',
            'price' => $row['price'] ?? 0,
            'status' => $row['status'] ?? 'Draft',
            'added_on' => isset($row['created_at']) ? date('j M Y', strtotime($row['created_at'])) : '—',
            'link' => 'product.html?id=' . ($row['id'] ?? ''),
        ];
        $stats['total_listings']++;
        if (strtolower($row['status'] ?? '') === 'active') {
            $stats['active_listings']++;
        }
        $stats['total_views'] += (int)($row['views'] ?? 0);
    }
    $listingStmt->close();
} catch (Throwable $e) {
    error_log('Dashboard listing query failed: ' . $e->getMessage());
}

if (isset($_GET['format']) && $_GET['format'] === 'json') {
    header('Content-Type: application/json');
    echo json_encode([
        'success' => true,
        'data' => [
            'profile' => [
                'name' => $vendorName,
                'businessName' => $businessName,
                'phone' => $phone,
                'location' => $location,
                'plan' => $plan,
                'joined' => $createdDisplay,
            ],
            'stats' => $stats,
            'listings' => $listings,
        ],
    ], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>YUSTAM Vendor Dashboard</title>
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
            --ink: #111111;
            --shadow-soft: 0 10px 30px rgba(0, 0, 0, 0.1);
            --radius-large: 20px;
            --radius-medium: 16px;
        }

        * {
            box-sizing: border-box;
        }

        body {
            margin: 0;
            font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: linear-gradient(160deg, rgba(234, 220, 207, 0.9), rgba(255, 255, 255, 0.95));
            color: var(--ink);
            min-height: 100vh;
            display: flex;
            flex-direction: column;
        }

        h1, h2, h3, h4 {
            font-family: 'Anton', sans-serif;
            letter-spacing: 0.02em;
            color: var(--emerald);
        }

        main {
            flex: 1;
            width: min(1180px, calc(100% - clamp(2rem, 6vw, 6.5rem)));
            margin: 0 auto;
            padding: clamp(1.75rem, 3vw, 3rem) 0 clamp(3rem, 5vw, 3.5rem);
            display: flex;
            flex-direction: column;
            gap: clamp(1.6rem, 3vw, 2.6rem);
            animation: fadeIn 600ms ease forwards;
        }

        main > section + section {
            margin-top: clamp(1.6rem, 3vw, 2.4rem);
        }

        header {
            position: sticky;
            top: 0;
            z-index: 50;
            background: rgba(0, 77, 64, 0.94);
            backdrop-filter: blur(12px);
            color: var(--white);
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0.85rem 1.5rem;
            box-shadow: 0 8px 20px rgba(0, 0, 0, 0.18);
        }

        .header-title {
            display: flex;
            align-items: center;
            gap: 0.6rem;
        }

        .header-title span {
            font-size: clamp(1.4rem, 4vw, 1.8rem);
            font-family: 'Anton', sans-serif;
            letter-spacing: 0.08em;
        }

        .logo-img {
            width: 44px;
            height: 44px;
            border-radius: 12px;
            object-fit: cover;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.18);
        }

        .header-actions {
            display: flex;
            gap: 0.75rem;
        }

        .icon-button {
            width: 42px;
            height: 42px;
            border-radius: 50%;
            border: none;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            background: rgba(255, 255, 255, 0.16);
            color: var(--white);
            cursor: pointer;
            transition: transform 200ms ease, background 200ms ease, box-shadow 200ms ease;
        }

        .icon-button:hover,
        .icon-button:focus-visible {
            transform: translateY(-2px);
            background: rgba(255, 255, 255, 0.28);
            box-shadow: 0 8px 16px rgba(0, 0, 0, 0.12);
        }

        .loader-wrapper {
            min-height: 100vh;
            display: grid;
            place-items: center;
            text-align: center;
            padding: 2rem;
        }

        .loader-card {
            background: rgba(255, 255, 255, 0.7);
            padding: 2.5rem 2rem;
            border-radius: var(--radius-large);
            box-shadow: var(--shadow-soft);
            backdrop-filter: blur(12px);
            max-width: 320px;
            width: 100%;
        }

        .loader-spinner {
            width: 48px;
            height: 48px;
            border-radius: 50%;
            border: 4px solid rgba(0, 77, 64, 0.15);
            border-top-color: var(--orange);
            margin: 0 auto 1.2rem auto;
            animation: spin 1s linear infinite;
        }

        .kpi-grid {
            display: grid;
            gap: clamp(1.2rem, 3vw, 1.75rem);
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        }

        .kpi-card {
            background: rgba(255, 255, 255, 0.85);
            border-radius: var(--radius-medium);
            padding: clamp(1rem, 2vw, 1.4rem);
            box-shadow: var(--shadow-soft);
            backdrop-filter: blur(10px);
            position: relative;
            overflow: hidden;
            transform: translateY(0);
            transition: transform 250ms ease, box-shadow 250ms ease;
        }

        .kpi-card::after {
            content: '';
            position: absolute;
            inset: auto 0 -55% 0;
            height: 115%;
            background: linear-gradient(120deg, rgba(243, 115, 30, 0.12), rgba(0, 77, 64, 0.04));
            pointer-events: none;
        }

        .kpi-card:hover {
            transform: translateY(-6px);
            box-shadow: 0 20px 35px rgba(17, 17, 17, 0.12);
        }

        .kpi-icon {
            font-size: 1.8rem;
            color: var(--orange);
            margin-bottom: 0.6rem;
        }

        .kpi-title {
            font-size: clamp(0.9rem, 2vw, 1rem);
            color: rgba(17, 17, 17, 0.68);
            margin: 0;
        }

        .kpi-value {
            font-size: clamp(1.45rem, 2.8vw, 2rem);
            margin: 0.35rem 0 0;
            font-weight: 700;
            color: var(--emerald);
        }

        .section-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: clamp(0.85rem, 2vw, 1.2rem);
            gap: 1rem;
        }

        .section-header h2 {
            margin: 0;
            font-size: clamp(1.25rem, 3vw, 1.6rem);
        }

        .section-header p {
            margin: 0;
            color: rgba(17, 17, 17, 0.6);
            font-size: 0.95rem;
        }

        .listings-section {
            background: rgba(255, 255, 255, 0.85);
            border-radius: var(--radius-large);
            padding: clamp(1.2rem, 3vw, 1.8rem);
            box-shadow: var(--shadow-soft);
            backdrop-filter: blur(12px);
            display: flex;
            flex-direction: column;
            gap: clamp(1rem, 2vw, 1.4rem);
        }

        .listings-table-wrapper {
            display: none;
            overflow-x: auto;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            min-width: 720px;
        }

        thead {
            background: rgba(234, 220, 207, 0.6);
        }

        th, td {
            padding: 0.85rem 1rem;
            text-align: left;
            font-size: 0.95rem;
        }

        tbody tr {
            border-bottom: 1px solid rgba(17, 17, 17, 0.05);
            transition: background 200ms ease;
        }

        tbody tr:hover {
            background: rgba(234, 220, 207, 0.2);
        }

        .status-pill {
            display: inline-flex;
            align-items: center;
            gap: 0.4rem;
            border-radius: 999px;
            padding: 0.35rem 0.75rem;
            font-size: 0.85rem;
            font-weight: 600;
        }

        .status-active { background: rgba(0, 77, 64, 0.12); color: var(--emerald); }
        .status-pending { background: rgba(243, 115, 30, 0.12); color: var(--orange); }
        .status-rejected { background: rgba(255, 56, 96, 0.12); color: #ff3860; }

        .action-buttons {
            display: flex;
            gap: 0.5rem;
        }

        .btn-icon {
            border: none;
            border-radius: 10px;
            padding: 0.45rem 0.8rem;
            cursor: pointer;
            font-size: 0.85rem;
            font-weight: 600;
            display: inline-flex;
            align-items: center;
            gap: 0.35rem;
            transition: transform 150ms ease, box-shadow 150ms ease;
        }

        .btn-icon.edit {
            background: rgba(0, 77, 64, 0.12);
            color: var(--emerald);
        }

        .btn-icon.delete {
            background: rgba(243, 115, 30, 0.12);
            color: var(--orange);
        }

        .btn-icon:hover,
        .btn-icon:focus-visible {
            transform: translateY(-1px);
            box-shadow: 0 8px 14px rgba(0, 0, 0, 0.12);
        }

        .card-listings {
            display: grid;
            gap: clamp(1.1rem, 3vw, 1.5rem);
        }

        .listing-card {
            display: grid;
            gap: 0.85rem;
            background: rgba(255, 255, 255, 0.8);
            border-radius: var(--radius-medium);
            padding: clamp(0.9rem, 2vw, 1.1rem);
            box-shadow: var(--shadow-soft);
            backdrop-filter: blur(10px);
        }

        .listing-card-header {
            display: flex;
            gap: 0.75rem;
        }

        .listing-card img {
            width: 92px;
            height: 92px;
            object-fit: cover;
            border-radius: 16px;
            box-shadow: 0 10px 20px rgba(0, 0, 0, 0.08);
        }

        .listing-card h3 {
            margin: 0;
            font-size: 1rem;
            color: var(--emerald);
        }

        .listing-card .meta {
            font-size: 0.9rem;
            color: rgba(17, 17, 17, 0.6);
        }

        .listing-card .price {
            font-weight: 700;
            font-size: 1.05rem;
        }

        .empty-state {
            text-align: center;
            padding: 2rem 1rem;
            color: rgba(17, 17, 17, 0.6);
            font-size: 0.95rem;
        }

        .profile-plan {
            display: grid;
            gap: clamp(1.3rem, 3vw, 1.9rem);
        }

        .profile-card,
        .plan-card {
            background: rgba(255, 255, 255, 0.82);
            border-radius: var(--radius-large);
            padding: clamp(1.15rem, 3vw, 1.7rem);
            box-shadow: var(--shadow-soft);
            backdrop-filter: blur(14px);
        }

        .profile-info {
            display: grid;
            gap: 0.6rem;
            font-size: 0.95rem;
        }

        .profile-info span {
            display: flex;
            justify-content: space-between;
            gap: 0.5rem;
            font-weight: 500;
        }

        .profile-actions {
            display: flex;
            flex-wrap: wrap;
            gap: clamp(0.6rem, 2vw, 0.9rem);
            margin-top: 1rem;
        }

        .btn {
            border: none;
            border-radius: 999px;
            padding: 0.75rem 1.4rem;
            font-weight: 600;
            cursor: pointer;
            font-size: 0.95rem;
            transition: transform 200ms ease, box-shadow 200ms ease, background 200ms ease;
        }

        .btn-primary {
            background: var(--emerald);
            color: var(--white);
        }

        .btn-accent {
            background: var(--orange);
            color: var(--white);
        }

        .btn-outline {
            background: transparent;
            border: 1px solid rgba(0, 77, 64, 0.4);
            color: var(--emerald);
        }

        .btn:hover,
        .btn:focus-visible {
            transform: translateY(-2px);
            box-shadow: 0 12px 22px rgba(0, 0, 0, 0.12);
        }

        .fab {
            position: fixed;
            right: clamp(1.2rem, 5vw, 3rem);
            bottom: clamp(1.2rem, 5vw, 3rem);
            width: 58px;
            height: 58px;
            border-radius: 50%;
            border: none;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            background: linear-gradient(135deg, #F3731E, #f58c47);
            color: var(--white);
            font-size: 1.8rem;
            box-shadow: 0 20px 35px rgba(243, 115, 30, 0.35);
            cursor: pointer;
            z-index: 60;
            animation: pulse 2.6s infinite;
        }

        footer {
            background: rgba(234, 220, 207, 0.8);
            text-align: center;
            padding: 1.4rem 1rem;
            color: rgba(17, 17, 17, 0.6);
            font-size: 0.9rem;
        }

        footer a {
            color: var(--emerald);
            font-weight: 600;
            text-decoration: none;
        }

        .modal-backdrop {
            position: fixed;
            inset: 0;
            background: rgba(17, 17, 17, 0.35);
            display: none;
            align-items: center;
            justify-content: center;
            z-index: 100;
            padding: 1rem;
        }

        .modal-backdrop.active {
            display: flex;
        }

        .modal {
            background: rgba(255, 255, 255, 0.95);
            border-radius: var(--radius-large);
            padding: 1.8rem;
            width: min(420px, 100%);
            box-shadow: 0 20px 45px rgba(0, 0, 0, 0.2);
            animation: scaleIn 260ms cubic-bezier(.2, .8, .2, 1);
        }

        .modal h3 {
            margin: 0 0 1rem;
            font-size: 1.2rem;
        }

        .modal-actions {
            display: flex;
            justify-content: flex-end;
            gap: 0.75rem;
            margin-top: 1.5rem;
        }

        .badge {
            display: inline-flex;
            align-items: center;
            gap: 0.4rem;
            padding: 0.35rem 0.75rem;
            border-radius: 999px;
            background: rgba(0, 77, 64, 0.12);
            color: var(--emerald);
            font-size: 0.85rem;
            font-weight: 600;
        }

        .plan-card .plan-body {
            margin: 1rem 0 1.5rem;
            color: rgba(17, 17, 17, 0.65);
            line-height: 1.6;
            font-size: 0.95rem;
        }

        .toast {
            position: fixed;
            left: 50%;
            bottom: clamp(1rem, 4vw, 2rem);
            transform: translateX(-50%) translateY(20px);
            background: rgba(17, 17, 17, 0.92);
            color: var(--white);
            padding: 0.85rem 1.4rem;
            border-radius: 999px;
            box-shadow: 0 20px 45px rgba(17, 17, 17, 0.25);
            font-size: 0.9rem;
            opacity: 0;
            pointer-events: none;
            transition: opacity 220ms ease, transform 220ms ease;
            z-index: 120;
        }

        .toast.show {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
        }

        @keyframes spin {
            to { transform: rotate(360deg); }
        }

        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(18px); }
            to { opacity: 1; transform: translateY(0); }
        }

        @keyframes pulse {
            0%, 100% { transform: scale(1); box-shadow: 0 20px 35px rgba(243, 115, 30, 0.35); }
            50% { transform: scale(1.05); box-shadow: 0 25px 45px rgba(243, 115, 30, 0.45); }
        }

        @keyframes scaleIn {
            from { opacity: 0; transform: scale(0.9); }
            to { opacity: 1; transform: scale(1); }
        }

        @media (min-width: 768px) {
            .listings-table-wrapper {
                display: block;
            }

            .card-listings {
                display: none;
            }

            .profile-plan {
                grid-template-columns: repeat(2, minmax(0, 1fr));
            }
        }

        @media (max-width: 767px) {
            main {
                width: calc(100% - clamp(1.5rem, 6vw, 2.5rem));
                padding-top: 1.5rem;
            }

            header {
                padding: 0.75rem 1rem;
            }
        }
    </style>
</head>
<body>
    <!-- Loader / Auth Guard -->
    <div class="loader-wrapper" id="loader">
        <div class="loader-card">
            <div class="loader-spinner" aria-hidden="true"></div>
            <p style="margin:0; font-weight:600; color: var(--emerald);">Preparing your dashboard…</p>
            <p style="margin:0.35rem 0 0; color: rgba(17,17,17,0.6); font-size:0.9rem;">Hold on while we fetch your listings and stats.</p>
        </div>
    </div>

    <!-- Dashboard Content -->
    <header id="dashboardHeader" style="display:none;">
        <!-- Header Logo -->
        <div class="header-title" role="banner">
            <img src="logo.jpeg" alt="YUSTAM logo" class="logo-img">
            <span>YUSTAM Vendors</span>
        </div>
        <div class="header-actions" aria-label="Dashboard navigation">
            <a class="icon-button" href="index.html" aria-label="Back to homepage">
                <i class="ri-home-4-line"></i>
            </a>
            <a class="icon-button" href="post.html" aria-label="Add new listing">
                <i class="ri-add-box-line"></i>
            </a>
            <button class="icon-button" id="logoutBtn" type="button" aria-label="Logout">
                <i class="ri-logout-box-r-line"></i>
            </button>
        </div>
    </header>

    <main id="dashboard" aria-live="polite" style="display:none;">
        <!-- KPI Cards -->
        <section class="kpi-section">
            <div class="section-header">
                <h2>Performance Snapshot</h2>
                <p>Key stats from the last 30 days.</p>
            </div>
            <div class="kpi-grid" id="kpiGrid">
                <article class="kpi-card" aria-live="polite">
                    <i class="ri-stack-line kpi-icon" aria-hidden="true"></i>
                    <p class="kpi-title">Total Listings</p>
                    <p class="kpi-value" id="totalListings">0</p>
                </article>
                <article class="kpi-card" aria-live="polite">
                    <i class="ri-checkbox-circle-line kpi-icon" aria-hidden="true"></i>
                    <p class="kpi-title">Active Listings</p>
                    <p class="kpi-value" id="activeListings">0</p>
                </article>
                <article class="kpi-card" aria-live="polite">
                    <i class="ri-eye-line kpi-icon" aria-hidden="true"></i>
                    <p class="kpi-title">Total Views</p>
                    <p class="kpi-value" id="totalViews">0</p>
                </article>
                <article class="kpi-card" aria-live="polite">
                    <i class="ri-vip-crown-line kpi-icon" aria-hidden="true"></i>
                    <p class="kpi-title">Current Plan</p>
                    <p class="kpi-value" id="currentPlan">Free</p>
                </article>
            </div>
        </section>

        <!-- Listings Section -->
        <section class="listings-section" aria-labelledby="listingsTitle">
            <div class="section-header">
                <div>
                    <h2 id="listingsTitle">Your Listings</h2>
                    <p>Manage the products you&apos;ve shared with the marketplace.</p>
                </div>
                <div class="badge" id="listingsBadge">0 Active</div>
            </div>

            <div class="empty-state" id="emptyState" hidden>
                <i class="ri-inbox-archive-line" style="font-size:2rem; display:block; margin-bottom:0.5rem;"></i>
                You haven&apos;t added any listings yet. Tap the orange button to get started!
            </div>

            <div class="card-listings" id="listingCards" aria-live="polite"></div>

            <div class="listings-table-wrapper" aria-live="polite">
                <table>
                    <thead>
                        <tr>
                            <th scope="col">Product</th>
                            <th scope="col">Price</th>
                            <th scope="col">Status</th>
                            <th scope="col">Date Added</th>
                            <th scope="col">Actions</th>
                        </tr>
                    </thead>
                    <tbody id="listingTableBody"></tbody>
                </table>
            </div>
        </section>

        <!-- Account Overview -->
        <section class="profile-plan" aria-labelledby="accountOverviewTitle">
            <div class="profile-card">
                <!-- Profile Card -->
                <div class="section-header" style="margin-bottom:1rem;">
                    <h2 id="accountOverviewTitle">Account Overview</h2>
                    <span class="badge" id="planBadge"><i class="ri-vip-crown-line"></i> Free Plan</span>
                </div>
                <div class="profile-info" id="profileInfo">
                    <span><strong>Name</strong><span id="vendorName">Loading…</span></span>
                    <span><strong>Business</strong><span id="businessName">—</span></span>
                    <span><strong>Phone</strong><span id="vendorPhone">—</span></span>
                    <span><strong>Location</strong><span id="vendorLocation">—</span></span>
                    <span><strong>Joined</strong><span id="vendorJoined">—</span></span>
                </div>
                <div class="profile-actions">
                    <a class="btn btn-outline" href="edit-vendor-profile.html">Edit Profile</a>
                    <button class="btn btn-primary" type="button" id="openPlanModal">Upgrade Plan</button>
                </div>
            </div>
            <div class="plan-card">
                <!-- Plan Details -->
                <h2>Boost Your Reach</h2>
                <div class="plan-body">
                    Upgrade to our Boosted or Premium plans to enjoy homepage placement, featured highlights, and access to smart analytics tailored to Nigerian buyers.
                </div>
                <div class="profile-actions">
                    <button class="btn btn-accent" type="button" id="renewPlan">Renew Current Plan</button>
                    <button class="btn btn-outline" type="button" id="viewPricing">View Pricing Deck</button>
                </div>
            </div>
        </section>
    </main>

    <!-- Floating Action Button -->
    <button class="fab" id="fab" aria-label="Add a new listing">
        <i class="ri-add-line" aria-hidden="true"></i>
    </button>

    <!-- Upgrade Modal -->
    <div class="modal-backdrop" id="planModal" role="dialog" aria-modal="true" aria-labelledby="planModalTitle" aria-hidden="true">
        <div class="modal">
            <h3 id="planModalTitle">Upgrade Your Plan</h3>
            <p>Unlock Premium reach with Paystack secure payments. Choose a plan below to proceed:</p>
            <ul style="padding-left:1.1rem; margin:0; line-height:1.6; color:rgba(17,17,17,0.7);">
                <li><strong>Boosted</strong> — ₦9,500 / month (Featured spots + chat priority)</li>
                <li><strong>Premium</strong> — ₦19,500 / month (Homepage banner + analytics)</li>
            </ul>
            <div class="modal-actions">
                <button class="btn btn-outline" type="button" data-close-modal>Close</button>
                <button class="btn btn-accent" type="button" id="launchPaystack">Continue to Paystack</button>
            </div>
        </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <div class="modal-backdrop" id="deleteModal" role="dialog" aria-modal="true" aria-labelledby="deleteModalTitle" aria-hidden="true">
        <div class="modal">
            <h3 id="deleteModalTitle">Delete Listing</h3>
            <p id="deleteModalMessage">Are you sure you want to remove this listing? This action cannot be undone.</p>
            <div class="modal-actions">
                <button class="btn btn-outline" type="button" data-close-modal>Cancel</button>
                <button class="btn btn-accent" type="button" id="confirmDelete">Delete</button>
            </div>
        </div>
    </div>

    <footer>
        © 2025 YUSTAM Marketplace · <a href="contact.html">Support</a>
    </footer>

    <script type="module" src="vendor-dashboard.js"></script>
</body>
</html>

