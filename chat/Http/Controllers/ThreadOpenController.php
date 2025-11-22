<?php

declare(strict_types=1);

namespace Chat\Http\Controllers;

use Chat\Domain\Services\ThreadService;
use Chat\Http\Requests\ThreadOpenRequest;
use Chat\Http\Responses\JsonResponse;
use Chat\Support\StructuredLogger;
use InvalidArgumentException;
use Throwable;

final class ThreadOpenController extends Controller
{
    private ThreadService $threads;
    /** @var array<string, mixed> */
    private array $context;
    /** @var array<string, mixed> */
    private array $body;

    /**
     * @param array<string, mixed> $context
     * @param array<string, mixed> $body
     */
    public function __construct(ThreadService $threads, array $context, array $body)
    {
        $this->threads = $threads;
        $this->context = $context;
        $this->body = $body;
    }

    public function handle(): JsonResponse
    {
        try {
            $request = new ThreadOpenRequest($this->body);
            $payload = $request->payload();
        } catch (InvalidArgumentException $validationError) {
            return JsonResponse::error('validation_failed', $validationError->getMessage(), 422);
        }

        try {
            $thread = $this->threads->open($payload, $this->context);

            StructuredLogger::info('thread.open.success', [
                'threadId' => $thread->id,
                'buyerUid' => $thread->buyerUid,
                'vendorUid' => $thread->vendorUid,
                'actorRole' => $this->context['role'] ?? null,
                'actorUid' => $this->context['uid'] ?? null,
            ]);

            return JsonResponse::success([
                'thread' => $thread->toArray(),
            ]);
        } catch (Throwable $error) {
            StructuredLogger::error('thread.open.failed', [
                'buyerUid' => $payload['buyer_uid'] ?? null,
                'vendorUid' => $payload['vendor_uid'] ?? null,
                'actorRole' => $this->context['role'] ?? null,
                'actorUid' => $this->context['uid'] ?? null,
                'error' => $error,
            ]);
            return JsonResponse::error('thread_open_failed', 'Unable to open thread.', 500);
        }
    }
}
