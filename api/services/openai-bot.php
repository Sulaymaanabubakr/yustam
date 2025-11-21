<?php
declare(strict_types=1);

function yustam_bot_runtime_dir(): string
{
    static $dir = null;
    if ($dir !== null) {
        return $dir;
    }
    $base = sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'yustam_bot';
    if (!is_dir($base)) {
        @mkdir($base, 0775, true);
    }
    return $dir = $base;
}

function yustam_bot_storage_file(string $prefix, string $key): string
{
    $safeKey = preg_replace('/[^a-z0-9\-]+/i', '-', $key);
    return yustam_bot_runtime_dir() . DIRECTORY_SEPARATOR . $prefix . '-' . $safeKey . '.json';
}

function yustam_bot_cache_key(string $query, array $options = []): string
{
    $normalized = strtolower(trim($query));
    ksort($options);
    return sha1($normalized . '|' . json_encode($options));
}

function yustam_bot_cache_get(string $cacheKey): ?array
{
    $ttl = (int) yustam_api_env('BOT_CACHE_TTL', '300');
    if ($ttl <= 0) {
        return null;
    }
    $path = yustam_bot_storage_file('cache', $cacheKey);
    if (!is_file($path)) {
        return null;
    }
    $contents = file_get_contents($path);
    if ($contents === false) {
        return null;
    }
    $payload = json_decode($contents, true);
    if (!is_array($payload)) {
        @unlink($path);
        return null;
    }
    $expiresAt = (int) ($payload['expiresAt'] ?? 0);
    if ($expiresAt < time()) {
        @unlink($path);
        return null;
    }
    $data = $payload['data'] ?? null;
    return is_array($data) ? $data : null;
}

function yustam_bot_cache_set(string $cacheKey, array $data, ?int $ttl = null): void
{
    $ttl = $ttl !== null ? $ttl : (int) yustam_api_env('BOT_CACHE_TTL', '300');
    if ($ttl <= 0) {
        return;
    }
    $expiresAt = time() + $ttl;
    $payload = json_encode([
        'expiresAt' => $expiresAt,
        'data' => $data,
    ]);
    $path = yustam_bot_storage_file('cache', $cacheKey);
    file_put_contents($path, $payload === false ? '{}' : $payload, LOCK_EX);
}

function yustam_bot_rate_limit_key(array $user, array $context = []): string
{
    $identifier = $user['id'] ?? ($user['email'] ?? null);
    if (!$identifier) {
        $identifier = $_SERVER['REMOTE_ADDR'] ?? 'guest';
    }
    $mode = strtolower($context['mode'] ?? 'global');
    return sha1(strtolower((string) $identifier) . '|' . $mode);
}

function yustam_bot_rate_limit_check(array $user, array $context = []): void
{
    $limitPerWindow = max(1, (int) yustam_api_env('BOT_RATE_LIMIT', '8'));
    $windowSeconds = max(30, (int) yustam_api_env('BOT_RATE_LIMIT_WINDOW', '60'));
    $cacheKey = yustam_bot_rate_limit_key($user, $context);
    $path = yustam_bot_storage_file('ratelimit', $cacheKey);

    $now = time();
    $entries = [];

    if (is_file($path)) {
        $contents = file_get_contents($path);
        if ($contents !== false) {
            $decoded = json_decode($contents, true);
            if (is_array($decoded) && isset($decoded['events']) && is_array($decoded['events'])) {
                foreach ($decoded['events'] as $timestamp) {
                    $ts = (int) $timestamp;
                    if (($now - $ts) < $windowSeconds) {
                        $entries[] = $ts;
                    }
                }
            }
        }
    }

    if (count($entries) >= $limitPerWindow) {
        $earliest = $entries[0];
        $retryAfter = max(1, $windowSeconds - ($now - $earliest));
        yustam_api_error(429, 'AI request limit reached. Please try again shortly.', [
            'retryAfter' => $retryAfter,
        ]);
    }

    $entries[] = $now;
    $payload = json_encode([
        'events' => $entries,
    ]);
    file_put_contents($path, $payload === false ? '{}' : $payload, LOCK_EX);
}

