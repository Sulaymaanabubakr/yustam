<?php
require_once __DIR__ . '/admin-session.php';

header('Content-Type: application/json');

if (!admin_is_authenticated()) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'You must be signed in as an administrator.']);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Invalid request method.']);
    exit;
}

$listingId = isset($_POST['listingId']) ? trim((string) $_POST['listingId']) : '';
$action = isset($_POST['action']) ? strtolower(trim((string) $_POST['action'])) : '';
$reason = isset($_POST['reason']) ? trim((string) $_POST['reason']) : '';

if ($listingId === '' || !preg_match('/^[A-Za-z0-9_-]+$/', $listingId)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid listing identifier provided.']);
    exit;
}

if (!in_array($action, ['approve', 'reject', 'delete'], true)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Unsupported listing action requested.']);
    exit;
}

if ($action === 'reject' && $reason === '') {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Please include a feedback reason when rejecting.']);
    exit;
}

require_once __DIR__ . '/firebase-support.php';
require_once __DIR__ . '/db.php';

$db = null;
$listingsTable = null;
$listingsColumns = [];

$initializeListingsContext = static function () use (&$db, &$listingsTable, &$listingsColumns): void {
    if ($db instanceof mysqli) {
        return;
    }

    $db = get_db_connection();
    yustam_listings_ensure_table($db);
    $listingsTable = yustam_listings_table_name();

    try {
        $columnsResult = $db->query('SHOW COLUMNS FROM `' . $listingsTable . '`');
        if ($columnsResult instanceof mysqli_result) {
            while ($col = $columnsResult->fetch_assoc()) {
                if (isset($col['Field'])) {
                    $listingsColumns[] = $col['Field'];
                }
            }
            $columnsResult->free();
        }
    } catch (Throwable $exception) {
        error_log('admin-listing-action column introspection failed: ' . $exception->getMessage());
        $listingsColumns = [];
    }
};

$listingsHasColumn = static function (string $name) use (&$listingsColumns): bool {
    return in_array($name, $listingsColumns, true);
};

$updateListingStatus = static function (string $listingId, string $status) use (&$initializeListingsContext, &$db, &$listingsTable, $listingsHasColumn): void {
    $initializeListingsContext();
    if (!$db instanceof mysqli || !$listingsTable) {
        return;
    }

    $matchClauses = [];
    $types = '';
    $params = [];

    if ($listingsHasColumn('firestore_id')) {
        $matchClauses[] = '`firestore_id` = ?';
        $types .= 's';
        $params[] = $listingId;
    }
    if ($listingsHasColumn('public_id')) {
        $matchClauses[] = '`public_id` = ?';
        $types .= 's';
        $params[] = $listingId;
    }
    if ($listingsHasColumn('id') && ctype_digit($listingId)) {
        $matchClauses[] = '`id` = ?';
        $types .= 'i';
        $params[] = (int)$listingId;
    }

    if (!$matchClauses) {
        return;
    }

    $setParts = [];
    $setTypes = '';
    $setParams = [];

    if ($listingsHasColumn('status')) {
        $setParts[] = '`status` = ?';
        $setTypes .= 's';
        $setParams[] = $status;
    }
    if ($listingsHasColumn('updated_at')) {
        $setParts[] = '`updated_at` = NOW()';
    }

    if (!$setParts) {
        return;
    }

    $sql = sprintf(
        'UPDATE `%s` SET %s WHERE %s LIMIT 1',
        $listingsTable,
        implode(', ', $setParts),
        implode(' OR ', $matchClauses)
    );

    $stmt = $db->prepare($sql);
    if (!$stmt) {
        error_log('admin-listing-action status update prepare failed: ' . $db->error);
        return;
    }

    $signature = $setTypes . $types;
    $values = array_merge($setParams, $params);
    if ($signature !== '') {
        $stmt->bind_param($signature, ...$values);
    }

    try {
        $stmt->execute();
    } catch (Throwable $exception) {
        error_log('admin-listing-action status update failed: ' . $exception->getMessage());
    }

    $stmt->close();
};

$deleteListingRow = static function (string $listingId) use (&$initializeListingsContext, &$db, &$listingsTable, $listingsHasColumn): void {
    $initializeListingsContext();
    if (!$db instanceof mysqli || !$listingsTable) {
        return;
    }

    $matchClauses = [];
    $types = '';
    $params = [];

    if ($listingsHasColumn('firestore_id')) {
        $matchClauses[] = '`firestore_id` = ?';
        $types .= 's';
        $params[] = $listingId;
    }
    if ($listingsHasColumn('public_id')) {
        $matchClauses[] = '`public_id` = ?';
        $types .= 's';
        $params[] = $listingId;
    }
    if ($listingsHasColumn('id') && ctype_digit($listingId)) {
        $matchClauses[] = '`id` = ?';
        $types .= 'i';
        $params[] = (int)$listingId;
    }

    if (!$matchClauses) {
        return;
    }

    $sql = sprintf(
        'DELETE FROM `%s` WHERE %s LIMIT 1',
        $listingsTable,
        implode(' OR ', $matchClauses)
    );

    $stmt = $db->prepare($sql);
    if (!$stmt) {
        error_log('admin-listing-action delete prepare failed: ' . $db->error);
        return;
    }

    $stmt->bind_param($types, ...$params);

    try {
        $stmt->execute();
    } catch (Throwable $exception) {
        error_log('admin-listing-action delete failed: ' . $exception->getMessage());
    }

    $stmt->close();
};

