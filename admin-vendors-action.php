<?php
declare(strict_types=1);

require_once __DIR__ . '/admin-session.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/send-email.php';

require_admin_auth();

header('Content-Type: application/json');

function respond_vendor_action(array $payload, int $statusCode = 200): void
{
    http_response_code($statusCode);
    echo json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}

function vendor_action_bind(mysqli_stmt $statement, string $types, array $values): void
{
    if ($types === '') {
        return;
    }

    $params = [$types];
    foreach ($values as $key => $value) {
        $params[] = &$values[$key];
    }

    call_user_func_array([$statement, 'bind_param'], $params);
}

function vendor_table_exists(mysqli $db, string $table): bool
{
    $table = $db->real_escape_string($table);
    $sql = sprintf("SHOW TABLES LIKE '%s'", $table);
    $result = $db->query($sql);
    if ($result instanceof mysqli_result) {
        $exists = $result->num_rows > 0;
        $result->free();
        return $exists;
    }

    return false;
}

function vendor_notifications_table(): string
{
    if (defined('YUSTAM_VENDOR_NOTIFICATIONS_TABLE') && preg_match('/^[A-Za-z0-9_]+$/', (string) YUSTAM_VENDOR_NOTIFICATIONS_TABLE)) {
        return YUSTAM_VENDOR_NOTIFICATIONS_TABLE;
    }

    return 'vendor_notifications';
}

