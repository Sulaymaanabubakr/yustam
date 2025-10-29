<?php
require_once __DIR__ . '/session-path.php';
session_start();
require_once __DIR__ . '/verification-badge.php';
require_once __DIR__ . '/firebase-support.php';
require_once __DIR__ . '/db.php';

$productId = isset($_GET['id']) ? trim((string) $_GET['id']) : '';
if ($productId === '') {
    $productId = 'listing-preview';
}
$productTitle = 'Loading listing...';
$productPrice = 0;
$productPriceLabel = 'Contact vendor';
$productDescription = 'The vendor has not provided additional details yet.';
$productStatusValue = 'checking';
$productStatusLabel = 'Checking availability';
$productCategory = '';
$productSubcategory = '';
$productCategoryLabel = '';
$productImages = [];
$primaryImage = '';

$vendorUidParam = isset($_GET['vendorUid']) ? trim((string) $_GET['vendorUid']) : '';
$vendorIdParam = isset($_GET['vendorId']) ? trim((string) $_GET['vendorId']) : '';
$vendorFirebaseUidSession = isset($_SESSION['vendor_firebase_uid']) ? trim((string) $_SESSION['vendor_firebase_uid']) : '';
$vendorLegacyUidSession = isset($_SESSION['vendor_uid']) ? trim((string) $_SESSION['vendor_uid']) : '';
$vendorNumericIdSession = isset($_SESSION['vendor_id']) ? trim((string) $_SESSION['vendor_id']) : '';

$vendorId = '';
foreach ([$vendorUidParam, $vendorIdParam, $vendorFirebaseUidSession, $vendorLegacyUidSession, $vendorNumericIdSession] as $candidate) {
    if ($candidate !== '') {
        $vendorId = $candidate;
        break;
    }
}

$vendorUid = $vendorFirebaseUidSession;
if ($vendorUid === '' && $vendorUidParam !== '') {
    $vendorUid = $vendorUidParam;
} elseif ($vendorUid === '' && $vendorLegacyUidSession !== '') {
    $vendorUid = $vendorLegacyUidSession;
} elseif ($vendorUid === '' && $vendorIdParam !== '' && $vendorIdParam !== $vendorNumericIdSession) {
    $vendorUid = $vendorIdParam;
}
if ($vendorUid === '' && $vendorId !== '' && $vendorId !== $vendorNumericIdSession) {
    $vendorUid = $vendorId;
}
$vendorUid = trim((string) $vendorUid);

$vendorName = 'Marketplace Vendor';
$vendorBusinessName = '';
$vendorEmail = '';
$vendorPhone = '';
$vendorWhatsapp = '';
$vendorLocation = '';
$vendorCity = '';
$vendorState = '';
$vendorAddress = '';
$vendorPhoto = '';
$vendorSince = '';
$vendorNumericId = $vendorNumericIdSession;
$vendorIdCandidates = array_filter(
    [$vendorNumericIdSession, $vendorIdParam, $vendorId],
    static function ($value) {
        return is_string($value) && trim($value) !== '';
    }
);
$vendorUidCandidates = array_filter(
    [$vendorUidParam, $vendorFirebaseUidSession, $vendorLegacyUidSession, $vendorUid],
    static function ($value) {
        return is_string($value) && trim($value) !== '';
    }
);
$vendorEmailCandidates = [];
$vendorRecord = null;
$vendorFirestore = null;

$buyerNumericId = isset($_SESSION['buyer_id']) ? (string) $_SESSION['buyer_id'] : '';
$buyerFirebaseUidSession = isset($_SESSION['buyer_firebase_uid']) ? trim((string) $_SESSION['buyer_firebase_uid']) : '';
$buyerUidSession = isset($_SESSION['buyer_uid']) ? trim((string) $_SESSION['buyer_uid']) : '';
$buyerGenericUidSession = isset($_SESSION['firebase_uid']) ? trim((string) $_SESSION['firebase_uid']) : '';

$buyerUid = '';
foreach ([$buyerFirebaseUidSession, $buyerUidSession, $buyerGenericUidSession] as $candidate) {
    if ($candidate !== '') {
        $buyerUid = $candidate;
        break;
    }
}
$buyerId = $buyerUid !== '' ? $buyerUid : $buyerNumericId;
$buyerName = trim((string) ($_SESSION['buyer_name'] ?? ''));
if ($buyerUid === '' && $buyerId !== '' && $buyerId !== $buyerNumericId) {
    $buyerUid = $buyerId;
}

$buyerUid = trim((string) $buyerUid);
if ($buyerUid !== '') {
    if (empty($_SESSION['buyer_uid'])) {
        $_SESSION['buyer_uid'] = $buyerUid;
    }
    if (empty($_SESSION['buyer_firebase_uid'])) {
        $_SESSION['buyer_firebase_uid'] = $buyerUid;
    }
    if (empty($_SESSION['firebase_uid'])) {
        $_SESSION['firebase_uid'] = $buyerUid;
    }
}

$vendorNumericId = $vendorNumericIdSession;
$buyerLabel = $buyerName !== '' ? $buyerName : 'Buyer';

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

function yustam_normalise_verification($value): string
{
    if ($value === true || $value === 1 || $value === '1') {
        return 'verified';
    }

    if ($value === false || $value === 0 || $value === '0' || $value === null) {
        return 'unverified';
    }

    $value = strtolower(trim((string) $value));

    if (in_array($value, ['1', 'true', 'yes', 'verified', 'approved', 'active'], true)) {
        return 'verified';
    }

    if (in_array($value, ['pending', 'submitted', 'processing', 'in_review', 'in-review', 'under review'], true)) {
        return 'pending';
    }

    if (in_array($value, ['rejected', 'declined', 'failed', 'needs_changes', 'needs update', 'needs-update', '0', 'false', 'no', 'unverified'], true)) {
        return 'unverified';
    }

    return 'unverified';
}

function yustam_verification_label(string $state): string
{
    switch ($state) {
        case 'verified':
            return 'Verified Vendor';
        case 'pending':
            return 'Pending Review';
        default:
            return 'Not Verified';
    }
}

function yustam_verification_icon(string $state): string
{
    if ($state === 'verified') {
        return 'ri-shield-check-line';
    }

    if ($state === 'pending') {
        return 'ri-time-line';
    }

    return 'ri-alert-line';
}

$friendlyNormalizerPattern = '/[^a-z0-9]+/';

function yustam_product_first_non_empty(array $values): string
{
    foreach ($values as $value) {
        if (is_string($value)) {
            $trimmed = trim($value);
            if ($trimmed !== '') {
                return $trimmed;
            }
        } elseif (is_numeric($value)) {
            $stringValue = trim((string) $value);
            if ($stringValue !== '') {
                return $stringValue;
            }
        }
    }

    return '';
}

function yustam_product_format_currency($amount): string
{
    if (!is_numeric($amount)) {
        return 'Contact vendor';
    }
    $value = (float) $amount;
    if ($value <= 0) {
        return 'Contact vendor';
    }

    return '₦' . number_format($value, 0, '.', ',');
}

function yustam_product_status_label(string $status): string
{
    $normalized = strtolower(trim($status));

    switch ($normalized) {
        case '':
        case 'approved':
        case 'available':
        case 'active':
            return 'Available';
        case 'pending':
        case 'in_review':
        case 'in-review':
        case 'under review':
        case 'processing':
            return 'Pending Approval';
        case 'sold':
        case 'soldout':
        case 'sold_out':
            return 'Sold Out';
        case 'suspended':
        case 'disabled':
        case 'unavailable':
        case 'inactive':
            return 'Temporarily Unavailable';
        default:
            $label = str_replace(['_', '-'], ' ', $normalized);
            return ucwords($label);
    }
}

function yustam_product_decode_firestore_value($value)
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
        return yustam_product_decode_firestore_fields($value['mapValue']['fields']);
    }
    if (array_key_exists('arrayValue', $value) && isset($value['arrayValue']['values']) && is_array($value['arrayValue']['values'])) {
        $decoded = [];
        foreach ($value['arrayValue']['values'] as $inner) {
            $decoded[] = yustam_product_decode_firestore_value($inner);
        }
        return $decoded;
    }
    if (array_key_exists('nullValue', $value)) {
        return null;
    }
    if (array_key_exists('referenceValue', $value)) {
        return (string) $value['referenceValue'];
    }

    return $value;
}

function yustam_product_decode_firestore_fields(array $fields): array
{
    $decoded = [];
    foreach ($fields as $key => $value) {
        $decoded[$key] = yustam_product_decode_firestore_value($value);
    }
    return $decoded;
}

