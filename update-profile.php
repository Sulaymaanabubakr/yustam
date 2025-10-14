<?php
ini_set('session.save_path', '/home2/yustamco/tmp');
session_start();

header('Content-Type: application/json');

if (!isset($_SESSION['vendor_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'You must be signed in to update your profile.']);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Invalid request method.']);
    exit;
}

require_once __DIR__ . '/db.php';

$vendorId = (int)$_SESSION['vendor_id'];
$name = trim($_POST['name'] ?? '');
$businessName = trim($_POST['business_name'] ?? '');
$phone = trim($_POST['phone'] ?? '');
$address = trim($_POST['address'] ?? '');
$state = trim($_POST['state'] ?? '');

if ($name === '' || $businessName === '' || $address === '' || $state === '') {
    echo json_encode(['success' => false, 'message' => 'Please complete all required fields.']);
    exit;
}

$profilePhotoPath = null;
$profilePhotoUrl = trim($_POST['profile_photo_url'] ?? '');

if ($profilePhotoUrl !== '') {
    if (!filter_var($profilePhotoUrl, FILTER_VALIDATE_URL)) {
        echo json_encode(['success' => false, 'message' => 'Please provide a valid profile photo URL.']);
        exit;
    }
    $profilePhotoPath = $profilePhotoUrl;
} elseif (!empty($_FILES['avatar']['name'])) {
    $file = $_FILES['avatar'];
    if ($file['error'] !== UPLOAD_ERR_OK) {
        echo json_encode(['success' => false, 'message' => 'We could not upload the selected image.']);
        exit;
    }

    $allowedMime = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/gif' => 'gif'];
    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $mime = finfo_file($finfo, $file['tmp_name']);
    finfo_close($finfo);

    if (!isset($allowedMime[$mime])) {
        echo json_encode(['success' => false, 'message' => 'Please upload a JPG, PNG, or GIF image.']);
        exit;
    }

    if ($file['size'] > 2 * 1024 * 1024) {
        echo json_encode(['success' => false, 'message' => 'Profile photo must be under 2MB.']);
        exit;
    }

    $uploadsDir = __DIR__ . '/uploads/vendor-avatars';
    if (!is_dir($uploadsDir)) {
        mkdir($uploadsDir, 0775, true);
    }

    $extension = $allowedMime[$mime];
    $filename = sprintf('vendor_%d_%s.%s', $vendorId, bin2hex(random_bytes(4)), $extension);
    $destination = $uploadsDir . '/' . $filename;

    if (!move_uploaded_file($file['tmp_name'], $destination)) {
        echo json_encode(['success' => false, 'message' => 'Could not save the uploaded image.']);
        exit;
    }

    $profilePhotoPath = 'uploads/vendor-avatars/' . $filename;
}

try {
    $db = get_db_connection();

    $nameColumn = yustam_users_column('name');

    $setParts = [];
    $types = '';
    $params = [];

    $setParts[] = $nameColumn . ' = ?';
    $types .= 's';
    $params[] = $name;

    if (yustam_users_table_has_column('business_name')) {
        $setParts[] = 'business_name = ?';
        $types .= 's';
        $params[] = $businessName;
    }

    if (yustam_users_table_has_column('phone')) {
        $setParts[] = 'phone = ?';
        $types .= 's';
        $params[] = $phone;
    }

    if (yustam_users_table_has_column('business_address')) {
        $setParts[] = 'business_address = ?';
        $types .= 's';
        $params[] = $address;
    }

    if (yustam_users_table_has_column('state')) {
        $setParts[] = 'state = ?';
        $types .= 's';
        $params[] = $state;
    }

    if ($profilePhotoPath && yustam_users_table_has_column('profile_photo')) {
        $setParts[] = 'profile_photo = ?';
        $types .= 's';
        $params[] = $profilePhotoPath;
    }

    if (yustam_users_table_has_column('updated_at')) {
        $setParts[] = 'updated_at = NOW()';
    }

    $sql = 'UPDATE ' . YUSTAM_USERS_TABLE . ' SET ' . implode(', ', $setParts) . ' WHERE id = ?';
    $types .= 'i';
    $params[] = $vendorId;

    $stmt = $db->prepare($sql);
    $stmt->bind_param($types, ...$params);
    $stmt->execute();
    $stmt->close();

    $_SESSION['vendor_name'] = $name;

    $stmt = $db->prepare('SELECT * FROM ' . YUSTAM_USERS_TABLE . ' WHERE id = ? LIMIT 1');
    $stmt->bind_param('i', $vendorId);
    $stmt->execute();
    $result = $stmt->get_result();
    $vendor = $result->fetch_assoc();
    $stmt->close();

    $profile = [
        'name' => $vendor[$nameColumn] ?? $name,
        'businessName' => yustam_users_table_has_column('business_name') ? ($vendor['business_name'] ?? $businessName) : $businessName,
        'email' => $vendor['email'] ?? '',
        'phone' => yustam_users_table_has_column('phone') ? ($vendor['phone'] ?? $phone) : $phone,
        'address' => yustam_users_table_has_column('business_address') ? ($vendor['business_address'] ?? $address) : $address,
        'state' => yustam_users_table_has_column('state') ? ($vendor['state'] ?? $state) : $state,
        'plan' => yustam_users_table_has_column('plan') ? ($vendor['plan'] ?? 'Free') : 'Free',
        'joined' => (yustam_users_table_has_column('created_at') && isset($vendor['created_at'])) ? date('j M Y', strtotime($vendor['created_at'])) : '—',
        'profilePhoto' => yustam_users_table_has_column('profile_photo') ? ($vendor['profile_photo'] ?? ($profilePhotoPath ?: '')) : ($profilePhotoPath ?: ''),
    ];

    echo json_encode(['success' => true, 'message' => 'Profile updated successfully.', 'profile' => $profile]);
} catch (Throwable $e) {
    error_log('Profile update error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Unable to update profile at the moment.']);
}
