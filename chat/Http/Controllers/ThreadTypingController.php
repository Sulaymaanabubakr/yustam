<?php

declare(strict_types=1);

namespace Chat\Http\Controllers;

use Chat\Domain\Services\TypingService;
use Chat\Http\Requests\ThreadTypingRequest;
use Chat\Http\Responses\JsonResponse;
use Chat\Support\StructuredLogger;
use InvalidArgumentException;
use Throwable;

final class ThreadTypingController extends Controller
{
    private TypingService $typing;
    private string $threadId;
    /** @var array<string, mixed> */
    private array $context;
    /** @var array<string, mixed> */
    private array $body;

    /**
     * @param array<string, mixed> $context
     * @param array<string, mixed> $body
     */
    public function __construct(TypingService $typing, string $threadId, array $context, array $body)
    {
        $this->typing = $typing;
        $this->threadId = $threadId;
        $this->context = $context;
        $this->body = $body;
    }

    public function handle(): JsonResponse
    {
        try {
            $request = new ThreadTypingRequest($this->body);
            $payload = $request->payload();
        } catch (InvalidArgumentException $validationError) {
            return JsonResponse::error('validation_failed', $validationError->getMessage(), 422);
        }

        try {
            $ttl = $payload['ttl'] ?? null;
            $this->typing->setTyping($this->threadId, $this->context, $payload['is_typing'], $ttl ?? 10);

            StructuredLogger::info('typing.updated', [
                'threadId' => $this->threadId,
                'actorRole' => $this->context['role'] ?? null,
                'actorUid' => $this->context['uid'] ?? null,
                'isTyping' => $payload['is_typing'],
                'ttl' => $ttl ?? 10,
            ]);

            return JsonResponse::success([
                'threadId' => $this->threadId,
                'isTyping' => $payload['is_typing'],
                'ttl' => $ttl,
            ]);
        } catch (Throwable $error) {
            StructuredLogger::error('typing.update_failed', [
                'threadId' => $this->threadId,
                'actorRole' => $this->context['role'] ?? null,
                'actorUid' => $this->context['uid'] ?? null,
                'error' => $error,
            ]);
            return JsonResponse::error('typing_update_failed', 'Unable to update typing state.', 500);
        }
    }
}
