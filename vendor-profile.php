<?php
ini_set('session.save_path', '/home2/yustamco/tmp');
session_start();

require_once __DIR__ . '/db.php';

if (!isset($_SESSION['vendor_id'])) {
    if (isset($_GET['format']) && $_GET['format'] === 'json') {
        header('Content-Type: application/json');
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'You must sign in to view this profile.']);
        exit;
    }
    header('Location: vendor-login.html');
    exit;
}

$vendorId = (int)$_SESSION['vendor_id'];
$db = get_db_connection();

$stmt = $db->prepare('SELECT * FROM ' . YUSTAM_USERS_TABLE . ' WHERE id = ? LIMIT 1');
$stmt->bind_param('i', $vendorId);
$stmt->execute();
$result = $stmt->get_result();
$vendor = $result->fetch_assoc();
$stmt->close();

if (!$vendor) {
    if (isset($_GET['format']) && $_GET['format'] === 'json') {
        header('Content-Type: application/json');
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'We could not find your vendor record.']);
        exit;
    }
    header('Location: logout.php');
    exit;
}

$nameColumn = yustam_users_column('name');
$profile = [
    'name' => $vendor[$nameColumn] ?? '',
    'businessName' => yustam_users_table_has_column('business_name') ? ($vendor['business_name'] ?? '') : '',
    'email' => $vendor['email'] ?? '',
    'phone' => yustam_users_table_has_column('phone') ? ($vendor['phone'] ?? '') : '',
    'address' => yustam_users_table_has_column('business_address') ? ($vendor['business_address'] ?? '') : '',
    'state' => yustam_users_table_has_column('state') ? ($vendor['state'] ?? '') : '',
    'plan' => yustam_users_table_has_column('plan') ? ($vendor['plan'] ?? 'Free') : 'Free',
    'joined' => (yustam_users_table_has_column('created_at') && isset($vendor['created_at'])) ? date('j M Y', strtotime($vendor['created_at'])) : '—',
    'profilePhoto' => yustam_users_table_has_column('profile_photo') ? ($vendor['profile_photo'] ?? '') : '',
];

