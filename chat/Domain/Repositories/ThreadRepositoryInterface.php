<?php

declare(strict_types=1);

namespace Chat\Domain\Repositories;

use Chat\Domain\Models\Thread;

interface ThreadRepositoryInterface
{
    /**
     * @return Thread[]
     */
    public function listByParticipant(string $role, string $uid, int $limit = 50): array;

    public function markRead(string $threadId, string $role, ?int $timestamp = null): void;

    public function findById(string $threadId): ?Thread;

    /**
     * @param array<string, mixed> $fields
     */
    public function upsert(array $fields): Thread;
}
