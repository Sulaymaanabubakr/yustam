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
$vendorDirectory = [];
$vendorConnection = null;

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
        $document = $result['document'] ?? $result['found'] ?? null;
        if (!is_array($document)) {
            continue;
        }

        $fieldsRaw = isset($document['fields']) && is_array($document['fields']) ? $document['fields'] : [];
        $fields = [];
        foreach ($fieldsRaw as $key => $value) {
            $fields[$key] = yustam_firestore_decode($value);
        }
        if (!isset($fields['chat_id']) && isset($document['name'])) {
            $fields['chat_id'] = basename($document['name']);
        }

        if ($role === 'buyer') {
            $vendorUid = trim((string)($fields['vendor_uid'] ?? ''));
            if ($vendorUid !== '') {
                if (!array_key_exists($vendorUid, $vendorDirectory)) {
                    try {
                        $vendorConnection = $vendorConnection ?: get_db_connection();
                        $vendorDirectory[$vendorUid] = yustam_vendor_find_by_uid($vendorUid, $vendorConnection);
                    } catch (Throwable $vendorLookupError) {
                        error_log('list-chats vendor lookup failed: ' . $vendorLookupError->getMessage());
                        $vendorDirectory[$vendorUid] = null;
                    }
                }
                $vendorRecord = $vendorDirectory[$vendorUid];
                if (is_array($vendorRecord)) {
                    $businessName = yustam_vendor_business_name($vendorRecord);
                    if ($businessName !== '') {
                        $fields['vendor_business_name'] = $businessName;
                        $fields['vendor_name'] = $businessName;
                    }
                }
            }
        }

        error_log(sprintf(
            'list-chats candidate role=%s uid=%s chat=%s buyer=%s vendor=%s source=%s',
            $role,
            $uid,
            $fields['chat_id'] ?? '',
            $fields['buyer_uid'] ?? '',
            $fields['vendor_uid'] ?? '',
            isset($result['found']) ? 'found' : 'document'
        ));

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

$keyMap = [
    'chat_id' => 'chatId',
    'buyer_uid' => 'buyerUid',
    'buyer_name' => 'buyerName',
    'vendor_uid' => 'vendorUid',
    'vendor_name' => 'vendorName',
    'vendor_business_name' => 'vendorBusinessName',
    'listing_id' => 'listingId',
    'listing_title' => 'listingTitle',
    'listing_image' => 'listingImage',
    'last_text' => 'lastMessage',
    'last_sender_role' => 'lastSenderRole',
    'last_ts' => 'lastTs',
    'unread_for_buyer' => 'unreadForBuyer',
    'unread_for_vendor' => 'unreadForVendor',
    'vendor_plan' => 'vendorPlan',
    'vendor_plan_label' => 'vendorPlanLabel',
    'vendor_plan_slug' => 'vendorPlanSlug',
    'vendor_verified' => 'vendorVerified',
    'buyer_last_read_ts' => 'buyerLastReadTs',
    'vendor_last_read_ts' => 'vendorLastReadTs',
];
$formatChat = static function (array $chat) use ($keyMap, $timestampNormalizer): array {
    $camelChat = [];
    foreach ($chat as $key => $value) {
        $camelKey = $keyMap[$key] ?? $key;
        $camelChat[$camelKey] = $value;
    }
    // Ensure timestamp is an integer
    if (isset($camelChat['lastTs'])) {
        $camelChat['lastTs'] = $timestampNormalizer($camelChat['lastTs']);
    }
    return $camelChat;
};

echo json_encode([
    'success' => true,
    'role' => $role,
    'uid' => $uid,
    'source' => 'firestore',
    'chats' => array_map($formatChat, $chats),
]);

