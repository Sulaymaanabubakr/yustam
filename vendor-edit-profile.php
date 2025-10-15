<?php
require_once __DIR__ . '/session-path.php';
session_start();

require_once __DIR__ . '/db.php';

if (!isset($_SESSION['vendor_id'])) {
    if (isset($_GET['format']) && $_GET['format'] === 'json') {
        header('Content-Type: application/json');
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Please sign in to update your profile.']);
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
        echo json_encode(['success' => false, 'message' => 'We could not find your vendor profile.']);
        exit;
    }
    header('Location: logout.php');
    exit;
}

$vendorData = is_array($vendor) ? $vendor : [];

$nameColumn = 'name';
foreach (['name', 'full_name', 'vendor_name'] as $candidate) {
    if (array_key_exists($candidate, $vendorData)) {
        $nameColumn = $candidate;
        break;
    }
}

$planStatusColumn = array_key_exists('plan_status', $vendorData) ? 'plan_status' : null;
$planExpiryColumn = null;
foreach (['plan_expires_at', 'plan_expiry', 'plan_expiration'] as $candidate) {
    if (array_key_exists($candidate, $vendorData)) {
        $planExpiryColumn = $candidate;
        break;
    }
}

$planExpiry = '';
if ($planExpiryColumn && !empty($vendor[$planExpiryColumn])) {
    $timestamp = strtotime($vendor[$planExpiryColumn]);
    if ($timestamp) {
        $planExpiry = date('j M Y', $timestamp);
    }
}

$profile = [
    'name' => $vendorData[$nameColumn] ?? '',
    'email' => $vendorData['email'] ?? '',
    'businessName' => array_key_exists('business_name', $vendorData) ? ($vendorData['business_name'] ?? '') : '',
    'businessAddress' => array_key_exists('business_address', $vendorData) ? ($vendorData['business_address'] ?? '') : '',
    'phone' => array_key_exists('phone', $vendorData) ? ($vendorData['phone'] ?? '') : '',
    'state' => array_key_exists('state', $vendorData) ? ($vendorData['state'] ?? '') : '',
    'plan' => array_key_exists('plan', $vendorData) ? ($vendorData['plan'] ?? 'Free') : 'Free',
    'planStatus' => $planStatusColumn ? ($vendorData[$planStatusColumn] ?? 'Active') : 'Active',
    'planExpiry' => $planExpiry,
    'profilePhoto' => array_key_exists('profile_photo', $vendorData)
        ? ($vendorData['profile_photo'] ?? '')
        : (array_key_exists('avatar_url', $vendorData) ? ($vendorData['avatar_url'] ?? '') : ''),
];

