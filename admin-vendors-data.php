<?php
declare(strict_types=1);

require_once __DIR__ . '/admin-session.php';

require_admin_auth();

header('Content-Type: application/json');

function respond_admin_vendors(array $payload, int $statusCode = 200): void
{
    http_response_code($statusCode);
    echo json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}

function yustam_bind_statement(mysqli_stmt $statement, string $types, array $values): void
{
    if ($types === '') {
        return;
    }

    $params = [$types];
    foreach ($values as $key => $value) {
        $params[] = &$values[$key];
    }

    call_user_func_array([$statement, 'bind_param'], $params);
}

if (!function_exists('yustam_normalise_verification_state')) {
    function yustam_normalise_verification_state($value): string
    {
        if ($value === true || $value === 1 || $value === '1') {
            return 'verified';
        }
        if ($value === false || $value === 0 || $value === '0' || $value === null) {
            return 'unverified';
        }

        $value = strtolower(trim((string) $value));
        if (in_array($value, ['verified', 'approved', 'active', 'complete', 'completed', 'yes', 'true'], true)) {
            return 'verified';
        }
        if (in_array($value, ['pending', 'submitted', 'processing', 'under review', 'in_review', 'in-review'], true)) {
            return 'pending';
        }
        if (in_array($value, ['rejected', 'declined', 'failed', 'needs_changes', 'needs update', 'needs-update'], true)) {
            return 'rejected';
        }

        return 'unverified';
    }
}

if (!function_exists('yustam_verification_label')) {
    function yustam_verification_label(string $state): string
    {
        switch ($state) {
            case 'verified':
                return 'Verified';
            case 'pending':
                return 'Pending Review';
            case 'rejected':
                return 'Needs Changes';
            default:
                return 'Not Verified';
        }
    }
}

try {
    $db = get_db_connection();
} catch (Throwable $exception) {
    respond_admin_vendors([
        'success' => false,
        'message' => 'Unable to connect to the database.',
    ], 500);
}

$vendorTable = defined('YUSTAM_VENDORS_TABLE') && preg_match('/^[A-Za-z0-9_]+$/', (string) YUSTAM_VENDORS_TABLE)
    ? YUSTAM_VENDORS_TABLE
    : 'vendors';

$columns = yustam_vendor_table_columns();
$hasStatusColumn = in_array('status', $columns, true);
$hasPlanColumn = in_array('plan', $columns, true);
$hasBusinessNameColumn = in_array('business_name', $columns, true);
$hasFullNameColumn = in_array('full_name', $columns, true);
$hasNameColumn = in_array('name', $columns, true);
$hasPhoneColumn = in_array('phone', $columns, true);
$hasEmailColumn = in_array('email', $columns, true);
$hasCreatedAtColumn = in_array('created_at', $columns, true);
$hasJoinedAtColumn = in_array('joined_at', $columns, true);
$hasProfilePhotoColumn = in_array('profile_photo', $columns, true);
$hasAvatarColumn = in_array('avatar_url', $columns, true);

$verificationColumn = null;
foreach (['verification_status', 'verification_state', 'verification', 'kyc_status', 'verification_stage'] as $candidate) {
    if (in_array($candidate, $columns, true)) {
        $verificationColumn = $candidate;
        break;
    }
}

$locationColumn = null;
foreach (['location', 'city', 'region', 'state'] as $candidate) {
    if (in_array($candidate, $columns, true)) {
        $locationColumn = $candidate;
        break;
    }
}

$page = max(1, (int) ($_GET['page'] ?? 1));
$pageSize = max(1, min(100, (int) ($_GET['pageSize'] ?? 20)));
$offset = ($page - 1) * $pageSize;
$sort = strtolower((string) ($_GET['sort'] ?? 'desc')) === 'asc' ? 'ASC' : 'DESC';

$search = trim((string) ($_GET['search'] ?? ''));
$planFilter = trim((string) ($_GET['plan'] ?? ''));
$statusFilter = trim((string) ($_GET['status'] ?? ''));

$conditions = [];
$types = '';
$params = [];

$searchableColumns = [];
if ($hasNameColumn) {
    $searchableColumns[] = 'name';
}
if ($hasFullNameColumn) {
    $searchableColumns[] = 'full_name';
}
if ($hasBusinessNameColumn) {
    $searchableColumns[] = 'business_name';
}
if ($hasEmailColumn) {
    $searchableColumns[] = 'email';
}
if ($hasPhoneColumn) {
    $searchableColumns[] = 'phone';
}