function yustam_product_fetch_firestore_document(string $collection, string $id): ?array
{
    $collection = trim($collection);
    $id = trim($id);
    if ($collection === '' || $id === '') {
        return null;
    }

    try {
        if (yustam_firebase_service_account_available()) {
            $projectId = yustam_firebase_project_id();
            $endpoint = sprintf(
                'https://firestore.googleapis.com/v1/projects/%s/databases/(default)/documents/%s/%s',
                rawurlencode($projectId),
                rawurlencode($collection),
                rawurlencode($id)
            );
            $headers = [
                'Authorization: Bearer ' . yustam_firebase_access_token(['https://www.googleapis.com/auth/datastore']),
            ];
            $response = yustam_firebase_http_json('GET', $endpoint, null, $headers);
        } else {
            $config = yustam_firebase_config();
            $projectId = isset($config['projectId']) ? trim((string) $config['projectId']) : '';
            if ($projectId === '') {
                return null;
            }
            $endpoint = sprintf(
                'https://firestore.googleapis.com/v1/projects/%s/databases/(default)/documents/%s/%s',
                rawurlencode($projectId),
                rawurlencode($collection),
                rawurlencode($id)
            );
            $apiKey = isset($config['apiKey']) ? trim((string) $config['apiKey']) : '';
            if ($apiKey !== '') {
                $endpoint .= '?key=' . rawurlencode($apiKey);
            }
            $response = yustam_firebase_http_json('GET', $endpoint);
        }

        $status = (int) ($response['status'] ?? 0);
        if ($status === 404) {
            return null;
        }
        if ($status < 200 || $status >= 300) {
            throw new RuntimeException('Firestore request failed with status ' . $status);
        }

        $payload = json_decode((string) ($response['body'] ?? ''), true);
        if (!is_array($payload) || !isset($payload['fields']) || !is_array($payload['fields'])) {
            return null;
        }

        $decoded = yustam_product_decode_firestore_fields($payload['fields']);
        $decoded['id'] = $id;
        if (isset($payload['name'])) {
            $decoded['namePath'] = (string) $payload['name'];
        }
        if (isset($payload['createTime'])) {
            $decoded['createTime'] = (string) $payload['createTime'];
        }
        if (isset($payload['updateTime'])) {
            $decoded['updateTime'] = (string) $payload['updateTime'];
        }

        return $decoded;
    } catch (Throwable $error) {
        error_log('Product Firestore fetch failed: ' . $error->getMessage());
        return null;
    }
}

function yustam_product_fetch_first_firestore_document(string $collection, array $candidates): ?array
{
    $checked = [];
    foreach ($candidates as $candidate) {
        if (!is_string($candidate) && !is_numeric($candidate)) {
            continue;
        }
        $id = trim((string) $candidate);
        if ($id === '' || isset($checked[$id])) {
            continue;
        }
        $checked[$id] = true;
        $document = yustam_product_fetch_firestore_document($collection, $id);
        if ($document !== null) {
            return $document;
        }
    }

    return null;
}

function yustam_product_sanitise_phone(string $phone): string
{
    $sanitised = preg_replace('/[^0-9+]/', '', $phone);
    if (!is_string($sanitised)) {
        return '';
    }

    return ltrim($sanitised);
}

function yustam_product_format_joined_date($value): string
{
    if (!is_string($value)) {
        return '';
    }
    $trimmed = trim($value);
    if ($trimmed === '') {
        return '';
    }

    $timestamp = strtotime($trimmed);
    if ($timestamp === false) {
        return '';
    }

    return date('M j, Y', $timestamp);
}

$vendorPlanInput = $_GET['plan'] ?? '';
if (!is_string($vendorPlanInput)) {
    $vendorPlanInput = '';
}
$vendorPlanInput = trim($vendorPlanInput);
$vendorPlan = $vendorPlanInput !== '' ? $vendorPlanInput : 'Free';

$vendorVerifiedInput = $_GET['verified'] ?? '';
if (!is_string($vendorVerifiedInput)) {
    $vendorVerifiedInput = '';
}
$vendorVerificationState = $vendorVerifiedInput !== '' ? yustam_normalise_verification($vendorVerifiedInput) : 'unverified';

$listingDocument = null;
if ($productId !== '' && $productId !== 'listing-preview') {
    $listingDocument = yustam_product_fetch_firestore_document('listings', $productId);
    if ($listingDocument) {
        $titleCandidate = yustam_product_first_non_empty([
            $listingDocument['title'] ?? null,
            $listingDocument['productTitle'] ?? null,
            $listingDocument['product_name'] ?? null,
            $listingDocument['name'] ?? null,
            $listingDocument['model'] ?? null,
        ]);
        if ($titleCandidate !== '') {
            $productTitle = $titleCandidate;
        }

        $priceCandidate = $listingDocument['price'] ?? ($listingDocument['amount'] ?? null);
        if (is_numeric($priceCandidate)) {
            $productPrice = (float) $priceCandidate;
            $productPriceLabel = yustam_product_format_currency($productPrice);
        }

        $descriptionCandidate = yustam_product_first_non_empty([
            $listingDocument['description'] ?? null,
            $listingDocument['details'] ?? null,
            $listingDocument['summary'] ?? null,
            $productDescription,
        ]);
        if ($descriptionCandidate !== '') {
            $productDescription = $descriptionCandidate;
        }

        $statusCandidate = yustam_product_first_non_empty([
            $listingDocument['status'] ?? null,
            $listingDocument['state'] ?? null,
            $listingDocument['listingStatus'] ?? null,
        ]);
        if ($statusCandidate !== '') {
            $productStatusValue = strtolower($statusCandidate);
        }

        $productCategory = yustam_product_first_non_empty([
            $listingDocument['category'] ?? null,
            $listingDocument['department'] ?? null,
        ]);
        $productSubcategory = yustam_product_first_non_empty([
            $listingDocument['subcategory'] ?? null,
            $listingDocument['subCategory'] ?? null,
            $listingDocument['collection'] ?? null,
        ]);
        $categoryParts = array_filter([$productCategory, $productSubcategory], static function ($value) {
            return is_string($value) && trim($value) !== '';
        });
        $productCategoryLabel = $categoryParts ? implode(' / ', array_map('trim', $categoryParts)) : '';

        $singleImageFields = ['primaryImage', 'featuredImage', 'coverImage', 'mainImage', 'image', 'thumbnail'];
        foreach ($singleImageFields as $field) {
            if (!empty($listingDocument[$field])) {
                $productImages[] = trim((string) $listingDocument[$field]);
            }
        }
        $arrayImageFields = ['imageUrls', 'images', 'gallery', 'photos', 'media', 'imageList'];
        foreach ($arrayImageFields as $field) {
            if (!empty($listingDocument[$field]) && is_array($listingDocument[$field])) {
                foreach ($listingDocument[$field] as $imageValue) {
                    $imageValue = trim((string) $imageValue);
                    if ($imageValue !== '') {
                        $productImages[] = $imageValue;
                    }
                }
            }
        }

        $listingVendorIdValue = yustam_product_first_non_empty([
            $listingDocument['vendorID'] ?? null,
            $listingDocument['vendorId'] ?? null,
            $listingDocument['vendor_id'] ?? null,
            $listingDocument['vendor'] ?? null,
        ]);
        if ($listingVendorIdValue !== '') {
            $vendorId = $listingVendorIdValue;
            $vendorIdCandidates[] = $listingVendorIdValue;
        }

        $listingVendorUidValue = yustam_product_first_non_empty([
            $listingDocument['vendorUid'] ?? null,
            $listingDocument['vendorUID'] ?? null,
            $listingDocument['vendorFirebaseUid'] ?? null,
        ]);
        if ($listingVendorUidValue !== '') {
            $vendorUid = $listingVendorUidValue;
            $vendorUidCandidates[] = $listingVendorUidValue;
        }

        $listingVendorName = yustam_product_first_non_empty([
            $listingDocument['vendorName'] ?? null,
            $listingDocument['vendorDisplayName'] ?? null,
            $listingDocument['vendorBusiness'] ?? null,
            $listingDocument['vendor'] ?? null,
        ]);
        if ($listingVendorName !== '') {
            $vendorName = $listingVendorName;
        }

        $listingVendorBusiness = yustam_product_first_non_empty([
            $listingDocument['vendorBusiness'] ?? null,
            $listingDocument['businessName'] ?? null,
            $listingDocument['storeName'] ?? null,
        ]);
        if ($listingVendorBusiness !== '') {
            $vendorBusinessName = $listingVendorBusiness;
        }

        $listingVendorPlan = yustam_product_first_non_empty([
            $listingDocument['vendorPlan'] ?? null,
            $listingDocument['plan'] ?? null,
        ]);
        if ($listingVendorPlan !== '') {
            $vendorPlan = $listingVendorPlan;
        }

        $listingVendorVerification = yustam_product_first_non_empty([
            $listingDocument['vendorVerified'] ?? null,
            $listingDocument['verification'] ?? null,
            $listingDocument['verificationStatus'] ?? null,
        ]);
        if ($listingVendorVerification !== '') {
            $vendorVerificationState = yustam_normalise_verification($listingVendorVerification);
        }

        $listingVendorEmail = yustam_product_first_non_empty([
            $listingDocument['vendorEmail'] ?? null,
            $listingDocument['vendorEmailAddress'] ?? null,
        ]);
        if ($listingVendorEmail !== '') {
            $vendorEmail = $listingVendorEmail;
            $vendorEmailCandidates[] = $listingVendorEmail;
        }

        $listingVendorPhone = yustam_product_first_non_empty([
            $listingDocument['vendorPhone'] ?? null,
            $listingDocument['vendorPhoneNumber'] ?? null,
            $listingDocument['vendorContactPhone'] ?? null,
        ]);
        if ($listingVendorPhone !== '') {
            $vendorPhone = $listingVendorPhone;
        }

        $listingVendorWhatsapp = yustam_product_first_non_empty([
            $listingDocument['vendorWhatsapp'] ?? null,
            $listingDocument['vendorWhatsApp'] ?? null,
        ]);
        if ($listingVendorWhatsapp !== '') {
            $vendorWhatsapp = $listingVendorWhatsapp;
        }

        $listingVendorLocation = yustam_product_first_non_empty([
            $listingDocument['vendorLocation'] ?? null,
            $listingDocument['location'] ?? null,
        ]);
        if ($listingVendorLocation !== '') {
            $vendorLocation = $listingVendorLocation;
        }

        $listingVendorCity = yustam_product_first_non_empty([
            $listingDocument['vendorCity'] ?? null,
            $listingDocument['city'] ?? null,
        ]);
        if ($listingVendorCity !== '') {
            $vendorCity = $listingVendorCity;
        }

        $listingVendorState = yustam_product_first_non_empty([
            $listingDocument['vendorState'] ?? null,
            $listingDocument['state'] ?? null,
        ]);
        if ($listingVendorState !== '') {
            $vendorState = $listingVendorState;
        }
    }
}

