<?php

declare(strict_types=1);

namespace Chat\Infrastructure\Firestore;

use Chat\Domain\Models\Message;
use Chat\Domain\Repositories\MessageRepositoryInterface;
use RuntimeException;
use function yustam_firestore_document_path;
use function yustam_firestore_run_query;
use function yustam_firestore_decode;
use function yustam_firestore_commit;
use function yustam_firestore_string;
use function yustam_firestore_map;
use function yustam_firestore_boolean;
use function yustam_firestore_integer;
use function yustam_firestore_field;

namespace Chat\Infrastructure\Firestore;

use Chat\Domain\Models\Message;
use Chat\Domain\Repositories\MessageRepositoryInterface;
use function basename;
use function is_array;
use function strtolower;
use function yustam_firestore_boolean;
use function yustam_firestore_commit;
use function yustam_firestore_decode;
use function yustam_firestore_document_path;
use function yustam_firestore_field;
use function yustam_firestore_integer;
use function yustam_firestore_map;
use function yustam_firestore_run_query;
use function yustam_firestore_string;

final class FirestoreMessageRepository implements MessageRepositoryInterface
{
    private const KEY_MAP = [
        'chatId' => 'chat_id',
        'senderUid' => 'sender_uid',
        'senderRole' => 'sender_role',
        'mediaUrl' => 'media_url',
        'imageUrl' => 'image_url',
        'videoUrl' => 'video_url',
        'voiceUrl' => 'voice_url',
        'voiceDuration' => 'voice_duration',
        'mediaMeta' => 'media_meta',
        'timestamp' => 'ts',
    ];

    public function listForThread(string $chatId, int $limit = 100, array $options = []): array
    {
        $directionRaw = strtolower((string) ($options['direction'] ?? 'asc'));
        $direction = $directionRaw === 'desc' ? 'DESCENDING' : 'ASCENDING';
        $structuredQuery = [
            'from' => [['collectionId' => 'messages']],
            'orderBy' => [['field' => ['fieldPath' => 'ts'], 'direction' => $direction]],
            'limit' => $limit,
        ];

        $filters = [];
        if (!empty($options['before'])) {
            $filters[] = [
                'fieldFilter' => [
                    'field' => ['fieldPath' => 'ts'],
                    'op' => 'LESS_THAN',
                    'value' => yustam_firestore_integer((int) $options['before']),
                ],
            ];
        }
        if (!empty($options['after'])) {
            $filters[] = [
                'fieldFilter' => [
                    'field' => ['fieldPath' => 'ts'],
                    'op' => 'GREATER_THAN',
                    'value' => yustam_firestore_integer((int) $options['after']),
                ],
            ];
        }

        if ($filters !== []) {
            $structuredQuery['where'] = count($filters) === 1
                ? $filters[0]
                : ['compositeFilter' => ['op' => 'AND', 'filters' => $filters]];
        }

        $query = [
            'parent' => yustam_firestore_document_path('chats', $chatId),
            'structuredQuery' => $structuredQuery,
        ];

        $results = yustam_firestore_run_query($query);
        $messages = [];
        foreach ($results as $result) {
            $document = $result['document'] ?? $result['found'] ?? null;
            if (!is_array($document) || !isset($document['fields'])) {
                continue;
            }
            $data = $this->decodeDocument($document);
            $messages[] = Message::fromFirestore($data);
        }
        return $messages;
    }

    private function decodeDocument(array $document): array
    {
        $fields = $document['fields'] ?? [];
        $data = [];
        $reverseMap = array_flip(self::KEY_MAP);

        foreach ($fields as $key => $value) {
            $camelKey = $reverseMap[$key] ?? $key;
            $data[$camelKey] = yustam_firestore_decode($value);
        }
        $data['id'] = basename((string) ($document['name'] ?? ''));
        return $data;
    }

    public function store(Message $message): void
    {
        $messageId = $message->id;
        $threadPath = yustam_firestore_document_path('chats', $message->chatId);
        $messagePath = yustam_firestore_document_path('chats', $message->chatId, 'messages', $messageId);

        $fields = [
            self::KEY_MAP['chatId'] => yustam_firestore_string($message->chatId),
            self::KEY_MAP['senderUid'] => yustam_firestore_string($message->senderUid),
            self::KEY_MAP['senderRole'] => yustam_firestore_string($message->senderRole),
            'type' => yustam_firestore_string($message->type),
            'text' => yustam_firestore_string($message->text ?? ''),
            'read_by' => yustam_firestore_map([$message->senderUid => yustam_firestore_boolean(true)]),
        ];

        if ($message->mediaUrl !== null) {
            $fields[self::KEY_MAP['mediaUrl']] = yustam_firestore_string($message->mediaUrl);
        }
        if ($message->imageUrl !== null) {
            $fields[self::KEY_MAP['imageUrl']] = yustam_firestore_string($message->imageUrl);
        }
        if ($message->videoUrl !== null) {
            $fields[self::KEY_MAP['videoUrl']] = yustam_firestore_string($message->videoUrl);
        }
        if ($message->voiceUrl !== null) {
            $fields[self::KEY_MAP['voiceUrl']] = yustam_firestore_string($message->voiceUrl);
            if ($message->voiceDuration !== null) {
                $fields[self::KEY_MAP['voiceDuration']] = yustam_firestore_integer($message->voiceDuration);
            }
        }
        if ($message->mediaMeta !== null) {
            $metaFields = [];
            foreach ($message->mediaMeta as $key => $value) {
                $metaFields[$key] = yustam_firestore_field($value);
            }
            $fields[self::KEY_MAP['mediaMeta']] = yustam_firestore_map($metaFields);
        }

        $chatUpdateFields = [
            'last_text' => yustam_firestore_string($message->preview()),
            'last_sender_role' => yustam_firestore_string($message->senderRole),
        ];

        $chatTransforms = [['fieldPath' => 'last_ts', 'setToServerValue' => 'REQUEST_TIME']];

        if ($message->senderRole === 'buyer') {
            $chatTransforms[] = ['fieldPath' => 'unread_for_vendor', 'increment' => yustam_firestore_integer(1)];
            $chatUpdateFields['unread_for_buyer'] = yustam_firestore_integer(0);
        } else {
            $chatTransforms[] = ['fieldPath' => 'unread_for_buyer', 'increment' => yustam_firestore_integer(1)];
            $chatUpdateFields['unread_for_vendor'] = yustam_firestore_integer(0);
        }

        yustam_firestore_commit([
            ['update' => ['name' => $messagePath, 'fields' => $fields]],
            ['transform' => ['document' => $messagePath, 'fieldTransforms' => [['fieldPath' => 'ts', 'setToServerValue' => 'REQUEST_TIME']]]],
            ['update' => ['name' => $threadPath, 'fields' => $chatUpdateFields]],
            ['transform' => ['document' => $threadPath, 'fieldTransforms' => $chatTransforms]],
        ]);
    }
}
