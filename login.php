<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);
require_once __DIR__ . '/session-path.php';
session_start();

require_once __DIR__ . '/db.php';
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'message' => 'Invalid request method.']);
    exit;
}

$email = strtolower(trim($_POST['email'] ?? ''));
$password = $_POST['password'] ?? '';

if ($email === '' || $password === '') {
    echo json_encode(['success' => false, 'message' => 'Please enter both email and password.']);
    exit;
}

try {
    $db = get_db_connection();
    $vendorTable = YUSTAM_VENDORS_TABLE;
    if (!preg_match('/^[A-Za-z0-9_]+$/', $vendorTable)) {
        throw new RuntimeException('Invalid vendor table name.');
    }

    $stmt = $db->prepare(sprintf(
        'SELECT id, full_name, email, password, verified FROM `%s` WHERE email = ? LIMIT 1',
        $vendorTable
    ));
    $stmt->bind_param("s", $email);
    $stmt->execute();
    $result = $stmt->get_result();
    $user = $result->fetch_assoc();
    $stmt->close();

    if (!$user) {
        echo json_encode(['success' => false, 'message' => 'Incorrect email or password.']);
        exit;
    }

    if (!password_verify($password, $user['password'])) {
        echo json_encode(['success' => false, 'message' => 'Incorrect email or password.']);
        exit;
    }

    if (array_key_exists('verified', $user) && (int)$user['verified'] === 0) {
        echo json_encode(['success' => false, 'message' => 'Please verify your email before logging in.']);
        exit;
    }

    // Create session
    $_SESSION['vendor_id'] = $user['id'];
    $_SESSION['vendor_name'] = $user['full_name'] ?? '';
    $_SESSION['vendor_email'] = $user['email'];

    // Update last login
    if (yustam_vendor_table_has_column('updated_at')) {
        $update = $db->prepare(sprintf('UPDATE `%s` SET updated_at = NOW() WHERE id = ?', $vendorTable));
        $update->bind_param("i", $user['id']);
        $update->execute();
        $update->close();
    }

    echo json_encode([
        'success' => true,
        'message' => 'Login successful. Redirecting...',
        'redirect' => 'vendor-dashboard.php'
    ]);

} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
}
?>
