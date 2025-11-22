<?php

declare(strict_types=1);

namespace Chat\Infrastructure\Firestore;

use Chat\Domain\Repositories\TypingRepositoryInterface;
use RuntimeException;
use function is_array;
use function time;
use function yustam_firestore_boolean;
use function yustam_firestore_commit;
use function yustam_firestore_decode;
use function yustam_firestore_document_path;
use function yustam_firestore_get_document;
use function yustam_firestore_integer;
use function yustam_firestore_map;
use function yustam_firestore_string;

final class FirestoreTypingRepository implements TypingRepositoryInterface
{
    public function setTyping(string $threadId, string $role, string $uid, bool $isTyping, int $ttl): void
    {
        if ($threadId === '') {
            throw new RuntimeException('Thread id required for typing update.');
        }
        $roleField = $role === 'vendor' ? 'vendor' : 'buyer';
        $now = time();
        $expires = $isTyping ? $now + $ttl : $now;

        $documentName = yustam_firestore_document_path('typing', $threadId);

        $fields = [
            'chat_id' => yustam_firestore_string($threadId),
            'updated_at' => yustam_firestore_integer($now),
            $roleField => yustam_firestore_map([
                'uid' => yustam_firestore_string($uid),
                'is_typing' => yustam_firestore_boolean($isTyping),
                'updated_at' => yustam_firestore_integer($now),
                'expires_at' => yustam_firestore_integer($expires),
            ]),
        ];

        $existing = yustam_firestore_get_document('typing/' . $threadId);
        if ($existing === null) {
            yustam_firestore_commit([
                [
                    'update' => [
                        'name' => $documentName,
                        'fields' => $fields,
                    ],
                    'currentDocument' => ['exists' => false],
                ],
            ]);
            return;
        }

        yustam_firestore_commit([
            [
                'update' => [
                    'name' => $documentName,
                    'fields' => $fields,
                ],
                'currentDocument' => ['exists' => true],
                'updateMask' => ['fieldPaths' => array_keys($fields)],
            ],
        ]);
    }

    public function getTyping(string $threadId): array
    {
        $document = yustam_firestore_get_document('typing/' . $threadId);
        if ($document === null) {
            return [];
        }

        $fields = $document['fields'] ?? [];
        if (!is_array($fields)) {
            return [];
        }

        $decoded = [];
        foreach ($fields as $key => $value) {
            $decoded[$key] = yustam_firestore_decode($value);
        }

        return $decoded;
    }
}