function yustam_bot_is_openai_configured(): bool
{
    $key = yustam_api_env('OPENAI_API_KEY');
    return $key !== null && $key !== '';
}

function yustam_bot_select_model(): string
{
    $model = trim((string) yustam_api_env('OPENAI_MODEL', 'gpt-4o-mini'));
    return $model !== '' ? $model : 'gpt-4o-mini';
}

function yustam_bot_build_system_prompt(array $context = []): string
{
    $role = strtolower((string) ($context['role'] ?? 'buyer'));
    $mode = strtolower((string) ($context['mode'] ?? 'global'));
    $location = $context['location'] ?? [];
    $locationString = '';
    if (!empty($location['city']) || !empty($location['state'])) {
        $locationString = trim(($location['city'] ?? '') . ' ' . ($location['state'] ?? ''));
    }

    $modeNote = $mode === 'local'
        ? 'Prioritise local results and mention that listings are nearby when applicable.'
        : 'You can reference the broader marketplace and highlight best value matches.';

    $persona = $role === 'vendor'
        ? 'You are YustaAI assisting a verified Yustam vendor. Explain opportunities to earn and redeem vendor points when relevant.'
        : 'You are YustaAI helping a buyer discover the best listings and safe sellers on Yustam Marketplace.';

    $locationHint = $locationString !== ''
        ? 'The user is browsing from ' . $locationString . '. Factor this into your reasoning when relevant.'
        : 'If no location is provided, infer it from the conversation or fall back to popular nationwide picks.';

    return implode(' ', [
        'You are YustaAI, the personal shopping assistant embedded inside the Yustam mobile app.',
        'Interpret the user request, infer filters (category, price min/max, location preferences, condition, brand) and return JSON output.',
        'Always respond using the provided JSON schema. Do not include additional commentary outside JSON.',
        $persona,
        $modeNote,
        $locationHint,
        'Suggest up to three short bullet tips in the `response_summary` field that we can show alongside matching listings.',
        'If the request is vague, propose clarifying questions in `follow_up_questions`. Keep suggestions concise.',
    ]);
}

function yustam_bot_call_openai(string $query, array $context = []): array
{
    if (!yustam_bot_is_openai_configured()) {
        return [
            'success' => false,
            'error' => 'not_configured',
            'message' => 'OpenAI credentials are missing.',
        ];
    }

    $apiKey = yustam_api_env('OPENAI_API_KEY');
    $model = yustam_bot_select_model();

    $schema = [
        'type' => 'object',
        'properties' => [
            'intent' => [
                'type' => 'string',
                'description' => 'High-level description of what the user wants.',
            ],
            'filters' => [
                'type' => 'object',
                'properties' => [
                    'keywords' => [
                        'type' => 'array',
                        'items' => ['type' => 'string'],
                        'description' => 'Primary keywords to search for.',
                    ],
                    'category' => ['type' => 'string'],
                    'subcategory' => ['type' => 'string'],
                    'min_price' => ['type' => 'number'],
                    'max_price' => ['type' => 'number'],
                    'state' => ['type' => 'string'],
                    'city' => ['type' => 'string'],
                    'condition' => ['type' => 'string'],
                    'brand' => ['type' => 'string'],
                    'attributes' => [
                        'type' => 'object',
                        'additionalProperties' => [
                            'type' => ['string', 'number', 'boolean'],
                        ],
                    ],
                ],
            ],
            'response_summary' => [
                'type' => 'array',
                'items' => ['type' => 'string'],
                'description' => 'Tips or talking points for the UI.',
            ],
            'follow_up_questions' => [
                'type' => 'array',
                'items' => ['type' => 'string'],
            ],
        ],
        'required' => ['intent', 'filters', 'response_summary'],
        'additionalProperties' => false,
    ];

    $payload = [
        'model' => $model,
        'temperature' => 0.4,
        'max_tokens' => 400,
        'response_format' => [
            'type' => 'json_schema',
            'json_schema' => [
                'name' => 'yustam_bot_response',
                'schema' => $schema,
            ],
        ],
        'messages' => [
            [
                'role' => 'system',
                'content' => yustam_bot_build_system_prompt($context),
            ],
            [
                'role' => 'user',
                'content' => $query,
            ],
        ],
    ];

    $ch = curl_init('https://api.openai.com/v1/chat/completions');
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json',
        'Authorization: Bearer ' . $apiKey,
    ]);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 20);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));

    $responseBody = curl_exec($ch);
    $curlError = curl_error($ch);
    $statusCode = curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    curl_close($ch);

    if ($responseBody === false) {
        return [
            'success' => false,
            'error' => 'network_error',
            'message' => $curlError ?: 'Unable to reach OpenAI API.',
        ];
    }

    $decoded = json_decode($responseBody, true);
    if (!is_array($decoded)) {
        return [
            'success' => false,
            'error' => 'invalid_response',
            'message' => 'Unexpected response from OpenAI.',
            'statusCode' => $statusCode,
        ];
    }

    $content = $decoded['choices'][0]['message']['content'] ?? '';
    $parsed = is_string($content) ? json_decode($content, true) : null;
    if (!is_array($parsed)) {
        return [
            'success' => false,
            'error' => 'parse_error',
            'message' => 'Unable to parse AI response.',
            'statusCode' => $statusCode,
            'raw' => $decoded,
        ];
    }

    return [
        'success' => true,
        'model' => $model,
        'intent' => $parsed['intent'] ?? null,
        'filters' => is_array($parsed['filters'] ?? null) ? $parsed['filters'] : [],
        'summary' => is_array($parsed['response_summary'] ?? null) ? $parsed['response_summary'] : [],
        'followUps' => is_array($parsed['follow_up_questions'] ?? null) ? $parsed['follow_up_questions'] : [],
        'raw' => $parsed,
    ];
}

