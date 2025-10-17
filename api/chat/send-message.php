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
$role = strtolower(trim((string)($input['as'] ?? $input['role'] ?? '')));
$text = trim((string)($input['text'] ?? $input['message'] ?? ''));
$imageUrl = trim((string)($input['image_url'] ?? $input['imageUrl'] ?? ''));
$voiceUrl = trim((string)($input['voice_url'] ?? $input['voiceUrl'] ?? ''));
$duration = isset($input['duration']) ? (float)$input['duration'] : null;
$buyerUid = trim((string)($input['buyer_uid'] ?? $input['buyerUid'] ?? ''));
$vendorUid = trim((string)($input['vendor_uid'] ?? $input['vendorUid'] ?? ''));
$buyerName = trim((string)($input['buyer_name'] ?? $input['buyerName'] ?? ($_SESSION['buyer_name'] ?? 'Buyer')));
$vendorName = trim((string)($input['vendor_name'] ?? $input['vendorName'] ?? ($_SESSION['vendor_name'] ?? 'Vendor')));
$listingId = trim((string)($input['listing_id'] ?? $input['listingId'] ?? ''));
$listingTitle = trim((string)($input['listing_title'] ?? $input['listingTitle'] ?? ''));
$listingImage = trim((string)($input['listing_image'] ?? $input['listingImage'] ?? ''));

if ($chatId === '') {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'chat_id is required']);
    exit;
}

if (!in_array($role, ['buyer', 'vendor'], true)) {
    if (isset($_SESSION['buyer_uid'])) {
        $role = 'buyer';
    } elseif (isset($_SESSION['vendor_uid'])) {
        $role = 'vendor';
    } else {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Role is required']);
        exit;
    }
}

if ($role === 'buyer') {
    $senderUid = trim((string)($_SESSION['buyer_uid'] ?? ''));
    $senderName = trim((string)($_SESSION['buyer_name'] ?? $buyerName));
    if ($buyerUid === '') {
        $buyerUid = $senderUid;
    }
} else {
    $senderUid = trim((string)($_SESSION['vendor_uid'] ?? ''));
    $senderName = trim((string)($_SESSION['vendor_name'] ?? $vendorName));
    if ($vendorUid === '') {
        $vendorUid = $senderUid;
    }
}

if ($senderUid === '') {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Authentication required']);
    exit;
}

if ($buyerUid === '' || $vendorUid === '') {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Chat participants required']);
    exit;
}

if ($text === '' && $imageUrl === '' && $voiceUrl === '') {
    http_response_code(422);
    echo json_encode(['success' => false, 'message' => 'Message content required']);
    exit;
}

$type = 'text';
if ($voiceUrl !== '') {
    $type = 'voice';
} elseif ($imageUrl !== '') {
    $type = 'image';
}

try {
    $messageId = 'msg_' . bin2hex(random_bytes(8));
    $messagePath = yustam_firestore_document_path('chats', $chatId, 'messages', $messageId);
    $chatPath = yustam_firestore_document_path('chats', $chatId);

    $messageFields = [
        'sender_uid' => yustam_firestore_string($senderUid),
        'sender_role' => yustam_firestore_string($role),
        'type' => yustam_firestore_string($type),
        'read_by' => yustam_firestore_map([$senderUid => yustam_firestore_boolean(true)]),
    ];
    if ($text !== '') {
        $messageFields['text'] = yustam_firestore_string($text);
    }
    if ($imageUrl !== '') {
        $messageFields['image_url'] = yustam_firestore_string($imageUrl);
    }
    if ($voiceUrl !== '') {
        $messageFields['voice_url'] = yustam_firestore_string($voiceUrl);
    }
    if ($duration !== null) {
        $messageFields['duration'] = yustam_firestore_double($duration);
    }

    $writes = [];
    $writes[] = [
        'update' => [
            'name' => $messagePath,
            'fields' => $messageFields,
        ],
        'currentDocument' => ['exists' => false],
    ];
    $writes[] = [
        'transform' => [
            'document' => $messagePath,
            'fieldTransforms' => [
                ['fieldPath' => 'ts', 'setToServerValue' => 'REQUEST_TIME'],
            ],
        ],
    ];

    $preview = $type === 'text' ? $text : ($type === 'image' ? 'Photo' : 'Voice note');

    $chatFields = [
        'chat_id' => yustam_firestore_string($chatId),
        'buyer_uid' => yustam_firestore_string($buyerUid),
        'buyer_name' => yustam_firestore_string($buyerName),
        'vendor_uid' => yustam_firestore_string($vendorUid),
        'vendor_name' => yustam_firestore_string($vendorName),
        'listing_id' => yustam_firestore_string($listingId),
        'listing_title' => yustam_firestore_string($listingTitle),
        'listing_image' => yustam_firestore_string($listingImage),
        'last_text' => yustam_firestore_string($preview),
        'last_type' => yustam_firestore_string($type),
        'last_sender_uid' => yustam_firestore_string($senderUid),
        'last_sender_role' => yustam_firestore_string($role),
    ];
    if ($role === 'buyer') {
        $chatFields['unread_for_buyer'] = yustam_firestore_integer(0);
    } else {
        $chatFields['unread_for_vendor'] = yustam_firestore_integer(0);
    }

    $writes[] = [
        'update' => [
            'name' => $chatPath,
            'fields' => $chatFields,
        ],
        'updateMask' => ['fieldPaths' => array_keys($chatFields)],
    ];

    $transforms = [
        ['fieldPath' => 'last_ts', 'setToServerValue' => 'REQUEST_TIME'],
    ];
    if ($role === 'buyer') {
        $transforms[] = ['fieldPath' => 'unread_for_vendor', 'increment' => yustam_firestore_integer(1)];
    } else {
        $transforms[] = ['fieldPath' => 'unread_for_buyer', 'increment' => yustam_firestore_integer(1)];
    }
    $writes[] = [
        'transform' => [
            'document' => $chatPath,
            'fieldTransforms' => $transforms,
        ],
    ];

    yustam_firestore_commit($writes);

    echo json_encode([
        'success' => true,
        'message_id' => $messageId,
        'type' => $type,
    ]);
} catch (Throwable $exception) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Unable to send message',
        'error' => $exception->getMessage(),
    ]);
}
