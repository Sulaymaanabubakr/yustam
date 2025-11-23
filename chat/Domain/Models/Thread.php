<?php

declare(strict_types=1);

namespace Chat\Domain\Models;

final class Thread
{
    public string $chatId;
    public string $buyerUid;
    public ?string $buyerName;
    public string $vendorUid;
    public ?string $vendorName;
    public ?string $vendorBusinessName;
    public ?string $listingId;
    public ?string $listingTitle;
    public ?string $listingImage;
    public string $lastMessage;
    public string $lastSenderRole;
    public int $lastTimestamp;
    public int $unreadForBuyer;
    public int $unreadForVendor;
    public ?string $vendorPlan;
    public ?string $vendorPlanLabel;
    public ?string $vendorPlanSlug;
    public ?string $vendorVerificationState;
    public ?int $buyerLastReadTs;
    public ?int $vendorLastReadTs;

    /**
     * @param array<string, mixed> $data
     */
    public static function fromArray(array $data): self
    {
        $thread = new self();
        $thread->chatId = (string) ($data['chatId'] ?? $data['id'] ?? '');
        $thread->buyerUid = (string) ($data['buyerUid'] ?? '');
        $thread->buyerName = self::stringOrNull($data, 'buyerName');
        $thread->vendorUid = (string) ($data['vendorUid'] ?? '');
        $thread->vendorName = self::stringOrNull($data, 'vendorName');
        $thread->vendorBusinessName = self::stringOrNull($data, 'vendorBusinessName');
        $thread->listingId = self::stringOrNull($data, 'listingId');
        $thread->listingTitle = self::stringOrNull($data, 'listingTitle');
        $thread->listingImage = self::stringOrNull($data, 'listingImage');
        $thread->lastMessage = (string) ($data['lastMessage'] ?? '');
        $thread->lastSenderRole = (string) ($data['lastSenderRole'] ?? '');
        $thread->lastTimestamp = (int) ($data['lastTs'] ?? time());
        $thread->unreadForBuyer = (int) ($data['unreadForBuyer'] ?? 0);
        $thread->unreadForVendor = (int) ($data['unreadForVendor'] ?? 0);
        $thread->vendorPlan = self::stringOrNull($data, 'vendorPlan');
        $thread->vendorPlanLabel = self::stringOrNull($data, 'vendorPlanLabel');
        $thread->vendorPlanSlug = self::stringOrNull($data, 'vendorPlanSlug');
        $thread->vendorVerificationState = self::stringOrNull($data, 'vendorVerified');
        $thread->buyerLastReadTs = self::intOrNull($data, 'buyerLastReadTs');
        $thread->vendorLastReadTs = self::intOrNull($data, 'vendorLastReadTs');
        return $thread;
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'chatId' => $this->chatId,
            'buyerUid' => $this->buyerUid,
            'buyerName' => $this->buyerName,
            'vendorUid' => $this->vendorUid,
            'vendorName' => $this->vendorName,
            'vendorBusinessName' => $this->vendorBusinessName,
            'listingId' => $this->listingId,
            'listingTitle' => $this->listingTitle,
            'listingImage' => $this->listingImage,
            'lastMessage' => $this->lastMessage,
            'lastSenderRole' => $this->lastSenderRole,
            'lastTs' => $this->lastTimestamp,
            'unreadForBuyer' => $this->unreadForBuyer,
            'unreadForVendor' => $this->unreadForVendor,
            'vendorPlan' => $this->vendorPlan,
            'vendorPlanLabel' => $this->vendorPlanLabel,
            'vendorPlanSlug' => $this->vendorPlanSlug,
            'vendorVerified' => $this->vendorVerificationState,
            'buyerLastReadTs' => $this->buyerLastReadTs,
            'vendorLastReadTs' => $this->vendorLastReadTs,
        ];
    }

    /**
     * @param array<string, mixed> $data
     */
    private static function stringOrNull(array $data, string $camel): ?string
    {
        $value = $data[$camel] ?? null;
        if ($value === null) {
            return null;
        }
        $trimmed = trim((string) $value);
        return $trimmed === '' ? null : $trimmed;
    }

    /**
     * @param array<string, mixed> $data
     */
    private static function intOrNull(array $data, string $camel): ?int
    {
        $value = $data[$camel] ?? null;
        if ($value === null || $value === '') {
            return null;
        }
        return (int) $value;
    }
}

