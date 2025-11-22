<?php

declare(strict_types=1);

use Chat\Support\AttachmentMetadata;

if (PHP_SAPI !== 'cli') {
    fwrite(STDERR, "This utility must be executed via the CLI.\n");
    exit(1);
}

define('YUSTAM_SKIP_EMAIL_LIB', true);
require_once __DIR__ . '/../api/bootstrap.php';
require_once __DIR__ . '/../chat/bootstrap.php';

const CHAT_MEDIA_BACKFILL_TYPES = ['image', 'video', 'voice'];

$options = getopt('', [
    'dry-run',
    'chat:',
    'threads:',
    'limit:',
    'batch:',
    'verbose',
    'skip-cloudinary',
]);

$dryRun = array_key_exists('dry-run', $options);
$verbose = array_key_exists('verbose', $options);
$skipCloudinary = array_key_exists('skip-cloudinary', $options);
$targetChatId = isset($options['chat']) ? trim((string) $options['chat']) : '';
$threadLimit = isset($options['threads']) ? max(1, (int) $options['threads']) : 0;
$messageLimit = isset($options['limit']) ? max(0, (int) $options['limit']) : 0;
$batchSize = isset($options['batch']) ? max(10, min(500, (int) $options['batch'])) : 200;

$connection = get_db_connection();
$chatIds = [];

if ($targetChatId !== '') {
    $chatIds[] = $targetChatId;
} else {
    $sql = "SELECT chat_id FROM `api_chat_threads` WHERE chat_id IS NOT NULL AND chat_id <> '' ORDER BY updated_at DESC";
    if ($threadLimit > 0) {
        $sql .= ' LIMIT ' . $threadLimit;
    }
    $result = $connection->query($sql);
    if (!$result instanceof mysqli_result) {
        throw new RuntimeException('Unable to fetch chat thread identifiers.');
    }
    while ($row = $result->fetch_assoc()) {
        $chatId = trim((string) ($row['chat_id'] ?? ''));
        if ($chatId !== '') {
            $chatIds[] = $chatId;
        }
    }
    $result->free();
}

if ($chatIds === []) {
    fwrite(STDERR, "No chat threads found for metadata backfill.\n");
    exit(0);
}

$stats = [
    'threads_scanned' => 0,
    'messages_scanned' => 0,
    'messages_updated' => 0,
    'skipped_missing_media' => 0,
    'skipped_existing_meta' => 0,
    'cloudinary_failures' => 0,
    'errors' => 0,
];

foreach ($chatIds as $chatId) {
    $stats['threads_scanned']++;
    $cursor = null;
    $threadComplete = false;

    if ($verbose) {
        printf("Processing chat %s\n", $chatId);
    }

    while (!$threadComplete) {
        $documents = chat_media_backfill_fetch_messages($chatId, $cursor, $batchSize);
        if ($documents === []) {
            break;
        }

        foreach ($documents as $document) {
            $stats['messages_scanned']++;

            if ($messageLimit > 0 && $stats['messages_updated'] >= $messageLimit) {
                $threadComplete = true;
                break;
            }

            $message = $document['data'];
            $mediaUrl = chat_media_backfill_resolve_media_url($message);
            if ($mediaUrl === null) {
                $stats['skipped_missing_media']++;
                continue;
            }

            $existingMeta = isset($message['media_meta']) && is_array($message['media_meta'])
                ? $message['media_meta']
                : [];
            if (chat_media_backfill_has_complete_meta($existingMeta)) {
                $stats['skipped_existing_meta']++;
                continue;
            }

            $parsed = chat_media_backfill_extract_cloudinary($mediaUrl);
            $cloudinaryMeta = null;
            if (!$skipCloudinary && $parsed !== null && $parsed['public_id'] !== '') {
                $cloudinaryMeta = chat_media_backfill_fetch_cloudinary_resource(
                    $parsed['public_id'],
                    $parsed['resource_type']
                );
                if ($cloudinaryMeta === null) {
                    $stats['cloudinary_failures']++;
                    if ($verbose) {
                        printf(" - Cloudinary lookup failed for %s (%s).\n", $parsed['public_id'], $mediaUrl);
                    }
                }
            }

            $meta = chat_media_backfill_build_metadata($message, $mediaUrl, $existingMeta, $parsed, $cloudinaryMeta);
            if ($meta === []) {
                $stats['skipped_existing_meta']++;
                continue;
            }

            try {
                chat_media_backfill_commit($document['name'], $meta, $message, $dryRun);
                $stats['messages_updated']++;
                if ($verbose) {
                    printf(
                        " - Updated media metadata for message %s (%s).\n",
                        $message['id'] ?? basename($document['name']),
                        $mediaUrl
                    );
                }
            } catch (Throwable $error) {
                $stats['errors']++;
                fprintf(
                    STDERR,
                    "Failed to update message %s in chat %s: %s\n",
                    $message['id'] ?? basename($document['name']),
                    $chatId,
                    $error->getMessage()
                );
            }
        }

        $last = end($documents);
        $cursor = $last['ts'] ?? $cursor;
        if ($cursor === null) {
            break;
        }

        if ($threadComplete) {
            break;
        }
    }

    if ($messageLimit > 0 && $stats['messages_updated'] >= $messageLimit) {
        break;
    }
}

