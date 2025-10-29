<?php
require_once __DIR__ . '/session-path.php';
session_start();

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed.']);
    exit;
}

if (!isset($_SESSION['vendor_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Please sign in to continue.']);
    exit;
}

$rawInput = file_get_contents('php://input');
$payload = json_decode($rawInput, true);
if (!is_array($payload)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid request payload.']);
    exit;
}

$listingId = trim((string)($payload['listingId'] ?? ''));
if ($listingId === '') {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Listing identifier is required.']);
    exit;
}

$title = trim((string)($payload['title'] ?? ''));
if ($title === '') {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Please provide a title for the listing.']);
    exit;
}

$description = trim((string)($payload['description'] ?? ''));
$statusRaw = strtolower(trim((string)($payload['status'] ?? 'pending')));
$allowedStatuses = ['approved', 'pending', 'draft', 'unlisted', 'sold', 'archived'];
if (!in_array($statusRaw, $allowedStatuses, true)) {
    $statusRaw = 'pending';
}

$priceInput = trim((string)($payload['price'] ?? ''));
$priceValue = null;
if ($priceInput !== '') {
    $normalized = preg_replace('/[^0-9.\-]/', '', $priceInput);
    if ($normalized !== '' && is_numeric($normalized)) {
        $priceValue = round((float)$normalized, 2);
    }
}

require_once __DIR__ . '/db.php';

$conn = get_db_connection();
yustam_listings_ensure_table($conn);

$vendorId = (int)$_SESSION['vendor_id'];
$vendorRecord = yustam_vendor_find_by_id($vendorId, $conn);
if (!$vendorRecord) {
    http_response_code(404);
    echo json_encode(['success' => false, 'message' => 'Vendor account not found.']);
    exit;
}

$vendorUid = yustam_vendor_assign_uid_if_missing($conn, $vendorRecord);
$_SESSION['vendor_uid'] = $vendorUid;

$table = yustam_listings_table_name();
$columns = [];
try {
    $columnResult = $conn->query('SHOW COLUMNS FROM `' . $table . '`');
    if ($columnResult instanceof mysqli_result) {
        while ($col = $columnResult->fetch_assoc()) {
            if (isset($col['Field'])) {
                $columns[] = $col['Field'];
            }
        }
        $columnResult->free();
    }
} catch (Throwable $exception) {
    error_log('Listing update column introspection failed: ' . $exception->getMessage());
}

$hasColumn = static function (string $name) use ($columns): bool {
    return in_array($name, $columns, true);
};

$selectFields = [];
foreach (['id', 'firestore_id', 'public_id', 'title', 'description', 'price', 'status', 'views', 'created_at', 'updated_at'] as $field) {
    if ($hasColumn($field)) {
        $selectFields[] = sprintf('`%s`', $field);
    }
}
if ($hasColumn('primary_image')) {
    $selectFields[] = '`primary_image`';
}
if ($hasColumn('primaryImage')) {
    $selectFields[] = '`primaryImage`';
}
if ($hasColumn('image_urls')) {
    $selectFields[] = '`image_urls`';
}
if ($hasColumn('imageUrls')) {
    $selectFields[] = '`imageUrls`';
}
foreach (['category', 'subcategory', 'location', 'city', 'state', 'country'] as $geoField) {
    if ($hasColumn($geoField)) {
        $selectFields[] = sprintf('`%s`', $geoField);
    }
}
if (!$selectFields) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Listings table is missing required columns.']);
    exit;
}

$ownershipClauses = [];
$ownershipTypes = '';
$ownershipParams = [];
if ($hasColumn('vendor_id')) {
    $ownershipClauses[] = '`vendor_id` = ?';
    $ownershipTypes .= 'i';
    $ownershipParams[] = $vendorId;
}
if ($vendorUid !== '' && $hasColumn('vendor_uid')) {
    $ownershipClauses[] = '`vendor_uid` = ?';
    $ownershipTypes .= 's';
    $ownershipParams[] = $vendorUid;
}
if ($vendorUid !== '' && $hasColumn('vendorUid')) {
    $ownershipClauses[] = '`vendorUid` = ?';
    $ownershipTypes .= 's';
    $ownershipParams[] = $vendorUid;
}
if (!$ownershipClauses) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Unable to verify listing ownership.']);
    exit;
}

$identifierClauses = [];
$identifierTypes = '';
$identifierParams = [];
if ($hasColumn('firestore_id')) {
    $identifierClauses[] = '`firestore_id` = ?';
    $identifierTypes .= 's';
    $identifierParams[] = $listingId;
}
if ($hasColumn('public_id')) {
    $identifierClauses[] = '`public_id` = ?';
    $identifierTypes .= 's';
    $identifierParams[] = $listingId;
}
if ($hasColumn('id') && ctype_digit($listingId)) {
    $identifierClauses[] = '`id` = ?';
    $identifierTypes .= 'i';
    $identifierParams[] = (int)$listingId;
}
if (!$identifierClauses) {
    http_response_code(404);
    echo json_encode(['success' => false, 'message' => 'Listing could not be located.']);
    exit;
}