function yustam_bot_resolve_location(array $user, array $payload = []): array
{
    $location = [
        'state' => null,
        'city' => null,
    ];

    if (!empty($payload['location']) && is_array($payload['location'])) {
        $location['state'] = isset($payload['location']['state']) ? trim((string) $payload['location']['state']) : null;
        $location['city'] = isset($payload['location']['city']) ? trim((string) $payload['location']['city']) : null;
        if ($location['state'] || $location['city']) {
            return $location;
        }
    }

    if (!empty($payload['state'])) {
        $location['state'] = trim((string) $payload['state']);
    }
    if (!empty($payload['city'])) {
        $location['city'] = trim((string) $payload['city']);
    }
    if ($location['state'] || $location['city']) {
        return $location;
    }

    if (($user['role'] ?? '') === 'vendor' && !empty($user['vendorId'])) {
        $db = get_db_connection();
        $vendor = yustam_vendor_find_by_id((int) $user['vendorId'], $db);
        if ($vendor) {
            $vendorState = trim((string) ($vendor['state'] ?? ''));
            $vendorCity = trim((string) ($vendor['city'] ?? ''));
            if ($vendorState !== '') {
                $location['state'] = $vendorState;
            }
            if ($vendorCity !== '') {
                $location['city'] = $vendorCity;
            }
            if ($location['state'] || $location['city']) {
                return $location;
            }
        }
    }

    if (($user['role'] ?? '') === 'buyer' && !empty($user['buyerId'])) {
        try {
            $buyer = yustam_buyers_find((int) $user['buyerId']);
            if ($buyer) {
                $state = trim((string) ($buyer['state'] ?? ''));
                $city = trim((string) ($buyer['city'] ?? ''));
                if ($state !== '') {
                    $location['state'] = $state;
                }
                if ($city !== '') {
                    $location['city'] = $city;
                }
            }
        } catch (Throwable $e) {
            // Ignore lookup failure, fallback to defaults later.
        }
    }

    return $location;
}

