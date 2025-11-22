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

final class FirestoreMessageRepository implements MessageRepositoryInterface
{
    public function listForThread(string $threadId, int $limit = 100, array $options = []): array
    {
        $directionRaw = strtolower((string) ($options['direction'] ?? 'asc'));
        $direction = $directionRaw === 'desc' ? 'DESCENDING' : 'ASCENDING';
        $structuredQuery = [
            'from' => [
                ['collectionId' => 'messages'],
            ],
            'orderBy' => [
                ['field' => ['fieldPath' => 'ts'], 'direction' => $direction],
            ],
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
            'parent' => yustam_firestore_document_path('chats', $threadId),
            'structuredQuery' => $structuredQuery,
        ];

        $results = yustam_firestore_run_query($query);
        $messages = [];
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
            $messages[] = Message::fromFirestore($data);
        }
        return $messages;
    }

    public function store(Message $message): void
    {
        $messageId = $message->id;
        $threadPath = yustam_firestore_document_path('chats', $message->threadId);
        $messagePath = yustam_firestore_document_path('chats', $message->threadId, 'messages', $messageId);

        $fields = [
            'chat_id' => yustam_firestore_string($message->threadId),
            'sender_uid' => yustam_firestore_string($message->senderUid),
            'sender_role' => yustam_firestore_string($message->senderRole),
            'type' => yustam_firestore_string($message->type),
            'text' => yustam_firestore_string($message->text ?? ''),
            'read_by' => yustam_firestore_map([$message->senderUid => yustam_firestore_boolean(true)]),
        ];

        if ($message->mediaUrl !== null) {
            $fields['media_url'] = yustam_firestore_string($message->mediaUrl);
        }
        if ($message->imageUrl !== null) {
            $fields['image_url'] = yustam_firestore_string($message->imageUrl);
        }
        if ($message->videoUrl !== null) {
            $fields['video_url'] = yustam_firestore_string($message->videoUrl);
        }
        if ($message->voiceUrl !== null) {
            $fields['voice_url'] = yustam_firestore_string($message->voiceUrl);
            if ($message->voiceDuration !== null) {
                $fields['voice_duration'] = yustam_firestore_integer($message->voiceDuration);
            }
        }
        if ($message->mediaMeta !== null) {
            $metaFields = [];
            foreach ($message->mediaMeta as $key => $value) {
                $metaFields[$key] = yustam_firestore_field($value);
            }
            $fields['media_meta'] = yustam_firestore_map($metaFields);
        }

        $chatUpdateFields = [
            'last_text' => yustam_firestore_string($message->preview()),
            'last_sender_role' => yustam_firestore_string($message->senderRole),
        ];

        $chatTransforms = [
            ['fieldPath' => 'last_ts', 'setToServerValue' => 'REQUEST_TIME'],
        ];

        if ($message->senderRole === 'buyer') {
            $chatTransforms[] = ['fieldPath' => 'unread_for_vendor', 'increment' => yustam_firestore_integer(1)];
            $chatUpdateFields['unread_for_buyer'] = yustam_firestore_integer(0);
        } else {
            $chatTransforms[] = ['fieldPath' => 'unread_for_buyer', 'increment' => yustam_firestore_integer(1)];
            $chatUpdateFields['unread_for_vendor'] = yustam_firestore_integer(0);
        }

        yustam_firestore_commit([
            [
                'update' => [
                    'name' => $messagePath,
                    'fields' => $fields,
                ],
            ],
            [
                'transform' => [
                    'document' => $messagePath,
                    'fieldTransforms' => [
                        ['fieldPath' => 'ts', 'setToServerValue' => 'REQUEST_TIME'],
                    ],
                ],
            ],
            [
                'update' => [
                    'name' => $threadPath,
                    'fields' => $chatUpdateFields,
                ],
            ],
            [
                'transform' => [
                    'document' => $threadPath,
                    'fieldTransforms' => $chatTransforms,
                ],
            ],
        ]);
    }
}
