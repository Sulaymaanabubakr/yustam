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

$requestTrackingEnabled = vendor_verifications_table_exists($db);

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
    'trackingAvailable' => ($statusColumn !== null || $submittedColumn !== null || $requestTrackingEnabled),
    'requestTracking' => $requestTrackingEnabled,
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

function guess_verification_media_type_from_url(string $url): string
{
    $trimmed = trim($url);
    if ($trimmed === '') {
        return '';
    }

    if (strncmp($trimmed, 'data:', 5) === 0) {
        if (preg_match('/^data:([^;,]+)/i', $trimmed, $matches)) {
            return strtolower((string) ($matches[1] ?? ''));
        }
        return '';
    }

    $path = (string) parse_url($trimmed, PHP_URL_PATH);
    if ($path !== '') {
        $extension = strtolower((string) pathinfo($path, PATHINFO_EXTENSION));
        if (in_array($extension, ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg', 'heic', 'heif'], true)) {
            return 'image';
        }
        if ($extension === 'pdf') {
            return 'application/pdf';
        }
        if (in_array($extension, ['mp4', 'mov', 'avi', 'mkv', 'webm'], true)) {
            return 'video';
        }
        if (in_array($extension, ['mp3', 'wav', 'ogg', 'aac'], true)) {
            return 'audio';
        }
        if (in_array($extension, ['doc', 'docx'], true)) {
            return 'application/msword';
        }
        if (in_array($extension, ['xls', 'xlsx'], true)) {
            return 'application/vnd.ms-excel';
        }
        if (in_array($extension, ['ppt', 'pptx'], true)) {
            return 'application/vnd.ms-powerpoint';
        }
    }

    return '';
}

function normalise_verification_file_entry($entry, int $index): ?array
{
    if ($entry === null) {
        return null;
    }

    if (is_string($entry)) {
        $url = trim($entry);
        if ($url === '') {
            return null;
        }
        return [
            'name' => sprintf('Document %d', $index + 1),
            'url' => $url,
            'media_type' => guess_verification_media_type_from_url($url),
            '__source' => 'string',
        ];
    }

    if (!is_array($entry)) {
        if (is_object($entry)) {
            $entry = (array) $entry;
        } else {
            return null;
        }
    }

    $flat = $entry;
    if (isset($flat['file']) && is_array($flat['file'])) {
        $flat = array_merge($flat, $flat['file']);
    }

    $url = '';
    $urlCandidates = ['url', 'secure_url', 'download_url', 'signed_url', 'href', 'link', 'file', 'path', 'file_path', 'source'];
    foreach ($urlCandidates as $candidate) {
        if (!array_key_exists($candidate, $flat)) {
            continue;
        }
        $value = $flat[$candidate];
        if (is_string($value) && trim($value) !== '') {
            $url = trim($value);
            break;
        }
        if (is_array($value) || is_object($value)) {
            $valueArray = (array) $value;
            foreach (['url', 'secure_url', 'download_url', 'signed_url'] as $nested) {
                if (isset($valueArray[$nested]) && trim((string) $valueArray[$nested]) !== '') {
                    $url = trim((string) $valueArray[$nested]);
                    break 2;
                }
            }
        }
    }

    if ($url === '' && isset($flat['public_id'])) {
        $cloudName = isset($flat['cloud_name']) ? trim((string) $flat['cloud_name']) : '';
        $publicId = trim((string) $flat['public_id']);
        $resourceType = isset($flat['resource_type']) ? trim((string) $flat['resource_type']) : 'image';
        $deliveryType = isset($flat['type']) ? trim((string) $flat['type']) : 'upload';
        $format = isset($flat['format']) ? trim((string) $flat['format']) : '';
        if ($publicId !== '') {
            if ($cloudName !== '') {
                $url = sprintf(
                    'https://res.cloudinary.com/%s/%s/%s/%s%s',
                    rawurlencode($cloudName),
                    $resourceType !== '' ? $resourceType : 'image',
                    $deliveryType !== '' ? $deliveryType : 'upload',
                    ltrim($publicId, '/'),
                    $format !== '' ? '.' . $format : ''
                );
            } elseif (isset($_ENV['CLOUDINARY_CLOUD_NAME'])) {
                $url = sprintf(
                    'https://res.cloudinary.com/%s/image/upload/%s%s',
                    rawurlencode((string) $_ENV['CLOUDINARY_CLOUD_NAME']),
                    ltrim($publicId, '/'),
                    $format !== '' ? '.' . $format : ''
                );
            }
        }
    }

    $name = '';
    foreach (['name', 'label', 'title', 'filename', 'file_name', 'original_filename', 'document', 'document_type', 'type'] as $candidate) {
        if (isset($flat[$candidate]) && trim((string) $flat[$candidate]) !== '') {
            $name = trim((string) $flat[$candidate]);
            break;
        }
    }
    if ($name === '') {
        $name = sprintf('Document %d', $index + 1);
    }

    $mediaType = '';
    foreach (['media_type', 'mime', 'mime_type', 'content_type', 'resource_type', 'type', 'format'] as $candidate) {
        if (isset($flat[$candidate]) && trim((string) $flat[$candidate]) !== '') {
            $mediaType = strtolower(trim((string) $flat[$candidate]));
            break;
        }
    }

    if ($mediaType === '' && $url !== '') {
        $mediaType = guess_verification_media_type_from_url($url);
    }

    $result = [
        'name' => $name,
        '__source' => isset($flat['__source']) ? $flat['__source'] : 'entry',
    ];

    if ($url !== '') {
        $result['url'] = $url;
    }

    if ($mediaType !== '') {
        $result['media_type'] = $mediaType;
    }

    if (isset($flat['format']) && trim((string) $flat['format']) !== '') {
        $result['format'] = strtolower(trim((string) $flat['format']));
    }

    if (isset($flat['public_id']) && trim((string) $flat['public_id']) !== '') {
        $result['public_id'] = trim((string) $flat['public_id']);
    }

    return $url === '' ? null : $result;
}

function decode_verification_files($value): array
{
    $rawEntries = [];

    if (is_string($value)) {
        $trimmed = trim($value);
        if ($trimmed === '') {
            return [];
        }
        $decoded = json_decode($trimmed, true);
        if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
            $rawEntries = $decoded;
        } else {
            $rawEntries = [$trimmed];
        }
    } elseif (is_array($value)) {
        $rawEntries = $value;
    } elseif (is_object($value)) {
        $rawEntries = (array) $value;
    } else {
        return [];
    }

    if ($rawEntries && array_keys($rawEntries) !== range(0, count($rawEntries) - 1)) {
        $rawEntries = array_values($rawEntries);
    }

    $files = [];
    foreach ($rawEntries as $index => $entry) {
        $normalised = normalise_verification_file_entry($entry, (int) $index);
        if ($normalised !== null) {
            $files[] = $normalised;
        }
    }

    return $files;
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

    $primaryId = isset($row['id']) ? (int) $row['id'] : 0;
    $vendorId = isset($row['vendor_id']) ? (int) $row['vendor_id'] : $primaryId;

    $statusRaw = '';
    if ($statusColumn && array_key_exists($statusColumn, $row)) {
        $statusRaw = (string) $row[$statusColumn];
    } elseif (array_key_exists('status', $row)) {
        $statusRaw = (string) $row['status'];
    } elseif (array_key_exists('status_raw', $row)) {
        $statusRaw = (string) $row['status_raw'];
    }

    $statusNormalised = normalise_verification_status($statusRaw);

    $submittedAt = '';
    $submittedCandidates = array_filter([$submittedColumn, 'submitted_at', 'requested_at', 'created_at']);
    foreach ($submittedCandidates as $candidate) {
        if ($candidate && array_key_exists($candidate, $row) && $row[$candidate] !== null && $row[$candidate] !== '') {
            $submittedAt = (string) $row[$candidate];
            break;
        }
    }

    $reviewedAt = '';
    $reviewedCandidates = array_filter([$reviewedColumn, 'reviewed_at', 'approved_at', 'completed_at', 'updated_at']);
    foreach ($reviewedCandidates as $candidate) {
        if ($candidate && array_key_exists($candidate, $row) && $row[$candidate] !== null && $row[$candidate] !== '') {
            $reviewedAt = (string) $row[$candidate];
            break;
        }
    }

    $feedback = '';
    $feedbackCandidates = array_filter([$feedbackColumn, 'feedback', 'comment', 'notes']);
    foreach ($feedbackCandidates as $candidate) {
        if ($candidate && array_key_exists($candidate, $row) && $row[$candidate] !== null && $row[$candidate] !== '') {
            $feedback = (string) $row[$candidate];
            break;
        }
    }

    if ($statusNormalised === '' && $submittedAt !== '') {
        $statusNormalised = 'pending';
        $statusRaw = $statusRaw !== '' ? $statusRaw : 'pending';
    }

    $reviewerId = null;
    $reviewerCandidates = array_filter([$reviewerColumn, 'reviewer_id', 'approved_by']);
    foreach ($reviewerCandidates as $candidate) {
        if ($candidate && array_key_exists($candidate, $row) && $row[$candidate] !== '' && $row[$candidate] !== null) {
            $reviewerId = (int) $row[$candidate];
            break;
        }
    }

    $planLevel = '';
    $planCandidates = array_filter([$planColumn, 'plan', 'plan_level', 'subscription_plan']);
    foreach ($planCandidates as $candidate) {
        if ($candidate && array_key_exists($candidate, $row) && $row[$candidate] !== null && $row[$candidate] !== '') {
            $planLevel = (string) $row[$candidate];
            break;
        }
    }

    $files = [];
    if ($filesColumn && array_key_exists($filesColumn, $row)) {
        $files = decode_verification_files($row[$filesColumn]);
    } elseif (array_key_exists('files', $row)) {
        $files = decode_verification_files($row['files']);
    }

    $history = '';
    if ($historyColumn && array_key_exists($historyColumn, $row)) {
        $history = (string) ($row[$historyColumn] ?? '');
    } elseif (array_key_exists('history', $row)) {
        $history = (string) ($row['history'] ?? '');
    }

    $requestId = null;
    if (array_key_exists('request_id', $row)) {
        $requestId = (int) $row['request_id'];
    } elseif ($vendorId > 0 && $primaryId > 0 && $primaryId !== $vendorId) {
        $requestId = $primaryId;
    }

    $resolvedId = $vendorId > 0 ? $vendorId : $primaryId;

    return [
        'id' => $resolvedId,
        'vendor_id' => $vendorId,
        'request_id' => $requestId,
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
        'files' => $files,
        'history' => $history,
        'source' => isset($row['__source']) ? (string) $row['__source'] : 'vendors',
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

function vendor_verifications_table_exists(mysqli $db): bool
{
    static $exists = null;

    if ($exists !== null) {
        return $exists;
    }

    try {
        $tableName = $db->real_escape_string('vendor_verifications');
        $result = $db->query("SHOW TABLES LIKE '{$tableName}'");
        $exists = $result instanceof mysqli_result && $result->num_rows > 0;
        if ($result instanceof mysqli_result) {
            $result->free();
        }
    } catch (Throwable $exception) {
        error_log('Unable to inspect vendor_verifications table: ' . $exception->getMessage());
        $exists = false;
    }

    return $exists;
}

function vendor_verifications_table_columns(mysqli $db): array
{
    static $columns = null;

    if (is_array($columns)) {
        return $columns;
    }

    $columns = [];

    if (!vendor_verifications_table_exists($db)) {
        return $columns;
    }

    try {
        $result = $db->query('SHOW COLUMNS FROM `vendor_verifications`');
        if ($result instanceof mysqli_result) {
            while ($row = $result->fetch_assoc()) {
                if (isset($row['Field'])) {
                    $columns[] = $row['Field'];
                }
            }
            $result->free();
        }
    } catch (Throwable $exception) {
        error_log('Unable to inspect vendor_verifications columns: ' . $exception->getMessage());
    }

    return $columns;
}

function fetch_latest_verification_requests_map(mysqli $db): array
{
    if (!vendor_verifications_table_exists($db)) {
        return [];
    }

    $requests = [];

    try {
        $sql = 'SELECT *, id AS request_id FROM `vendor_verifications` ORDER BY COALESCE(submitted_at, created_at, updated_at) DESC, id DESC LIMIT 400';
        $result = $db->query($sql);
        if ($result instanceof mysqli_result) {
            while ($row = $result->fetch_assoc()) {
                $vendorId = isset($row['vendor_id']) ? (int) $row['vendor_id'] : 0;
                if ($vendorId <= 0 || isset($requests[$vendorId])) {
                    continue;
                }
                $row['request_id'] = isset($row['request_id']) ? (int) $row['request_id'] : (int) ($row['id'] ?? 0);
                $row['__source'] = 'vendor_verifications';
                $requests[$vendorId] = $row;
            }
            $result->free();
        }
    } catch (Throwable $exception) {
        error_log('Unable to load vendor verification requests: ' . $exception->getMessage());
    }

    return $requests;
}

function fetch_verification_request_by_vendor(mysqli $db, int $vendorId, ?int $requestId = null): ?array
{
    if (!vendor_verifications_table_exists($db)) {
        return null;
    }

    try {
        if ($requestId !== null && $requestId > 0) {
            $stmt = $db->prepare('SELECT *, id AS request_id FROM `vendor_verifications` WHERE id = ? LIMIT 1');
            if ($stmt === false) {
                return null;
            }
            $stmt->bind_param('i', $requestId);
        } else {
            $stmt = $db->prepare('SELECT *, id AS request_id FROM `vendor_verifications` WHERE vendor_id = ? ORDER BY COALESCE(submitted_at, created_at, updated_at) DESC, id DESC LIMIT 1');
            if ($stmt === false) {
                return null;
            }
            $stmt->bind_param('i', $vendorId);
        }

        $stmt->execute();
        $result = $stmt->get_result();
        $row = $result ? $result->fetch_assoc() : null;
        $stmt->close();

        if (!$row) {
            return null;
        }

        $row['request_id'] = isset($row['request_id']) ? (int) $row['request_id'] : (int) ($row['id'] ?? 0);
        $row['__source'] = 'vendor_verifications';
        return $row;
    } catch (Throwable $exception) {
        error_log('Unable to fetch vendor verification request: ' . $exception->getMessage());
        return null;
    }
}

function merge_verification_request_row(array $record, array $requestRow, array $context): array
{
    if (!isset($record['vendor_id']) || !$record['vendor_id']) {
        $record['vendor_id'] = isset($requestRow['vendor_id']) ? (int) $requestRow['vendor_id'] : 0;
    }

    if (!isset($record['id']) || !$record['id']) {
        $record['id'] = $record['vendor_id'] ?: (isset($requestRow['id']) ? (int) $requestRow['id'] : 0);
    }

    if (isset($requestRow['request_id']) || isset($requestRow['id'])) {
        $requestId = isset($requestRow['request_id']) ? (int) $requestRow['request_id'] : (int) $requestRow['id'];
        if ($requestId > 0) {
            $record['request_id'] = $requestId;
        }
    }

    if (isset($requestRow['status'])) {
        $record['status'] = (string) $requestRow['status'];
        $record['status_normalised'] = normalise_verification_status($record['status']);
    }

    foreach (['submitted_at', 'created_at', 'requested_at'] as $candidate) {
        if (isset($requestRow[$candidate]) && $requestRow[$candidate] !== null && $requestRow[$candidate] !== '') {
            $record['submitted_at'] = (string) $requestRow[$candidate];
            break;
        }
    }

    foreach (['reviewed_at', 'approved_at', 'completed_at', 'updated_at'] as $candidate) {
        if (isset($requestRow[$candidate]) && $requestRow[$candidate] !== null && $requestRow[$candidate] !== '') {
            $record['reviewed_at'] = (string) $requestRow[$candidate];
            break;
        }
    }

    if (array_key_exists('feedback', $requestRow)) {
        $record['feedback'] = (string) ($requestRow['feedback'] ?? '');
    }

    if (array_key_exists('reviewer_id', $requestRow) && $requestRow['reviewer_id'] !== null && $requestRow['reviewer_id'] !== '') {
        $record['reviewer_id'] = (int) $requestRow['reviewer_id'];
    }

    if (array_key_exists('files', $requestRow)) {
        $files = decode_verification_files($requestRow['files']);
        if ($files) {
            $record['files'] = $files;
        }
    }

    if (array_key_exists('history', $requestRow) && $requestRow['history'] !== null && $requestRow['history'] !== '') {
        $record['history'] = (string) $requestRow['history'];
    }

    if (empty($record['plan_level']) && array_key_exists('plan_level', $requestRow) && $requestRow['plan_level'] !== '') {
        $record['plan_level'] = (string) $requestRow['plan_level'];
    } elseif (empty($record['plan_level']) && array_key_exists('plan', $requestRow) && $requestRow['plan'] !== '') {
        $record['plan_level'] = (string) $requestRow['plan'];
    }

    if (($record['business_name'] ?? '') === '' && array_key_exists('business_name', $requestRow)) {
        $record['business_name'] = (string) ($requestRow['business_name'] ?? '');
    }
    if (($record['email'] ?? '') === '' && array_key_exists('email', $requestRow)) {
        $record['email'] = (string) ($requestRow['email'] ?? '');
    }
    if (($record['phone'] ?? '') === '' && array_key_exists('phone', $requestRow)) {
        $record['phone'] = (string) ($requestRow['phone'] ?? '');
    }
    if (($record['state'] ?? '') === '' && array_key_exists('state', $requestRow)) {
        $record['state'] = (string) ($requestRow['state'] ?? '');
    }

    $record['source'] = isset($requestRow['__source']) ? (string) $requestRow['__source'] : ($record['source'] ?? 'vendors');

    return $record;
}

function map_request_record(array $requestRow, array $context): array
{
    $vendorId = isset($requestRow['vendor_id']) ? (int) $requestRow['vendor_id'] : 0;
    $syntheticRow = [
        'id' => $vendorId ?: (int) ($requestRow['request_id'] ?? $requestRow['id'] ?? 0),
        'vendor_id' => $vendorId,
        'status' => $requestRow['status'] ?? '',
        'submitted_at' => $requestRow['submitted_at'] ?? ($requestRow['created_at'] ?? ''),
        'reviewed_at' => $requestRow['reviewed_at'] ?? ($requestRow['updated_at'] ?? ''),
        'feedback' => $requestRow['feedback'] ?? '',
        'files' => $requestRow['files'] ?? [],
        'history' => $requestRow['history'] ?? '',
        '__source' => 'vendor_verifications',
    ];

    foreach ($context['nameCandidates'] as $candidate) {
        if (array_key_exists($candidate, $requestRow)) {
            $syntheticRow[$candidate] = $requestRow[$candidate];
        }
    }
    foreach ($context['emailCandidates'] as $candidate) {
        if (array_key_exists($candidate, $requestRow)) {
            $syntheticRow[$candidate] = $requestRow[$candidate];
        }
    }
    foreach ($context['phoneCandidates'] as $candidate) {
        if (array_key_exists($candidate, $requestRow)) {
            $syntheticRow[$candidate] = $requestRow[$candidate];
        }
    }
    foreach ($context['locationCandidates'] as $candidate) {
        if (array_key_exists($candidate, $requestRow)) {
            $syntheticRow[$candidate] = $requestRow[$candidate];
        }
    }

    if ($context['planColumn']) {
        $syntheticRow[$context['planColumn']] = $requestRow['plan'] ?? ($requestRow['plan_level'] ?? ($requestRow['subscription_plan'] ?? ''));
    } else {
        $syntheticRow['plan'] = $requestRow['plan'] ?? ($requestRow['plan_level'] ?? ($requestRow['subscription_plan'] ?? ''));
    }

    $record = map_vendor_verification_row($syntheticRow, $context);
    return merge_verification_request_row($record, $requestRow, $context);
}

function fetch_vendor_verification(mysqli $db, int $vendorId, array $context, ?int $requestId = null): ?array
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

    $requestRow = fetch_verification_request_by_vendor($db, $vendorId, $requestId);

    if (!$row) {
        return $requestRow ? map_request_record($requestRow, $context) : null;
    }

    $record = map_vendor_verification_row($row, $context);
    if ($requestRow) {
        $record = merge_verification_request_row($record, $requestRow, $context);
    }

    if (!should_include_verification($record) && !$requestRow) {
        return null;
    }

    return $record;
}

function fetch_all_vendor_verifications(mysqli $db, array $context): array
{
    $requestMap = fetch_latest_verification_requests_map($db);

    if (!$context['trackingAvailable'] && !$requestMap) {
        return [];
    }

    $recordsByVendor = [];
    $orderColumn = $context['submittedColumn'] ?: ($context['reviewedColumn'] ?: 'id');

    if ($context['trackingAvailable']) {
        $conditions = [];
        if ($context['statusColumn']) {
            $statusCol = $context['statusColumn'];
            $conditions[] = sprintf('(TRIM(`%1$s`) <> "" AND `%1$s` IS NOT NULL)', $statusCol);
        }
        if ($context['submittedColumn']) {
            $submittedCol = $context['submittedColumn'];
            $conditions[] = sprintf('`%s` IS NOT NULL', $submittedCol);
        }
        if ($requestMap) {
            $vendorIdsFilter = array_filter(array_map('intval', array_keys($requestMap)));
            if ($vendorIdsFilter) {
                $conditions[] = sprintf('`id` IN (%s)', implode(',', $vendorIdsFilter));
            }
        }

        $whereSql = $conditions ? 'WHERE ' . implode(' OR ', $conditions) : '';
        $sql = sprintf('SELECT * FROM `%s` %s ORDER BY `%s` DESC LIMIT 200', $context['table'], $whereSql, $orderColumn);

        try {
            $result = $db->query($sql);
        } catch (Throwable $exception) {
            error_log('Unable to load vendor verification records: ' . $exception->getMessage());
            $result = false;
        }

        if ($result instanceof mysqli_result) {
            while ($row = $result->fetch_assoc()) {
                $record = map_vendor_verification_row($row, $context);
                $vendorKey = $record['vendor_id'] ?: $record['id'];
                if ($vendorKey <= 0) {
                    continue;
                }

                if (isset($requestMap[$vendorKey])) {
                    $record = merge_verification_request_row($record, $requestMap[$vendorKey], $context);
                    unset($requestMap[$vendorKey]);
                }

                if (!should_include_verification($record)) {
                    continue;
                }

                $recordsByVendor[$vendorKey] = $record;
            }
            $result->free();
        }
    }

    if ($requestMap) {
        $remainingVendorIds = array_filter(array_map('intval', array_keys($requestMap)));
        if ($remainingVendorIds) {
            $idsSql = implode(',', $remainingVendorIds);
            $sql = sprintf('SELECT * FROM `%s` WHERE `id` IN (%s)', $context['table'], $idsSql);

            try {
                $result = $db->query($sql);
            } catch (Throwable $exception) {
                error_log('Unable to load vendor rows for verification requests: ' . $exception->getMessage());
                $result = false;
            }

            if ($result instanceof mysqli_result) {
                while ($row = $result->fetch_assoc()) {
                    $record = map_vendor_verification_row($row, $context);
                    $vendorKey = $record['vendor_id'] ?: $record['id'];
                    if ($vendorKey <= 0 || !isset($requestMap[$vendorKey])) {
                        continue;
                    }
                    $record = merge_verification_request_row($record, $requestMap[$vendorKey], $context);
                    unset($requestMap[$vendorKey]);
                    if (should_include_verification($record)) {
                        $recordsByVendor[$vendorKey] = $record;
                    }
                }
                $result->free();
            }
        }

        foreach ($requestMap as $vendorId => $requestRow) {
            $record = map_request_record($requestRow, $context);
            $vendorKey = $record['vendor_id'] ?: $record['id'] ?: (int) $vendorId;
            if ($vendorKey <= 0) {
                continue;
            }
            if (should_include_verification($record)) {
                $recordsByVendor[$vendorKey] = $record;
            }
        }
    }

    $records = array_values($recordsByVendor);

    usort($records, static function (array $a, array $b): int {
        $aTime = strtotime((string) ($a['submitted_at'] ?? '')) ?: strtotime((string) ($a['reviewed_at'] ?? '')) ?: 0;
        $bTime = strtotime((string) ($b['submitted_at'] ?? '')) ?: strtotime((string) ($b['reviewed_at'] ?? '')) ?: 0;
        if ($aTime === $bTime) {
            $aOrder = (int) ($a['request_id'] ?? $a['id'] ?? 0);
            $bOrder = (int) ($b['request_id'] ?? $b['id'] ?? 0);
            return $bOrder <=> $aOrder;
        }
        return $bTime <=> $aTime;
    });

    return array_slice($records, 0, 200);
}

if (isset($_GET['format']) && $_GET['format'] === 'json') {
    header('Content-Type: application/json');

    if (isset($_GET['detail'])) {
        $detailId = (int) $_GET['detail'];
        $requestId = isset($_GET['request_id']) ? (int) $_GET['request_id'] : null;
        $record = $detailId > 0 ? fetch_vendor_verification($db, $detailId, $verificationContext, $requestId) : null;
        if (!$record) {
            http_response_code(404);
            echo json_encode([
                'success' => false,
                'message' => 'Verification request not found.',
                'meta' => [
                    'trackingAvailable' => $verificationContext['trackingAvailable'],
                    'requestTracking' => $verificationContext['requestTracking'] ?? false,
                ],
            ]);
            exit;
        }

        echo json_encode([
            'success' => true,
            'data' => $record,
            'meta' => [
                'trackingAvailable' => $verificationContext['trackingAvailable'],
                'requestTracking' => $verificationContext['requestTracking'] ?? false,
            ],
        ]);
        exit;
    }

    $records = fetch_all_vendor_verifications($db, $verificationContext);

    echo json_encode([
        'success' => true,
        'data' => $records,
        'meta' => [
            'trackingAvailable' => $verificationContext['trackingAvailable'],
            'requestTracking' => $verificationContext['requestTracking'] ?? false,
        ],
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
    $requestId = isset($payload['request_id']) ? (int) $payload['request_id'] : 0;

    if ($id <= 0 || !in_array($action, ['approve', 'reject'], true)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Invalid verification request or action.']);
        exit;
    }

    if (!$verificationContext['trackingAvailable']) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Verification tracking is not configured for this account.']);
        exit;
    }

    $statusColumn = $verificationContext['statusColumn'];
    $requestTrackingEnabled = $verificationContext['requestTracking'] ?? false;

    if (!$statusColumn && !$requestTrackingEnabled) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Verification tracking is not configured for this account.']);
        exit;
    }

    $existing = fetch_vendor_verification($db, $id, $verificationContext, $requestId > 0 ? $requestId : null);
    if (!$existing) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Verification request not found.']);
        exit;
    }

    $requestRow = $requestTrackingEnabled ? fetch_verification_request_by_vendor($db, $id, $requestId > 0 ? $requestId : null) : null;
    if ($requestRow) {
        $requestId = (int) ($requestRow['request_id'] ?? $requestRow['id'] ?? 0);
    } else {
        $requestId = 0;
    }
    $requestColumns = $requestTrackingEnabled ? vendor_verifications_table_columns($db) : [];

    if (!$statusColumn && !$requestRow) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Verification request data is unavailable for this vendor.']);
        exit;
    }

    $newStatus = $action === 'approve' ? 'verified' : 'rejected';
    if ($action === 'reject' && $feedback === '') {
        $feedback = 'Verification rejected. Please review submitted documents.';
    }

    $setClauses = [];
    $types = '';
    $params = [];
    $vendorUpdated = false;
    $requestUpdated = false;

    if ($statusColumn) {
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
    }

    if ($statusColumn && $setClauses) {
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
        $vendorUpdated = true;
    }

    if ($requestRow && $requestId > 0) {
        $requestClauses = [];
        $requestTypes = '';
        $requestParams = [];

        if (in_array('status', $requestColumns, true)) {
            $requestClauses[] = '`status` = ?';
            $requestTypes .= 's';
            $requestParams[] = $newStatus;
        }

        if (in_array('feedback', $requestColumns, true)) {
            $requestClauses[] = '`feedback` = ?';
            $requestTypes .= 's';
            $requestParams[] = $feedback;
        }

        if (in_array('reviewed_at', $requestColumns, true)) {
            $requestClauses[] = '`reviewed_at` = NOW()';
        }

        if (in_array('updated_at', $requestColumns, true)) {
            $requestClauses[] = '`updated_at` = NOW()';
        }

        if (in_array('reviewer_id', $requestColumns, true)) {
            $requestClauses[] = '`reviewer_id` = ?';
            $requestTypes .= 'i';
            $requestParams[] = (int) $_SESSION['admin_id'];
        }

        if ($requestClauses) {
            $requestSql = sprintf('UPDATE `vendor_verifications` SET %s WHERE id = ? LIMIT 1', implode(', ', $requestClauses));
            $requestStmt = $db->prepare($requestSql);
            if ($requestStmt !== false) {
                $requestTypes .= 'i';
                $requestParams[] = $requestId;

                $requestBind = [$requestTypes];
                foreach ($requestParams as $index => $value) {
                    $requestBind[] = &$requestParams[$index];
                }

                call_user_func_array([$requestStmt, 'bind_param'], $requestBind);
                $requestStmt->execute();
                $requestStmt->close();
                $requestUpdated = true;
            }
        }
    }

    if (!$vendorUpdated && !$requestUpdated) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Unable to update verification.']);
        exit;
    }

    $updated = fetch_vendor_verification($db, $id, $verificationContext, $requestId > 0 ? $requestId : null);

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

        header.topbar {
            position: sticky;
            top: 0;
            z-index: 60;
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0.6rem clamp(1rem, 3vw, 1.85rem);
            background: linear-gradient(135deg, rgba(0, 77, 64, 0.95), rgba(0, 77, 64, 0.88));
            color: var(--white);
            box-shadow: 0 10px 24px rgba(0, 0, 0, 0.18);
            backdrop-filter: blur(12px);
        }

        .topbar-left {
            display: flex;
            align-items: center;
            gap: 0.8rem;
        }

        .icon-btn {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            border: 1px solid rgba(255, 255, 255, 0.22);
            background: rgba(255, 255, 255, 0.14);
            color: var(--white);
            display: inline-flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: transform 0.2s ease, background 0.2s ease;
        }

        .icon-btn:hover,
        .icon-btn:focus-visible {
            transform: translateY(-1px);
            background: rgba(255, 255, 255, 0.24);
        }

        .brand {
            display: inline-flex;
            align-items: center;
            gap: 0.55rem;
            font-size: clamp(1.1rem, 3vw, 1.55rem);
        }

        .brand span {
            font-family: 'Anton', sans-serif;
            letter-spacing: 0.09em;
        }

        .logo-img {
            width: 34px;
            height: 34px;
            border-radius: 11px;
            object-fit: cover;
            box-shadow: 0 4px 11px rgba(0, 0, 0, 0.18);
        }

        .top-actions {
            display: flex;
            align-items: center;
            gap: 0.65rem;
        }

        main {
            width: min(1200px, calc(100% - clamp(2rem, 6vw, 4.5rem)));
            margin: clamp(1.8rem, 4vw, 2.8rem) auto clamp(3rem, 5vw, 4.5rem);
            display: grid;
            gap: clamp(1.6rem, 3vw, 2.4rem);
        }

        .page-heading {
            display: grid;
            gap: 0.45rem;
        }

        .page-heading h1 {
            font-family: 'Anton', sans-serif;
            font-size: clamp(1.9rem, 4.5vw, 2.6rem);
            letter-spacing: 0.06em;
            color: var(--emerald);
        }

        .page-heading p {
            color: rgba(17, 17, 17, 0.64);
            max-width: 640px;
            font-size: 0.98rem;
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

        .section-header h1,
        .section-header h2 {
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

        .btn:disabled { opacity: 0.55; cursor: not-allowed; transform: none; pointer-events: none; }

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

        .detail-overlay {
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.35);
            display: none;
            align-items: flex-start;
            justify-content: center;
            overflow-y: auto;
            z-index: 60;
            padding: clamp(1.2rem, 4vw, 2rem);
        }

        .detail-overlay.active { display: flex; }

        .detail-container {
            background: rgba(255, 255, 255, 0.97);
            border-radius: 20px;
            margin: 0 auto;
            max-width: min(1040px, 96vw);
            box-shadow: 0 28px 65px rgba(17, 17, 17, 0.18);
            padding: clamp(1.5rem, 4vw, 2.2rem);
            display: grid;
            gap: 1.4rem;
        }

        .detail-top {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 1rem;
        }

        .detail-back {
            display: inline-flex;
            align-items: center;
            gap: 0.45rem;
            border: none;
            background: rgba(0, 77, 64, 0.14);
            color: var(--emerald);
            padding: 0.45rem 0.95rem;
            border-radius: 999px;
            font-weight: 600;
            cursor: pointer;
            transition: background 0.2s ease, transform 0.2s ease;
        }

        .detail-back:hover,
        .detail-back:focus-visible {
            background: rgba(0, 77, 64, 0.22);
            transform: translateX(-1px);
        }

        .detail-status {
            align-self: flex-start;
            font-weight: 600;
            color: rgba(17, 17, 17, 0.65);
        }

        .detail-summary h2 {
            margin-bottom: 0.4rem;
            font-size: clamp(1.55rem, 3.5vw, 2rem);
            color: var(--emerald);
        }

        .detail-meta {
            display: grid;
            gap: 0.4rem;
            color: rgba(17, 17, 17, 0.7);
            font-size: 0.96rem;
        }

        .detail-meta span {
            display: inline-flex;
            align-items: center;
            gap: 0.45rem;
        }

        .detail-files {
            display: grid;
            gap: 1rem;
        }

        .detail-section-title {
            font-weight: 700;
            color: var(--emerald);
            text-transform: uppercase;
            font-size: 0.9rem;
            letter-spacing: 0.08em;
        }

        .detail-files-grid {
            display: grid;
            gap: 1rem;
            grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
        }

        .detail-file {
            background: rgba(0, 77, 64, 0.06);
            border-radius: 16px;
            padding: 0.85rem;
        }

        .detail-file img,
        .detail-file iframe,
        .detail-file embed {
            width: 100%;
            border-radius: 12px;
            display: block;
            object-fit: contain;
            max-height: 540px;
            background: #0f0f0f;
        }

        .detail-file a {
            display: inline-flex;
            align-items: center;
            gap: 0.35rem;
            color: var(--emerald);
            font-weight: 600;
            margin-top: 0.5rem;
        }

        .detail-notes {
            display: grid;
            gap: 0.6rem;
        }

        .detail-notes textarea {
            width: 100%;
            min-height: 120px;
            border-radius: 14px;
            border: 1px solid rgba(0, 77, 64, 0.2);
            padding: 0.75rem;
            font-family: inherit;
            resize: vertical;
        }

        .detail-notes textarea.is-readonly {
            background: rgba(0, 0, 0, 0.04);
            color: rgba(17, 17, 17, 0.7);
            cursor: default;
        }

        .detail-grid {
            display: grid;
            gap: clamp(1.2rem, 3vw, 1.6rem);
            grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
        }

        .detail-card {
            background: rgba(255, 255, 255, 0.82);
            border-radius: 18px;
            padding: 0.9rem 1rem;
            box-shadow: 0 12px 26px rgba(17, 17, 17, 0.08);
            display: grid;
            gap: 0.35rem;
        }

        .detail-card label {
            font-size: 0.78rem;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            color: rgba(17, 17, 17, 0.45);
        }

        .detail-card strong { color: rgba(17, 17, 17, 0.85); }

        .detail-actions-row {
            display: flex;
            justify-content: flex-end;
            align-items: center;
            gap: 0.75rem;
        }

        .detail-actions-row .btn {
            min-width: 140px;
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

    </style>
</head>
<body>
    <header class="topbar">
        <div class="topbar-left">
            <button class="icon-btn" id="backButton" aria-label="Back to dashboard"><i class="ri-arrow-left-line"></i></button>
            <div class="brand">
                <img src="logo.jpeg" alt="YUSTAM logo" class="logo-img">
                <span>YUSTAM Admin</span>
            </div>
        </div>
        <div class="top-actions">
            <button class="icon-btn" id="logoutBtn" aria-label="Sign out"><i class="ri-logout-box-r-line"></i></button>
        </div>
    </header>

    <main>
        <div class="page-heading">
            <h1>Vendor Verification Requests</h1>
            <p>Review submitted documents, provide feedback, and approve or reject verification attempts from vendors.</p>
        </div>

        <section class="section-card">
            <div class="section-header">
                <h2>Verification Queue</h2>
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

    <section class="detail-overlay" id="detailView" aria-hidden="true" hidden>
        <div class="detail-container" role="dialog" aria-labelledby="detailTitle">
            <div class="detail-top">
                <button class="detail-back" id="detailBack"><i class="ri-arrow-left-line"></i> Back to requests</button>
                <span class="status-chip" id="detailStatus"></span>
            </div>
            <div class="detail-summary">
                <h2 id="detailTitle">Verification Request</h2>
                <div class="detail-meta" id="detailMeta"></div>
            </div>
            <div class="detail-grid" id="detailBody"></div>
            <div class="detail-files" id="detailFiles"></div>
            <div class="detail-notes">
                <label for="detailFeedback" style="font-weight:600; color:var(--emerald);">Feedback to vendor</label>
                <textarea id="detailFeedback" placeholder="Add optional notes for the vendor"></textarea>
            </div>
            <div class="detail-actions-row">
                <button class="btn btn-reject" id="detailReject"><i class="ri-close-circle-line"></i> Reject</button>
                <button class="btn btn-approve" id="detailApprove"><i class="ri-shield-check-line"></i> Approve</button>
            </div>
        </div>
    </section>

    <div class="toast" id="toast" role="status" aria-live="polite"></div>

    <footer>
        © 2025 YUSTAM Marketplace — <a href="contact.html" style="font-weight:600; color:inherit;">Support</a>
    </footer>

    <script src="theme-manager.js" defer></script>
    <script type="module" src="admin-verifications.js"></script>
</body>
</html>
