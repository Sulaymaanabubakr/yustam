<?php

declare(strict_types=1);

namespace Chat\Domain\Services;

use Chat\Domain\Repositories\TypingRepositoryInterface;
use Chat\Support\StructuredLogger;
use RuntimeException;
use function time;

final class TypingService
{
    private TypingRepositoryInterface $typing;

    public function __construct(TypingRepositoryInterface $typing)
    {
        $this->typing = $typing;
    }

    /**
     * @param array<string, mixed> $context
     */
    public function setTyping(string $threadId, array $context, bool $isTyping, int $ttl = 10): void
    {
        $role = (string) ($context['role'] ?? '');
        $uid = (string) ($context['uid'] ?? '');
        if ($role === '' || $uid === '') {
            throw new RuntimeException('Typing update requires authenticated context.');
        }

        $ttl = max(3, min(60, $ttl));

        $this->typing->setTyping($threadId, $role, $uid, $isTyping, $ttl);

        StructuredLogger::info('typing.service_set', [
            'threadId' => $threadId,
            'role' => $role,
            'uid' => $uid,
            'isTyping' => $isTyping,
            'ttl' => $ttl,
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    public function getTyping(string $threadId): array
    {
        $raw = $this->typing->getTyping($threadId);
        if ($raw === []) {
            return [];
        }

        $now = time();
        $output = [];
        foreach (['buyer', 'vendor'] as $role) {
            if (!isset($raw[$role]) || !is_array($raw[$role])) {
                continue;
            }
            $entry = $raw[$role];
            $expires = isset($entry['expires_at']) ? (int) $entry['expires_at'] : 0;
            $isTyping = isset($entry['is_typing']) ? (bool) $entry['is_typing'] : false;
            if ($expires < $now) {
                $isTyping = false;
            }

            $output[$role] = [
                'uid' => isset($entry['uid']) ? (string) $entry['uid'] : null,
                'isTyping' => $isTyping,
                'is_typing' => $isTyping,
                'updatedAt' => isset($entry['updated_at']) ? (int) $entry['updated_at'] : null,
                'updated_at' => isset($entry['updated_at']) ? (int) $entry['updated_at'] : null,
                'expiresAt' => $expires,
                'expires_at' => $expires,
            ];
        }

        return $output;
    }
}
