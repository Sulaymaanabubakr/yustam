<?php

declare(strict_types=1);

use Chat\Support\StructuredLogger;

// Basic PSR-4 style autoloader for the chat module. This keeps the rebuild
// self-contained without requiring Composer at runtime.
spl_autoload_register(static function (string $class): void {
    $prefix = 'Chat\\';
    $baseDir = __DIR__ . DIRECTORY_SEPARATOR;

    if (strncmp($prefix, $class, strlen($prefix)) !== 0) {
        return;
    }

    $relativeClass = substr($class, strlen($prefix));
    $path = $baseDir . str_replace('\\', DIRECTORY_SEPARATOR, $relativeClass) . '.php';

    if (is_file($path)) {
        require_once $path;
    }
});

// Provide a single place to configure error handling for the chat service.
if (!defined('CHAT_DEBUG')) {
    define('CHAT_DEBUG', (bool) getenv('CHAT_DEBUG') || false);
}

set_error_handler(static function (int $severity, string $message, string $file, int $line): bool {
    if (!(error_reporting() & $severity)) {
        return false;
    }

    throw new ErrorException($message, 0, $severity, $file, $line);
});

set_exception_handler(static function (Throwable $error): void {
    $payload = [
        'success' => false,
        'error' => 'internal_error',
        'message' => CHAT_DEBUG ? $error->getMessage() : 'Internal server error.',
    ];

    if (CHAT_DEBUG) {
        $payload['trace'] = $error->getTrace();
    }

    StructuredLogger::error('uncaught_exception', [
        'error' => $error,
        'file' => $error->getFile(),
        'line' => $error->getLine(),
        'sapi' => PHP_SAPI,
    ]);

    if (PHP_SAPI === 'cli') {
        $message = sprintf(
            "[chat] uncaught_exception at %s:%d -> %s\n",
            $error->getFile(),
            $error->getLine(),
            $error->getMessage()
        );
        fwrite(STDERR, $message);
        if (CHAT_DEBUG) {
            fwrite(STDERR, json_encode($payload, JSON_PRETTY_PRINT) . "\n");
        }
        return;
    }

    header('Content-Type: application/json', true, 500);
    echo json_encode($payload);
});

// Timezone guard to keep date math predictable.
date_default_timezone_set('UTC');