$vendorIdCandidates = array_values(array_filter(array_unique(array_map('trim', $vendorIdCandidates)), static function ($value) {
    return $value !== '';
}));
$vendorUidCandidates = array_values(array_filter(array_unique(array_map('trim', $vendorUidCandidates)), static function ($value) {
    return $value !== '';
}));
$vendorEmailCandidates = array_values(array_filter(array_unique(array_map('trim', $vendorEmailCandidates)), static function ($value) {
    return $value !== '';
}));

$allVendorLookupCandidates = array_values(array_unique(array_merge($vendorIdCandidates, $vendorUidCandidates)));
if (!$vendorRecord && $allVendorLookupCandidates) {
    $vendorConn = null;
    try {
        $vendorConn = get_db_connection();
    } catch (Throwable $error) {
        $vendorConn = null;
    }
    if ($vendorConn) {
        foreach ($allVendorLookupCandidates as $candidate) {
            if (ctype_digit($candidate)) {
                $lookup = yustam_vendor_find_by_id((int) $candidate, $vendorConn);
                if ($lookup) {
                    $vendorRecord = $lookup;
                    break;
                }
            }
        }
        if (!$vendorRecord) {
            foreach ($allVendorLookupCandidates as $candidate) {
                $lookup = yustam_vendor_find_by_uid($candidate, $vendorConn);
                if ($lookup) {
                    $vendorRecord = $lookup;
                    break;
                }
            }
        }
        if (!$vendorRecord && $vendorEmailCandidates) {
            foreach ($vendorEmailCandidates as $candidate) {
                $lookup = yustam_vendor_find_by_email($candidate, $vendorConn);
                if ($lookup) {
                    $vendorRecord = $lookup;
                    break;
                }
            }
        }
    }
}

if ($vendorRecord) {
    if (isset($vendorRecord['id']) && trim((string) $vendorRecord['id']) !== '') {
        $vendorNumericId = trim((string) $vendorRecord['id']);
        $vendorId = $vendorNumericId;
    }

    $recordUid = yustam_product_first_non_empty([
        $vendorRecord['vendor_uid'] ?? null,
        $vendorRecord['firebase_uid'] ?? null,
    ]);
    if ($recordUid !== '') {
        $vendorUid = $recordUid;
        $vendorUidCandidates[] = $recordUid;
    }

    $recordName = yustam_product_first_non_empty([
        $vendorRecord['business_name'] ?? null,
        $vendorRecord['store_name'] ?? null,
        $vendorRecord['company_name'] ?? null,
        $vendorRecord['full_name'] ?? null,
        $vendorRecord['name'] ?? null,
    ]);
    if ($recordName !== '') {
        $vendorName = $recordName;
    }

    $recordBusinessName = yustam_product_first_non_empty([
        $vendorRecord['business_name'] ?? null,
        $vendorRecord['store_name'] ?? null,
        $vendorRecord['company_name'] ?? null,
    ]);
    if ($recordBusinessName !== '') {
        $vendorBusinessName = $recordBusinessName;
    }

    $recordPlan = yustam_product_first_non_empty([
        $vendorRecord['plan'] ?? null,
        $vendorRecord['plan_name'] ?? null,
    ]);
    if ($recordPlan !== '') {
        $vendorPlan = $recordPlan;
    }

    foreach (['verification_status', 'verification_state', 'kyc_status', 'verification_stage', 'verified', 'status'] as $statusColumn) {
        if (isset($vendorRecord[$statusColumn])) {
            $statusValue = yustam_product_first_non_empty([$vendorRecord[$statusColumn]]);
            if ($statusValue !== '') {
                $vendorVerificationState = yustam_normalise_verification($statusValue);
                break;
            }
        }
    }

    $recordEmail = yustam_product_first_non_empty([
        $vendorRecord['email'] ?? null,
        $vendorRecord['contact_email'] ?? null,
    ]);
    if ($recordEmail !== '') {
        $vendorEmail = $recordEmail;
        $vendorEmailCandidates[] = $recordEmail;
    }

    $recordPhone = yustam_product_first_non_empty([
        $vendorRecord['phone'] ?? null,
        $vendorRecord['contact_phone'] ?? null,
        $vendorRecord['whatsapp'] ?? null,
        $vendorRecord['whatsapp_number'] ?? null,
    ]);
    if ($recordPhone !== '') {
        $vendorPhone = $recordPhone;
    }

    $recordWhatsapp = yustam_product_first_non_empty([
        $vendorRecord['whatsapp'] ?? null,
        $vendorRecord['whatsapp_number'] ?? null,
    ]);
    if ($recordWhatsapp !== '') {
        $vendorWhatsapp = $recordWhatsapp;
    }

    $recordAddress = yustam_product_first_non_empty([
        $vendorRecord['business_address'] ?? null,
        $vendorRecord['address'] ?? null,
    ]);
    if ($recordAddress !== '') {
        $vendorAddress = $recordAddress;
    }

    $recordCity = yustam_product_first_non_empty([
        $vendorRecord['city'] ?? null,
        $vendorRecord['lga'] ?? null,
    ]);
    if ($recordCity !== '') {
        $vendorCity = $recordCity;
    }

    $recordState = yustam_product_first_non_empty([
        $vendorRecord['state'] ?? null,
        $vendorRecord['region'] ?? null,
    ]);
    if ($recordState !== '') {
        $vendorState = $recordState;
    }

    $recordPhoto = yustam_product_first_non_empty([
        $vendorRecord['profile_photo'] ?? null,
        $vendorRecord['avatar_url'] ?? null,
        $vendorRecord['logo'] ?? null,
    ]);
    if ($recordPhoto !== '') {
        $vendorPhoto = $recordPhoto;
    }

    $recordSince = yustam_product_first_non_empty([
        $vendorRecord['created_at'] ?? null,
        $vendorRecord['registered_at'] ?? null,
        $vendorRecord['joined_at'] ?? null,
    ]);
    if ($recordSince !== '') {
        $formattedSince = yustam_product_format_joined_date($recordSince);
        if ($formattedSince !== '') {
            $vendorSince = $formattedSince;
        }
    }
}

