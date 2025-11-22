<?php

declare(strict_types=1);

namespace Chat\Http\Requests;

use Chat\Support\AttachmentMetadata;
use Chat\Support\Validators;
use InvalidArgumentException;

final class SendMessageRequest extends BaseRequest
{
    protected function rules(): array
    {
        return [
            'buyer_uid' => Validators::requiredString(3, 120),
            'vendor_uid' => Validators::requiredString(3, 120),
            'text' => Validators::optionalString(2000),
            'image_url' => Validators::optionalString(2048),
            'video_url' => Validators::optionalString(2048),
            'voice_url' => Validators::optionalString(2048),
            'voice_duration' => static function ($value) {
                if ($value === null || $value === '') {
                    return true;
                }
                if (is_numeric($value) && (float) $value >= 0) {
                    return true;
                }
                return 'voice_duration must be a positive number';
            },
            'media_meta' => static function ($value) {
                if ($value === null || $value === '') {
                    return true;
                }
                if (is_array($value)) {
                    return true;
                }
                if (is_string($value)) {
                    $decoded = json_decode($value, true);
                    return is_array($decoded) ? true : 'media_meta must be a JSON object';
                }
                return 'media_meta must be an object or JSON string';
            },
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function payload(): array
    {
        $text = trim((string) ($this->input['text'] ?? ''));
        $image = trim((string) ($this->input['image_url'] ?? ''));
        $video = trim((string) ($this->input['video_url'] ?? ''));
        $voice = trim((string) ($this->input['voice_url'] ?? ''));

        if ($text === '' && $image === '' && $video === '' && $voice === '') {
            throw new InvalidArgumentException('Message content required.');
        }

        $type = 'text';
        $mediaUrl = null;
        $metaOverrides = [];

        if ($voice !== '') {
            $type = 'voice';
            $mediaUrl = $voice;
            $duration = $this->input['voice_duration'] ?? null;
            if ($duration !== null && $duration !== '') {
                $metaOverrides['duration'] = (float) $duration;
            }
        } elseif ($video !== '') {
            $type = 'video';
            $mediaUrl = $video;
        } elseif ($image !== '') {
            $type = 'image';
            $mediaUrl = $image;
        }

        if ($type !== 'text') {
            $metaOverrides['media_type'] = $type;
        }

        $incomingMeta = AttachmentMetadata::decode($this->input['media_meta'] ?? null);
        $mediaMeta = AttachmentMetadata::normalise($incomingMeta, $metaOverrides);

        return [
            'buyer_uid' => trim((string) $this->input['buyer_uid']),
            'vendor_uid' => trim((string) $this->input['vendor_uid']),
            'text' => $text !== '' ? $text : null,
            'type' => $type,
            'media_url' => $mediaUrl,
            'media_meta' => $mediaMeta ?: null,
        ];
    }
}
