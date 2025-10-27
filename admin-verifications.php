<?php
require_once __DIR__ . '/session-path.php';
session_start();

if (!isset($_SESSION['admin_id'])) {
    header('Location: admin-login.php');
    exit;
}

require_once __DIR__ . '/db.php';

try {
    $db = get_db_connection();
} catch (Throwable $error) {
    http_response_code(500);
    echo 'Unable to connect to the database.';
    exit;
}

$vendorTable = defined('YUSTAM_VENDORS_TABLE') && preg_match('/^[A-Za-z0-9_]+$/', (string) YUSTAM_VENDORS_TABLE)
    ? YUSTAM_VENDORS_TABLE
    : 'vendors';

$vendorColumns = yustam_vendor_table_columns();

function pick_vendor_column(array $candidates, array $columns): ?string
{
    foreach ($candidates as $candidate) {
        if (in_array($candidate, $columns, true)) {
            return $candidate;
        }
    }

    return null;
}

$statusColumn = pick_vendor_column(['verification_status', 'verification_state', 'verification', 'kyc_status', 'verification_stage'], $vendorColumns);
$submittedColumn = pick_vendor_column(['verification_submitted_at', 'verification_requested_at', 'verification_sent_at', 'kyc_submitted_at'], $vendorColumns);
$reviewedColumn = pick_vendor_column(['verification_reviewed_at', 'verification_approved_at', 'verification_completed_at', 'kyc_reviewed_at', 'kyc_approved_at', 'verified_at', 'reviewed_at'], $vendorColumns);
$feedbackColumn = pick_vendor_column(['verification_feedback', 'verification_comment', 'verification_notes', 'kyc_feedback'], $vendorColumns);
$reviewerColumn = pick_vendor_column(['verification_reviewer_id', 'kyc_reviewer_id', 'reviewer_id', 'approved_by'], $vendorColumns);
$filesColumn = pick_vendor_column(['verification_files', 'kyc_files', 'verification_documents', 'verification_uploads'], $vendorColumns);
$historyColumn = pick_vendor_column(['verification_history', 'kyc_history'], $vendorColumns);
$planColumn = pick_vendor_column(['plan', 'plan_level', 'subscription_plan'], $vendorColumns) ?? (in_array('plan', $vendorColumns, true) ? 'plan' : null);

$verificationContext = [
    'table' => $vendorTable,
    'columns' => $vendorColumns,
    'statusColumn' => $statusColumn,
    'submittedColumn' => $submittedColumn,
    'reviewedColumn' => $reviewedColumn,
    'feedbackColumn' => $feedbackColumn,
    'reviewerColumn' => $reviewerColumn,
    'filesColumn' => $filesColumn,
    'historyColumn' => $historyColumn,
    'planColumn' => $planColumn,
    'trackingAvailable' => ($statusColumn !== null || $submittedColumn !== null),
    'nameCandidates' => ['business_name', 'store_name', 'company_name', 'name', 'full_name'],
    'emailCandidates' => ['email', 'contact_email'],
    'phoneCandidates' => ['phone', 'contact_phone', 'business_phone'],
    'locationCandidates' => ['state', 'location', 'city', 'region'],
];

function value_from_candidates(array $row, array $candidates): string
{
    foreach ($candidates as $candidate) {
        if (array_key_exists($candidate, $row) && $row[$candidate] !== null && $row[$candidate] !== '') {
            return (string) $row[$candidate];
        }
    }

    return '';
}

function normalise_verification_status(string $value): string
{
    $trimmed = trim($value);
    if ($trimmed === '') {
        return '';
    }

    return strtolower($trimmed);
}

function decode_verification_files($value): array
{
    if (is_string($value) && trim($value) !== '') {
        $decoded = json_decode($value, true);
        if (is_array($decoded)) {
            $files = [];
            foreach ($decoded as $entry) {
                if (is_array($entry)) {
                    $files[] = $entry;
                } elseif (is_string($entry) && $entry !== '') {
                    $files[] = ['name' => $entry, 'url' => $entry];
                }
            }
            if ($files) {
                return $files;
            }
        }
    }

    return [];
}