if (isset($_GET['format']) && $_GET['format'] === 'json') {
    header('Content-Type: application/json');
    echo json_encode(['success' => true, 'profile' => $profile], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}

$avatarFallback = 'https://res.cloudinary.com/demo/image/upload/v123456789/default_user.png';
$profilePhoto = $profile['profilePhoto'] ?: $avatarFallback;
$profileJson = json_encode($profile, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Edit Vendor Profile | YUSTAM Marketplace</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Anton&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <link href="https://cdn.jsdelivr.net/npm/remixicon@4.2.0/fonts/remixicon.css" rel="stylesheet" />
  <style>
    :root {
      --emerald: #004d40;
      --emerald-dark: #00695c;
      --orange: #f3731e;
      --orange-dark: #e05e0e;
      --beige: #eadccf;
      --white: #ffffff;
      --ink: #111111;
      --danger: #d84315;
      --success: #0f9d58;
      --glass-bg: rgba(255, 255, 255, 0.88);
      --shadow-soft: 0 26px 48px rgba(0, 0, 0, 0.12);
      --radius-card: 22px;
    }

    *, *::before, *::after {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      color: var(--ink);
      background: radial-gradient(circle at top right, rgba(0, 77, 64, 0.14), transparent 55%),
        radial-gradient(circle at bottom left, rgba(243, 115, 30, 0.16), transparent 55%),
        var(--beige);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }

    header {
      position: sticky;
      top: 0;
      z-index: 40;
      width: min(980px, 100%);
      margin: 0 auto;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px clamp(16px, 4vw, 24px);
      color: var(--white);
      background: rgba(0, 77, 64, 0.92);
      backdrop-filter: blur(12px);
      border-bottom: 2px solid rgba(243, 115, 30, 0.35);
      box-shadow: 0 16px 32px rgba(0, 0, 0, 0.18);
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 14px;
    }

    .header-title {
      font-family: 'Anton', sans-serif;
      font-size: clamp(22px, 4vw, 28px);
      letter-spacing: 0.05em;
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .icon-btn {
      width: 42px;
      height: 42px;
      border-radius: 999px;
      border: none;
      display: grid;
      place-items: center;
      background: rgba(255, 255, 255, 0.14);
      color: var(--white);
      cursor: pointer;
      transition: transform 0.2s ease, background 0.2s ease;
    }

    .icon-btn:hover,
    .icon-btn:focus-visible {
      background: rgba(243, 115, 30, 0.45);
      transform: translateY(-2px);
    }

    main {
      width: min(980px, 100%);
      margin: 0 auto;
      padding: clamp(32px, 5vw, 48px) clamp(16px, 5vw, 24px) 120px;
      display: flex;
      flex-direction: column;
      gap: clamp(24px, 4vw, 32px);
    }

    .glass-card {
      background: var(--glass-bg);
      border-radius: var(--radius-card);
      padding: clamp(20px, 5vw, 28px);
      box-shadow: var(--shadow-soft);
      backdrop-filter: blur(18px);
      border: 1px solid rgba(255, 255, 255, 0.24);
    }

    .section-title {
      font-family: 'Anton', sans-serif;
      font-size: clamp(20px, 3vw, 26px);
      letter-spacing: 0.05em;
      margin: 0 0 20px;
      display: inline-flex;
      align-items: center;
      gap: 12px;
    }

    .section-title::after {
      content: '';
      display: block;
      width: 48px;
      height: 3px;
      border-radius: 999px;
      background: linear-gradient(135deg, var(--orange), #ff8d3f);
    }

    .profile-photo-wrapper {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
    }

    .photo-preview {
      width: 140px;
      height: 140px;
      border-radius: 32px;
      background: linear-gradient(135deg, rgba(0, 77, 64, 0.1), rgba(243, 115, 30, 0.18));
      box-shadow: 0 18px 36px rgba(0, 0, 0, 0.14);
      display: grid;
      place-items: center;
      overflow: hidden;
    }

    .photo-preview img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .placeholder-icon {
      font-size: 48px;
      color: rgba(0, 77, 64, 0.6);
    }

    .upload-progress {
      position: relative;
      width: 100%;
      max-width: 260px;
      height: 6px;
      border-radius: 999px;
      background: rgba(0, 0, 0, 0.08);
      overflow: hidden;
    }

    .upload-progress span {
      position: absolute;
      inset: 0;
      background: linear-gradient(135deg, var(--orange), #ff943a);
      transform-origin: left;
      transform: scaleX(0);
      transition: transform 0.15s linear;
    }

    .form-grid {
      display: grid;
      gap: 18px;
    }

    .form-grid.two-col {
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    }

    .input-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .input-group label {
      font-weight: 600;
      font-size: 0.93rem;
      color: rgba(17, 17, 17, 0.76);
    }

    .input-group input,
    .input-group textarea,
    .input-group select {
      width: 100%;
      padding: 12px 14px;
      font-size: 0.95rem;
      border-radius: 14px;
      border: 1px solid rgba(0, 0, 0, 0.1);
      background: rgba(255, 255, 255, 0.92);
      transition: border 0.2s ease, box-shadow 0.2s ease;
    }

    .input-group textarea {
      min-height: 120px;
      resize: vertical;
    }

    .input-group input:focus,
    .input-group textarea:focus,
    .input-group select:focus {
      outline: none;
      border-color: rgba(243, 115, 30, 0.6);
      box-shadow: 0 0 0 3px rgba(243, 115, 30, 0.16);
    }

    .plan-chip,
    .status-chip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 14px;
      border-radius: 999px;
      font-weight: 600;
      font-size: 0.9rem;
      background: rgba(0, 77, 64, 0.12);
      color: var(--emerald);
    }

    .status-chip.expired {
      background: rgba(216, 67, 21, 0.12);
      color: var(--danger);
    }

    .save-bar {
      position: fixed;
      left: 50%;
      bottom: clamp(14px, 5vw, 28px);
      transform: translateX(-50%);
      width: min(340px, calc(100% - 36px));
      background: rgba(0, 77, 64, 0.96);
      color: var(--white);
      padding: 10px 12px;
      border-radius: 999px;
      box-shadow: 0 24px 45px rgba(0, 0, 0, 0.22);
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      z-index: 50;
    }

    .save-bar .save-button {
      width: 100%;
      max-width: 220px;
      margin: 0 auto;
      font-size: 0.92rem;
      padding: 10px 16px;
    }

    .save-button {
      width: 100%;
      border: none;
      border-radius: 999px;
      padding: 10px 18px;
      font-size: 0.95rem;
      font-weight: 600;
      background: linear-gradient(135deg, var(--orange), #ff9338);
      color: var(--white);
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    }

    .save-button:disabled {
      opacity: 0.65;
      cursor: not-allowed;
    }

    .save-button:not(:disabled):hover {
      transform: translateY(-2px);
      box-shadow: 0 16px 30px rgba(243, 115, 30, 0.26);
    }

    .save-spinner {
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }

    .save-spinner[hidden] {
      display: none !important;
    }

    .save-spinner i {
      display: inline-block;
      font-size: 1.1rem;
      animation: spin 1s linear infinite;
    }

    .toast-container {
      position: fixed;
      top: 28px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      flex-direction: column;
      gap: 10px;
      z-index: 60;
    }

    .toast {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      padding: 12px 18px;
      border-radius: 999px;
      background: rgba(0, 0, 0, 0.82);
      color: var(--white);
      font-size: 0.94rem;
      box-shadow: 0 18px 32px rgba(0, 0, 0, 0.22);
      transition: opacity 0.25s ease, transform 0.25s ease;
    }

    .toast.success {
      background: rgba(15, 157, 88, 0.92);
    }

    .toast.error {
      background: rgba(216, 67, 21, 0.92);
    }

    .page-loader {
      position: fixed;
      inset: 0;
      background: rgba(255, 255, 255, 0.72);
      display: none;
      align-items: center;
      justify-content: center;
      z-index: 80;
    }

    .page-loader.active {
      display: flex;
    }

    .loader-card {
      background: rgba(255, 255, 255, 0.95);
      padding: 24px 32px;
      border-radius: 18px;
      box-shadow: var(--shadow-soft);
      display: flex;
      align-items: center;
      gap: 16px;
      font-weight: 600;
      color: var(--emerald);
    }

    .loader-card i {
      font-size: 1.3rem;
      animation: spin 1.1s linear infinite;
    }

    @keyframes spin {
      to {
        transform: rotate(1turn);
      }
    }

    @media (max-width: 720px) {
      header {
        border-radius: 0;
        width: 100%;
      }

      main {
        width: 100%;
        padding-bottom: 140px;
      }

      .save-bar {
      width: calc(100% - 32px);
      }

      .profile-photo-wrapper {
        flex-direction: column;
      }
    }
  </style>
</head>
<body>
  <div id="pageLoader" class="page-loader active" role="status" aria-live="polite">
    <div class="loader-card">
      <i class="ri-loader-4-line" aria-hidden="true"></i>
      Preparing your profile…
    </div>
  </div>

  <header>
    <div class="header-left">
      <button class="icon-btn" id="backBtn" type="button" title="Back to profile" aria-label="Back to profile">
        <i class="ri-arrow-left-line" aria-hidden="true"></i>
      </button>
      <span class="header-title">Edit Profile</span>
    </div>
    <div class="header-actions">
      <button class="icon-btn" id="notificationsBtn" type="button" title="Notifications">
        <i class="ri-notification-3-line" aria-hidden="true"></i>
      </button>
      <button class="icon-btn" id="settingsBtn" type="button" title="Settings">
        <i class="ri-settings-4-line" aria-hidden="true"></i>
      </button>
      <button class="icon-btn" id="logoutBtn" type="button" title="Logout">
        <i class="ri-logout-box-r-line" aria-hidden="true"></i>
      </button>
    </div>
  </header>

  <form action="update-vendor-profile.php" method="POST" enctype="multipart/form-data">
  <main>
    <!-- Profile Photo -->
    <section class="glass-card">
      <h2 class="section-title">Profile Photo</h2>
      <div class="profile-photo-wrapper">
        <div class="photo-preview" id="photoPreview">
          <img src="<?php echo htmlspecialchars($profilePhoto, ENT_QUOTES, 'UTF-8'); ?>" alt="Vendor profile photo" />
        </div>
        <input type="file" id="photoInput" name="profile_photo" accept="image/*" hidden />
        <button class="save-button" id="changePhotoBtn" type="button" style="max-width: 220px;">
          <i class="ri-upload-2-line" aria-hidden="true"></i>
          Change Photo
        </button>
        <div class="upload-progress" id="uploadProgress" hidden>
          <span id="progressBar"></span>
        </div>
      </div>
    </section>

    <!-- Personal Info -->
    <section class="glass-card">
      <h2 class="section-title">Personal Information</h2>
      <div class="form-grid two-col">
        <div class="input-group">
          <label for="fullName">Full Name</label>
          <input
            type="text"
            id="fullName"
            name="name"
            autocomplete="name"
            value="<?php echo htmlspecialchars($profile['name'], ENT_QUOTES, 'UTF-8'); ?>"
            required
          />
        </div>
        <div class="input-group">
          <label for="email">Email</label>
          <input
            type="email"
            id="email"
            name="email"
            value="<?php echo htmlspecialchars($profile['email'], ENT_QUOTES, 'UTF-8'); ?>"
            readonly
          />
        </div>
      </div>

      <div class="form-grid two-col">
        <div class="input-group">
          <label for="phone">Phone Number</label>
          <input
            type="tel"
            id="phone"
            name="phone"
            autocomplete="tel"
            value="<?php echo htmlspecialchars($profile['phone'], ENT_QUOTES, 'UTF-8'); ?>"
            required
          />
        </div>
        <div class="input-group">
          <label for="state">State / Region</label>
          <input
            type="text"
            id="state"
            name="state"
            placeholder="State of operation"
            value="<?php echo htmlspecialchars($profile['state'], ENT_QUOTES, 'UTF-8'); ?>"
            required
          />
        </div>
      </div>
    </section>

    <!-- Business Info -->
    <section class="glass-card">
      <h2 class="section-title">Business Information</h2>
      <div class="form-grid two-col">
        <div class="input-group">
          <label for="businessName">Business Name</label>
          <input
            type="text"
            id="businessName"
            name="business_name"
            value="<?php echo htmlspecialchars($profile['businessName'], ENT_QUOTES, 'UTF-8'); ?>"
            required
          />
        </div>
        <div class="input-group">
          <label for="businessAddress">Business Address</label>
          <textarea
            id="businessAddress"
            name="business_address"
            placeholder="Where can customers find you?"
            required
          ><?php echo htmlspecialchars($profile['businessAddress'], ENT_QUOTES, 'UTF-8'); ?></textarea>
        </div>
      </div>
    </section>

    <!-- Subscription Info -->
    <section class="glass-card">
      <h2 class="section-title">Subscription Plan</h2>
      <div class="form-grid two-col">
        <div class="input-group">
          <label>Current Plan</label>
          <span class="plan-chip" id="planName"><?php echo htmlspecialchars($profile['plan'] ?: 'Free', ENT_QUOTES, 'UTF-8'); ?></span>
        </div>
        <div class="input-group">
          <label>Status</label>
          <span class="status-chip" id="planStatus"><?php echo htmlspecialchars($profile['planStatus'] ?: 'Active', ENT_QUOTES, 'UTF-8'); ?></span>
        </div>
      </div>
      <div class="form-grid">
        <div class="input-group">
          <label for="planExpiry">Expiry Date</label>
          <input
            type="text"
            id="planExpiry"
            name="plan_expiry"
            value="<?php echo htmlspecialchars($profile['planExpiry'], ENT_QUOTES, 'UTF-8'); ?>"
            readonly
          />
        </div>
      </div>
    </section>

  </main>
</form>

  <div class="save-bar">
    <button class="save-button" id="saveBtn" type="button">
      <span class="save-text">Save Profile Changes</span>
      <span class="save-spinner" hidden>
        <i class="ri-loader-4-line" aria-hidden="true"></i>
      </span>
    </button>
  </div>

  <div class="toast-container" id="toastContainer" aria-live="polite" aria-atomic="true"></div>

  <script>
    window.__INITIAL_PROFILE__ = <?php echo $profileJson; ?>;
    window.__PROFILE_ENDPOINT__ = 'vendor-edit-profile.php?format=json';
    window.__PROFILE_AVATAR_FALLBACK__ = '<?php echo addslashes($avatarFallback); ?>';
    window.__VENDOR_ID__ = <?php echo (int) $vendorId; ?>;
  </script>
  <script type="module" src="vendor-edit-profile.js"></script>
</body>
</html>
