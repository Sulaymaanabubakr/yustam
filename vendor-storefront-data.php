<?php
declare(strict_types=1);

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/firebase-support.php';

header('Content-Type: application/json');

/**
 * Format an error response and exit.
 *
 * @param int $code
 * @param string $message
 */
function yustam_storefront_error(int $code, string $message): void
{
    http_response_code($code);
    echo json_encode([
        'success' => false,
        'message' => $message,
    ], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}

$identifier = isset($_GET['id']) ? trim((string) $_GET['id']) : '';
if ($identifier === '' && isset($_GET['vendorId'])) {
    $identifier = trim((string) $_GET['vendorId']);
}

$identifier = $identifier !== '' ? preg_replace('/[^A-Za-z0-9_\-]/', '', $identifier) : '';

if ($identifier === '') {
    yustam_storefront_error(400, 'Vendor identifier missing.');
}

$cacheTtlSeconds = 20;
$cacheFile = null;
$cachePayload = null;
$cacheServed = false;
$refreshAfterServingCache = false;

try {
    $cacheDir = __DIR__ . '/data/cache';
    if (!is_dir($cacheDir)) {
        @mkdir($cacheDir, 0775, true);
    }
    if (is_dir($cacheDir) && is_writable($cacheDir)) {
        $cacheFile = $cacheDir . '/vendor-storefront-' . sha1($identifier) . '.json';
        if (is_file($cacheFile) && (time() - (int) filemtime($cacheFile) < $cacheTtlSeconds)) {
            $cachedRaw = file_get_contents($cacheFile);
            if ($cachedRaw !== false) {
                $cachePayload = json_decode($cachedRaw, true);
                if (is_array($cachePayload) && ($cachePayload['success'] ?? false)) {
                    echo json_encode($cachePayload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
                    exit;
                }
                $cachePayload = null;
            }
        } elseif (is_file($cacheFile)) {
            $cachedRaw = file_get_contents($cacheFile);
            if ($cachedRaw !== false) {
                $stalePayload = json_decode($cachedRaw, true);
                if (is_array($stalePayload) && ($stalePayload['success'] ?? false)) {
                    echo json_encode($stalePayload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
                    $cacheServed = true;
                    $refreshAfterServingCache = true;
                    if (function_exists('fastcgi_finish_request')) {
                        fastcgi_finish_request();
                    } else {
                        ignore_user_abort(true);
                        flush();
                    }
                }
            }
        }
    } else {
        $cacheFile = null;
    }
} catch (Throwable $cacheError) {
    $cacheFile = null;
}

/**
 * Attempt to locate a vendor record in MySQL.
 */
function yustam_storefront_lookup_sql_vendor(string $identifier): ?array
{
    $conn = get_db_connection();

    if (ctype_digit($identifier)) {
        $vendor = yustam_vendor_find_by_id((int) $identifier, $conn);
        if ($vendor) {
            return $vendor;
        }
    }

    $vendor = yustam_vendor_find_by_uid($identifier, $conn);
    if ($vendor) {
        return $vendor;
    }

    return null;
}

/**
 * Decode Firestore map fields into PHP primitives.
 *
 * @param array $value
 * @return mixed
 */
function yustam_storefront_firestore_decode_value(array $value)
{
    if (isset($value['stringValue'])) {
        return (string) $value['stringValue'];
    }
    if (isset($value['integerValue'])) {
        return (int) $value['integerValue'];
    }
    if (isset($value['doubleValue'])) {
        return (float) $value['doubleValue'];
    }
    if (isset($value['booleanValue'])) {
        return (bool) $value['booleanValue'];
    }
    if (isset($value['timestampValue'])) {
        return (string) $value['timestampValue'];
    }
    if (isset($value['mapValue']['fields'])) {
        return yustam_storefront_firestore_decode_fields($value['mapValue']['fields']);
    }
    if (isset($value['arrayValue']['values']) && is_array($value['arrayValue']['values'])) {
        return array_map('yustam_storefront_firestore_decode_value', $value['arrayValue']['values']);
    }
    if (array_key_exists('nullValue', $value)) {
        return null;
    }
    return $value;
}

/**
 * Decode Firestore fields payload.
 */
function yustam_storefront_firestore_decode_fields(array $fields): array
{
    $decoded = [];
    foreach ($fields as $key => $value) {
        $decoded[$key] = yustam_storefront_firestore_decode_value($value);
    }
    return $decoded;
}

/**
 * Perform a Firestore documents:runQuery call.
 */
function yustam_storefront_firestore_run_query(array $structuredQuery): array
{
    $query = isset($structuredQuery['structuredQuery']) ? $structuredQuery : ['structuredQuery' => $structuredQuery];
    $projectId = yustam_firebase_project_id();
    $endpoint = sprintf(
        'https://firestore.googleapis.com/v1/projects/%s/databases/(default)/documents:runQuery',
        rawurlencode($projectId)
    );

    $headers = [
        'Authorization: Bearer ' . yustam_firebase_access_token(['https://www.googleapis.com/auth/datastore']),
    ];

    $response = yustam_firebase_http_json('POST', $endpoint, $query, $headers);
    $status = (int) ($response['status'] ?? 0);
    if ($status < 200 || $status >= 300) {
        throw new RuntimeException('Firestore query failed: ' . ($response['body'] ?? ''));
    }

    $body = trim((string) ($response['body'] ?? ''));
    if ($body === '') {
        return [];
    }

    $lines = array_filter(array_map('trim', explode("\n", $body)));
    $results = [];

    if (count($lines) > 1) {
        foreach ($lines as $line) {
            $decoded = json_decode($line, true);
            if (is_array($decoded)) {
                $results[] = $decoded;
            }
        }
        return $results;
    }

    $decoded = json_decode($body, true);
    return is_array($decoded) ? $decoded : [];
}

/**
 * Retrieve a Firestore document from the vendors collection.
 */
function yustam_storefront_fetch_firestore_vendor(array $candidates): ?array
{
    if (!yustam_firebase_service_account_available()) {
        return null;
    }

    $projectId = yustam_firebase_project_id();
    $headers = [
        'Authorization: Bearer ' . yustam_firebase_access_token(['https://www.googleapis.com/auth/datastore']),
    ];

    foreach ($candidates as $candidate) {
        $candidate = trim((string) $candidate);
        if ($candidate === '') {
            continue;
        }

        $uri = sprintf(
            'https://firestore.googleapis.com/v1/projects/%s/databases/(default)/documents/vendors/%s',
            rawurlencode($projectId),
            rawurlencode($candidate)
        );
        $response = yustam_firebase_http_json('GET', $uri, null, $headers);
        $status = (int) ($response['status'] ?? 0);
        if ($status === 404) {
            continue;
        }
        if ($status < 200 || $status >= 300) {
            continue;
        }

        $payload = json_decode((string) ($response['body'] ?? '{}'), true);
        if (!is_array($payload) || empty($payload['fields'])) {
            continue;
        }

        $fields = yustam_storefront_firestore_decode_fields($payload['fields']);
        $fields['id'] = basename((string) ($payload['name'] ?? $candidate));
        $fields['createTime'] = $payload['createTime'] ?? null;
        $fields['updateTime'] = $payload['updateTime'] ?? null;
        return $fields;
    }

    return null;
}

/**
 * Helper for value coalesce.
 */
function yustam_storefront_first_non_empty(string ...$values): string
{
    foreach ($values as $value) {
        $trimmed = trim($value);
        if ($trimmed !== '') {
            return $trimmed;
        }
    }
    return '';
}

function yustam_storefront_plan_label(?string $plan): string
{
    $plan = trim((string) $plan);
    if ($plan === '') {
        return 'Free Plan';
    }
    return preg_match('/plan$/i', $plan) ? $plan : ($plan . ' Plan');
}

function yustam_storefront_plan_slug(?string $plan): string
{
    $plan = strtolower(trim((string) $plan));
    $plan = preg_replace('/plan$/', '', $plan);
    $plan = preg_replace('/[^a-z0-9]+/', '-', $plan);
    $plan = trim($plan, '-');
    return $plan !== '' ? $plan : 'free';
}

function yustam_storefront_normalise_verification($value): string
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
    if (in_array($value, ['pending', 'submitted', 'processing', 'under review', 'under_review', 'in_review', 'in-review'], true)) {
        return 'pending';
    }
    if (in_array($value, ['rejected', 'declined', 'failed', 'needs_changes', 'needs update', 'needs-update'], true)) {
        return 'rejected';
    }
    return 'unverified';
}

function yustam_storefront_verification_label(string $state): string
{
    switch ($state) {
        case 'verified':
            return 'Verified Vendor';
        case 'pending':
            return 'Pending Review';
        case 'rejected':
            return 'Needs Changes';
        default:
            return 'Not Verified';
    }
}

function yustam_storefront_parse_datetime($value): ?string
{
    if ($value instanceof DateTimeInterface) {
        return $value->format(DateTimeInterface::ATOM);
    }
    if (is_numeric($value)) {
        return date(DateTimeInterface::ATOM, (int) $value);
    }
    if (is_string($value) && trim($value) !== '') {
        $timestamp = strtotime($value);
        if ($timestamp !== false) {
            return date(DateTimeInterface::ATOM, $timestamp);
        }
    }
    return null;
}

/**
 * Retrieve listings table columns.
 *
 * @param mysqli $conn
 * @return array<int,string>
 */
function yustam_storefront_listings_table_columns(mysqli $conn): array
{
    static $columns = null;

    if (is_array($columns)) {
        return $columns;
    }

    $columns = [];
    try {
        $result = $conn->query('SHOW COLUMNS FROM `listings`');
        if ($result instanceof mysqli_result) {
            while ($row = $result->fetch_assoc()) {
                if (!empty($row['Field'])) {
                    $columns[] = $row['Field'];
                }
            }
            $result->free();
        }
    } catch (Throwable $exception) {
        error_log('Unable to inspect listings table columns: ' . $exception->getMessage());
    }

    return $columns;
}

function yustam_storefront_listings_table_has_column(mysqli $conn, string $column): bool
{
    return in_array($column, yustam_storefront_listings_table_columns($conn), true);
}

/**
 * Fetch listings for a vendor from MySQL.
 *
 * @param int $vendorId
 * @param int $limit
 * @return array<int,array<string,mixed>>
 */
function yustam_storefront_fetch_sql_listings(int $vendorId, int $limit = 36): array
{
    if ($vendorId <= 0) {
        return [];
    }

    try {
        $conn = get_db_connection();
        if (!yustam_storefront_listings_table_has_column($conn, 'vendor_id')) {
            return [];
        }

        $orderColumn = 'id';
        foreach (['updated_at', 'created_at', 'id'] as $candidate) {
            if (yustam_storefront_listings_table_has_column($conn, $candidate)) {
                $orderColumn = $candidate;
                break;
            }
        }

        $sql = sprintf('SELECT * FROM `listings` WHERE `vendor_id` = ? ORDER BY `%s` DESC LIMIT ?', $orderColumn);
        $stmt = $conn->prepare($sql);
        if (!$stmt) {
            throw new RuntimeException('Unable to prepare listings query: ' . $conn->error);
        }
        $stmt->bind_param('ii', $vendorId, $limit);
        $stmt->execute();
        $result = $stmt->get_result();
        $rows = [];
        if ($result instanceof mysqli_result) {
            while ($row = $result->fetch_assoc()) {
                if (is_array($row)) {
                    $rows[] = $row;
                }
            }
            $result->free();
        }
        $stmt->close();

        $listings = [];
        foreach ($rows as $row) {
            $priceValue = null;
            foreach (['price', 'amount', 'listing_price', 'selling_price'] as $priceColumn) {
                if (isset($row[$priceColumn]) && is_numeric($row[$priceColumn])) {
                    $priceValue = (float) $row[$priceColumn];
                    break;
                }
            }

            $imageValue = yustam_storefront_first_non_empty(
                (string) ($row['primary_image'] ?? ''),
                (string) ($row['main_image'] ?? ''),
                (string) ($row['image_url'] ?? ''),
                (string) ($row['image'] ?? ''),
                (string) ($row['thumbnail'] ?? '')
            );

            $categoryValue = yustam_storefront_first_non_empty(
                (string) ($row['category'] ?? ''),
                (string) ($row['category_name'] ?? '')
            );

            $subcategoryValue = yustam_storefront_first_non_empty(
                (string) ($row['subcategory'] ?? ''),
                (string) ($row['sub_category'] ?? '')
            );

            $locationValue = yustam_storefront_first_non_empty(
                (string) ($row['location'] ?? ''),
                trim((string) ($row['city'] ?? '') . ', ' . (string) ($row['state'] ?? ''))
            );

            $createdValue = $row['created_at'] ?? ($row['updated_at'] ?? null);
            $createdIso = yustam_storefront_parse_datetime($createdValue);

            $listings[] = [
                'id' => (string) ($row['public_id'] ?? $row['uid'] ?? $row['id'] ?? ''),
                'title' => yustam_storefront_first_non_empty(
                    (string) ($row['title'] ?? ''),
                    (string) ($row['name'] ?? ''),
                    (string) ($row['product_title'] ?? ''),
                    'Marketplace Listing'
                ),
                'price' => $priceValue,
                'category' => $categoryValue,
                'subcategory' => $subcategoryValue,
                'status' => (string) ($row['status'] ?? ($row['listing_status'] ?? '')),
                'image' => $imageValue,
                'location' => $locationValue,
                'createdAt' => $createdIso,
            ];
        }

        return $listings;
    } catch (Throwable $exception) {
        error_log('Unable to fetch SQL listings: ' . $exception->getMessage());
        return [];
    }
}

/**
 * Merge SQL and Firestore vendor records into a storefront-friendly payload.
 */
function yustam_storefront_merge_vendor(?array $sqlVendor, ?array $firestoreVendor): array
{
    $nameColumn = yustam_vendor_name_column();

    $planSource = $sqlVendor['plan'] ?? ($firestoreVendor['plan'] ?? ($firestoreVendor['planLabel'] ?? 'Free'));
    $planLabel = yustam_storefront_plan_label($planSource);
    $planSlug = yustam_storefront_plan_slug($planSource);

    $verificationSource = $sqlVendor['verification_status'] ?? $sqlVendor['verification_state']
        ?? $sqlVendor['kyc_status'] ?? $sqlVendor['verification_stage']
        ?? $firestoreVendor['verificationStatus'] ?? $firestoreVendor['verification_state']
        ?? $firestoreVendor['verificationStage'] ?? null;

    $verificationState = yustam_storefront_normalise_verification($verificationSource);
    $verificationLabel = yustam_storefront_verification_label($verificationState);

    $displayName = yustam_storefront_first_non_empty(
        (string) ($sqlVendor['display_name'] ?? ''),
        (string) ($sqlVendor['business_name'] ?? ''),
        (string) ($sqlVendor[$nameColumn] ?? ''),
        (string) ($firestoreVendor['displayName'] ?? ''),
        (string) ($firestoreVendor['businessName'] ?? ''),
        (string) ($firestoreVendor['name'] ?? '')
    );

    $businessName = yustam_storefront_first_non_empty(
        (string) ($sqlVendor['business_name'] ?? ''),
        (string) ($firestoreVendor['businessName'] ?? ''),
        $displayName
    );

    $location = yustam_storefront_first_non_empty(
        (string) ($sqlVendor['location'] ?? ''),
        (string) ($sqlVendor['address'] ?? ''),
        (string) ($firestoreVendor['location'] ?? ''),
        trim(((string) ($firestoreVendor['city'] ?? '')) . ', ' . ((string) ($firestoreVendor['state'] ?? '')))
    );

    $city = yustam_storefront_first_non_empty(
        (string) ($sqlVendor['city'] ?? ''),
        (string) ($firestoreVendor['city'] ?? '')
    );

    $state = yustam_storefront_first_non_empty(
        (string) ($sqlVendor['state'] ?? ''),
        (string) ($firestoreVendor['state'] ?? '')
    );

    $country = yustam_storefront_first_non_empty(
        (string) ($sqlVendor['country'] ?? ''),
        (string) ($firestoreVendor['country'] ?? ''),
        'Nigeria'
    );

    $profilePhoto = yustam_storefront_first_non_empty(
        (string) ($sqlVendor['profile_photo'] ?? ''),
        (string) ($sqlVendor['avatar_url'] ?? ''),
        (string) ($sqlVendor['logo_url'] ?? ''),
        (string) ($firestoreVendor['profilePhoto'] ?? ''),
        (string) ($firestoreVendor['logoUrl'] ?? ''),
        (string) ($firestoreVendor['avatarUrl'] ?? ''),
        (string) ($firestoreVendor['photoURL'] ?? '')
    );

    $about = yustam_storefront_first_non_empty(
        (string) ($sqlVendor['bio'] ?? ''),
        (string) ($sqlVendor['about'] ?? ''),
        (string) ($sqlVendor['description'] ?? ''),
        (string) ($firestoreVendor['bio'] ?? ''),
        (string) ($firestoreVendor['about'] ?? '')
    );

    $website = yustam_storefront_first_non_empty(
        (string) ($sqlVendor['website'] ?? ''),
        (string) ($sqlVendor['site_url'] ?? ''),
        (string) ($firestoreVendor['website'] ?? ''),
        (string) ($firestoreVendor['siteUrl'] ?? '')
    );

    $createdAt = yustam_storefront_parse_datetime(
        $sqlVendor['created_at'] ?? $sqlVendor['joined_at'] ?? $firestoreVendor['createTime'] ?? null
    );

    return [
        'id' => isset($sqlVendor['id']) ? (int) $sqlVendor['id'] : null,
        'vendorUid' => $sqlVendor['vendor_uid'] ?? ($firestoreVendor['vendorUid'] ?? ($firestoreVendor['id'] ?? null)),
        'firebaseUid' => $sqlVendor['firebase_uid'] ?? ($firestoreVendor['firebaseUid'] ?? null),
        'displayName' => $displayName !== '' ? $displayName : ($sqlVendor['vendor_uid'] ?? 'Vendor'),
        'businessName' => $businessName,
        'email' => $sqlVendor['email'] ?? ($firestoreVendor['email'] ?? ''),
        'phone' => $sqlVendor['phone'] ?? ($sqlVendor['phone_number'] ?? ($firestoreVendor['phone'] ?? '')),
        'whatsapp' => $sqlVendor['whatsapp'] ?? ($firestoreVendor['whatsapp'] ?? ''),
        'website' => $website,
        'instagram' => $sqlVendor['instagram'] ?? ($firestoreVendor['instagram'] ?? ''),
        'facebook' => $sqlVendor['facebook'] ?? ($firestoreVendor['facebook'] ?? ''),
        'twitter' => $sqlVendor['twitter'] ?? ($firestoreVendor['twitter'] ?? ($firestoreVendor['x'] ?? '')),
        'plan' => $planSource,
        'planLabel' => $planLabel,
        'planSlug' => $planSlug,
        'verificationState' => $verificationState,
        'verificationLabel' => $verificationLabel,
        'location' => $location,
        'city' => $city,
        'state' => $state,
        'country' => $country,
        'avatar' => $profilePhoto,
        'banner' => $sqlVendor['banner_image'] ?? ($firestoreVendor['bannerImage'] ?? ''),
        'about' => $about,
        'createdAt' => $createdAt,
        'firestore' => $firestoreVendor,
        'sql' => $sqlVendor,
    ];
}

/**
 * Convert Firestore listing document into storefront listing payload.
 */
function yustam_storefront_transform_listing(string $id, array $fields, array $meta = []): array
{
    $images = [];
    if (isset($fields['images']) && is_array($fields['images'])) {
        $images = array_values(array_filter($fields['images'], static fn($value) => is_string($value) && trim($value) !== ''));
    } elseif (isset($fields['imageUrls']) && is_array($fields['imageUrls'])) {
        $images = array_values(array_filter($fields['imageUrls'], static fn($value) => is_string($value) && trim($value) !== ''));
    }
    $image = $images[0] ?? ((is_string($fields['image'] ?? '') ? $fields['image'] : '') ?: '');

    $priceRaw = $fields['price'] ?? ($fields['amount'] ?? null);
    if (is_string($priceRaw) && is_numeric($priceRaw)) {
        $priceRaw = (float) $priceRaw;
    }

    $createdAt = $fields['createdAt'] ?? ($meta['createTime'] ?? null);
    if (is_array($createdAt) && isset($createdAt['seconds'])) {
        $createdAt = date(DateTimeInterface::ATOM, (int) $createdAt['seconds']);
    }

    if (is_string($createdAt)) {
        $parsed = strtotime($createdAt);
        $createdAt = $parsed ? date(DateTimeInterface::ATOM, $parsed) : $createdAt;
    } else {
        $createdAt = null;
    }

    return [
        'id' => $id,
        'title' => yustam_storefront_first_non_empty(
            (string) ($fields['title'] ?? ''),
            (string) ($fields['productTitle'] ?? ''),
            (string) ($fields['productName'] ?? ''),
            'Marketplace Listing'
        ),
        'price' => is_numeric($priceRaw) ? (float) $priceRaw : null,
        'category' => (string) ($fields['category'] ?? ''),
        'subcategory' => (string) ($fields['subcategory'] ?? ''),
        'status' => (string) ($fields['status'] ?? ''),
        'image' => $image,
        'location' => yustam_storefront_first_non_empty(
            (string) ($fields['location'] ?? ''),
            (string) ($fields['vendorLocation'] ?? ''),
            (string) ($fields['city'] ?? ''),
            (string) ($fields['state'] ?? '')
        ),
        'createdAt' => $createdAt,
    ];
}

/**
 * Fetch listings for the provided vendor identifiers.
 *
 * @param array $candidates
 * @param int $limit
 * @return array<int,array<string,mixed>>
 */
function yustam_storefront_fetch_listings(array $candidates, int $limit = 24): array
{
    if (!yustam_firebase_service_account_available()) {
        return [];
    }

    $listings = [];
    $seen = [];

    $baseFilterTemplate = static fn(string $field, string $value): array => [
        'from' => [
            ['collectionId' => 'listings'],
        ],
        'where' => [
            'fieldFilter' => [
                'field' => ['fieldPath' => $field],
                'op' => 'EQUAL',
                'value' => ['stringValue' => $value],
            ],
        ],
        'orderBy' => [
            [
                'field' => ['fieldPath' => 'createdAt'],
                'direction' => 'DESCENDING',
            ],
        ],
        'limit' => $limit,
    ];

    $candidateSet = [];
    foreach ($candidates as $candidate) {
        $candidate = trim((string) $candidate);
        if ($candidate !== '') {
            $candidateSet[$candidate] = true;
        }
    }

    foreach (array_keys($candidateSet) as $candidate) {
        try {
            $results = yustam_storefront_firestore_run_query($baseFilterTemplate('vendorUid', $candidate));
        } catch (Throwable $exception) {
            try {
                $fallbackQuery = $baseFilterTemplate('vendorUid', $candidate);
                unset($fallbackQuery['orderBy']);
                $results = yustam_storefront_firestore_run_query($fallbackQuery);
            } catch (Throwable $inner) {
                continue;
            }
        }

        foreach ($results as $result) {
            if (!isset($result['document']['name'], $result['document']['fields'])) {
                continue;
            }
            $documentName = (string) $result['document']['name'];
            $documentId = basename($documentName);
            if (isset($seen[$documentId])) {
                continue;
            }
            $fields = yustam_storefront_firestore_decode_fields($result['document']['fields']);
            $listings[] = yustam_storefront_transform_listing($documentId, $fields, $result['document']);
            $seen[$documentId] = true;
        }
    }

    usort($listings, static function (array $a, array $b): int {
        $aTime = isset($a['createdAt']) ? strtotime((string) $a['createdAt']) : 0;
        $bTime = isset($b['createdAt']) ? strtotime((string) $b['createdAt']) : 0;
        return $bTime <=> $aTime;
    });

    if (count($listings) > $limit) {
        $listings = array_slice($listings, 0, $limit);
    }

    return $listings;
}

try {
    $sqlVendor = yustam_storefront_lookup_sql_vendor($identifier);

    $firestoreVendor = null;
    if (yustam_firebase_service_account_available()) {
        $firestoreVendor = yustam_storefront_fetch_firestore_vendor([
            $identifier,
            $sqlVendor['vendor_uid'] ?? null,
            $sqlVendor['firebase_uid'] ?? null,
        ]);
    }

    if ($sqlVendor === null && $firestoreVendor === null) {
        yustam_storefront_error(404, 'Vendor not found.');
    }

    $vendorPayload = yustam_storefront_merge_vendor($sqlVendor, $firestoreVendor);

    $sqlListings = [];
    if (!empty($vendorPayload['id'])) {
        $sqlListings = yustam_storefront_fetch_sql_listings((int) $vendorPayload['id'], 36);
    }

    $listings = $sqlListings;
    if (!$listings) {
        $listingIdentifiers = [
            $vendorPayload['vendorUid'] ?? null,
            $vendorPayload['firebaseUid'] ?? null,
            $identifier,
        ];
        $listings = yustam_storefront_fetch_listings($listingIdentifiers, 36);
    }

    $responsePayload = [
        'success' => true,
        'vendor' => $vendorPayload,
        'listings' => $listings,
    ];

    if ($cacheFile) {
        try {
            @file_put_contents(
                $cacheFile,
                json_encode($responsePayload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE),
                LOCK_EX
            );
        } catch (Throwable $cacheWriteError) {
            // Ignore cache write failures.
        }
    }

    if (!$cacheServed) {
        echo json_encode($responsePayload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    }
} catch (Throwable $exception) {
    error_log('Vendor storefront load failed: ' . $exception->getMessage());
    yustam_storefront_error(500, 'Unable to load vendor storefront.');
}
