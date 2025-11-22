<?php

declare(strict_types=1);

namespace Chat\Http\Controllers;

use Chat\Domain\Services\MediaUploadService;
use Chat\Http\Requests\MediaUploadInitRequest;
use Chat\Http\Responses\JsonResponse;
use Chat\Support\StructuredLogger;
use InvalidArgumentException;
use Throwable;

final class MediaUploadInitController extends Controller
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
            $request = new MediaUploadInitRequest($this->body);
            $payload = $request->payload();
        } catch (InvalidArgumentException $validationError) {
            return JsonResponse::error('validation_failed', $validationError->getMessage(), 422);
        }

        try {
            $upload = $this->media->issueUploadSignature($this->context, $payload);

            StructuredLogger::info('media.upload.init', [
                'threadId' => $payload['thread_id'] ?? null,
                'mediaType' => $payload['media_type'] ?? null,
                'actorRole' => $this->context['role'] ?? null,
                'actorUid' => $this->context['uid'] ?? null,
                'publicId' => $upload['publicId'] ?? $upload['public_id'] ?? null,
            ]);

            return JsonResponse::success([
                'upload' => $upload,
            ]);
        } catch (Throwable $error) {
            StructuredLogger::error('media.upload.init_failed', [
                'threadId' => $payload['thread_id'] ?? null,
                'mediaType' => $payload['media_type'] ?? null,
                'actorRole' => $this->context['role'] ?? null,
                'actorUid' => $this->context['uid'] ?? null,
                'error' => $error,
            ]);
            return JsonResponse::error('media_init_failed', 'Unable to initialise media upload.', 500);
        }
    }
}
