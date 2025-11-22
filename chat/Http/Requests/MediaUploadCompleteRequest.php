<?php

declare(strict_types=1);

namespace Chat\Http\Requests;

use Chat\Support\AttachmentMetadata;
use Chat\Support\Validators;
use InvalidArgumentException;

final class MediaUploadCompleteRequest extends BaseRequest
{
    protected function rules(): array
    {
        $allowed = ['image', 'video', 'voice'];

        return [
            'thread_id' => Validators::requiredString(3, 160),
            'buyer_uid' => Validators::requiredString(3, 120),
            'vendor_uid' => Validators::requiredString(3, 120),
            'media_type' => static function ($value) use ($allowed) {
                if (!is_string($value)) {
                    return 'media_type must be provided';
                }
                $normalised = strtolower(trim($value));
                return in_array($normalised, $allowed, true)
                    ? true
                    : sprintf('media_type must be one of: %s', implode(', ', $allowed));
            },
            'public_id' => Validators::requiredString(3, 160),
            'secure_url' => Validators::optionalUrl(),
            'url' => Validators::optionalUrl(),
            'caption' => Validators::optionalString(2000),
            'duration' => Validators::optionalPositiveNumber(),
            'width' => Validators::optionalPositiveNumber(),
            'height' => Validators::optionalPositiveNumber(),
            'format' => Validators::optionalString(32),
            'bytes' => Validators::optionalPositiveNumber(),
            'mime_type' => Validators::optionalString(64),
            'resource_type' => Validators::optionalString(32),
            'original_filename' => Validators::optionalString(255),
            'thumbnail_url' => Validators::optionalUrl(),
            'meta' => static function ($value) {
                if ($value === null || $value === '') {
                    return true;
                }
                if (is_array($value)) {
                    return true;
                }
                if (is_string($value)) {
                    $decoded = json_decode($value, true);
                    return is_array($decoded) ? true : 'meta must be a JSON object';
                }
                return 'meta must be an object or JSON string';
            },
            'metadata' => static function ($value) {
                if ($value === null || $value === '') {
                    return true;
                }
                if (is_array($value)) {
                    return true;
                }
                if (is_string($value)) {
                    $decoded = json_decode($value, true);
                    return is_array($decoded) ? true : 'metadata must be a JSON object';
                }
                return 'metadata must be an object or JSON string';
            },
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function payload(): array
    {
        $threadId = trim((string) $this->input['thread_id']);
        $buyerUid = trim((string) $this->input['buyer_uid']);
        $vendorUid = trim((string) $this->input['vendor_uid']);
        $mediaType = strtolower(trim((string) $this->input['media_type']));
        $publicId = trim((string) $this->input['public_id']);

        $secureUrl = trim((string) ($this->input['secure_url'] ?? $this->input['url'] ?? ''));
        if ($secureUrl === '') {
            throw new InvalidArgumentException('secure_url is required');
        }

        $caption = null;
        if (isset($this->input['caption'])) {
            $trimmed = trim((string) $this->input['caption']);
            $caption = $trimmed !== '' ? $trimmed : null;
        }

        $resourceTypeInput = strtolower(trim((string) ($this->input['resource_type'] ?? '')));
        $resourceType = $resourceTypeInput !== '' ? $resourceTypeInput : $mediaType;
        $format = isset($this->input['format']) && $this->input['format'] !== ''
            ? strtolower(trim((string) $this->input['format']))
            : null;
        $mimeType = isset($this->input['mime_type']) ? trim((string) $this->input['mime_type']) : '';
        $mimeType = $mimeType !== '' ? $mimeType : null;
        $originalFilename = isset($this->input['original_filename'])
            ? trim((string) $this->input['original_filename'])
            : '';
        $originalFilename = $originalFilename !== '' ? $originalFilename : null;
        $thumbnailUrl = isset($this->input['thumbnail_url'])
            ? trim((string) $this->input['thumbnail_url'])
            : '';
        $thumbnailUrl = $thumbnailUrl !== '' ? $thumbnailUrl : null;

        $baseMeta = AttachmentMetadata::decode($this->input['meta'] ?? null);
        $additionalMeta = AttachmentMetadata::decode($this->input['metadata'] ?? null);
        if ($additionalMeta !== []) {
            $baseMeta = array_merge($baseMeta, $additionalMeta);
        }

        $metaOverrides = array_filter([
            'public_id' => $publicId,
            'media_type' => $mediaType,
            'resource_type' => $resourceType,
            'secure_url' => $secureUrl,
            'format' => $format,
            'width' => $this->input['width'] ?? null,
            'height' => $this->input['height'] ?? null,
            'duration' => $this->input['duration'] ?? null,
            'bytes' => $this->input['bytes'] ?? null,
            'mime_type' => $mimeType,
            'original_filename' => $originalFilename,
            'thumbnail_url' => $thumbnailUrl,
        ], static fn($value) => $value !== null && $value !== '');

        $meta = AttachmentMetadata::normalise($baseMeta, $metaOverrides);

        return [
            'thread_id' => $threadId,
            'buyer_uid' => $buyerUid,
            'vendor_uid' => $vendorUid,
            'media_type' => $mediaType,
            'public_id' => $publicId,
            'secure_url' => $secureUrl,
            'caption' => $caption,
            'meta' => $meta,
        ];
    }
}
