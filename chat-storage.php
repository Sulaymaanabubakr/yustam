<?php
declare(strict_types=1);

require_once __DIR__ . '/db.php';

function yustam_chat_connection(): mysqli
{
    static $ensured = false;
    $db = get_db_connection();

    if (!$ensured) {
        yustam_chat_ensure_tables($db);
        $ensured = true;
    }

    return $db;
}

function yustam_chat_conversations_table(): string
{
    return 'chat_conversations';
}

function yustam_chat_messages_table(): string
{
    return 'chat_messages';
}

function yustam_chat_ensure_tables(mysqli $db): void
{
    $conversations = yustam_chat_conversations_table();
    $messages = yustam_chat_messages_table();

    $conversationSql = sprintf(
        'CREATE TABLE IF NOT EXISTS `%s` (
            `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
            `chat_id` VARCHAR(80) NOT NULL UNIQUE,
            `buyer_uid` VARCHAR(20) NOT NULL,
            `buyer_id` INT UNSIGNED NULL,
            `buyer_name` VARCHAR(150) NULL,
            `vendor_uid` VARCHAR(20) NOT NULL,
            `vendor_id` INT UNSIGNED NULL,
            `vendor_name` VARCHAR(150) NULL,
            `product_id` VARCHAR(80) NULL,
            `product_title` VARCHAR(255) NULL,
            `product_image` TEXT NULL,
            `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            `last_message_at` DATETIME NULL,
            `last_message_preview` TEXT NULL,
            `last_sender_uid` VARCHAR(20) NULL,
            INDEX `buyer_uid_idx` (`buyer_uid`),
            INDEX `vendor_uid_idx` (`vendor_uid`),
            INDEX `last_message_at_idx` (`last_message_at`),
            INDEX `product_id_idx` (`product_id`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;',
        $conversations
    );

    $messageSql = sprintf(
        'CREATE TABLE IF NOT EXISTS `%s` (
            `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            `chat_id` VARCHAR(80) NOT NULL,
            `sender_uid` VARCHAR(20) NOT NULL,
            `sender_type` ENUM(\'buyer\', \'vendor\') NOT NULL,
            `sender_name` VARCHAR(150) NULL,
            `receiver_uid` VARCHAR(20) NOT NULL,
            `receiver_type` ENUM(\'buyer\', \'vendor\') NOT NULL,
            `message_text` TEXT NULL,
            `image_url` TEXT NULL,
            `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            `seen` TINYINT(1) NOT NULL DEFAULT 0,
            `seen_at` DATETIME NULL,
            INDEX `chat_created_idx` (`chat_id`, `created_at`),
            INDEX `receiver_seen_idx` (`receiver_uid`, `seen`),
            FOREIGN KEY (`chat_id`) REFERENCES `%s` (`chat_id`) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;',
        $messages,
        $conversations
    );

    $db->query($conversationSql);
    $db->query($messageSql);

    // Ensure extra columns exist for legacy installations
    $conversationCols = [];
    $result = $db->query(sprintf('SHOW COLUMNS FROM `%s`', $conversations));
    if ($result instanceof mysqli_result) {
        while ($row = $result->fetch_assoc()) {
            if (isset($row['Field'])) {
                $conversationCols[] = $row['Field'];
            }
        }
        $result->free();
    }

    if (!in_array('buyer_name', $conversationCols, true)) {
        try {
            $db->query(sprintf('ALTER TABLE `%s` ADD COLUMN `buyer_name` VARCHAR(150) NULL AFTER `buyer_id`', $conversations));
        } catch (Throwable $exception) {
            error_log('chat ensure buyer_name: ' . $exception->getMessage());
        }
    }

    if (!in_array('vendor_name', $conversationCols, true)) {
        try {
            $db->query(sprintf('ALTER TABLE `%s` ADD COLUMN `vendor_name` VARCHAR(150) NULL AFTER `vendor_id`', $conversations));
        } catch (Throwable $exception) {
            error_log('chat ensure vendor_name: ' . $exception->getMessage());
        }
    }

    $messageCols = [];
    $result = $db->query(sprintf('SHOW COLUMNS FROM `%s`', $messages));
    if ($result instanceof mysqli_result) {
        while ($row = $result->fetch_assoc()) {
            if (isset($row['Field'])) {
                $messageCols[] = $row['Field'];
            }
        }
        $result->free();
    }

    if (!in_array('sender_name', $messageCols, true)) {
        try {
            $db->query(sprintf('ALTER TABLE `%s` ADD COLUMN `sender_name` VARCHAR(150) NULL AFTER `sender_type`', $messages));
        } catch (Throwable $exception) {
            error_log('chat ensure sender_name: ' . $exception->getMessage());
        }
    }
}

function yustam_chat_build_id(string $vendorUid, string $buyerUid, string $productId): string
{
    return trim($vendorUid . '_' . $buyerUid . '_' . $productId, '_');
}

function yustam_chat_fetch_conversation(mysqli $db, string $chatId): ?array
{
    $stmt = $db->prepare(sprintf('SELECT * FROM `%s` WHERE chat_id = ? LIMIT 1', yustam_chat_conversations_table()));
    if (!$stmt) {
        return null;
    }
    $stmt->bind_param('s', $chatId);
    $stmt->execute();
    $result = $stmt->get_result();
    $conversation = $result ? $result->fetch_assoc() : null;
    $stmt->close();
    return $conversation ?: null;
}

function yustam_chat_ensure_conversation(
    mysqli $db,
    string $chatId,
    string $buyerUid,
    ?int $buyerId,
    ?string $buyerName,
    string $vendorUid,
    ?int $vendorId,
    ?string $vendorName,
    ?string $productId,
    ?string $productTitle,
    ?string $productImage
): void {
    $existing = yustam_chat_fetch_conversation($db, $chatId);
    if ($existing) {
        // Refresh any missing metadata so legacy conversations stay in sync
        $updateSql = sprintf(
            'UPDATE `%s` SET buyer_name = COALESCE(?, buyer_name), vendor_name = COALESCE(?, vendor_name),
                product_title = COALESCE(?, product_title), product_image = COALESCE(?, product_image)
             WHERE chat_id = ?',
            yustam_chat_conversations_table()
        );
        $updateStmt = $db->prepare($updateSql);
        if ($updateStmt) {
            $updateStmt->bind_param('sssss', $buyerName, $vendorName, $productTitle, $productImage, $chatId);
            $updateStmt->execute();
            $updateStmt->close();
        }
        return;
    }

    $sql = sprintf(
        'INSERT INTO `%s` (chat_id, buyer_uid, buyer_id, buyer_name, vendor_uid, vendor_id, vendor_name, product_id, product_title, product_image, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())',
        yustam_chat_conversations_table()
    );
    $stmt = $db->prepare($sql);
    if (!$stmt) {
        throw new RuntimeException('Unable to prepare conversation insert.');
    }
    $stmt->bind_param('ssississss', $chatId, $buyerUid, $buyerId, $buyerName, $vendorUid, $vendorId, $vendorName, $productId, $productTitle, $productImage);
    $stmt->execute();
    $stmt->close();
function yustam_chat_insert_message(
    mysqli $db,
    string $chatId,
    string $senderUid,
    string $senderType,
    ?string $senderName,
    string $receiverUid,
    string $receiverType,
    ?string $text,
    ?string $imageUrl
): array {
    $sql = sprintf(
        'INSERT INTO `%s` (chat_id, sender_uid, sender_type, sender_name, receiver_uid, receiver_type, message_text, image_url, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())',
        yustam_chat_messages_table()
    );
    $stmt = $db->prepare($sql);
    if (!$stmt) {
        throw new RuntimeException('Unable to prepare message insert.');
    }
    $stmt->bind_param('ssssssss', $chatId, $senderUid, $senderType, $senderName, $receiverUid, $receiverType, $text, $imageUrl);
    $stmt->execute();
    $messageId = (int) $stmt->insert_id;
    $stmt->close();

    if ($text !== null && $text !== '') {
        if (function_exists('mb_substr')) {
            $preview = mb_substr($text, 0, 120);
        } else {
            $preview = substr($text, 0, 120);
        }
    } else {
        $preview = $imageUrl ? '[Photo]' : '';
    }

    $updateSql = sprintf(
        'UPDATE `%s`
         SET last_message_at = NOW(), last_message_preview = ?, last_sender_uid = ?, updated_at = NOW()
         WHERE chat_id = ?',
        yustam_chat_conversations_table()
    );
    $updateStmt = $db->prepare($updateSql);
    if ($updateStmt instanceof mysqli_stmt) {
        $updateStmt->bind_param('sss', $preview, $senderUid, $chatId);
        $updateStmt->execute();
        $updateStmt->close();
    }

    return [
        'id' => $messageId,
        'chat_id' => $chatId,
        'sender_uid' => $senderUid,
        'sender_type' => $senderType,
        'receiver_uid' => $receiverUid,
        'receiver_type' => $receiverType,
        'message_text' => $text,
        'image_url' => $imageUrl,
        'created_at' => date('Y-m-d H:i:s')
    ];
}

function yustam_chat_fetch_messages(mysqli $db, string $chatId, ?int $afterId = null, int $limit = 100): array
{
    $messages = [];
    $params = [];
    $types = '';

    $sql = sprintf(
        'SELECT id, chat_id, sender_uid, sender_type, sender_name, receiver_uid, receiver_type, message_text, image_url, created_at, seen, seen_at
         FROM `%s`
         WHERE chat_id = ?',
        yustam_chat_messages_table()
    );
    $types .= 's';
    $params[] = $chatId;

    if ($afterId !== null && $afterId > 0) {
        $sql .= ' AND id > ?';
        $types .= 'i';
        $params[] = $afterId;
    }

    $sql .= ' ORDER BY id ASC LIMIT ?';
    $types .= 'i';
    $params[] = $limit > 0 ? $limit : 100;

    $stmt = $db->prepare($sql);
    if (!$stmt) {
        return $messages;
    }

    $stmt->bind_param($types, ...$params);
    $stmt->execute();
    $result = $stmt->get_result();
    while ($row = $result->fetch_assoc()) {
        $messages[] = $row;
    }
    $stmt->close();

    return $messages;
}

function yustam_chat_mark_seen(mysqli $db, string $chatId, string $viewerUid): void
{
    $sql = sprintf(
        'UPDATE `%s`
         SET seen = 1, seen_at = NOW()
         WHERE chat_id = ? AND receiver_uid = ? AND seen = 0',
        yustam_chat_messages_table()
    );
    $stmt = $db->prepare($sql);
    if ($stmt) {
        $stmt->bind_param('ss', $chatId, $viewerUid);
        $stmt->execute();
        $stmt->close();
    }
}

function yustam_chat_list_conversations(mysqli $db, string $uid, string $role, int $limit = 20): array
{
    $column = $role === 'vendor' ? 'vendor_uid' : 'buyer_uid';
    $sql = sprintf(
        'SELECT c.chat_id, c.buyer_uid, c.buyer_id, c.buyer_name, c.vendor_uid, c.vendor_id, c.vendor_name,
                c.product_id, c.product_title, c.product_image,
                c.last_message_at, c.last_message_preview, c.last_sender_uid, c.created_at, c.updated_at,
                (
                    SELECT COUNT(1)
                    FROM `%s` m
                    WHERE m.chat_id = c.chat_id AND m.receiver_uid = ? AND m.seen = 0
                ) AS unread_count
         FROM `%s` c
         WHERE c.%s = ?
         ORDER BY COALESCE(c.last_message_at, c.created_at) DESC
         LIMIT ?',
        yustam_chat_messages_table(),
        yustam_chat_conversations_table(),
        $column
    );

    $stmt = $db->prepare($sql);
    if (!$stmt) {
        return [];
    }
    $stmt->bind_param('ssi', $uid, $uid, $limit);
    $stmt->execute();
    $result = $stmt->get_result();
    $rows = [];
    while ($row = $result->fetch_assoc()) {
        $rows[] = $row;
    }
    $stmt->close();
    return $rows;
}

function yustam_chat_conversation_summary(array $conversation, string $viewerUid): array
{
    $isVendor = $conversation['vendor_uid'] === $viewerUid;
    return [
        'chatId' => $conversation['chat_id'],
        'buyerUid' => $conversation['buyer_uid'],
        'buyerId' => $conversation['buyer_id'],
        'buyerName' => $conversation['buyer_name'],
        'vendorUid' => $conversation['vendor_uid'],
        'vendorId' => $conversation['vendor_id'],
        'vendorName' => $conversation['vendor_name'],
        'productId' => $conversation['product_id'],
        'productTitle' => $conversation['product_title'] ?? 'Marketplace Listing',
        'productImage' => $conversation['product_image'],
        'lastMessageAt' => $conversation['last_message_at'],
        'lastMessagePreview' => $conversation['last_message_preview'] ?? '',
        'lastSenderUid' => $conversation['last_sender_uid'],
        'counterpartyUid' => $isVendor ? $conversation['buyer_uid'] : $conversation['vendor_uid'],
        'counterpartyRole' => $isVendor ? 'buyer' : 'vendor',
        'counterpartyName' => $isVendor ? ($conversation['buyer_name'] ?? '') : ($conversation['vendor_name'] ?? ''),
        'unreadCount' => isset($conversation['unread_count']) ? (int)$conversation['unread_count'] : 0,
        'createdAt' => $conversation['created_at'],
        'updatedAt' => $conversation['updated_at']
    ];
}
