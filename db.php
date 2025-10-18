<?php
// Database connection file for YUSTAM Marketplace
error_reporting(E_ALL);
ini_set('display_errors', 1);

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

// Database credentials
define('DB_HOST', 'localhost');
define('DB_USER', 'yustamco_yustam_admin');   // your cPanel DB username
define('DB_PASS', 'Aduagbemi24434$');          // your database password
define('DB_NAME', 'yustamco_yustam_users');    // your database name

// Connection function
function get_db_connection(): mysqli {
    static $conn = null;

    if ($conn instanceof mysqli) {
        return $conn;
    }

    try {
        $conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
        $conn->set_charset('utf8mb4');
    } catch (Exception $e) {
        die('Database connection failed: ' . $e->getMessage());
    }

    return $conn;
}

// Define table constants for clarity
define('YUSTAM_VENDORS_TABLE', 'vendors');
define('YUSTAM_ADMINS_TABLE', 'admins');
if (!defined('YUSTAM_USERS_TABLE')) {
    define('YUSTAM_USERS_TABLE', YUSTAM_VENDORS_TABLE);
}

/**
 * Retrieve and cache the list of column names on the vendors table.
 */
function yustam_vendor_ensure_uid_column(mysqli $conn): void
{
    try {
        $table = YUSTAM_VENDORS_TABLE;
        $check = $conn->query("SHOW COLUMNS FROM `{$table}` LIKE 'vendor_uid'");
        if ($check instanceof mysqli_result) {
            $exists = $check->num_rows > 0;
            $check->free();
            if ($exists) {
                return;
            }
        }
        $conn->query("ALTER TABLE `{$table}` ADD COLUMN `vendor_uid` VARCHAR(20) DEFAULT NULL UNIQUE AFTER `id`");
    } catch (Throwable $exception) {
        error_log('Unable to ensure vendor_uid column: ' . $exception->getMessage());
    }
}

function yustam_vendor_table_columns(): array
{
    static $columns = null;

    if (is_array($columns)) {
        return $columns;
    }

    $columns = [];

    try {
        $conn = get_db_connection();
        yustam_vendor_ensure_uid_column($conn);
        $result = $conn->query('SHOW COLUMNS FROM `' . YUSTAM_VENDORS_TABLE . '`');
        if ($result instanceof mysqli_result) {
            while ($row = $result->fetch_assoc()) {
                if (isset($row['Field'])) {
                    $columns[] = $row['Field'];
                }
            }
            $result->free();
        }
    } catch (Throwable $e) {
        error_log('Unable to inspect vendor table columns: ' . $e->getMessage());
    }

    return $columns;
}

function yustam_vendor_table_has_column(string $column): bool
{
    return in_array($column, yustam_vendor_table_columns(), true);
}

function yustam_vendor_name_column(): string
{
    foreach (['full_name', 'name'] as $candidate) {
        if (yustam_vendor_table_has_column($candidate)) {
            return $candidate;
        }
    }

    return 'full_name';
}

// Backwards-compatible helpers
function yustam_users_column($name) {
    if ($name === 'name') {
        return yustam_vendor_name_column();
    }
    return $name;
}

function yustam_users_table_has_column($column) {
    return yustam_vendor_table_has_column($column);
}

function yustam_vendor_format_uid(int $sequence): string
{
    if ($sequence < 1) {
        $sequence = 1;
    }

    return sprintf('YUSTAM-VND-%04d', $sequence);
}

function yustam_vendor_next_sequence(mysqli $conn): int
{
    $table = YUSTAM_VENDORS_TABLE;
    $sql = sprintf('SELECT IFNULL(MAX(`id`), 0) + 1 AS next_id FROM `%s`', $table);
    $result = $conn->query($sql);
    if ($result instanceof mysqli_result) {
        $row = $result->fetch_assoc();
        $result->free();
        if (isset($row['next_id'])) {
            $sequence = (int) $row['next_id'];
            return $sequence > 0 ? $sequence : 1;
        }
    }

    return 1;
}

function yustam_generate_vendor_uid(mysqli $conn): string
{
    return yustam_vendor_format_uid(yustam_vendor_next_sequence($conn));
}