$vendorIdCandidates = array_values(array_filter(array_unique(array_merge($vendorIdCandidates, isset($vendorRecord['id']) ? [trim((string) $vendorRecord['id'])] : [])), static function ($value) {
    return $value !== '';
}));
$vendorUidCandidates = array_values(array_filter(array_unique(array_merge($vendorUidCandidates, isset($vendorRecord['vendor_uid']) ? [trim((string) $vendorRecord['vendor_uid'])] : [])), static function ($value) {
    return $value !== '';
}));

$vendorFirestoreCandidates = array_merge($vendorUidCandidates, $vendorIdCandidates);
if ($listingDocument) {
    $vendorFirestoreCandidates[] = $listingDocument['vendorFirebaseUid'] ?? '';
    $vendorFirestoreCandidates[] = $listingDocument['vendorUid'] ?? '';
    $vendorFirestoreCandidates[] = $listingDocument['vendorUID'] ?? '';
}
if ($vendorRecord) {
    $vendorFirestoreCandidates[] = $vendorRecord['firebase_uid'] ?? '';
    $vendorFirestoreCandidates[] = $vendorRecord['vendor_uid'] ?? '';
}
$vendorFirestoreCandidates = array_values(array_filter(array_unique(array_map('trim', $vendorFirestoreCandidates)), static function ($value) {
    return $value !== '';
}));
$vendorFirestore = yustam_product_fetch_first_firestore_document('vendors', $vendorFirestoreCandidates);
if ($vendorFirestore) {
    $firestoreUid = yustam_product_first_non_empty([
        $vendorFirestore['vendorUid'] ?? null,
        $vendorFirestore['uid'] ?? null,
        $vendorFirestore['id'] ?? null,
    ]);
    if ($firestoreUid !== '') {
        $vendorUid = $firestoreUid;
    }

    $firestoreName = yustam_product_first_non_empty([
        $vendorFirestore['displayName'] ?? null,
        $vendorFirestore['businessName'] ?? null,
        $vendorFirestore['brand'] ?? null,
        $vendorFirestore['name'] ?? null,
    ]);
    if ($firestoreName !== '') {
        $vendorName = $firestoreName;
    }

    $firestoreBusiness = yustam_product_first_non_empty([
        $vendorFirestore['businessName'] ?? null,
        $vendorFirestore['storeName'] ?? null,
    ]);
    if ($firestoreBusiness !== '') {
        $vendorBusinessName = $firestoreBusiness;
    }

    $firestorePlan = yustam_product_first_non_empty([
        $vendorFirestore['plan'] ?? null,
        $vendorFirestore['planLabel'] ?? null,
    ]);
    if ($firestorePlan !== '') {
        $vendorPlan = $firestorePlan;
    }

    $firestoreVerification = yustam_product_first_non_empty([
        $vendorFirestore['verificationStatus'] ?? null,
        $vendorFirestore['verification'] ?? null,
        $vendorFirestore['status'] ?? null,
    ]);
    if ($firestoreVerification !== '') {
        $vendorVerificationState = yustam_normalise_verification($firestoreVerification);
    }

    $firestoreEmail = yustam_product_first_non_empty([
        $vendorFirestore['email'] ?? null,
        $vendorFirestore['contactEmail'] ?? null,
    ]);
    if ($firestoreEmail !== '') {
        $vendorEmail = $firestoreEmail;
        $vendorEmailCandidates[] = $firestoreEmail;
    }

    $firestorePhone = yustam_product_first_non_empty([
        $vendorFirestore['phone'] ?? null,
        $vendorFirestore['contactPhone'] ?? null,
        $vendorFirestore['phoneNumber'] ?? null,
    ]);
    if ($firestorePhone !== '') {
        $vendorPhone = $firestorePhone;
    }

    $firestoreWhatsapp = yustam_product_first_non_empty([
        $vendorFirestore['whatsapp'] ?? null,
        $vendorFirestore['whatsApp'] ?? null,
    ]);
    if ($firestoreWhatsapp !== '') {
        $vendorWhatsapp = $firestoreWhatsapp;
    }

    $firestoreLocation = yustam_product_first_non_empty([
        $vendorFirestore['location'] ?? null,
        $vendorFirestore['address'] ?? null,
    ]);
    if ($firestoreLocation !== '') {
        $vendorLocation = $firestoreLocation;
    }

    $firestoreCity = yustam_product_first_non_empty([
        $vendorFirestore['city'] ?? null,
        $vendorFirestore['lga'] ?? null,
    ]);
    if ($firestoreCity !== '') {
        $vendorCity = $firestoreCity;
    }

    $firestoreState = yustam_product_first_non_empty([
        $vendorFirestore['state'] ?? null,
        $vendorFirestore['region'] ?? null,
    ]);
    if ($firestoreState !== '') {
        $vendorState = $firestoreState;
    }

    $firestorePhoto = yustam_product_first_non_empty([
        $vendorFirestore['profilePhoto'] ?? null,
        $vendorFirestore['avatarUrl'] ?? null,
        $vendorFirestore['logo'] ?? null,
    ]);
    if ($firestorePhoto !== '') {
        $vendorPhoto = $firestorePhoto;
    }

    if ($vendorSince === '') {
        $firestoreSince = yustam_product_first_non_empty([
            $vendorFirestore['createdAt'] ?? null,
            $vendorFirestore['created_at'] ?? null,
            $vendorFirestore['joinedAt'] ?? null,
        ]);
        if ($firestoreSince !== '') {
            $formattedSince = yustam_product_format_joined_date($firestoreSince);
            if ($formattedSince !== '') {
                $vendorSince = $formattedSince;
            }
        }
    }
}

$productImages = array_values(array_filter(array_unique(array_map('trim', $productImages)), static function ($image) {
    return $image !== '';
}));
if ($primaryImage === '' && $productImages) {
    $primaryImage = $productImages[0];
}

$productTitle = trim($productTitle) !== '' && $productTitle !== 'Loading listing...' ? $productTitle : 'Marketplace Listing';
$productStatusValue = ($productStatusValue === '' || $productStatusValue === 'checking') ? 'available' : $productStatusValue;
$productStatusLabel = yustam_product_status_label($productStatusValue);
$productStatusClass = 'status-chip';
$productStatusSlug = preg_replace('/[^a-z0-9]+/', '-', strtolower($productStatusValue));
if ($productStatusSlug !== '') {
    $productStatusClass .= ' status-' . $productStatusSlug;
}

if ($vendorName === '') {
    $vendorName = 'Marketplace Vendor';
}
if ($vendorBusinessName === '') {
    $vendorBusinessName = $vendorName;
}
if ($vendorUid === '' && $vendorId !== '') {
    $vendorUid = (string) $vendorId;
}
if (($vendorNumericId === '' || !ctype_digit((string) $vendorNumericId)) && ctype_digit((string) $vendorId)) {
    $vendorNumericId = (string) $vendorId;
}

$vendorLocationDisplay = '';
if (trim((string) $vendorLocation) !== '') {
    $vendorLocationDisplay = trim((string) $vendorLocation);
} else {
    $locationParts = array_filter([
        trim((string) $vendorCity),
        trim((string) $vendorState),
    ], static function ($value) {
        return $value !== '';
    });
    if ($locationParts) {
        $vendorLocationDisplay = implode(', ', array_unique($locationParts));
    } elseif (trim((string) $vendorAddress) !== '') {
        $vendorLocationDisplay = trim((string) $vendorAddress);
    }
}

$vendorPlanLabel = yustam_format_plan_label($vendorPlan);
$vendorPlanSlug = yustam_slugify_plan($vendorPlan);
$vendorVerificationLabel = yustam_verification_label($vendorVerificationState);
$vendorVerificationIcon = yustam_verification_icon($vendorVerificationState);
$vendorIsVerified = $vendorVerificationState === 'verified';
$vendorVerificationBadge = yustam_render_verification_badge(
    $vendorPlan,
    $vendorIsVerified,
    [
        'role_label' => yustam_verification_plan_label($vendorPlan),
    ]
);

$vendorPhoneSanitised = $vendorPhone !== '' ? yustam_product_sanitise_phone($vendorPhone) : '';
$vendorPhoneLinkClass = 'contact-button contact-button--phone' . ($vendorPhoneSanitised !== '' ? '' : ' is-disabled');
$vendorPhoneHref = $vendorPhoneSanitised !== '' ? 'tel:' . $vendorPhoneSanitised : '#';
$vendorPhoneAriaDisabled = $vendorPhoneSanitised !== '' ? 'false' : 'true';
$vendorPhoneDisplay = $vendorPhoneSanitised !== '' ? $vendorPhone : 'Unavailable';