$selectSql = sprintf(
    'SELECT %s FROM `%s` WHERE (%s) AND (%s) LIMIT 1',
    implode(', ', array_unique($selectFields)),
    $table,
    implode(' OR ', $ownershipClauses),
    implode(' OR ', $identifierClauses)
);

$selectStmt = $conn->prepare($selectSql);
if (!$selectStmt) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Failed to prepare listing query.']);
    exit;
}

$bindSignature = $ownershipTypes . $identifierTypes;
$bindValues = array_merge($ownershipParams, $identifierParams);
$selectStmt->bind_param($bindSignature, ...$bindValues);
$selectStmt->execute();
$result = $selectStmt->get_result();
$listingRow = $result ? $result->fetch_assoc() : null;
$selectStmt->close();

if (!$listingRow) {
    http_response_code(404);
    echo json_encode(['success' => false, 'message' => 'Listing not found.']);
    exit;
}

$updateParts = [];
$updateTypes = '';
$updateParams = [];

if ($hasColumn('title')) {
    $updateParts[] = '`title` = ?';
    $updateTypes .= 's';
    $updateParams[] = $title;
}
if ($hasColumn('description')) {
    $updateParts[] = '`description` = ?';
    $updateTypes .= 's';
    $updateParams[] = $description;
}
if ($hasColumn('status')) {
    $updateParts[] = '`status` = ?';
    $updateTypes .= 's';
    $updateParams[] = $statusRaw;
}
if ($hasColumn('price')) {
    if ($priceValue === null) {
        $updateParts[] = '`price` = NULL';
    } else {
        $updateParts[] = '`price` = ?';
        $updateTypes .= 'd';
        $updateParams[] = $priceValue;
    }
}
if ($hasColumn('updated_at')) {
    $updateParts[] = '`updated_at` = NOW()';
}

if (!$updateParts) {
    echo json_encode(['success' => true, 'listing' => []]);
    exit;
}

$whereParts = [];
$whereTypes = '';
$whereParams = [];
if ($hasColumn('id') && isset($listingRow['id'])) {
    $whereParts[] = '`id` = ?';
    $whereTypes .= 'i';
    $whereParams[] = (int)$listingRow['id'];
} elseif ($hasColumn('firestore_id') && isset($listingRow['firestore_id'])) {
    $whereParts[] = '`firestore_id` = ?';
    $whereTypes .= 's';
    $whereParams[] = (string)$listingRow['firestore_id'];
} elseif ($hasColumn('public_id') && isset($listingRow['public_id'])) {
    $whereParts[] = '`public_id` = ?';
    $whereTypes .= 's';
    $whereParams[] = (string)$listingRow['public_id'];
} else {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Unable to target listing for update.']);
    exit;
}

if ($hasColumn('vendor_id')) {
    $whereParts[] = '`vendor_id` = ?';
    $whereTypes .= 'i';
    $whereParams[] = $vendorId;
}

$updateSql = sprintf(
    'UPDATE `%s` SET %s WHERE %s',
    $table,
    implode(', ', $updateParts),
    implode(' AND ', $whereParts)
);

$updateStmt = $conn->prepare($updateSql);
if (!$updateStmt) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Failed to prepare update statement.']);
    exit;
}

$updateSignature = $updateTypes . $whereTypes;
$updateValues = array_merge($updateParams, $whereParams);
$updateStmt->bind_param($updateSignature, ...$updateValues);

if (!$updateStmt->execute()) {
    $updateStmt->close();
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Unable to update listing at this time.']);
    exit;
}
$updateStmt->close();

$identifierValue = '';
if (isset($listingRow['firestore_id']) && $listingRow['firestore_id'] !== '') {
    $identifierValue = (string)$listingRow['firestore_id'];
} elseif (isset($listingRow['public_id']) && $listingRow['public_id'] !== '') {
    $identifierValue = (string)$listingRow['public_id'];
} elseif (isset($listingRow['id'])) {
    $identifierValue = (string)$listingRow['id'];
} else {
    $identifierValue = $listingId;
}

$imageCandidates = [];
if ($hasColumn('primary_image') && isset($listingRow['primary_image']) && $listingRow['primary_image'] !== '') {
    $imageCandidates[] = trim((string)$listingRow['primary_image']);
}
if ($hasColumn('primaryImage') && isset($listingRow['primaryImage']) && $listingRow['primaryImage'] !== '') {
    $imageCandidates[] = trim((string)$listingRow['primaryImage']);
}

