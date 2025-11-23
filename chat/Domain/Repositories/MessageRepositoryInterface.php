<?php

declare(strict_types=1);

namespace Chat\Domain\Repositories;

use Chat\Domain\Models\Message;

interface MessageRepositoryInterface
{
    /**
     * @param array<string, mixed> $options
     * @return Message[]
     */
    public function listForThread(string $chatId, int $limit = 100, array $options = []): array;

    public function store(Message $message): void;
}
