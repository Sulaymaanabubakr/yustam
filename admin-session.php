<?php
require_once __DIR__ . '/session-path.php';

if (session_status() !== PHP_SESSION_ACTIVE) {
    session_start();
}

require_once __DIR__ . '/db.php';

function admin_is_authenticated(): bool
{
    return isset($_SESSION['admin_id']) && is_numeric($_SESSION['admin_id']);
}

function require_admin_auth(): void
{
    if (admin_is_authenticated()) {
        return;
    }

    $redirect = 'admin-login.php';
    if (!headers_sent()) {
        header('Location: ' . $redirect);
    }
    exit;
}

function current_admin(): array
{
    if (!admin_is_authenticated()) {
        return [];
    }

    return [
        'id' => (int)($_SESSION['admin_id'] ?? 0),
        'email' => $_SESSION['admin_email'] ?? '',
        'name' => $_SESSION['admin_name'] ?? '',
        'role' => $_SESSION['admin_role'] ?? '',
    ];
}
