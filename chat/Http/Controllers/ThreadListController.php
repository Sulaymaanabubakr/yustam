<?php

declare(strict_types=1);

namespace Chat\Http\Controllers;

use Chat\Domain\Services\ThreadService;
use Chat\Http\Responses\JsonResponse;

final class ThreadListController extends Controller
{
    private ThreadService $threads;
    private string $role;
    private string $uid;

    public function __construct(ThreadService $threads, string $role, string $uid)
    {
        $this->threads = $threads;
        $this->role = $role;
        $this->uid = $uid;
    }

    public function handle(): JsonResponse
    {
        $items = $this->threads->listForUser($this->role, $this->uid);

        return JsonResponse::success([
            'threads' => array_map(static fn($thread) => $thread->toArray(), $items),
        ]);
    }
}
