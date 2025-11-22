<?php

declare(strict_types=1);

namespace Chat\Http\Requests;

use Chat\Support\Validators;

final class ThreadMarkReadRequest extends BaseRequest
{
    protected function rules(): array
    {
        return [
            'timestamp' => Validators::optionalPositiveNumber(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function payload(): array
    {
        $timestamp = $this->input['timestamp'] ?? null;
        if ($timestamp === '' || $timestamp === null) {
            return ['timestamp' => null];
        }

        return ['timestamp' => (int) $timestamp];
    }
}
