<?php
ini_set('session.save_path', '/home2/yustamco/tmp');
session_start();

require_once __DIR__ . '/db.php';

header('Content-Type: application/json');

if (!isset($_SESSION['vendor_id'])) {
    echo json_encode(['success' => false, 'message' => 'Not authenticated.']);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'message' => 'Invalid request method.']);
    exit;
}

$vendorId = (int) $_SESSION['vendor_id'];
$conn = get_db_connection();
$vendorTable = YUSTAM_VENDORS_TABLE;

if (!preg_match('/^[A-Za-z0-9_]+$/', $vendorTable)) {
    echo json_encode(['success' => false, 'message' => 'Invalid vendor table configuration.']);
    exit;
}

$fullName        = trim($_POST['name'] ?? '');
$businessName    = trim($_POST['business_name'] ?? '');
$phone           = trim($_POST['phone'] ?? '');
$state           = trim($_POST['state'] ?? '');
$businessAddress = trim($_POST['business_address'] ?? '');
$category        = trim($_POST['category'] ?? '');

if ($fullName === '' || $businessName === '') {
    echo json_encode(['success' => false, 'message' => 'Full name and business name are required.']);
    exit;
}

$avatarUrl = null;

if (isset($_FILES['profile_photo']) && $_FILES['profile_photo']['error'] === UPLOAD_ERR_OK) {
    $originalName = $_FILES['profile_photo']['name'];
    $extension = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));
    $allowed = ['jpg', 'jpeg', 'png', 'gif', 'webp'];

    if (!in_array($extension, $allowed, true)) {
        echo json_encode(['success' => false, 'message' => 'Unsupported image type.']);
        exit;
    }

    $uploadDir = __DIR__ . '/uploads/';
    if (!is_dir($uploadDir) && !mkdir($uploadDir, 0755, true) && !is_dir($uploadDir)) {
        echo json_encode(['success' => false, 'message' => 'Unable to prepare upload directory.']);
        exit;
    }

    $fileName = sprintf('vendor_%d_%d.%s', $vendorId, time(), $extension);
    $destination = $uploadDir . $fileName;

    if (!move_uploaded_file($_FILES['profile_photo']['tmp_name'], $destination)) {
        echo json_encode(['success' => false, 'message' => 'Failed to upload profile photo.']);
        exit;
    }

    $avatarUrl = 'uploads/' . $fileName;
}

$columns = yustam_vendor_table_columns();
$updateParts = [];
$types = '';
$values = [];

if (in_array('full_name', $columns, true)) {
    $updateParts[] = 'full_name = ?';
    $types .= 's';
    $values[] = $fullName;
}

if (in_array('business_name', $columns, true)) {
    $updateParts[] = 'business_name = ?';
    $types .= 's';
    $values[] = $businessName;
}

if (in_array('phone', $columns, true)) {
    $updateParts[] = 'phone = ?';
    $types .= 's';
    $values[] = $phone;
}

if (in_array('state', $columns, true)) {
    $updateParts[] = 'state = ?';
    $types .= 's';
    $values[] = $state;
}

if (in_array('business_address', $columns, true)) {
    $updateParts[] = 'business_address = ?';
    $types .= 's';
    $values[] = $businessAddress;
}

if ($category !== '' && in_array('category', $columns, true)) {
    $updateParts[] = 'category = ?';
    $types .= 's';
    $values[] = $category;
}

if ($avatarUrl !== null && in_array('avatar_url', $columns, true)) {
    $updateParts[] = 'avatar_url = ?';
    $types .= 's';
    $values[] = $avatarUrl;
}

if (in_array('updated_at', $columns, true)) {
    $updateParts[] = 'updated_at = NOW()';
}

if (!$updateParts) {
    echo json_encode(['success' => false, 'message' => 'Nothing to update for this account.']);
    exit;
}

$values[] = $vendorId;
$types .= 'i';

$sql = sprintf(
    'UPDATE `%s` SET %s WHERE id = ?',
    $vendorTable,
    implode(', ', $updateParts)
);

$stmt = $conn->prepare($sql);

if ($types !== '' && strpos($sql, '?') !== false) {
    $stmt->bind_param($types, ...$values);
}

try {
    $stmt->execute();
    $_SESSION['vendor_name'] = $fullName;
    echo json_encode(['success' => true, 'message' => 'Profile updated successfully.']);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
}

$stmt->close();