printf(
    "Chats scanned: %d. Messages scanned: %d. Updated: %d. Skipped (no media): %d. Skipped (already enriched): %d. Cloudinary failures: %d. Errors: %d.\n",
    $stats['threads_scanned'],
    $stats['messages_scanned'],
    $stats['messages_updated'],
    $stats['skipped_missing_media'],
    $stats['skipped_existing_meta'],
    $stats['cloudinary_failures'],
    $stats['errors']
);

if ($dryRun) {
    echo "No changes were applied (dry-run).\n";
}

/**
 * @return array<int, array{data:array<string,mixed>,name:string,ts:int|null}>
 */
function chat_media_backfill_fetch_messages(string $chatId, ?int $afterTs, int $limit): array
{
    $parent = yustam_firestore_document_path('chats', $chatId);

    $filters = [
        [
            'fieldFilter' => [
                'field' => ['fieldPath' => 'type'],
                'op' => 'IN',
                'value' => [
                    'arrayValue' => [
                        'values' => array_map(static fn($type) => ['stringValue' => $type], CHAT_MEDIA_BACKFILL_TYPES),
                    ],
                ],
            ],
        ],
    ];

    if ($afterTs !== null) {
        $filters[] = [
            'fieldFilter' => [
                'field' => ['fieldPath' => 'ts'],
                'op' => 'GREATER_THAN',
                'value' => yustam_firestore_integer($afterTs),
            ],
        ];
    }

    $structuredQuery = [
        'from' => [
            ['collectionId' => 'messages'],
        ],
        'orderBy' => [
            ['field' => ['fieldPath' => 'ts'], 'direction' => 'ASCENDING'],
        ],
        'limit' => $limit,
    ];

    if ($filters) {
        if (count($filters) === 1) {
            $structuredQuery['where'] = $filters[0];
        } else {
            $structuredQuery['where'] = [
                'compositeFilter' => [
                    'op' => 'AND',
                    'filters' => $filters,
                ],
            ];
        }
    }

    $query = [
        'parent' => $parent,
        'structuredQuery' => $structuredQuery,
    ];

    $results = yustam_firestore_run_query($query);
    $documents = [];

    foreach ($results as $result) {
        $document = $result['document'] ?? $result['found'] ?? null;
        if (!is_array($document) || !isset($document['fields'])) {
            continue;
        }

        $data = [];
        foreach ($document['fields'] as $key => $value) {
            $data[$key] = yustam_firestore_decode($value);
        }
        $data['id'] = basename((string) ($document['name'] ?? ''));

        $documents[] = [
            'data' => $data,
            'name' => (string) ($document['name'] ?? ''),
            'ts' => isset($data['ts']) ? (int) $data['ts'] : null,
        ];
    }

    return $documents;
}

function chat_media_backfill_resolve_media_url(array $message): ?string
{
    foreach (['media_url', 'image_url', 'video_url', 'voice_url'] as $field) {
        if (!isset($message[$field])) {
            continue;
        }
        $value = trim((string) $message[$field]);
        if ($value !== '') {
            return $value;
        }
    }
    return null;
}

function chat_media_backfill_has_complete_meta(array $meta): bool
{
    if ($meta === []) {
        return false;
    }

    $required = ['public_id', 'bytes', 'mime_type'];
    foreach ($required as $key) {
        if (!isset($meta[$key]) || trim((string) $meta[$key]) === '') {
            return false;
        }
    }

    return true;
}

/**
 * @return array{public_id:string,resource_type:string,extension:?string}|null
 */
function chat_media_backfill_extract_cloudinary(string $url): ?array
{
    $parts = parse_url($url);
    if ($parts === false || !isset($parts['host']) || stripos($parts['host'], 'cloudinary.com') === false) {
        return null;
    }

    $path = isset($parts['path']) ? trim($parts['path'], '/') : '';
    if ($path === '') {
        return null;
    }

    $segments = array_values(array_filter(explode('/', $path), static fn($segment) => $segment !== ''));
    if (count($segments) < 4) {
        return null;
    }

    $resourceType = $segments[1] ?? 'image';
    $deliveryType = $segments[2] ?? '';
    if ($deliveryType !== 'upload') {
        return null;
    }

    $remaining = array_slice($segments, 3);
    if ($remaining === []) {
        return null;
    }

    $first = $remaining[0];
    if (str_starts_with($first, 'v') && ctype_digit(substr($first, 1))) {
        array_shift($remaining);
    }

    if ($remaining === []) {
        return null;
    }

    $filename = array_pop($remaining);
    $extension = null;
    if (str_contains($filename, '.')) {
        $extension = strtolower((string) pathinfo($filename, PATHINFO_EXTENSION));
        $filename = substr($filename, 0, -(strlen((string) $extension) + 1));
    }

    $publicSegments = array_merge($remaining, [$filename]);
    $publicId = trim(implode('/', $publicSegments), '/');

    if ($publicId === '') {
        return null;
    }

    return [
        'public_id' => $publicId,
        'resource_type' => $resourceType,
        'extension' => $extension,
    ];
}

