<?php

declare(strict_types=1);

namespace Chat\Http\Requests;

use Chat\Support\Validators;
use InvalidArgumentException;

final class MediaUploadInitRequest extends BaseRequest
{
    protected function rules(): array
    {
        $allowed = ['image', 'video', 'voice'];

        return [
            'thread_id' => Validators::optionalString(160),
            'media_type' => static function ($value) use ($allowed) {
                if (!is_string($value)) {
                    return 'media_type must be provided';
                }
                $normalised = strtolower(trim($value));
                return in_array($normalised, $allowed, true)
                    ? true
                    : sprintf('media_type must be one of: %s', implode(', ', $allowed));
            },
            'public_id' => Validators::optionalString(160),
            'folder' => Validators::optionalString(255),
            'file_name' => Validators::optionalString(255),
            'tags' => static function ($value) {
                if ($value === null) {
                    return true;
                }
                if (is_string($value)) {
                    return true;
                }
                if (is_array($value)) {
                    return true;
                }
                return 'tags must be an array or comma separated string';
            },
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function payload(): array
    {
        $threadId = isset($this->input['thread_id']) ? trim((string) $this->input['thread_id']) : '';
        $mediaType = strtolower(trim((string) $this->input['media_type']));

        $publicId = isset($this->input['public_id']) ? trim((string) $this->input['public_id']) : '';
        $folder = isset($this->input['folder']) ? trim((string) $this->input['folder']) : '';
        $fileName = isset($this->input['file_name']) ? trim((string) $this->input['file_name']) : '';

        $tagsInput = $this->input['tags'] ?? [];
        $tags = [];
        if (is_string($tagsInput)) {
            $tagsInput = explode(',', $tagsInput);
        }
        if (is_array($tagsInput)) {
            foreach ($tagsInput as $tag) {
                $sanitised = preg_replace('/[^A-Za-z0-9_\-]/', '', (string) $tag) ?? '';
                if ($sanitised !== '') {
                    $tags[] = strtolower($sanitised);
                }
            }
        }

        if (empty($tags)) {
            $tags = ['chat', 'chat-' . $mediaType];
            if ($threadId !== '') {
                $tags[] = 'thread-' . preg_replace('/[^A-Za-z0-9]/', '', $threadId);
            }
        }

        return [
            'thread_id' => $threadId,
            'media_type' => $mediaType,
            'public_id' => $publicId,
            'folder' => $folder,
            'file_name' => $fileName,
            'tags' => $tags,
        ];
    }
}
