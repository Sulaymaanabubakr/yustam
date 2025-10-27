<?php
require_once __DIR__ . '/session-path.php';
session_start();
require_once __DIR__ . '/db.php';
if (!isset($_SESSION['admin_id'])) {
    header('Location: admin-login.php');
    exit;
}
$id = isset($_POST['id']) ? (int)$_POST['id'] : 0;
$action = isset($_POST['action']) ? $_POST['action'] : '';
if ($id <= 0 || !in_array($action, ['approve', 'reject'], true)) {
    header('Location: admin-verifications.php');
    exit;
}
$db = get_db_connection();
$status = $action === 'approve' ? 'approved' : 'rejected';
$feedback = $action === 'reject' ? (trim($_POST['feedback'] ?? 'Rejected by admin') ?: 'Rejected by admin') : '';
$sql = "UPDATE vendor_verifications SET status = ?, feedback = ? WHERE id = ? LIMIT 1";
$stmt = $db->prepare($sql);
$stmt->bind_param('ssi', $status, $feedback, $id);
$stmt->execute();
$stmt->close();
header('Location: admin-verifications.php');
exit;
