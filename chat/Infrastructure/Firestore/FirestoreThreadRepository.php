<?php

declare(strict_types=1);

namespace Chat\Infrastructure\Firestore;

use Chat\Domain\Models\Thread;
use Chat\Domain\Repositories\ThreadRepositoryInterface;
use RuntimeException;
use function array_keys;
use function array_slice;
use function basename;
use function count;
use function is_array;
use function stripos;
use function usort;
use function yustam_firestore_commit;
use function yustam_firestore_decode;
use function yustam_firestore_document_path;
use function yustam_firestore_get_document;
use function yustam_firestore_integer;
use function yustam_firestore_run_query;
use function yustam_firestore_string;

final class FirestoreThreadRepository implements ThreadRepositoryInterface
{
    private const KEY_MAP = [
        'chatId' => 'chat_id',
        'buyerUid' => 'buyer_uid',
        'buyerName' => 'buyer_name',
        'vendorUid' => 'vendor_uid',
        'vendorName' => 'vendor_name',
        'vendorBusinessName' => 'vendor_business_name',
        'listingId' => 'listing_id',
        'listingTitle' => 'listing_title',
        'listingImage' => 'listing_image',
        'vendorPlan' => 'vendor_plan',
        'vendorPlanLabel' => 'vendor_plan_label',
        'vendorPlanSlug' => 'vendor_plan_slug',
        'vendorVerified' => 'vendor_verified',
        'lastMessage' => 'last_text',
        'lastSenderRole' => 'last_sender_role',
        'lastTs' => 'last_ts',
        'unreadForBuyer' => 'unread_for_buyer',
        'unreadForVendor' => 'unread_for_vendor',
        'buyerLastReadTs' => 'buyer_last_read_ts',
        'vendorLastReadTs' => 'vendor_last_read_ts',
    ];

    public function listByParticipant(string $role, string $uid, int $limit = 50): array
    {
        $fieldPath = $role === 'vendor' ? self::KEY_MAP['vendorUid'] : self::KEY_MAP['buyerUid'];

        $query = [
            'from' => [['collectionId' => 'chats']],
            'where' => [
                'fieldFilter' => [
                    'field' => ['fieldPath' => $fieldPath],
                    'op' => 'EQUAL',
                    'value' => yustam_firestore_string($uid),
                ],
            ],
            'orderBy' => [
                [
                    'field' => ['fieldPath' => self::KEY_MAP['lastTs']],
                    'direction' => 'DESCENDING',
                ],
            ],
            'limit' => $limit,
        ];

        $documents = $this->runQuery($query, $limit);
        $threads = [];
        foreach ($documents as $document) {
            $threads[] = Thread::fromArray($this->decodeDocument($document));
        }

        return $threads;
    }

    private function runQuery(array $query, int $limit): array
    {
        try {
            $results = yustam_firestore_run_query($query);
        } catch (RuntimeException $error) {
            if (stripos($error->getMessage(), 'index') !== false) {
                $fallback = $query;
                unset($fallback['orderBy']);
                $results = yustam_firestore_run_query($fallback);
                $documents = $this->extractDocuments($results);
                usort(static function (array $a, array $b): int {
                    $aTs = isset($a['fields']['last_ts']) ? (int) yustam_firestore_decode($a['fields']['last_ts']) : 0;
                    $bTs = isset($b['fields']['last_ts']) ? (int) yustam_firestore_decode($b['fields']['last_ts']) : 0;
                    return $bTs <=> $aTs;
                });
                if ($limit > 0 && count($documents) > $limit) {
                    $documents = array_slice($documents, 0, $limit);
                }
                return $documents;
            }
            throw $error;
        }

        return $this->extractDocuments($results);
    }

    private function extractDocuments(array $results): array
    {
        $documents = [];
        foreach ($results as $result) {
            $document = $result['document'] ?? $result['found'] ?? null;
            if (is_array($document)) {
                $documents[] = $document;
            }
        }
        return $documents;
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

        if (empty($data['chatId'])) {
            if (!empty($data['chat_id'])) {
                $data['chatId'] = (string) $data['chat_id'];
            } elseif (isset($document['name'])) {
                $data['chatId'] = basename((string) $document['name']);
            }
        }
        // Compatibility for old 'id' property
        if (empty($data['id']) && !empty($data['chatId'])) {
            $data['id'] = $data['chatId'];
        }

        return $data;
    }

    private function encodeFields(array $fields): array
    {
        $encoded = [];
        foreach ($fields as $camelKey => $value) {
            if ($value === null) {
                continue;
            }
            $snakeKey = self::KEY_MAP[$camelKey] ?? $camelKey;
            if (is_string($value)) {
                $encoded[$snakeKey] = yustam_firestore_string($value);
            } elseif (is_int($value)) {
                $encoded[$snakeKey] = yustam_firestore_integer($value);
            }
        }
        return $encoded;
    }

    public function markRead(string $chatId, string $role, ?int $timestamp = null): void
    {
        $threadPath = yustam_firestore_document_path('chats', $chatId);
        $field = $role === 'vendor' ? 'unread_for_vendor' : 'unread_for_buyer';

        $fields = [
            $field => yustam_firestore_integer(0),
        ];

        if ($timestamp !== null) {
            $tsField = $role === 'vendor' ? 'vendor_last_read_ts' : 'buyer_last_read_ts';
            $fields[$tsField] = yustam_firestore_integer($timestamp);
        }

        yustam_firestore_commit([
            [
                'update' => [
                    'name' => $threadPath,
                    'fields' => $fields,
                ],
            ],
        ]);
    }

    public function findById(string $chatId): ?Thread
    {
        $document = yustam_firestore_get_document('chats/' . $chatId);
        if ($document === null) {
            return null;
        }

        return Thread::fromArray($this->decodeDocument($document));
    }

    public function upsert(array $fields): Thread
    {
        $chatId = (string) ($fields['chatId'] ?? '');
        if ($chatId === '') {
            throw new RuntimeException('chatId is required to upsert thread');
        }

        $documentName = yustam_firestore_document_path('chats', $chatId);
        $documentPath = 'chats/' . $chatId;

        $existing = yustam_firestore_get_document($documentPath);
        if ($existing === null) {
            $baseFields = $fields + [
                'unreadForBuyer' => 0,
                'unreadForVendor' => 0,
                'lastMessage' => 'Chat started',
                'lastSenderRole' => 'system',
                'lastType' => 'system',
            ];
            $encoded = $this->encodeFields($baseFields);

            yustam_firestore_commit([
                [
                    'update' => [
                        'name' => $documentName,
                        'fields' => $encoded,
                    ],
                    'currentDocument' => ['exists' => false],
                ],
                [
                    'transform' => [
                        'document' => $documentName,
                        'fieldTransforms' => [
                            ['fieldPath' => 'last_ts', 'setToServerValue' => 'REQUEST_TIME'],
                        ],
                    ],
                ],
            ]);
        } else {
            $encoded = $this->encodeFields($fields);
            if ($encoded !== []) {
                yustam_firestore_commit([
                    [
                        'update' => [
                            'name' => $documentName,
                            'fields' => $encoded,
                        ],
                        'currentDocument' => ['exists' => true],
                        'updateMask' => ['fieldPaths' => array_keys($encoded)],
                    ],
                ]);
            }
        }

        $document = yustam_firestore_get_document($documentPath);
        if ($document === null) {
            throw new RuntimeException('Thread upsert did not return a document');
        }

        return Thread::fromArray($this->decodeDocument($document));
    }
}
