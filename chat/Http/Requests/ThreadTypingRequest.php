<?php

declare(strict_types=1);

namespace Chat\Http\Requests;

use InvalidArgumentException;

final class ThreadTypingRequest extends BaseRequest
{
    protected function rules(): array
    {
        return [
            'is_typing' => static function ($value) {
                if (!is_bool($value)) {
                    return 'is_typing must be a boolean value';
                }
                return true;
            },
            'ttl' => static function ($value) {
                if ($value === null || $value === '') {
                    return true;
                }
                if (!is_numeric($value)) {
                    return 'ttl must be numeric';
                }
                $int = (int) $value;
                if ($int < 1 || $int > 120) {
                    return 'ttl must be between 1 and 120 seconds';
                }
                return true;
            },
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function payload(): array
    {
        if (!array_key_exists('is_typing', $this->input)) {
            throw new InvalidArgumentException('is_typing is required');
        }

        $ttl = $this->input['ttl'] ?? null;

        return [
            'is_typing' => (bool) $this->input['is_typing'],
            'ttl' => $ttl === null || $ttl === '' ? null : (int) $ttl,
        ];
    }
}
