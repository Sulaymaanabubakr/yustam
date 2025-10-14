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

$vendorTable = 'vendors';
if (defined('YUSTAM_VENDORS_TABLE') && preg_match('/^[A-Za-z0-9_]+$/', YUSTAM_VENDORS_TABLE)) {
    $vendorTable = YUSTAM_VENDORS_TABLE;
}
$stmt = $db->prepare(sprintf('SELECT * FROM %s WHERE id = ? LIMIT 1', $vendorTable));
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
$profilePhoto = $vendor['profile_photo'] ?? '';
$avatarFallback = 'https://res.cloudinary.com/demo/image/upload/v123456789/default_user.png';

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
            --shadow-soft: 0 18px 38px rgba(17, 17, 17, 0.12);
            --radius-large: 20px;
            --radius-medium: 18px;
        }

        * {
            box-sizing: border-box;
        }

        body {
            margin: 0;
            font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: radial-gradient(circle at top left, rgba(234, 220, 207, 0.9), rgba(255, 255, 255, 0.92));
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

        a {
            color: inherit;
        }

        .dashboard-header {
            position: sticky;
            top: 0;
            z-index: 60;
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0.95rem clamp(1.2rem, 4vw, 2.4rem);
            backdrop-filter: blur(16px);
            background: rgba(0, 77, 64, 0.94);
            box-shadow: 0 14px 26px rgba(0, 0, 0, 0.22);
            border-bottom: 2px solid rgba(243, 115, 30, 0.35);
            color: var(--white);
        }

        .header-brand {
            display: flex;
            align-items: center;
            gap: 0.9rem;
        }

        .logo-area {
            cursor: pointer;
        }

        .avatar-link {
            display: inline-flex;
            width: 42px;
            height: 42px;
            border-radius: 50%;
            border: 2px solid rgba(255, 255, 255, 0.65);
            padding: 2px;
            background: rgba(255, 255, 255, 0.18);
            box-shadow: 0 10px 18px rgba(0, 0, 0, 0.22);
            transition: transform 200ms ease, box-shadow 200ms ease, border-color 200ms ease;
        }

        .avatar-link:hover,
        .avatar-link:focus-visible {
            transform: translateY(-1px);
            border-color: rgba(243, 115, 30, 0.9);
            box-shadow: 0 16px 28px rgba(243, 115, 30, 0.35);
        }

        .header-avatar {
            width: 100%;
            height: 100%;
            border-radius: 50%;
            object-fit: cover;
        }

        .brand-text {
            display: flex;
            flex-direction: column;
            gap: 0.15rem;
        }

        .brand-title {
            font-size: clamp(1.45rem, 4vw, 1.9rem);
            font-family: 'Anton', sans-serif;
            letter-spacing: 0.08em;
        }

        .brand-subtitle {
            font-size: 0.85rem;
            opacity: 0.78;
        }

        .header-actions {
            display: flex;
            gap: clamp(0.55rem, 2vw, 0.85rem);
        }

        .icon-button {
            width: 46px;
            height: 46px;
            border-radius: 50%;
            border: 1px solid rgba(255, 255, 255, 0.2);
            display: inline-flex;
            align-items: center;
            justify-content: center;
            background: rgba(255, 255, 255, 0.15);
            color: var(--white);
            cursor: pointer;
            transition: transform 200ms ease, box-shadow 200ms ease, background 200ms ease;
        }

        .icon-button:hover,
        .icon-button:focus-visible {
            transform: translateY(-2px);
            background: rgba(243, 115, 30, 0.35);
            box-shadow: 0 12px 24px rgba(243, 115, 30, 0.35);
        }

        main {
            flex: 1;
            width: min(1180px, calc(100% - clamp(2rem, 6vw, 6.5rem)));
            margin: 0 auto;
            padding: clamp(2rem, 5vw, 3.4rem) 0 clamp(3.6rem, 6vw, 4.2rem);
            display: flex;
            flex-direction: column;
            gap: clamp(2rem, 5vw, 3rem);
        }

        .intro-card {
            background: rgba(255, 255, 255, 0.78);
            border-radius: var(--radius-large);
            padding: clamp(1.3rem, 4vw, 2rem);
            box-shadow: var(--shadow-soft);
            backdrop-filter: blur(18px);
            display: flex;
            flex-direction: column;
            gap: 0.6rem;
            animation: fadeUp 600ms ease 120ms both;
        }

        .intro-card h1 {
            margin: 0;
            font-size: clamp(1.6rem, 5vw, 2.2rem);
        }

        .intro-card p {
            margin: 0;
            color: rgba(17, 17, 17, 0.64);
            font-size: clamp(0.92rem, 2.6vw, 1rem);
        }

        .kpi-section {
            animation: fadeUp 600ms ease 220ms both;
        }

        .kpi-grid {
            display: grid;
            gap: clamp(1.5rem, 5vw, 2.3rem);
            grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        }

        .kpi-card {
            background: rgba(255, 255, 255, 0.82);
            border-radius: var(--radius-medium);
            padding: clamp(1.05rem, 2.6vw, 1.6rem);
            box-shadow: var(--shadow-soft);
            backdrop-filter: blur(16px);
            position: relative;
            overflow: hidden;
            transition: transform 250ms ease, box-shadow 250ms ease;
        }

        .kpi-card::after {
            content: '';
            position: absolute;
            inset: auto -30% -45% 30%;
            background: linear-gradient(135deg, rgba(243, 115, 30, 0.16), rgba(0, 77, 64, 0.08));
            pointer-events: none;
        }

        .kpi-card:hover {
            transform: translateY(-6px);
            box-shadow: 0 24px 38px rgba(17, 17, 17, 0.14);
        }

        .kpi-icon {
            font-size: 1.9rem;
            color: var(--orange);
            margin-bottom: 0.55rem;
        }

        .kpi-title {
            margin: 0;
            font-size: 0.95rem;
            color: rgba(17, 17, 17, 0.6);
        }

        .kpi-value {
            margin: 0.35rem 0 0;
            font-size: clamp(1.5rem, 3vw, 2.1rem);
            font-weight: 700;
            color: var(--emerald);
        }

        .glass-section {
            background: rgba(255, 255, 255, 0.82);
            border-radius: var(--radius-large);
            padding: clamp(1.6rem, 4vw, 2.3rem);
            box-shadow: var(--shadow-soft);
            backdrop-filter: blur(18px);
            display: flex;
            flex-direction: column;
            gap: clamp(1.3rem, 4vw, 2rem);
        }

        .section-header {
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            justify-content: space-between;
            gap: 0.8rem;
        }

        .section-header h2 {
            margin: 0;
            font-size: clamp(1.35rem, 4vw, 1.65rem);
        }

        .section-subtitle {
            margin: 0;
            color: rgba(17, 17, 17, 0.58);
            font-size: 0.95rem;
        }

        .badge {
            background: rgba(0, 77, 64, 0.12);
            color: var(--emerald);
            border-radius: 999px;
            padding: 0.35rem 0.9rem;
            font-weight: 600;
            font-size: 0.85rem;
        }

        .listings-grid {
            display: grid;
            gap: clamp(1rem, 3vw, 1.6rem);
            grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
        }

        .listing-card {
            background: rgba(255, 255, 255, 0.88);
            border-radius: var(--radius-medium);
            padding: clamp(1rem, 3vw, 1.4rem);
            box-shadow: 0 16px 34px rgba(17, 17, 17, 0.12);
            backdrop-filter: blur(18px);
            display: grid;
            gap: 0.75rem;
            transition: transform 220ms ease, box-shadow 220ms ease;
        }

        .listing-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 24px 44px rgba(17, 17, 17, 0.16);
        }

        .listing-top {
            display: flex;
            align-items: center;
            gap: 0.85rem;
        }

        .listing-thumb {
            width: 72px;
            height: 72px;
            border-radius: 18px;
            background: linear-gradient(140deg, rgba(0, 77, 64, 0.16), rgba(243, 115, 30, 0.25));
            display: grid;
            place-items: center;
            font-size: 2rem;
            color: rgba(255, 255, 255, 0.92);
            box-shadow: 0 12px 24px rgba(243, 115, 30, 0.18);
        }

        .listing-info h3 {
            margin: 0;
            font-size: 1.05rem;
            color: var(--emerald);
        }

        .listing-info p {
            margin: 0.15rem 0 0;
            font-size: 0.9rem;
            color: rgba(17, 17, 17, 0.58);
        }

        .listing-meta {
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            gap: 0.6rem;
            font-size: 0.85rem;
            color: rgba(17, 17, 17, 0.6);
        }

        .status-pill {
            padding: 0.35rem 0.75rem;
            border-radius: 999px;
            font-weight: 600;
            text-transform: capitalize;
        }

        .status-active { background: rgba(0, 77, 64, 0.15); color: var(--emerald); }
        .status-draft { background: rgba(234, 220, 207, 0.55); color: rgba(17, 17, 17, 0.7); }
        .status-pending { background: rgba(243, 115, 30, 0.15); color: var(--orange); }

        .listing-actions {
            display: flex;
            gap: 0.6rem;
        }

        .listing-actions a {
            border-radius: 999px;
            padding: 0.55rem 1.1rem;
            background: rgba(0, 77, 64, 0.12);
            color: var(--emerald);
            font-weight: 600;
            text-decoration: none;
            font-size: 0.9rem;
            transition: transform 200ms ease, box-shadow 200ms ease;
        }

        .listing-actions a:hover,
        .listing-actions a:focus-visible {
            transform: translateY(-2px);
            box-shadow: 0 12px 22px rgba(0, 0, 0, 0.12);
        }

        .empty-state {
            text-align: center;
            color: rgba(17, 17, 17, 0.58);
            font-size: 0.95rem;
            padding: 1.4rem 0;
        }

        .empty-state i {
            font-size: 2.1rem;
            display: block;
            margin-bottom: 0.6rem;
            color: rgba(0, 77, 64, 0.3);
        }

        .boost-section {
            animation: fadeUp 600ms ease 320ms both;
        }

        .boost-body {
            display: grid;
            gap: 1rem;
            color: rgba(17, 17, 17, 0.62);
            font-size: 0.95rem;
            line-height: 1.6;
        }

        .boost-actions {
            display: flex;
            flex-wrap: wrap;
            gap: 0.8rem;
        }

        .btn {
            border: none;
            border-radius: 999px;
            padding: 0.78rem 1.6rem;
            font-weight: 600;
            font-size: 0.95rem;
            cursor: pointer;
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
            box-shadow: 0 16px 28px rgba(0, 0, 0, 0.14);
        }

        .fab {
            position: fixed;
            right: clamp(1.1rem, 5vw, 3rem);
            bottom: clamp(1.2rem, 6vw, 3.4rem);
            width: 60px;
            height: 60px;
            border-radius: 50%;
            border: none;
            background: linear-gradient(145deg, #F3731E, #ff8d3d);
            color: var(--white);
            font-size: 1.8rem;
            box-shadow: 0 18px 34px rgba(243, 115, 30, 0.35);
            cursor: pointer;
            display: grid;
            place-items: center;
            transition: transform 200ms ease, box-shadow 200ms ease;
            z-index: 70;
        }

        .fab:hover,
        .fab:focus-visible {
            transform: translateY(-3px) scale(1.02);
            box-shadow: 0 26px 45px rgba(243, 115, 30, 0.45);
        }

        footer {
            margin-top: auto;
            text-align: center;
            padding: 1.6rem 1rem 2.4rem;
            color: var(--emerald);
            font-size: 0.92rem;
            background: rgba(234, 220, 207, 0.6);
            backdrop-filter: blur(12px);
        }

        footer a {
            color: var(--emerald);
            font-weight: 600;
            text-decoration: none;
        }

        .loader-wrapper {
            min-height: 100vh;
            display: grid;
            place-items: center;
            padding: 2rem;
        }

        .loader-card {
            background: rgba(255, 255, 255, 0.78);
            border-radius: var(--radius-large);
            padding: 2.3rem 2rem;
            box-shadow: var(--shadow-soft);
            backdrop-filter: blur(14px);
            text-align: center;
            width: min(320px, 100%);
        }

        .loader-spinner {
            width: 52px;
            height: 52px;
            border-radius: 50%;
            border: 4px solid rgba(0, 77, 64, 0.18);
            border-top-color: var(--orange);
            margin: 0 auto 1.4rem;
            animation: spin 1s linear infinite;
        }

        @media (max-width: 768px) {
            .dashboard-header {
                padding: 0.85rem clamp(1rem, 4vw, 1.4rem);
            }

            .brand-subtitle {
                display: none;
            }

            .intro-card {
                padding: 1.2rem;
            }

            .boost-actions {
                flex-direction: column;
                align-items: stretch;
            }

            .btn,
            .boost-actions .btn {
                width: 100%;
                justify-content: center;
            }
        }

        @media (max-width: 600px) {
            main {
                width: calc(100% - 2.8rem);
                padding: 1.8rem 0 3.6rem;
                gap: 2.6rem;
            }

            .intro-card,
            .glass-section,
            .kpi-card {
                padding: 1.5rem 1.25rem;
            }

            .section-header {
                align-items: flex-start;
                gap: 1rem;
            }
        }

        @keyframes spin {
            to { transform: rotate(1turn); }
        }

        @keyframes fadeUp {
            from {
                opacity: 0;
                transform: translateY(18px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
    </style>
</head>
<body>
    <div class="loader-wrapper" id="loader">
        <div class="loader-card" role="status" aria-live="polite">
            <div class="loader-spinner" aria-hidden="true"></div>
            <p style="margin:0; font-weight:600; color: var(--emerald);">Preparing your dashboard…</p>
            <p style="margin:0.4rem 0 0; color: rgba(17,17,17,0.62); font-size:0.92rem;">Hold on while we fetch your listings and stats.</p>
        </div>
    </div>

    <header id="dashboardHeader" class="dashboard-header" style="display:none;">
        <div class="header-brand logo-area" role="banner" tabindex="0">
            <a href="vendor-profile.php" class="avatar-link" aria-label="View profile">
                <img src="<?php echo htmlspecialchars($profilePhoto ?: $avatarFallback); ?>" alt="Vendor profile photo" class="header-avatar">
            </a>
            <div class="brand-text">
                <span class="brand-title">Vendor</span>
                <span class="brand-subtitle" id="headerGreeting">Curated commerce, crafted by you.</span>
            </div>
        </div>
        <div class="header-actions" aria-label="Dashboard navigation">
            <button class="icon-button notif-icon" type="button" id="notificationsBtn" aria-label="Notifications" title="Notifications">
                <i class="ri-notification-3-line"></i>
            </button>
            <button class="icon-button" type="button" id="settingsBtn" aria-label="Vendor settings">
                <i class="ri-settings-4-line"></i>
            </button>
            <button class="icon-button" type="button" id="chatBtn" aria-label="Chats" title="Chats">
                <i class="ri-chat-3-line"></i>
            </button>
            <button class="icon-button" type="button" id="logoutBtn" aria-label="Logout">
                <i class="ri-logout-circle-r-line"></i>
            </button>
        </div>
    </header>

    <main id="dashboard" style="display:none;" aria-live="polite">
        <section class="intro-card" aria-labelledby="welcomeTitle">
            <h1 id="welcomeTitle">Welcome back, <span id="welcomeName">Vendor</span>!</h1>
            <p>Your marketplace performance updates in real-time. Keep your catalog vibrant to stay ahead.</p>
        </section>

        <section class="kpi-section" aria-labelledby="snapshotTitle">
            <div class="section-header">
                <div>
                    <h2 id="snapshotTitle">Performance Snapshot</h2>
                    <p class="section-subtitle">Fresh insights from your latest activity.</p>
                </div>
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

        <section class="glass-section" aria-labelledby="listingsTitle">
            <div class="section-header">
                <div>
                    <h2 id="listingsTitle">Your Listings</h2>
                    <p class="section-subtitle">Manage the gems currently shining in the marketplace.</p>
                </div>
                <div class="badge" id="listingsBadge">0 Active</div>
            </div>
            <div class="empty-state" id="emptyState" hidden>
                <i class="ri-inbox-archive-line" aria-hidden="true"></i>
                You haven’t added any listings yet. Tap the orange plus button to get started.
            </div>
            <div class="listings-grid" id="listingGrid" aria-live="polite"></div>
        </section>

        <section class="glass-section boost-section" aria-labelledby="boostTitle">
            <div class="section-header">
                <div>
                    <h2 id="boostTitle">Boost Your Reach</h2>
                    <p class="section-subtitle">Unlock premium placement to reach more ready-to-buy customers.</p>
                </div>
            </div>
            <div class="boost-body">
                Elevate your storefront with curated campaigns, homepage features, and smart insights tuned for Nigerian shoppers. Ready when you are.
            </div>
            <div class="boost-actions">
                <button class="btn btn-accent" type="button" id="renewPlan">Renew Current Plan</button>
                <button class="btn btn-outline" type="button" id="viewPricing">View Pricing Deck</button>
            </div>
        </section>
    </main>

    <button class="fab" id="fab" aria-label="Add a new listing">
        <i class="ri-add-line" aria-hidden="true"></i>
    </button>

    <footer>
        © 2025 YUSTAM Marketplace — <a href="contact.html">Support</a>
    </footer>

    <script type="module" src="vendor-dashboard.js"></script>
</body>
</html>
