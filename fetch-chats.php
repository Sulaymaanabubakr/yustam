<?php
declare(strict_types=1);

require_once __DIR__ . '/session-path.php';
session_start();

require_once __DIR__ . '/chat-storage.php';

header('Content-Type: application/json');

$db = yustam_chat_connection();

$isBuyer = isset($_SESSION['buyer_uid']) && $_SESSION['buyer_uid'] !== '';
$isVendor = isset($_SESSION['vendor_uid']) && $_SESSION['vendor_uid'] !== '';

if (!$isBuyer && !$isVendor) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Please sign in to continue.']);
    exit;
}

$scope = isset($_GET['scope']) ? strtolower(trim((string)$_GET['scope'])) : '';
$chatId = isset($_GET['chat_id']) ? trim((string)$_GET['chat_id']) : '';
$limit = isset($_GET['limit']) ? max(1, (int)$_GET['limit']) : 20;
$afterId = isset($_GET['after_id']) ? (int)$_GET['after_id'] : null;

$buyerUid = isset($_GET['buyer_uid']) ? trim((string)$_GET['buyer_uid']) : ($isBuyer ? $_SESSION['buyer_uid'] : '');
$vendorUid = isset($_GET['vendor_uid']) ? trim((string)$_GET['vendor_uid']) : ($isVendor ? $_SESSION['vendor_uid'] : '');
$productId = isset($_GET['product_id']) ? trim((string)$_GET['product_id']) : '';

if ($chatId === '' && $buyerUid !== '' && $vendorUid !== '' && $productId !== '') {
    $chatId = yustam_chat_build_id($vendorUid, $buyerUid, $productId);
}

try {
    if ($scope === 'thread' || $chatId !== '') {
        if ($chatId === '') {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Conversation not found.']);
            exit;
        }

        $viewerUid = $isBuyer ? $_SESSION['buyer_uid'] : $_SESSION['vendor_uid'];
        $messages = yustam_chat_fetch_messages($db, $chatId, $afterId, 200);
        $conversation = yustam_chat_fetch_conversation($db, $chatId);
        $summary = $conversation ? yustam_chat_conversation_summary($conversation, $viewerUid) : null;

        yustam_chat_mark_seen($db, $chatId, $viewerUid);

        echo json_encode([
            'success' => true,
            'chatId' => $chatId,
            'conversation' => $summary,
            'messages' => $messages
        ]);
        exit;
    }

    $viewerUid = $isBuyer ? $_SESSION['buyer_uid'] : $_SESSION['vendor_uid'];
    $role = $isBuyer ? 'buyer' : 'vendor';
    $conversations = yustam_chat_list_conversations($db, $viewerUid, $role, $limit);
    $summaries = array_map(fn ($row) => yustam_chat_conversation_summary($row, $viewerUid), $conversations);

    echo json_encode([
        'success' => true,
        'role' => $role,
        'conversations' => $summaries
    ]);
} catch (Throwable $exception) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Unable to fetch chats right now.',
        'debug' => $exception->getMessage()
    ]);
}