if (isset($_GET['format']) && $_GET['format'] === 'json') {
    header('Content-Type: application/json');
    echo json_encode(['success' => true, 'profile' => $profile], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Vendor Profile | YUSTAM Marketplace</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Anton&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <link href="https://cdn.jsdelivr.net/npm/remixicon@4.2.0/fonts/remixicon.css" rel="stylesheet" />
  <style>
    :root {
      --emerald: #0f6a53;
      --emerald-dark: #0c5441;
      --orange: #f3731e;
      --orange-light: #ff9448;
      --beige: #f3ebe0;
      --ink: #191919;
      --muted: rgba(25, 25, 25, 0.6);
      --glass-bg: rgba(255, 255, 255, 0.88);
      --shadow: 0 30px 45px rgba(15, 106, 83, 0.12);
      --radius-card: 24px;
    }

    *,
    *::before,
    *::after {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background:
        radial-gradient(circle at top right, rgba(15, 106, 83, 0.12), transparent 55%),
        radial-gradient(circle at bottom left, rgba(243, 115, 30, 0.12), transparent 50%),
        var(--beige);
      min-height: 100vh;
      color: var(--ink);
      display: flex;
      flex-direction: column;
    }

    .app-header {
      position: sticky;
      top: 0;
      z-index: 30;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 18px;
      background: rgba(15, 106, 83, 0.94);
      backdrop-filter: blur(10px);
      box-shadow: 0 10px 24px rgba(0, 0, 0, 0.18);
      color: #ffffff;
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .header-logo {
      width: 44px;
      height: 44px;
      border-radius: 14px;
      overflow: hidden;
      background: rgba(255, 255, 255, 0.18);
      display: grid;
      place-items: center;
      box-shadow: 0 10px 18px rgba(0, 0, 0, 0.25);
    }

    .header-logo img {
      width: 40px;
      height: 40px;
      object-fit: cover;
      border-radius: 12px;
    }

    .header-title {
      font-family: 'Anton', sans-serif;
      font-size: clamp(20px, 5vw, 26px);
      letter-spacing: 0.08em;
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .header-icon {
      width: 42px;
      height: 42px;
      border-radius: 50%;
      border: none;
      background: rgba(255, 255, 255, 0.18);
      color: #ffffff;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      cursor: pointer;
      text-decoration: none;
      transition: transform 200ms ease, background 200ms ease, box-shadow 200ms ease;
    }

    .header-icon:hover,
    .header-icon:focus-visible {
      background: rgba(255, 255, 255, 0.28);
      transform: translateY(-2px);
      box-shadow: 0 14px 26px rgba(0, 0, 0, 0.22);
    }

    main {
      flex: 1;
      padding: 72px 18px 48px;
      display: flex;
      justify-content: center;
    }

    .page-shell {
      width: min(100%, 780px);
      display: flex;
      flex-direction: column;
      gap: 32px;
    }

    .glass-card {
      background: var(--glass-bg);
      border-radius: var(--radius-card);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.6);
      box-shadow: var(--shadow);
      padding: 24px;
    }

    .profile-card {
      display: flex;
      flex-direction: column;
      gap: 24px;
      position: relative;
    }

    .profile-card::before {
      content: '';
      position: absolute;
      inset: 0;
      border-radius: var(--radius-card);
      background: linear-gradient(135deg, rgba(15, 106, 83, 0.12), rgba(243, 115, 30, 0.08));
      mix-blend-mode: screen;
      pointer-events: none;
    }

    .profile-header {
      position: relative;
      display: flex;
      align-items: flex-start;
      gap: 18px;
      flex-wrap: wrap;
    }

    .initials-badge {
      width: 88px;
      height: 88px;
      border-radius: 50%;
      display: grid;
      place-items: center;
      font-family: 'Anton', sans-serif;
      font-size: 32px;
      letter-spacing: 0.08em;
      color: #ffffff;
      background: linear-gradient(135deg, var(--emerald), var(--emerald-dark));
      box-shadow: 0 18px 32px rgba(15, 106, 83, 0.28);
    }

    .identity-meta {
      display: flex;
      flex-direction: column;
      gap: 10px;
      min-width: 200px;
    }

    .vendor-name {
      margin: 0;
      font-family: 'Anton', sans-serif;
      font-size: clamp(26px, 6vw, 34px);
      letter-spacing: 0.05em;
    }

    .business-name {
      margin: 0;
      font-weight: 600;
      font-size: 16px;
      color: var(--muted);
    }

    .plan-chip {
      align-self: flex-start;
      padding: 6px 14px;
      border-radius: 999px;
      font-weight: 600;
      font-size: 13px;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: var(--emerald-dark);
      background: rgba(15, 106, 83, 0.12);
      border: 1px solid rgba(15, 106, 83, 0.25);
    }

    .plan-chip[data-plan="Free"] {
      color: #b76a17;
      background: rgba(243, 115, 30, 0.12);
      border-color: rgba(243, 115, 30, 0.32);
    }

    .plan-chip[data-plan="Elite Seller"],
    .plan-chip[data-plan="Power Vendor"] {
      color: #0b4a3a;
      background: rgba(15, 106, 83, 0.2);
      border-color: rgba(15, 106, 83, 0.3);
    }

    .details-grid {
      position: relative;
      display: grid;
      gap: 18px;
    }

    @media (min-width: 720px) {
      .details-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 20px 28px;
      }
    }

    .detail-item {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .detail-label {
      font-size: 13px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--muted);
      font-weight: 600;
    }

    .detail-value {
      margin: 0;
      font-size: 16px;
      font-weight: 600;
      color: var(--ink);
    }

    .detail-value strong {
      font-weight: inherit;
    }

    .upgrade-banner {
      display: none;
      align-items: center;
      gap: 12px;
      padding: 14px 16px;
      background: rgba(243, 115, 30, 0.12);
      border: 1px dashed rgba(243, 115, 30, 0.45);
      border-radius: 18px;
      color: #b25a13;
      font-weight: 600;
    }

    .upgrade-banner i {
      font-size: 20px;
    }

    .upgrade-card {
      display: flex;
      flex-direction: column;
      gap: 18px;
      position: relative;
    }

    .upgrade-card h2 {
      margin: 0;
      font-family: 'Anton', sans-serif;
      font-size: clamp(22px, 5vw, 28px);
      letter-spacing: 0.06em;
      color: var(--emerald-dark);
    }

    .upgrade-card p {
      margin: 0;
      color: var(--muted);
      font-size: 15px;
      line-height: 1.6;
    }

    .upgrade-actions {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    @media (min-width: 640px) {
      .upgrade-actions {
        flex-direction: row;
      }
    }

    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      border-radius: 999px;
      font-weight: 600;
      font-size: 15px;
      padding: 12px 20px;
      cursor: pointer;
      border: none;
      transition: transform 200ms ease, box-shadow 200ms ease, background 200ms ease;
      text-decoration: none;
      width: 100%;
    }

    .btn-primary {
      background: linear-gradient(135deg, var(--orange), var(--orange-light));
      color: #ffffff;
      box-shadow: 0 18px 34px rgba(243, 115, 30, 0.35);
    }

    .btn-primary:hover,
    .btn-primary:focus-visible {
      transform: translateY(-2px);
      box-shadow: 0 24px 38px rgba(243, 115, 30, 0.42);
    }

    .btn-outline {
      background: transparent;
      color: var(--emerald-dark);
      border: 1.5px solid rgba(15, 106, 83, 0.4);
    }

    .btn-outline:hover,
    .btn-outline:focus-visible {
      transform: translateY(-2px);
      background: rgba(15, 106, 83, 0.08);
      box-shadow: 0 16px 30px rgba(15, 106, 83, 0.22);
    }

    .btn-large {
      margin-top: 6px;
      font-size: 16px;
      padding: 14px 22px;
    }

    @media (min-width: 640px) {
      .btn {
        width: auto;
        min-width: 180px;
      }
    }

    .footer {
      margin-top: auto;
      padding: 28px 16px 36px;
      background: rgba(234, 220, 207, 0.82);
      text-align: center;
      font-size: 14px;
      color: rgba(25, 25, 25, 0.7);
      backdrop-filter: blur(8px);
    }

    .loading-state {
      position: fixed;
      inset: 0;
      background: rgba(243, 235, 224, 0.65);
      backdrop-filter: blur(6px);
      display: none;
      align-items: center;
      justify-content: center;
      z-index: 25;
    }

    .loading-state.active {
      display: flex;
    }

    .loading-pill {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      padding: 12px 18px;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.92);
      color: var(--emerald-dark);
      font-weight: 600;
      letter-spacing: 0.04em;
      box-shadow: 0 16px 30px rgba(15, 106, 83, 0.22);
    }

    .loading-pill span {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: currentColor;
      animation: pulse 1s ease-in-out infinite;
    }

    .loading-pill span:nth-child(2) {
      animation-delay: 0.15s;
    }

    .loading-pill span:nth-child(3) {
      animation-delay: 0.3s;
    }

    @keyframes pulse {
      0%,
      100% {
        transform: scale(0.8);
        opacity: 0.5;
      }
      50% {
        transform: scale(1.1);
        opacity: 1;
      }
    }

    @media (min-width: 960px) {
      main {
        padding-top: 96px;
      }
      .page-shell {
        gap: 48px;
      }
    }
  </style>
</head>
<body>
  <div class="loading-state" id="profileLoader" role="status" aria-live="polite">
    <div class="loading-pill">
      Loading profile
      <span></span>
      <span></span>
      <span></span>
    </div>
  </div>

  <header class="app-header">
    <div class="header-left logo-area">
      <a class="header-logo" href="/index.html" aria-label="YUSTAM home">
        <img src="logo.jpeg" alt="YUSTAM logo" />
      </a>
      <span class="header-title" role="link" tabindex="0">Vendor</span>
    </div>
    <nav class="header-actions" aria-label="Vendor shortcuts">
      <a class="header-icon notif-icon" href="vendor-notifications.php" aria-label="Notifications" title="Notifications">
        <i class="ri-notification-3-line" aria-hidden="true"></i>
      </a>
      <a class="header-icon" href="vendor-settings.php" aria-label="Settings">
        <i class="ri-settings-3-line" aria-hidden="true"></i>
      </a>
      <a class="header-icon" href="vendor-plans.php" aria-label="Plans">
        <i class="ri-vip-crown-line" aria-hidden="true"></i>
      </a>
      <a class="header-icon" href="logout.php" aria-label="Logout">
        <i class="ri-logout-box-r-line" aria-hidden="true"></i>
      </a>
    </nav>
  </header>

  <main>
    <div class="page-shell">
      <section class="glass-card profile-card" aria-labelledby="profileTitle">
        <div class="profile-header">
          <div class="initials-badge" id="vendorInitials">YN</div>
          <div class="identity-meta">
            <h1 class="vendor-name" id="profileTitle">Vendor Name</h1>
            <p class="business-name" id="businessName">Business Name</p>
            <span class="plan-chip" id="planBadge" data-plan="Free">Free Plan</span>
          </div>
        </div>
        <div class="upgrade-banner" id="upgradeBanner" role="status">
          <i class="ri-rocket-line" aria-hidden="true"></i>
          <span>Upgrade to unlock more tools and premium placement.</span>
        </div>
        <div class="details-grid" aria-live="polite">
          <div class="detail-item">
            <span class="detail-label">Vendor Name</span>
            <p class="detail-value" id="vendorName">—</p>
          </div>
          <div class="detail-item">
            <span class="detail-label">Business Name</span>
            <p class="detail-value" id="vendorBusiness">—</p>
          </div>
          <div class="detail-item">
            <span class="detail-label">Email</span>
            <p class="detail-value" id="vendorEmail">—</p>
          </div>
          <div class="detail-item">
            <span class="detail-label">Phone Number</span>
            <p class="detail-value" id="vendorPhone">—</p>
          </div>
          <div class="detail-item">
            <span class="detail-label">Business Address</span>
            <p class="detail-value" id="vendorAddress">—</p>
          </div>
          <div class="detail-item">
            <span class="detail-label">State</span>
            <p class="detail-value" id="vendorState">—</p>
          </div>
          <div class="detail-item">
            <span class="detail-label">Join Date</span>
            <p class="detail-value" id="vendorJoined">—</p>
          </div>
        </div>
      </section>

      <section class="glass-card upgrade-card" aria-labelledby="upgradeTitle">
        <h2 id="upgradeTitle">Upgrade Your Plan</h2>
        <p>Boost your storefront visibility, unlock analytics, and access concierge support tailored for ambitious vendors.</p>
        <div class="upgrade-actions">
          <button class="btn btn-primary" id="upgradePlanBtn" type="button">
            <i class="ri-rocket-2-line" aria-hidden="true"></i>
            Upgrade Plan
          </button>
          <button class="btn btn-outline" id="viewPricingBtn" type="button">
            <i class="ri-presentation-line" aria-hidden="true"></i>
            View Pricing Deck
          </button>
        </div>
      </section>

      <section class="glass-card" aria-label="Profile actions">
        <button class="btn btn-primary btn-large" id="editProfileBtn" type="button">
          <i class="ri-edit-line" aria-hidden="true"></i>
          Edit Profile
        </button>
      </section>
    </div>
  </main>

  <footer class="footer">© 2025 YUSTAM Marketplace · Support</footer>

  <script src="vendor-profile.js" defer></script>
</body>
</html>
