<?php
require_once __DIR__ . '/session-path.php';
session_start();

header('Content-Type: application/json');

if (!isset($_SESSION['vendor_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Please sign in to update your settings.']);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Unsupported request method.']);
    exit;
}

$rawInput = file_get_contents('php://input');
$payload = json_decode($rawInput, true);

if (!is_array($payload)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid payload.']);
    exit;
}

$defaults = [
    'notifApproved' => true,
    'notifPlanExpiry' => true,
    'notifBuyerMsg' => false,
    'notifUpdates' => true,
    'twoFactor' => false,
    'loginAlert' => true,
    'theme' => 'system',
];

$sanitized = $defaults;

foreach ($defaults as $key => $defaultValue) {
    if (!array_key_exists($key, $payload)) {
        continue;
    }

    if (is_bool($defaultValue)) {
        $sanitized[$key] = (bool)$payload[$key];
    } elseif ($key === 'theme') {
        $value = $payload[$key];
        $sanitized[$key] = in_array($value, ['light', 'dark', 'system'], true) ? $value : 'system';
    }
}

$vendorId = (int)$_SESSION['vendor_id'];
$settingsDir = __DIR__ . '/data/vendor-settings';
if (!is_dir($settingsDir) && !mkdir($settingsDir, 0755, true) && !is_dir($settingsDir)) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Unable to prepare settings directory.']);
    exit;
}

$settingsFile = $settingsDir . "/vendor_{$vendorId}.json";
$json = json_encode($sanitized, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);

if (file_put_contents($settingsFile, $json) === false) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Failed to persist settings.']);
    exit;
}

echo json_encode(['success' => true, 'settings' => $sanitized]);