function yustam_vendor_assign_uid_if_missing(mysqli $conn, array &$vendor): string
{
    if (!empty($vendor['vendor_uid'])) {
        $vendor['vendor_uid'] = (string) $vendor['vendor_uid'];
        return $vendor['vendor_uid'];
    }

    $id = isset($vendor['id']) ? (int) $vendor['id'] : 0;
    if ($id <= 0) {
        throw new InvalidArgumentException('Vendor record is missing an id for UID assignment.');
    }

    $sql = sprintf('UPDATE `%s` SET `vendor_uid` = ? WHERE `id` = ? LIMIT 1', YUSTAM_VENDORS_TABLE);
    $stmt = $conn->prepare($sql);
    if (!$stmt) {
        throw new RuntimeException('Unable to prepare vendor UID update statement: ' . $conn->error);
    }

    $uidParam = '';
    $stmt->bind_param('si', $uidParam, $id);

    $maxAttempts = 5;
    for ($attempt = 0; $attempt < $maxAttempts; $attempt++) {
        $uidParam = yustam_generate_vendor_uid($conn);
        try {
            $stmt->execute();
            $vendor['vendor_uid'] = $uidParam;
            $stmt->close();
            return $uidParam;
        } catch (mysqli_sql_exception $exception) {
            if ((int) $exception->getCode() === 1062) {
                $stmt->reset();
                continue;
            }
            $stmt->close();
            throw $exception;
        }
    }

    $stmt->close();
    throw new RuntimeException('Unable to assign vendor UID after multiple attempts.');
}

/**
 * Admin table helpers
 */
function yustam_admin_table_columns(): array
{
    static $columns = null;

    if (is_array($columns)) {
        return $columns;
    }

    $columns = [];

    try {
        $conn = get_db_connection();
        $result = $conn->query('SHOW COLUMNS FROM `' . YUSTAM_ADMINS_TABLE . '`');
        if ($result instanceof mysqli_result) {
            while ($row = $result->fetch_assoc()) {
                if (isset($row['Field'])) {
                    $columns[] = $row['Field'];
                }
            }
            $result->free();
        }
    } catch (Throwable $e) {
        error_log('Unable to inspect admin table columns: ' . $e->getMessage());
    }

    return $columns;
}

function yustam_admin_table_has_column(string $column): bool
{
    return in_array($column, yustam_admin_table_columns(), true);
}

function yustam_admin_email_column(): string
{
    foreach (['email', 'admin_email', 'username'] as $candidate) {
        if (yustam_admin_table_has_column($candidate)) {
            return $candidate;
        }
    }
    return 'email';
}

function yustam_admin_password_column(): string
{
    foreach (['password', 'password_hash', 'passcode'] as $candidate) {
        if (yustam_admin_table_has_column($candidate)) {
            return $candidate;
        }
    }
    return 'password';
}

function yustam_admin_name_column(): string
{
    foreach (['name', 'full_name', 'admin_name'] as $candidate) {
        if (yustam_admin_table_has_column($candidate)) {
            return $candidate;
        }
    }
    return 'name';
}

function yustam_admin_role_column(): ?string
{
    foreach (['role', 'admin_role', 'type'] as $candidate) {
        if (yustam_admin_table_has_column($candidate)) {
            return $candidate;
        }
    }
    return null;
}

function yustam_admin_id_column(): string
{
    foreach (['id', 'admin_id'] as $candidate) {
        if (yustam_admin_table_has_column($candidate)) {
            return $candidate;
        }
    }
    return 'id';
}

function yustam_admin_last_login_column(): ?string
{
    foreach (['last_login_at', 'last_login', 'last_active_at'] as $candidate) {
        if (yustam_admin_table_has_column($candidate)) {
            return $candidate;
        }
    }
    return null;
}

function yustam_admin_updated_column(): ?string
{
    foreach (['updated_at', 'updated_on', 'modified_at'] as $candidate) {
        if (yustam_admin_table_has_column($candidate)) {
            return $candidate;
        }
    }
    return null;
}

/**
 * -------------------------------------------------------------------------
 * Chat helpers
 * -------------------------------------------------------------------------
 */
