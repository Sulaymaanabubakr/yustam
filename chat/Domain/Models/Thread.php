<?php

declare(strict_types=1);

namespace Chat\Domain\Models;

final class Thread
{
    public string $id;
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
        $thread->id = (string) ($data['id'] ?? $data['chat_id'] ?? '');
        $thread->buyerUid = (string) ($data['buyer_uid'] ?? $data['buyerUid'] ?? '');
        $thread->buyerName = self::stringOrNull($data, 'buyer_name', 'buyerName');
        $thread->vendorUid = (string) ($data['vendor_uid'] ?? $data['vendorUid'] ?? '');
        $thread->vendorName = self::stringOrNull($data, 'vendor_name', 'vendorName');
        $thread->vendorBusinessName = self::stringOrNull($data, 'vendor_business_name', 'vendorBusinessName');
        $thread->listingId = self::stringOrNull($data, 'listing_id', 'listingId');
        $thread->listingTitle = self::stringOrNull($data, 'listing_title', 'listingTitle');
        $thread->listingImage = self::stringOrNull($data, 'listing_image', 'listingImage');
        $thread->lastMessage = (string) ($data['last_text'] ?? $data['lastMessage'] ?? '');
        $thread->lastSenderRole = (string) ($data['last_sender_role'] ?? $data['lastSenderRole'] ?? '');
        $thread->lastTimestamp = (int) ($data['last_ts'] ?? $data['lastTs'] ?? time());
        $thread->unreadForBuyer = (int) ($data['unread_for_buyer'] ?? $data['unreadForBuyer'] ?? 0);
        $thread->unreadForVendor = (int) ($data['unread_for_vendor'] ?? $data['unreadForVendor'] ?? 0);
        $thread->vendorPlan = self::stringOrNull($data, 'vendor_plan', 'vendorPlan');
        $thread->vendorPlanLabel = self::stringOrNull($data, 'vendor_plan_label', 'vendorPlanLabel');
        $thread->vendorPlanSlug = self::stringOrNull($data, 'vendor_plan_slug', 'vendorPlanSlug');
        $thread->vendorVerificationState = self::stringOrNull($data, 'vendor_verified', 'vendorVerified');
        $thread->buyerLastReadTs = self::intOrNull($data, 'buyer_last_read_ts', 'buyerLastReadTs');
        $thread->vendorLastReadTs = self::intOrNull($data, 'vendor_last_read_ts', 'vendorLastReadTs');
        return $thread;
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        $vendorName = $this->vendorBusinessName ?? $this->vendorName;

        return [
            'id' => $this->id,
            'chat_id' => $this->id,
            'buyerUid' => $this->buyerUid,
            'buyer_uid' => $this->buyerUid,
            'buyerName' => $this->buyerName,
            'buyer_name' => $this->buyerName,
            'vendorUid' => $this->vendorUid,
            'vendor_uid' => $this->vendorUid,
            'vendorName' => $this->vendorName,
            'vendor_name' => $this->vendorName,
            'vendorBusinessName' => $this->vendorBusinessName,
            'vendor_business_name' => $this->vendorBusinessName,
            'listingId' => $this->listingId,
            'listing_id' => $this->listingId,
            'listingTitle' => $this->listingTitle,
            'listing_title' => $this->listingTitle,
            'listingImage' => $this->listingImage,
            'listing_image' => $this->listingImage,
            'lastMessage' => $this->lastMessage,
            'last_text' => $this->lastMessage,
            'lastSenderRole' => $this->lastSenderRole,
            'last_sender_role' => $this->lastSenderRole,
            'lastTs' => $this->lastTimestamp,
            'last_ts' => $this->lastTimestamp,
            'unreadForBuyer' => $this->unreadForBuyer,
            'unread_for_buyer' => $this->unreadForBuyer,
            'unreadForVendor' => $this->unreadForVendor,
            'unread_for_vendor' => $this->unreadForVendor,
            'vendorPlan' => $this->vendorPlan,
            'vendor_plan' => $this->vendorPlan,
            'vendorPlanLabel' => $this->vendorPlanLabel,
            'vendor_plan_label' => $this->vendorPlanLabel,
            'vendorPlanSlug' => $this->vendorPlanSlug,
            'vendor_plan_slug' => $this->vendorPlanSlug,
            'vendorVerified' => $this->vendorVerificationState,
            'vendor_verified' => $this->vendorVerificationState,
            'buyerLastReadTs' => $this->buyerLastReadTs,
            'buyer_last_read_ts' => $this->buyerLastReadTs,
            'vendorLastReadTs' => $this->vendorLastReadTs,
            'vendor_last_read_ts' => $this->vendorLastReadTs,
        ];
    }

    /**
     * @param array<string, mixed> $data
     */
    private static function stringOrNull(array $data, string $snake, string $camel): ?string
    {
        $value = $data[$snake] ?? $data[$camel] ?? null;
        if ($value === null) {
            return null;
        }
        $trimmed = trim((string) $value);
        return $trimmed === '' ? null : $trimmed;
    }

    /**
     * @param array<string, mixed> $data
     */
    private static function intOrNull(array $data, string $snake, string $camel): ?int
    {
        $value = $data[$snake] ?? $data[$camel] ?? null;
        if ($value === null || $value === '') {
            return null;
        }
        return (int) $value;
    }
}
