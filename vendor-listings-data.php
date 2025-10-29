<?php
require_once __DIR__ . '/session-path.php';
session_start();

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed.']);
    exit;
}

if (!isset($_SESSION['vendor_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Please sign in to continue.']);
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

$page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
$page = max(1, $page);
$perPage = isset($_GET['perPage']) ? (int)$_GET['perPage'] : 12;
$perPage = max(3, min(50, $perPage));
$offset = ($page - 1) * $perPage;

$statusFilter = strtolower(trim((string)($_GET['status'] ?? '')));
if ($statusFilter === 'all') {
    $statusFilter = '';
}

$searchTerm = trim((string)($_GET['search'] ?? ''));
$sort = strtolower(trim((string)($_GET['sort'] ?? 'recent')));
if (!in_array($sort, ['recent', 'views', 'price_asc', 'price_desc'], true)) {
    $sort = 'recent';
}

$table = yustam_listings_table_name();

$columns = [];
try {
    $colResult = $conn->query('SHOW COLUMNS FROM `' . $table . '`');
    if ($colResult instanceof mysqli_result) {
        while ($col = $colResult->fetch_assoc()) {
            if (isset($col['Field'])) {
                $columns[] = $col['Field'];
            }
        }
        $colResult->free();
    }
} catch (Throwable $exception) {
    error_log('vendor-listings-data column scan failed: ' . $exception->getMessage());
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
    echo json_encode(['success' => false, 'message' => 'Unable to resolve vendor listings.']);
    exit;
}

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
    echo json_encode(['success' => false, 'message' => 'Listings columns missing.']);
    exit;
}

$whereClauses = ['(' . implode(' OR ', $ownershipClauses) . ')'];
$types = $ownershipTypes;
$params = $ownershipParams;

if ($statusFilter !== '' && $hasColumn('status')) {
    $whereClauses[] = '`status` = ?';
    $types .= 's';
    $params[] = $statusFilter;
}

if ($searchTerm !== '' && ($hasColumn('title') || $hasColumn('description'))) {
    $searchLike = '%' . $searchTerm . '%';
    $searchParts = [];
    if ($hasColumn('title')) {
        $searchParts[] = '`title` LIKE ?';
    }
    if ($hasColumn('description')) {
        $searchParts[] = '`description` LIKE ?';
    }
    if ($searchParts) {
        $whereClauses[] = '(' . implode(' OR ', $searchParts) . ')';
        $types .= str_repeat('s', count($searchParts));
        for ($i = 0; $i < count($searchParts); $i++) {
            $params[] = $searchLike;
        }
    }
}

$orderColumn = $hasColumn('created_at') ? '`created_at`' : ($hasColumn('id') ? '`id`' : '1');
$orderDirection = 'DESC';
switch ($sort) {
    case 'views':
        if ($hasColumn('views')) {
            $orderColumn = '`views`';
            $orderDirection = 'DESC';
        }
        break;
    case 'price_asc':
        if ($hasColumn('price')) {
            $orderColumn = '`price`';
            $orderDirection = 'ASC';
        }
        break;
    case 'price_desc':
        if ($hasColumn('price')) {
            $orderColumn = '`price`';
            $orderDirection = 'DESC';
        }
        break;
    default:
        $orderDirection = 'DESC';
        break;
}

$whereSql = implode(' AND ', $whereClauses);

$countSql = sprintf('SELECT COUNT(*) AS total FROM `%s` WHERE %s', $table, $whereSql);
$countStmt = $conn->prepare($countSql);
if (!$countStmt) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Failed to prepare count statement.']);
    exit;
}
$countStmt->bind_param($types, ...$params);
$countStmt->execute();
$countResult = $countStmt->get_result();
$totalRows = $countResult ? (int)($countResult->fetch_assoc()['total'] ?? 0) : 0;
$countStmt->close();

$listings = [];

if ($totalRows > 0) {
    $selectSql = sprintf(
        'SELECT %s FROM `%s` WHERE %s ORDER BY %s %s LIMIT ? OFFSET ?',
        implode(', ', array_unique($selectFields)),
        $table,
        $whereSql,
        $orderColumn,
        $orderDirection
    );

    $selectStmt = $conn->prepare($selectSql);
    if ($selectStmt) {
        $selectTypes = $types . 'ii';
        $selectParams = array_merge($params, [$perPage, $offset]);
        $selectStmt->bind_param($selectTypes, ...$selectParams);
        $selectStmt->execute();
        $result = $selectStmt->get_result();
        while ($row = $result->fetch_assoc()) {
            $listings[] = format_listing_row($row, $columns);
        }
        $selectStmt->close();
    }
}

