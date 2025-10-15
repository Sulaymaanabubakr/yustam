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
    `name` VARCHAR(150) NOT NULL,
    `email` VARCHAR(150) NOT NULL UNIQUE,
    `phone` VARCHAR(30) DEFAULT NULL,
    `password` VARCHAR(255) NOT NULL,
    `joined_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
SQL;

    if (!$conn->query($sql)) {
        throw new RuntimeException('Unable to ensure buyers table exists: ' . $conn->error);
    }
}

/**
 * Inserts a new buyer record.
 */
function yustam_buyers_create(string $name, string $email, string $phone, string $passwordHash): array
{
    $conn = yustam_buyers_connection();
    $lowerEmail = strtolower($email);
    $normalizedPhone = trim($phone);
    $joinedAt = gmdate('Y-m-d H:i:s');

    $stmt = $conn->prepare(
        'INSERT INTO buyers (name, email, phone, password, joined_at) VALUES (?, ?, ?, ?, ?)'
    );

    if (!$stmt) {
        throw new RuntimeException('Failed to prepare buyer insert statement: ' . $conn->error);
    }

    $stmt->bind_param('sssss', $name, $lowerEmail, $normalizedPhone, $passwordHash, $joinedAt);

    if (!$stmt->execute()) {
        $error = $stmt->error;
        $stmt->close();
        throw new RuntimeException('Failed to create buyer: ' . $error);
    }

    $newId = (int)$stmt->insert_id;
    $stmt->close();

    return [
        'id' => $newId,
        'name' => $name,
        'email' => $lowerEmail,
        'phone' => $normalizedPhone,
        'password' => $passwordHash,
        'joined_at' => $joinedAt,
    ];
}

/**
 * Retrieves a buyer by email address.
 */
function yustam_buyers_find_by_email(string $email): ?array
{
    $conn = yustam_buyers_connection();
    $stmt = $conn->prepare('SELECT id, name, email, phone, password, joined_at FROM buyers WHERE email = ? LIMIT 1');

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
    $stmt = $conn->prepare('SELECT id, name, email, phone, password, joined_at FROM buyers WHERE id = ? LIMIT 1');

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