$vendorWhatsappSource = $vendorWhatsapp !== '' ? $vendorWhatsapp : $vendorPhone;
$vendorWhatsappSanitised = $vendorWhatsappSource !== '' ? yustam_product_sanitise_phone($vendorWhatsappSource) : '';
$vendorWhatsappHref = $vendorWhatsappSanitised !== '' ? 'https://wa.me/' . $vendorWhatsappSanitised : '';
$vendorWhatsappLinkClass = 'contact-button contact-button--whatsapp' . ($vendorWhatsappHref !== '' ? '' : ' is-disabled');
$vendorWhatsappAriaDisabled = $vendorWhatsappHref !== '' ? 'false' : 'true';

$vendorEmailAvailable = $vendorEmail !== '';
$vendorEmailHref = $vendorEmailAvailable ? 'mailto:' . $vendorEmail : '#';
$vendorEmailAriaDisabled = $vendorEmailAvailable ? 'false' : 'true';

$vendorAvatarSrc = $vendorPhoto !== '' ? $vendorPhoto : 'logo.jpeg';
$vendorSinceDisplay = $vendorSince;

$categoryIsHidden = $productCategoryLabel === '';
$vendorBusinessHidden = trim((string) $vendorBusinessName) === '';
$vendorLocationHidden = $vendorLocationDisplay === '';
$vendorSinceHidden = trim((string) $vendorSinceDisplay) === '';
$quickChatVendorUid = $vendorUid !== '' ? $vendorUid : ($vendorId !== '' ? $vendorId : $vendorNumericId);
$quickChatVendorId = $vendorNumericId !== '' ? $vendorNumericId : (ctype_digit((string) $vendorId) ? (string) $vendorId : '');

$initialState = [
    'listing' => $listingDocument,
    'vendor' => [
        'id' => $vendorId,
        'vendorId' => $vendorId,
        'vendorUid' => $vendorUid,
        'uid' => $vendorUid,
        'displayName' => $vendorName,
        'name' => $vendorName,
        'businessName' => $vendorBusinessName,
        'plan' => $vendorPlan,
        'planLabel' => $vendorPlanLabel,
        'planSlug' => $vendorPlanSlug,
        'verificationStatus' => $vendorVerificationState,
        'verification_state' => $vendorVerificationState,
        'status' => $vendorVerificationState,
        'email' => $vendorEmail,
        'contactEmail' => $vendorEmail,
        'phone' => $vendorPhone,
        'contactPhone' => $vendorPhone,
        'whatsapp' => $vendorWhatsappSource,
        'location' => $vendorLocationDisplay,
        'city' => $vendorCity,
        'state' => $vendorState,
        'address' => $vendorAddress,
        'profilePhoto' => $vendorPhoto,
        'avatarUrl' => $vendorPhoto,
        'logo' => $vendorPhoto,
        'since' => $vendorSince,
    ],
    'vendorRecord' => $vendorRecord,
    'vendorFirestore' => $vendorFirestore,
    'meta' => [
        'price' => [
            'value' => $productPrice,
            'label' => $productPriceLabel,
        ],
        'status' => [
            'value' => $productStatusValue,
            'label' => $productStatusLabel,
        ],
        'category' => [
            'category' => $productCategory,
            'subcategory' => $productSubcategory,
            'label' => $productCategoryLabel,
        ],
        'primaryImage' => $primaryImage,
    ],
];

$chatId = $vendorId && $buyerId ? $vendorId . '_' . $buyerId . '_' . $productId : '';
$vendorProfileUrl = 'vendor-storefront.php';
if (is_string($vendorId) && trim($vendorId) !== '') {
    $vendorProfileUrl .= '?vendorId=' . rawurlencode($vendorId);
}

$placeholderImage = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';
if ($primaryImage === '') {
    $primaryImage = $placeholderImage;
}
$quickChatProductImage = $primaryImage;
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= htmlspecialchars($productTitle, ENT_QUOTES, 'UTF-8'); ?> | YUSTAM Marketplace</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Anton&family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/remixicon@3.5.0/fonts/remixicon.css">
    <style>
        :root {
            --emerald: #004D40;
            --emerald-dark: #01382F;
            --emerald-soft: rgba(0, 77, 64, 0.12);
            --orange: #F3731E;
            --orange-deep: #D95D12;
            --beige: #F7F0E9;
            --white: #FFFFFF;
            --ink: #101613;
            --muted: rgba(16, 22, 19, 0.65);
            --shadow-key: 0 24px 48px rgba(0, 0, 0, 0.14);
            --shadow-soft: 0 16px 38px rgba(1, 56, 47, 0.12);
            --radius-lg: 32px;
            --radius-md: 18px;
            --radius-sm: 12px;
        }

        *,
        *::before,
        *::after {
            box-sizing: border-box;
        }

        body {
            margin: 0;
            min-height: 100vh;
            font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
            color: var(--ink);
            background:
                radial-gradient(circle at top left, rgba(234, 220, 207, 0.92), rgba(255, 255, 255, 0.95)),
                linear-gradient(145deg, rgba(243, 115, 30, 0.08), rgba(0, 77, 64, 0.06));
            display: flex;
            flex-direction: column;
        }

        a {
            color: inherit;
            text-decoration: none;
        }

        button {
            font-family: inherit;
            border: none;
            background: none;
            cursor: pointer;
        }

        button:disabled,
        [aria-disabled="true"] {
            cursor: not-allowed;
        }