$gallery = [];
foreach (['image_urls', 'imageUrls'] as $galleryColumn) {
    if ($hasColumn($galleryColumn) && isset($listingRow[$galleryColumn]) && $listingRow[$galleryColumn] !== '') {
        $raw = (string)$listingRow[$galleryColumn];
        $decoded = json_decode($raw, true);
        if (is_array($decoded)) {
            foreach ($decoded as $value) {
                if (is_string($value) && trim($value) !== '') {
                    $gallery[] = trim($value);
                }
            }
        } else {
            $parts = preg_split('/[\r\n,]+/', $raw);
            if ($parts !== false) {
                foreach ($parts as $part) {
                    $trimmed = trim($part);
                    if ($trimmed !== '') {
                        $gallery[] = $trimmed;
                    }
                }
            }
        }
    }
}

$primaryImage = '';
if ($imageCandidates) {
    $primaryImage = $imageCandidates[0];
} elseif ($gallery) {
    $primaryImage = $gallery[0];
}

$listingRow['title'] = $title;
$listingRow['description'] = $description;
$listingRow['status'] = $statusRaw;
$listingRow['status_raw'] = $statusRaw;
$listingRow['price'] = $priceValue;
if ($hasColumn('updated_at')) {
    $listingRow['updated_at'] = date('Y-m-d H:i:s');
}

$firestoreSynced = false;
$firestoreDocumentId = '';
if (!empty($listingRow['firestore_id'])) {
    $firestoreDocumentId = (string)$listingRow['firestore_id'];
} elseif (!empty($listingRow['public_id'])) {
    $firestoreDocumentId = (string)$listingRow['public_id'];
}

if ($firestoreDocumentId !== '') {
    try {
        require_once __DIR__ . '/api/chat/firebase.php';

        $documentPath = yustam_firestore_document_path('listings', $firestoreDocumentId);

        $fields = [
            'title' => yustam_firestore_string($title),
            'listingTitle' => yustam_firestore_string($title),
            'productTitle' => yustam_firestore_string($title),
            'status' => yustam_firestore_string($statusRaw),
            'description' => yustam_firestore_string($description),
        ];

        if ($priceValue === null) {
            $fields['price'] = yustam_firestore_null();
            $fields['amount'] = yustam_firestore_null();
        } else {
            $fields['price'] = yustam_firestore_double((float)$priceValue);
            $fields['amount'] = yustam_firestore_double((float)$priceValue);
        }

        if ($primaryImage === '') {
            $fields['primaryImage'] = yustam_firestore_null();
            $fields['coverImage'] = yustam_firestore_null();
        } else {
            $fields['primaryImage'] = yustam_firestore_string($primaryImage);
            $fields['coverImage'] = yustam_firestore_string($primaryImage);
        }

        $galleryValues = array_values(array_filter($gallery, static fn($value) => is_string($value) && $value !== ''));
        $fields['imageUrls'] = [
            'arrayValue' => [
                'values' => array_map(static fn($value) => yustam_firestore_string($value), $galleryValues),
            ],
        ];
        $fields['images'] = [
            'arrayValue' => [
                'values' => array_map(static fn($value) => yustam_firestore_string($value), $galleryValues),
            ],
        ];

        $writes = [
            [
                'update' => [
                    'name' => $documentPath,
                    'fields' => $fields,
                ],
                'updateMask' => ['fieldPaths' => array_keys($fields)],
            ],
            [
                'transform' => [
                    'document' => $documentPath,
                    'fieldTransforms' => [
                        ['fieldPath' => 'updatedAt', 'setToServerValue' => 'REQUEST_TIME'],
                    ],
                ],
            ],
        ];

        yustam_firestore_commit($writes);
        $firestoreSynced = true;
    } catch (Throwable $firestoreException) {
        error_log('Listing update Firestore sync failed (' . $firestoreDocumentId . '): ' . $firestoreException->getMessage());
    }
}

$addedOn = '-';
if (isset($listingRow['created_at']) && $listingRow['created_at']) {
    $timestamp = strtotime((string)$listingRow['created_at']);
    if ($timestamp !== false) {
        $addedOn = date('j M Y', $timestamp);
    }
}

$listingResponse = [
    'id' => $identifierValue,
    'title' => $title,
    'description' => $description,
    'price' => $priceValue,
    'status' => $statusRaw,
    'status_raw' => $statusRaw,
    'category' => $listingRow['category'] ?? '',
    'subcategory' => $listingRow['subcategory'] ?? '',
    'location' => $listingRow['location'] ?? '',
    'city' => $listingRow['city'] ?? '',
    'state' => $listingRow['state'] ?? '',
    'country' => $listingRow['country'] ?? '',
    'views' => isset($listingRow['views']) ? (int)$listingRow['views'] : 0,
    'added_on' => $addedOn,
    'image' => $primaryImage,
    'images' => $gallery,
    'link' => 'product.php?id=' . urlencode($identifierValue),
];

echo json_encode([
    'success' => true,
    'listing' => $listingResponse,
    'firestore_synced' => $firestoreSynced,
], JSON_UNESCAPED_SLASHES);
