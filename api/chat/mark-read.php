<?php
declare(strict_types=1);

require_once __DIR__ . '/../../session-path.php';
session_start();

require_once __DIR__ . '/firebase.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Only POST allowed']);
    exit;
}

$input = json_decode((string)file_get_contents('php://input'), true);
if (!is_array($input)) {
    $input = $_POST;
}

$chatId = trim((string)($input['chat_id'] ?? $input['chatId'] ?? ''));
$role = strtolower(trim((string)($input['role'] ?? $input['as'] ?? '')));

if ($chatId === '' || !in_array($role, ['buyer', 'vendor'], true)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'chat_id and valid role are required']);
    exit;
}

try {
    $fieldPath = $role === 'buyer' ? 'unread_for_buyer' : 'unread_for_vendor';
    $documentPath = yustam_firestore_document_path('chats', $chatId);
    $writes = [
        [
            'update' => [
                'name' => $documentPath,
                'fields' => [
                    $fieldPath => yustam_firestore_integer(0),
                ],
            ],
            'updateMask' => ['fieldPaths' => [$fieldPath]],
        ],
    ];
    yustam_firestore_commit($writes);
    echo json_encode(['success' => true]);
} catch (Throwable $error) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Unable to update read status',
        'error' => $error->getMessage(),
    ]);
}