.product-nav {
            width: min(1180px, calc(100% - 32px));
            margin: 32px auto 0;
            padding: 16px 24px;
            border-radius: var(--radius-md);
            border: 1px solid rgba(0, 77, 64, 0.12);
            background: rgba(255, 255, 255, 0.92);
            box-shadow: 0 14px 32px rgba(15, 106, 83, 0.12);
            display: flex;
            align-items: center;
            justify-content: space-between;
            color: var(--emerald);
            gap: 24px;
        }

        .product-nav__actions {
            display: inline-flex;
            align-items: center;
            gap: 12px;
        }

        .nav-icon-button {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 46px;
            height: 46px;
            border-radius: 50%;
            color: var(--emerald);
            border: 1px solid rgba(0, 77, 64, 0.18);
            background: rgba(243, 115, 30, 0.14);
            transition: background 0.25s ease, transform 0.25s ease, box-shadow 0.25s ease;
        }

        .nav-icon-button:hover {
            background: rgba(243, 115, 30, 0.2);
            transform: translateY(-1px);
            box-shadow: 0 12px 22px rgba(243, 115, 30, 0.26);
        }

        .nav-icon-button i {
            font-size: 1.3rem;
        }

        .product-nav__brand {
            display: inline-flex;
            align-items: center;
            gap: 12px;
        }

        .product-nav__brand img {
            width: 44px;
            height: 44px;
            border-radius: 50%;
            border: 1px solid rgba(0, 77, 64, 0.12);
            object-fit: cover;
        }

        .product-nav__brand-text {
            display: flex;
            flex-direction: column;
            align-items: flex-end;
        }

        .product-nav__brand-name {
            font-family: 'Anton', sans-serif;
            letter-spacing: 1px;
            font-size: clamp(1.2rem, 2vw, 1.6rem);
        }

        .product-nav__brand-tagline {
            font-size: 0.85rem;
            font-weight: 600;
            color: rgba(0, 77, 64, 0.72);
            text-transform: uppercase;
            letter-spacing: 0.04em;
        }

        .sr-only {
            position: absolute;
            width: 1px;
            height: 1px;
            padding: 0;
            margin: -1px;
            overflow: hidden;
            clip: rect(0, 0, 0, 0);
            white-space: nowrap;
            border: 0;
        }

        .product-shell {
            width: min(1180px, calc(100% - 32px));
            margin: 32px auto 64px;
            display: flex;
            flex-direction: column;
            gap: 32px;
        }

        .product-hero {
            background: var(--white);
            border-radius: var(--radius-lg);
            padding: 32px;
            display: grid;
            grid-template-columns: minmax(0, 1.05fr) minmax(0, 0.95fr);
            gap: 32px;
            box-shadow: var(--shadow-key);
        }

        .product-gallery {
            display: flex;
            flex-direction: column;
            gap: 16px;
        }

        .product-gallery__stage {
            position: relative;
            background: linear-gradient(135deg, var(--beige), rgba(243, 115, 30, 0.18));
            border-radius: var(--radius-lg);
            overflow: hidden;
            aspect-ratio: 4 / 3;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .product-gallery__stage img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            opacity: 0;
            transition: opacity 0.35s ease;
        }

        .product-gallery__thumbs {
            display: flex;
            flex-wrap: wrap;
            gap: 12px;
        }

        .product-gallery__thumbs button {
            border: 1px solid transparent;
            border-radius: var(--radius-sm);
            padding: 0;
            width: 72px;
            height: 72px;
            overflow: hidden;
            background: rgba(0, 0, 0, 0.04);
            cursor: pointer;
            transition: border-color 0.25s ease, transform 0.25s ease;
        }

        .product-gallery__thumbs button img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }

        .product-gallery__thumbs button.active {
            border-color: var(--orange);
            transform: translateY(-2px);
        }

        .product-summary {
            display: flex;
            flex-direction: column;
            gap: 24px;
        }

        .product-summary__header {
            display: flex;
            flex-direction: column;
            gap: 12px;
        }

        .category-pill {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            font-size: 0.85rem;
            font-weight: 600;
            padding: 6px 12px;
            border-radius: 999px;
            background: var(--emerald-soft);
            color: var(--emerald-dark);
        }

        .product-summary__header h1 {
            font-size: clamp(1.8rem, 3vw, 2.6rem);
            font-weight: 700;
            margin: 0;
            color: var(--emerald-dark);
        }

        .product-price {
            font-size: clamp(1.6rem, 4vw, 2.4rem);
            font-weight: 700;
            color: var(--orange);
            margin: 0;
        }

        .product-summary__cta {
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            gap: 12px;
        }

        .save-btn {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 12px 20px;
            border-radius: 999px;
            background: linear-gradient(135deg, var(--orange), var(--orange-deep));
            color: var(--white);
            font-weight: 600;
            box-shadow: var(--shadow-soft);
            transition: transform 0.25s ease, box-shadow 0.25s ease;
        }

        .save-btn i {
            font-size: 1.2rem;
        }

        .save-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 16px 38px rgba(217, 93, 18, 0.32);
        }

        .save-btn.active {
            background: linear-gradient(135deg, var(--emerald), var(--emerald-dark));
        }

        .storefront-link {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 11px 18px;
            border-radius: 999px;
            font-weight: 600;
            border: 1px solid rgba(0, 77, 64, 0.18);
            color: var(--emerald-dark);
            transition: background 0.25s ease, color 0.25s ease;
        }

        .storefront-link:hover {
            background: rgba(0, 77, 64, 0.08);
        }

        .feature-list {
            list-style: none;
            margin: 0;
            padding: 0;
            display: grid;
            gap: 10px;
        }

        .feature-list li {
            display: flex;
            align-items: center;
            gap: 10px;
            font-weight: 500;
            color: var(--muted);
        }

        .feature-list li::before {
            content: '\f13d';
            font-family: 'remixicon';
            color: var(--emerald);
            font-size: 1rem;
        }

        .product-details-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
            gap: 24px;
        }

        .detail-card {
            background: rgba(255, 255, 255, 0.96);
            border-radius: var(--radius-lg);
            padding: 28px;
            box-shadow: 0 12px 28px rgba(0, 0, 0, 0.06);
            backdrop-filter: blur(6px);
        }

        .detail-card h2 {
            margin: 0 0 16px;
            font-size: 1.25rem;
            color: var(--emerald-dark);
        }

        .product-description {
            line-height: 1.6;
            color: var(--muted);
            margin: 0;
        }

        .spec-list {
            display: grid;
            gap: 10px;
        }

        .spec-row {
            display: flex;
            justify-content: space-between;
            gap: 12px;
            padding: 10px 14px;
            border-radius: var(--radius-sm);
            background: rgba(0, 77, 64, 0.05);
            color: var(--muted);
            font-size: 0.95rem;
        }

        .spec-row span {
            font-weight: 500;
            color: var(--emerald-dark);
        }

        .spec-empty {
            margin: 0;
            color: var(--muted);
            font-size: 0.95rem;
        }

        .quick-chat-card {
            background: var(--white);
            border-radius: var(--radius-lg);
            padding: 28px;
            box-shadow: var(--shadow-soft);
            display: flex;
            flex-direction: column;
            gap: 18px;
        }

        .quick-chat-card h3 {
            margin: 0;
            font-size: 1.35rem;
            color: var(--emerald-dark);
        }

        .quick-chat-card p {
            margin: 0;
            color: var(--muted);
            line-height: 1.6;
        }

        .quick-form {
            display: flex;
            flex-direction: column;
            gap: 12px;
        }

        .quick-input {
            display: flex;
            align-items: center;
            gap: 10px;
            border: 1px solid rgba(0, 77, 64, 0.16);
            border-radius: var(--radius-md);
            padding: 6px 6px 6px 16px;
            background: rgba(0, 77, 64, 0.04);
        }

        .quick-input input {
            flex: 1;
            border: none;
            background: transparent;
            font-size: 1rem;
            font-family: inherit;
            padding: 10px 0;
            outline: none;
            color: var(--ink);
        }

        .quick-input button {
            width: 46px;
            height: 46px;
            border-radius: 50%;
            background: linear-gradient(135deg, var(--emerald), var(--emerald-dark));
            color: var(--white);
            display: grid;
            place-items: center;
            font-size: 1.25rem;
            transition: transform 0.25s ease, box-shadow 0.25s ease;
        }

        .quick-input button:hover {
            transform: translateY(-2px);
            box-shadow: 0 12px 22px rgba(1, 56, 47, 0.24);
        }

        .quick-suggestions {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
        }

        .suggestion-chip {
            border-radius: 999px;
            padding: 8px 16px;
            background: rgba(0, 77, 64, 0.08);
            color: var(--emerald-dark);
            font-size: 0.9rem;
            font-weight: 500;
            transition: background 0.25s ease, transform 0.25s ease;
        }

        .suggestion-chip:hover {
            background: rgba(0, 77, 64, 0.16);
            transform: translateY(-1px);
        }

        .quick-note {
            color: var(--muted);
            font-size: 0.85rem;
        }

        .vendor-card {
            background: rgba(255, 255, 255, 0.98);
            border-radius: var(--radius-lg);
            padding: 32px;
            box-shadow: var(--shadow-key);
            display: flex;
            flex-direction: column;
            gap: 24px;
        }

        .vendor-card__header {
            display: flex;
            gap: 18px;
            align-items: center;
        }

        .vendor-avatar {
            width: 82px;
            height: 82px;
            border-radius: 50%;
            object-fit: cover;
            border: 3px solid rgba(0, 77, 64, 0.18);
        }

        .vendor-card__header h2 {
            margin: 0;
            font-size: 1.45rem;
            color: var(--emerald-dark);
        }

        .vendor-business {
            margin: 4px 0 0;
            color: var(--muted);
            font-weight: 500;
        }

        .vendor-badges {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
            margin-top: 12px;
        }

        .vendor-badge {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 6px 14px;
            border-radius: 999px;
            font-size: 0.85rem;
            font-weight: 600;
        }

        .vendor-badge.vendor-plan {
            background: rgba(243, 115, 30, 0.15);
            color: var(--orange-deep);
        }

        .vendor-badge.vendor-verified.verified {
            background: rgba(0, 77, 64, 0.16);
            color: var(--emerald-dark);
        }

        .vendor-badge.vendor-verified.pending {
            background: rgba(243, 115, 30, 0.16);
            color: var(--orange-deep);
        }

        .vendor-badge.vendor-verified.unverified {
            background: rgba(16, 22, 19, 0.12);
            color: var(--muted);
        }

        .vendor-card__contact {
            display: flex;
            flex-wrap: wrap;
            gap: 12px;
        }

        .contact-button {
            display: inline-flex;
            align-items: center;
            gap: 10px;
            padding: 12px 18px;
            border-radius: var(--radius-md);
            font-weight: 600;
            transition: transform 0.25s ease, box-shadow 0.25s ease;
        }

        .contact-button i {
            font-size: 1.25rem;
        }

        .contact-button--phone {
            background: linear-gradient(135deg, var(--emerald), var(--emerald-dark));
            color: var(--white);
            box-shadow: 0 14px 28px rgba(1, 56, 47, 0.24);
        }

        .contact-button--whatsapp {
            background: linear-gradient(135deg, #25D366, #128C7E);
            color: var(--white);
            box-shadow: 0 14px 28px rgba(18, 140, 126, 0.26);
        }

        .contact-button.is-disabled {
            background: rgba(16, 22, 19, 0.08);
            color: rgba(16, 22, 19, 0.5);
            box-shadow: none;
        }

        .contact-button:not(.is-disabled):hover {
            transform: translateY(-2px);
        }

        .contact-button [data-contact-value] {
            font-size: 0.85rem;
            font-weight: 500;
            opacity: 0.85;
        }

        .vendor-card__details {
            display: grid;
            gap: 12px;
        }

        .vendor-card__detail {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            font-size: 0.95rem;
            color: var(--muted);
        }

        .vendor-card__detail .label {
            font-weight: 600;
            color: var(--emerald-dark);
            min-width: 120px;
        }

        .vendor-card__detail a[aria-disabled="true"] {
            pointer-events: none;
            opacity: 0.6;
        }

        .status-chip {
            position: absolute;
            top: 16px;
            left: 16px;
            padding: 6px 14px;
            border-radius: 999px;
            background: rgba(0, 77, 64, 0.85);
            color: var(--white);
            font-size: 0.85rem;
            font-weight: 600;
            letter-spacing: 0.02em;
        }

        .status-chip.status-pending {
            background: rgba(243, 115, 30, 0.85);
        }

        .status-chip.status-sold,
        .status-chip.status-soldout,
        .status-chip.unavailable,
        .status-chip.status-unavailable {
            background: rgba(16, 22, 19, 0.8);
        }

        .status-chip.status-disabled,
        .status-chip.status-suspended {
            background: rgba(189, 0, 49, 0.82);
        }

        .product-footer {
            margin-top: auto;
            padding: 32px 16px 48px;
            background: linear-gradient(135deg, var(--emerald), var(--emerald-dark));
            color: var(--white);
        }

        .product-footer__inner {
            width: min(1180px, calc(100% - 32px));
            margin: 0 auto;
            display: flex;
            flex-direction: column;
            gap: 18px;
            align-items: center;
            text-align: center;
        }

        .footer-links {
            display: flex;
            flex-wrap: wrap;
            gap: 16px;
            justify-content: center;
            font-weight: 500;
        }

        .footer-links a {
            color: var(--white);
            opacity: 0.85;
        }

        .footer-links a:hover {
            opacity: 1;
        }

        .footer-social {
            display: flex;
            gap: 14px;
            font-size: 1.4rem;
        }

        .footer-social a {
            color: var(--white);
            opacity: 0.85;
        }

        .footer-social a:hover {
            opacity: 1;
        }

        @media (max-width: 1024px) {
            .product-nav {
                margin-top: 24px;
            }

            .product-hero {
                grid-template-columns: 1fr;
            }

        }

        @media (max-width: 720px) {
            .product-nav {
                flex-direction: row;
                align-items: center;
                gap: 14px;
                padding: 14px 18px;
            }

            .product-nav__actions {
                flex: 0 0 auto;
            }

            .product-nav__brand {
                flex: 1 1 auto;
                min-width: 0;
                justify-content: flex-start;
            }

            .product-nav__brand-text {
                align-items: flex-start;
            }

            .product-nav__brand-name {
                font-size: clamp(1.05rem, 4vw, 1.3rem);
            }

            .product-nav__brand-tagline {
                font-size: 0.78rem;
            }

            .product-shell {
                margin: 24px auto 80px;
                gap: 24px;
            }

            .product-hero {
                padding: 20px;
                gap: 20px;
            }

            .product-gallery__thumbs {
                justify-content: flex-start;
            }

            .product-details-grid {
                gap: 16px;
            }

            .detail-card,
            .quick-chat-card,
            .vendor-card {
                padding: 22px;
            }

        }

        @media (prefers-reduced-motion: reduce) {
            *,
            *::before,
            *::after {
                animation-duration: 0.01ms !important;
                animation-iteration-count: 1 !important;
                transition-duration: 0.01ms !important;
                scroll-behavior: auto !important;
            }
        }
    </style>
</head>
<body
    data-buyer-id="<?= htmlspecialchars($buyerNumericId, ENT_QUOTES, 'UTF-8'); ?>"
    data-buyer-uid="<?= htmlspecialchars($buyerUid, ENT_QUOTES, 'UTF-8'); ?>"
    data-buyer-name="<?= htmlspecialchars($buyerLabel, ENT_QUOTES, 'UTF-8'); ?>"
    data-vendor-id="<?= htmlspecialchars($vendorNumericId, ENT_QUOTES, 'UTF-8'); ?>"
    data-vendor-uid="<?= htmlspecialchars($vendorUid, ENT_QUOTES, 'UTF-8'); ?>"
    data-vendor-name="<?= htmlspecialchars($vendorName, ENT_QUOTES, 'UTF-8'); ?>"
    data-vendor-plan="<?= htmlspecialchars($vendorPlan, ENT_QUOTES, 'UTF-8'); ?>"
    data-vendor-plan-label="<?= htmlspecialchars($vendorPlanLabel, ENT_QUOTES, 'UTF-8'); ?>"
    data-vendor-plan-slug="<?= htmlspecialchars($vendorPlanSlug, ENT_QUOTES, 'UTF-8'); ?>"
    data-vendor-verified="<?= htmlspecialchars($vendorVerificationState, ENT_QUOTES, 'UTF-8'); ?>"
>
    <header class="product-nav">
        <div class="product-nav__actions">
            <button type="button" class="nav-icon-button" onclick="window.location.href='shop.html'" aria-label="Back to listings">
                <i class="ri-arrow-left-line" aria-hidden="true"></i>
                <span class="sr-only">Back to listings</span>
            </button>
            <button type="button" class="nav-icon-button" onclick="window.location.href='index.html'" aria-label="Go to homepage">
                <i class="ri-home-4-line" aria-hidden="true"></i>
                <span class="sr-only">Go to homepage</span>
            </button>
        </div>
        <div class="product-nav__brand">
            <img src="logo.jpeg" alt="YUSTAM Marketplace logo">
            <div class="product-nav__brand-text">
                <span class="product-nav__brand-name">YUSTAM Marketplace</span>
                <span class="product-nav__brand-tagline">Product overview</span>
            </div>
        </div>
    </header>
    <main class="product-shell">
        <section class="product-hero">
            <div class="product-gallery">
                <figure class="product-gallery__stage" aria-label="Product gallery">
                    <img id="productImage" src="<?= htmlspecialchars($primaryImage, ENT_QUOTES, 'UTF-8'); ?>" alt="<?= htmlspecialchars($productTitle, ENT_QUOTES, 'UTF-8'); ?> image" loading="lazy">
                    <span id="productStatus" class="<?= htmlspecialchars($productStatusClass, ENT_QUOTES, 'UTF-8'); ?>">
                        <?= htmlspecialchars($productStatusLabel, ENT_QUOTES, 'UTF-8'); ?>
                    </span>
                </figure>
                <div id="thumbStrip" class="product-gallery__thumbs" aria-label="Listing gallery thumbnails"></div>
            </div>
            <div class="product-summary">
                <div class="product-summary__header">
                    <span id="categoryLine" class="category-pill" <?= $categoryIsHidden ? 'hidden' : ''; ?>>
                        <i class="ri-price-tag-3-line" aria-hidden="true"></i>
                        <span id="categoryLabel"><?= htmlspecialchars($productCategoryLabel, ENT_QUOTES, 'UTF-8'); ?></span>
                    </span>
                    <h1 id="productName"><?= htmlspecialchars($productTitle, ENT_QUOTES, 'UTF-8'); ?></h1>
                    <p id="productPrice" class="product-price"><?= htmlspecialchars($productPriceLabel, ENT_QUOTES, 'UTF-8'); ?></p>
                </div>
                <div class="product-summary__cta">
                    <button id="saveListingBtn" class="save-btn" type="button">
                        <i class="ri-heart-line" aria-hidden="true"></i>
                        Save listing
                    </button>
                    <a
                        id="vendorStorefrontLink"
                        class="storefront-link"
                        href="<?= htmlspecialchars($vendorProfileUrl, ENT_QUOTES, 'UTF-8'); ?>"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        Visit vendor storefront
                    </a>
                </div>
                <ul id="featureList" class="feature-list" hidden></ul>
                <input type="hidden" id="productId" value="<?= htmlspecialchars($productId, ENT_QUOTES, 'UTF-8'); ?>">
            </div>
        </section>
        <section class="product-details-grid">
            <article class="detail-card">
                <h2>About this listing</h2>
                <p id="productDesc" class="product-description">
                    <?= nl2br(htmlspecialchars($productDescription, ENT_QUOTES, 'UTF-8')); ?>
                </p>
            </article>
            <article class="detail-card">
                <h2>Specifications</h2>
                <div id="specList" class="spec-list"></div>
                <p id="specFallback" class="spec-empty">No additional specifications provided yet.</p>
            </article>
        </section>
        <section
            id="quickChatCard"
            class="quick-chat-card"
            data-chat-id="<?= htmlspecialchars($chatId, ENT_QUOTES, 'UTF-8'); ?>"
            data-vendor-id="<?= htmlspecialchars($quickChatVendorId, ENT_QUOTES, 'UTF-8'); ?>"
            data-vendor-uid="<?= htmlspecialchars($quickChatVendorUid, ENT_QUOTES, 'UTF-8'); ?>"
            data-vendor-name="<?= htmlspecialchars($vendorName, ENT_QUOTES, 'UTF-8'); ?>"
            data-buyer-id="<?= htmlspecialchars($buyerNumericId, ENT_QUOTES, 'UTF-8'); ?>"
            data-buyer-uid="<?= htmlspecialchars($buyerUid !== '' ? $buyerUid : $buyerNumericId, ENT_QUOTES, 'UTF-8'); ?>"
            data-product-id="<?= htmlspecialchars($productId, ENT_QUOTES, 'UTF-8'); ?>"
            data-product-title="<?= htmlspecialchars($productTitle, ENT_QUOTES, 'UTF-8'); ?>"
            data-product-image="<?= htmlspecialchars($quickChatProductImage, ENT_QUOTES, 'UTF-8'); ?>"
        >
            <h3>Chat with <?= htmlspecialchars($vendorName, ENT_QUOTES, 'UTF-8'); ?><?= $vendorVerificationBadge; ?></h3>
            <p>Send a quick message and we'll notify the vendor instantly, then open a secure YUSTAM chat so you can keep the conversation going.</p>
            <form id="quickChatForm" class="quick-form">
                <div class="quick-input">
                    <input
                        id="quickMessageInput"
                        type="text"
                        name="quickMessage"
                        placeholder="Ask about pricing, delivery, or product condition"
                        autocomplete="off"
                    >
                    <button id="quickMessageSubmit" type="submit" aria-label="Send quick message">
                        <i class="ri-send-plane-fill" aria-hidden="true"></i>
                    </button>
                </div>
            </form>
            <div class="quick-suggestions" aria-label="Quick message suggestions">
                <button type="button" class="suggestion-chip" data-quick-message="Is this still available?">Is this still available?</button>
                <button type="button" class="suggestion-chip" data-quick-message="Can I get a better price?">Can I get a better price?</button>
                <button type="button" class="suggestion-chip" data-quick-message="What condition is it in?">What condition is it in?</button>
                <button type="button" class="suggestion-chip" data-quick-message="Can you deliver to my location?">Can you deliver to my location?</button>
            </div>
            <small class="quick-note">We send your message right away so it's waiting in the chat when you arrive.</small>
        </section>
        <section class="vendor-card" aria-labelledby="vendorTitle">
            <header class="vendor-card__header">
                <img id="vendorAvatar" src="<?= htmlspecialchars($vendorAvatarSrc, ENT_QUOTES, 'UTF-8'); ?>" alt="Vendor profile photo" class="vendor-avatar">
                <div>
                    <h2 id="vendorTitle"><?= htmlspecialchars($vendorName, ENT_QUOTES, 'UTF-8'); ?><?= $vendorVerificationBadge; ?></h2>
                    <p id="vendorBusiness" class="vendor-business" <?= $vendorBusinessHidden ? 'hidden' : ''; ?>>
                        <?= htmlspecialchars($vendorBusinessName, ENT_QUOTES, 'UTF-8'); ?>
                    </p>
                    <div class="vendor-badges" id="vendorBadges">
                        <span
                            class="vendor-badge vendor-plan vendor-plan-<?= htmlspecialchars($vendorPlanSlug, ENT_QUOTES, 'UTF-8'); ?>"
                            id="vendorPlanBadge"
                        >
                            <i class="ri-vip-crown-fill" aria-hidden="true"></i>
                            <?= htmlspecialchars($vendorPlanLabel, ENT_QUOTES, 'UTF-8'); ?>
                        </span>
                        <span
                            class="vendor-badge vendor-verified <?= htmlspecialchars($vendorVerificationState, ENT_QUOTES, 'UTF-8'); ?>"
                            id="vendorVerifiedBadge"
                        >
                            <i class="<?= htmlspecialchars($vendorVerificationIcon, ENT_QUOTES, 'UTF-8'); ?>" aria-hidden="true"></i>
                            <?= htmlspecialchars($vendorVerificationLabel, ENT_QUOTES, 'UTF-8'); ?>
                        </span>
                    </div>
                </div>
            </header>
            <div class="vendor-card__contact">
                <a
                    id="vendorPhoneLink"
                    class="<?= htmlspecialchars($vendorPhoneLinkClass, ENT_QUOTES, 'UTF-8'); ?>"
                    href="<?= htmlspecialchars($vendorPhoneSanitised !== '' ? $vendorPhoneHref : '#', ENT_QUOTES, 'UTF-8'); ?>"
                    aria-disabled="<?= htmlspecialchars($vendorPhoneAriaDisabled, ENT_QUOTES, 'UTF-8'); ?>"
                    data-display-label="Call Vendor"
                >
                    <i class="ri-phone-line" aria-hidden="true"></i>
                    <span data-contact-label>Call Vendor</span>
                    <span data-contact-value><?= htmlspecialchars($vendorPhoneDisplay, ENT_QUOTES, 'UTF-8'); ?></span>
                </a>
                <a
                    id="vendorWhatsappLink"
                    class="<?= htmlspecialchars($vendorWhatsappLinkClass, ENT_QUOTES, 'UTF-8'); ?>"
                    href="<?= htmlspecialchars($vendorWhatsappHref !== '' ? $vendorWhatsappHref : '#', ENT_QUOTES, 'UTF-8'); ?>"
                    target="_blank"
                    rel="noopener"
                    aria-disabled="<?= htmlspecialchars($vendorWhatsappAriaDisabled, ENT_QUOTES, 'UTF-8'); ?>"
                    data-display-label="WhatsApp Vendor"
                >
                    <i class="ri-whatsapp-line" aria-hidden="true"></i>
                    <span data-contact-label>WhatsApp Vendor</span>
                </a>
            </div>
            <div class="vendor-card__details">
                <div class="vendor-card__detail">
                    <span class="label">Email</span>
                    <a id="vendorEmailLink" href="<?= htmlspecialchars($vendorEmailHref, ENT_QUOTES, 'UTF-8'); ?>" aria-disabled="<?= htmlspecialchars($vendorEmailAriaDisabled, ENT_QUOTES, 'UTF-8'); ?>">
                        <?= htmlspecialchars($vendorEmailAvailable ? $vendorEmail : 'Unavailable', ENT_QUOTES, 'UTF-8'); ?>
                    </a>
                </div>
                <div id="vendorLocationRow" class="vendor-card__detail" <?= $vendorLocationHidden ? 'hidden' : ''; ?>>
                    <span class="label">Location</span>
                    <span id="vendorLocation"><?= htmlspecialchars($vendorLocationDisplay, ENT_QUOTES, 'UTF-8'); ?></span>
                </div>
                <div id="vendorSinceRow" class="vendor-card__detail" <?= $vendorSinceHidden ? 'hidden' : ''; ?>>
                    <span class="label">Member since</span>
                    <span id="vendorSince"><?= htmlspecialchars($vendorSinceDisplay, ENT_QUOTES, 'UTF-8'); ?></span>
                </div>
            </div>
        </section>
    </main>
    <footer class="product-footer">
        <div class="product-footer__inner">
            <nav class="footer-links" aria-label="Footer navigation">
                <a href="index.html">Home</a>
                <a href="shop.html">Shop</a>
                <a href="vendor-register.html">Become a vendor</a>
                <a href="contact.html">Contact</a>
            </nav>
            <div class="footer-social" aria-label="Social media links">
                <a href="https://wa.me/2347012345678" aria-label="WhatsApp">
                    <i class="ri-whatsapp-line"></i>
                </a>
                <a href="https://instagram.com" aria-label="Instagram">
                    <i class="ri-instagram-line"></i>
                </a>
                <a href="https://facebook.com" aria-label="Facebook">
                    <i class="ri-facebook-circle-line"></i>
                </a>
            </div>
            <small>&copy; <?= date('Y'); ?> YUSTAM Marketplace. All rights reserved.</small>
        </div>
    </footer>
    <script type="application/json" id="productInitialData"><?= json_encode($initialState, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE); ?></script>
    <script src="theme-manager.js" defer></script>
    <script type="module" src="product.js"></script>
    <script type="module" src="firebase.js"></script>
</body>
</html>

