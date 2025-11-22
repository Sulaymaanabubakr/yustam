<?php

declare(strict_types=1);

namespace Chat\Support;

final class MetadataCache
{
    /**
     * @param array<string, mixed> $fields
     */
    public static function updateThread(string $threadId, array $fields): void
    {
        if ($threadId === '') {
            return;
        }

        try {
            $updated = \yustam_api_chat_update_cached_thread($threadId, $fields);
            if (!$updated) {
                \yustam_api_chat_store_metadata($threadId, $fields);
            }
        } catch (\Throwable $error) {
            StructuredLogger::error('metadata.sync_failed', [
                'threadId' => $threadId,
                'error' => $error,
            ]);
        }
    }
}
