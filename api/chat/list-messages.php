<?php
declare(strict_types=1);

require_once __DIR__ . '/../../session-path.php';
session_start();

require_once __DIR__ . '/firebase.php';

header('Content-Type: application/json');

$input = $_SERVER['REQUEST_METHOD'] === 'POST'
    ? json_decode((string)file_get_contents('php://input'), true)
    : $_GET;

if (!is_array($input)) {
    $input = [];
}

$chatId = isset($input['chat_id']) ? trim((string)$input['chat_id']) : '';
if ($chatId === '') {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'chat_id is required']);
    exit;
}

$limit = isset($input['limit']) ? (int)$input['limit'] : 500;
if ($limit <= 0) {
    $limit = 500;
}
$limit = min($limit, 1000);

try {
    $chatPath = 'chats/' . $chatId;
    $chatDocument = yustam_firestore_get_document($chatPath);
    $chatData = [];
    if ($chatDocument && isset($chatDocument['fields'])) {
        foreach ($chatDocument['fields'] as $key => $value) {
            $chatData[$key] = yustam_firestore_decode($value);
        }
        $chatData['chat_id'] = $chatData['chat_id'] ?? $chatId;
    }

    $parent = yustam_firestore_document_path('chats', $chatId);
    $query = [
        'parent' => $parent,
        'structuredQuery' => [
            'from' => [
                ['collectionId' => 'messages'],
            ],
            'orderBy' => [
                ['field' => ['fieldPath' => 'ts'], 'direction' => 'ASCENDING'],
            ],
            'limit' => $limit,
        ],
    ];

    $results = yustam_firestore_run_query($query);
    $messages = [];
    foreach ($results as $result) {
        if (!isset($result['document']['fields'])) {
            continue;
        }
        $fields = [];
        foreach ($result['document']['fields'] as $key => $value) {
            $fields[$key] = yustam_firestore_decode($value);
        }
        $docName = $result['document']['name'] ?? '';
        if (!isset($fields['id']) && $docName !== '') {
            $fields['id'] = basename($docName);
        }
        $messages[] = $fields;
    }

    echo json_encode([
        'success' => true,
        'chat_id' => $chatId,
        'chat' => $chatData,
        'messages' => $messages,
    ]);
} catch (Throwable $exception) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Unable to fetch messages',
        'error' => $exception->getMessage(),
    ]);
}

