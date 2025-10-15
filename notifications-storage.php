<?php
declare(strict_types=1);

require_once __DIR__ . '/db.php';

function yustam_notifications_bind(mysqli_stmt $statement, string $types, array $values): void
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

function yustam_vendor_notifications_table(): string
{
    if (defined('YUSTAM_VENDOR_NOTIFICATIONS_TABLE') && preg_match('/^[A-Za-z0-9_]+$/', (string) YUSTAM_VENDOR_NOTIFICATIONS_TABLE)) {
        return YUSTAM_VENDOR_NOTIFICATIONS_TABLE;
    }

    return 'vendor_notifications';
}

function yustam_vendor_notifications_ensure_table(mysqli $db): void
{
    static $ensured = false;

    if ($ensured) {
        return;
    }

    $table = yustam_vendor_notifications_table();
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

function yustam_vendor_notifications_insert(
    mysqli $db,
    int $vendorId,
    string $title,
    string $message,
    string $detail = '',
    string $type = 'bell',
    string $status = 'new',
    ?int $createdBy = null
): void {
    yustam_vendor_notifications_ensure_table($db);
    $table = yustam_vendor_notifications_table();

    if ($createdBy !== null && $createdBy > 0) {
        $sql = sprintf(
            'INSERT INTO `%s` (vendor_id, title, message, detail, type, status, created_at, created_by)
             VALUES (?, ?, ?, ?, ?, ?, NOW(), ?)',
            $table
        );

        $stmt = $db->prepare($sql);
        if ($stmt instanceof mysqli_stmt) {
            yustam_notifications_bind($stmt, 'isssssi', [$vendorId, $title, $message, $detail, $type, $status, $createdBy]);
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
        yustam_notifications_bind($stmt, 'isssss', [$vendorId, $title, $message, $detail, $type, $status]);
        $stmt->execute();
        $stmt->close();
    }
}

