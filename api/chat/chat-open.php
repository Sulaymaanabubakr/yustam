<?php
declare(strict_types=1);

require_once __DIR__ . '/../../session-path.php';
session_start();

require_once __DIR__ . '/../../db.php';
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

if ($buyerUid === '' || $vendorUid === '') {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'buyer_uid and vendor_uid are required']);
    exit;
}

$canonicalChatId = $buyerUid . '_' . $vendorUid;
if ($chatId === '' || $chatId !== $canonicalChatId) {
    $chatId = $canonicalChatId;
}

$timestamp = gmdate('Y-m-d H:i:s');
$existingSummary = null;
try {
    $existingSummary = yustam_chat_fetch_summary($chatId);
} catch (Throwable $summaryError) {
    error_log('chat-open summary lookup failed: ' . $summaryError->getMessage());
}

if ($existingSummary === null) {
    try {
        yustam_chat_upsert_summary(
            [
                'chat_id' => $chatId,
                'buyer_uid' => $buyerUid,
                'buyer_name' => $buyerName,
                'vendor_uid' => $vendorUid,
                'vendor_name' => $vendorName,
                'listing_id' => $listingId,
                'listing_title' => $listingTitle,
                'listing_image' => $listingImage,
                'last_message' => 'Chat started',
                'last_type' => 'system',
                'last_sender_uid' => null,
                'last_sender_role' => null,
                'last_sent_at' => $timestamp,
            ],
            null
        );
    } catch (Throwable $upsertError) {
        error_log('chat-open summary upsert failed: ' . $upsertError->getMessage());
    }
}

$firestoreSynced = true;
$documentData = [];

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

    if (isset($document['fields'])) {
        foreach ($document['fields'] as $key => $value) {
            $documentData[$key] = yustam_firestore_decode($value);
        }
    }
} catch (Throwable $exception) {
    $firestoreSynced = false;
    error_log('chat-open Firestore error: ' . $exception->getMessage());
}

$summaryData = $documentData;
if (!$summaryData) {
    try {
        $mysqlSummary = yustam_chat_fetch_summary($chatId);
        if ($mysqlSummary) {
            $summaryData = [
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
    } catch (Throwable $summaryError) {
        error_log('chat-open summary hydrate failed: ' . $summaryError->getMessage());
    }
}

echo json_encode([
    'success' => true,
    'chat_id' => $chatId,
    'data' => $summaryData ?: [],
    'firestore_synced' => $firestoreSynced,
    'source' => $firestoreSynced ? 'firestore' : 'mysql',
]);
