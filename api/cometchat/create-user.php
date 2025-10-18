<?php
declare(strict_types=1);

require_once __DIR__ . '/../../session-path.php';
session_start();

require_once __DIR__ . '/../../cometchat.php';

header('Content-Type: application/json; charset=UTF-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode([
        'success' => false,
        'reason' => 'Only POST requests are allowed.',
    ]);
    exit;
}

$uid = trim((string) ($_POST['uid'] ?? ''));
$name = trim((string) ($_POST['name'] ?? ''));
$role = trim((string) ($_POST['role'] ?? ''));
$avatar = trim((string) ($_POST['avatar'] ?? ''));

if ($uid === '') {
    http_response_code(422);
    echo json_encode([
        'success' => false,
        'reason' => 'The uid field is required.',
    ]);
    exit;
}

if (!yustam_cometchat_rest_credentials_ready()) {
    http_response_code(503);
    echo json_encode([
        'success' => false,
        'reason' => 'CometChat REST credentials are not configured on the server.',
    ]);
    exit;
}

$registration = yustam_cometchat_register_user(
    $uid,
    $name !== '' ? $name : $uid,
    $role !== '' ? $role : null,
    $avatar !== '' ? $avatar : null
);

$httpCode = (int) ($registration['http_code'] ?? 500);

if (($registration['success'] ?? false) === true) {
    http_response_code(200);
    echo json_encode([
        'success' => true,
        'uid' => $uid,
        'status' => $registration['status'] ?? 'created',
        'http_code' => 200,
    ]);
    exit;
}

http_response_code($httpCode > 0 ? $httpCode : 500);
echo json_encode([
    'success' => false,
    'reason' => $registration['reason'] ?? 'Unable to register user with CometChat.',
    'http_code' => $httpCode,
]);
