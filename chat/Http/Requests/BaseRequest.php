<?php

declare(strict_types=1);

namespace Chat\Http\Requests;

use InvalidArgumentException;

abstract class BaseRequest
{
    /** @var array<string, mixed> */
    protected array $input;

    public function __construct(array $input)
    {
        $this->input = $input;
        $this->validate();
    }

    /**
     * Trigger custom validation logic for the request.
     */
    abstract protected function rules(): array;

    private function validate(): void
    {
        $rules = $this->rules();
        foreach ($rules as $field => $validator) {
            $value = $this->input[$field] ?? null;
            $result = $validator($value);
            if ($result !== true) {
                $message = is_string($result) ? $result : sprintf('Invalid value for %s', $field);
                throw new InvalidArgumentException($message);
            }
        }
    }
}
