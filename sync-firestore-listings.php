<?php
declare(strict_types=1);

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/firebase-support.php';

/**
 * Decode Firestore value payload into PHP values.
 *
 * @param mixed $value
 * @return mixed
 */
function yustam_sync_firestore_decode_value($value)
{
    if (!is_array($value)) {
        return $value;
    }

    if (array_key_exists('stringValue', $value)) {
        return (string) $value['stringValue'];
    }
    if (array_key_exists('integerValue', $value)) {
        return (int) $value['integerValue'];
    }
    if (array_key_exists('doubleValue', $value)) {
        return (float) $value['doubleValue'];
    }
    if (array_key_exists('booleanValue', $value)) {
        return (bool) $value['booleanValue'];
    }
    if (array_key_exists('timestampValue', $value)) {
        return (string) $value['timestampValue'];
    }
    if (array_key_exists('mapValue', $value) && isset($value['mapValue']['fields'])) {
        return yustam_sync_firestore_decode_fields($value['mapValue']['fields']);
    }
    if (array_key_exists('arrayValue', $value) && isset($value['arrayValue']['values']) && is_array($value['arrayValue']['values'])) {
        $decoded = [];
        foreach ($value['arrayValue']['values'] as $inner) {
            $decoded[] = yustam_sync_firestore_decode_value($inner);
        }
        return $decoded;
    }
    if (array_key_exists('nullValue', $value)) {
        return null;
    }

    return $value;
}

/**
 * Decode Firestore map into associative array.
 *
 * @param array $fields
 * @return array<string,mixed>
 */
function yustam_sync_firestore_decode_fields(array $fields): array
{
    $decoded = [];
    foreach ($fields as $key => $value) {
        $decoded[$key] = yustam_sync_firestore_decode_value($value);
    }
    return $decoded;
}

/**
 * Fetch all documents from the Firestore listings collection.
 *
 * @return Generator<int,array<string,mixed>>
 */
function yustam_sync_fetch_firestore_listings(): \Generator
{
    $projectId = yustam_firebase_project_id();
    $token = yustam_firebase_access_token(['https://www.googleapis.com/auth/datastore']);
    $base = sprintf(
        'https://firestore.googleapis.com/v1/projects/%s/databases/(default)/documents/listings',
        rawurlencode($projectId)
    );

    $pageToken = null;
    do {
        $url = $base . '?pageSize=100';
        if ($pageToken) {
            $url .= '&pageToken=' . rawurlencode($pageToken);
        }

        $response = yustam_firebase_http_json('GET', $url, null, [
            'Authorization: Bearer ' . $token,
        ]);

        if (($response['status'] ?? 0) < 200 || ($response['status'] ?? 0) >= 300) {
            throw new RuntimeException('Unable to list Firestore documents: ' . ($response['body'] ?? ''));
        }

        $payload = json_decode($response['body'] ?? '[]', true);
        if (!is_array($payload)) {
            break;
        }

        $documents = $payload['documents'] ?? [];
        if (is_array($documents)) {
            foreach ($documents as $document) {
                if (!is_array($document)) {
                    continue;
                }
                $fields = isset($document['fields']) && is_array($document['fields']) ? $document['fields'] : [];
                $decoded = yustam_sync_firestore_decode_fields($fields);
                $decoded['id'] = isset($document['name']) ? basename((string) $document['name']) : null;
                $decoded['createTime'] = $document['createTime'] ?? null;
                $decoded['updateTime'] = $document['updateTime'] ?? null;
                yield $decoded;
            }
        }

        $pageToken = isset($payload['nextPageToken']) ? (string) $payload['nextPageToken'] : null;
    } while ($pageToken);
}

/**
 * Extract numeric vendor ID if available.
 *
 * @param array<string,mixed> $listing
 * @return int
 */
function yustam_sync_extract_vendor_id(array $listing): int
{
    $candidates = [
        $listing['vendorID'] ?? null,
        $listing['vendorId'] ?? null,
        $listing['vendor_id'] ?? null,
        $listing['vendor'] ?? null,
    ];

    foreach ($candidates as $candidate) {
        if (is_numeric($candidate)) {
            $value = (int) $candidate;
            if ($value > 0) {
                return $value;
            }
        }
    }

    return 0;
}

/**
 * Resolve vendor ID from vendor UID cache / database.
 *
 * @param mysqli $conn
 * @param array<string,mixed> $listing
 * @param array<string,int> $vendorCache
 * @return array{vendor_id:int,vendor_uid:string}
 */
