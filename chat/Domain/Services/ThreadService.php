<?php

declare(strict_types=1);

namespace Chat\Domain\Services;

use Chat\Domain\Models\Thread;
use Chat\Domain\Repositories\ThreadRepositoryInterface;
use Chat\Support\MetadataCache;
use Chat\Support\StructuredLogger;
use function yustam_chat_build_id;

final class ThreadService
{
    private ThreadRepositoryInterface $threads;

    public function __construct(ThreadRepositoryInterface $threads)
    {
        $this->threads = $threads;
    }

    /**
     * @return Thread[]
     */
    public function listForUser(string $role, string $uid, int $limit = 50): array
    {
        $threads = $this->threads->listByParticipant($role, $uid, $limit);

        StructuredLogger::debug('thread.list', [
            'role' => $role,
            'uid' => $uid,
            'limit' => $limit,
            'returned' => count($threads),
        ]);

        return $threads;
    }

    public function markRead(string $threadId, string $role, ?int $timestamp = null): void
    {
        $this->threads->markRead($threadId, $role, $timestamp);

        StructuredLogger::info('thread.read_service_mark', [
            'threadId' => $threadId,
            'role' => $role,
            'timestamp' => $timestamp,
        ]);
    }

    public function getById(string $threadId): ?Thread
    {
        return $this->threads->findById($threadId);
    }

    /**
     * @param array<string, mixed> $payload
     * @param array<string, mixed> $context
     */
    public function open(array $payload, array $context = []): Thread
    {
        $buyerUid = (string) $payload['buyer_uid'];
        $vendorUid = (string) $payload['vendor_uid'];
        $chatId = yustam_chat_build_id($buyerUid, $vendorUid);

        $buyerName = $payload['buyer_name'] ?? null;
        if ($buyerName === null || $buyerName === '') {
            $buyerName = ($context['role'] ?? '') === 'buyer' ? ($context['name'] ?? 'Buyer') : 'Buyer';
        }

        $vendorName = $payload['vendor_name'] ?? null;
        if ($vendorName === null || $vendorName === '') {
            $vendorName = ($context['role'] ?? '') === 'vendor' ? ($context['name'] ?? 'Vendor') : 'Vendor';
        }

        $fields = [
            'chat_id' => $chatId,
            'buyer_uid' => $buyerUid,
            'buyer_name' => $buyerName,
            'vendor_uid' => $vendorUid,
            'vendor_name' => $vendorName,
            'vendor_business_name' => $payload['vendor_business_name'] ?? $vendorName,
            'listing_id' => $payload['listing_id'] ?? null,
            'listing_title' => $payload['listing_title'] ?? null,
            'listing_image' => $payload['listing_image'] ?? null,
            'vendor_plan' => $payload['vendor_plan'] ?? null,
            'vendor_plan_label' => $payload['vendor_plan_label'] ?? null,
            'vendor_plan_slug' => $payload['vendor_plan_slug'] ?? null,
            'vendor_verified' => $payload['vendor_verified'] ?? null,
        ];

        $thread = $this->threads->upsert($fields);

        $cacheFields = [
            'chat_id' => $chatId,
            'buyer_uid' => $buyerUid,
            'vendor_uid' => $vendorUid,
            'buyer_name' => $buyerName,
            'vendor_name' => $vendorName,
            'vendor_business_name' => $payload['vendor_business_name'] ?? $vendorName,
            'listing_id' => $payload['listing_id'] ?? null,
            'listing_title' => $payload['listing_title'] ?? null,
            'listing_image' => $payload['listing_image'] ?? null,
            'vendor_plan' => $payload['vendor_plan'] ?? null,
            'vendor_plan_label' => $payload['vendor_plan_label'] ?? null,
            'vendor_plan_slug' => $payload['vendor_plan_slug'] ?? null,
            'vendor_verified' => $payload['vendor_verified'] ?? null,
            'last_ts' => $thread->lastTimestamp,
            'last_text' => $thread->lastMessage,
            'last_sender_role' => $thread->lastSenderRole,
        ];

        MetadataCache::updateThread($chatId, $cacheFields);

        StructuredLogger::info('thread.opened_service', [
            'threadId' => $chatId,
            'buyerUid' => $buyerUid,
            'vendorUid' => $vendorUid,
        ]);

        return $thread;
    }
}
