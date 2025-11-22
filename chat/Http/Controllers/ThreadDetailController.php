<?php

declare(strict_types=1);

namespace Chat\Http\Controllers;

use Chat\Domain\Services\MessageService;
use Chat\Domain\Services\ThreadService;
use Chat\Domain\Services\TypingService;
use Chat\Http\Responses\JsonResponse;
use Chat\Support\StructuredLogger;
use Throwable;

final class ThreadDetailController extends Controller
{
    private ThreadService $threads;
    private MessageService $messages;
    private ?TypingService $typing;
    private string $threadId;
    private int $messageLimit;
    /** @var array<string, mixed> */
    private array $context;

    /**
     * @param array<string, mixed> $context
     */
    public function __construct(
        ThreadService $threads,
        MessageService $messages,
        ?TypingService $typing,
        string $threadId,
        int $messageLimit,
        array $context
    ) {
        $this->threads = $threads;
        $this->messages = $messages;
        $this->typing = $typing;
        $this->threadId = $threadId;
        $this->messageLimit = $messageLimit;
        $this->context = $context;
    }

    public function handle(): JsonResponse
    {
        try {
            $thread = $this->threads->getById($this->threadId);
            if ($thread === null) {
                return JsonResponse::notFound('Thread not found.');
            }

            $role = (string) ($this->context['role'] ?? '');
            $uid = (string) ($this->context['uid'] ?? '');
            if ($uid !== '') {
                $authorised = ($role === 'buyer' && strtolower($thread->buyerUid) === strtolower($uid))
                    || ($role === 'vendor' && strtolower($thread->vendorUid) === strtolower($uid));
                if (!$authorised) {
                    return JsonResponse::error('forbidden', 'You do not have access to this thread.', 403);
                }
            }

            $messages = $this->messages->listForThread($this->threadId, $this->messageLimit);
            $typing = $this->typing ? $this->typing->getTyping($this->threadId) : [];

            StructuredLogger::debug('thread.detail.loaded', [
                'threadId' => $this->threadId,
                'messageCount' => count($messages),
                'hasTyping' => $typing !== [],
                'limit' => $this->messageLimit,
            ]);

            return JsonResponse::success([
                'thread' => $thread->toArray(),
                'messages' => array_map(static fn($message) => $message->toArray(), $messages),
                'typing' => $typing,
            ]);
        } catch (Throwable $error) {
            StructuredLogger::error('thread.detail.failed', [
                'threadId' => $this->threadId,
                'limit' => $this->messageLimit,
                'error' => $error,
            ]);
            return JsonResponse::error('thread_fetch_failed', 'Unable to load conversation.', 500);
        }
    }
}
