<?php
declare(strict_types=1);

require_once __DIR__ . '/../../session-path.php';
session_start();

require_once __DIR__ . '/../../cometchat.php';
require_once __DIR__ . '/../../buyer-storage.php';
require_once __DIR__ . '/../../db.php';

header('Content-Type: application/json; charset=UTF-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode([
        'success' => false,
        'message' => 'Only POST requests are allowed.',
    ]);
    exit;
}

$rawInput = file_get_contents('php://input');
$payload = json_decode($rawInput ?: '', true);
if (!is_array($payload)) {
    $payload = $_POST;
}

$receiverUid = trim((string) ($payload['receiver_uid'] ?? $payload['receiverUid'] ?? ''));
$receiverName = trim((string) ($payload['receiver_name'] ?? $payload['receiverName'] ?? ''));
$receiverRole = trim((string) ($payload['receiver_role'] ?? $payload['receiverRole'] ?? ''));
$receiverAvatar = trim((string) ($payload['receiver_avatar'] ?? $payload['receiverAvatar'] ?? ''));

$messageText = trim((string) ($payload['message'] ?? $payload['text'] ?? ''));
$listingId = trim((string) ($payload['listing_id'] ?? $payload['listingId'] ?? ''));
$listingTitle = trim((string) ($payload['listing_title'] ?? $payload['listingTitle'] ?? ''));
$listingImage = trim((string) ($payload['listing_image'] ?? $payload['listingImage'] ?? ''));

$senderUid = trim((string) ($_SESSION['yustam_uid'] ?? ''));
$senderRole = $_SESSION['yustam_role'] ?? '';
$senderName = '';
$senderAvatar = '';

if ($senderUid === '' && isset($_SESSION['buyer_uid'])) {
    $senderUid = trim((string) $_SESSION['buyer_uid']);
    $senderRole = 'buyer';
}
if ($senderUid === '' && isset($_SESSION['vendor_uid'])) {
    $senderUid = trim((string) $_SESSION['vendor_uid']);
    $senderRole = 'vendor';
}

if ($senderUid === '') {
    http_response_code(401);
    echo json_encode([
        'success' => false,
        'message' => 'Please sign in to send a message.',
    ]);
    exit;
}

if ($receiverUid === '') {
    http_response_code(422);
    echo json_encode([
        'success' => false,
        'message' => 'Receiver UID is required.',
    ]);
    exit;
}

if ($senderRole === 'buyer') {
    $senderName = trim((string) ($_SESSION['buyer_name'] ?? 'Buyer'));
    $buyerId = isset($_SESSION['buyer_id']) ? (int) $_SESSION['buyer_id'] : 0;
    if ($buyerId > 0) {
        try {
            $buyer = yustam_buyers_find($buyerId);
            if ($buyer && isset($buyer['avatar'])) {
                $senderAvatar = trim((string) $buyer['avatar']);
            }
        } catch (Throwable $e) {
            error_log('CometChat send-message buyer lookup failed: ' . $e->getMessage());
        }
    }
} elseif ($senderRole === 'vendor') {
    $senderName = trim((string) ($_SESSION['vendor_name'] ?? 'Vendor'));
    if ($senderName === '') {
        $senderName = 'Vendor';
    }
} else {
    $senderRole = 'buyer';
    $senderName = trim((string) ($_SESSION['buyer_name'] ?? 'Buyer'));
}

if ($receiverName === '') {
    $receiverName = 'YUSTAM Vendor';
}

try {
    yustam_cometchat_register_user($senderUid, $senderName, $senderRole, $senderAvatar !== '' ? $senderAvatar : null);
    yustam_cometchat_register_user($receiverUid, $receiverName, $receiverRole !== '' ? $receiverRole : null, $receiverAvatar !== '' ? $receiverAvatar : null);
} catch (Throwable $e) {
    error_log('CometChat send-message user sync failed: ' . $e->getMessage());
}

if ($messageText === '') {
    echo json_encode([
        'success' => true,
        'message' => 'No message to send. Users synchronised.',
        'skipped' => true,
    ]);
    exit;
}

$metadata = [];
if ($listingId !== '') {
    $metadata['listing_id'] = $listingId;
}
if ($listingTitle !== '') {
    $metadata['listing_title'] = $listingTitle;
}
if ($listingImage !== '') {
    $metadata['listing_image'] = $listingImage;
}
$metadata['origin'] = 'quick_message';

$result = yustam_cometchat_send_text_message(
    $senderUid,
    $receiverUid,
    $messageText,
    $metadata
);

if (!($result['success'] ?? false)) {
    $message = 'Unable to send message via CometChat.';
    if (is_array($result['response'] ?? null) && isset($result['response']['data'])) {
        $message = json_encode($result['response']['data']);
    } elseif (isset($result['response']['message'])) {
        $message = (string) $result['response']['message'];
    } elseif (isset($result['reason'])) {
        $message = (string) $result['reason'];
    }

    http_response_code($result['http_code'] ?? 502);
    echo json_encode([
        'success' => false,
        'message' => $message,
        'response' => $result['response'] ?? null,
    ]);
    exit;
}

echo json_encode([
    'success' => true,
    'message' => 'Message sent.',
    'response' => $result['response'] ?? null,
]);