/**
 * @return array<string, mixed>|null
 */
function chat_media_backfill_fetch_cloudinary_resource(string $publicId, string $resourceType)
{
    try {
        $response = yustam_cloudinary_request($resourceType, 'explicit', [
            'public_id' => $publicId,
            'type' => 'upload',
            'image_metadata' => 'true',
        ]);
        if (!is_array($response)) {
            return null;
        }
        return [
            'public_id' => $response['public_id'] ?? $publicId,
            'resource_type' => $response['resource_type'] ?? $resourceType,
            'format' => $response['format'] ?? null,
            'bytes' => $response['bytes'] ?? null,
            'width' => $response['width'] ?? null,
            'height' => $response['height'] ?? null,
            'duration' => $response['duration'] ?? null,
            'secure_url' => $response['secure_url'] ?? null,
            'original_filename' => $response['original_filename'] ?? null,
            'created_at' => $response['created_at'] ?? null,
        ];
    } catch (Throwable) {
        return null;
    }
}

/**
 * @param array<string, mixed> $message
 * @param array<string, mixed> $existingMeta
 * @param array{public_id:string,resource_type:string,extension:?string}|null $parsed
 * @param array<string, mixed>|null $cloudinary
 * @return array<string, mixed>
 */
function chat_media_backfill_build_metadata(
    array $message,
    string $mediaUrl,
    array $existingMeta,
    ?array $parsed,
    ?array $cloudinary
): array {
    $overrides = [
        'media_type' => $message['type'] ?? null,
        'secure_url' => $cloudinary['secure_url'] ?? $mediaUrl,
        'public_id' => $existingMeta['public_id'] ?? ($cloudinary['public_id'] ?? ($parsed['public_id'] ?? null)),
        'resource_type' => $cloudinary['resource_type'] ?? ($parsed['resource_type'] ?? null),
        'format' => $cloudinary['format'] ?? ($parsed['extension'] ?? null),
        'bytes' => $cloudinary['bytes'] ?? null,
        'width' => $cloudinary['width'] ?? null,
        'height' => $cloudinary['height'] ?? null,
        'duration' => $cloudinary['duration'] ?? ($message['voice_duration'] ?? null),
        'original_filename' => $cloudinary['original_filename'] ?? null,
        'created_at' => $cloudinary['created_at'] ?? null,
    ];

    $mime = chat_media_backfill_guess_mime(
        $overrides['resource_type'] ?? null,
        $overrides['format'] ?? null,
        (string) ($message['type'] ?? 'text'),
        $mediaUrl
    );
    if ($mime !== null) {
        $overrides['mime_type'] = $mime;
    }

    $meta = AttachmentMetadata::normalise($existingMeta, array_filter(
        $overrides,
        static fn($value) => $value !== null && $value !== ''
    ));

    return $meta;
}

function chat_media_backfill_guess_mime(?string $resourceType, ?string $format, string $messageType, string $url): ?string
{
    $format = $format !== null && $format !== '' ? strtolower($format) : strtolower((string) pathinfo($url, PATHINFO_EXTENSION));
    $resource = $resourceType !== null && $resourceType !== '' ? strtolower($resourceType) : null;

    if ($messageType === 'voice') {
        return match ($format) {
            'mp3' => 'audio/mpeg',
            'wav' => 'audio/wav',
            'aac' => 'audio/aac',
            'ogg' => 'audio/ogg',
            default => 'audio/webm',
        };
    }

    if ($messageType === 'video' || $resource === 'video') {
        return match ($format) {
            'mov' => 'video/quicktime',
            'mkv' => 'video/x-matroska',
            'webm' => 'video/webm',
            default => 'video/mp4',
        };
    }

    if ($messageType === 'image' || $resource === 'image') {
        return match ($format) {
            'png' => 'image/png',
            'webp' => 'image/webp',
            'gif' => 'image/gif',
            default => 'image/jpeg',
        };
    }

    return null;
}

/**
 * @param array<string, mixed> $message
 */
function chat_media_backfill_commit(string $documentName, array $meta, array $message, bool $dryRun): void
{
    $metaFields = [];
    foreach ($meta as $key => $value) {
        $metaFields[$key] = yustam_firestore_field($value);
    }

    $fields = [
        'media_meta' => yustam_firestore_map($metaFields),
    ];
    $mask = ['media_meta'];

    if (($message['type'] ?? '') === 'voice' && isset($meta['duration'])) {
        $durationSeconds = (int) round((float) $meta['duration']);
        if ($durationSeconds > 0) {
            $fields['voice_duration'] = yustam_firestore_integer($durationSeconds);
            $mask[] = 'voice_duration';
        }
    }

    if ($dryRun) {
        printf("[DRY-RUN] Would update Firestore document %s\n", $documentName);
        return;
    }

    yustam_firestore_commit([
        [
            'update' => [
                'name' => $documentName,
                'fields' => $fields,
            ],
            'updateMask' => [
                'fieldPaths' => array_values(array_unique($mask)),
            ],
        ],
    ]);
}
