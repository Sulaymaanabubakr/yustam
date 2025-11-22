<?php

declare(strict_types=1);

namespace Chat\Domain\Repositories;

interface TypingRepositoryInterface
{
    public function setTyping(string $threadId, string $role, string $uid, bool $isTyping, int $ttl): void;

    /**
     * @return array<string, mixed>
     */
    public function getTyping(string $threadId): array;
}
