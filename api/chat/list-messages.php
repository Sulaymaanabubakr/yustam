<?php
declare(strict_types=1);

require_once __DIR__ . '/../../session-path.php';
session_start();

require_once __DIR__ . '/firebase.php';
require_once __DIR__ . '/../../db.php';

header('Content-Type: application/json');

$input = $_SERVER['REQUEST_METHOD'] === 'POST'
    ? json_decode((string)file_get_contents('php://input'), true)
    : $_GET;

if (!is_array($input)) {
    $input = [];
}

$chatId = isset($input['chat_id']) ? trim((string)$input['chat_id']) : (isset($input['chatId']) ? trim((string)$input['chatId']) : '');
if ($chatId === '') {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'chatId is required']);
    exit;
}

$limit = isset($input['limit']) ? (int)$input['limit'] : 500;
if ($limit <= 0) {
    $limit = 500;
}
$limit = min($limit, 1000);

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
        $vendorUid = isset($chatData['vendor_uid']) ? trim((string)$chatData['vendor_uid']) : '';
        if ($vendorUid !== '') {
            try {
                $vendorRecord = yustam_vendor_find_by_uid($vendorUid);
                if (is_array($vendorRecord)) {
                    $businessName = yustam_vendor_business_name($vendorRecord);
                    if ($businessName !== '') {
                        $chatData['vendor_business_name'] = $businessName;
                        $chatData['vendor_name'] = $businessName;
                    }
                }
            } catch (Throwable $vendorLookupError) {
                error_log('list-messages vendor lookup failed: ' . $vendorLookupError->getMessage());
            }
        }
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
    error_log('list-messages Firestore error: ' . $firestoreError->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Unable to fetch messages',
        'error' => $firestoreError->getMessage(),
    ]);
    return;
}

$chatKeyMap = [
    'chat_id' => 'chatId',
    'buyer_uid' => 'buyerUid',
    'buyer_name' => 'buyerName',
    'vendor_uid' => 'vendorUid',
    'vendor_name' => 'vendorName',
    'vendor_business_name' => 'vendorBusinessName',
    'listing_id' => 'listingId',
    'listing_title' => 'listingTitle',
    'listing_image' => 'listingImage',
    'last_text' => 'lastMessage',
    'last_sender_role' => 'lastSenderRole',
    'last_ts' => 'lastTs',
    'unread_for_buyer' => 'unreadForBuyer',
    'unread_for_vendor' => 'unreadForVendor',
];
$formatChat = static function (array $chat) use ($chatKeyMap): array {
    $camelChat = [];
    foreach ($chat as $key => $value) {
        $camelChat[$chatKeyMap[$key] ?? $key] = $value;
    }
    return $camelChat;
};

$messageKeyMap = [
    'chat_id' => 'chatId',
    'sender_uid' => 'senderUid',
    'sender_role' => 'senderRole',
    'media_url' => 'mediaUrl',
    'image_url' => 'imageUrl',
    'video_url' => 'videoUrl',
    'voice_url' => 'voiceUrl',
    'voice_duration' => 'voiceDuration',
    'media_meta' => 'mediaMeta',
    'ts' => 'timestamp',
];
$formatMessage = static function (array $msg) use ($messageKeyMap): array {
    $camelMsg = [];
    foreach ($msg as $key => $value) {
        $camelMsg[$messageKeyMap[$key] ?? $key] = $value;
    }
    return $camelMsg;
};

echo json_encode([
    'success' => true,
    'chatId' => $chatId,
    'chat' => $formatChat($chatData),
    'messages' => array_map($formatMessage, $messages),
    'source' => 'firestore',
]);
