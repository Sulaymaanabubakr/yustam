<?php
require_once __DIR__ . '/session-path.php';

function yustam_buyers_db_path(): string
{
    return __DIR__ . '/data/buyers.sqlite';
}

function yustam_buyers_connection(): PDO
{
    static $pdo = null;

    if ($pdo instanceof PDO) {
        return $pdo;
    }

    $dbPath = yustam_buyers_db_path();
    $directory = dirname($dbPath);
    if (!is_dir($directory)) {
        mkdir($directory, 0775, true);
    }

    $pdo = new PDO('sqlite:' . $dbPath);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);

    yustam_buyers_ensure_schema($pdo);

    return $pdo;
}

function yustam_buyers_ensure_schema(PDO $pdo): void
{
    $pdo->exec(
        'CREATE TABLE IF NOT EXISTS buyers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            phone TEXT,
            password TEXT NOT NULL,
            joined_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )'
    );
}

function yustam_buyers_create(string $name, string $email, string $phone, string $passwordHash): array
{
    $pdo = yustam_buyers_connection();

    $stmt = $pdo->prepare('INSERT INTO buyers (name, email, phone, password, joined_at) VALUES (:name, :email, :phone, :password, :joined_at)');
    $timestamp = (new DateTimeImmutable('now', new DateTimeZone('UTC')))->format(DateTimeInterface::ATOM);
    $stmt->execute([
        ':name' => $name,
        ':email' => strtolower($email),
        ':phone' => $phone,
        ':password' => $passwordHash,
        ':joined_at' => $timestamp,
    ]);

    $id = (int)$pdo->lastInsertId();

    return [
        'id' => $id,
        'name' => $name,
        'email' => strtolower($email),
        'phone' => $phone,
        'joined_at' => $timestamp,
    ];
}

function yustam_buyers_find_by_email(string $email): ?array
{
    $pdo = yustam_buyers_connection();
    $stmt = $pdo->prepare('SELECT * FROM buyers WHERE email = :email LIMIT 1');
    $stmt->execute([':email' => strtolower($email)]);
    $buyer = $stmt->fetch();

    return $buyer ?: null;
}

function yustam_buyers_find(int $id): ?array
{
    $pdo = yustam_buyers_connection();
    $stmt = $pdo->prepare('SELECT * FROM buyers WHERE id = :id LIMIT 1');
    $stmt->execute([':id' => $id]);
    $buyer = $stmt->fetch();

    return $buyer ?: null;
}
