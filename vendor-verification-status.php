<?php
require_once __DIR__ . '/session-path.php';
session_start();

header('Content-Type: application/json');

if (!isset($_SESSION['vendor_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Please sign in to continue.']);
    exit;
}

require_once __DIR__ . '/db.php';

function respond_json(bool $success, string $message, array $extra = [], ?int $statusCode = null): void
{
    if ($statusCode !== null) {
        http_response_code($statusCode);
    } elseif (!$success && http_response_code() === 200) {
        http_response_code(400);
    }

    echo json_encode(array_merge([
        'success' => $success,
        'message' => $message,
    ], $extra), JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}

function pick_vendor_column(array $candidates): ?string
{
    foreach ($candidates as $candidate) {
        if (yustam_vendor_table_has_column($candidate)) {
            return $candidate;
        }
    }

    return null;
}

$vendorId = (int)$_SESSION['vendor_id'];
$db = get_db_connection();

$vendorTable = 'vendors';
if (defined('YUSTAM_VENDORS_TABLE') && preg_match('/^[A-Za-z0-9_]+$/', YUSTAM_VENDORS_TABLE)) {
    $vendorTable = YUSTAM_VENDORS_TABLE;
}

$stmt = $db->prepare(sprintf('SELECT * FROM `%s` WHERE id = ? LIMIT 1', $vendorTable));
$stmt->bind_param('i', $vendorId);
$stmt->execute();
$result = $stmt->get_result();
$vendor = $result->fetch_assoc();
$stmt->close();

if (!$vendor) {
    respond_json(false, 'Unable to locate vendor account.', [], 404);
}

$statusColumn = pick_vendor_column(['verification_status', 'verification_state', 'kyc_status', 'verification_stage']);
$submittedColumn = pick_vendor_column(['verification_submitted_at', 'verification_requested_at', 'verification_sent_at', 'kyc_submitted_at']);
$feedbackColumn = pick_vendor_column(['verification_feedback', 'verification_comment', 'verification_notes', 'kyc_feedback']);

$rawStatus = $statusColumn ? ($vendor[$statusColumn] ?? '') : '';
$normalisedStatus = is_string($rawStatus) ? strtolower(trim($rawStatus)) : '';
$submittedAt = $submittedColumn ? ($vendor[$submittedColumn] ?? '') : '';
$feedback = $feedbackColumn ? ($vendor[$feedbackColumn] ?? '') : '';
$planValue = array_key_exists('plan', $vendor) ? ($vendor['plan'] ?? 'Free') : 'Free';
$planNormalised = strtolower(trim((string) $planValue));
$planIsPaid = $planNormalised !== '' && $planNormalised !== 'free';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = isset($_POST['action']) ? strtolower(trim((string) $_POST['action'])) : 'submit';

    if ($action !== 'submit') {
        respond_json(false, 'Unsupported action supplied.', [], 400);
    }

    if (!$statusColumn) {
        respond_json(false, 'Verification tracking is not configured for this account.');
    }

    $setClauses = [];
    $types = 's';
    $values = ['pending'];

    $setClauses[] = sprintf('`%s` = ?', $statusColumn);

    if ($submittedColumn) {
        $setClauses[] = sprintf('`%s` = NOW()', $submittedColumn);
    }

    if ($feedbackColumn) {
        $setClauses[] = sprintf('`%s` = NULL', $feedbackColumn);
    }

    if (yustam_vendor_table_has_column('updated_at')) {
        $setClauses[] = '`updated_at` = NOW()';
    }

    $sql = sprintf('UPDATE `%s` SET %s WHERE id = ?', $vendorTable, implode(', ', $setClauses));
    $stmt = $db->prepare($sql);

    $bindTypes = $types . 'i';
    $bindValues = $values;
    $bindValues[] = $vendorId;
    $bindParams = [$bindTypes];
    foreach ($bindValues as $index => $value) {
        $bindParams[] = &$bindValues[$index];
    }

    call_user_func_array([$stmt, 'bind_param'], $bindParams);
    $stmt->execute();
    $stmt->close();

    $vendor[$statusColumn] = 'pending';
    if ($submittedColumn) {
        $vendor[$submittedColumn] = date('Y-m-d H:i:s');
    }
    if ($feedbackColumn) {
        $vendor[$feedbackColumn] = null;
    }

    respond_json(true, 'Documents submitted for review.', [
        'data' => [
            'status' => 'pending',
            'statusDisplay' => 'Pending',
            'submittedAt' => $submittedColumn ? $vendor[$submittedColumn] : '',
            'feedback' => '',
            'plan' => $planValue,
            'planIsPaid' => $planIsPaid,
        ],
    ]);
}

respond_json(true, 'Status retrieved.', [
    'data' => [
        'status' => $normalisedStatus,
        'statusDisplay' => is_string($rawStatus) ? trim($rawStatus) : '',
        'submittedAt' => $submittedAt,
        'feedback' => is_string($feedback) ? trim((string) $feedback) : '',
        'plan' => $planValue,
        'planIsPaid' => $planIsPaid,
    ],
]);
