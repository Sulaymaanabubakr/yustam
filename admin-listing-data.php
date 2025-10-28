<?php
declare(strict_types=1);

require_once __DIR__ . '/admin-session.php';
require_admin_auth();

header('Content-Type: application/json');

$listingId = isset($_GET['id']) ? trim((string) $_GET['id']) : '';
if ($listingId === '' || !preg_match('/^[A-Za-z0-9_-]+$/', $listingId)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid listing identifier.']);
    exit;
}

require_once __DIR__ . '/firebase-support.php';
require_once __DIR__ . '/db.php';

/**
 * Recursively decode a Firestore value payload into PHP primitives.
 *
 * @param array $value
 * @return mixed
 */
function yustam_firestore_decode_value(array $value)
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
    if (isset($value['nullValue'])) {
        return null;
    }
    if (isset($value['referenceValue'])) {
        return (string) $value['referenceValue'];
    }
    if (isset($value['arrayValue'])) {
        $values = $value['arrayValue']['values'] ?? [];
        if (!is_array($values)) {
            return [];
        }
        return array_map('yustam_firestore_decode_value', $values);
    }
    if (isset($value['mapValue'])) {
        $fields = $value['mapValue']['fields'] ?? [];
        if (!is_array($fields)) {
            return [];
        }
        return yustam_firestore_decode_fields($fields);
    }

    return $value;
}

/**
 * Decode a Firestore fields map into PHP associative array.
 *
 * @param array $fields
 * @return array
 */
function yustam_firestore_decode_fields(array $fields): array
{
    $decoded = [];
    foreach ($fields as $key => $value) {
        $decoded[$key] = yustam_firestore_decode_value($value);
    }
    return $decoded;
}

/**
 * Attempt to locate a vendor record using multiple identifiers.
 *
 * @param array $listing
 * @return array|null
 */
function yustam_admin_find_vendor_for_listing(array $listing): ?array
{
    $conn = get_db_connection();

    $idCandidates = [
        $listing['vendorID'] ?? null,
        $listing['vendorId'] ?? null,
        $listing['vendor_id'] ?? null,
    ];

    foreach ($idCandidates as $candidate) {
        if ($candidate === null || $candidate === '') {
            continue;
        }
        if (is_numeric($candidate)) {
            $vendor = yustam_vendor_find_by_id((int) $candidate, $conn);
            if ($vendor) {
                return $vendor;
            }
        }
    }

    $uidCandidates = [
        $listing['vendorUid'] ?? null,
        $listing['vendorUID'] ?? null,
        $listing['vendorFirebaseUid'] ?? null,
    ];
    foreach ($uidCandidates as $candidate) {
        if (!is_string($candidate) || trim($candidate) === '') {
            continue;
        }
        $vendor = yustam_vendor_find_by_uid($candidate, $conn);
        if ($vendor) {
            return $vendor;
        }
    }

    $emailCandidates = [
        $listing['vendorEmail'] ?? null,
        $listing['vendorEmailAddress'] ?? null,
    ];
    foreach ($emailCandidates as $candidate) {
        if (!is_string($candidate) || trim($candidate) === '') {
            continue;
        }
        $vendor = yustam_vendor_find_by_email($candidate, $conn);
        if ($vendor) {
            return $vendor;
        }
    }

    return null;
}

try {
    $projectId = yustam_firebase_project_id();
    $accessToken = yustam_firebase_access_token(['https://www.googleapis.com/auth/datastore']);
    $listingUri = sprintf(
        'https://firestore.googleapis.com/v1/projects/%s/databases/(default)/documents/listings/%s',
        rawurlencode($projectId),
        rawurlencode($listingId)
    );

    $documentResponse = yustam_firebase_http_json('GET', $listingUri, null, [
        'Authorization: Bearer ' . $accessToken,
        'Accept: application/json',
    ]);

    if (($documentResponse['status'] ?? 0) !== 200) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Listing not found.']);
        exit;
    }

    $documentPayload = json_decode($documentResponse['body'] ?? '{}', true);
    $fields = is_array($documentPayload['fields'] ?? null) ? $documentPayload['fields'] : [];
    $listingData = yustam_firestore_decode_fields($fields);
    $listingData['id'] = $listingId;
    $listingData['createTime'] = $documentPayload['createTime'] ?? null;
    $listingData['updateTime'] = $documentPayload['updateTime'] ?? null;

    $vendorRecord = yustam_admin_find_vendor_for_listing($listingData);
    $firestoreVendor = null;

    $firestoreVendorId = $listingData['vendorUid'] ?? $listingData['vendorFirebaseUid'] ?? null;
    if ($firestoreVendorId) {
        $vendorUri = sprintf(
            'https://firestore.googleapis.com/v1/projects/%s/databases/(default)/documents/vendors/%s',
            rawurlencode($projectId),
            rawurlencode($firestoreVendorId)
        );
        $vendorResponse = yustam_firebase_http_json('GET', $vendorUri, null, [
            'Authorization: Bearer ' . $accessToken,
            'Accept: application/json',
        ]);
        if (($vendorResponse['status'] ?? 0) === 200) {
            $vendorPayload = json_decode($vendorResponse['body'] ?? '{}', true);
            if (isset($vendorPayload['fields']) && is_array($vendorPayload['fields'])) {
                $firestoreVendor = yustam_firestore_decode_fields($vendorPayload['fields']);
                $firestoreVendor['id'] = $firestoreVendorId;
            }
        }
    }

    echo json_encode([
        'success' => true,
        'listing' => $listingData,
        'vendor' => $vendorRecord,
        'firestoreVendor' => $firestoreVendor,
    ], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
} catch (Throwable $error) {
    error_log('Admin listing detail fetch failed: ' . $error->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Unable to load listing detail.']);
}
