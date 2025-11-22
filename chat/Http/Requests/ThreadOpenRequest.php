<?php

declare(strict_types=1);

namespace Chat\Http\Requests;

use Chat\Support\Validators;

final class ThreadOpenRequest extends BaseRequest
{
    protected function rules(): array
    {
        return [
            'buyer_uid' => Validators::requiredString(3, 160),
            'buyer_name' => Validators::optionalString(160),
            'vendor_uid' => Validators::requiredString(3, 160),
            'vendor_name' => Validators::optionalString(160),
            'vendor_business_name' => Validators::optionalString(160),
            'listing_id' => Validators::optionalString(120),
            'listing_title' => Validators::optionalString(255),
            'listing_image' => Validators::optionalUrl(),
            'vendor_plan' => Validators::optionalString(120),
            'vendor_plan_label' => Validators::optionalString(160),
            'vendor_plan_slug' => Validators::optionalString(160),
            'vendor_verified' => Validators::optionalString(80),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function payload(): array
    {
        $sanitise = static function (?string $value): ?string {
            if ($value === null) {
                return null;
            }
            $trimmed = trim($value);
            return $trimmed === '' ? null : $trimmed;
        };

        return [
            'buyer_uid' => trim((string) $this->input['buyer_uid']),
            'buyer_name' => $sanitise($this->input['buyer_name'] ?? null),
            'vendor_uid' => trim((string) $this->input['vendor_uid']),
            'vendor_name' => $sanitise($this->input['vendor_name'] ?? null),
            'vendor_business_name' => $sanitise($this->input['vendor_business_name'] ?? null),
            'listing_id' => $sanitise($this->input['listing_id'] ?? null),
            'listing_title' => $sanitise($this->input['listing_title'] ?? null),
            'listing_image' => $sanitise($this->input['listing_image'] ?? null),
            'vendor_plan' => $sanitise($this->input['vendor_plan'] ?? null),
            'vendor_plan_label' => $sanitise($this->input['vendor_plan_label'] ?? null),
            'vendor_plan_slug' => $sanitise($this->input['vendor_plan_slug'] ?? null),
            'vendor_verified' => $sanitise($this->input['vendor_verified'] ?? null),
        ];
    }
}
