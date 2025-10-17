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
$buyerUid = trim((string)($input['buyer_uid'] ?? $input['buyerUid'] ?? ($_SESSION['buyer_uid'] ?? '')));
$buyerName = trim((string)($input['buyer_name'] ?? $input['buyerName'] ?? ($_SESSION['buyer_name'] ?? 'Buyer')));
$vendorUid = trim((string)($input['vendor_uid'] ?? $input['vendorUid'] ?? ($_SESSION['vendor_uid'] ?? '')));
$vendorName = trim((string)($input['vendor_name'] ?? $input['vendorName'] ?? ($_SESSION['vendor_name'] ?? 'Vendor')));
$listingId = trim((string)($input['listing_id'] ?? $input['listingId'] ?? ''));
$listingTitle = trim((string)($input['listing_title'] ?? $input['listingTitle'] ?? ''));
$listingImage = trim((string)($input['listing_image'] ?? $input['listingImage'] ?? ''));

if ($chatId === '' || $buyerUid === '' || $vendorUid === '' || $listingId === '') {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'chat_id, buyer_uid, vendor_uid and listing_id are required']);
    exit;
}

try {
    $chatPath = 'chats/' . $chatId;
    $document = yustam_firestore_get_document($chatPath);
    if ($document === null) {
        $writes = [];
        $chatName = yustam_firestore_document_path('chats', $chatId);
        $fields = [
            'chat_id' => yustam_firestore_string($chatId),
            'buyer_uid' => yustam_firestore_string($buyerUid),
            'buyer_name' => yustam_firestore_string($buyerName),
            'vendor_uid' => yustam_firestore_string($vendorUid),
            'vendor_name' => yustam_firestore_string($vendorName),
            'listing_id' => yustam_firestore_string($listingId),
            'listing_title' => yustam_firestore_string($listingTitle),
            'listing_image' => yustam_firestore_string($listingImage),
            'unread_for_buyer' => yustam_firestore_integer(0),
            'unread_for_vendor' => yustam_firestore_integer(0),
            'last_text' => yustam_firestore_string('Chat started'),
            'last_type' => yustam_firestore_string('system'),
        ];
        $writes[] = [
            'update' => [
                'name' => $chatName,
                'fields' => $fields,
            ],
            'currentDocument' => ['exists' => false],
        ];
        $writes[] = [
            'transform' => [
                'document' => $chatName,
                'fieldTransforms' => [
                    ['fieldPath' => 'last_ts', 'setToServerValue' => 'REQUEST_TIME'],
                ],
            ],
        ];
        yustam_firestore_commit($writes);
        $document = yustam_firestore_get_document($chatPath);
    }

    $response = [
        'success' => true,
        'chat_id' => $chatId,
        'data' => [],
    ];
    if (isset($document['fields'])) {
        foreach ($document['fields'] as $key => $value) {
            $response['data'][$key] = yustam_firestore_decode($value);
        }
    }
    echo json_encode($response);
} catch (Throwable $exception) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Unable to open chat',
        'error' => $exception->getMessage(),
    ]);
}
