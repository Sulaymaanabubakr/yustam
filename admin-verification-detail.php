<?php
require_once __DIR__ . '/session-path.php';
session_start();
require_once __DIR__ . '/db.php';
header('Content-Type: application/json');
if (!isset($_SESSION['admin_id'])) {
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}
$id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
if ($id <= 0) {
    echo json_encode(['error' => 'Invalid ID']);
    exit;
}
$db = get_db_connection();
$sql = "SELECT v.id, v.vendor_id, v.status, v.submitted_at, v.feedback, v.files, vd.business_name, vd.email, vd.phone, vd.state FROM vendor_verifications v JOIN vendors vd ON v.vendor_id = vd.id WHERE v.id = ? LIMIT 1";
$stmt = $db->prepare($sql);
$stmt->bind_param('i', $id);
$stmt->execute();
$result = $stmt->get_result();
$row = $result->fetch_assoc();
$stmt->close();
if (!$row) {
    echo json_encode(['error' => 'Not found']);
    exit;
}
$row['files'] = json_decode($row['files'] ?? '[]', true);
echo json_encode($row);
