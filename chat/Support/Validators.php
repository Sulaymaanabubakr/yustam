<?php

declare(strict_types=1);

namespace Chat\Support;

final class Validators
{
    public static function requiredString(int $min = 1, int $max = 255): callable
    {
        return static function ($value) use ($min, $max) {
            if (!is_string($value)) {
                return 'Value must be a string';
            }
            $trimmed = trim($value);
            $length = strlen($trimmed);
            if ($length < $min) {
                return sprintf('Value must be at least %d characters', $min);
            }
            if ($length > $max) {
                return sprintf('Value must be at most %d characters', $max);
            }
            return true;
        };
    }

    public static function optionalString(int $max = 255): callable
    {
        return static function ($value) use ($max) {
            if ($value === null || $value === '') {
                return true;
            }
            if (!is_string($value)) {
                return 'Value must be a string';
            }
            if (strlen($value) > $max) {
                return sprintf('Value must be at most %d characters', $max);
            }
            return true;
        };
    }

    public static function boolean(): callable
    {
        return static function ($value) {
            if ($value === null) {
                return true;
            }
            return is_bool($value) ? true : 'Value must be a boolean';
        };
    }

    /**
     * Ensure the value (if present) is one of the allowed options.
     */
    public static function optionalEnum(array $allowed): callable
    {
        $normalised = array_map(static fn($item) => strtolower((string) $item), $allowed);

        return static function ($value) use ($normalised, $allowed) {
            if ($value === null || $value === '') {
                return true;
            }
            if (!is_string($value)) {
                return 'Value must be a string';
            }
            return in_array(strtolower($value), $normalised, true)
                ? true
                : sprintf('Value must be one of: %s', implode(', ', $allowed));
        };
    }

    public static function optionalUrl(int $maxLength = 2048): callable
    {
        return static function ($value) use ($maxLength) {
            if ($value === null || $value === '') {
                return true;
            }
            if (!is_string($value)) {
                return 'Value must be a string';
            }
            $trimmed = trim($value);
            if ($trimmed === '') {
                return true;
            }
            if (strlen($trimmed) > $maxLength) {
                return sprintf('URL must be at most %d characters', $maxLength);
            }
            return filter_var($trimmed, FILTER_VALIDATE_URL) ? true : 'Value must be a valid URL';
        };
    }

    public static function optionalPositiveNumber(): callable
    {
        return static function ($value) {
            if ($value === null || $value === '') {
                return true;
            }
            if (!is_numeric($value)) {
                return 'Value must be numeric';
            }
            return (float) $value >= 0 ? true : 'Value must be positive';
        };
    }
}
