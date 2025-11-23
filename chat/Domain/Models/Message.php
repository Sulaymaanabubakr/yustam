<?php

declare(strict_types=1);

namespace Chat\Domain\Models;

final class Message
{
    public string $id = '';
    public string $chatId = '';
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
        $message->chatId = (string) ($data['chatId'] ?? '');
        $message->senderUid = (string) ($data['senderUid'] ?? '');
        $message->senderRole = (string) ($data['role'] ?? '');
        $message->type = strtolower((string) ($data['type'] ?? 'text'));
        $message->text = isset($data['text']) ? (string) $data['text'] : null;
        $message->mediaUrl = isset($data['mediaUrl']) ? (string) $data['mediaUrl'] : null;
        $message->imageUrl = isset($data['imageUrl']) ? (string) $data['imageUrl'] : null;
        $message->videoUrl = isset($data['videoUrl']) ? (string) $data['videoUrl'] : null;
        $message->voiceUrl = isset($data['voiceUrl']) ? (string) $data['voiceUrl'] : null;
        $message->voiceDuration = isset($data['voiceDuration']) ? (int) $data['voiceDuration'] : null;
        $message->mediaMeta = isset($data['mediaMeta']) && is_array($data['mediaMeta']) ? $data['mediaMeta'] : null;
        if ($message->mediaUrl === null) {
            $message->mediaUrl = $message->imageUrl ?? $message->videoUrl ?? $message->voiceUrl;
        }
        $message->timestamp = (int) ($data['timestamp'] ?? time());
        return $message;
    }

    public static function create(
        string $chatId,
        string $senderUid,
        string $senderRole,
        string $type,
        ?string $text = null,
        ?string $mediaUrl = null,
        ?array $mediaMeta = null
    ): self {
        $message = new self();
        $message->chatId = $chatId;
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
            'chatId' => $this->chatId,
            'senderUid' => $this->senderUid,
            'senderRole' => $this->senderRole,
            'type' => $this->type,
            'text' => $this->text,
            'mediaUrl' => $this->mediaUrl,
            'imageUrl' => $this->imageUrl,
            'videoUrl' => $this->videoUrl,
            'voiceUrl' => $this->voiceUrl,
            'voiceDuration' => $this->voiceDuration,
            'mediaMeta' => $this->mediaMeta,
            'timestamp' => $this->timestamp,
        ];
    }
}