function map_vendor_verification_row(array $row, array $context): array
{
    $statusColumn = $context['statusColumn'];
    $submittedColumn = $context['submittedColumn'];
    $reviewedColumn = $context['reviewedColumn'];
    $feedbackColumn = $context['feedbackColumn'];
    $reviewerColumn = $context['reviewerColumn'];
    $filesColumn = $context['filesColumn'];
    $historyColumn = $context['historyColumn'];
    $planColumn = $context['planColumn'];

    $statusRaw = '';
    if ($statusColumn && array_key_exists($statusColumn, $row)) {
        $statusRaw = (string) $row[$statusColumn];
    }

    $statusNormalised = normalise_verification_status($statusRaw);
    $submittedAt = $submittedColumn && array_key_exists($submittedColumn, $row) ? (string) ($row[$submittedColumn] ?? '') : '';
    $reviewedAt = $reviewedColumn && array_key_exists($reviewedColumn, $row) ? (string) ($row[$reviewedColumn] ?? '') : '';
    $feedback = $feedbackColumn && array_key_exists($feedbackColumn, $row) ? (string) ($row[$feedbackColumn] ?? '') : '';

    if ($statusNormalised === '' && $submittedAt !== '') {
        $statusNormalised = 'pending';
        $statusRaw = 'pending';
    }

    $reviewerId = null;
    if ($reviewerColumn && array_key_exists($reviewerColumn, $row) && $row[$reviewerColumn] !== '' && $row[$reviewerColumn] !== null) {
        $reviewerId = (int) $row[$reviewerColumn];
    }

    $planLevel = $planColumn && array_key_exists($planColumn, $row) ? (string) ($row[$planColumn] ?? '') : '';

    return [
        'id' => isset($row['id']) ? (int) $row['id'] : 0,
        'vendor_id' => isset($row['id']) ? (int) $row['id'] : 0,
        'business_name' => value_from_candidates($row, $context['nameCandidates']),
        'email' => value_from_candidates($row, $context['emailCandidates']),
        'phone' => value_from_candidates($row, $context['phoneCandidates']),
        'state' => value_from_candidates($row, $context['locationCandidates']),
        'status' => $statusRaw,
        'status_normalised' => $statusNormalised,
        'submitted_at' => $submittedAt,
        'reviewed_at' => $reviewedAt,
        'reviewer_id' => $reviewerId,
        'feedback' => $feedback,
        'plan_level' => $planLevel,
        'files' => $filesColumn && array_key_exists($filesColumn, $row) ? decode_verification_files($row[$filesColumn]) : [],
        'history' => $historyColumn && array_key_exists($historyColumn, $row) ? (string) ($row[$historyColumn] ?? '') : '',
    ];
}

function should_include_verification(array $record): bool
{
    $status = normalise_verification_status((string) ($record['status'] ?? ''));
    $submittedAt = (string) ($record['submitted_at'] ?? '');

    if ($status === '' && $submittedAt === '') {
        return false;
    }

    if ($status === 'not_submitted') {
        return false;
    }

    return true;
}

function fetch_vendor_verification(mysqli $db, int $vendorId, array $context): ?array
{
    $sql = sprintf('SELECT * FROM `%s` WHERE id = ? LIMIT 1', $context['table']);
    $stmt = $db->prepare($sql);
    if ($stmt === false) {
        return null;
    }

    $stmt->bind_param('i', $vendorId);
    $stmt->execute();
    $result = $stmt->get_result();
    $row = $result ? $result->fetch_assoc() : null;
    $stmt->close();

    if (!$row) {
        return null;
    }

    $record = map_vendor_verification_row($row, $context);
    if (!should_include_verification($record)) {
        return null;
    }

    return $record;
}

function fetch_all_vendor_verifications(mysqli $db, array $context): array
{
    if (!$context['trackingAvailable']) {
        return [];
    }

    $orderColumn = $context['submittedColumn'] ?: 'id';

    $conditions = [];
    if ($context['statusColumn']) {
        $statusCol = $context['statusColumn'];
        $conditions[] = sprintf('(TRIM(`%1$s`) <> "" AND `%1$s` IS NOT NULL)', $statusCol);
    }
    if ($context['submittedColumn']) {
        $submittedCol = $context['submittedColumn'];
        $conditions[] = sprintf('`%s` IS NOT NULL', $submittedCol);
    }

    $whereSql = $conditions ? 'WHERE ' . implode(' OR ', $conditions) : '';
    $sql = sprintf('SELECT * FROM `%s` %s ORDER BY `%s` DESC LIMIT 200', $context['table'], $whereSql, $orderColumn);
    $result = $db->query($sql);

    $records = [];
    if ($result instanceof mysqli_result) {
        while ($row = $result->fetch_assoc()) {
            $record = map_vendor_verification_row($row, $context);
            if (should_include_verification($record)) {
                $records[] = $record;
            }
        }
        $result->free();
    }

    return $records;
}

