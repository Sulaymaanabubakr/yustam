<?php
require_once __DIR__ . '/session-path.php';
require_once __DIR__ . '/db.php';

/**
 * Returns the shared MySQL connection and ensures the buyers table exists.
 */
function yustam_buyers_connection(): mysqli
{
    static $ensured = false;
    $conn = get_db_connection();

    if (!$ensured) {
        yustam_buyers_ensure_schema($conn);
        $ensured = true;
    }

    return $conn;
}

/**
 * Creates the buyers table if it is missing.
 */
function yustam_buyers_ensure_schema(mysqli $conn): void
{
    $sql = <<<SQL
CREATE TABLE IF NOT EXISTS `buyers` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `buyer_uid` VARCHAR(20) NOT NULL UNIQUE,
    `name` VARCHAR(150) NOT NULL,
    `email` VARCHAR(150) NOT NULL UNIQUE,
    `phone` VARCHAR(30) DEFAULT NULL,
    `password` VARCHAR(255) NOT NULL,
    `provider` VARCHAR(30) DEFAULT 'email',
    `joined_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
SQL;

    if (!$conn->query($sql)) {
        throw new RuntimeException('Unable to ensure buyers table exists: ' . $conn->error);
    }

    $providerColumn = $conn->query("SHOW COLUMNS FROM `buyers` LIKE 'provider'");
    if ($providerColumn && $providerColumn->num_rows === 0) {
        if (!$conn->query("ALTER TABLE `buyers` ADD COLUMN `provider` VARCHAR(30) DEFAULT 'email' AFTER `password`")) {
            throw new RuntimeException('Unable to add provider column to buyers table: ' . $conn->error);
        }
    }

    $uidColumn = $conn->query("SHOW COLUMNS FROM `buyers` LIKE 'buyer_uid'");
    if ($uidColumn && $uidColumn->num_rows === 0) {
        if (!$conn->query("ALTER TABLE `buyers` ADD COLUMN `buyer_uid` VARCHAR(20) DEFAULT NULL UNIQUE AFTER `id`")) {
            throw new RuntimeException('Unable to add buyer_uid column to buyers table: ' . $conn->error);
        }
    }
    if ($uidColumn instanceof mysqli_result) {
        $uidColumn->free();
    }
}

function yustam_buyers_format_uid(int $sequence): string
{
    if ($sequence < 1) {
        $sequence = 1;
    }

    return sprintf('YUSTAM-BYR-%04d', $sequence);
}

function yustam_buyers_next_sequence(mysqli $conn): int
{
    $table = 'buyers';
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

function yustam_buyers_generate_uid(mysqli $conn): string
{
    return yustam_buyers_format_uid(yustam_buyers_next_sequence($conn));
}

function yustam_buyers_ensure_uid(array $buyer): array
{
    if (!empty($buyer['buyer_uid'])) {
        $buyer['buyer_uid'] = (string) $buyer['buyer_uid'];
        return $buyer;
    }

    $id = isset($buyer['id']) ? (int) $buyer['id'] : 0;
    if ($id <= 0) {
        return $buyer;
    }

    $conn = yustam_buyers_connection();
    $maxAttempts = 5;
    $sql = 'UPDATE `buyers` SET `buyer_uid` = ? WHERE `id` = ? LIMIT 1';
    $stmt = $conn->prepare($sql);

    if (!$stmt) {
        throw new RuntimeException('Failed to prepare buyer UID update statement: ' . $conn->error);
    }

    $uidParam = '';
    $stmt->bind_param('si', $uidParam, $id);

    for ($attempt = 0; $attempt < $maxAttempts; $attempt++) {
        $uidParam = yustam_buyers_generate_uid($conn);
        try {
            $stmt->execute();
            $buyer['buyer_uid'] = $uidParam;
            $stmt->close();
            return $buyer;
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
    throw new RuntimeException('Unable to assign buyer UID after multiple attempts.');
}

/**
 * Inserts a new buyer record.
 */
function yustam_buyers_create(string $name, string $email, string $phone, string $passwordHash, string $provider = 'email'): array
{
    $conn = yustam_buyers_connection();
    $lowerEmail = strtolower($email);
    $normalizedPhone = trim($phone);
    $joinedAt = gmdate('Y-m-d H:i:s');

    $sql = 'INSERT INTO `buyers` (buyer_uid, name, email, phone, password, provider, joined_at) VALUES (?, ?, ?, ?, ?, ?, ?)';
    $stmt = $conn->prepare($sql);

    if (!$stmt) {
        throw new RuntimeException('Failed to prepare buyer insert statement: ' . $conn->error);
    }

    $buyerUid = '';
    $stmt->bind_param('sssssss', $buyerUid, $name, $lowerEmail, $normalizedPhone, $passwordHash, $provider, $joinedAt);

    $maxAttempts = 5;
    $created = false;

    for ($attempt = 0; $attempt < $maxAttempts; $attempt++) {
        $buyerUid = yustam_buyers_generate_uid($conn);

        try {
            $stmt->execute();
            $created = true;
            break;
        } catch (mysqli_sql_exception $exception) {
            if ((int) $exception->getCode() === 1062 && stripos($exception->getMessage(), 'buyer_uid') !== false) {
                $stmt->reset();
                continue;
            }

            $stmt->close();
            throw $exception;
        }
    }

    if (!$created) {
        $stmt->close();
        throw new RuntimeException('Unable to generate a unique buyer UID. Please try again.');
    }

    $newId = (int) $conn->insert_id;
    $stmt->close();

    return [
        'id' => $newId,
        'buyer_uid' => $buyerUid,
        'name' => $name,
        'email' => $lowerEmail,
        'phone' => $normalizedPhone,
        'password' => $passwordHash,
        'provider' => $provider,
        'joined_at' => $joinedAt,
    ];
}

/**
 * Retrieves a buyer by email address.
 */
function yustam_buyers_find_by_email(string $email): ?array
{
    $conn = yustam_buyers_connection();
    $stmt = $conn->prepare('SELECT id, buyer_uid, name, email, phone, password, provider, joined_at FROM buyers WHERE email = ? LIMIT 1');

    if (!$stmt) {
        throw new RuntimeException('Failed to prepare buyer lookup statement: ' . $conn->error);
    }

    $lowerEmail = strtolower($email);
    $stmt->bind_param('s', $lowerEmail);
    $stmt->execute();

    $result = $stmt->get_result();
    $buyer = $result ? $result->fetch_assoc() : null;

    $stmt->close();

    return $buyer ?: null;
}

/**
 * Retrieves a buyer by id.
 */
function yustam_buyers_find(int $id): ?array
{
    $conn = yustam_buyers_connection();
    $stmt = $conn->prepare('SELECT id, buyer_uid, name, email, phone, password, provider, joined_at FROM buyers WHERE id = ? LIMIT 1');

    if (!$stmt) {
        throw new RuntimeException('Failed to prepare buyer lookup statement: ' . $conn->error);
    }

    $stmt->bind_param('i', $id);
    $stmt->execute();
    $result = $stmt->get_result();
    $buyer = $result ? $result->fetch_assoc() : null;

    $stmt->close();

    return $buyer ?: null;
}