$usedFallback = false;

if ($totalRows === 0 && !$listings) {
    $fireListings = vendor_listings_from_firestore($vendorUid, $statusFilter, $searchTerm);
    if ($fireListings) {
        $listings = $fireListings;
        $totalRows = count($fireListings);
        $usedFallback = true;
    }
}

$hasMore = !$usedFallback && ($offset + $perPage) < $totalRows;

echo json_encode(
    [
        'success' => true,
        'data' => [
            'listings' => $listings,
            'pagination' => [
                'page' => $page,
                'perPage' => $perPage,
                'total' => $totalRows,
                'hasMore' => $hasMore,
            ],
        ],
    ],
    JSON_UNESCAPED_SLASHES
);

function yustam_normalize_listing_status(string $status): string
{
    $trimmed = strtolower(trim($status));
    if ($trimmed === '') {
        return 'pending';
    }

    $canonical = str_replace(['_', '-'], ' ', $trimmed);
    $canonical = preg_replace('/\s+/', ' ', $canonical);

    $map = [
        'approved live' => 'approved',
        'approved' => 'approved',
        'live' => 'approved',
        'pending review' => 'pending',
        'pending' => 'pending',
        'awaiting approval' => 'pending',
        'draft' => 'draft',
        'unlisted' => 'unlisted',
        'temporarily unlisted' => 'unlisted',
        'sold' => 'sold',
        'sold out' => 'sold',
        'sold / out of stock' => 'sold',
        'archived' => 'archived',
        'inactive' => 'archived',
    ];

    if (isset($map[$canonical])) {
        return $map[$canonical];
    }

    foreach ($map as $key => $value) {
        if (strpos($canonical, $key) !== false) {
            return $value;
        }
    }

    return $trimmed;
}

