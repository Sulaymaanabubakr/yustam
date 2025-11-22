<?php

declare(strict_types=1);

namespace Chat\Http\Controllers;

use Chat\Http\Responses\JsonResponse;

abstract class Controller
{
    abstract public function handle(): JsonResponse;
}
