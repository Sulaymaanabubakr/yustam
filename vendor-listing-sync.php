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

$payload = json_decode(file_get_contents('php://input'), true);
if (!is_array($payload)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid request payload.']);
    exit;
}

$firestoreId = trim((string) ($payload['firestoreId'] ?? $payload['firestore_id'] ?? ''));
if ($firestoreId === '') {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Listing identifier is required.']);
    exit;
}

require_once __DIR__ . '/db.php';

$conn = get_db_connection();
yustam_listings_ensure_table($conn);

$vendorId = (int) $_SESSION['vendor_id'];
$vendorUid = trim((string) ($payload['vendorUid'] ?? $_SESSION['vendor_uid'] ?? ''));

if ($vendorUid === '' && $vendorId > 0) {
    try {
        $vendorRecord = yustam_vendor_find_by_id($vendorId, $conn);
        if ($vendorRecord) {
            $vendorUid = yustam_vendor_assign_uid_if_missing($conn, $vendorRecord);
            $_SESSION['vendor_uid'] = $vendorUid;
        }
    } catch (Throwable $exception) {
        error_log('Vendor UID assignment failed: ' . $exception->getMessage());
    }
}

$title = trim((string) ($payload['title'] ?? 'Marketplace Listing'));
if ($title === '') {
    $title = 'Marketplace Listing';
}

$description = trim((string) ($payload['description'] ?? ''));
$status = trim((string) ($payload['status'] ?? 'pending'));
if ($status === '') {
    $status = 'pending';
}

$priceValue = null;
if (isset($payload['price']) && $payload['price'] !== '') {
    $priceValue = (float) preg_replace('/[^0-9.\-]/', '', (string) $payload['price']);
}

$imageUrls = $payload['imageUrls'] ?? $payload['image_urls'] ?? [];
$primaryImage = trim((string) ($payload['primaryImage'] ?? $payload['primary_image'] ?? ''));
if ($primaryImage === '' && is_array($imageUrls) && isset($imageUrls[0])) {
    $primaryImage = trim((string) $imageUrls[0]);
}

$category = trim((string) ($payload['category'] ?? ''));
$subcategory = trim((string) ($payload['subcategory'] ?? ''));

$location = trim((string) ($payload['location'] ?? ''));
$city = trim((string) ($payload['city'] ?? ''));
$state = trim((string) ($payload['state'] ?? ''));
$country = trim((string) ($payload['country'] ?? ''));

try {
    yustam_listings_upsert($conn, [
        'vendor_id' => $vendorId,
        'vendor_uid' => $vendorUid,
        'firestore_id' => $firestoreId,
        'title' => $title,
        'description' => $description,
        'price' => $priceValue,
        'status' => $status,
        'primary_image' => $primaryImage,
        'image_urls' => $imageUrls,
        'category' => $category,
        'subcategory' => $subcategory,
        'location' => $location,
        'city' => $city,
        'state' => $state,
        'country' => $country,
    ]);

    echo json_encode(['success' => true]);
} catch (Throwable $exception) {
    error_log('Listing sync failed: ' . $exception->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Unable to save listing at this time.']);
}
