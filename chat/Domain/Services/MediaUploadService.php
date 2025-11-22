<?php

declare(strict_types=1);

namespace Chat\Domain\Services;

use Chat\Domain\Models\Message;
use Chat\Support\MetadataCache;
use Chat\Support\StructuredLogger;
use RuntimeException;
use const PATHINFO_FILENAME;
use function pathinfo;
use function time;
use function yustam_cloudinary_check_credentials;
use function yustam_cloudinary_credentials;
use function yustam_cloudinary_generate_public_id;
use function yustam_cloudinary_sanitize_folder;
use function yustam_cloudinary_sanitize_public_id;
use function yustam_cloudinary_sign;

final class MediaUploadService
{
    private MessageService $messages;

    public function __construct(MessageService $messages)
    {
        $this->messages = $messages;
    }

    /**
     * @param array<string, mixed> $context
     * @param array<string, mixed> $options
     * @return array<string, mixed>
     */
    public function issueUploadSignature(array $context, array $options): array
    {
        yustam_cloudinary_check_credentials();

        $mediaType = $options['media_type'] ?? 'image';
        $resourceType = $this->mapResourceType((string) $mediaType);

        $folderInput = (string) ($options['folder'] ?? '');
        $folder = yustam_cloudinary_sanitize_folder($folderInput);
        if ($folder === '') {
            $folder = sprintf(
                'yustam/chat/%s/%s',
                ($context['role'] ?? '') === 'vendor' ? 'vendors' : 'buyers',
                $mediaType
            );
        }

        $publicIdInput = (string) ($options['public_id'] ?? '');
        $publicId = yustam_cloudinary_sanitize_public_id($publicIdInput);
        if ($publicId === '' && !empty($options['file_name'])) {
            $base = pathinfo((string) $options['file_name'], PATHINFO_FILENAME);
            $publicId = yustam_cloudinary_sanitize_public_id(strtolower((string) $base));
        }
        if ($publicId === '') {
            $userContext = [
                'role' => $context['role'] ?? 'buyer',
                'vendorUid' => $context['vendorUid'] ?? null,
                'firebaseUid' => $context['firebaseUid'] ?? null,
                'id' => $context['uid'] ?? null,
            ];
            $publicId = yustam_cloudinary_generate_public_id($userContext, $resourceType === 'video' ? 'video' : 'image');
        }

        $credentials = yustam_cloudinary_credentials();
        if (empty($credentials['uploadPreset'])) {
            throw new RuntimeException('Cloudinary upload preset is not configured.');
        }

        $tags = $options['tags'] ?? [];
        if (!is_array($tags)) {
            $tags = [$tags];
        }
        $tags = array_values(array_filter(array_unique(array_map(static function ($tag) {
            return trim((string) $tag);
        }, $tags)), static function ($tag) {
            return $tag !== '';
        }));

        $timestamp = time();
        $params = [
            'timestamp' => $timestamp,
            'upload_preset' => $credentials['uploadPreset'],
            'folder' => $folder,
            'overwrite' => 'true',
            'public_id' => $publicId,
        ];
        if (!empty($tags)) {
            $params['tags'] = implode(',', $tags);
        }

        $signature = yustam_cloudinary_sign($params);

        $fields = array_map(static function ($value) {
            return (string) $value;
        }, $params);
        $fields['signature'] = $signature;
        $fields['api_key'] = (string) $credentials['apiKey'];

        $result = [
            'uploadUrl' => sprintf(
                'https://api.cloudinary.com/v1_1/%s/%s/upload',
                rawurlencode((string) $credentials['cloudName']),
                $resourceType
            ),
            'resourceType' => $resourceType,
            'mediaType' => $mediaType,
            'media_type' => $mediaType,
            'timestamp' => $timestamp,
            'expiresAt' => $timestamp + 600,
            'publicId' => $publicId,
            'public_id' => $publicId,
            'folder' => $folder,
            'fields' => $fields,
        ];

        if (!empty($options['thread_id'])) {
            $threadId = (string) $options['thread_id'];
            $result['threadId'] = $threadId;
            $result['thread_id'] = $threadId;
        }

        StructuredLogger::debug('media.signature.issued', [
            'threadId' => $result['threadId'] ?? null,
            'mediaType' => $mediaType,
            'resourceType' => $resourceType,
            'publicId' => $publicId,
        ]);

        return $result;
    }

    /**
     * @param array<string, mixed> $context
     * @param array<string, mixed> $payload
     */
    public function completeUpload(array $context, array $payload): Message
    {
        $threadId = (string) ($payload['thread_id'] ?? '');
        $buyerUid = (string) ($payload['buyer_uid'] ?? '');
        $vendorUid = (string) ($payload['vendor_uid'] ?? '');
        $mediaType = (string) ($payload['media_type'] ?? 'image');
        $secureUrl = (string) ($payload['secure_url'] ?? '');
        $senderUid = (string) ($context['uid'] ?? '');
        $meta = $payload['meta'] ?? [];
        if (!is_array($meta)) {
            $meta = [];
        }

        if ($threadId === '' || $secureUrl === '' || $senderUid === '') {
            throw new RuntimeException('Upload completion payload missing thread or media url.');
        }

        $message = Message::create(
            $threadId,
            $senderUid,
            (string) ($context['role'] ?? 'buyer'),
            $mediaType,
            $payload['caption'] ?? null,
            $secureUrl,
            $meta
        );

        $message = $this->messages->store($message);

        MetadataCache::updateThread($threadId, [
            'buyer_uid' => $buyerUid,
            'vendor_uid' => $vendorUid,
            'last_text' => $message->preview(),
            'last_sender_role' => $context['role'] ?? 'buyer',
            'last_ts' => time(),
        ]);

        StructuredLogger::info('media.upload.persisted', [
            'threadId' => $threadId,
            'mediaType' => $mediaType,
            'messageId' => $message->id,
            'publicId' => $meta['public_id'] ?? null,
        ]);

        return $message;
    }

    private function mapResourceType(string $mediaType): string
    {
        $kinds = [
            'image' => 'image',
            'video' => 'video',
            'voice' => 'video',
        ];

        $normalised = strtolower($mediaType);
        return $kinds[$normalised] ?? 'image';
    }
}