if ($search !== '' && $searchableColumns) {
    $like = '%' . $search . '%';
    $searchConditions = [];
    foreach ($searchableColumns as $column) {
        $searchConditions[] = sprintf('`%s` LIKE ?', $column);
        $params[] = $like;
        $types .= 's';
    }
    $conditions[] = '(' . implode(' OR ', $searchConditions) . ')';
}

if ($planFilter !== '' && $hasPlanColumn) {
    $conditions[] = '`plan` = ?';
    $params[] = $planFilter;
    $types .= 's';
}

if ($statusFilter !== '' && $hasStatusColumn) {
    $conditions[] = '`status` = ?';
    $params[] = $statusFilter;
    $types .= 's';
}

$whereSql = $conditions ? 'WHERE ' . implode(' AND ', $conditions) : '';
$orderColumn = $hasCreatedAtColumn ? 'created_at' : ($hasJoinedAtColumn ? 'joined_at' : 'id');

$totalSql = sprintf('SELECT COUNT(*) AS total FROM `%s` %s', $vendorTable, $whereSql);
$totalStmt = $db->prepare($totalSql);
if ($totalStmt === false) {
    respond_admin_vendors(['success' => false, 'message' => 'Unable to prepare vendors count query.'], 500);
}
yustam_bind_statement($totalStmt, $types, $params);
$totalStmt->execute();
$totalResult = $totalStmt->get_result();
$totalRow = $totalResult ? $totalResult->fetch_assoc() : ['total' => 0];
$totalStmt->close();

$totalVendorsMatchingFilters = (int) ($totalRow['total'] ?? 0);

$listSql = sprintf(
    'SELECT * FROM `%s` %s ORDER BY `%s` %s LIMIT ? OFFSET ?',
    $vendorTable,
    $whereSql,
    $orderColumn,
    $sort
);
$listStmt = $db->prepare($listSql);
if ($listStmt === false) {
    respond_admin_vendors(['success' => false, 'message' => 'Unable to prepare vendors query.'], 500);
}

$listTypes = $types . 'ii';
$listParams = $params;
$listParams[] = $pageSize;
$listParams[] = $offset;
yustam_bind_statement($listStmt, $listTypes, $listParams);
$listStmt->execute();
$listResult = $listStmt->get_result();
$vendors = [];

$nameColumn = yustam_vendor_name_column();

while ($row = $listResult->fetch_assoc()) {
    $planValue = $hasPlanColumn ? ($row['plan'] ?? '') : '';
    $planLabel = yustam_format_plan_label($planValue);
    $planSlug = yustam_slugify_plan($planValue);

    $statusRaw = $hasStatusColumn ? ($row['status'] ?? '') : '';
    $statusState = yustam_normalise_account_status($statusRaw);
    $statusLabel = yustam_account_status_label($statusState);

    $profilePhoto = '';
    if ($hasProfilePhotoColumn && !empty($row['profile_photo'])) {
        $profilePhoto = (string) $row['profile_photo'];
    } elseif ($hasAvatarColumn && !empty($row['avatar_url'])) {
        $profilePhoto = (string) $row['avatar_url'];
    }

    $createdAtValue = '';
    if ($hasCreatedAtColumn && !empty($row['created_at'])) {
        $createdAtValue = (string) $row['created_at'];
    } elseif ($hasJoinedAtColumn && !empty($row['joined_at'])) {
        $createdAtValue = (string) $row['joined_at'];
    }

    $createdAtIso = '';
    $createdAtFormatted = '';
    if ($createdAtValue !== '') {
        $timestamp = strtotime($createdAtValue);
        if ($timestamp) {
            $createdAtIso = date('c', $timestamp);
            $createdAtFormatted = date('j M Y', $timestamp);
        }
    }

    $verificationValue = $verificationColumn ? ($row[$verificationColumn] ?? '') : '';
    $verificationState = yustam_normalise_verification_state($verificationValue);
    $verificationLabel = yustam_verification_label($verificationState);
    $locationValue = $locationColumn ? ($row[$locationColumn] ?? '') : '';

    $vendors[] = [
        'id' => (int) ($row['id'] ?? 0),
        'displayName' => $row[$nameColumn] ?? '',
        'businessName' => $hasBusinessNameColumn ? ($row['business_name'] ?? '') : '',
        'email' => $hasEmailColumn ? ($row['email'] ?? '') : '',
        'phone' => $hasPhoneColumn ? ($row['phone'] ?? '') : '',
        'plan' => $planValue,
        'planLabel' => $planLabel,
        'planSlug' => $planSlug,
        'status' => $statusState,
        'statusLabel' => $statusLabel,
        'profilePhoto' => $profilePhoto,
        'createdAt' => $createdAtIso,
        'createdAtFormatted' => $createdAtFormatted,
        'verification' => $verificationValue,
        'verificationState' => $verificationState,
        'verificationLabel' => $verificationLabel,
        'location' => $locationValue,
    ];
}
$listStmt->close();