function vendor_notifications_ensure_table(mysqli $db): void
{
    static $ensured = false;

    if ($ensured) {
        return;
    }

    $table = vendor_notifications_table();
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

function vendor_notifications_insert(
    mysqli $db,
    int $vendorId,
    string $title,
    string $message,
    string $detail = '',
    string $type = 'bell',
    string $status = 'new',
    ?int $createdBy = null
): void {
    vendor_notifications_ensure_table($db);
    $table = vendor_notifications_table();

    if ($createdBy !== null && $createdBy > 0) {
        $sql = sprintf(
            'INSERT INTO `%s` (vendor_id, title, message, detail, type, status, created_at, created_by)
             VALUES (?, ?, ?, ?, ?, ?, NOW(), ?)',
            $table
        );

        $stmt = $db->prepare($sql);
        if ($stmt instanceof mysqli_stmt) {
            vendor_action_bind($stmt, 'isssssi', [$vendorId, $title, $message, $detail, $type, $status, $createdBy]);
            $stmt->execute();
            $stmt->close();
        }
        return;
    }

    $sql = sprintf(
        'INSERT INTO `%s` (vendor_id, title, message, detail, type, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, NOW())',
        $table
    );
    $stmt = $db->prepare($sql);
    if ($stmt instanceof mysqli_stmt) {
        vendor_action_bind($stmt, 'isssss', [$vendorId, $title, $message, $detail, $type, $status]);
        $stmt->execute();
        $stmt->close();
    }
}

$rawBody = file_get_contents('php://input');
$data = json_decode($rawBody, true);
if (!is_array($data)) {
    $data = $_POST;
}

$vendorId = isset($data['vendorId']) ? (int) $data['vendorId'] : 0;
$action = isset($data['action']) ? strtolower(trim((string) $data['action'])) : '';

if ($vendorId <= 0 || $action === '') {
    respond_vendor_action([
        'success' => false,
        'message' => 'Invalid request payload supplied.',
    ], 400);
}

try {
    $db = get_db_connection();
} catch (Throwable $exception) {
    respond_vendor_action([
        'success' => false,
        'message' => 'Unable to connect to the database.',
    ], 500);
}

$vendorTable = defined('YUSTAM_VENDORS_TABLE') && preg_match('/^[A-Za-z0-9_]+$/', (string) YUSTAM_VENDORS_TABLE)
    ? YUSTAM_VENDORS_TABLE
    : 'vendors';

$stmt = $db->prepare(sprintf('SELECT * FROM `%s` WHERE id = ? LIMIT 1', $vendorTable));
if ($stmt === false) {
    respond_vendor_action([
        'success' => false,
        'message' => 'Unable to prepare vendor lookup.',
    ], 500);
}
vendor_action_bind($stmt, 'i', [$vendorId]);
$stmt->execute();
$result = $stmt->get_result();
$vendor = $result ? $result->fetch_assoc() : null;
$stmt->close();

if (!$vendor) {
    respond_vendor_action([
        'success' => false,
        'message' => 'Vendor account not found.',
    ], 404);
}

$columns = yustam_vendor_table_columns();
$hasStatusColumn = in_array('status', $columns, true);
$hasUpdatedColumn = yustam_vendor_table_has_column('updated_at');
$hasEmailColumn = array_key_exists('email', $vendor);
$adminId = isset($_SESSION['admin_id']) ? (int) $_SESSION['admin_id'] : null;
$vendorName = (string) ($vendor['name'] ?? $vendor['full_name'] ?? $vendor['business_name'] ?? 'Vendor');

switch ($action) {
    case 'suspend':
    case 'activate': {
        if (!$hasStatusColumn) {
            respond_vendor_action([
                'success' => false,
                'message' => 'Vendor status tracking is not configured for this account.',
            ], 400);
        }

        $newStatus = $action === 'suspend' ? 'suspended' : 'active';
        $setClauses = ['`status` = ?'];
        $types = 'si';
        $values = [$newStatus, $vendorId];

        if ($hasUpdatedColumn) {
            $setClauses[] = '`updated_at` = NOW()';
            $types = 'si';
        }

        $updateSql = sprintf('UPDATE `%s` SET %s WHERE id = ?', $vendorTable, implode(', ', $setClauses));
        $updateStmt = $db->prepare($updateSql);
        if ($updateStmt === false) {
            respond_vendor_action([
                'success' => false,
                'message' => 'Unable to prepare status update.',
            ], 500);
        }

        $bindValues = [$newStatus];
        if ($hasUpdatedColumn) {
            $types = 'si';
        }
        $bindValues[] = $vendorId;
        vendor_action_bind($updateStmt, $types, $bindValues);
        $updateStmt->execute();
        $updateStmt->close();

        if ($newStatus === 'suspended') {
            vendor_notifications_insert(
                $db,
                $vendorId,
                'Account Suspended',
                'Your vendor account has been suspended.',
                'Your storefront access is currently disabled. Please contact support to resolve any outstanding issues and regain access.',
                'alert',
                'new',
                $adminId
            );
        } else {
            vendor_notifications_insert(
                $db,
                $vendorId,
                'Account Reactivated',
                'Your vendor account is active again.',
                'You can continue posting listings and managing your storefront on YUSTAM.',
                'shield-check',
                'new',
                $adminId
            );
        }

        respond_vendor_action([
            'success' => true,
            'message' => $action === 'suspend' ? 'Vendor account suspended.' : 'Vendor account reactivated.',
        ]);
    }
    case 'delete': {
        $cascade = !empty($data['cascade']);
        $db->begin_transaction();
        try {
            if ($cascade && vendor_table_exists($db, 'listings')) {
                $deleteListingsStmt = $db->prepare('DELETE FROM `listings` WHERE vendor_id = ?');
                if ($deleteListingsStmt) {
                    vendor_action_bind($deleteListingsStmt, 'i', [$vendorId]);
                    $deleteListingsStmt->execute();
                    $deleteListingsStmt->close();
                }
            }

            $deleteVendorStmt = $db->prepare(sprintf('DELETE FROM `%s` WHERE id = ?', $vendorTable));
            if ($deleteVendorStmt === false) {
                throw new RuntimeException('Unable to prepare vendor deletion.');
            }
            vendor_action_bind($deleteVendorStmt, 'i', [$vendorId]);
            $deleteVendorStmt->execute();
            $deleteVendorStmt->close();

            vendor_notifications_ensure_table($db);
            $notificationsTable = vendor_notifications_table();
            if (vendor_table_exists($db, $notificationsTable)) {
                $deleteNotificationsStmt = $db->prepare(sprintf('DELETE FROM `%s` WHERE vendor_id = ?', $notificationsTable));
                if ($deleteNotificationsStmt instanceof mysqli_stmt) {
                    vendor_action_bind($deleteNotificationsStmt, 'i', [$vendorId]);
                    $deleteNotificationsStmt->execute();
                    $deleteNotificationsStmt->close();
                }
            }

            $db->commit();
        } catch (Throwable $exception) {
            $db->rollback();
            respond_vendor_action([
                'success' => false,
                'message' => 'Unable to delete vendor account. Please try again.',
            ], 500);
        }

        respond_vendor_action([
            'success' => true,
            'message' => $cascade ? 'Vendor and associated listings deleted.' : 'Vendor account deleted successfully.',
        ]);
    }
    case 'notify': {
        $message = isset($data['message']) ? trim((string) $data['message']) : '';
        if ($message === '') {
            respond_vendor_action([
                'success' => false,
                'message' => 'Write a message before sending a notification.',
            ], 400);
        }

        if (!$hasEmailColumn || empty($vendor['email'])) {
            respond_vendor_action([
                'success' => false,
                'message' => 'This vendor does not have an email address on record.',
            ], 400);
        }

        $subject = 'Message from YUSTAM Marketplace Admin';
        $emailBody = sprintf(
            '<p>Hello %s,</p><p>%s</p><p>Regards,<br>YUSTAM Marketplace Admin Team</p>',
            htmlspecialchars((string) ($vendor['name'] ?? $vendor['business_name'] ?? 'Vendor'), ENT_QUOTES, 'UTF-8'),
            nl2br(htmlspecialchars($message, ENT_QUOTES, 'UTF-8'))
        );

        if (!sendEmail($vendor['email'], $subject, $emailBody)) {
            respond_vendor_action([
                'success' => false,
                'message' => 'Unable to send notification email at the moment.',
            ], 500);
        }

        $subjectLine = 'Message from Marketplace Admin';
        if (function_exists('mb_strimwidth')) {
            $messagePreview = mb_strimwidth($message, 0, 120, '…', 'UTF-8');
        } else {
            $messagePreview = strlen($message) > 120 ? substr($message, 0, 117) . '...' : $message;
        }
        vendor_notifications_insert(
            $db,
            $vendorId,
            $subjectLine,
            $messagePreview,
            $message,
            'bell',
            'new',
            $adminId
        );

        respond_vendor_action([
            'success' => true,
            'message' => 'Notification sent to vendor.',
        ]);
    }
    default:
        respond_vendor_action([
            'success' => false,
            'message' => 'Unsupported vendor action requested.',
        ], 400);
}
