<?php
require_once __DIR__ . '/session-path.php';
session_start();

if (!isset($_SESSION['admin_id'])) {
    header('Location: admin-login.php');
    exit;
}

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/api/chat/firebase.php';

$db = get_db_connection();

function map_verification_row(array $row): array
{
    $files = [];
    if (!empty($row['files'])) {
        $decoded = json_decode($row['files'], true);
        if (is_array($decoded)) {
            $files = array_values(array_filter($decoded, static fn($item) => is_array($item)));
        }
    }

    return [
        'id' => (int)$row['id'],
        'vendor_id' => (int)$row['vendor_id'],
        'business_name' => $row['business_name'] ?? '',
        'email' => $row['email'] ?? '',
        'phone' => $row['phone'] ?? '',
        'state' => $row['state'] ?? '',
        'status' => $row['status'] ?? 'pending',
        'submitted_at' => $row['submitted_at'] ?? '',
        'reviewed_at' => $row['reviewed_at'] ?? '',
        'reviewer_id' => isset($row['reviewer_id']) ? (int)$row['reviewer_id'] : null,
        'feedback' => $row['feedback'] ?? '',
        'plan_level' => $row['plan_level'] ?? '',
        'files' => $files,
        'history' => $row['history'] ?? '',
    ];
}

function fetch_verification(mysqli $db, int $id): ?array
{
    $sql = "SELECT v.*, vd.business_name, vd.email, vd.phone, vd.state FROM vendor_verifications v JOIN vendors vd ON v.vendor_id = vd.id WHERE v.id = ? LIMIT 1";
    $stmt = $db->prepare($sql);
    $stmt->bind_param('i', $id);
    $stmt->execute();
    $result = $stmt->get_result();
    $row = $result->fetch_assoc();
    $stmt->close();
    if (!$row) {
        return null;
    }
    return map_verification_row($row);
}

function fetch_all_verifications(mysqli $db): array
{
    $verifications = [];
    $sql = "SELECT v.*, vd.business_name, vd.email, vd.phone, vd.state FROM vendor_verifications v JOIN vendors vd ON v.vendor_id = vd.id ORDER BY v.submitted_at DESC";
    $result = $db->query($sql);
    if ($result instanceof mysqli_result) {
        while ($row = $result->fetch_assoc()) {
            $verifications[] = map_verification_row($row);
        }
        $result->free();
    }
    return $verifications;
}

