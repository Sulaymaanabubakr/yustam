<?php

declare(strict_types=1);

namespace Chat\Domain\Services;

use Chat\Domain\Models\Message;
use Chat\Domain\Repositories\MessageRepositoryInterface;
use Chat\Support\IdGenerator;
use Chat\Support\StructuredLogger;

final class MessageService
{
    private MessageRepositoryInterface $messages;

    public function __construct(MessageRepositoryInterface $messages)
    {
        $this->messages = $messages;
    }

    /**
     * @param array<string, mixed> $options
     * @return Message[]
     */
    public function listForThread(string $threadId, int $limit = 100, array $options = []): array
    {
        $messages = $this->messages->listForThread($threadId, $limit, $options);

        StructuredLogger::debug('message.list', [
            'threadId' => $threadId,
            'limit' => $limit,
            'options' => $options,
            'returned' => count($messages),
        ]);

        return $messages;
    }

    public function store(Message $message): Message
    {
        if ($message->id === '') {
            $message->id = IdGenerator::messageId();
        }
        if ($message->timestamp <= 0) {
            $message->timestamp = time();
        }

        $this->messages->store($message);

        StructuredLogger::info('message.persisted', [
            'threadId' => $message->threadId,
            'messageId' => $message->id,
            'type' => $message->type,
            'senderUid' => $message->senderUid,
            'senderRole' => $message->senderRole,
            'hasMedia' => $message->mediaUrl !== null,
        ]);

        return $message;
    }
}