$hasNext = ($offset + count($vendors)) < $totalVendorsMatchingFilters;
$totalPages = (int) max(1, (int) ceil($totalVendorsMatchingFilters / $pageSize));

$counts = [
    'total' => 0,
    'suspended' => 0,
    'activeWeek' => 0,
    'plan' => [
        'free' => 0,
        'plus' => 0,
        'pro' => 0,
        'premium' => 0,
    ],
];

$totalAllSql = sprintf('SELECT COUNT(*) AS total FROM `%s`', $vendorTable);
$totalAllResult = $db->query($totalAllSql);
if ($totalAllResult instanceof mysqli_result) {
    $countsRow = $totalAllResult->fetch_assoc();
    $counts['total'] = (int) ($countsRow['total'] ?? 0);
    $totalAllResult->free();
}

if ($hasPlanColumn) {
    $planCountSql = sprintf('SELECT `plan`, COUNT(*) AS total FROM `%s` GROUP BY `plan`', $vendorTable);
    $planResult = $db->query($planCountSql);
    if ($planResult instanceof mysqli_result) {
        while ($planRow = $planResult->fetch_assoc()) {
            $bucket = yustam_normalise_plan_bucket($planRow['plan'] ?? '');
            $counts['plan'][$bucket] = ($counts['plan'][$bucket] ?? 0) + (int) ($planRow['total'] ?? 0);
        }
        $planResult->free();
    }
}

if ($hasStatusColumn) {
    $suspendedSql = sprintf("SELECT COUNT(*) AS total FROM `%s` WHERE `status` = 'suspended'", $vendorTable);
    $suspendedResult = $db->query($suspendedSql);
    if ($suspendedResult instanceof mysqli_result) {
        $suspendedRow = $suspendedResult->fetch_assoc();
        $counts['suspended'] = (int) ($suspendedRow['total'] ?? 0);
        $suspendedResult->free();
    }
}

if ($hasCreatedAtColumn) {
    $activeWeekSql = sprintf(
        "SELECT COUNT(*) AS total FROM `%s` WHERE `%s` >= DATE_SUB(NOW(), INTERVAL 7 DAY)",
        $vendorTable,
        $orderColumn
    );
    $activeWeekResult = $db->query($activeWeekSql);
    if ($activeWeekResult instanceof mysqli_result) {
        $activeWeekRow = $activeWeekResult->fetch_assoc();
        $counts['activeWeek'] = (int) ($activeWeekRow['total'] ?? 0);
        $activeWeekResult->free();
    }
}

respond_admin_vendors([
    'success' => true,
    'data' => [
        'vendors' => $vendors,
        'pagination' => [
            'page' => $page,
            'pageSize' => $pageSize,
            'total' => $totalVendorsMatchingFilters,
            'totalPages' => $totalPages,
            'hasNext' => $hasNext,
            'hasPrev' => $page > 1,
        ],
        'counts' => $counts,
    ],
]);

function yustam_normalise_plan_bucket($value): string
{
    $value = strtolower(trim((string) $value));
    if ($value === '' || $value === 'free' || strpos($value, 'starter') !== false) {
        return 'free';
    }
    if (strpos($value, 'plus') !== false) {
        return 'plus';
    }
    if (strpos($value, 'pro') !== false) {
        return 'pro';
    }
    if (strpos($value, 'premium') !== false || strpos($value, 'elite') !== false) {
        return 'premium';
    }
    return 'free';
}

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

function yustam_normalise_account_status($value): string
{
    $value = strtolower(trim((string) $value));
    if ($value === '') {
        return 'active';
    }
    if (in_array($value, ['active', 'enabled', 'approved', 'verified', 'open'], true)) {
        return 'active';
    }
    if (in_array($value, ['suspended', 'disabled', 'blocked'], true)) {
        return 'suspended';
    }
    if (in_array($value, ['pending', 'awaiting', 'review'], true)) {
        return 'pending';
    }
    return 'active';
}

function yustam_account_status_label(string $state): string
{
    return match ($state) {
        'pending' => 'Pending Approval',
        'suspended' => 'Suspended',
        default => 'Active',
    };
}
