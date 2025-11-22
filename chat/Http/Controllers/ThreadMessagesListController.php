<?php

declare(strict_types=1);

namespace Chat\Http\Controllers;

use Chat\Domain\Services\MessageService;
use Chat\Http\Responses\JsonResponse;

final class ThreadMessagesListController extends Controller
{
    private MessageService $messages;
    private string $threadId;
    private int $limit;
    /** @var array<string, mixed> */
    private array $options;

    /**
     * @param array<string, mixed> $options
     */
    public function __construct(MessageService $messages, string $threadId, int $limit = 100, array $options = [])
    {
        $this->messages = $messages;
        $this->threadId = $threadId;
        $this->limit = max(1, min(200, $limit));
        $this->options = $options;
    }

    public function handle(): JsonResponse
    {
        $items = $this->messages->listForThread($this->threadId, $this->limit, $this->options);

        $pagination = $this->buildPagination($items);

        return JsonResponse::success([
            'messages' => array_map(static fn($message) => $message->toArray(), $items),
            'pagination' => $pagination,
        ]);
    }

    /**
     * @param array<int, \Chat\Domain\Models\Message> $items
     * @return array<string, mixed>
     */
    private function buildPagination(array $items): array
    {
        $direction = strtolower((string) ($this->options['direction'] ?? 'asc')) === 'desc' ? 'desc' : 'asc';
        $hasMore = count($items) >= $this->limit;
        $first = $items[0] ?? null;
        $last = $items !== [] ? $items[count($items) - 1] : null;

        $nextBefore = null;
        $nextAfter = null;

        if ($direction === 'desc') {
            $nextBefore = $last?->timestamp;
            $nextAfter = $first?->timestamp;
        } else {
            $nextBefore = $first?->timestamp;
            $nextAfter = $last?->timestamp;
        }

        return [
            'direction' => $direction,
            'limit' => $this->limit,
            'before' => $this->options['before'] ?? null,
            'after' => $this->options['after'] ?? null,
            'hasMore' => $hasMore,
            'has_more' => $hasMore,
            'nextBefore' => $nextBefore,
            'next_before' => $nextBefore,
            'nextAfter' => $nextAfter,
            'next_after' => $nextAfter,
        ];
    }
}
