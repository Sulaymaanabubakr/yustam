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
    $payload = $_POST;
}

$listingId = isset($payload['listingId']) ? trim((string)$payload['listingId']) : '';
if ($listingId === '') {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Listing identifier is required.']);
    exit;
}

if (!preg_match('/^[A-Za-z0-9_-]{1,128}$/', $listingId)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid listing identifier provided.']);
    exit;
}

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/api/chat/firebase.php';

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
    error_log('Vendor listing delete column introspection failed: ' . $exception->getMessage());
}

$hasColumn = static function (string $name) use ($columns): bool {
    return in_array($name, $columns, true);
};

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
    echo json_encode(['success' => false, 'message' => 'Listing not found.']);
    exit;
}

$selectFields = [];
foreach ([
    'id',
    'vendor_id',
    'vendor_uid',
    'vendorUid',
    'firestore_id',
    'public_id',
    'title',
    'description',
    'price',
    'status',
    'primary_image',
    'primaryImage',
    'image_urls',
    'imageUrls',
    'category',
    'subcategory',
    'location',
    'city',
    'state',
    'country'
] as $field) {
    if ($hasColumn($field)) {
        $selectFields[] = sprintf('`%s`', $field);
    }
}
if (!$selectFields) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Listings table is missing required columns.']);
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
    echo json_encode(['success' => false, 'message' => 'Unable to prepare listing query.']);
    exit;
}
$selectSignature = $ownershipTypes . $identifierTypes;
$selectValues = array_merge($ownershipParams, $identifierParams);
$selectStmt->bind_param($selectSignature, ...$selectValues);
$selectStmt->execute();
$result = $selectStmt->get_result();
$listingRow = $result ? $result->fetch_assoc() : null;
$selectStmt->close();

$firestoreDocumentId = $listingId;
if ($listingRow) {
    if (!empty($listingRow['firestore_id'])) {
        $firestoreDocumentId = (string)$listingRow['firestore_id'];
    } elseif (!empty($listingRow['public_id'])) {
        $firestoreDocumentId = (string)$listingRow['public_id'];
    } elseif (!empty($listingRow['id'])) {
        $firestoreDocumentId = (string)$listingRow['id'];
    }
}

$dbDeleted = false;
if ($listingRow) {
    $deleteSql = sprintf(
        'DELETE FROM `%s` WHERE (%s) AND (%s) LIMIT 1',
        $table,
        implode(' OR ', $ownershipClauses),
        implode(' OR ', $identifierClauses)
    );
    $deleteStmt = $conn->prepare($deleteSql);
    if (!$deleteStmt) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Unable to prepare delete statement.']);
        exit;
    }
    $deleteSignature = $ownershipTypes . $identifierTypes;
    $deleteValues = array_merge($ownershipParams, $identifierParams);
    $deleteStmt->bind_param($deleteSignature, ...$deleteValues);
    $deleteStmt->execute();
    if ($deleteStmt->errno) {
        $error = $deleteStmt->error;
        $deleteStmt->close();
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Unable to delete listing from the database.']);
        error_log('Vendor listing delete database error: ' . $error);
        exit;
    }
    $dbDeleted = $deleteStmt->affected_rows > 0;
    $deleteStmt->close();
}

$documentPath = '';
if ($firestoreDocumentId !== '') {
    $documentPath = yustam_firestore_relative_path(
        yustam_firestore_document_path('listings', $firestoreDocumentId)
    );
}

$firestoreDeleted = false;

