<?php
declare(strict_types=1);

require_once __DIR__ . '/session-path.php';
session_start();

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/vendor-subscriptions.php';

header('Content-Type: application/json');

if (!isset($_SESSION['vendor_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Please sign in to manage subscriptions.']);
    exit;
}

$payload = [];
$raw = file_get_contents('php://input');
if (is_string($raw) && trim($raw) !== '') {
    $decoded = json_decode($raw, true);
    if (is_array($decoded)) {
        $payload = $decoded;
    }
}
if (empty($payload) && !empty($_POST)) {
    $payload = $_POST;
}

$action = strtolower(trim((string) ($payload['action'] ?? '')));
if ($action === '') {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Choose an action to continue.']);
    exit;
}

$db = get_db_connection();
$vendorId = (int) $_SESSION['vendor_id'];

try {
    if ($action === 'activate') {
        $reference = trim((string) ($payload['reference'] ?? ''));
        $planSlug = isset($payload['planSlug']) ? (string) $payload['planSlug'] : null;
        $durationMonths = isset($payload['durationMonths']) ? (int) $payload['durationMonths'] : null;
        if ($reference === '') {
            throw new RuntimeException('Payment reference is required.');
        }
        $result = yustam_vendor_subscription_process_payment($db, $vendorId, $reference, $planSlug, $durationMonths);
        $subscription = $result['subscription'] ?? [];
        $response = [
            'success' => true,
            'message' => 'Subscription activated successfully.',
            'subscription' => $subscription,
            'redirectTo' => 'plan-success.php?reference=' . rawurlencode($reference),
        ];
        echo json_encode($response, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        exit;
    }

    if ($action === 'cancel') {
        $result = yustam_vendor_subscription_cancel($db, $vendorId);
        $subscription = $result['subscription'] ?? [];
        $response = [
            'success' => true,
            'message' => 'Auto-renewal has been cancelled. You remain on your plan until the current period ends.',
            'subscription' => $subscription,
        ];
        echo json_encode($response, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        exit;
    }

    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Unsupported subscription action.']);
} catch (Throwable $exception) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $exception->getMessage(),
    ]);
}