function yustam_chat_connection(): mysqli
{
    static $ensured = false;
    $conn = get_db_connection();
    if (!$ensured) {
        yustam_chat_ensure_tables($conn);
        $ensured = true;
    }
    return $conn;
}

function yustam_chat_ensure_tables(mysqli $conn): void
{
    $summariesSql = <<<SQL
CREATE TABLE IF NOT EXISTS `chat_summaries` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `chat_id` VARCHAR(120) NOT NULL,
    `buyer_uid` VARCHAR(60) NOT NULL,
    `buyer_name` VARCHAR(150) DEFAULT NULL,
    `vendor_uid` VARCHAR(60) NOT NULL,
    `vendor_name` VARCHAR(150) DEFAULT NULL,
    `listing_id` VARCHAR(80) DEFAULT NULL,
    `listing_title` VARCHAR(255) DEFAULT NULL,
    `listing_image` VARCHAR(255) DEFAULT NULL,
    `last_message` TEXT NULL,
    `last_type` VARCHAR(20) NOT NULL DEFAULT 'text',
    `last_sender_uid` VARCHAR(60) DEFAULT NULL,
    `last_sender_role` VARCHAR(20) DEFAULT NULL,
    `unread_for_buyer` INT UNSIGNED NOT NULL DEFAULT 0,
    `unread_for_vendor` INT UNSIGNED NOT NULL DEFAULT 0,
    `last_sent_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uniq_chat` (`chat_id`),
    KEY `idx_buyer` (`buyer_uid`, `last_sent_at`),
    KEY `idx_vendor` (`vendor_uid`, `last_sent_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
SQL;
    if (!$conn->query($summariesSql)) {
        throw new RuntimeException('Unable to ensure chat_summaries table: ' . $conn->error);
    }

    $messagesSql = <<<SQL
CREATE TABLE IF NOT EXISTS `chat_messages` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `chat_id` VARCHAR(120) NOT NULL,
    `message_id` VARCHAR(64) NOT NULL,
    `sender_uid` VARCHAR(60) NOT NULL,
    `sender_role` VARCHAR(20) NOT NULL,
    `receiver_uid` VARCHAR(60) DEFAULT NULL,
    `text` TEXT NULL,
    `image_url` VARCHAR(512) DEFAULT NULL,
    `voice_url` VARCHAR(512) DEFAULT NULL,
    `voice_duration` DECIMAL(6,2) DEFAULT NULL,
    `message_type` VARCHAR(20) NOT NULL DEFAULT 'text',
    `sent_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uniq_chat_message` (`chat_id`, `message_id`),
    KEY `idx_chat_time` (`chat_id`, `sent_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
SQL;
    if (!$conn->query($messagesSql)) {
        throw new RuntimeException('Unable to ensure chat_messages table: ' . $conn->error);
    }
}

function yustam_chat_store_message(array $message): void
{
    $conn = yustam_chat_connection();
    $sql = <<<SQL
INSERT INTO `chat_messages`
    (`chat_id`, `message_id`, `sender_uid`, `sender_role`, `receiver_uid`, `text`, `image_url`, `voice_url`, `voice_duration`, `message_type`, `sent_at`)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
ON DUPLICATE KEY UPDATE `text` = VALUES(`text`), `image_url` = VALUES(`image_url`), `voice_url` = VALUES(`voice_url`), `voice_duration` = VALUES(`voice_duration`)
SQL;
    $stmt = $conn->prepare($sql);
    if (!$stmt) {
        throw new RuntimeException('Unable to prepare chat message insert: ' . $conn->error);
    }

    $chatId = (string)($message['chat_id'] ?? '');
    $messageId = (string)($message['message_id'] ?? '');
    $senderUid = (string)($message['sender_uid'] ?? '');
    $senderRole = strtolower((string)($message['sender_role'] ?? ''));
    $receiverUid = (string)($message['receiver_uid'] ?? '');
    $text = $message['text'] ?? null;
    $imageUrl = $message['image_url'] ?? null;
    $voiceUrl = $message['voice_url'] ?? null;
    $voiceDuration = isset($message['voice_duration']) ? (float)$message['voice_duration'] : null;
    $messageType = strtolower((string)($message['message_type'] ?? 'text'));
    $sentAt = (string)($message['sent_at'] ?? gmdate('Y-m-d H:i:s'));

    $stmt->bind_param(
        'sssssssssss',
        $chatId,
        $messageId,
        $senderUid,
        $senderRole,
        $receiverUid,
        $text,
        $imageUrl,
        $voiceUrl,
        $voiceDuration,
        $messageType,
        $sentAt
    );

    $stmt->execute();
    $stmt->close();
}

function yustam_chat_upsert_summary(array $summary, ?string $senderRole = null): void
{
    $conn = yustam_chat_connection();

    $chatId = (string)($summary['chat_id'] ?? '');
    $buyerUid = (string)($summary['buyer_uid'] ?? '');
    $buyerName = $summary['buyer_name'] ?? null;
    $vendorUid = (string)($summary['vendor_uid'] ?? '');
    $vendorName = $summary['vendor_name'] ?? null;
    $listingId = $summary['listing_id'] ?? null;
    $listingTitle = $summary['listing_title'] ?? null;
    $listingImage = $summary['listing_image'] ?? null;
    $lastMessage = $summary['last_message'] ?? null;
    $lastType = strtolower((string)($summary['last_type'] ?? 'text'));
    $lastSenderUid = $summary['last_sender_uid'] ?? null;
    $role = strtolower($senderRole ?? (string)($summary['last_sender_role'] ?? ''));
    $lastSenderRole = $role ?: null;
    $lastSentAt = (string)($summary['last_sent_at'] ?? gmdate('Y-m-d H:i:s'));

    $initialUnreadBuyer = $role === 'vendor' ? 1 : 0;
    $initialUnreadVendor = $role === 'buyer' ? 1 : 0;

    $sql = <<<SQL
INSERT INTO `chat_summaries`
    (`chat_id`, `buyer_uid`, `buyer_name`, `vendor_uid`, `vendor_name`, `listing_id`, `listing_title`, `listing_image`, `last_message`, `last_type`, `last_sender_uid`, `last_sender_role`, `unread_for_buyer`, `unread_for_vendor`, `last_sent_at`)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
ON DUPLICATE KEY UPDATE
    `buyer_uid` = VALUES(`buyer_uid`),
    `buyer_name` = VALUES(`buyer_name`),
    `vendor_uid` = VALUES(`vendor_uid`),
    `vendor_name` = VALUES(`vendor_name`),
    `listing_id` = VALUES(`listing_id`),
    `listing_title` = VALUES(`listing_title`),
    `listing_image` = VALUES(`listing_image`),
    `last_message` = VALUES(`last_message`),
    `last_type` = VALUES(`last_type`),
    `last_sender_uid` = VALUES(`last_sender_uid`),
    `last_sender_role` = VALUES(`last_sender_role`),
    `last_sent_at` = VALUES(`last_sent_at`),
    `unread_for_buyer` = CASE
        WHEN VALUES(`last_sender_role`) = 'buyer' THEN 0
        WHEN VALUES(`last_sender_role`) = 'vendor' THEN `unread_for_buyer` + 1
        ELSE `unread_for_buyer`
    END,
    `unread_for_vendor` = CASE
        WHEN VALUES(`last_sender_role`) = 'vendor' THEN 0
        WHEN VALUES(`last_sender_role`) = 'buyer' THEN `unread_for_vendor` + 1
        ELSE `unread_for_vendor`
    END
SQL;

    $stmt = $conn->prepare($sql);
    if (!$stmt) {
        throw new RuntimeException('Unable to prepare chat summary upsert: ' . $conn->error);
    }
    $stmt->bind_param(
        'ssssssssssssiis',
        $chatId,
        $buyerUid,
        $buyerName,
        $vendorUid,
        $vendorName,
        $listingId,
        $listingTitle,
        $listingImage,
        $lastMessage,
        $lastType,
        $lastSenderUid,
        $lastSenderRole,
        $initialUnreadBuyer,
        $initialUnreadVendor,
        $lastSentAt
    );
    $stmt->execute();
    $stmt->close();
}

function yustam_chat_fetch_messages(string $chatId, int $limit = 500): array
{
    $conn = yustam_chat_connection();
    $limit = max(1, min($limit, 1000));
    $sql = 'SELECT `message_id`, `sender_uid`, `sender_role`, `receiver_uid`, `text`, `image_url`, `voice_url`, `voice_duration`, `message_type`, `sent_at` FROM `chat_messages` WHERE `chat_id` = ? ORDER BY `sent_at` ASC LIMIT ?';
    $stmt = $conn->prepare($sql);
    if (!$stmt) {
        throw new RuntimeException('Unable to prepare chat message fetch: ' . $conn->error);
    }
    $stmt->bind_param('si', $chatId, $limit);
    $stmt->execute();
    $result = $stmt->get_result();
    $messages = [];
    if ($result instanceof mysqli_result) {
        while ($row = $result->fetch_assoc()) {
            $messages[] = $row;
        }
        $result->free();
    }
    $stmt->close();
    return $messages;
}

function yustam_chat_fetch_chats(string $uid, string $role, int $limit = 50): array
{
    $conn = yustam_chat_connection();
    $limit = max(1, min($limit, 200));
    $column = strtolower($role) === 'vendor' ? 'vendor_uid' : 'buyer_uid';
    $sql = sprintf(
        'SELECT `chat_id`, `buyer_uid`, `buyer_name`, `vendor_uid`, `vendor_name`, `listing_id`, `listing_title`, `listing_image`, `last_message`, `last_type`, `last_sender_uid`, `last_sender_role`, `unread_for_buyer`, `unread_for_vendor`, `last_sent_at`
         FROM `chat_summaries` WHERE `%s` = ? ORDER BY `last_sent_at` DESC LIMIT ?',
        $column
    );
    $stmt = $conn->prepare($sql);
    if (!$stmt) {
        throw new RuntimeException('Unable to prepare chat summaries query: ' . $conn->error);
    }
    $stmt->bind_param('si', $uid, $limit);
    $stmt->execute();
    $result = $stmt->get_result();
    $chats = [];
    if ($result instanceof mysqli_result) {
        while ($row = $result->fetch_assoc()) {
            $chats[] = $row;
        }
        $result->free();
    }
    $stmt->close();
    return $chats;
}

function yustam_chat_fetch_summary(string $chatId): ?array
{
    $conn = yustam_chat_connection();
    $sql = 'SELECT `chat_id`, `buyer_uid`, `buyer_name`, `vendor_uid`, `vendor_name`, `listing_id`, `listing_title`, `listing_image`, `last_message`, `last_type`, `last_sender_uid`, `last_sender_role`, `unread_for_buyer`, `unread_for_vendor`, `last_sent_at` FROM `chat_summaries` WHERE `chat_id` = ? LIMIT 1';
    $stmt = $conn->prepare($sql);
    if (!$stmt) {
        throw new RuntimeException('Unable to prepare chat summary query: ' . $conn->error);
    }
    $stmt->bind_param('s', $chatId);
    $stmt->execute();
    $result = $stmt->get_result();
    $summary = null;
    if ($result instanceof mysqli_result) {
        $summary = $result->fetch_assoc() ?: null;
        $result->free();
    }
    $stmt->close();
    return $summary;
}

function yustam_chat_reset_unread(string $chatId, string $role): void
{
    $conn = yustam_chat_connection();
    $role = strtolower($role);
    if ($role === 'buyer') {
        $sql = 'UPDATE `chat_summaries` SET `unread_for_buyer` = 0 WHERE `chat_id` = ?';
    } elseif ($role === 'vendor') {
        $sql = 'UPDATE `chat_summaries` SET `unread_for_vendor` = 0 WHERE `chat_id` = ?';
    } else {
        return;
    }
    $stmt = $conn->prepare($sql);
    if (!$stmt) {
        throw new RuntimeException('Unable to prepare unread reset statement: ' . $conn->error);
    }
    $stmt->bind_param('s', $chatId);
    $stmt->execute();
    $stmt->close();
}
