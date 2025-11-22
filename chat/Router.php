<?php

declare(strict_types=1);

namespace Chat;

use Chat\Http\Controllers\Controller;
use Chat\Http\Responses\JsonResponse;
use Throwable;

final class Router
{
    /** @var array<string, array<string, callable>> */
    private array $routes = [];

    public function register(string $method, string $path, callable $handler): void
    {
        $methodKey = strtoupper($method);
        $pathKey = '/' . trim($path, '/');
        $this->routes[$methodKey][$pathKey] = $handler;
    }

    public function dispatch(string $method, string $path): void
    {
        $methodKey = strtoupper($method);
        $pathKey = '/' . trim($path, '/');

        $handler = $this->routes[$methodKey][$pathKey] ?? null;
        if ($handler === null) {
            JsonResponse::notFound('Route not found.')->send();
            return;
        }

        try {
            $result = $handler();
            if ($result instanceof JsonResponse) {
                $result->send();
                return;
            }

            if ($result instanceof Controller) {
                $result->handle()->send();
                return;
            }

            JsonResponse::success($result ?? [])->send();
        } catch (Throwable $error) {
            JsonResponse::error('internal_error', $error->getMessage(), 500)->send();
        }
    }
}
