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

    public function markRead(string $chatId, string $role, ?int $timestamp = null): void
    {
        $this->threads->markRead($chatId, $role, $timestamp);

        StructuredLogger::info('thread.read_service_mark', [
            'chatId' => $chatId,
            'role' => $role,
            'timestamp' => $timestamp,
        ]);
    }

    public function getById(string $chatId): ?Thread
    {
        return $this->threads->findById($chatId);
    }

    /**
     * @param array<string, mixed> $payload
     * @param array<string, mixed> $context
     */
    public function open(array $payload, array $context = []): Thread
    {
        $buyerUid = (string) $payload['buyerUid'];
        $vendorUid = (string) $payload['vendorUid'];
        $chatId = yustam_chat_build_id($buyerUid, $vendorUid);

        $buyerName = $payload['buyerName'] ?? null;
        if ($buyerName === null || $buyerName === '') {
            $buyerName = ($context['role'] ?? '') === 'buyer' ? ($context['name'] ?? 'Buyer') : 'Buyer';
        }

        $vendorName = $payload['vendorName'] ?? null;
        if ($vendorName === null || $vendorName === '') {
            $vendorName = ($context['role'] ?? '') === 'vendor' ? ($context['name'] ?? 'Vendor') : 'Vendor';
        }

        $fields = [
            'chatId' => $chatId,
            'buyerUid' => $buyerUid,
            'buyerName' => $buyerName,
            'vendorUid' => $vendorUid,
            'vendorName' => $vendorName,
            'vendorBusinessName' => $payload['vendorBusinessName'] ?? $vendorName,
            'listingId' => $payload['listingId'] ?? null,
            'listingTitle' => $payload['listingTitle'] ?? null,
            'listingImage' => $payload['listingImage'] ?? null,
            'vendorPlan' => $payload['vendorPlan'] ?? null,
            'vendorPlanLabel' => $payload['vendorPlanLabel'] ?? null,
            'vendorPlanSlug' => $payload['vendorPlanSlug'] ?? null,
            'vendorVerified' => $payload['vendorVerified'] ?? null,
        ];

        $thread = $this->threads->upsert($fields);

        $cacheFields = [
            'chatId' => $chatId,
            'buyerUid' => $buyerUid,
            'vendorUid' => $vendorUid,
            'buyerName' => $buyerName,
            'vendorName' => $vendorName,
            'vendorBusinessName' => $payload['vendorBusinessName'] ?? $vendorName,
            'listingId' => $payload['listingId'] ?? null,
            'listingTitle' => $payload['listingTitle'] ?? null,
            'listingImage' => $payload['listingImage'] ?? null,
            'vendorPlan' => $payload['vendorPlan'] ?? null,
            'vendorPlanLabel' => $payload['vendorPlanLabel'] ?? null,
            'vendorPlanSlug' => $payload['vendorPlanSlug'] ?? null,
            'vendorVerified' => $payload['vendorVerified'] ?? null,
            'lastTs' => $thread->lastTimestamp,
            'lastMessage' => $thread->lastMessage,
            'lastSenderRole' => $thread->lastSenderRole,
        ];

        MetadataCache::updateThread($chatId, $cacheFields);

        StructuredLogger::info('thread.opened_service', [
            'chatId' => $chatId,
            'buyerUid' => $buyerUid,
            'vendorUid' => $vendorUid,
        ]);

        return $thread;
    }
}
