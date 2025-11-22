<?php
declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    fwrite(STDERR, "This utility must be executed from the command line.\n");
    exit(1);
}

define('YUSTAM_SKIP_EMAIL_LIB', true);
require_once __DIR__ . '/../api/bootstrap.php';

yustam_api_load_env();
yustam_api_ensure_chat_table();

$options = getopt('', ['dry-run', 'chat:', 'limit:', 'verbose']);
$dryRun = array_key_exists('dry-run', $options);
$verbose = array_key_exists('verbose', $options);
$targetChatId = isset($options['chat']) ? trim((string) $options['chat']) : '';
$limit = isset($options['limit']) ? max(1, (int) $options['limit']) : 0;

$connection = get_db_connection();

$sql = 'SELECT chat_id, buyer_ref, vendor_ref, buyer_uid, vendor_uid, admin_ref, metadata, updated_at '
    . 'FROM `api_chat_threads`';
$types = '';
$params = [];
if ($targetChatId !== '') {
    $sql .= ' WHERE chat_id = ?';
    $types .= 's';
    $params[] = $targetChatId;
}
$sql .= ' ORDER BY updated_at DESC';
if ($limit > 0) {
    $sql .= ' LIMIT ' . $limit;
}

if ($params) {
    $statement = $connection->prepare($sql);
    if (!$statement instanceof mysqli_stmt) {
        throw new RuntimeException('Unable to prepare metadata query.');
    }
    $statement->bind_param($types, ...$params);
    $statement->execute();
    $result = $statement->get_result();
} else {
    $result = $connection->query($sql);
}

if (!$result instanceof mysqli_result) {
    throw new RuntimeException('Failed to fetch chat metadata rows.');
}

$stats = [
    'total' => 0,
    'skipped' => 0,
    'updated_firestore' => 0,
    'created_firestore' => 0,
    'metadata_updates' => 0,
    'missing_firestore' => 0,
    'errors' => 0,
];

function chat_backfill_pick(array $source, array $keys, string $default = ''): string
{
    foreach ($keys as $key) {
        if (!array_key_exists($key, $source)) {
            continue;
        }
        $value = $source[$key];
        if ($value === null) {
            continue;
        }
        $stringValue = trim((string) $value);
        if ($stringValue !== '') {
            return $stringValue;
        }
    }
    return $default;
}

function chat_backfill_merge(array $base, array $update): array
{
    if (!$base) {
        return $update;
    }
    foreach ($update as $key => $value) {
        if ($value === null) {
            continue;
        }
        if (is_string($value) && trim($value) === '') {
            continue;
        }
        $base[$key] = $value;
    }
    return $base;
}

function chat_backfill_timestamp(?string $value): ?array
{
    if ($value === null || trim($value) === '') {
        return null;
    }
    $time = strtotime($value);
    if ($time === false) {
        return null;
    }
    return ['timestampValue' => gmdate('Y-m-d\TH:i:s\Z', $time)];
}

