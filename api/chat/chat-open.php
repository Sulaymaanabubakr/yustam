<?php
declare(strict_types=1);

require_once __DIR__ . '/../../session-path.php';
session_start();

require_once __DIR__ . '/../../db.php';
require_once __DIR__ . '/firebase.php';

header('Content-Type: application/json');

$method = $_SERVER['REQUEST_METHOD'] ?? 'POST';
$input = json_decode((string)file_get_contents('php://input'), true);
if (!is_array($input)) {
    $input = $method === 'GET' ? $_GET : $_POST;
}

if ($method === 'DELETE') {
    $chatId = trim((string)($input['chat_id'] ?? $input['chatId'] ?? $_GET['chat'] ?? ''));
    if ($chatId === '') {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Chat ID is required.']);
        exit;
    }

    $sessionRole = '';
    $sessionUid = '';
    if (!empty($_SESSION['vendor_firebase_uid'])) {
        $sessionRole = 'vendor';
        $sessionUid = trim((string)$_SESSION['vendor_firebase_uid']);
    } elseif (!empty($_SESSION['buyer_firebase_uid'])) {
        $sessionRole = 'buyer';
        $sessionUid = trim((string)$_SESSION['buyer_firebase_uid']);
    } elseif (!empty($_SESSION['firebase_uid'])) {
        $sessionRole = $_SESSION['yustam_role'] ?? '';
        $sessionUid = trim((string)$_SESSION['firebase_uid']);
    }

    if ($sessionRole === '' || $sessionUid === '') {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Please sign in to manage chats.']);
        exit;
    }

    $summary = null;
    try {
        $summary = yustam_chat_fetch_summary($chatId);
    } catch (Throwable $lookupError) {
        error_log('chat-open delete summary lookup failed: ' . $lookupError->getMessage());
    }

    $buyerUid = trim((string)($summary['buyer_uid'] ?? ($input['buyer_uid'] ?? $input['buyerUid'] ?? '')));
    $vendorUid = trim((string)($summary['vendor_uid'] ?? ($input['vendor_uid'] ?? $input['vendorUid'] ?? '')));

    if ($summary === null) {
        try {
            $document = yustam_firestore_get_document('chats/' . $chatId);
            if ($document && isset($document['fields'])) {
                $fields = [];
                foreach ($document['fields'] as $key => $value) {
                    $fields[$key] = yustam_firestore_decode($value);
                }
                $buyerUid = $buyerUid ?: trim((string)($fields['buyer_uid'] ?? ''));
                $vendorUid = $vendorUid ?: trim((string)($fields['vendor_uid'] ?? ''));
            }
        } catch (Throwable $firestoreLookup) {
            error_log('chat-open delete Firestore lookup failed: ' . $firestoreLookup->getMessage());
        }
    }

    $sessionUidLower = strtolower($sessionUid);
    $buyerMatches = $buyerUid !== '' && strtolower($buyerUid) === $sessionUidLower;
    $vendorMatches = $vendorUid !== '' && strtolower($vendorUid) === $sessionUidLower;

    $authorised = ($sessionRole === 'buyer' && $buyerMatches) || ($sessionRole === 'vendor' && $vendorMatches);

    if (!$authorised) {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'You do not have permission to remove this chat.']);
        exit;
    }

    try {
        yustam_chat_delete_conversation($chatId);
    } catch (Throwable $deleteError) {
        error_log('chat-open delete mysql failed: ' . $deleteError->getMessage());
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Unable to delete this conversation right now.']);
        exit;
    }

    try {
        $parentDocument = yustam_firestore_document_path('chats', $chatId);
        $batchSize = 200;
        do {
            $documents = yustam_firestore_list_subcollection_documents($parentDocument, 'messages', $batchSize);
            foreach ($documents as $documentName) {
                $relative = yustam_firestore_relative_path($documentName);
                yustam_firestore_delete_document($relative);
            }
        } while (!empty($documents) && count($documents) === $batchSize);

        yustam_firestore_delete_document('typing/' . $chatId);
        yustam_firestore_delete_document('chats/' . $chatId);
    } catch (Throwable $firestoreDelete) {
        error_log('chat-open delete Firestore cleanup failed: ' . $firestoreDelete->getMessage());
    }

    echo json_encode([
        'success' => true,
        'chat_id' => $chatId,
        'message' => 'Conversation deleted successfully.',
    ]);
    exit;
}

if ($method !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Only POST allowed']);
    exit;
}

$buyerUid = trim((string)($input['buyer_uid'] ?? $input['buyerUid'] ?? ($_SESSION['buyer_firebase_uid'] ?? ($_SESSION['firebase_uid'] ?? ''))));
$buyerName = trim((string)($input['buyer_name'] ?? $input['buyerName'] ?? ($_SESSION['buyer_name'] ?? 'Buyer')));
$vendorUid = trim((string)($input['vendor_uid'] ?? $input['vendorUid'] ?? ($_SESSION['vendor_firebase_uid'] ?? ($_SESSION['firebase_uid'] ?? ''))));
$vendorName = trim((string)($input['vendor_name'] ?? $input['vendorName'] ?? ($_SESSION['vendor_name'] ?? 'Vendor')));
$listingId = trim((string)($input['listing_id'] ?? $input['listingId'] ?? ''));
$listingTitle = trim((string)($input['listing_title'] ?? $input['listingTitle'] ?? ''));
$listingImage = trim((string)($input['listing_image'] ?? $input['listingImage'] ?? ''));

if ($buyerUid === '' || $vendorUid === '') {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'buyer_uid and vendor_uid are required']);
    exit;
}

$chatId = yustam_chat_build_id($buyerUid, $vendorUid);

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
