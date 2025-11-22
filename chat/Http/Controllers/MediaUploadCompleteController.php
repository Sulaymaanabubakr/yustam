<?php

declare(strict_types=1);

namespace Chat\Http\Controllers;

use Chat\Domain\Services\MediaUploadService;
use Chat\Http\Requests\MediaUploadCompleteRequest;
use Chat\Http\Responses\JsonResponse;
use Chat\Support\StructuredLogger;
use InvalidArgumentException;
use Throwable;

final class MediaUploadCompleteController extends Controller
{
    private MediaUploadService $media;
    /** @var array<string, mixed> */
    private array $context;
    /** @var array<string, mixed> */
    private array $body;

    /**
     * @param array<string, mixed> $context
     * @param array<string, mixed> $body
     */
    public function __construct(MediaUploadService $media, array $context, array $body)
    {
        $this->media = $media;
        $this->context = $context;
        $this->body = $body;
    }

    public function handle(): JsonResponse
    {
        try {
            $request = new MediaUploadCompleteRequest($this->body);
            $payload = $request->payload();
        } catch (InvalidArgumentException $validationError) {
            return JsonResponse::error('validation_failed', $validationError->getMessage(), 422);
        }

        try {
            $message = $this->media->completeUpload($this->context, $payload);

            StructuredLogger::info('media.upload.complete', [
                'threadId' => $payload['thread_id'],
                'mediaType' => $payload['media_type'],
                'actorRole' => $this->context['role'] ?? null,
                'actorUid' => $this->context['uid'] ?? null,
                'messageId' => $message->id,
            ]);

            return JsonResponse::success([
                'messageId' => $message->id,
                'message' => $message->toArray(),
                'preview' => $message->preview(),
            ], 201);
        } catch (Throwable $error) {
            StructuredLogger::error('media.upload.complete_failed', [
                'threadId' => $payload['thread_id'] ?? null,
                'mediaType' => $payload['media_type'] ?? null,
                'actorRole' => $this->context['role'] ?? null,
                'actorUid' => $this->context['uid'] ?? null,
                'error' => $error,
            ]);
            return JsonResponse::error('media_complete_failed', 'Unable to finalise media upload.', 500);
        }
    }
}
