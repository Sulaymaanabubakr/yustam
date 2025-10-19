<?php
declare(strict_types=1);

require_once __DIR__ . '/../../session-path.php';
session_start();

require_once __DIR__ . '/../../db.php';
require_once __DIR__ . '/firebase.php';

header('Content-Type: application/json');

$timestampNormalizer = static function ($value): int {
    if ($value === null || $value === '') {
        return 0;
    }
    if (is_numeric($value)) {
        return (int)$value;
    }
    if (is_string($value)) {
        $time = strtotime($value);
        return $time !== false ? $time : 0;
    }
    if (is_array($value)) {
        if (isset($value['seconds'])) {
            $seconds = (int)$value['seconds'];
            $nanos = isset($value['nanos']) ? (int)$value['nanos'] : 0;
            return $seconds + (int)round($nanos / 1_000_000_000);
        }
    }
    if (is_object($value) && isset($value->seconds)) {
        $seconds = (int)$value->seconds;
        $nanos = isset($value->nanos) ? (int)$value->nanos : 0;
        return $seconds + (int)round($nanos / 1_000_000_000);
    }
    return 0;
};

$role = strtolower(trim((string)($_GET['role'] ?? $_POST['role'] ?? '')));
$uid = trim((string)($_GET['uid'] ?? $_POST['uid'] ?? ''));

if (!in_array($role, ['buyer', 'vendor'], true)) {
    if (isset($_SESSION['buyer_firebase_uid'])) {
        $role = 'buyer';
        $uid = (string)$_SESSION['buyer_firebase_uid'];
    } elseif (isset($_SESSION['vendor_firebase_uid'])) {
        $role = 'vendor';
        $uid = (string)$_SESSION['vendor_firebase_uid'];
    }
}

if ($uid === '') {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Authentication required']);
    exit;
}

$fieldPath = $role === 'vendor' ? 'vendor_uid' : 'buyer_uid';

$chats = [];

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
        'limit' => 50,
    ];

    $results = yustam_firestore_run_query($query);
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

    usort($chats, static function ($a, $b) use ($timestampNormalizer) {
        $aTs = $timestampNormalizer($a['last_ts'] ?? null);
        $bTs = $timestampNormalizer($b['last_ts'] ?? null);
        return $bTs <=> $aTs;
    });
} catch (Throwable $firestoreError) {
    error_log('list-chats Firestore error: ' . $firestoreError->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Unable to list chats',
        'error' => $firestoreError->getMessage(),
    ]);
    return;
}

echo json_encode([
    'success' => true,
    'role' => $role,
    'uid' => $uid,
    'source' => 'firestore',
    'chats' => $chats,
]);
