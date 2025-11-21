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

function yustam_bot_env_flag(string $key, bool $default = true): bool
{
    $value = yustam_api_env($key);
    if ($value === null) {
        return $default;
    }
    $normalized = strtolower(trim($value));
    if ($normalized === '') {
        return $default;
    }
    return in_array($normalized, ['1', 'true', 'yes', 'on', 'enable', 'enabled'], true);
}

function yustam_bot_resolve_integration_key(string $key): string
{
    $normalized = strtolower(trim($key));
    if ($normalized === 'vendor-rewards' || $normalized === 'vendor_rewards' || $normalized === 'vendor') {
        return 'vendorRewards';
    }
    if ($normalized === 'wishlist' || $normalized === 'favorites' || $normalized === 'saved') {
        return 'wishlist';
    }
    return $normalized;
}

function yustam_bot_integration_catalog(): array
{
    static $catalog = null;
    if ($catalog !== null) {
        return $catalog;
    }

    $catalog = [
        'wishlist' => [
            'enabled' => yustam_bot_env_flag('BOT_WISHLIST_ENABLED', true),
            'roles' => ['buyer'],
            'notifications' => yustam_bot_env_flag('BOT_WISHLIST_NOTIFICATIONS', true),
        ],
        'vendorRewards' => [
            'enabled' => yustam_bot_env_flag('BOT_VENDOR_REWARDS_ENABLED', true),
            'roles' => ['vendor'],
            'notifications' => yustam_bot_env_flag('BOT_VENDOR_NOTIFICATIONS', true),
        ],
    ];

    return $catalog;
}

function yustam_bot_integration_file(array $user, string $integration): string
{
    $userRef = strtolower((string) ($user['id'] ?? 'anonymous'));
    $safeUser = preg_replace('/[^a-z0-9]+/i', '-', $userRef);
    if ($safeUser === '') {
        $safeUser = sha1($userRef ?: uniqid('', true));
    }
    $prefix = 'integration-' . strtolower($integration);
    return yustam_bot_storage_file($prefix, $safeUser);
}

function yustam_bot_read_integration_snapshot(array $user, string $integration): ?array
{
    $path = yustam_bot_integration_file($user, $integration);
    if (!is_file($path)) {
        return null;
    }
    $contents = file_get_contents($path);
    if ($contents === false) {
        return null;
    }
    $decoded = json_decode($contents, true);
    return is_array($decoded) ? $decoded : null;
}

function yustam_bot_normalise_followups($followUps, int $limit = 5): array
{
    if (!is_array($followUps)) {
        return [];
    }
    $items = [];
    foreach ($followUps as $item) {
        if (!is_string($item)) {
            continue;
        }
        $line = trim($item);
        if ($line === '') {
            continue;
        }
        if (!in_array($line, $items, true)) {
            $items[] = $line;
        }
        if (count($items) >= $limit) {
            break;
        }
    }
    return $items;
}

function yustam_bot_compact_listings($listings, int $limit = 3): array
{
    if (!is_array($listings)) {
        return [];
    }
    $result = [];
    foreach ($listings as $entry) {
        if (!is_array($entry)) {
            continue;
        }
        $result[] = [
            'id' => isset($entry['id']) ? (string) $entry['id'] : null,
            'title' => isset($entry['title']) ? trim((string) $entry['title']) : null,
            'price' => isset($entry['price']) ? (float) $entry['price'] : null,
            'state' => $entry['state'] ?? null,
            'city' => $entry['city'] ?? null,
            'primaryImage' => $entry['primaryImage'] ?? ($entry['image'] ?? null),
            'vendor' => isset($entry['vendor']) && is_array($entry['vendor'])
                ? array_filter([
                    'id' => $entry['vendor']['id'] ?? null,
                    'displayName' => $entry['vendor']['displayName'] ?? ($entry['vendor']['business_name'] ?? null),
                ])
                : null,
        ];
        if (count($result) >= $limit) {
            break;
        }
    }
    return $result;
}