try {
    $projectId = yustam_firebase_project_id();
    $accessToken = yustam_firebase_access_token(['https://www.googleapis.com/auth/datastore']);
    $documentBase = sprintf(
        'https://firestore.googleapis.com/v1/projects/%s/databases/(default)/documents/listings/%s',
        rawurlencode($projectId),
        rawurlencode($listingId)
    );

    $authHeader = ['Authorization: Bearer ' . $accessToken];

    // Retrieve the existing document so we can enrich notifications.
    $documentResponse = yustam_firebase_http_json('GET', $documentBase, null, $authHeader);
    if (($documentResponse['status'] ?? 0) !== 200) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Listing could not be found.']);
        exit;
    }

    $documentBody = json_decode($documentResponse['body'], true);
    $documentFields = is_array($documentBody['fields'] ?? null) ? $documentBody['fields'] : [];

    $now = gmdate('Y-m-d\\TH:i:s\\Z');

    if ($action === 'delete') {
        $deleteResponse = yustam_firebase_http_request('DELETE', $documentBase, $authHeader);
        if (($deleteResponse['status'] ?? 0) < 200 || ($deleteResponse['status'] ?? 0) >= 300) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Failed to delete the listing.']);
            exit;
        }

        $deleteListingRow($listingId);

        echo json_encode(['success' => true, 'message' => 'Listing deleted successfully.']);
        exit;
    }

    $fields = [
        'status' => ['stringValue' => $action === 'approve' ? 'approved' : 'rejected'],
        'reviewedAt' => ['timestampValue' => $now],
    ];
    $updateMask = ['status', 'reviewedAt'];

    if ($action === 'approve') {
        $fields['approvedAt'] = ['timestampValue' => $now];
        $updateMask[] = 'approvedAt';
    }

    if ($action === 'reject') {
        $fields['feedback'] = [
            'mapValue' => [
                'fields' => [
                    'reason' => ['stringValue' => mb_substr($reason, 0, 500)],
                    'updatedAt' => ['timestampValue' => $now],
                ],
            ],
        ];
        $updateMask[] = 'feedback';
    }

    $queryParts = ['currentDocument.exists=true'];
    foreach ($updateMask as $fieldPath) {
        $queryParts[] = 'updateMask.fieldPaths=' . rawurlencode($fieldPath);
    }
    $query = implode('&', $queryParts);

    $patchResponse = yustam_firebase_http_json(
        'PATCH',
        $documentBase . '?' . $query,
        ['fields' => $fields],
        $authHeader
    );

    if (($patchResponse['status'] ?? 0) < 200 || ($patchResponse['status'] ?? 0) >= 300) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Unable to update the listing status.']);
        exit;
    }

    if ($action === 'approve') {
        $updateListingStatus($listingId, 'approved');
    } elseif ($action === 'reject') {
        $updateListingStatus($listingId, 'rejected');
    }

    if ($action === 'reject') {
        $vendorIdField = $documentFields['vendorID']['stringValue'] ?? $documentFields['vendorId']['stringValue'] ?? '';
        $vendorUidField = $documentFields['vendorUid']['stringValue'] ?? $documentFields['vendorFirebaseUid']['stringValue'] ?? '';
        $targetVendor = $vendorIdField !== '' ? $vendorIdField : $vendorUidField;

        if ($targetVendor !== '') {
            $notificationPayload = [
                'fields' => [
                    'type' => ['stringValue' => 'listing_rejected'],
                    'listingId' => ['stringValue' => $listingId],
                    'vendorId' => ['stringValue' => $targetVendor],
                    'message' => ['stringValue' => mb_substr($reason, 0, 500)],
                    'createdAt' => ['timestampValue' => $now],
                    'read' => ['booleanValue' => false],
                ],
            ];

            $notificationUrl = sprintf(
                'https://firestore.googleapis.com/v1/projects/%s/databases/(default)/documents/notifications',
                rawurlencode($projectId)
            );

            yustam_firebase_http_json('POST', $notificationUrl, $notificationPayload, $authHeader);
        }
    }

    echo json_encode([
        'success' => true,
        'message' => $action === 'approve'
            ? 'Listing approved successfully.'
            : 'Listing rejected successfully.',
        'status' => $fields['status']['stringValue'],
    ]);
} catch (Throwable $exception) {
    error_log('Admin listing action failed: ' . $exception->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Unexpected error while processing the request.']);
}
