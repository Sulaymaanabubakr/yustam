<?php

declare(strict_types=1);

namespace Chat\Support;

final class AttachmentMetadata
{
    /**
     * Decode arbitrary input into an array payload.
     *
     * @param mixed $input
     * @return array<string, mixed>
     */
    public static function decode($input): array
    {
        if (is_array($input)) {
            return $input;
        }

        if (is_string($input)) {
            $trimmed = trim($input);
            if ($trimmed !== '') {
                $decoded = json_decode($trimmed, true);
                if (is_array($decoded)) {
                    return $decoded;
                }
            }
        }

        return [];
    }

    /**
     * Normalise metadata keys/values and merge overrides.
     *
     * @param array<string|int, mixed> $base
     * @param array<string, mixed> $overrides
     * @return array<string, mixed>
     */
    public static function normalise(array $base = [], array $overrides = []): array
    {
        $meta = [];

        foreach ([$base, $overrides] as $dataset) {
            foreach ($dataset as $key => $value) {
                if (!is_string($key)) {
                    continue;
                }

                $normalisedKey = self::normaliseKey($key);
                if ($normalisedKey === null) {
                    continue;
                }

                $normalisedValue = self::normaliseValue($normalisedKey, $value);
                if ($normalisedValue === null) {
                    continue;
                }

                $meta[$normalisedKey] = $normalisedValue;
            }
        }

        if (isset($meta['width'], $meta['height']) && (int) $meta['height'] !== 0) {
            $meta['aspect_ratio'] = round((float) $meta['width'] / (float) $meta['height'], 4);
        }

        if (isset($meta['bytes']) && !isset($meta['size_bytes'])) {
            $meta['size_bytes'] = $meta['bytes'];
        } elseif (isset($meta['size_bytes']) && !isset($meta['bytes'])) {
            $meta['bytes'] = $meta['size_bytes'];
        }

        if (isset($meta['mime_type']) && !isset($meta['mime'])) {
            $meta['mime'] = $meta['mime_type'];
        }

        if (isset($meta['mime_type']) && !isset($meta['content_type'])) {
            $meta['content_type'] = $meta['mime_type'];
        }

        return $meta;
    }

    private static function normaliseKey(string $key): ?string
    {
        $key = strtolower(trim($key));
        $key = preg_replace('/[^a-z0-9]+/', '_', $key) ?? '';
        $key = trim($key, '_');

        return $key !== '' ? $key : null;
    }

    /**
     * @param mixed $value
     * @return bool|int|float|string|null
     */
    private static function normaliseValue(string $key, $value)
    {
        if ($value === null) {
            return null;
        }

        if (is_string($value)) {
            $value = trim($value);
            if ($value === '') {
                return null;
            }
        }

        $numericKeys = ['bytes', 'size_bytes', 'width', 'height', 'duration', 'bitrate'];
        if (in_array($key, $numericKeys, true)) {
            if (!is_numeric($value)) {
                return null;
            }

            return strpos((string) $value, '.') !== false
                ? (float) $value
                : (int) $value;
        }

        $booleanKeys = ['muted'];
        if (in_array($key, $booleanKeys, true)) {
            if (is_bool($value)) {
                return $value;
            }

            $valueLower = strtolower((string) $value);
            if (in_array($valueLower, ['1', 'true', 'yes'], true)) {
                return true;
            }
            if (in_array($valueLower, ['0', 'false', 'no'], true)) {
                return false;
            }

            return null;
        }

        if (is_scalar($value)) {
            return (string) $value;
        }

        return null;
    }
}