function format_listing_row(array $row, array $columns): array
{
    $identifier = '';
    if (!empty($row['firestore_id'])) {
        $identifier = (string)$row['firestore_id'];
    } elseif (!empty($row['public_id'])) {
        $identifier = (string)$row['public_id'];
    } elseif (isset($row['id'])) {
        $identifier = (string)$row['id'];
    }

    $statusRaw = yustam_normalize_listing_status((string)($row['status'] ?? ''));

    $gallery = [];
    foreach (['image_urls', 'imageUrls'] as $column) {
        if (array_key_exists($column, $row) && $row[$column] !== null && $row[$column] !== '') {
            $raw = (string)$row[$column];
            $decoded = json_decode($raw, true);
            if (is_array($decoded)) {
                foreach ($decoded as $item) {
                    if (is_string($item) && trim($item) !== '') {
                        $gallery[] = trim($item);
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
    foreach (['primary_image', 'primaryImage'] as $column) {
        if (array_key_exists($column, $row) && $row[$column]) {
            $candidate = trim((string)$row[$column]);
            if ($candidate !== '') {
                $primaryImage = $candidate;
                break;
            }
        }
    }
    if ($primaryImage === '' && $gallery) {
        $primaryImage = $gallery[0];
    }

    $createdLabel = '-';
    if (!empty($row['created_at'])) {
        $timestamp = strtotime((string)$row['created_at']);
        if ($timestamp !== false) {
            $createdLabel = date('j M Y', $timestamp);
        }
    }

    $updatedLabel = '';
    if (!empty($row['updated_at'])) {
        $timestamp = strtotime((string)$row['updated_at']);
        if ($timestamp !== false) {
            $updatedLabel = date('j M Y H:i', $timestamp);
        }
    }

    $priceValue = null;
    if (isset($row['price']) && $row['price'] !== null && $row['price'] !== '') {
        $priceValue = (float)$row['price'];
    }

    return [
        'id' => $identifier,
        'title' => $row['title'] ?? 'Untitled',
        'description' => $row['description'] ?? '',
        'price' => $priceValue,
        'status' => $statusRaw,
        'status_raw' => $statusRaw,
        'category' => $row['category'] ?? '',
        'subcategory' => $row['subcategory'] ?? '',
        'location' => $row['location'] ?? '',
        'city' => $row['city'] ?? '',
        'state' => $row['state'] ?? '',
        'country' => $row['country'] ?? '',
        'views' => isset($row['views']) ? (int)$row['views'] : 0,
        'added_on' => $createdLabel,
        'updated_on' => $updatedLabel,
        'image' => $primaryImage,
        'images' => $gallery,
        'link' => $identifier !== '' ? 'product.php?id=' . urlencode($identifier) : '#',
    ];
}

function vendor_listings_from_firestore(string $vendorUid, string $statusFilter, string $searchTerm): array
{
    if ($vendorUid === '') {
        return [];
    }

    try {
        $query = [
            'from' => [
                ['collectionId' => 'listings'],
            ],
            'where' => [
                'fieldFilter' => [
                    'field' => ['fieldPath' => 'vendorUid'],
                    'op' => 'EQUAL',
                    'value' => yustam_firestore_string($vendorUid),
                ],
            ],
            'limit' => 200,
        ];

        $results = yustam_firestore_run_query($query);
    } catch (Throwable $exception) {
        error_log('Firestore listings fallback failed: ' . $exception->getMessage());
        return [];
    }

    $response = [];
    foreach ($results as $result) {
        if (!isset($result['document']['fields'])) {
            continue;
        }
        $fields = [];
        foreach ($result['document']['fields'] as $key => $value) {
            $fields[$key] = yustam_firestore_decode($value);
        }

        $docName = $result['document']['name'] ?? '';
        $identifier = $fields['id'] ?? ($docName !== '' ? basename($docName) : '');
        if ($identifier === '') {
            continue;
        }

        $statusRaw = yustam_normalize_listing_status((string)($fields['status'] ?? 'pending'));
        if ($statusFilter !== '' && $statusRaw !== $statusFilter) {
            continue;
        }

        $titleCandidates = [
            $fields['title'] ?? null,
            $fields['productName'] ?? null,
            $fields['listingTitle'] ?? null,
            $fields['name'] ?? null,
        ];
        $title = 'Untitled';
        foreach ($titleCandidates as $candidate) {
            if (is_string($candidate) && trim($candidate) !== '') {
                $title = trim($candidate);
                break;
            }
        }

        if ($searchTerm !== '' && stripos($title, $searchTerm) === false) {
            $descriptionText = (string)($fields['description'] ?? '');
            if (stripos($descriptionText, $searchTerm) === false) {
                continue;
            }
        }

        $priceValue = null;
        if (isset($fields['price'])) {
            $priceValue = (float)$fields['price'];
        } elseif (isset($fields['amount'])) {
            $priceValue = (float)$fields['amount'];
        }

        $gallery = [];
        if (isset($fields['imageUrls']) && is_array($fields['imageUrls'])) {
            foreach ($fields['imageUrls'] as $value) {
                if (is_string($value) && trim($value) !== '') {
                    $gallery[] = trim($value);
                }
            }
        }

        $primaryImage = '';
        if (!empty($fields['primaryImage']) && is_string($fields['primaryImage'])) {
            $primaryImage = trim($fields['primaryImage']);
        } elseif ($gallery) {
            $primaryImage = $gallery[0];
        }

        $createdLabel = '-';
        $createdValue = $fields['createdAt'] ?? ($fields['created_at'] ?? '');
        if (is_array($createdValue) && isset($createdValue['seconds'])) {
            $createdLabel = date('j M Y', (int)$createdValue['seconds']);
        } elseif (is_string($createdValue) && $createdValue !== '') {
            $timestamp = strtotime($createdValue);
            if ($timestamp !== false) {
                $createdLabel = date('j M Y', $timestamp);
            }
        }

        $descriptionText = (string)($fields['description'] ?? '');

        $response[] = [
            'id' => (string)$identifier,
            'title' => $title,
            'description' => $descriptionText,
            'price' => $priceValue,
            'status' => $statusRaw,
            'status_raw' => $statusRaw,
            'category' => (string)($fields['category'] ?? ''),
            'subcategory' => (string)($fields['subcategory'] ?? ''),
            'location' => (string)($fields['vendorLocation'] ?? ($fields['location'] ?? '')),
            'city' => (string)($fields['city'] ?? ''),
            'state' => (string)($fields['state'] ?? ''),
            'country' => (string)($fields['country'] ?? ''),
            'views' => isset($fields['views']) ? (int)$fields['views'] : 0,
            'added_on' => $createdLabel,
            'updated_on' => '',
            'image' => $primaryImage,
            'images' => $gallery,
            'link' => 'product.php?id=' . urlencode((string)$identifier),
        ];
    }

    return $response;
}