while ($row = $result->fetch_assoc()) {
    $stats['total']++;

    try {
        $chatId = trim((string) ($row['chat_id'] ?? ''));
        if ($chatId === '') {
            $stats['skipped']++;
            fwrite(STDERR, "Skipping row with empty chat_id.\n");
            continue;
        }

        $metadata = [];
        if (!empty($row['metadata'])) {
            $decoded = json_decode((string) $row['metadata'], true);
            if (is_array($decoded)) {
                $metadata = $decoded;
            }
        }

        $buyerUid = chat_backfill_pick($metadata, ['buyer_uid', 'buyerUid']);
        if ($buyerUid === '' && !empty($row['buyer_uid'])) {
            $buyerUid = trim((string) $row['buyer_uid']);
        }
        $vendorUid = chat_backfill_pick($metadata, ['vendor_uid', 'vendorUid']);
        if ($vendorUid === '' && !empty($row['vendor_uid'])) {
            $vendorUid = trim((string) $row['vendor_uid']);
        }

        $buyerName = chat_backfill_pick($metadata, ['buyer_name', 'buyerName'], 'Buyer');
        $vendorName = chat_backfill_pick(
            $metadata,
            ['vendor_business_name', 'vendorBusinessName', 'vendor_name', 'vendorName'],
            'Vendor'
        );
        $vendorBusiness = chat_backfill_pick(
            $metadata,
            ['vendor_business_name', 'vendorBusinessName', 'vendor_name', 'vendorName'],
            $vendorName
        );
        $listingId = chat_backfill_pick($metadata, ['listing_id', 'listingId']);
        $listingTitle = chat_backfill_pick($metadata, ['listing_title', 'listingTitle']);
        $listingImage = chat_backfill_pick($metadata, ['listing_image', 'listingImage']);
        $lastText = chat_backfill_pick(
            $metadata,
            ['last_text', 'lastText', 'last_message', 'lastMessage'],
            'Conversation restored'
        );
        $lastSenderRole = chat_backfill_pick(
            $metadata,
            ['last_sender_role', 'lastSenderRole'],
            ''
        );

        if ($buyerUid === '' && !empty($row['buyer_ref'])) {
            [$buyerRole, $buyerId] = yustam_api_parse_user_reference((string) $row['buyer_ref']);
            if ($buyerRole === 'buyer' && $buyerId > 0) {
                $buyer = yustam_buyers_find($buyerId);
                if ($buyer) {
                    $buyerUid = trim((string) ($buyer['firebase_uid'] ?? $buyer['uid'] ?? ''));
                    if ($buyerName === 'Buyer') {
                        $buyerName = trim((string) ($buyer['name'] ?? 'Buyer'));
                    }
                }
            }
        }

        if ($vendorUid === '' && !empty($row['vendor_ref'])) {
            [$vendorRole, $vendorId] = yustam_api_parse_user_reference((string) $row['vendor_ref']);
            if ($vendorRole === 'vendor' && $vendorId > 0) {
                $vendor = yustam_vendor_find_by_id($vendorId, $connection);
                if ($vendor) {
                    $vendorUid = yustam_vendor_assign_uid_if_missing($connection, $vendor);
                    $resolvedVendorName = trim((string) yustam_vendor_business_name($vendor));
                    if ($resolvedVendorName !== '') {
                        $vendorBusiness = $vendorBusiness !== 'Vendor' ? $vendorBusiness : $resolvedVendorName;
                        $vendorName = $vendorName !== 'Vendor' ? $vendorName : $resolvedVendorName;
                    }
                }
            }
        }

        if ($vendorUid === '' || $buyerUid === '') {
            $stats['skipped']++;
            if ($verbose) {
                printf(
                    "Skipping chat %s: missing %s UID.\n",
                    $chatId,
                    $buyerUid === '' ? 'buyer' : 'vendor'
                );
            }
            continue;
        }

        $document = yustam_firestore_get_document('chats/' . $chatId);
        $documentPath = yustam_firestore_document_path('chats', $chatId);
        $existingFields = [];
        if ($document && isset($document['fields'])) {
            foreach ($document['fields'] as $key => $value) {
                $existingFields[$key] = yustam_firestore_decode($value);
            }
        }

        $updates = [];
        $mask = [];
        $transforms = [];

        $ensureField = static function (string $field, string $value) use (&$updates, &$mask, $existingFields) {
            if ($value === '') {
                return;
            }
            if (!array_key_exists($field, $existingFields) || (string) $existingFields[$field] !== $value) {
                $updates[$field] = yustam_firestore_string($value);
                $mask[] = $field;
            }
        };

        $ensureField('chat_id', $chatId);
        $ensureField('buyer_uid', $buyerUid);
        $ensureField('vendor_uid', $vendorUid);
        $ensureField('buyer_name', $buyerName);
        $ensureField('vendor_name', $vendorName);
        $ensureField('vendor_business_name', $vendorBusiness);
        $ensureField('listing_id', $listingId);
        $ensureField('listing_title', $listingTitle);
        $ensureField('listing_image', $listingImage);
        $ensureField('last_text', $lastText);
        if ($lastSenderRole !== '') {
            $ensureField('last_sender_role', strtolower($lastSenderRole));
        }

        $metadataUpdate = chat_backfill_merge($metadata, [
            'buyer_ref' => $row['buyer_ref'] ?? '',
            'vendor_ref' => $row['vendor_ref'] ?? '',
            'buyer_uid' => $buyerUid,
            'vendor_uid' => $vendorUid,
            'buyer_name' => $buyerName,
            'vendor_name' => $vendorName,
            'vendor_business_name' => $vendorBusiness,
            'listing_id' => $listingId,
            'listing_title' => $listingTitle,
            'listing_image' => $listingImage,
            'last_text' => $lastText,
            'last_sender_role' => $lastSenderRole,
        ]);

        $shouldSetTimestamp = !array_key_exists('last_ts', $existingFields) || empty($existingFields['last_ts']);
        if ($shouldSetTimestamp) {
            $timestampCandidate = chat_backfill_pick($metadata, ['last_ts', 'lastTs', 'updated_at', 'updatedAt']);
            $timestampField = chat_backfill_timestamp($timestampCandidate);
            if ($timestampField) {
                $updates['last_ts'] = $timestampField;
                $mask[] = 'last_ts';
            } else {
                $transforms[] = ['fieldPath' => 'last_ts', 'setToServerValue' => 'REQUEST_TIME'];
            }
        }

        $writes = [];
        if (!$document) {
            $stats['missing_firestore']++;
            $fields = array_merge(
                $updates,
                [
                    'chat_id' => yustam_firestore_string($chatId),
                    'buyer_uid' => yustam_firestore_string($buyerUid),
                    'vendor_uid' => yustam_firestore_string($vendorUid),
                    'buyer_name' => yustam_firestore_string($buyerName),
                    'vendor_name' => yustam_firestore_string($vendorName),
                    'vendor_business_name' => yustam_firestore_string($vendorBusiness),
                    'listing_id' => yustam_firestore_string($listingId),
                    'listing_title' => yustam_firestore_string($listingTitle),
                    'listing_image' => yustam_firestore_string($listingImage),
                    'last_text' => yustam_firestore_string($lastText),
                    'last_sender_role' => yustam_firestore_string(strtolower($lastSenderRole ?: 'system')),
                    'unread_for_buyer' => yustam_firestore_integer(0),
                    'unread_for_vendor' => yustam_firestore_integer(0),
                ]
            );
            $createWrite = [
                'update' => [
                    'name' => $documentPath,
                    'fields' => $fields,
                ],
                'currentDocument' => ['exists' => false],
            ];
            $writes[] = $createWrite;
        } elseif ($updates || $transforms) {
            $updateWrite = [
                'update' => [
                    'name' => $documentPath,
                    'fields' => $updates,
                ],
            ];
            if ($mask) {
                $updateWrite['updateMask'] = ['fieldPaths' => array_values(array_unique($mask))];
            }
            $writes[] = $updateWrite;
        }

        if ($transforms) {
            $writes[] = [
                'transform' => [
                    'document' => $documentPath,
                    'fieldTransforms' => $transforms,
                ],
            ];
        }

        if ($writes) {
            if ($dryRun) {
                printf("[DRY-RUN] %s -> pending Firestore update (%d operations).\n", $chatId, count($writes));
            } else {
                yustam_firestore_commit($writes);
            }
            if (!$document) {
                $stats['created_firestore']++;
            } else {
                $stats['updated_firestore']++;
            }
        } else {
            $stats['skipped']++;
            if ($verbose) {
                printf("No Firestore changes required for chat %s.\n", $chatId);
            }
        }

        $metadataJson = json_encode($metadataUpdate, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        $updateStmt = $connection->prepare(
            'UPDATE `api_chat_threads` SET buyer_ref = ?, vendor_ref = ?, buyer_uid = ?, vendor_uid = ?, metadata = ? WHERE chat_id = ?'
        );
        if ($updateStmt instanceof mysqli_stmt) {
            $buyerRef = (string) ($row['buyer_ref'] ?? '');
            $vendorRef = (string) ($row['vendor_ref'] ?? '');
            $updateStmt->bind_param(
                'ssssss',
                $buyerRef,
                $vendorRef,
                $buyerUid,
                $vendorUid,
                $metadataJson,
                $chatId
            );
            if (!$dryRun) {
                $updateStmt->execute();
            }
            $updateStmt->close();
            $stats['metadata_updates']++;
        }

        if ($verbose) {
            printf(
                "%s => buyer %s, vendor %s, listing %s\n",
                $chatId,
                $buyerUid,
                $vendorUid,
                $listingId !== '' ? $listingId : '-'
            );
        }
    } catch (Throwable $error) {
        $stats['errors']++;
        fprintf(STDERR, "Failed to repair chat %s: %s\n", $row['chat_id'] ?? 'unknown', $error->getMessage());
    }
}

if (isset($statement) && $statement instanceof mysqli_stmt) {
    $statement->close();
}
$result->free();

printf(
    "Processed %d chat rows. Firestore: %d updated, %d created. Metadata updates: %d. Skipped: %d. Errors: %d.\n",
    $stats['total'],
    $stats['updated_firestore'],
    $stats['created_firestore'],
    $stats['metadata_updates'],
    $stats['skipped'],
    $stats['errors']
);

if ($stats['missing_firestore'] > 0) {
    printf("Firestore documents missing: %d (created during this run if data permitted).\n", $stats['missing_firestore']);
}

if ($dryRun) {
    echo "No changes were applied (dry-run).\n";
}