if ($documentPath !== '') {
    $documentSnapshot = null;
    if (!$listingRow) {
        try {
            $documentSnapshot = yustam_firestore_get_document($documentPath);
        } catch (Throwable $exception) {
            error_log('Vendor listing delete fetch failed: ' . $exception->getMessage());
            $documentSnapshot = null;
        }

        if ($documentSnapshot === null) {
            echo json_encode([
                'success' => true,
                'message' => 'Listing removed successfully.',
                'listingId' => $listingId,
                'deletedFrom' => [
                    'database' => $dbDeleted,
                    'firestore' => false,
                ],
            ], JSON_UNESCAPED_SLASHES);
            exit;
        }

        $decodedFields = [];
        if (isset($documentSnapshot['fields']) && is_array($documentSnapshot['fields'])) {
            foreach ($documentSnapshot['fields'] as $key => $value) {
                $decodedFields[$key] = yustam_firestore_decode($value);
            }
        }

        $docVendorUid = '';
        foreach (['vendorUid', 'vendorUID', 'vendorFirebaseUid', 'ownerUid'] as $key) {
            if (!empty($decodedFields[$key]) && is_string($decodedFields[$key])) {
                $docVendorUid = (string)$decodedFields[$key];
                break;
            }
        }

        $docVendorId = '';
        foreach (['vendorID', 'vendorId', 'vendor_id', 'ownerId'] as $key) {
            if (isset($decodedFields[$key]) && $decodedFields[$key] !== '') {
                $docVendorId = (string)$decodedFields[$key];
                break;
            }
        }

        $ownsDocument = false;
        if ($vendorUid !== '' && $docVendorUid !== '') {
            $ownsDocument = strcasecmp($vendorUid, $docVendorUid) === 0;
        }
        if (!$ownsDocument && $docVendorId !== '') {
            $ownsDocument = ((string)$vendorId === $docVendorId);
        }

        if (!$ownsDocument) {
            if ($dbDeleted && $listingRow) {
                try {
                    restore_vendor_listing_row($conn, $listingRow, $vendorUid, $vendorId);
                } catch (Throwable $restoreException) {
                    error_log('Vendor listing delete restore failed after ownership rejection: ' . $restoreException->getMessage());
                }
            }

            http_response_code(403);
            echo json_encode(['success' => false, 'message' => 'You do not have permission to delete this listing.']);
            exit;
        }
    }

    try {
        yustam_firestore_delete_document($documentPath);
        $firestoreDeleted = true;
    } catch (Throwable $exception) {
        error_log('Vendor listing delete Firestore error: ' . $exception->getMessage());
        if ($dbDeleted && $listingRow) {
            try {
                restore_vendor_listing_row($conn, $listingRow, $vendorUid, $vendorId);
            } catch (Throwable $restoreException) {
                error_log('Vendor listing delete restore failed: ' . $restoreException->getMessage());
            }
        }
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Unable to delete listing from Firestore. Please try again.']);
        exit;
    }
}

if (!$dbDeleted) {
    $deleteSql = sprintf(
        'DELETE FROM `%s` WHERE (%s) AND (%s) LIMIT 1',
        $table,
        implode(' OR ', $ownershipClauses),
        implode(' OR ', $identifierClauses)
    );
    $deleteStmt = $conn->prepare($deleteSql);
    if ($deleteStmt) {
        $deleteSignature = $ownershipTypes . $identifierTypes;
        $deleteValues = array_merge($ownershipParams, $identifierParams);
        $deleteStmt->bind_param($deleteSignature, ...$deleteValues);
        $deleteStmt->execute();
        $dbDeleted = $deleteStmt->affected_rows > 0;
        $deleteStmt->close();
    }
}

echo json_encode([
    'success' => true,
    'message' => 'Listing deleted successfully.',
    'listingId' => $listingId,
    'deletedFrom' => [
        'database' => $dbDeleted,
        'firestore' => $firestoreDeleted,
    ],
], JSON_UNESCAPED_SLASHES);

function restore_vendor_listing_row(mysqli $conn, array $row, string $fallbackVendorUid, int $fallbackVendorId): void
{
    $firestoreId = '';
    if (!empty($row['firestore_id'])) {
        $firestoreId = (string)$row['firestore_id'];
    } elseif (!empty($row['public_id'])) {
        $firestoreId = (string)$row['public_id'];
    } elseif (!empty($row['id'])) {
        $firestoreId = (string)$row['id'];
    }

    if ($firestoreId === '') {
        return;
    }

    $payload = [
        'firestore_id' => $firestoreId,
        'public_id' => isset($row['public_id']) ? (string)$row['public_id'] : null,
        'title' => isset($row['title']) ? (string)$row['title'] : 'Marketplace Listing',
        'description' => isset($row['description']) ? (string)$row['description'] : '',
        'status' => isset($row['status']) ? (string)$row['status'] : 'pending',
        'vendor_id' => isset($row['vendor_id']) ? (int)$row['vendor_id'] : $fallbackVendorId,
        'vendor_uid' => $fallbackVendorUid,
    ];

    if (!empty($row['vendor_uid'])) {
        $payload['vendor_uid'] = (string)$row['vendor_uid'];
    } elseif (!empty($row['vendorUid'])) {
        $payload['vendor_uid'] = (string)$row['vendorUid'];
    }

    if (isset($row['price']) && $row['price'] !== null && $row['price'] !== '') {
        $payload['price'] = (float)$row['price'];
    }

    if (!empty($row['primary_image'])) {
        $payload['primary_image'] = (string)$row['primary_image'];
    } elseif (!empty($row['primaryImage'])) {
        $payload['primary_image'] = (string)$row['primaryImage'];
    }

    if (!empty($row['image_urls'])) {
        $payload['image_urls'] = (string)$row['image_urls'];
    } elseif (!empty($row['imageUrls'])) {
        $payload['image_urls'] = (string)$row['imageUrls'];
    }

    foreach (['category', 'subcategory', 'location', 'city', 'state', 'country'] as $field) {
        if (isset($row[$field]) && $row[$field] !== null) {
            $payload[$field] = (string)$row[$field];
        }
    }

    yustam_listings_upsert($conn, $payload);
}
