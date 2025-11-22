<?php

declare(strict_types=1);

namespace Chat\Domain\Models;

final class Message
{
    public string $id = '';
    public string $threadId = '';
    public string $senderUid = '';
    public string $senderRole = '';
    public string $type = 'text';
    public ?string $text = null;
    public ?string $mediaUrl = null;
    public ?array $mediaMeta = null;
    public ?string $imageUrl = null;
    public ?string $videoUrl = null;
    public ?string $voiceUrl = null;
    public ?int $voiceDuration = null;
    public int $timestamp = 0;

    /**
     * @param array<string, mixed> $data
     */
    public static function fromFirestore(array $data): self
    {
        $message = new self();
        $message->id = (string) ($data['id'] ?? '');
        $message->threadId = (string) ($data['chat_id'] ?? $data['threadId'] ?? '');
        $message->senderUid = (string) ($data['sender_uid'] ?? $data['senderUid'] ?? '');
        $message->senderRole = (string) ($data['sender_role'] ?? $data['role'] ?? '');
        $message->type = strtolower((string) ($data['type'] ?? $data['message_type'] ?? 'text'));
        $message->text = isset($data['text']) ? (string) $data['text'] : null;
        $message->mediaUrl = isset($data['media_url']) ? (string) $data['media_url'] : null;
        $message->imageUrl = isset($data['image_url']) ? (string) $data['image_url'] : ($data['imageUrl'] ?? null);
        $message->videoUrl = isset($data['video_url']) ? (string) $data['video_url'] : ($data['videoUrl'] ?? null);
        $message->voiceUrl = isset($data['voice_url']) ? (string) $data['voice_url'] : ($data['voiceUrl'] ?? null);
        $message->voiceDuration = isset($data['voice_duration']) ? (int) $data['voice_duration'] : ($data['voiceDuration'] ?? null);
        $message->mediaMeta = isset($data['media_meta']) && is_array($data['media_meta']) ? $data['media_meta'] : null;
        if ($message->mediaUrl === null) {
            $message->mediaUrl = $message->imageUrl ?? $message->videoUrl ?? $message->voiceUrl;
        }
        $message->timestamp = (int) ($data['ts'] ?? $data['timestamp'] ?? time());
        return $message;
    }

    public static function create(
        string $threadId,
        string $senderUid,
        string $senderRole,
        string $type,
        ?string $text = null,
        ?string $mediaUrl = null,
        ?array $mediaMeta = null
    ): self {
        $message = new self();
        $message->threadId = $threadId;
        $message->senderUid = $senderUid;
        $message->senderRole = $senderRole;
        $message->type = strtolower($type);
        $message->text = $text;
        $message->mediaUrl = $mediaUrl;
        $message->mediaMeta = $mediaMeta;
        $message->timestamp = time();

        if ($message->type === 'image') {
            $message->imageUrl = $mediaUrl;
        } elseif ($message->type === 'video') {
            $message->videoUrl = $mediaUrl;
        } elseif ($message->type === 'voice') {
            $message->voiceUrl = $mediaUrl;
            if (isset($mediaMeta['duration'])) {
                $message->voiceDuration = (int) $mediaMeta['duration'];
            }
        }

        return $message;
    }

    public function preview(): string
    {
        return match ($this->type) {
            'image' => 'Photo',
            'video' => 'Video',
            'voice' => 'Voice note',
            default => trim((string) $this->text) !== '' ? trim((string) $this->text) : 'Message',
        };
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'chatId' => $this->threadId,
            'chat_id' => $this->threadId,
            'senderUid' => $this->senderUid,
            'sender_uid' => $this->senderUid,
            'senderRole' => $this->senderRole,
            'sender_role' => $this->senderRole,
            'type' => $this->type,
            'text' => $this->text,
            'mediaUrl' => $this->mediaUrl,
            'media_url' => $this->mediaUrl,
            'imageUrl' => $this->imageUrl,
            'image_url' => $this->imageUrl,
            'videoUrl' => $this->videoUrl,
            'video_url' => $this->videoUrl,
            'voiceUrl' => $this->voiceUrl,
            'voice_url' => $this->voiceUrl,
            'voiceDuration' => $this->voiceDuration,
            'voice_duration' => $this->voiceDuration,
            'mediaMeta' => $this->mediaMeta,
            'media_meta' => $this->mediaMeta,
            'timestamp' => $this->timestamp,
            'ts' => $this->timestamp,
        ];
    }
}
