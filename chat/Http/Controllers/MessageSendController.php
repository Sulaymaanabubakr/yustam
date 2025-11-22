<?php

declare(strict_types=1);

namespace Chat\Http\Controllers;

use Chat\Domain\Models\Message;
use Chat\Domain\Services\MessageService;
use Chat\Http\Requests\SendMessageRequest;
use Chat\Http\Responses\JsonResponse;
use Chat\Support\MetadataCache;
use Chat\Support\StructuredLogger;
use InvalidArgumentException;
use Throwable;

final class MessageSendController extends Controller
{
    private MessageService $messages;
    private string $threadId;
    private string $role;
    private string $uid;
    /** @var array<string, mixed> */
    private array $body;

    /**
     * @param array<string, mixed> $body
     */
    public function __construct(MessageService $messages, string $threadId, string $role, string $uid, array $body)
    {
        $this->messages = $messages;
        $this->threadId = $threadId;
        $this->role = $role;
        $this->uid = $uid;
        $this->body = $body;
    }

    public function handle(): JsonResponse
    {
        try {
            $request = new SendMessageRequest($this->body);
            $payload = $request->payload();
        } catch (InvalidArgumentException $validationError) {
            return JsonResponse::error('validation_failed', $validationError->getMessage(), 422);
        }

        try {
            $message = Message::create(
                $this->threadId,
                $this->uid,
                $this->role,
                $payload['type'],
                $payload['text'] ?? null,
                $payload['media_url'] ?? null,
                $payload['media_meta'] ?? null
            );

            $message = $this->messages->store($message);

            $preview = $message->preview();

            MetadataCache::updateThread($this->threadId, [
                'buyer_uid' => $payload['buyer_uid'],
                'vendor_uid' => $payload['vendor_uid'],
                'last_text' => $preview,
                'last_sender_role' => $this->role,
                'last_ts' => time(),
            ]);

            StructuredLogger::info('message.send.success', [
                'threadId' => $this->threadId,
                'senderRole' => $this->role,
                'senderUid' => $this->uid,
                'messageId' => $message->id,
                'type' => $message->type,
                'hasMedia' => $message->mediaUrl !== null,
            ]);

            return JsonResponse::success([
                'messageId' => $message->id,
                'preview' => $preview,
            ]);
        } catch (Throwable $error) {
            StructuredLogger::error('message.send.failed', [
                'threadId' => $this->threadId,
                'senderRole' => $this->role,
                'senderUid' => $this->uid,
                'error' => $error,
            ]);
            return JsonResponse::error('send_failed', 'Unable to send message.', 500);
        }
    }
}
