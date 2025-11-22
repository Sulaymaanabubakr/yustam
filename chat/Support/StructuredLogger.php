<?php

declare(strict_types=1);

namespace Chat\Support;

use JsonSerializable;
use Throwable;

final class StructuredLogger
{
    /** @var array<int, string> */
    private const LEVELS = [
        'debug',
        'info',
        'notice',
        'warning',
        'error',
        'critical',
        'alert',
        'emergency',
    ];

    public static function debug(string $event, array $context = []): void
    {
        self::log('debug', $event, $context);
    }

    public static function info(string $event, array $context = []): void
    {
        self::log('info', $event, $context);
    }

    public static function warning(string $event, array $context = []): void
    {
        self::log('warning', $event, $context);
    }

    public static function error(string $event, array $context = []): void
    {
        self::log('error', $event, $context);
    }

    public static function log(string $level, string $event, array $context = []): void
    {
        $level = strtolower($level);
        if (!in_array($level, self::LEVELS, true)) {
            $level = 'info';
        }

        $payload = [
            'ts' => date('c'),
            'channel' => 'chat',
            'level' => $level,
            'event' => $event,
        ];

        if ($context !== []) {
            $payload['context'] = self::normaliseContext($context);
        }

        $json = json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        if ($json === false) {
            $json = json_encode([
                'ts' => $payload['ts'],
                'channel' => 'chat',
                'level' => $level,
                'event' => $event,
                'context' => ['error' => 'context_encoding_failed'],
            ]);
        }

        error_log('[chat] ' . ($json ?: $event));
    }

    /**
     * @param array<string|int, mixed> $context
     * @return array<string, mixed>
     */
    private static function normaliseContext(array $context): array
    {
        $normalised = [];
        foreach ($context as $key => $value) {
            $normalised[(string) $key] = self::serialiseValue($value, 0);
        }
        return $normalised;
    }

    /**
     * @param mixed $value
     * @return mixed
     */
    private static function serialiseValue($value, int $depth)
    {
        if ($depth > 4) {
            return is_scalar($value) || $value === null ? $value : gettype($value);
        }

        if ($value === null || is_scalar($value)) {
            return $value;
        }

        if ($value instanceof Throwable) {
            return [
                'type' => get_class($value),
                'message' => $value->getMessage(),
                'code' => $value->getCode(),
            ];
        }

        if ($value instanceof JsonSerializable) {
            return $value->jsonSerialize();
        }

        if (is_array($value)) {
            $result = [];
            foreach ($value as $key => $item) {
                if (!is_int($key) && !is_string($key)) {
                    continue;
                }
                $result[(string) $key] = self::serialiseValue($item, $depth + 1);
            }
            return $result;
        }

        if (is_object($value) && method_exists($value, '__toString')) {
            return (string) $value;
        }

        if (is_object($value)) {
            return get_class($value);
        }

        if (is_resource($value)) {
            return sprintf('resource(%s)', get_resource_type($value) ?: 'unknown');
        }

        return (string) $value;
    }
}
