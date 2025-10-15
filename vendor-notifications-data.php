<?php
declare(strict_types=1);

require_once __DIR__ . '/session-path.php';
session_start();

if (!isset($_SESSION['vendor_id'])) {
    http_response_code(401);
    header('Content-Type: application/json');
    echo json_encode(['success' => false, 'message' => 'Please sign in to continue.']);
    exit;
}

require_once __DIR__ . '/db.php';

header('Content-Type: application/json');

$vendorId = (int) $_SESSION['vendor_id'];

function respond_vendor_notifications(array $payload, int $statusCode = 200): void
{
    http_response_code($statusCode);
    echo json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}

function vendor_notifications_table_name(): string
{
    if (defined('YUSTAM_VENDOR_NOTIFICATIONS_TABLE') && preg_match('/^[A-Za-z0-9_]+$/', (string) YUSTAM_VENDOR_NOTIFICATIONS_TABLE)) {
        return YUSTAM_VENDOR_NOTIFICATIONS_TABLE;
    }

    return 'vendor_notifications';
}

function vendor_notifications_bind(mysqli_stmt $stmt, string $types, array $values): void
{
    if ($types === '') {
        return;
    }

    $params = [$types];
    foreach ($values as $key => $value) {
        $params[] = &$values[$key];
    }

    call_user_func_array([$stmt, 'bind_param'], $params);
}

function vendor_notifications_ensure(mysqli $db): void
{
    static $ensured = false;
    if ($ensured) {
        return;
    }

    $table = vendor_notifications_table_name();
    $sql = sprintf(
        'CREATE TABLE IF NOT EXISTS `%s` (
            `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            `vendor_id` INT NOT NULL,
            `title` VARCHAR(255) NOT NULL,
            `message` VARCHAR(255) NOT NULL,
            `detail` TEXT NULL,
            `type` VARCHAR(32) NOT NULL DEFAULT \'bell\',
            `status` VARCHAR(16) NOT NULL DEFAULT \'new\',
            `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            `created_by` INT NULL,
            INDEX `vendor_id_index` (`vendor_id`),
            INDEX `status_index` (`status`),
            INDEX `created_at_index` (`created_at`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;',
        $table
    );

    try {
        $db->query($sql);
        $ensured = true;
    } catch (Throwable $exception) {
        error_log('Unable to ensure vendor notifications table: ' . $exception->getMessage());
    }
}

try {
    $db = get_db_connection();
    vendor_notifications_ensure($db);
} catch (Throwable $exception) {
    respond_vendor_notifications(['success' => false, 'message' => 'Unable to connect to the database.'], 500);
}

$table = vendor_notifications_table_name();

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $rawBody = file_get_contents('php://input');
    $payload = json_decode($rawBody, true);
    if (!is_array($payload)) {
        $payload = $_POST;
    }

    $action = isset($payload['action']) ? strtolower(trim((string) $payload['action'])) : '';
    if ($action === '') {
        respond_vendor_notifications(['success' => false, 'message' => 'No action supplied.'], 400);
    }

    if ($action === 'markallread') {
        $sql = sprintf('UPDATE `%s` SET `status` = \'read\' WHERE vendor_id = ? AND `status` = \'new\'', $table);
        $stmt = $db->prepare($sql);
        if ($stmt instanceof mysqli_stmt) {
            vendor_notifications_bind($stmt, 'i', [$vendorId]);
            $stmt->execute();
            $stmt->close();
        }

        respond_vendor_notifications(['success' => true, 'message' => 'Notifications marked as read.']);
    }

    if ($action === 'clearall') {
        $stmt = $db->prepare(sprintf('DELETE FROM `%s` WHERE vendor_id = ?', $table));
        if ($stmt instanceof mysqli_stmt) {
            vendor_notifications_bind($stmt, 'i', [$vendorId]);
            $stmt->execute();
            $stmt->close();
        }

        respond_vendor_notifications(['success' => true, 'message' => 'Notifications cleared.']);
    }

    respond_vendor_notifications(['success' => false, 'message' => 'Unsupported action supplied.'], 400);
}

$stmt = $db->prepare(sprintf('SELECT id, title, message, detail, type, status, created_at FROM `%s` WHERE vendor_id = ? ORDER BY created_at DESC', $table));
if ($stmt === false) {
    respond_vendor_notifications(['success' => false, 'message' => 'Unable to load notifications.'], 500);
}

vendor_notifications_bind($stmt, 'i', [$vendorId]);
$stmt->execute();
$result = $stmt->get_result();
$notifications = [];

if ($result instanceof mysqli_result) {
    while ($row = $result->fetch_assoc()) {
        $createdAt = $row['created_at'] ?? '';
        $createdLabel = '';
        if ($createdAt !== '') {
            $timestamp = strtotime((string) $createdAt);
            if ($timestamp) {
                $createdLabel = date('M j, Y g:i A', $timestamp);
                $createdAt = date(DATE_ATOM, $timestamp);
            }
        }

        $notifications[] = [
            'id' => (int) ($row['id'] ?? 0),
            'title' => (string) ($row['title'] ?? ''),
            'message' => (string) ($row['message'] ?? ''),
            'detail' => (string) ($row['detail'] ?? ''),
            'type' => (string) ($row['type'] ?? 'bell'),
            'status' => (string) ($row['status'] ?? 'new'),
            'createdAt' => $createdAt,
            'createdLabel' => $createdLabel,
        ];
    }
    $result->free();
}

$stmt->close();

respond_vendor_notifications([
    'success' => true,
    'data' => [
        'notifications' => $notifications,
    ],
]);
?>