function yustam_bot_normalise_filters(array $filters, array $location, string $mode): array
{
    $normalized = [
        'keywords' => [],
        'category' => null,
        'subcategory' => null,
        'minPrice' => null,
        'maxPrice' => null,
        'state' => null,
        'city' => null,
        'brand' => null,
        'condition' => null,
        'mode' => $mode,
    ];

    $keywords = $filters['keywords'] ?? null;
    if (is_string($keywords) && $keywords !== '') {
        $normalized['keywords'] = array_filter(array_map('trim', explode(',', strtolower($keywords))));
    } elseif (is_array($keywords)) {
        $normalized['keywords'] = array_values(array_filter(array_map(static function ($entry) {
            return is_string($entry) ? strtolower(trim($entry)) : '';
        }, $keywords)));
    }

    $map = [
        'category' => 'category',
        'subcategory' => 'subcategory',
        'brand' => 'brand',
        'condition' => 'condition',
    ];
    foreach ($map as $source => $target) {
        if (!empty($filters[$source]) && is_string($filters[$source])) {
            $normalized[$target] = trim($filters[$source]);
        }
    }

    if (isset($filters['min_price']) && is_numeric($filters['min_price'])) {
        $normalized['minPrice'] = max(0, (float) $filters['min_price']);
    }
    if (isset($filters['max_price']) && is_numeric($filters['max_price'])) {
        $normalized['maxPrice'] = max(0, (float) $filters['max_price']);
    }

    if ($mode === 'local') {
        if (!empty($filters['state'])) {
            $normalized['state'] = trim((string) $filters['state']);
        }
        if (!empty($filters['city'])) {
            $normalized['city'] = trim((string) $filters['city']);
        }
        if (!$normalized['state'] && !empty($location['state'])) {
            $normalized['state'] = $location['state'];
        }
        if (!$normalized['city'] && !empty($location['city'])) {
            $normalized['city'] = $location['city'];
        }
    }

    return $normalized;
}

function yustam_bot_build_listing_filters(array $normalizedFilters): array
{
    $options = [
        'limit' => 20,
    ];

    if (!empty($normalizedFilters['keywords'])) {
        $options['search'] = implode(' ', $normalizedFilters['keywords']);
    }
    if (!empty($normalizedFilters['category'])) {
        $options['category'] = $normalizedFilters['category'];
    }
    if (!empty($normalizedFilters['subcategory'])) {
        $options['subcategory'] = $normalizedFilters['subcategory'];
    }
    if ($normalizedFilters['minPrice'] !== null) {
        $options['minPrice'] = $normalizedFilters['minPrice'];
    }
    if ($normalizedFilters['maxPrice'] !== null) {
        $options['maxPrice'] = $normalizedFilters['maxPrice'];
    }
    if (!empty($normalizedFilters['state'])) {
        $options['locationState'] = $normalizedFilters['state'];
    }
    if (!empty($normalizedFilters['city'])) {
        $options['locationCity'] = $normalizedFilters['city'];
    }

    return $options;
}

function yustam_bot_fallback_filters(string $query, string $mode, array $location): array
{
    $options = [
        'limit' => 20,
        'search' => $query,
    ];
    if ($mode === 'local') {
        if (!empty($location['state'])) {
            $options['locationState'] = $location['state'];
        }
        if (!empty($location['city'])) {
            $options['locationCity'] = $location['city'];
        }
    }
    return $options;
}

function yustam_bot_format_summary(array $summary, array $listings): array
{
    $lines = [];
    foreach ($summary as $line) {
        if (is_string($line)) {
            $trimmed = trim($line);
            if ($trimmed !== '') {
                $lines[] = $trimmed;
            }
        }
    }
    if (!$lines && $listings) {
        $lines[] = 'Here are the closest matches we found right now.';
    }
    return array_slice($lines, 0, 5);
}

function yustam_bot_create_meta_response(
    string $query,
    string $mode,
    array $location,
    array $aiPayload,
    array $listings,
    array $pagination,
    bool $usedFallback,
    bool $fromCache
): array {
    return [
        'success' => true,
        'query' => [
            'text' => $query,
            'mode' => $mode,
            'location' => array_filter($location),
        ],
        'ai' => [
            'configured' => yustam_bot_is_openai_configured(),
            'model' => $aiPayload['model'] ?? null,
            'intent' => $aiPayload['intent'] ?? null,
            'filters' => $aiPayload['filters'] ?? [],
            'summary' => yustam_bot_format_summary($aiPayload['summary'] ?? [], $listings),
            'followUps' => $aiPayload['followUps'] ?? [],
            'cached' => $fromCache,
        ],
        'listings' => [
            'items' => $listings,
            'pagination' => $pagination,
        ],
        'fallbackUsed' => $usedFallback,
        'timestamp' => time(),
    ];
}