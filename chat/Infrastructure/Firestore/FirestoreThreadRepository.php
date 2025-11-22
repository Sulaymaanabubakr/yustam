<?php

declare(strict_types=1);

namespace Chat\Infrastructure\Firestore;

use Chat\Domain\Models\Thread;
use Chat\Domain\Repositories\ThreadRepositoryInterface;
use RuntimeException;
use function array_keys;
use function array_slice;
use function array_key_exists;
use function basename;
use function count;
use function is_array;
use function stripos;
use function usort;
use function yustam_firestore_commit;
use function yustam_firestore_decode;
use function yustam_firestore_document_path;
use function yustam_firestore_integer;
use function yustam_firestore_get_document;
use function yustam_firestore_run_query;
use function yustam_firestore_string;

final class FirestoreThreadRepository implements ThreadRepositoryInterface
{
    public function listByParticipant(string $role, string $uid, int $limit = 50): array
    {
        $fieldPath = $role === 'vendor' ? 'vendor_uid' : 'buyer_uid';

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
                [
                    'field' => ['fieldPath' => 'last_ts'],
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

    /**
     * @param array<string, mixed> $query
     * @return array<int, array<string, mixed>>
     */
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
                usort($documents, static function (array $a, array $b): int {
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

    /**
     * @param array<int, array<string, mixed>> $results
     * @return array<int, array<string, mixed>>
     */
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

    /**
     * @param array<string, mixed> $document
     * @return array<string, mixed>
     */
    private function decodeDocument(array $document): array
    {
        $fields = $document['fields'] ?? [];
        $data = [];
        foreach ($fields as $key => $value) {
            $data[$key] = yustam_firestore_decode($value);
        }
        if (!isset($data['id']) || $data['id'] === '') {
            if (!empty($data['chat_id'])) {
                $data['id'] = (string) $data['chat_id'];
            } elseif (isset($document['name'])) {
                $data['id'] = basename((string) $document['name']);
            }
        }
        return $data;
    }

    /**
     * @param array<string, mixed> $fields
     * @return array<string, array<string, mixed>>
     */
    private function encodeFields(array $fields): array
    {
        $encoded = [];

        $stringKeys = [
            'chat_id',
            'buyer_uid',
            'buyer_name',
            'vendor_uid',
            'vendor_name',
            'vendor_business_name',
            'listing_id',
            'listing_title',
            'listing_image',
            'vendor_plan',
            'vendor_plan_label',
            'vendor_plan_slug',
            'vendor_verified',
            'last_text',
            'last_sender_role',
            'last_type',
        ];

        foreach ($stringKeys as $key) {
            if (!array_key_exists($key, $fields)) {
                continue;
            }
            $value = $fields[$key];
            if ($value === null) {
                continue;
            }
            $encoded[$key] = yustam_firestore_string((string) $value);
        }

        $intKeys = ['unread_for_buyer', 'unread_for_vendor', 'buyer_last_read_ts', 'vendor_last_read_ts'];
        foreach ($intKeys as $key) {
            if (!array_key_exists($key, $fields)) {
                continue;
            }
            $value = $fields[$key];
            if ($value === null) {
                continue;
            }
            $encoded[$key] = yustam_firestore_integer((int) $value);
        }

        return $encoded;
    }

    public function markRead(string $threadId, string $role, ?int $timestamp = null): void
    {
        $threadPath = yustam_firestore_document_path('chats', $threadId);
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

    public function findById(string $threadId): ?Thread
    {
        $document = yustam_firestore_get_document('chats/' . $threadId);
        if ($document === null) {
            return null;
        }

        return Thread::fromArray($this->decodeDocument($document));
    }

    public function upsert(array $fields): Thread
    {
        $chatId = (string) ($fields['chat_id'] ?? '');
        if ($chatId === '') {
            throw new RuntimeException('chat_id is required to upsert thread');
        }

        $documentName = yustam_firestore_document_path('chats', $chatId);
        $documentPath = 'chats/' . $chatId;

        $encoded = $this->encodeFields($fields + ['chat_id' => $chatId]);

        $existing = yustam_firestore_get_document($documentPath);
        if ($existing === null) {
            $base = $encoded + [
                'chat_id' => yustam_firestore_string($chatId),
                'unread_for_buyer' => yustam_firestore_integer(0),
                'unread_for_vendor' => yustam_firestore_integer(0),
                'last_text' => yustam_firestore_string($fields['last_text'] ?? 'Chat started'),
                'last_sender_role' => yustam_firestore_string($fields['last_sender_role'] ?? 'system'),
                'last_type' => yustam_firestore_string($fields['last_type'] ?? 'system'),
            ];

            yustam_firestore_commit([
                [
                    'update' => [
                        'name' => $documentName,
                        'fields' => $base,
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
            if (!isset($encoded['chat_id'])) {
                $encoded['chat_id'] = yustam_firestore_string($chatId);
            }
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