if (isset($_GET['format']) && $_GET['format'] === 'json') {
    header('Content-Type: application/json');

    if (isset($_GET['detail'])) {
        $detailId = (int)$_GET['detail'];
        $record = $detailId > 0 ? fetch_verification($db, $detailId) : null;
        if (!$record) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Verification request not found.']);
            exit;
        }
        echo json_encode(['success' => true, 'data' => $record]);
        exit;
    }

    $records = fetch_all_verifications($db);
    echo json_encode(['success' => true, 'data' => $records]);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    header('Content-Type: application/json');

    $payload = $_POST;
    if (empty($payload) && in_array($_SERVER['CONTENT_TYPE'] ?? '', ['application/json', 'text/json'], true)) {
        $raw = file_get_contents('php://input');
        $decoded = json_decode($raw, true);
        if (is_array($decoded)) {
            $payload = $decoded;
        }
    }

    $id = isset($payload['id']) ? (int)$payload['id'] : 0;
    $action = isset($payload['action']) ? strtolower(trim((string)$payload['action'])) : '';
    $feedback = isset($payload['feedback']) ? trim((string)$payload['feedback']) : '';

    if ($id <= 0 || !in_array($action, ['approve', 'reject'], true)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Invalid verification request or action.']);
        exit;
    }

    $status = $action === 'approve' ? 'approved' : 'rejected';
    if ($status === 'rejected' && $feedback === '') {
        $feedback = 'Verification rejected. Please review submitted documents.';
    }

    $sql = 'UPDATE vendor_verifications SET status = ?, feedback = ?, reviewed_at = NOW(), reviewer_id = ? WHERE id = ? LIMIT 1';
    $stmt = $db->prepare($sql);
    $reviewerId = (int)$_SESSION['admin_id'];
    $stmt->bind_param('ssii', $status, $feedback, $reviewerId, $id);
    $stmt->execute();
    $stmt->close();

    $updated = fetch_verification($db, $id);

    echo json_encode([
        'success' => true,
        'message' => $status === 'approved' ? 'Verification approved.' : 'Verification rejected.',
        'data' => $updated,
    ]);
    exit;
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>YUSTAM Admin | Vendor Verifications</title>
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
            --shadow: 0 12px 30px rgba(17, 17, 17, 0.12);
            --radius-lg: 20px;
            --radius-md: 16px;
        }

        *, *::before, *::after { box-sizing: border-box; }

        body {
            margin: 0;
            font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            color: var(--ink);
            background: linear-gradient(150deg, rgba(234, 220, 207, 0.95), rgba(255, 255, 255, 0.96));
            min-height: 100vh;
            display: flex;
            flex-direction: column;
        }

        h1, h2, h3, h4 {
            font-family: 'Anton', sans-serif;
            letter-spacing: 0.03em;
            margin: 0;
        }

        a { color: inherit; text-decoration: none; }

        button { font-family: inherit; }

        .app-shell {
            display: grid;
            grid-template-columns: 260px 1fr;
            min-height: 100vh;
        }

        header.topbar {
            position: sticky;
            top: 0;
            z-index: 40;
            grid-column: 1 / -1;
            background: rgba(0, 77, 64, 0.95);
            color: var(--white);
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0.85rem 1.25rem;
            box-shadow: 0 12px 30px rgba(0, 0, 0, 0.18);
            backdrop-filter: blur(12px);
        }

        .brand {
            display: inline-flex;
            align-items: center;
            gap: 0.75rem;
        }

        .logo-img {
            width: 44px;
            height: 44px;
            border-radius: 12px;
            object-fit: cover;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.18);
        }

        .menu-toggle {
            display: none;
        }

        .top-actions { display: flex; gap: 0.65rem; align-items: center; }

        .top-action {
            width: 42px;
            height: 42px;
            border-radius: 50%;
            border: none;
            background: rgba(255, 255, 255, 0.16);
            color: var(--white);
            display: inline-flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: transform 0.2s ease, background 0.2s ease;
        }

        .top-action:hover,
        .top-action:focus-visible {
            transform: translateY(-2px);
            background: rgba(255, 255, 255, 0.26);
        }

        aside.sidebar {
            background: rgba(255, 255, 255, 0.72);
            backdrop-filter: blur(14px);
            box-shadow: 6px 0 24px rgba(0, 0, 0, 0.1);
            padding: 1.5rem 1.25rem;
        }

        .sidebar-header {
            font-family: 'Anton', sans-serif;
            letter-spacing: 0.08em;
            color: var(--emerald);
            margin-bottom: 2rem;
        }

        .nav-links { display: grid; gap: 0.5rem; }

        .nav-link {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            padding: 0.75rem 0.9rem;
            border-radius: 14px;
            color: var(--emerald);
            font-weight: 600;
            background: rgba(255, 255, 255, 0.6);
            box-shadow: inset 0 0 0 1px rgba(0, 77, 64, 0.1);
            transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
        }

        .nav-link:hover,
        .nav-link:focus-visible,
        .nav-link.active {
            transform: translateX(4px);
            background: rgba(0, 77, 64, 0.08);
            box-shadow: inset 0 0 0 2px rgba(0, 77, 64, 0.25);
        }

        main {
            padding: clamp(1.5rem, 3vw, 2.75rem) clamp(1.25rem, 4vw, 3rem);
            display: grid;
            gap: 1.6rem;
            background: transparent;
        }

        .section-card {
            background: rgba(255, 255, 255, 0.82);
            border-radius: var(--radius-lg);
            padding: clamp(1.4rem, 3vw, 2rem);
            box-shadow: var(--shadow);
            backdrop-filter: blur(12px);
            display: grid;
            gap: 1.4rem;
        }

        .section-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 0.8rem;
        }

        .section-header h1 {
            font-size: clamp(1.6rem, 4vw, 2.2rem);
            color: var(--emerald);
        }

        .badge-pill {
            background: rgba(0, 77, 64, 0.12);
            color: var(--emerald);
            border-radius: 999px;
            padding: 0.35rem 0.9rem;
            font-weight: 600;
            font-size: 0.85rem;
        }

        .verifications-grid { display: grid; gap: 1rem; }

        .verif-row {
            border-radius: var(--radius-md);
            background: rgba(255, 255, 255, 0.92);
            box-shadow: 0 12px 30px rgba(17, 17, 17, 0.12);
            padding: 1.2rem 1.4rem;
            display: grid;
            gap: 0.75rem;
        }

        .verif-meta { display: grid; gap: 0.35rem; }

        .verif-meta strong { font-size: 1.05rem; color: var(--emerald); }

        .meta-line { color: rgba(17, 17, 17, 0.65); font-size: 0.92rem; }

        .status-chip {
            display: inline-flex;
            align-items: center;
            gap: 0.35rem;
            border-radius: 999px;
            padding: 0.3rem 0.8rem;
            font-size: 0.8rem;
            font-weight: 600;
            text-transform: capitalize;
        }

        .status-approved { background: rgba(0, 128, 96, 0.15); color: #006d4f; }
        .status-pending { background: rgba(243, 115, 30, 0.16); color: var(--orange); }
        .status-rejected { background: rgba(220, 53, 69, 0.16); color: #c0392b; }

        .verif-actions { display: flex; gap: 0.8rem; flex-wrap: wrap; }

        .btn {
            border: none;
            border-radius: 12px;
            padding: 0.55rem 1.15rem;
            font-weight: 600;
            cursor: pointer;
            transition: transform 0.2s ease, box-shadow 0.2s ease;
            display: inline-flex;
            align-items: center;
            gap: 0.35rem;
        }

        .btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }

        .btn-view { background: rgba(0, 77, 64, 0.12); color: var(--emerald); }
        .btn-approve { background: var(--emerald); color: var(--white); }
        .btn-reject { background: rgba(243, 115, 30, 0.18); color: var(--orange); }

        .btn:hover:not(:disabled),
        .btn:focus-visible:not(:disabled) {
            transform: translateY(-1px);
            box-shadow: 0 12px 22px rgba(0, 0, 0, 0.14);
        }

        .empty-state {
            text-align: center;
            color: rgba(17, 17, 17, 0.58);
            font-size: 1rem;
            padding: 2.2rem 1rem;
            border-radius: 18px;
            background: rgba(255, 255, 255, 0.88);
            box-shadow: var(--shadow);
        }

        .empty-state i { display: block; font-size: 2.2rem; margin-bottom: 0.6rem; color: rgba(243, 115, 30, 0.75); }

        .modal-backdrop {
            position: fixed;
            inset: 0;
            background: rgba(17, 17, 17, 0.45);
            display: none;
            align-items: center;
            justify-content: center;
            padding: 1.5rem;
            z-index: 60;
        }

        .modal-backdrop.active { display: flex; }

        .modal-card {
            background: rgba(255, 255, 255, 0.95);
            border-radius: var(--radius-lg);
            padding: clamp(1.4rem, 3vw, 2rem);
            max-width: min(560px, 92vw);
            width: 100%;
            box-shadow: var(--shadow);
            display: grid;
            gap: 1.1rem;
        }

        .modal-card h2 { color: var(--emerald); font-size: 1.4rem; }

        .modal-body { display: grid; gap: 0.75rem; font-size: 0.95rem; color: rgba(17, 17, 17, 0.75); }

        .file-list { display: grid; gap: 0.4rem; }

        .file-link { color: var(--emerald); font-weight: 600; text-decoration: underline; }

        textarea.feedback-input {
            width: 100%;
            min-height: 110px;
            border-radius: 12px;
            border: 1px solid rgba(0, 77, 64, 0.2);
            padding: 0.75rem;
            font-family: inherit;
            resize: vertical;
        }

        .toast {
            position: fixed;
            bottom: 24px;
            left: 50%;
            transform: translateX(-50%) translateY(120%);
            background: rgba(0, 77, 64, 0.95);
            color: var(--white);
            padding: 0.85rem 1.4rem;
            border-radius: 999px;
            box-shadow: var(--shadow);
            font-weight: 600;
            transition: transform 0.35s ease;
            z-index: 70;
        }

        .toast.show { transform: translateX(-50%) translateY(0); }

        footer {
            margin-top: auto;
            text-align: center;
            padding: 1.2rem 1rem;
            color: rgba(17, 17, 17, 0.6);
            background: rgba(234, 220, 207, 0.85);
        }

        @media (max-width: 900px) {
            .app-shell { grid-template-columns: 1fr; }
            aside.sidebar { position: fixed; inset: 72px auto 0 0; width: 260px; transform: translateX(-110%); transition: transform 0.3s cubic-bezier(.2,.8,.2,1); z-index: 50; }
            aside.sidebar.active { transform: translateX(0); }
            .menu-toggle { display: inline-flex; }
            main { margin-top: 72px; }
        }
    </style>
</head>
<body>
    <div class="app-shell">
        <header class="topbar">
            <div class="brand">
                <button class="menu-toggle" id="menuToggle" aria-label="Toggle navigation"><i class="ri-menu-line"></i></button>
                <img src="logo.jpeg" alt="YUSTAM logo" class="logo-img">
                <span style="font-family:'Anton',sans-serif; letter-spacing:0.1em;">YUSTAM Admin</span>
            </div>
            <div class="top-actions">
                <button class="top-action" id="logoutBtn" aria-label="Sign out"><i class="ri-logout-box-r-line"></i></button>
            </div>
        </header>

        <aside class="sidebar" id="sidebar" aria-label="Admin navigation">
            <div class="sidebar-header">Control Centre</div>
            <nav class="nav-links">
                <a class="nav-link" href="admin-dashboard.php"><i class="ri-dashboard-line"></i> Dashboard</a>
                <a class="nav-link" href="admin-listings.php"><i class="ri-store-2-line"></i> Listings</a>
                <a class="nav-link" href="admin-vendors.php"><i class="ri-team-line"></i> Vendors</a>
                <a class="nav-link active" href="admin-verifications.php"><i class="ri-shield-check-line"></i> Verifications</a>
                <a class="nav-link" href="admin-plans.php"><i class="ri-bar-chart-2-line"></i> Plans &amp; Revenue</a>
                <a class="nav-link" href="admin-dashboard.php#settings"><i class="ri-settings-3-line"></i> Settings</a>
            </nav>
        </aside>

        <main>
            <section class="section-card">
                <div class="section-header">
                    <h1>Vendor Verification Requests</h1>
                    <span class="badge-pill" id="totalBadge">0 requests</span>
                </div>
                <div id="verificationsContainer" class="verifications-grid"></div>
                <div id="emptyState" class="empty-state" hidden>
                    <i class="ri-shield-check-line" aria-hidden="true"></i>
                    <strong>No vendor verification requests yet.</strong><br>
                    New submissions will appear here for review.
                </div>
            </section>
        </main>
    </div>

    <div class="modal-backdrop" id="verificationModal" role="dialog" aria-modal="true" aria-labelledby="modalTitle">
        <div class="modal-card">
            <div class="modal-header">
                <h2 id="modalTitle">Verification Request</h2>
            </div>
            <div class="modal-body" id="modalBody"></div>
            <label for="modalFeedback" style="font-weight:600; color:var(--emerald);">Feedback to vendor</label>
            <textarea id="modalFeedback" class="feedback-input" placeholder="Add optional notes for the vendor"></textarea>
            <div class="verif-actions">
                <button class="btn btn-view" id="modalClose">Close</button>
                <button class="btn btn-reject" id="modalReject"><i class="ri-close-circle-line"></i> Reject</button>
                <button class="btn btn-approve" id="modalApprove"><i class="ri-shield-check-line"></i> Approve</button>
            </div>
        </div>
    </div>

    <div class="toast" id="toast" role="status" aria-live="polite"></div>

    <footer>
        © 2025 YUSTAM Marketplace — <a href="contact.html" style="font-weight:600; color:inherit;">Support</a>
    </footer>

    <script src="theme-manager.js" defer></script>
    <script type="module" src="admin-verifications.js"></script>
</body>
</html>
