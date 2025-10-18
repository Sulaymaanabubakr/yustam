<?php
declare(strict_types=1);

require_once __DIR__ . '/../../session-path.php';
session_start();

require_once __DIR__ . '/../../db.php';
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

$source = 'firestore';
$chatData = [];
$messages = [];

try {
    $chatPath = 'chats/' . $chatId;
    $chatDocument = yustam_firestore_get_document($chatPath);
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
} catch (Throwable $firestoreError) {
    $source = 'mysql';
    error_log('list-messages Firestore error: ' . $firestoreError->getMessage());
    try {
        $mysqlSummary = yustam_chat_fetch_summary($chatId);
        if ($mysqlSummary) {
            $chatData = [
                'chat_id' => $mysqlSummary['chat_id'],
                'buyer_uid' => $mysqlSummary['buyer_uid'],
                'buyer_name' => $mysqlSummary['buyer_name'],
                'vendor_uid' => $mysqlSummary['vendor_uid'],
                'vendor_name' => $mysqlSummary['vendor_name'],
                'listing_id' => $mysqlSummary['listing_id'],
                'listing_title' => $mysqlSummary['listing_title'],
                'listing_image' => $mysqlSummary['listing_image'],
                'last_text' => $mysqlSummary['last_message'],
                'last_type' => $mysqlSummary['last_type'],
                'last_sender_uid' => $mysqlSummary['last_sender_uid'],
                'last_sender_role' => $mysqlSummary['last_sender_role'],
                'unread_for_buyer' => (int)($mysqlSummary['unread_for_buyer'] ?? 0),
                'unread_for_vendor' => (int)($mysqlSummary['unread_for_vendor'] ?? 0),
                'last_ts' => $mysqlSummary['last_sent_at'],
            ];
        }

        $rows = yustam_chat_fetch_messages($chatId, $limit);
        foreach ($rows as $row) {
            $messages[] = [
                'id' => $row['message_id'],
                'sender_uid' => $row['sender_uid'],
                'sender_role' => $row['sender_role'],
                'receiver_uid' => $row['receiver_uid'],
                'text' => $row['text'],
                'image_url' => $row['image_url'],
                'voice_url' => $row['voice_url'],
                'duration' => $row['voice_duration'],
                'type' => $row['message_type'],
                'sent_at' => $row['sent_at'],
            ];
        }
    } catch (Throwable $mysqlError) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'message' => 'Unable to fetch messages',
            'error' => $mysqlError->getMessage(),
        ]);
        return;
    }
}

echo json_encode([
    'success' => true,
    'chat_id' => $chatId,
    'chat' => $chatData,
    'messages' => $messages,
    'source' => $source,
]);
