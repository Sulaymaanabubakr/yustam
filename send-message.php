<?php
declare(strict_types=1);

require_once __DIR__ . '/session-path.php';
session_start();

require_once __DIR__ . '/chat-storage.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Only POST requests are allowed.']);
    exit;
}

try {
    $db = yustam_chat_connection();
} catch (Throwable $exception) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Unable to connect to chat service.',
        'debug' => $exception->getMessage()
    ]);
    exit;
}

$isBuyer = isset($_SESSION['buyer_uid']) && $_SESSION['buyer_uid'] !== '';
$isVendor = isset($_SESSION['vendor_uid']) && $_SESSION['vendor_uid'] !== '';

if (!$isBuyer && !$isVendor) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Please sign in to continue.']);
    exit;
}

$payload = json_decode(file_get_contents('php://input'), true);
if (!is_array($payload)) {
    $payload = $_POST;
}

$buyerUid = trim((string)($payload['buyer_uid'] ?? ''));
$vendorUid = trim((string)($payload['vendor_uid'] ?? ''));
$buyerName = trim((string)($payload['buyer_name'] ?? ($_SESSION['buyer_name'] ?? '')));
$vendorName = trim((string)($payload['vendor_name'] ?? ($_SESSION['vendor_name'] ?? '')));
$productId = trim((string)($payload['product_id'] ?? ''));
$productTitle = trim((string)($payload['product_title'] ?? ''));
$productImage = trim((string)($payload['product_image'] ?? ''));
$chatId = trim((string)($payload['chat_id'] ?? ''));
$messageText = trim((string)($payload['message'] ?? ''));
$imageUrl = trim((string)($payload['image_url'] ?? ''));
$buyerNumeric = isset($payload['buyer_numeric_id']) ? (int)$payload['buyer_numeric_id'] : null;
$vendorNumeric = isset($payload['vendor_numeric_id']) ? (int)$payload['vendor_numeric_id'] : null;

if ($chatId === '' && $buyerUid !== '' && $vendorUid !== '' && $productId !== '') {
    $chatId = yustam_chat_build_id($vendorUid, $buyerUid, $productId);
}

if ($chatId === '' || $buyerUid === '' || $vendorUid === '') {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Missing conversation identifiers.']);
    exit;
}

if ($messageText === '' && $imageUrl === '') {
    http_response_code(422);
    echo json_encode(['success' => false, 'message' => 'Write a message or attach an image.']);
    exit;
}

$senderType = $isBuyer ? 'buyer' : 'vendor';
$senderUid = $isBuyer ? $_SESSION['buyer_uid'] : $_SESSION['vendor_uid'];
$senderId = $isBuyer ? (int)($_SESSION['buyer_id'] ?? 0) : (int)($_SESSION['vendor_id'] ?? 0);

$receiverType = $senderType === 'buyer' ? 'vendor' : 'buyer';
$receiverUid = $receiverType === 'buyer' ? $buyerUid : $vendorUid;

$buyerIdNumeric = isset($_SESSION['buyer_id']) ? (int)$_SESSION['buyer_id'] : null;
$vendorIdNumeric = isset($_SESSION['vendor_id']) ? (int)$_SESSION['vendor_id'] : null;
if ($buyerNumeric !== null && $buyerNumeric > 0) {
    $buyerIdNumeric = $buyerNumeric;
}
if ($vendorNumeric !== null && $vendorNumeric > 0) {
    $vendorIdNumeric = $vendorNumeric;
}

try {
    yustam_chat_ensure_conversation(
        $db,
        $chatId,
        $buyerUid,
        $buyerIdNumeric,
        $buyerName !== '' ? $buyerName : null,
        $vendorUid,
        $vendorIdNumeric,
        $vendorName !== '' ? $vendorName : null,
        $productId !== '' ? $productId : null,
        $productTitle !== '' ? $productTitle : null,
        $productImage !== '' ? $productImage : null
    );

    $conversation = yustam_chat_fetch_conversation($db, $chatId);
    if ($conversation) {
        $buyerUid = $conversation['buyer_uid'] ?? $buyerUid;
        $vendorUid = $conversation['vendor_uid'] ?? $vendorUid;
        $buyerName = $buyerName !== '' ? $buyerName : ($conversation['buyer_name'] ?? '');
        $vendorName = $vendorName !== '' ? $vendorName : ($conversation['vendor_name'] ?? '');
        if ($buyerIdNumeric === null && isset($conversation['buyer_id'])) {
            $buyerIdNumeric = (int) $conversation['buyer_id'] ?: null;
        }
        if ($vendorIdNumeric === null && isset($conversation['vendor_id'])) {
            $vendorIdNumeric = (int) $conversation['vendor_id'] ?: null;
        }
    }

    if ($senderUid === '' && $senderType === 'buyer') {
        $senderUid = $buyerUid !== '' ? $buyerUid : ($_SESSION['buyer_uid'] ?? '');
    }
    if ($senderUid === '' && $senderType === 'vendor') {
        $senderUid = $vendorUid !== '' ? $vendorUid : ($_SESSION['vendor_uid'] ?? '');
    }

    if ($receiverType === 'buyer') {
        $receiverUid = $buyerUid !== '' ? $buyerUid : ($_SESSION['buyer_uid'] ?? '');
    } else {
        $receiverUid = $vendorUid !== '' ? $vendorUid : ($_SESSION['vendor_uid'] ?? '');
    }

    if ($senderUid === $receiverUid) {
        throw new RuntimeException('Chat participants are not distinct.');
    }

    if ($senderUid === '' || $receiverUid === '') {
        throw new RuntimeException('Unable to resolve chat participants.');
    }

    $message = yustam_chat_insert_message(
        $db,
        $chatId,
        $senderUid,
        $senderType,
        $senderType === 'buyer' ? $buyerName : $vendorName,
        $receiverUid,
        $receiverType,
        $messageText !== '' ? $messageText : null,
        $imageUrl !== '' ? $imageUrl : null
    );

    echo json_encode([
        'success' => true,
        'message' => $message,
    ]);
} catch (Throwable $exception) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Unable to send message right now.',
        'debug' => $exception->getMessage(),
    ]);
}