function yustam_sync_resolve_vendor(mysqli $conn, array $listing, array &$vendorCache): array
{
    $vendorId = yustam_sync_extract_vendor_id($listing);
    $vendorUid = '';

    $uidCandidates = [
        $listing['vendorUid'] ?? null,
        $listing['vendorUID'] ?? null,
        $listing['vendorFirebaseUid'] ?? null,
        $listing['vendorFirebaseUID'] ?? null,
    ];

    foreach ($uidCandidates as $candidate) {
        if (is_string($candidate) && trim($candidate) !== '') {
            $vendorUid = trim($candidate);
            break;
        }
    }

    if ($vendorId <= 0 && $vendorUid !== '') {
        if (!array_key_exists($vendorUid, $vendorCache)) {
            try {
                $record = yustam_vendor_find_by_uid($vendorUid, $conn);
                $vendorCache[$vendorUid] = isset($record['id']) ? (int) $record['id'] : 0;
            } catch (Throwable $exception) {
                $vendorCache[$vendorUid] = 0;
            }
        }
        $vendorId = $vendorCache[$vendorUid];
    }

    if ($vendorId > 0 && $vendorUid === '') {
        try {
            $record = yustam_vendor_find_by_id($vendorId, $conn);
            if ($record) {
                $vendorUid = yustam_vendor_assign_uid_if_missing($conn, $record);
            }
        } catch (Throwable $exception) {
            $vendorUid = '';
        }
    }

    if ($vendorUid === '' && $vendorId > 0) {
        $vendorUid = sprintf('vendor-%d', $vendorId);
    }

    return [
        'vendor_id' => $vendorId,
        'vendor_uid' => $vendorUid,
    ];
}

/**
 * Prepare listing payload for SQL upsert.
 *
 * @param mysqli $conn
 * @param array<string,mixed> $listing
 * @param array<string,int> $vendorCache
 * @return array<string,mixed>
 */
function yustam_sync_prepare_listing(mysqli $conn, array $listing, array &$vendorCache): array
{
    $ids = yustam_sync_resolve_vendor($conn, $listing, $vendorCache);

    $titleCandidates = [
        $listing['title'] ?? null,
        $listing['productTitle'] ?? null,
        $listing['productName'] ?? null,
        $listing['name'] ?? null,
        $listing['listingTitle'] ?? null,
    ];
    $title = 'Marketplace Listing';
    foreach ($titleCandidates as $candidate) {
        if (is_string($candidate) && trim($candidate) !== '') {
            $title = trim($candidate);
            break;
        }
    }

    $priceValue = null;
    $priceCandidates = [
        $listing['price'] ?? null,
        $listing['amount'] ?? null,
        $listing['listingPrice'] ?? null,
    ];
    foreach ($priceCandidates as $candidate) {
        if (is_numeric($candidate)) {
            $priceValue = (float) $candidate;
            break;
        }
        if (is_string($candidate) && trim($candidate) !== '') {
            $numeric = preg_replace('/[^0-9.\-]/', '', $candidate);
            if ($numeric !== '' && is_numeric($numeric)) {
                $priceValue = (float) $numeric;
                break;
            }
        }
    }

    $images = [];
    if (!empty($listing['imageUrls']) && is_array($listing['imageUrls'])) {
        $images = array_values(array_filter(array_map(static fn($value) => is_string($value) ? trim($value) : '', $listing['imageUrls'])));
    } elseif (!empty($listing['images']) && is_array($listing['images'])) {
        $images = array_values(array_filter(array_map(static fn($value) => is_string($value) ? trim($value) : '', $listing['images'])));
    }

    $primaryImage = '';
    $imageCandidates = [
        $listing['primaryImage'] ?? null,
        $listing['primary_image'] ?? null,
        $listing['coverImage'] ?? null,
        $listing['image'] ?? null,
    ];
    foreach ($imageCandidates as $candidate) {
        if (is_string($candidate) && trim($candidate) !== '') {
            $primaryImage = trim($candidate);
            break;
        }
    }
    if ($primaryImage === '' && $images) {
        $primaryImage = $images[0];
    }

    $location = '';
    $locationCandidates = [
        $listing['vendorLocation'] ?? null,
        $listing['location'] ?? null,
    ];
    foreach ($locationCandidates as $candidate) {
        if (is_string($candidate) && trim($candidate) !== '') {
            $location = trim($candidate);
            break;
        }
    }

    $city = is_string($listing['city'] ?? null) ? trim((string) $listing['city']) : '';
    $state = is_string($listing['state'] ?? null) ? trim((string) $listing['state']) : '';
    $country = is_string($listing['country'] ?? null) ? trim((string) $listing['country']) : '';

    return [
        'vendor_id' => $ids['vendor_id'],
        'vendor_uid' => $ids['vendor_uid'],
        'firestore_id' => (string) ($listing['id'] ?? ''),
        'public_id' => (string) ($listing['id'] ?? ''),
        'title' => $title,
        'description' => (string) ($listing['description'] ?? ($listing['details'] ?? '')),
        'price' => $priceValue,
        'status' => (string) ($listing['status'] ?? ''),
        'primary_image' => $primaryImage,
        'image_urls' => $images,
        'category' => (string) ($listing['category'] ?? ''),
        'subcategory' => (string) ($listing['subcategory'] ?? ''),
        'location' => $location,
        'city' => $city,
        'state' => $state,
        'country' => $country,
    ];
}

$conn = get_db_connection();
yustam_listings_ensure_table($conn);

$total = 0;
$stored = 0;
$vendorCache = [];

foreach (yustam_sync_fetch_firestore_listings() as $listing) {
    $total++;
    if (empty($listing['id'])) {
        continue;
    }

    $payload = yustam_sync_prepare_listing($conn, $listing, $vendorCache);
    try {
        yustam_listings_upsert($conn, $payload);
        $stored++;
    } catch (Throwable $exception) {
        error_log('Unable to upsert listing ' . $listing['id'] . ': ' . $exception->getMessage());
    }
}

echo sprintf("Synced %d of %d Firestore listings into MySQL.\n", $stored, $total);

