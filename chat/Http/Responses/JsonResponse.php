<?php

declare(strict_types=1);

namespace Chat\Http\Responses;

final class JsonResponse
{
    private array $payload;
    private int $status;

    private function __construct(array $payload, int $status)
    {
        $this->payload = $payload;
        $this->status = $status;
    }

    public static function success(array $data = [], int $status = 200): self
    {
        return new self(['success' => true] + $data, $status);
    }

    public static function error(string $code, string $message, int $status = 400, array $context = []): self
    {
        return new self([
            'success' => false,
            'error' => $code,
            'message' => $message,
            'context' => $context,
        ], $status);
    }

    public static function notFound(string $message = 'Not found'): self
    {
        return self::error('not_found', $message, 404);
    }

    public function send(): void
    {
        header('Content-Type: application/json', true, $this->status);
        echo json_encode($this->payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    }

    /**
     * @return array<string, mixed>
     */
    public function payload(): array
    {
        return $this->payload;
    }

    public function status(): int
    {
        return $this->status;
    }
}
