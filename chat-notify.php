<?php
declare(strict_types=1);

require_once __DIR__ . '/session-path.php';
session_start();

require_once __DIR__ . '/notifications-storage.php';

header('Content-Type: application/json');

function respond_chat_notify(array $payload, int $statusCode = 200): void
{
    http_response_code($statusCode);
    echo json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}

if (!isset($_SESSION['buyer_id']) && !isset($_SESSION['vendor_id'])) {
    respond_chat_notify(['success' => false, 'message' => 'Please sign in to continue.'], 401);
}

$rawBody = file_get_contents('php://input');
$data = json_decode($rawBody, true);
if (!is_array($data)) {
    $data = $_POST;
}

$recipientType = isset($data['recipientType']) ? strtolower(trim((string) $data['recipientType'])) : '';
$recipientId = isset($data['recipientId']) ? (int) $data['recipientId'] : 0;
$messagePreview = isset($data['message']) ? trim((string) $data['message']) : '';
$senderName = isset($data['senderName']) ? trim((string) $data['senderName']) : 'Marketplace user';

if ($recipientType === '' || $recipientId <= 0) {
    respond_chat_notify(['success' => false, 'message' => 'Invalid notification payload supplied.'], 400);
}

if ($recipientType !== 'vendor') {
    respond_chat_notify(['success' => true, 'message' => 'Notification channel not required for this recipient.']);
}

try {
    $db = get_db_connection();
    $preview = $messagePreview;
    if (function_exists('mb_strimwidth')) {
        $preview = mb_strimwidth($preview, 0, 90, '…', 'UTF-8');
    } elseif (strlen($preview) > 90) {
        $preview = substr($preview, 0, 87) . '...';
    }

    $title = 'New chat message';
    $message = sprintf('%s: %s', $senderName ?: 'Marketplace user', $preview !== '' ? $preview : 'Sent you a new message.');

    yustam_vendor_notifications_insert(
        $db,
        $recipientId,
        $title,
        $message,
        'Open your chat inbox to reply and keep the conversation going.',
        'chat',
        'new',
        null
    );
} catch (Throwable $exception) {
    error_log('chat-notify failure: ' . $exception->getMessage());
    respond_chat_notify(['success' => false, 'message' => 'Unable to record chat notification.'], 500);
}

respond_chat_notify(['success' => true, 'message' => 'Chat notification recorded.']);