if (isset($_GET['format']) && $_GET['format'] === 'json') {
    header('Content-Type: application/json');

    if (isset($_GET['detail'])) {
        $detailId = (int) $_GET['detail'];
        $record = $detailId > 0 ? fetch_vendor_verification($db, $detailId, $verificationContext) : null;
        if (!$record) {
            http_response_code(404);
            echo json_encode([
                'success' => false,
                'message' => 'Verification request not found.',
                'meta' => ['trackingAvailable' => $verificationContext['trackingAvailable']],
            ]);
            exit;
        }

        echo json_encode([
            'success' => true,
            'data' => $record,
            'meta' => ['trackingAvailable' => $verificationContext['trackingAvailable']],
        ]);
        exit;
    }

    $records = fetch_all_vendor_verifications($db, $verificationContext);

    echo json_encode([
        'success' => true,
        'data' => $records,
        'meta' => ['trackingAvailable' => $verificationContext['trackingAvailable']],
    ]);
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

    $id = isset($payload['id']) ? (int) $payload['id'] : 0;
    $action = isset($payload['action']) ? strtolower(trim((string) $payload['action'])) : '';
    $feedback = isset($payload['feedback']) ? trim((string) $payload['feedback']) : '';

    if ($id <= 0 || !in_array($action, ['approve', 'reject'], true)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Invalid verification request or action.']);
        exit;
    }

    if (!$verificationContext['trackingAvailable'] || !$verificationContext['statusColumn']) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Verification tracking is not configured for this account.']);
        exit;
    }

    $existing = fetch_vendor_verification($db, $id, $verificationContext);
    if (!$existing) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Verification request not found.']);
        exit;
    }

    $newStatus = $action === 'approve' ? 'verified' : 'rejected';
    if ($action === 'reject' && $feedback === '') {
        $feedback = 'Verification rejected. Please review submitted documents.';
    }

    $setClauses = [];
    $types = '';
    $params = [];

    $statusColumn = $verificationContext['statusColumn'];
    $setClauses[] = sprintf('`%s` = ?', $statusColumn);
    $types .= 's';
    $params[] = $newStatus;

    if ($verificationContext['feedbackColumn']) {
        $setClauses[] = sprintf('`%s` = ?', $verificationContext['feedbackColumn']);
        $types .= 's';
        $params[] = $feedback;
    }

    if ($verificationContext['reviewedColumn']) {
        $setClauses[] = sprintf('`%s` = NOW()', $verificationContext['reviewedColumn']);
    }

    if ($verificationContext['reviewerColumn']) {
        $setClauses[] = sprintf('`%s` = ?', $verificationContext['reviewerColumn']);
        $types .= 'i';
        $params[] = (int) $_SESSION['admin_id'];
    }

    if (yustam_vendor_table_has_column('updated_at')) {
        $setClauses[] = '`updated_at` = NOW()';
    }

    if (!$setClauses) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Unable to update verification.']);
        exit;
    }

    $sql = sprintf('UPDATE `%s` SET %s WHERE id = ? LIMIT 1', $vendorTable, implode(', ', $setClauses));
    $stmt = $db->prepare($sql);
    if ($stmt === false) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Unable to prepare verification update.']);
        exit;
    }

    $types .= 'i';
    $params[] = $id;

    $bindParams = [$types];
    foreach ($params as $index => $value) {
        $bindParams[] = &$params[$index];
    }

    call_user_func_array([$stmt, 'bind_param'], $bindParams);
    $stmt->execute();
    $stmt->close();

    $updated = fetch_vendor_verification($db, $id, $verificationContext);

    echo json_encode([
        'success' => true,
        'message' => $action === 'approve' ? 'Verification approved.' : 'Verification rejected.',
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
            padding: 0.75rem clamp(1rem, 3vw, 1.75rem);
            min-height: 72px;
            box-shadow: 0 12px 28px rgba(0, 0, 0, 0.18);
            backdrop-filter: blur(12px);
        }

        .brand {
            display: inline-flex;
            align-items: center;
            gap: 0.65rem;
            font-size: clamp(1.25rem, 3.5vw, 1.7rem);
        }

        .brand span {
            font-family: 'Anton', sans-serif;
            letter-spacing: 0.11em;
        }

        .logo-img {
            width: 40px;
            height: 40px;
            border-radius: 12px;
            object-fit: cover;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.18);
        }

        .menu-toggle {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 42px;
            height: 42px;
            border-radius: 50%;
            border: none;
            background: rgba(255, 255, 255, 0.16);
            color: var(--white);
            cursor: pointer;
            margin-right: 0.75rem;
            transition: transform 0.2s ease, background 0.2s ease;
        }

        .top-actions {
            display: flex;
            gap: 0.6rem;
            align-items: center;
        }

        .top-action {
            width: 40px;
            height: 40px;
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

        .menu-toggle:hover,
        .menu-toggle:focus-visible,
        .top-action:hover,
        .top-action:focus-visible {
            transform: translateY(-2px);
            background: rgba(255, 255, 255, 0.24);
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