function yustam_bot_store_integration_snapshot(array $user, string $integration, array $payload, ?bool &$changed = null): array
{
    $integrationKey = yustam_bot_resolve_integration_key($integration);
    $existing = yustam_bot_read_integration_snapshot($user, $integrationKey);

    $entryId = isset($payload['entryId']) ? (string) $payload['entryId'] : '';
    $summary = yustam_bot_format_summary($payload['summary'] ?? [], $payload['listings'] ?? []);
    $followUps = yustam_bot_normalise_followups($payload['followUps'] ?? []);
    $listings = yustam_bot_compact_listings($payload['listings'] ?? []);
    $syncedAt = isset($payload['timestamp']) && is_numeric($payload['timestamp'])
        ? (int) $payload['timestamp']
        : time();

    $record = [
        'userRef' => $user['id'] ?? null,
        'integration' => $integrationKey,
        'entryId' => $entryId,
        'query' => isset($payload['query']) ? (string) $payload['query'] : '',
        'intent' => $payload['intent'] ?? null,
        'summary' => $summary,
        'followUps' => $followUps,
        'listings' => $listings,
        'mode' => isset($payload['mode']) ? (string) $payload['mode'] : null,
        'location' => isset($payload['location']) && is_array($payload['location']) ? array_filter($payload['location']) : [],
        'model' => $payload['model'] ?? null,
        'syncedAt' => $syncedAt,
        'meta' => [
            'summary' => $summary,
            'followUps' => $followUps,
            'intent' => $payload['intent'] ?? null,
            'mode' => isset($payload['mode']) ? (string) $payload['mode'] : null,
            'location' => isset($payload['location']) && is_array($payload['location']) ? array_filter($payload['location']) : [],
            'listings' => $listings,
            'entryId' => $entryId,
            'syncedAt' => $syncedAt,
        ],
    ];

    $isChanged = true;
    if ($existing) {
        $comparableFields = ['entryId', 'intent', 'summary', 'followUps', 'listings'];
        $isChanged = false;
        foreach ($comparableFields as $field) {
            if (($existing[$field] ?? null) !== ($record[$field] ?? null)) {
                $isChanged = true;
                break;
            }
        }
        if (!$isChanged) {
            // Preserve latest timestamp for freshness even if content unchanged.
            if (($existing['syncedAt'] ?? null) !== $record['syncedAt']) {
                $existing['syncedAt'] = $record['syncedAt'];
                $existing['meta']['syncedAt'] = $record['syncedAt'];
                $record = $existing;
            } else {
                $record = $existing;
            }
        }
    }

    $path = yustam_bot_integration_file($user, $integrationKey);
    file_put_contents($path, json_encode($record, YUSTAM_API_JSON_FLAGS), LOCK_EX);

    if ($changed !== null) {
        $changed = $isChanged;
    }

    return $record;
}

function yustam_bot_integration_state(array $user, string $integration, ?array $snapshot = null): array
{
    $integrationKey = yustam_bot_resolve_integration_key($integration);
    $catalog = yustam_bot_integration_catalog();
    $config = $catalog[$integrationKey] ?? ['enabled' => false, 'roles' => []];
    $enabled = (bool) ($config['enabled'] ?? false);
    $roles = $config['roles'] ?? [];
    $allowRole = !$roles || in_array($user['role'] ?? '', $roles, true);
    $ready = $enabled && $allowRole;

    if ($snapshot === null && $enabled) {
        $snapshot = yustam_bot_read_integration_snapshot($user, $integrationKey);
    }

    return [
        'enabled' => $enabled,
        'ready' => $ready,
        'lastSynced' => $snapshot['syncedAt'] ?? null,
        'meta' => $snapshot['meta'] ?? null,
        'error' => '',
    ];
}

function yustam_bot_emit_wishlist_notification(array $user, array $snapshot): void
{
    if (($user['role'] ?? '') !== 'buyer') {
        return;
    }
    yustam_api_ensure_notifications_table();
    $db = get_db_connection();
    $title = 'New wishlist matches ready';
    $summary = $snapshot['summary'][0] ?? $snapshot['meta']['summary'][0] ?? null;
    $body = $summary ?: 'We found fresh picks that match your wishlist preferences.';
    $data = [
        'integration' => 'wishlist',
        'entryId' => $snapshot['entryId'] ?? null,
        'intent' => $snapshot['intent'] ?? null,
        'listings' => $snapshot['listings'] ?? [],
        'syncedAt' => $snapshot['syncedAt'] ?? time(),
        'route' => [
            'name' => 'BuyerSaved',
            'params' => [],
        ],
    ];

    $stmt = $db->prepare('INSERT INTO `app_notifications` (user_ref, title, body, type, data) VALUES (?, ?, ?, ?, ?)');
    if ($stmt instanceof mysqli_stmt) {
        $type = 'wishlist';
        $payload = json_encode($data, YUSTAM_API_JSON_FLAGS);
        $stmt->bind_param('sssss', $user['id'], $title, $body, $type, $payload);
        $stmt->execute();
        $stmt->close();
    }
}

function yustam_bot_emit_vendor_rewards_notification(array $user, array $snapshot): void
{
    if (($user['role'] ?? '') !== 'vendor' || empty($user['vendorId'])) {
        return;
    }
    $db = get_db_connection();
    $title = 'YustaAI reward ideas updated';
    $primary = $snapshot['summary'][0] ?? $snapshot['meta']['summary'][0] ?? null;
    $message = $primary ?: 'Open your dashboard to review fresh ways to delight loyal buyers.';
    $detail = json_encode([
        'integration' => 'vendorRewards',
        'intent' => $snapshot['intent'] ?? null,
        'followUps' => $snapshot['followUps'] ?? [],
        'syncedAt' => $snapshot['syncedAt'] ?? time(),
    ], YUSTAM_API_JSON_FLAGS);

    yustam_vendor_notifications_insert(
        $db,
        (int) $user['vendorId'],
        $title,
        $message,
        $detail,
        'sparkles'
    );
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