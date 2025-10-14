<?php
require_once __DIR__ . '/admin-session.php';

header('Content-Type: application/json');

if (admin_is_authenticated()) {
    echo json_encode([
        'authenticated' => true,
        'admin' => current_admin(),
    ]);
    exit;
}

http_response_code(401);
echo json_encode(['authenticated' => false]);
