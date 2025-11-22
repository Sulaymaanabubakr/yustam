<?php

declare(strict_types=1);

namespace Chat\Http\Controllers;

use Chat\Domain\Services\ThreadService;
use Chat\Http\Requests\ThreadMarkReadRequest;
use Chat\Http\Responses\JsonResponse;
use Chat\Support\MetadataCache;
use Chat\Support\StructuredLogger;
use InvalidArgumentException;
use Throwable;

final class ThreadMarkReadController extends Controller
{
    private ThreadService $threads;
    private string $threadId;
    /** @var array<string, mixed> */
    private array $context;
    /** @var array<string, mixed> */
    private array $body;

    /**
     * @param array<string, mixed> $context
     * @param array<string, mixed> $body
     */
    public function __construct(ThreadService $threads, string $threadId, array $context, array $body)
    {
        $this->threads = $threads;
        $this->threadId = $threadId;
        $this->context = $context;
        $this->body = $body;
    }

    public function handle(): JsonResponse
    {
        try {
            $request = new ThreadMarkReadRequest($this->body);
            $payload = $request->payload();
        } catch (InvalidArgumentException $validationError) {
            return JsonResponse::error('validation_failed', $validationError->getMessage(), 422);
        }

        try {
            $timestamp = $payload['timestamp'] ?? null;
            if ($timestamp === null) {
                $timestamp = time();
            }

            $role = (string) ($this->context['role'] ?? 'buyer');
            $this->threads->markRead($this->threadId, $role, $timestamp);

            $field = $role === 'vendor' ? 'unread_for_vendor' : 'unread_for_buyer';
            $lastReadField = $role === 'vendor' ? 'vendor_last_read_ts' : 'buyer_last_read_ts';

            MetadataCache::updateThread($this->threadId, [
                $field => 0,
                $lastReadField => $timestamp,
            ]);

            StructuredLogger::info('thread.read_marked', [
                'threadId' => $this->threadId,
                'role' => $role,
                'timestamp' => $timestamp,
            ]);

            return JsonResponse::success([
                'threadId' => $this->threadId,
                'timestamp' => $timestamp,
            ]);
        } catch (Throwable $error) {
            StructuredLogger::error('thread.read_failed', [
                'threadId' => $this->threadId,
                'role' => $this->context['role'] ?? null,
                'error' => $error,
            ]);
            return JsonResponse::error('mark_read_failed', 'Unable to mark thread as read.', 500);
        }
    }
}
