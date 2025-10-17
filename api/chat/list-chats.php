<?php
declare(strict_types=1);

require_once __DIR__ . '/../../session-path.php';
session_start();

require_once __DIR__ . '/firebase.php';

header('Content-Type: application/json');

$role = strtolower(trim((string)($_GET['role'] ?? $_POST['role'] ?? '')));
$uid = trim((string)($_GET['uid'] ?? $_POST['uid'] ?? ''));

if (!in_array($role, ['buyer', 'vendor'], true)) {
    if (isset($_SESSION['buyer_uid'])) {
        $role = 'buyer';
        $uid = (string)$_SESSION['buyer_uid'];
    } elseif (isset($_SESSION['vendor_uid'])) {
        $role = 'vendor';
        $uid = (string)$_SESSION['vendor_uid'];
    }
}

if ($uid === '') {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Authentication required']);
    exit;
}

$fieldPath = $role === 'vendor' ? 'vendor_uid' : 'buyer_uid';

try {
    $query = [
        'from' => [
            ['collectionId' => 'chats'],
        ],
        'where' => [
            'fieldFilter' => [
                'field' => ['fieldPath' => $fieldPath],
                'op' => 'EQUAL',
                'value' => yustam_firestore_string($uid),
            ],
        ],
        'orderBy' => [
            ['field' => ['fieldPath' => 'last_ts'], 'direction' => 'DESCENDING'],
        ],
        'limit' => 50,
    ];

    $results = yustam_firestore_run_query($query);
    $chats = [];
    foreach ($results as $result) {
        if (!isset($result['document']['fields'])) {
            continue;
        }
        $fields = [];
        foreach ($result['document']['fields'] as $key => $value) {
            $fields[$key] = yustam_firestore_decode($value);
        }
        $fields['chat_id'] = $fields['chat_id'] ?? basename($result['document']['name']);
        $chats[] = $fields;
    }

    echo json_encode([
        'success' => true,
        'role' => $role,
        'uid' => $uid,
        'chats' => $chats,
    ]);
} catch (Throwable $exception) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Unable to list chats',
        'error' => $exception->getMessage(),
    ]);
}
