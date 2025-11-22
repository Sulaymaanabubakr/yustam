<?php
declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';

yustam_api_headers();

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    yustam_api_json_response(['success' => true]);
    return;
}

try {
    $result = yustam_api_dispatch();
    if ($result === null) {
        $result = ['success' => true];
    }
    yustam_api_json_response($result);
} catch (YustamApiException $apiError) {
    $payload = ['success' => false, 'message' => $apiError->getMessage()] + $apiError->context;
    yustam_api_json_response($payload, $apiError->statusCode);
} catch (Throwable $unexpected) {
    error_log('API error: ' . $unexpected->getMessage());
    yustam_api_json_response(['success' => false, 'message' => 'Internal server error.'], 500);
}

function yustam_api_dispatch(): array
{
    $method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
    $uriPath = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?? '/';
    $path = preg_replace('#^/api#i', '', $uriPath);
    $segments = array_values(array_filter(explode('/', trim((string) $path, '/'))));
    $resource = strtolower($segments[0] ?? '');
    $subSegments = array_slice($segments, 1);

    if ($resource === '' || $resource === 'index.php') {
        return [
            'success' => true,
            'message' => 'Yustam API is online.',
        ];
    }

    switch ($resource) {
        case 'auth':
            return yustam_api_handle_auth($method, $subSegments);
        case 'home':
            return yustam_api_handle_home();
        case 'categories':
            return yustam_api_handle_categories();
        case 'products':
            return yustam_api_handle_products($method, $subSegments);
        case 'vendor':
            return yustam_api_handle_vendor($method, $subSegments);
        case 'plans':
            return yustam_api_handle_plans($method, $subSegments);
        case 'favorites':
            return yustam_api_handle_favorites($method, $subSegments);
        case 'notifications':
            return yustam_api_handle_notifications($method, $subSegments);
        case 'support':
            return yustam_api_handle_support($method, $subSegments);
        case 'media':
            return yustam_api_handle_media($method, $subSegments);
        case 'verification':
            return yustam_api_handle_verification($method, $subSegments);
        case 'chats':
            return yustam_api_handle_chats($method, $subSegments);
        case 'admin':
            return yustam_api_handle_admin($method, $subSegments);
        case 'reviews':
            return yustam_api_handle_reviews($method, $subSegments);
        case 'subscription':
            return yustam_api_handle_subscription($method, $subSegments);
        case 'paystack':
            return yustam_api_handle_paystack($method, $subSegments);
        case 'bot':
            return yustam_api_handle_bot($method, $subSegments);
        default:
            yustam_api_error(404, 'Endpoint not found.');
    }
}

function yustam_api_handle_auth(string $method, array $segments): array
{
    $action = strtolower($segments[0] ?? '');

    if ($action === 'register' && $method === 'POST') {
        return yustam_api_auth_register();
    }
    if ($action === 'session' && $method === 'POST') {
        return yustam_api_auth_session();
    }
    if ($action === 'me') {
        if ($method === 'GET') {
            $user = yustam_api_require_auth();
            return ['success' => true, 'user' => $user];
        }
        if ($method === 'PATCH') {
            return yustam_api_auth_update_profile();
        }
    }
    if ($action === '' && $method === 'GET') {
        $admin = yustam_api_require_auth('admin');
        return yustam_api_auth_list_users($admin);
    }

    yustam_api_error(404, 'Auth endpoint not found.');
}

function yustam_api_handle_home(): array
{
    return ['success' => true, 'data' => yustam_api_build_home_feed()];
}

function yustam_api_handle_categories(): array
{
    return ['success' => true, 'categories' => yustam_api_category_list()];
}

function yustam_api_handle_products(string $method, array $segments): array
{
    if ($method === 'GET' && empty($segments)) {
        return yustam_api_products_list();
    }
    if ($method === 'POST' && empty($segments)) {
        return yustam_api_products_create();
    }
    $productId = $segments[0] ?? '';
    if ($productId === '') {
        yustam_api_error(404, 'Product ID missing.');
    }
    if ($method === 'GET') {
        return yustam_api_products_get($productId);
    }
    if ($method === 'PATCH') {
        return yustam_api_products_update($productId);
    }
    if ($method === 'DELETE') {
        return yustam_api_products_delete($productId);
    }
    yustam_api_error(405, 'Method not allowed for products.');
}

function yustam_api_handle_vendor(string $method, array $segments): array
{
    $action = strtolower($segments[0] ?? '');
    if ($action === 'register' && $method === 'POST') {
        return yustam_api_vendor_register();
    }
    if ($action === 'resend-verification' && $method === 'POST') {
        return yustam_api_vendor_resend_verification();
    }
    if ($action === 'verify') {
        return yustam_api_vendor_verify($method);
    }
    if ($action === 'activate' && $method === 'POST') {
        return yustam_api_vendor_activate();
    }
    if ($action === 'storefront' && $method === 'GET' && isset($segments[1])) {
        return yustam_api_vendor_storefront($segments[1]);
    }
    if ($action === 'me') {
        if ($method === 'GET' && empty($segments[1])) {
            return yustam_api_vendor_profile();
        }
        $subAction = strtolower($segments[1] ?? '');
        if ($subAction === '' && $method === 'PATCH') {
            return yustam_api_vendor_update_profile();
        }
        if ($subAction === 'dashboard' && $method === 'GET') {
            return yustam_api_vendor_dashboard();
        }
        if ($subAction === 'analytics' && $method === 'GET') {
            return yustam_api_vendor_analytics();
        }
        if ($subAction === '' && $method === 'DELETE') {
            return yustam_api_vendor_delete_account();
        }
    }
    if ($action === 'settings') {
        if ($method === 'GET') {
            return yustam_api_vendor_get_settings();
        }
        if (in_array($method, ['POST', 'PATCH'], true)) {
            return yustam_api_vendor_update_settings();
        }
    }
    if ($action === 'notifications' && empty($segments[1])) {
        if ($method === 'GET') {
            return yustam_api_vendor_notifications_list();
        }
        if ($method === 'POST') {
            return yustam_api_vendor_notifications_action();
        }
    }
    if ($action === 'points') {
        $subAction = strtolower($segments[1] ?? '');
        if ($method === 'GET' && ($subAction === '' || $subAction === 'summary')) {
            return yustam_api_vendor_points_summary();
        }
        if ($method === 'GET' && $subAction === 'ledger') {
            return yustam_api_vendor_points_ledger();
        }
        if ($method === 'POST' && $subAction === 'redeem') {
            return yustam_api_vendor_points_redeem();
        }
    }
    if ($action === 'password' && $method === 'POST') {
        return yustam_api_vendor_change_password();
    }
    if ($action === 'subscription' && strtolower($segments[1] ?? '') === 'refresh' && $method === 'POST') {
        return yustam_api_vendor_refresh_subscription();
    }
    yustam_api_error(404, 'Vendor endpoint not found.');
}

function yustam_api_handle_plans(string $method, array $segments): array
{
    if ($method === 'GET' && empty($segments)) {
        return ['success' => true, 'plans' => yustam_api_plan_catalog()];
    }
    if ($method === 'GET' && $segments[0] === 'subscriptions' && ($segments[1] ?? '') === 'me') {
        return yustam_api_plan_subscriptions();
    }
    if ($method === 'POST' && isset($segments[0], $segments[1]) && $segments[1] === 'subscribe') {
        return yustam_api_plan_subscribe($segments[0]);
    }
    if ($method === 'POST' && isset($segments[0], $segments[1]) && $segments[1] === 'checkout') {
        return yustam_api_plan_checkout($segments[0]);
    }
    if ($method === 'POST' && isset($segments[0]) && $segments[0] === 'auto-renew') {
        return yustam_api_plan_auto_renew();
    }
    if ($method === 'POST' && isset($segments[0]) && $segments[0] === 'cancel') {
        return yustam_api_plan_cancel();
    }
    if (
        ($method === 'POST' && empty($segments)) ||
        ($method === 'GET' && isset($segments[0]) && $segments[0] === 'callback')
    ) {
        return yustam_api_plan_callback();
    }
    yustam_api_error(404, 'Plans endpoint not found.');
}

function yustam_api_handle_favorites(string $method, array $segments): array
{
    if ($method === 'GET' && empty($segments)) {
        return yustam_api_favorites_list();
    }
    if ($method === 'POST' && empty($segments)) {
        return yustam_api_favorites_add();
    }
    if ($method === 'DELETE' && isset($segments[0])) {
        return yustam_api_favorites_remove($segments[0]);
    }
    yustam_api_error(405, 'Favorites endpoint not found.');
}

function yustam_api_handle_notifications(string $method, array $segments): array
{
    if ($method === 'GET') {
        return yustam_api_notifications_list();
    }
    $action = strtolower($segments[0] ?? '');
    if ($method === 'POST' && $action === 'read') {
        return yustam_api_notifications_mark_many();
    }
    if ($method === 'POST' && $action === 'read-all') {
        return yustam_api_notifications_mark_all();
    }
    if ($method === 'POST' && $action === '') {
        return yustam_api_notifications_create();
    }
    yustam_api_error(405, 'Notifications endpoint not found.');
}

function yustam_api_handle_bot(string $method, array $segments): array
{
    $action = strtolower($segments[0] ?? '');

    if ($method === 'POST' && $action === 'query') {
        return yustam_api_bot_query();
    }

    if ($method === 'GET' && ($action === 'status' || $action === '')) {
        return yustam_api_bot_status();
    }

    if ($action === 'integrations') {
        $integrationKey = yustam_bot_resolve_integration_key($segments[1] ?? '');

        if ($integrationKey === 'wishlist' && $method === 'POST') {
            return yustam_api_bot_sync_wishlist();
        }

        if ($integrationKey === 'vendorRewards' && $method === 'POST') {
            return yustam_api_bot_sync_vendor_rewards();
        }

        if ($method === 'GET') {
            $user = yustam_api_require_auth();
            if ($integrationKey === '') {
                $states = [];
                foreach (array_keys(yustam_bot_integration_catalog()) as $key) {
                    $states[$key] = yustam_bot_integration_state($user, $key);
                }
                return ['success' => true, 'integrations' => $states];
            }
            return [
                'success' => true,
                'integration' => yustam_bot_integration_state($user, $integrationKey),
            ];
        }
    }

    yustam_api_error(404, 'Bot endpoint not found.');
}

function yustam_api_handle_media(string $method, array $segments): array
{
    $action = strtolower($segments[0] ?? '');

    if ($method === 'POST' && $action === 'signature') {
        return yustam_api_media_signature();
    }

    if ($method === 'POST' && $action === 'watermark') {
        return yustam_api_media_watermark();
    }

    yustam_api_error(404, 'Media endpoint not found.');
}

function yustam_api_handle_support(string $method, array $segments): array
{
    if ($method === 'GET' && empty($segments)) {
        return yustam_api_support_list();
    }
    if ($method === 'POST' && empty($segments)) {
        return yustam_api_support_create();
    }
    $ticketId = $segments[0] ?? '';
    if ($ticketId === '') {
        yustam_api_error(404, 'Ticket not found.');
    }
    if ($method === 'GET') {
        return yustam_api_support_get($ticketId);
    }
    if ($method === 'POST' && isset($segments[1]) && $segments[1] === 'messages') {
        return yustam_api_support_add_message($ticketId);
    }
    yustam_api_error(405, 'Support endpoint not found.');
}

function yustam_api_media_signature(): array
{
    $user = yustam_api_require_auth();
    yustam_cloudinary_check_credentials();

    $payload = yustam_api_read_json_body();

    $resourceTypeRaw = strtolower(trim((string) ($payload['resourceType'] ?? 'image')));
    $resourceType = in_array($resourceTypeRaw, ['image', 'video', 'auto'], true) ? $resourceTypeRaw : 'image';

    $folder = yustam_cloudinary_sanitize_folder($payload['folder'] ?? '');
    if ($folder === '') {
        $baseFolder = $resourceType === 'video' ? 'yustam/videos' : 'yustam/images';
        $folderSuffix = ($user['role'] ?? '') === 'vendor' ? 'vendors' : 'users';
        $folder = $baseFolder . '/' . $folderSuffix;
    }

    $credentials = yustam_cloudinary_credentials();
    if (empty($credentials['uploadPreset'])) {
        yustam_api_error(500, 'Cloudinary upload preset is not configured.');
    }

    $publicIdInput = $payload['publicId'] ?? $payload['public_id'] ?? '';
    $publicId = yustam_cloudinary_sanitize_public_id($publicIdInput);
    if ($publicId === '') {
        $publicId = yustam_cloudinary_generate_public_id($user, $resourceType === 'video' ? 'video' : 'image');
    }

    $tags = [];
    if (!empty($payload['tags'])) {
        $rawTags = is_array($payload['tags']) ? $payload['tags'] : explode(',', (string) $payload['tags']);
        foreach ($rawTags as $tag) {
            $sanitised = preg_replace('/[^A-Za-z0-9_\-]/', '', trim((string) $tag)) ?? '';
            if ($sanitised !== '') {
                $tags[] = strtolower($sanitised);
            }
            if (count($tags) >= 10) {
                break;
            }
        }
    }

    $timestamp = time();
    $params = [
        'timestamp' => $timestamp,
        'upload_preset' => $credentials['uploadPreset'],
        'folder' => $folder,
        'overwrite' => 'true',
        'public_id' => $publicId,
    ];
    if ($tags) {
        $params['tags'] = implode(',', $tags);
    }

    $signature = yustam_cloudinary_sign($params);

    $fields = $params;
    $fields['signature'] = $signature;
    $fields['api_key'] = $credentials['apiKey'];

    $uploadResource = $resourceType;
    if ($uploadResource === 'auto') {
        $uploadResource = 'auto';
    } elseif ($uploadResource === 'video') {
        $uploadResource = 'video';
    } else {
        $uploadResource = 'image';
    }

    $stringFields = array_map(static function ($value) {
        return (string) $value;
    }, $fields);

    return [
        'success' => true,
        'signature' => [
            'uploadUrl' => sprintf(
                'https://api.cloudinary.com/v1_1/%s/%s/upload',
                rawurlencode((string) $credentials['cloudName']),
                $uploadResource
            ),
            'resourceType' => $uploadResource,
            'timestamp' => $timestamp,
            'expiresAt' => $timestamp + 600,
            'publicId' => $publicId,
            'folder' => $folder,
            'fields' => $stringFields,
        ],
    ];
}

function yustam_api_media_watermark(): array
{
    $user = yustam_api_require_auth();
    yustam_cloudinary_check_credentials();

    $payload = yustam_api_read_json_body();
    $publicId = trim((string) ($payload['publicId'] ?? $payload['public_id'] ?? ''));
    if ($publicId === '') {
        yustam_api_error(422, 'Cloudinary public ID is required.');
    }

    $resourceTypeRaw = strtolower(trim((string) ($payload['resourceType'] ?? 'image')));
    $resourceType = in_array($resourceTypeRaw, ['image', 'video'], true) ? $resourceTypeRaw : 'image';

    $vendorName = trim((string) ($payload['vendorName'] ?? ($user['displayName'] ?? 'Yustam Vendor')));
    if ($vendorName === '' && ($user['role'] ?? '') === 'vendor') {
        $vendorName = 'Marketplace Vendor';
    }

    $options = [];
    if (!empty($payload['format'])) {
        $options['format'] = preg_replace('/[^A-Za-z0-9]/', '', (string) $payload['format']) ?? null;
    }

    try {
        $watermarked = yustam_cloudinary_apply_watermark($publicId, $vendorName, $resourceType, $options);
    } catch (Throwable $error) {
        error_log('Cloudinary watermark failed: ' . $error->getMessage());
        yustam_api_error(500, 'Failed to apply watermark. Please try again.');
    }

    if (empty($watermarked['secure_url'])) {
        yustam_api_error(500, 'Watermarked asset url missing.');
    }

    return [
        'success' => true,
        'asset' => [
            'publicId' => $watermarked['public_id'],
            'secureUrl' => $watermarked['secure_url'],
            'resourceType' => $watermarked['resource_type'],
            'width' => $watermarked['width'],
            'height' => $watermarked['height'],
            'duration' => $watermarked['duration'],
            'transformation' => $watermarked['transformation'],
        ],
    ];
}

function yustam_api_handle_verification(string $method, array $segments): array
{
    if (empty($segments)) {
        if ($method === 'GET') {
            return yustam_api_verification_get_current();
        }
        if ($method === 'POST') {
            return yustam_api_verification_submit();
        }
    }
    if ($segments[0] === 'requests') {
        if ($method === 'GET') {
            return yustam_api_verification_list_requests();
        }
        if ($method === 'PATCH' && isset($segments[1])) {
            return yustam_api_verification_update_request($segments[1]);
        }
    }
    yustam_api_error(404, 'Verification endpoint not found.');
}

function yustam_api_bot_query(): array
{
    $user = yustam_api_require_auth();
    $payload = yustam_api_read_json_body();

    $query = trim((string) ($payload['query'] ?? ''));
    if ($query === '') {
        yustam_api_error(422, 'Please enter a query for the AI assistant.');
    }

    $modeRaw = strtolower(trim((string) ($payload['mode'] ?? 'global')));
    $mode = in_array($modeRaw, ['local', 'global'], true) ? $modeRaw : 'global';

    $location = yustam_bot_resolve_location($user, $payload);

    $cacheKey = yustam_bot_cache_key($query, [
        'mode' => $mode,
        'role' => $user['role'] ?? '',
        'state' => $location['state'] ?? '',
        'city' => $location['city'] ?? '',
    ]);

    $aiResult = yustam_bot_cache_get($cacheKey);
    $fromCache = is_array($aiResult);

    if (!$fromCache) {
        yustam_bot_rate_limit_check($user, ['mode' => $mode]);
        $aiResult = yustam_bot_call_openai($query, [
            'role' => $user['role'] ?? 'buyer',
            'mode' => $mode,
            'location' => $location,
            'user' => [
                'id' => $user['id'] ?? null,
                'role' => $user['role'] ?? null,
            ],
        ]);

        if (($aiResult['success'] ?? false) === true) {
            yustam_bot_cache_set($cacheKey, $aiResult);
        }
    }

    $usedFallback = false;
    $listingOptions = [];
    $aiPayload = [
        'model' => $aiResult['model'] ?? null,
        'intent' => $aiResult['intent'] ?? null,
        'filters' => [],
        'summary' => $aiResult['summary'] ?? [],
        'followUps' => $aiResult['followUps'] ?? [],
    ];

    if (($aiResult['success'] ?? false) === true) {
        $normalized = yustam_bot_normalise_filters($aiResult['filters'] ?? [], $location, $mode);
        $listingOptions = yustam_bot_build_listing_filters($normalized);
        if (!isset($listingOptions['search']) || trim((string) $listingOptions['search']) === '') {
            if (!empty($normalized['keywords'])) {
                $listingOptions['search'] = implode(' ', $normalized['keywords']);
            } else {
                $listingOptions['search'] = $query;
            }
        }
        if ($mode === 'local') {
            if (empty($listingOptions['locationState']) && !empty($location['state'])) {
                $listingOptions['locationState'] = $location['state'];
            }
            if (empty($listingOptions['locationCity']) && !empty($location['city'])) {
                $listingOptions['locationCity'] = $location['city'];
            }
        }
        $aiPayload['filters'] = $normalized;
    } else {
        $usedFallback = true;
        $listingOptions = yustam_bot_fallback_filters($query, $mode, $location);
        if (empty($aiPayload['summary'])) {
            $aiPayload['summary'] = ['Showing the closest matches based on current marketplace data.'];
        }
    }

    if (!isset($listingOptions['limit'])) {
        $listingOptions['limit'] = 20;
    }

    $listingsResult = yustam_api_fetch_listings($listingOptions);
    $listings = $listingsResult['items'] ?? [];
    $pagination = $listingsResult['pagination'] ?? [
        'page' => 1,
        'pageSize' => count($listings),
        'total' => count($listings),
        'totalPages' => 1,
    ];

    return yustam_bot_create_meta_response(
        $query,
        $mode,
        $location,
        $aiPayload,
        $listings,
        $pagination,
        $usedFallback,
        $fromCache
    );
}

function yustam_api_bot_status(): array
{
    $user = yustam_api_require_auth();
    $configured = yustam_bot_is_openai_configured();
    $model = $configured ? yustam_bot_select_model() : null;

    $integrations = [];
    foreach (array_keys(yustam_bot_integration_catalog()) as $key) {
        $integrations[$key] = yustam_bot_integration_state($user, $key);
    }

    return [
        'success' => true,
        'configured' => $configured,
        'model' => $model,
        'integrations' => $integrations,
    ];
}

function yustam_api_bot_sync_wishlist(): array
{
    $user = yustam_api_require_auth();
    $catalog = yustam_bot_integration_catalog();
    $config = $catalog['wishlist'] ?? ['enabled' => false, 'roles' => ['buyer']];

    if (empty($config['enabled'])) {
        yustam_api_error(501, 'Wishlist integration is disabled.');
    }
    if (($user['role'] ?? '') !== 'buyer') {
        yustam_api_error(403, 'Wishlist sync is only available for buyers.');
    }

    $payload = yustam_api_read_json_body();
    $entryId = isset($payload['entryId']) ? trim((string) $payload['entryId']) : '';
    if ($entryId === '') {
        yustam_api_error(422, 'entryId is required to sync wishlist insights.');
    }

    $changed = false;
    $snapshot = yustam_bot_store_integration_snapshot($user, 'wishlist', $payload, $changed);

    if ($changed && !empty($config['notifications'])) {
        yustam_bot_emit_wishlist_notification($user, $snapshot);
    }

    return [
        'success' => true,
        'integration' => yustam_bot_integration_state($user, 'wishlist', $snapshot),
    ];
}

function yustam_api_bot_sync_vendor_rewards(): array
{
    $user = yustam_api_require_auth();
    $catalog = yustam_bot_integration_catalog();
    $config = $catalog['vendorRewards'] ?? ['enabled' => false, 'roles' => ['vendor']];

    if (empty($config['enabled'])) {
        yustam_api_error(501, 'Vendor rewards integration is disabled.');
    }
    if (($user['role'] ?? '') !== 'vendor' || empty($user['vendorId'])) {
        yustam_api_error(403, 'Vendor rewards sync is only available for vendors.');
    }

    $payload = yustam_api_read_json_body();
    $entryId = isset($payload['entryId']) ? trim((string) $payload['entryId']) : '';
    if ($entryId === '') {
        yustam_api_error(422, 'entryId is required to sync vendor reward insights.');
    }

    $changed = false;
    $snapshot = yustam_bot_store_integration_snapshot($user, 'vendorRewards', $payload, $changed);

    $vendorId = (int) ($user['vendorId'] ?? 0);
    if ($vendorId > 0 && !empty($payload['rewards'])) {
        yustam_vendor_rewards_apply_snapshot($vendorId, (array) $payload['rewards'], $snapshot);
    }

    if ($changed && !empty($config['notifications'])) {
        yustam_bot_emit_vendor_rewards_notification($user, $snapshot);
    }

    return [
        'success' => true,
        'integration' => yustam_bot_integration_state($user, 'vendorRewards', $snapshot),
        'snapshot' => $snapshot,
    ];
}

function yustam_api_handle_chats(string $method, array $segments): array
{
    if ($method === 'GET' && empty($segments)) {
        return yustam_api_chats_list();
    }
    if ($method === 'POST' && empty($segments)) {
        return yustam_api_chats_open();
    }
    $threadId = $segments[0] ?? '';
    if ($threadId === '') {
        yustam_api_error(404, 'Chat thread not found.');
    }
    if ($method === 'POST' && isset($segments[1])) {
        $action = strtolower($segments[1]);
        if ($action === 'assign') {
            return yustam_api_chats_assign($threadId);
        }
        if ($action === 'messages') {
            return yustam_api_chats_send_message($threadId);
        }
        if ($action === 'read') {
            return yustam_api_chats_mark_read($threadId);
        }
    }
    if ($method === 'GET' && isset($segments[1]) && $segments[1] === 'messages') {
        return yustam_api_chats_list_messages($threadId);
    }
    yustam_api_error(405, 'Chat endpoint not found.');
}

function yustam_api_handle_admin(string $method, array $segments): array
{
    $admin = yustam_api_require_auth('admin');
    $resource = strtolower($segments[0] ?? '');

    switch ($resource) {
        case 'dashboard':
            return yustam_api_admin_dashboard();
        case 'products':
            return yustam_api_admin_products();
        case 'users':
            return yustam_api_admin_users();
        case 'vendors':
            return yustam_api_admin_vendors();
        case 'verifications':
            return yustam_api_admin_verifications();
        case 'support':
            if (($segments[1] ?? '') === 'tickets') {
                return yustam_api_admin_support_tickets();
            }
            break;
        case 'plans':
            return yustam_api_admin_plans();
    }

    yustam_api_error(404, 'Admin endpoint not found.');
}

function yustam_api_handle_reviews(string $method, array $segments): array
{
    $action = strtolower($segments[0] ?? '');

    if ($action !== '' && ctype_digit($action)) {
        $reviewId = (int) $action;
        if ($method === 'GET' && empty($segments[1])) {
            return yustam_api_reviews_get($reviewId);
        }
        if ($method === 'PATCH' && empty($segments[1])) {
            return yustam_api_reviews_update($reviewId);
        }
        if ($method === 'DELETE' && empty($segments[1])) {
            return yustam_api_reviews_delete($reviewId);
        }
        yustam_api_error(404, 'Reviews endpoint not found.');
    }

    if ($method === 'POST' && $action === '') {
        return yustam_api_reviews_create();
    }

    if ($method === 'GET' && $action === '') {
        return yustam_api_reviews_list();
    }

    if ($method === 'GET' && $action === 'summary') {
        return yustam_api_reviews_summary();
    }

    yustam_api_error(404, 'Reviews endpoint not found.');
}

function yustam_api_reviews_get(int $reviewId): array
{
    if ($reviewId <= 0) {
        yustam_api_error(404, 'Review not found.');
    }

    $auth = yustam_api_optional_auth();
    $role = $auth['role'] ?? null;
    $authVendorId = (int) ($auth['vendorId'] ?? 0);

    $db = get_db_connection();
    $record = yustam_reviews_find_by_id($db, $reviewId);
    if (!$record) {
        yustam_api_error(404, 'Review not found.');
    }

    $vendorId = (int) ($record['vendor_id'] ?? 0);
    if ($role === 'vendor' && $authVendorId !== $vendorId) {
        yustam_api_error(403, 'You cannot access reviews for another vendor.');
    }

    $status = strtolower((string) ($record['status'] ?? 'published'));
    if (!in_array($role, ['vendor', 'admin'], true) && $status !== 'published') {
        yustam_api_error(404, 'Review not found.');
    }

    return [
        'success' => true,
        'review' => yustam_reviews_format_record($record),
    ];
}

function yustam_api_reviews_create(): array
{
    $user = yustam_api_require_auth(['buyer', 'admin']);
    $payload = yustam_api_read_json_body();

    $vendorId = (int) ($payload['vendorId'] ?? 0);
    $listingId = (int) ($payload['listingId'] ?? 0);
    $listingPublicId = trim((string) ($payload['listingPublicId'] ?? ''));
    $listingIdentifier = $listingPublicId !== '' ? $listingPublicId : ($listingId > 0 ? (string) $listingId : '');

    $listing = null;
    if ($listingIdentifier !== '') {
        $listing = yustam_api_find_listing($listingIdentifier);
        if (!$listing) {
            yustam_api_error(404, 'Listing not found.');
        }
        $resolvedVendorId = (int) ($listing['vendor_id'] ?? 0);
        if ($resolvedVendorId <= 0) {
            yustam_api_error(404, 'Listing vendor missing.');
        }
        if ($vendorId > 0 && $vendorId !== $resolvedVendorId) {
            yustam_api_error(409, 'Listing does not belong to the specified vendor.');
        }
        $vendorId = $resolvedVendorId;
        $listingId = (int) ($listing['id'] ?? 0);
        if ($listingPublicId === '') {
            $listingPublicId = (string) ($listing['public_id'] ?? $listing['firestore_id'] ?? '');
        }
    }

    if ($vendorId <= 0) {
        yustam_api_error(422, 'vendorId is required.');
    }

    $db = get_db_connection();
    $vendor = yustam_vendor_find_by_id($vendorId, $db);
    if (!$vendor) {
        yustam_api_error(404, 'Vendor not found.');
    }

    $rating = (int) ($payload['rating'] ?? 0);
    if ($rating < 1 || $rating > 5) {
        yustam_api_error(422, 'rating must be between 1 and 5.');
    }

    $comment = isset($payload['comment']) ? trim((string) $payload['comment']) : '';
    $requestedStatus = strtolower(trim((string) ($payload['status'] ?? '')));
    $status = 'published';
    if ($requestedStatus !== '' && ($user['role'] ?? '') === 'admin') {
        $validStatuses = ['published', 'pending', 'hidden', 'flagged'];
        if (!in_array($requestedStatus, $validStatuses, true)) {
            yustam_api_error(422, 'Invalid review status.');
        }
        $status = $requestedStatus;
    }

    $reviewerRef = (string) ($payload['reviewerRef'] ?? ($user['id'] ?? ''));
    if ($reviewerRef === '') {
        yustam_api_error(422, 'Unable to determine reviewer.');
    }

    $reviewerName = trim((string) ($payload['reviewerName'] ?? ($user['displayName'] ?? '')));
    $existing = yustam_reviews_find_existing($db, $vendorId, $reviewerRef, $listingId);
    if ($existing) {
        if ($listingId <= 0 && isset($existing['listing_id'])) {
            $listingId = (int) $existing['listing_id'];
        }
        if ($listingPublicId === '' && isset($existing['listing_public_id'])) {
            $listingPublicId = (string) $existing['listing_public_id'];
        }
    }

    $review = yustam_reviews_upsert($db, [
        'vendor_id' => $vendorId,
        'listing_id' => $listingId,
        'listing_public_id' => $listingPublicId,
        'reviewer_ref' => $reviewerRef,
        'reviewer_name' => $reviewerName,
        'rating' => $rating,
        'comment' => $comment,
        'status' => $status,
    ]);

    $created = !$existing || (int) ($existing['id'] ?? 0) !== (int) ($review['id'] ?? 0);

    if ($created && ($user['role'] ?? '') !== 'vendor') {
        $title = 'New review received';
        $reviewerLabel = $reviewerName !== '' ? $reviewerName : 'A customer';
        $message = sprintf('%s rated you %d/5%s', $reviewerLabel, (int) ($review['rating'] ?? 0), $comment !== '' ? ' and left a comment.' : '.');
        $detail = json_encode([
            'type' => 'review.created',
            'reviewId' => $review['id'] ?? null,
            'rating' => $review['rating'] ?? null,
            'comment' => $review['comment'] ?? null,
            'listingId' => $review['listingId'] ?? null,
            'listingPublicId' => $review['listingPublicId'] ?? null,
            'reviewer' => $review['reviewer'] ?? null,
        ], YUSTAM_API_JSON_FLAGS);
        yustam_vendor_notifications_insert($db, $vendorId, $title, $message, (string) $detail, 'review');
    }

    $summary = yustam_reviews_vendor_stats($vendorId);

    return [
        'success' => true,
        'review' => $review,
        'summary' => $summary,
        'created' => $created,
    ];
}

function yustam_api_reviews_list(): array
{
    $auth = yustam_api_optional_auth();
    $role = $auth['role'] ?? null;
    $authVendorId = (int) ($auth['vendorId'] ?? 0);

    $vendorId = (int) ($_GET['vendorId'] ?? $_GET['vendor'] ?? 0);
    if ($role === 'vendor') {
        if ($authVendorId <= 0) {
            yustam_api_error(404, 'Vendor profile not found.');
        }
        if ($vendorId > 0 && $vendorId !== $authVendorId) {
            yustam_api_error(403, 'Cannot view reviews for another vendor.');
        }
        $vendorId = $authVendorId;
    }

    $listingId = (int) ($_GET['listingId'] ?? 0);
    $listingPublicId = trim((string) ($_GET['listingPublicId'] ?? ''));
    if ($listingId <= 0 && $listingPublicId !== '') {
        $listing = yustam_api_find_listing($listingPublicId);
        if ($listing) {
            $listingId = (int) ($listing['id'] ?? 0);
            $resolvedVendorId = (int) ($listing['vendor_id'] ?? 0);
            if ($vendorId === 0) {
                $vendorId = $resolvedVendorId;
            } elseif ($resolvedVendorId > 0 && $vendorId !== $resolvedVendorId && $role !== 'admin') {
                yustam_api_error(403, 'Listing does not belong to the specified vendor.');
            }
        }
    }

    if ($vendorId <= 0) {
        yustam_api_error(422, 'vendorId is required.');
    }

    $validStatuses = ['published', 'pending', 'hidden', 'flagged'];
    $status = strtolower(trim((string) ($_GET['status'] ?? '')));
    $filters = ['vendorId' => $vendorId];

    if ($listingId > 0) {
        $filters['listingId'] = $listingId;
    }

    if ($status !== '') {
        if (!in_array($status, $validStatuses, true)) {
            yustam_api_error(422, 'Invalid status filter.');
        }
        if (!in_array($role, ['vendor', 'admin'], true) && $status !== 'published') {
            yustam_api_error(403, 'Insufficient permissions for that status.');
        }
        $filters['status'] = $status;
    } elseif (!in_array($role, ['vendor', 'admin'], true)) {
        $filters['status'] = 'published';
    }

    $page = isset($_GET['page']) ? (int) $_GET['page'] : 1;
    $pageSize = isset($_GET['pageSize']) ? (int) $_GET['pageSize'] : 20;

    $result = yustam_reviews_list($filters, $page, $pageSize);

    return [
        'success' => true,
        'data' => [
            'vendorId' => $vendorId,
            'filters' => $filters,
            'reviews' => $result['items'] ?? [],
            'pagination' => $result['pagination'] ?? null,
        ],
    ];
}

function yustam_api_reviews_summary(): array
{
    $auth = yustam_api_optional_auth();
    $role = $auth['role'] ?? null;
    $authVendorId = (int) ($auth['vendorId'] ?? 0);

    $vendorId = (int) ($_GET['vendorId'] ?? $_GET['vendor'] ?? 0);
    if ($role === 'vendor') {
        if ($authVendorId <= 0) {
            yustam_api_error(404, 'Vendor profile not found.');
        }
        if ($vendorId > 0 && $vendorId !== $authVendorId) {
            yustam_api_error(403, 'Cannot view reviews summary for another vendor.');
        }
        $vendorId = $authVendorId;
    }

    if ($vendorId <= 0) {
        yustam_api_error(422, 'vendorId is required.');
    }

    $limit = isset($_GET['limit']) ? (int) $_GET['limit'] : (isset($_GET['recentLimit']) ? (int) $_GET['recentLimit'] : 5);
    $limit = max(1, min(20, $limit));

    $stats = yustam_reviews_vendor_stats($vendorId);
    $recent = yustam_reviews_vendor_recent($vendorId, $limit);

    return [
        'success' => true,
        'data' => [
            'vendorId' => $vendorId,
            'stats' => $stats,
            'recent' => $recent,
        ],
    ];
}

function yustam_api_reviews_update(int $reviewId): array
{
    if ($reviewId <= 0) {
        yustam_api_error(404, 'Review not found.');
    }

    $auth = yustam_api_require_auth(['admin', 'vendor']);
    $role = $auth['role'];
    $authVendorId = (int) ($auth['vendorId'] ?? 0);

    $db = get_db_connection();
    $existing = yustam_reviews_find_by_id($db, $reviewId);
    if (!$existing) {
        yustam_api_error(404, 'Review not found.');
    }

    $vendorId = (int) ($existing['vendor_id'] ?? 0);
    if ($role === 'vendor') {
        if ($authVendorId <= 0 || $authVendorId !== $vendorId) {
            yustam_api_error(403, 'You cannot modify reviews for another vendor.');
        }
    }

    $body = yustam_api_read_json_body();
    $status = strtolower(trim((string) ($body['status'] ?? '')));
    if ($status === '') {
        yustam_api_error(422, 'status is required.');
    }

    $validStatuses = ['published', 'pending', 'hidden', 'flagged'];
    if (!in_array($status, $validStatuses, true)) {
        yustam_api_error(422, 'Invalid review status.');
    }

    if ($role === 'vendor' && !in_array($status, ['published', 'hidden'], true)) {
        yustam_api_error(403, 'Vendors can only toggle reviews between published and hidden.');
    }

    $updated = yustam_reviews_update_status($db, $reviewId, $status);
    if (!$updated) {
        yustam_api_error(500, 'Unable to update review status.');
    }

    $summary = yustam_reviews_vendor_stats($vendorId);

    return [
        'success' => true,
        'review' => $updated,
        'summary' => $summary,
    ];
}

function yustam_api_reviews_delete(int $reviewId): array
{
    if ($reviewId <= 0) {
        yustam_api_error(404, 'Review not found.');
    }

    $auth = yustam_api_require_auth('admin');
    $db = get_db_connection();
    $existing = yustam_reviews_find_by_id($db, $reviewId);
    if (!$existing) {
        yustam_api_error(404, 'Review not found.');
    }

    $vendorId = (int) ($existing['vendor_id'] ?? 0);
    if (!yustam_reviews_delete($db, $reviewId)) {
        yustam_api_error(500, 'Unable to delete review.');
    }

    $summary = $vendorId > 0 ? yustam_reviews_vendor_stats($vendorId) : null;

    return [
        'success' => true,
        'message' => 'Review removed successfully.',
        'summary' => $summary,
    ];
}

/**
 * --------------------------------------------------------------------------
 * Authentication
 * --------------------------------------------------------------------------
 */
function yustam_api_auth_register(): array
{
    $body = yustam_api_read_json_body();
    $email = strtolower(trim((string) ($body['email'] ?? '')));
    $password = (string) ($body['password'] ?? '');
    $displayName = trim((string) ($body['displayName'] ?? $body['name'] ?? ''));
    $phone = trim((string) ($body['phone'] ?? $body['phoneNumber'] ?? ''));

    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        yustam_api_error(422, 'A valid email address is required.');
    }
    if (strlen($password) < 6) {
        yustam_api_error(422, 'Password must be at least 6 characters.');
    }

    try {
        $firebaseUser = yustam_firebase_create_user($email, $password, $displayName);
    } catch (YustamFirebaseAuthException $authError) {
        yustam_api_error(400, $authError->getMessage());
    }

    $profile = [
        'localId' => $firebaseUser['localId'] ?? '',
        'email' => $email,
        'displayName' => $displayName,
        'phoneNumber' => $phone,
        'photoUrl' => $body['photoUrl'] ?? null,
    ];

    $user = yustam_api_sync_backend_user($profile);
    $token = yustam_api_issue_token($user);

    return [
        'success' => true,
        'user' => $user,
        'token' => $token,
    ];
}

function yustam_api_auth_session(): array
{
    $body = yustam_api_read_json_body();
    $idToken = trim((string) ($body['idToken'] ?? ''));
    if ($idToken === '') {
        yustam_api_error(400, 'Firebase idToken is required.');
    }

    try {
        $firebaseUser = yustam_firebase_lookup_id_token($idToken);
    } catch (YustamFirebaseAuthException $authError) {
        yustam_api_error(401, $authError->getMessage());
    }

    $user = yustam_api_sync_backend_user($firebaseUser);
    $token = yustam_api_issue_token($user);

    return [
        'success' => true,
        'user' => $user,
        'token' => $token,
    ];
}

function yustam_api_auth_update_profile(): array
{
    $user = yustam_api_require_auth();
    $body = yustam_api_read_json_body();
    $displayName = isset($body['displayName']) ? trim((string) $body['displayName']) : null;
    $phone = isset($body['phone']) ? trim((string) $body['phone']) : null;
    $photoUrl = isset($body['photoUrl']) ? trim((string) $body['photoUrl']) : null;

    if ($displayName === null && $phone === null && $photoUrl === null) {
        yustam_api_error(400, 'Nothing to update.');
    }

    $db = get_db_connection();

    switch ($user['role']) {
        case 'vendor':
            $fields = [];
            $types = '';
            $values = [];
            if ($displayName !== null) {
                if (yustam_vendor_table_has_column('business_name')) {
                    $fields[] = '`business_name` = ?';
                    $types .= 's';
                    $values[] = $displayName;
                } elseif (yustam_vendor_table_has_column('full_name')) {
                    $fields[] = '`full_name` = ?';
                    $types .= 's';
                    $values[] = $displayName;
                }
            }
            if ($phone !== null && yustam_vendor_table_has_column('phone')) {
                $fields[] = '`phone` = ?';
                $types .= 's';
                $values[] = $phone;
            }
            if ($photoUrl !== null && yustam_vendor_table_has_column('profile_photo')) {
                $fields[] = '`profile_photo` = ?';
                $types .= 's';
                $values[] = $photoUrl;
            }
            if (!$fields) {
                break;
            }
            $sql = sprintf('UPDATE `%s` SET %s WHERE id = ? LIMIT 1', YUSTAM_VENDORS_TABLE, implode(', ', $fields));
            $stmt = $db->prepare($sql);
            if ($stmt instanceof mysqli_stmt) {
                $types .= 'i';
                $values[] = (int) ($user['vendorId'] ?? 0);
                $stmt->bind_param($types, ...$values);
                $stmt->execute();
                $stmt->close();
            }
            $user = yustam_api_fetch_user_profile($user['id']);
            break;

        case 'buyer':
            $fields = [];
            $types = '';
            $values = [];
            if ($displayName !== null) {
                $fields[] = '`name` = ?';
                $types .= 's';
                $values[] = $displayName;
            }
            if ($phone !== null) {
                $fields[] = '`phone` = ?';
                $types .= 's';
                $values[] = $phone;
            }
            if ($fields) {
                $sql = 'UPDATE `buyers` SET ' . implode(', ', $fields) . ' WHERE id = ? LIMIT 1';
                $stmt = $db->prepare($sql);
                if ($stmt instanceof mysqli_stmt) {
                    $types .= 'i';
                    $values[] = (int) ($user['buyerId'] ?? 0);
                    $stmt->bind_param($types, ...$values);
                    $stmt->execute();
                    $stmt->close();
                }
            }
            $user = yustam_api_fetch_user_profile($user['id']);
            break;

        case 'admin':
            $admin = yustam_api_lookup_admin_by_id((int) ($user['adminId'] ?? 0));
            if ($admin) {
                $fields = [];
                $types = '';
                $values = [];
                if ($displayName !== null && array_key_exists('name', $admin)) {
                    $fields[] = '`name` = ?';
                    $types .= 's';
                    $values[] = $displayName;
                }
                if ($phone !== null && array_key_exists('phone', $admin)) {
                    $fields[] = '`phone` = ?';
                    $types .= 's';
                    $values[] = $phone;
                }
                if ($fields) {
                    $table = defined('YUSTAM_ADMINS_TABLE') ? YUSTAM_ADMINS_TABLE : 'admins';
                    if (!preg_match('/^[A-Za-z0-9_]+$/', $table)) {
                        $table = 'admins';
                    }
                    $sql = sprintf('UPDATE `%s` SET %s WHERE id = ? LIMIT 1', $table, implode(', ', $fields));
                    $stmt = $db->prepare($sql);
                    if ($stmt instanceof mysqli_stmt) {
                        $types .= 'i';
                        $values[] = (int) $admin['id'];
                        $stmt->bind_param($types, ...$values);
                        $stmt->execute();
                        $stmt->close();
                    }
                }
                $user = yustam_api_fetch_user_profile($user['id']);
            }
            break;
    }

    return ['success' => true, 'user' => $user];
}

function yustam_api_auth_list_users(array $admin): array
{
    $conn = yustam_buyers_connection();

    $buyers = [];
    $buyerResult = $conn->query('SELECT id, buyer_uid, name, email, phone, joined_at FROM buyers ORDER BY joined_at DESC LIMIT 50');
    if ($buyerResult instanceof mysqli_result) {
        while ($row = $buyerResult->fetch_assoc()) {
            $buyers[] = [
                'id' => yustam_api_user_reference('buyer', (int) $row['id']),
                'displayName' => $row['name'] ?? 'Buyer',
                'email' => $row['email'] ?? null,
                'phone' => $row['phone'] ?? null,
                'joinedAt' => $row['joined_at'] ?? null,
            ];
        }
        $buyerResult->free();
    }

    $vendors = [];
    $vendorResult = $conn->query(sprintf(
        'SELECT id, email, phone, business_name, plan, verification_status, created_at FROM `%s` ORDER BY created_at DESC LIMIT 50',
        YUSTAM_VENDORS_TABLE
    ));
    if ($vendorResult instanceof mysqli_result) {
        while ($row = $vendorResult->fetch_assoc()) {
            $vendors[] = [
                'id' => yustam_api_user_reference('vendor', (int) $row['id']),
                'displayName' => $row['business_name'] ?? 'Vendor',
                'email' => $row['email'] ?? null,
                'phone' => $row['phone'] ?? null,
                'plan' => $row['plan'] ?? null,
                'verificationStatus' => $row['verification_status'] ?? null,
                'createdAt' => $row['created_at'] ?? null,
            ];
        }
        $vendorResult->free();
    }

    return [
        'success' => true,
        'users' => [
            'buyers' => $buyers,
            'vendors' => $vendors,
        ],
    ];
}

/**
 * --------------------------------------------------------------------------
 * Vendor
 * --------------------------------------------------------------------------
 */
function yustam_api_vendor_register(): array
{
    $payload = yustam_api_read_json_body();
    $name = trim((string) ($payload['name'] ?? $payload['fullName'] ?? ''));
    $email = strtolower(trim((string) ($payload['email'] ?? '')));
    $phone = trim((string) ($payload['phone'] ?? ''));
    $password = (string) ($payload['password'] ?? '');
    $businessName = trim((string) ($payload['businessName'] ?? $payload['storeName'] ?? ''));
    $category = trim((string) ($payload['category'] ?? ''));

    if ($name === '' || $email === '' || $phone === '' || $password === '' || $businessName === '' || $category === '') {
        yustam_api_error(422, 'Please fill in all required fields.');
    }
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        yustam_api_error(422, 'Invalid email address.');
    }
    if (strlen($password) < 6) {
        yustam_api_error(422, 'Password must be at least 6 characters.');
    }

    $firebaseUid = '';
    $firebaseIdToken = '';

    try {
        $db = get_db_connection();
        if (yustam_vendor_find_by_email($email, $db)) {
            yustam_api_error(409, 'This email is already registered as a vendor.');
        }

        try {
            $firebaseUser = yustam_firebase_create_user($email, $password, $name);
            $firebaseUid = (string) ($firebaseUser['localId'] ?? '');
            $firebaseIdToken = isset($firebaseUser['idToken']) ? (string) $firebaseUser['idToken'] : '';
            if ($firebaseUid === '') {
                throw new RuntimeException('Authentication service did not return a UID.');
            }
        } catch (YustamFirebaseAuthException $authError) {
            $code = strtoupper((string) $authError->getErrorCode());
            if ($code === 'EMAIL_EXISTS') {
                yustam_api_error(409, 'This email is already registered as a vendor.');
            }
            yustam_api_error(400, $authError->getMessage());
        }

        $hashedPassword = password_hash($password, PASSWORD_DEFAULT);
        $verificationToken = bin2hex(random_bytes(32));

        try {
            $vendor = yustam_vendor_create($db, [
                'firebase_uid' => $firebaseUid,
                'name' => $name,
                'full_name' => $name,
                'email' => $email,
                'phone' => $phone,
                'password_hash' => $hashedPassword,
                'business_name' => $businessName,
                'category' => $category,
                'provider' => 'email',
                'verification_token' => $verificationToken,
                'verified' => 0,
            ]);
        } catch (RuntimeException $creationError) {
            yustam_api_error(400, $creationError->getMessage());
        }

        if (empty($vendor)) {
            throw new RuntimeException('Vendor record could not be created.');
        }

        $vendorUid = $vendor['vendor_uid'] ?? yustam_vendor_assign_uid_if_missing($db, $vendor);
        $vendor['vendor_uid'] = $vendorUid;
        $vendor['verification_token'] = $verificationToken;

        yustam_api_vendor_send_verification_email($vendor, $verificationToken);

        return [
            'success' => true,
            'message' => 'Account created! Please check your email to verify your account.',
            'vendorUid' => $vendorUid,
            'verificationStatus' => 'pending',
        ];
    } catch (YustamApiException $apiError) {
        if ($firebaseUid !== '') {
            yustam_api_vendor_cleanup_firebase_user($firebaseUid, $firebaseIdToken);
        }
        throw $apiError;
    } catch (Throwable $unexpected) {
        if ($firebaseUid !== '') {
            yustam_api_vendor_cleanup_firebase_user($firebaseUid, $firebaseIdToken);
        }
        error_log('Vendor register failed: ' . $unexpected->getMessage());
        yustam_api_error(500, 'We could not create your account right now. Please try again.');
    }
}

function yustam_api_vendor_resend_verification(): array
{
    $payload = yustam_api_read_json_body();
    $email = strtolower(trim((string) ($payload['email'] ?? '')));
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        yustam_api_error(422, 'A valid email address is required.');
    }

    $db = get_db_connection();
    $vendor = yustam_vendor_find_by_email($email, $db);
    if (!$vendor) {
        yustam_api_error(404, 'No vendor account found for this email.');
    }

    if (yustam_vendor_is_verified($vendor)) {
        return [
            'success' => true,
            'message' => 'Your account is already verified. You can log in now.',
            'status' => 'verified',
        ];
    }

    $token = bin2hex(random_bytes(32));
    $table = YUSTAM_VENDORS_TABLE;
    if (!preg_match('/^[A-Za-z0-9_]+$/', $table)) {
        throw new RuntimeException('Invalid vendor table name.');
    }
    $stmt = $db->prepare(sprintf('UPDATE `%s` SET verification_token = ?, updated_at = NOW() WHERE id = ? LIMIT 1', $table));
    if (!$stmt instanceof mysqli_stmt) {
        throw new RuntimeException('Unable to prepare verification update statement.');
    }
    $vendorId = (int) $vendor['id'];
    $stmt->bind_param('si', $token, $vendorId);
    $stmt->execute();
    $stmt->close();

    $vendor['verification_token'] = $token;
    yustam_api_vendor_send_verification_email($vendor, $token);

    return [
        'success' => true,
        'message' => 'Verification email sent. Please check your inbox.',
        'status' => 'pending',
    ];
}

function yustam_api_vendor_verify(string $method): array
{
    if (strtoupper($method) === 'GET') {
        $token = trim((string) ($_GET['token'] ?? ''));
        $result = yustam_api_vendor_complete_verification($token);
        yustam_api_vendor_render_verify_page($result);
        exit;
    }

    $payload = yustam_api_read_json_body();
    $token = trim((string) ($payload['token'] ?? ''));
    if ($token === '') {
        yustam_api_error(422, 'Verification token is required.');
    }

    $result = yustam_api_vendor_complete_verification($token);

    if ($result['status'] === 'invalid') {
        yustam_api_error(404, $result['message']);
    }

    return [
        'success' => $result['status'] === 'verified' || $result['status'] === 'already-verified',
        'status' => $result['status'],
        'message' => $result['message'],
    ];
}

function yustam_api_vendor_complete_verification(string $token): array
{
    if ($token === '') {
        return [
            'status' => 'invalid',
            'message' => 'Verification link is missing or invalid.',
            'type' => 'error',
        ];
    }

    try {
        $db = get_db_connection();
        $table = YUSTAM_VENDORS_TABLE;
        if (!preg_match('/^[A-Za-z0-9_]+$/', $table)) {
            throw new RuntimeException('Invalid vendor table name.');
        }

        $stmt = $db->prepare(sprintf('SELECT * FROM `%s` WHERE verification_token = ? LIMIT 1', $table));
        if (!$stmt instanceof mysqli_stmt) {
            throw new RuntimeException('Unable to prepare verification lookup.');
        }
        $stmt->bind_param('s', $token);
        $stmt->execute();
        $result = $stmt->get_result();
        $vendor = $result ? $result->fetch_assoc() : null;
        $stmt->close();

        if (!$vendor) {
            return [
                'status' => 'invalid',
                'message' => 'This verification link is invalid or expired.',
                'type' => 'error',
            ];
        }

        if (yustam_vendor_is_verified($vendor)) {
            return [
                'status' => 'already-verified',
                'message' => 'Your account is already verified. You can log in anytime.',
                'type' => 'info',
                'vendor' => $vendor,
            ];
        }

        $stmt = $db->prepare(sprintf('UPDATE `%s` SET verified = 1, verification_token = NULL, updated_at = NOW() WHERE id = ? LIMIT 1', $table));
        if (!$stmt instanceof mysqli_stmt) {
            throw new RuntimeException('Unable to prepare verification update.');
        }
        $vendorId = (int) $vendor['id'];
        $stmt->bind_param('i', $vendorId);
        $stmt->execute();
        $stmt->close();

        $vendor['verified'] = 1;
        $vendor['verification_token'] = null;
        yustam_api_vendor_send_welcome_email($vendor);

        return [
            'status' => 'verified',
            'message' => 'Your email has been verified successfully. Welcome to YUSTAM Marketplace!',
            'type' => 'success',
            'vendor' => $vendor,
        ];
    } catch (Throwable $error) {
        error_log('Verification error: ' . $error->getMessage());
        return [
            'status' => 'error',
            'message' => 'Something went wrong while verifying your account. Please try again later.',
            'type' => 'error',
        ];
    }
}

function yustam_api_vendor_render_verify_page(array $result): void
{
    $brand = yustam_api_vendor_branding();
    $title = $result['status'] === 'verified'
        ? 'Verification Successful'
        : ($result['status'] === 'already-verified' ? 'Already Verified' : 'Verification Error');
    $message = $result['message'] ?? 'Verification complete.';
    $status = $result['status'] ?? 'success';
    $accent = $status === 'error' ? '#C62828' : $brand['brandColor'];

    header('Content-Type: text/html; charset=utf-8');
    http_response_code($status === 'error' ? 400 : 200);

    echo "<html lang='en'><head><meta charset='UTF-8'><meta name='viewport' content='width=device-width, initial-scale=1.0'><title>YUSTAM Marketplace | Account Verification</title><link href='https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap' rel='stylesheet'><style>body{font-family:'Inter',sans-serif;background:linear-gradient(145deg,{$brand['bgColor']},#fff);display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;color:#111;} .card{background:#fff;padding:40px 30px;border-radius:16px;box-shadow:0 8px 30px rgba(0,0,0,0.08);max-width:420px;text-align:center;} .logo{width:80px;border-radius:8px;margin-bottom:16px;} h2{color:{$accent};font-size:1.6rem;margin-bottom:10px;} p{color:#333;line-height:1.6;font-size:1rem;} a.btn{display:inline-block;background:{$brand['accentColor']};color:#fff;padding:12px 24px;text-decoration:none;border-radius:8px;font-weight:600;margin-top:20px;transition:background 0.3s ease;} a.btn:hover{background:#e4630b;} footer{margin-top:25px;font-size:0.85rem;color:rgba(0,0,0,0.5);} </style></head><body><div class='card'><img src='{$brand['logoUrl']}' alt='YUSTAM Logo' class='logo'><h2>{$title}</h2><p>{$message}</p><a href='https://yustam.com.ng/vendor-login.html' class='btn'>Go to Login</a><footer>© " . date('Y') . " YUSTAM Marketplace</footer></div></body></html>";
}

function yustam_api_vendor_branding(): array
{
    return [
        'brandColor' => '#004D40',
        'accentColor' => '#F3731E',
        'bgColor' => '#F5EDE2',
        'logoUrl' => 'https://yustam.com.ng/logo.jpeg',
    ];
}

function yustam_api_vendor_verify_link(string $token): string
{
    $configured = rtrim((string) yustam_api_env('API_VERIFY_BASE_URL', ''), '/');
    if ($configured !== '') {
        return $configured . '/vendor/verify?token=' . urlencode($token);
    }
    $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
    $host = $_SERVER['HTTP_HOST'] ?? 'yustam.com.ng';
    return sprintf('%s://%s/api/vendor/verify?token=%s', $scheme, $host, urlencode($token));
}

function yustam_api_vendor_send_verification_email(array $vendor, string $token): void
{
    $email = $vendor['email'] ?? null;
    if (!$email) {
        return;
    }
    $link = yustam_api_vendor_verify_link($token);
    $name = yustam_api_vendor_safe_name($vendor);
    $body = yustam_api_vendor_build_verification_email($name, $link);
    if (!sendEmail($email, 'Welcome to YUSTAM Marketplace - Verify Your Account', $body)) {
        error_log('Unable to send verification email to ' . $email);
    }
}

function yustam_api_vendor_send_welcome_email(array $vendor): void
{
    $email = $vendor['email'] ?? null;
    if (!$email) {
        return;
    }
    $name = yustam_api_vendor_safe_name($vendor);
    $body = yustam_api_vendor_build_welcome_email($name);
    if (!sendEmail($email, 'Welcome to YUSTAM Marketplace', $body)) {
        error_log('Unable to send welcome email to ' . $email);
    }
}

function yustam_api_vendor_build_verification_email(string $name, string $link): string
{
    $brand = yustam_api_vendor_branding();
    $safeName = htmlspecialchars($name, ENT_QUOTES, 'UTF-8');
    $safeLink = htmlspecialchars($link, ENT_QUOTES, 'UTF-8');
    return "<div style='font-family:Inter,Arial,sans-serif;background:{$brand['bgColor']};padding:40px 20px;'><div style='max-width:600px;margin:auto;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 10px 40px rgba(0,0,0,0.07);border:1px solid #eee;'><div style='background:{$brand['brandColor']};padding:24px;text-align:center;'><img src='{$brand['logoUrl']}' alt='YUSTAM Logo' width='85' style='border-radius:8px;margin-bottom:10px;'><h2 style='color:#fff;margin:0;font-size:1.6rem;'>Welcome to YUSTAM Marketplace</h2></div><div style='padding:32px 24px;'><p style='font-size:1rem;color:#222;'>Hi <strong>{$safeName}</strong>,</p><p style='font-size:1rem;color:#333;line-height:1.6;'>We're thrilled to have you onboard as a vendor!<br><br>Before we get started, please verify your email address to activate your account.</p><div style='text-align:center;margin:30px 0;'><a href='{$safeLink}' style='background:{$brand['accentColor']};color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block;'>Verify My Account</a></div><p style='font-size:0.95rem;color:#555;line-height:1.6;'>Or copy this link into your browser:<br><span style='color:{$brand['brandColor']};word-break:break-all;'>{$safeLink}</span></p><hr style='margin:30px 0;border:none;border-top:1px solid #eee;'><p style='font-size:0.9rem;color:#666;text-align:center;'>After verification, you can log in and start uploading your listings immediately.<br>If you didn't create this account, simply ignore this email.</p></div><div style='background:{$brand['bgColor']};padding:16px;text-align:center;font-size:0.85rem;color:#777;'>© " . date('Y') . " YUSTAM Marketplace. All rights reserved.</div></div></div>";
}

function yustam_api_vendor_build_welcome_email(string $name): string
{
    $brand = yustam_api_vendor_branding();
    $safeName = htmlspecialchars($name, ENT_QUOTES, 'UTF-8');
    return "<div style='font-family:Poppins,Arial,sans-serif;background:#f8f8f8;padding:30px;border-radius:10px;'><div style='max-width:600px;margin:auto;background:white;border-radius:10px;padding:25px;border:1px solid #eee;'><div style='text-align:center;'><img src='{$brand['logoUrl']}' alt='YUSTAM Logo' width='80' style='margin-bottom:15px;border-radius:8px;'><h2 style='color:{$brand['brandColor']};'>Welcome to YUSTAM Marketplace!</h2></div><p>Hi <strong>{$safeName}</strong>,</p><p>Your vendor account has been successfully verified. You can now log in and start listing your products.</p><p style='text-align:center;margin:25px 0;'><a href='https://yustam.com.ng/vendor-login.html' style='background:{$brand['brandColor']};color:#fff;padding:12px 20px;text-decoration:none;border-radius:6px;'>Go to Login</a></p><hr style='margin:25px 0;border:none;border-top:1px solid #ddd;'><p style='font-size:13px;color:#999;text-align:center;margin-top:30px;'>© " . date('Y') . " YUSTAM Marketplace. All rights reserved.</p></div></div>";
}

function yustam_api_vendor_safe_name(array $vendor): string
{
    $name = $vendor['full_name'] ?? $vendor['name'] ?? $vendor['business_name'] ?? 'Vendor';
    $trimmed = trim((string) $name);
    return $trimmed !== '' ? $trimmed : 'Vendor';
}

function yustam_api_vendor_cleanup_firebase_user(string $firebaseUid, ?string $idToken = null): void
{
    $trimmed = trim($firebaseUid);
    if ($trimmed === '') {
        return;
    }
    try {
        yustam_firebase_delete_user($trimmed, $idToken ?: null);
    } catch (Throwable $cleanupError) {
        error_log('Vendor signup cleanup failed: ' . $cleanupError->getMessage());
    }
}

function yustam_api_vendor_activate(): array
{
    $auth = yustam_api_require_auth();
    $payload = yustam_api_read_json_body();
    $businessName = trim((string) ($payload['businessName'] ?? $payload['storeName'] ?? $auth['displayName'] ?? 'Marketplace Vendor'));

    $db = get_db_connection();
    $vendor = null;

    if ($auth['role'] === 'vendor' && !empty($auth['vendorId'])) {
        $vendor = yustam_vendor_find_by_id((int) $auth['vendorId'], $db);
    }

    if (!$vendor && !empty($auth['firebaseUid'])) {
        $vendor = yustam_vendor_find_by_firebase_uid($auth['firebaseUid'], $db);
    }

    if (!$vendor && !empty($auth['email'])) {
        $vendor = yustam_vendor_find_by_email($auth['email'], $db);
    }

    if (!$vendor) {
        $passwordHash = password_hash(yustam_api_random_string(12), PASSWORD_BCRYPT);
        $vendor = yustam_vendor_create($db, [
            'firebase_uid' => $auth['firebaseUid'] ?? null,
            'email' => $auth['email'] ?? sprintf('%s@yustam.local', yustam_api_random_string(6)),
            'name' => $businessName,
            'business_name' => $businessName,
            'phone' => $auth['phone'] ?? '',
            'password_hash' => $passwordHash,
            'provider' => 'firebase',
        ]);
    }

    $vendorProfile = yustam_api_vendor_profile_payload($vendor);
    return ['success' => true, 'profile' => $vendorProfile];
}

function yustam_api_vendor_storefront(string $identifier): array
{
    $db = get_db_connection();
    $vendor = null;

    if (ctype_digit($identifier)) {
        $vendor = yustam_vendor_find_by_id((int) $identifier, $db);
    }
    if (!$vendor) {
        $vendor = yustam_vendor_find_by_uid($identifier, $db);
    }
    if (!$vendor) {
        $vendor = yustam_vendor_find_by_firebase_uid($identifier, $db);
    }
    if (!$vendor && yustam_vendor_table_has_column('storefront_slug')) {
        $stmt = $db->prepare(sprintf('SELECT * FROM `%s` WHERE `storefront_slug` = ? LIMIT 1', YUSTAM_VENDORS_TABLE));
        if ($stmt instanceof mysqli_stmt) {
            $stmt->bind_param('s', $identifier);
            $stmt->execute();
            $result = $stmt->get_result();
            $vendor = $result ? $result->fetch_assoc() : null;
            $stmt->close();
        }
    }

    if (!$vendor) {
        yustam_api_error(404, 'Vendor storefront not found.');
    }

    $vendorPayload = yustam_api_vendor_profile_payload($vendor);

    $listings = [];
    try {
        $listingResult = yustam_api_fetch_listings([
            'ownerId' => yustam_api_user_reference('vendor', (int) $vendor['id']),
            'limit' => 36,
        ]);
        $listings = $listingResult['items'] ?? [];
    } catch (Throwable $storefrontError) {
        error_log('Storefront listings fetch failed for vendor ' . $vendor['id'] . ': ' . $storefrontError->getMessage());
        $listings = [];
    }

    $reviewsSummary = yustam_reviews_vendor_stats((int) $vendor['id']);
    $recentReviews = yustam_reviews_vendor_recent((int) $vendor['id'], 5);

    return [
        'success' => true,
        'vendor' => $vendorPayload,
        'listings' => $listings,
        'reviews' => [
            'stats' => $reviewsSummary,
            'recent' => $recentReviews,
        ],
    ];
}

function yustam_api_vendor_profile(): array
{
    $user = yustam_api_require_auth(['vendor', 'admin']);
    $targetVendorId = null;
    if ($user['role'] === 'vendor') {
        $targetVendorId = (int) ($user['vendorId'] ?? 0);
    } elseif (isset($_GET['vendorId'])) {
        [$role, $id] = yustam_api_parse_user_reference((string) $_GET['vendorId']);
        if ($role === 'vendor') {
            $targetVendorId = $id;
        }
    }

    if (!$targetVendorId) {
        yustam_api_error(404, 'Vendor profile not found.');
    }

    $db = get_db_connection();
    $vendor = yustam_vendor_find_by_id($targetVendorId, $db);
    if (!$vendor) {
        yustam_api_error(404, 'Vendor profile not found.');
    }

    return ['success' => true, 'profile' => yustam_api_vendor_profile_payload($vendor)];
}

function yustam_api_vendor_update_profile(): array
{
    $user = yustam_api_require_auth(['vendor', 'admin']);
    $payload = yustam_api_read_json_body();
    $db = get_db_connection();

    $targetVendorId = null;
    if ($user['role'] === 'vendor') {
        $targetVendorId = (int) ($user['vendorId'] ?? 0);
    } elseif (!empty($payload['vendorId'])) {
        [$role, $id] = yustam_api_parse_user_reference((string) $payload['vendorId']);
        if ($role === 'vendor') {
            $targetVendorId = $id;
        }
    }

    if (!$targetVendorId) {
        yustam_api_error(404, 'Vendor profile not found.');
    }

    $vendor = yustam_vendor_find_by_id($targetVendorId, $db);
    if (!$vendor) {
        yustam_api_error(404, 'Vendor profile not found.');
    }

    $fields = [];
    $types = '';
    $values = [];

    $mapping = [
        'business_name' => ['businessName', 'storeName'],
        'phone' => ['phone'],
        'email' => ['email'],
        'category' => ['category'],
        'state' => ['state', 'locationState'],
        'city' => ['city', 'locationCity'],
        'address' => ['address', 'street'],
        'bio' => ['bio', 'about'],
    ];

    foreach ($mapping as $column => $keys) {
        if (!yustam_vendor_table_has_column($column)) {
            continue;
        }
        foreach ($keys as $key) {
            if (array_key_exists($key, $payload)) {
                $value = trim((string) $payload[$key]);
                $fields[] = sprintf('`%s` = ?', $column);
                $types .= 's';
                $values[] = $value;
                break;
            }
        }
    }

    if (array_key_exists('plan', $payload) && yustam_vendor_table_has_column('plan')) {
        $fields[] = '`plan` = ?';
        $types .= 's';
        $values[] = trim((string) $payload['plan']);
    }

    if (!$fields) {
        return ['success' => true, 'profile' => yustam_api_vendor_profile_payload($vendor)];
    }

    $sql = sprintf('UPDATE `%s` SET %s WHERE id = ? LIMIT 1', YUSTAM_VENDORS_TABLE, implode(', ', $fields));
    $stmt = $db->prepare($sql);
    if ($stmt instanceof mysqli_stmt) {
        $types .= 'i';
        $values[] = $targetVendorId;
        $stmt->bind_param($types, ...$values);
        $stmt->execute();
        $stmt->close();
    }

    $updated = yustam_vendor_find_by_id($targetVendorId, $db);
    return ['success' => true, 'profile' => yustam_api_vendor_profile_payload($updated ?: $vendor)];
}

function yustam_api_vendor_dashboard(): array
{
    $auth = yustam_api_require_auth(['vendor', 'admin']);
    $vendorId = $auth['role'] === 'vendor'
        ? (int) ($auth['vendorId'] ?? 0)
        : (int) ($_GET['vendor'] ?? 0);
    if ($vendorId <= 0) {
        yustam_api_error(404, 'Vendor not found.');
    }

    $db = get_db_connection();
    $vendor = yustam_vendor_find_by_id($vendorId, $db);
    if (!$vendor) {
        yustam_api_error(404, 'Vendor not found.');
    }

    $counts = [
        'total' => 0,
        'active' => 0,
        'drafts' => 0,
        'archived' => 0,
    ];

    $result = $db->query(sprintf(
        "SELECT LOWER(`status`) AS status, COUNT(*) AS total FROM `listings` WHERE vendor_id = %d GROUP BY LOWER(`status`)",
        $vendorId
    ));
    if ($result instanceof mysqli_result) {
        while ($row = $result->fetch_assoc()) {
            $status = $row['status'] ?? '';
            $count = (int) ($row['total'] ?? 0);
            $counts['total'] += $count;
            if (in_array($status, ['active', 'approved', 'live', 'published'], true)) {
                $counts['active'] += $count;
            } elseif (in_array($status, ['draft', 'pending'], true)) {
                $counts['drafts'] += $count;
            } else {
                $counts['archived'] += $count;
            }
        }
        $result->free();
    }

    $subscription = yustam_vendor_subscription_format_state($vendor);
    $reviewStats = yustam_reviews_vendor_stats($vendorId);
    $recentReviews = yustam_reviews_vendor_recent($vendorId, 5);
    $rewardsSummary = yustam_vendor_rewards_get_summary($db, $vendorId);
    $recentRewardEvents = yustam_vendor_rewards_get_ledger($db, $vendorId, 5);

    return [
        'success' => true,
        'profile' => yustam_api_vendor_profile_payload($vendor),
        'listings' => $counts,
        'plan' => $subscription,
        'verificationStatus' => $vendor['verification_status'] ?? null,
        'reviews' => [
            'stats' => $reviewStats,
            'recent' => $recentReviews,
        ],
        'rewards' => [
            'summary' => $rewardsSummary,
            'recent' => $recentRewardEvents,
        ],
    ];
}

function yustam_api_vendor_analytics(): array
{
    $auth = yustam_api_require_auth(['vendor', 'admin']);
    $vendorId = $auth['role'] === 'vendor'
        ? (int) ($auth['vendorId'] ?? 0)
        : (int) ($_GET['vendor'] ?? 0);
    if ($vendorId <= 0) {
        yustam_api_error(404, 'Vendor not found.');
    }

    $db = get_db_connection();
    $vendor = yustam_vendor_find_by_id($vendorId, $db);
    if (!$vendor) {
        yustam_api_error(404, 'Vendor not found.');
    }

    $listings = yustam_api_fetch_listings([
        'ownerId' => yustam_api_user_reference('vendor', $vendorId),
        'pageSize' => 100,
    ]);

    $featured = array_filter($listings['items'], function ($item) {
        return !empty($item['vendor']['plan']) && stripos((string) $item['vendor']['plan'], 'featured') !== false;
    });

    $totals = [
        'totalListings' => count($listings['items']),
        'activeListings' => count(array_filter($listings['items'], fn($item) => $item['status'] === 'active')),
        'draftListings' => count(array_filter($listings['items'], fn($item) => in_array($item['status'], ['draft', 'pending'], true))),
        'featuredListings' => count($featured),
    ];

    return [
        'success' => true,
        'vendor' => yustam_api_vendor_profile_payload($vendor),
        'listings' => $listings['items'],
        'totals' => $totals,
    ];
}

function yustam_api_vendor_profile_payload(array $vendor): array
{
    $db = get_db_connection();
    $vendorUid = yustam_vendor_assign_uid_if_missing($db, $vendor);
    return [
        'id' => yustam_api_user_reference('vendor', (int) $vendor['id']),
        'vendorId' => (int) $vendor['id'],
        'vendorUid' => $vendorUid,
        'businessName' => yustam_vendor_business_name($vendor),
        'email' => $vendor['email'] ?? null,
        'phone' => $vendor['phone'] ?? null,
        'plan' => $vendor['plan'] ?? null,
        'verificationStatus' => $vendor['verification_status'] ?? null,
        'state' => $vendor['state'] ?? null,
        'city' => $vendor['city'] ?? null,
        'category' => $vendor['category'] ?? null,
        'address' => $vendor['address'] ?? null,
        'businessAddress' => $vendor['address'] ?? null,
        'photoUrl' => $vendor['profile_photo'] ?? ($vendor['avatar_url'] ?? null),
        'profilePhoto' => $vendor['profile_photo'] ?? ($vendor['avatar_url'] ?? null),
        'createdAt' => $vendor['created_at'] ?? null,
    ];
}

/**
 * --------------------------------------------------------------------------
 * Plans & Subscriptions
 * --------------------------------------------------------------------------
 */
function yustam_api_plan_catalog(): array
{
    $catalog = yustam_vendor_subscription_plan_catalog();
    $plans = [];
    foreach ($catalog as $slug => $plan) {
        $monthly = (float) ($plan['monthlyPrice'] ?? 0);
        $durations = [];
        foreach ($plan['durations'] ?? [] as $months => $entry) {
            $durations[] = [
                'months' => (int) $months,
                'amount' => (float) ($entry['amount'] ?? 0),
                'intervalLabel' => $entry['intervalLabel'] ?? sprintf('%d-Month', $months),
                'planCode' => $entry['planCode'] ?? null,
            ];
        }
        $plans[] = [
            'id' => $slug,
            'slug' => $slug,
            'name' => $plan['name'] ?? ucfirst($slug) . ' Plan',
            'displayName' => $plan['displayName'] ?? ucfirst($slug) . ' Plan',
            'price' => $monthly,
            'listingLimit' => $plan['listingLimit'] ?? null,
            'durations' => $durations,
            'features' => array_values($plan['features'] ?? []),
            'popular' => !empty($plan['popular']),
        ];
    }
    return $plans;
}

function yustam_api_plan_subscriptions(): array
{
    $user = yustam_api_require_auth(['vendor', 'admin']);
    $vendorId = $user['role'] === 'vendor'
        ? (int) ($user['vendorId'] ?? 0)
        : (int) ($_GET['vendor'] ?? 0);
    if ($vendorId <= 0) {
        yustam_api_error(404, 'Vendor profile not found.');
    }

    $db = get_db_connection();
    $vendor = yustam_vendor_subscription_fetch_vendor($db, $vendorId);
    if (!$vendor) {
        yustam_api_error(404, 'Vendor profile not found.');
    }
    $state = yustam_vendor_subscription_format_state($vendor);

    $subscriptions = [];
    if (!empty($state['planName'])) {
        $subscriptions[] = [
            'id' => yustam_api_random_string(12),
            'plan' => $state['planName'],
            'status' => strtolower($state['status'] ?? 'active'),
            'startsAt' => $state['activatedAt'] ?? null,
            'endsAt' => $state['expiresAt'] ?? null,
            'metadata' => $state,
        ];
    }

    return ['success' => true, 'subscriptions' => $subscriptions];
}

function yustam_api_plan_subscribe(string $planSlug): array
{
    $user = yustam_api_require_auth(['vendor', 'admin']);
    $vendorId = $user['role'] === 'vendor'
        ? (int) ($user['vendorId'] ?? 0)
        : (int) ($_GET['vendor'] ?? 0);
    if ($vendorId <= 0) {
        yustam_api_error(404, 'Vendor profile not found.');
    }

    $plan = yustam_vendor_subscription_plan_lookup($planSlug, 1);
    if (!$plan) {
        yustam_api_error(404, 'Plan not found.');
    }

    $reference = 'YUSTAM-MANUAL-' . strtoupper(yustam_api_random_string(8));
    $db = get_db_connection();

    try {
        $result = yustam_vendor_subscription_process_payment($db, $vendorId, $reference, $planSlug, 1);
    } catch (Throwable $exception) {
        yustam_api_error(500, 'Unable to activate the selected plan.');
    }

    return [
        'success' => true,
        'subscription' => $result['subscription'] ?? null,
        'reference' => $reference,
    ];
}

function yustam_api_plan_checkout(string $planSlug): array
{
    $user = yustam_api_require_auth(['vendor', 'admin']);
    $vendorId = $user['role'] === 'vendor'
        ? (int) ($user['vendorId'] ?? 0)
        : (int) ($_GET['vendor'] ?? 0);
    if ($vendorId <= 0) {
        yustam_api_error(404, 'Vendor profile not found.');
    }

    $body = yustam_api_read_json_body();
    $months = isset($body['months']) ? max(1, (int) $body['months']) : 1;
    $planDetails = yustam_vendor_subscription_plan_lookup($planSlug, $months);
    if (!$planDetails) {
        yustam_api_error(404, 'Plan or billing interval not found.');
    }

    $planCode = $planDetails['planCode'] ?? '';
    if ($planCode === '') {
        yustam_api_error(400, 'Selected plan is not configured for Paystack.');
    }

    $email = trim((string) ($user['email'] ?? ''));
    if ($email === '') {
        yustam_api_error(400, 'Vendor account does not have an email address.');
    }

    $amountNaira = (float) ($planDetails['amount'] ?? $planDetails['monthlyPrice'] ?? 0);
    $reference = sprintf(
        'YUSTAM-V%d-%s-%d',
        $vendorId,
        strtoupper(bin2hex(random_bytes(4))),
        time()
    );

    $payload = [
        'email' => $email,
        'plan' => $planCode,
        'reference' => $reference,
        'metadata' => [
            'vendor_id' => $vendorId,
            'plan_slug' => $planDetails['slug'] ?? $planSlug,
            'duration_months' => (int) ($planDetails['durationMonths'] ?? $months),
            'source' => 'mobile-app',
        ],
    ];

    if ($amountNaira > 0) {
        $payload['amount'] = (int) round($amountNaira * 100);
    }

    $callback = yustam_api_env('PAYSTACK_SUBSCRIPTION_CALLBACK');
    if ($callback) {
        $payload['callback_url'] = $callback;
    }

    try {
        $response = yustam_paystack_request('POST', 'transaction/initialize', $payload);
    } catch (Throwable $exception) {
        yustam_api_error(502, $exception->getMessage());
    }

    $authorizationUrl = $response['authorization_url'] ?? null;
    if (!$authorizationUrl) {
        yustam_api_error(500, 'Unable to start Paystack checkout.');
    }

    return [
        'success' => true,
        'checkout' => [
            'authorizationUrl' => $authorizationUrl,
            'accessCode' => $response['access_code'] ?? null,
            'reference' => $response['reference'] ?? $reference,
        ],
    ];
}

function yustam_api_plan_auto_renew(): array
{
    $user = yustam_api_require_auth(['vendor', 'admin']);
    $vendorId = $user['role'] === 'vendor'
        ? (int) ($user['vendorId'] ?? 0)
        : (int) ($_GET['vendor'] ?? 0);
    if ($vendorId <= 0) {
        yustam_api_error(404, 'Vendor profile not found.');
    }

    $body = yustam_api_read_json_body();
    $rawValue = $body['enabled'] ?? ($body['enable'] ?? $body['value'] ?? null);
    if ($rawValue === null) {
        yustam_api_error(400, 'enabled flag is required.');
    }
    $normalized = is_bool($rawValue)
        ? $rawValue
        : in_array(strtolower((string) $rawValue), ['1', 'true', 'yes', 'on'], true);

    $db = get_db_connection();
    try {
        $result = yustam_vendor_subscription_set_autorenew($db, $vendorId, $normalized);
    } catch (Throwable $exception) {
        yustam_api_error(400, $exception->getMessage());
    }

    return [
        'success' => true,
        'autoRenew' => $result['autoRenew'],
        'subscription' => $result['subscription'],
    ];
}

function yustam_api_plan_cancel(): array
{
    $user = yustam_api_require_auth(['vendor', 'admin']);
    $vendorId = $user['role'] === 'vendor'
        ? (int) ($user['vendorId'] ?? 0)
        : (int) ($_GET['vendor'] ?? 0);
    if ($vendorId <= 0) {
        yustam_api_error(404, 'Vendor profile not found.');
    }

    $body = yustam_api_read_json_body();
    $reason = trim((string) ($body['reason'] ?? $body['note'] ?? ''));

    $db = get_db_connection();
    try {
        $result = yustam_vendor_subscription_cancel($db, $vendorId, $reason);
    } catch (Throwable $exception) {
        yustam_api_error(400, $exception->getMessage());
    }

    return [
        'success' => true,
        'message' => 'Auto-renewal has been cancelled. You keep your benefits until this cycle ends.',
        'subscription' => $result['subscription'],
    ];
}

function yustam_api_vendor_refresh_subscription(): array
{
    $user = yustam_api_require_auth(['vendor', 'admin']);
    $body = yustam_api_read_json_body();
    $vendorId = $user['role'] === 'vendor'
        ? (int) ($user['vendorId'] ?? 0)
        : (int) ($body['vendorId'] ?? $body['vendor'] ?? 0);
    if ($vendorId <= 0) {
        yustam_api_error(404, 'Vendor profile not found.');
    }

    $providedCode = trim((string) ($body['subscriptionCode'] ?? $body['code'] ?? ''));

    $db = get_db_connection();
    try {
        $result = yustam_vendor_subscription_refresh($db, $vendorId, $providedCode !== '' ? $providedCode : null);
    } catch (Throwable $exception) {
        yustam_api_error(400, $exception->getMessage());
    }

    return [
        'success' => true,
        'subscription' => $result['subscription'],
    ];
}

function yustam_vendor_settings_directory(): string
{
    return dirname(__DIR__) . '/data/vendor-settings';
}

function yustam_vendor_settings_file(int $vendorId): string
{
    return rtrim(yustam_vendor_settings_directory(), '/\\') . '/vendor_' . $vendorId . '.json';
}

function yustam_vendor_settings_defaults(): array
{
    return [
        'pushNotifications' => true,
        'emailNotifications' => true,
        'smsNotifications' => false,
        'listingApprovals' => true,
        'newMessages' => false,
        'planExpiry' => true,
        'marketingEmails' => true,
        'twoFactorAuth' => false,
        'loginAlerts' => true,
        'publicProfile' => true,
        'showEmail' => false,
        'showPhone' => false,
    ];
}

function yustam_vendor_settings_legacy_map(): array
{
    return [
        'notifApproved' => 'listingApprovals',
        'notifPlanExpiry' => 'planExpiry',
        'notifBuyerMsg' => 'newMessages',
        'notifUpdates' => 'marketingEmails',
        'twoFactor' => 'twoFactorAuth',
        'loginAlert' => 'loginAlerts',
    ];
}

function yustam_vendor_settings_bool($value, bool $fallback): bool
{
    if (is_bool($value)) {
        return $value;
    }
    if (is_numeric($value)) {
        return (int) $value === 1;
    }
    if (is_string($value)) {
        $normalized = strtolower(trim($value));
        if (in_array($normalized, ['1', 'true', 'yes', 'on', 'enabled'], true)) {
            return true;
        }
        if (in_array($normalized, ['0', 'false', 'no', 'off', 'disabled'], true)) {
            return false;
        }
    }
    return $fallback;
}

function yustam_vendor_settings_load(int $vendorId): array
{
    $defaults = yustam_vendor_settings_defaults();
    $state = $defaults;
    $file = yustam_vendor_settings_file($vendorId);
    if (is_file($file)) {
        $decoded = json_decode((string) @file_get_contents($file), true);
        if (is_array($decoded)) {
            foreach ($defaults as $key => $defaultValue) {
                if (array_key_exists($key, $decoded)) {
                    $state[$key] = yustam_vendor_settings_bool($decoded[$key], $defaultValue);
                }
            }
            foreach (yustam_vendor_settings_legacy_map() as $legacy => $target) {
                if (array_key_exists($legacy, $decoded) && !array_key_exists($target, $decoded)) {
                    $state[$target] = yustam_vendor_settings_bool($decoded[$legacy], $state[$target]);
                }
            }
        }
    }
    return $state;
}

function yustam_vendor_settings_save(int $vendorId, array $state): array
{
    $defaults = yustam_vendor_settings_defaults();
    $normalized = $defaults;
    foreach ($defaults as $key => $defaultValue) {
        if (array_key_exists($key, $state)) {
            $normalized[$key] = yustam_vendor_settings_bool($state[$key], $defaultValue);
        }
    }
    $payload = $normalized;
    foreach (yustam_vendor_settings_legacy_map() as $legacy => $target) {
        $payload[$legacy] = $payload[$target];
    }
    $directory = yustam_vendor_settings_directory();
    if (!is_dir($directory) && !mkdir($directory, 0755, true) && !is_dir($directory)) {
        yustam_api_error(500, 'Unable to prepare settings directory.');
    }
    $file = yustam_vendor_settings_file($vendorId);
    $json = json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
    if ($json === false || @file_put_contents($file, $json) === false) {
        yustam_api_error(500, 'Unable to save your settings.');
    }
    return $normalized;
}

function yustam_api_vendor_get_settings(): array
{
    $vendor = yustam_api_require_auth('vendor');
    $vendorId = (int) ($vendor['vendorId'] ?? 0);
    if ($vendorId <= 0) {
        yustam_api_error(404, 'Vendor profile not found.');
    }
    $settings = yustam_vendor_settings_load($vendorId);
    return [
        'success' => true,
        'settings' => $settings,
    ];
}

function yustam_api_vendor_update_settings(): array
{
    $vendor = yustam_api_require_auth('vendor');
    $vendorId = (int) ($vendor['vendorId'] ?? 0);
    if ($vendorId <= 0) {
        yustam_api_error(404, 'Vendor profile not found.');
    }
    $payload = yustam_api_read_json_body();
    if (!is_array($payload)) {
        yustam_api_error(400, 'Invalid payload.');
    }
    $allowedKeys = array_keys(yustam_vendor_settings_defaults());
    $updates = [];
    foreach ($allowedKeys as $key) {
        if (array_key_exists($key, $payload)) {
            $updates[$key] = $payload[$key];
        }
    }
    if (!$updates) {
        $settings = yustam_vendor_settings_load($vendorId);
        return [
            'success' => true,
            'settings' => $settings,
        ];
    }
    $current = yustam_vendor_settings_load($vendorId);
    $merged = array_merge($current, $updates);
    $settings = yustam_vendor_settings_save($vendorId, $merged);
    return [
        'success' => true,
        'settings' => $settings,
        'message' => 'Settings updated successfully.',
    ];
}

function yustam_api_vendor_change_password(): array
{
    $vendor = yustam_api_require_auth('vendor');
    $vendorId = (int) ($vendor['vendorId'] ?? 0);
    if ($vendorId <= 0) {
        yustam_api_error(404, 'Vendor account not found.');
    }
    $body = yustam_api_read_json_body();
    $currentPassword = trim((string) ($body['current_password'] ?? $body['currentPassword'] ?? ''));
    $newPassword = trim((string) ($body['new_password'] ?? $body['newPassword'] ?? ''));
    $confirmPassword = trim((string) ($body['confirm_password'] ?? $body['confirmPassword'] ?? ''));

    if ($newPassword === '' || $confirmPassword === '') {
        yustam_api_error(400, 'Enter and confirm your new password.');
    }
    if ($newPassword !== $confirmPassword) {
        yustam_api_error(400, 'New passwords do not match.');
    }
    if (strlen($newPassword) < 6) {
        yustam_api_error(400, 'Password must be at least 6 characters.');
    }
    if ($currentPassword !== '' && $currentPassword === $newPassword) {
        yustam_api_error(400, 'Choose a password different from the current one.');
    }

    $db = get_db_connection();
    $vendorRow = yustam_vendor_find_by_id($vendorId, $db);
    if (!$vendorRow) {
        yustam_api_error(404, 'Vendor account not found.');
    }
    $email = strtolower(trim((string) ($vendorRow['email'] ?? '')));
    if ($email === '') {
        yustam_api_error(400, 'This account does not have an email address on file.');
    }
    $provider = strtolower(trim((string) ($vendorRow['provider'] ?? '')));
    $requiresCurrent = true;

    $hasPasswordColumn = yustam_vendor_table_has_column('password');
    $storedPassword = $hasPasswordColumn ? (string) ($vendorRow['password'] ?? '') : '';

    if (!$hasPasswordColumn) {
        yustam_api_error(500, 'Password storage is not configured for this account.');
    }
    if ($storedPassword === '') {
        $requiresCurrent = false;
    }
    if (!in_array($provider, ['email', 'password'], true)) {
        $requiresCurrent = false;
    }
    if ($requiresCurrent && $currentPassword === '') {
        yustam_api_error(400, 'Enter your current password to continue.');
    }

    $verifiedFirebaseUid = '';
    if ($requiresCurrent) {
        try {
            $authResponse = yustam_firebase_sign_in_with_password($email, $currentPassword);
            $verifiedFirebaseUid = (string) ($authResponse['localId'] ?? '');
        } catch (YustamFirebaseAuthException $authError) {
            yustam_api_error(400, 'Current password is incorrect.');
        } catch (Throwable $authError) {
            error_log('Vendor password update: unable to verify current password for vendor ' . $vendorId . ': ' . $authError->getMessage());
            yustam_api_error(500, 'Unable to verify your current password right now. Please try again.');
        }
    }

    $firebaseUid = trim((string) ($vendorRow['firebase_uid'] ?? ''));
    if ($firebaseUid === '' && $verifiedFirebaseUid !== '') {
        $firebaseUid = $verifiedFirebaseUid;
        try {
            yustam_vendor_set_firebase_uid($vendorId, $firebaseUid, $db);
        } catch (Throwable $syncError) {
            error_log('Vendor password update: unable to store Firebase UID for vendor ' . $vendorId . ': ' . $syncError->getMessage());
        }
    }
    if ($firebaseUid === '') {
        try {
            $firebaseRecord = yustam_firebase_get_user_by_email($email);
            if (is_array($firebaseRecord) && !empty($firebaseRecord['localId'])) {
                $firebaseUid = (string) $firebaseRecord['localId'];
                try {
                    yustam_vendor_set_firebase_uid($vendorId, $firebaseUid, $db);
                } catch (Throwable $syncError) {
                    error_log('Vendor password update: unable to store Firebase UID lookup for vendor ' . $vendorId . ': ' . $syncError->getMessage());
                }
            }
        } catch (Throwable $lookupError) {
            error_log('Vendor password update: unable to lookup Firebase account for vendor ' . $vendorId . ': ' . $lookupError->getMessage());
        }
    }
    if ($firebaseUid === '') {
        yustam_api_error(500, 'Unable to locate your authentication record. Please contact support.');
    }

    try {
        yustam_firebase_update_user_password($firebaseUid, $newPassword);
    } catch (YustamFirebaseAuthException $firebaseError) {
        yustam_api_error(400, $firebaseError->getMessage());
    } catch (Throwable $firebaseError) {
        error_log('Vendor password update: unable to update Firebase password for vendor ' . $vendorId . ': ' . $firebaseError->getMessage());
        yustam_api_error(500, 'Unable to update your password right now. Please try again.');
    }

    $setParts = [];
    $types = '';
    $values = [];
    $passwordHash = password_hash($newPassword, PASSWORD_DEFAULT);
    if ($hasPasswordColumn) {
        $setParts[] = '`password` = ?';
        $types .= 's';
        $values[] = $passwordHash;
    }
    if (yustam_vendor_table_has_column('provider')) {
        $setParts[] = '`provider` = ?';
        $types .= 's';
        $values[] = 'email';
    }
    if (yustam_vendor_table_has_column('updated_at')) {
        $setParts[] = '`updated_at` = NOW()';
    }
    if (!$setParts) {
        yustam_api_error(500, 'Unable to update your account record.');
    }
    $types .= 'i';
    $values[] = $vendorId;
    $sql = sprintf(
        'UPDATE `%s` SET %s WHERE id = ? LIMIT 1',
        YUSTAM_VENDORS_TABLE,
        implode(', ', $setParts)
    );
    $stmt = $db->prepare($sql);
    if (!$stmt) {
        yustam_api_error(500, 'Unable to update your account record.');
    }
    $params = [$types];
    foreach ($values as $index => $value) {
        $params[] = &$values[$index];
    }
    call_user_func_array([$stmt, 'bind_param'], $params);
    $stmt->execute();
    $stmt->close();

    return [
        'success' => true,
        'message' => 'Password updated successfully.',
    ];
}

function yustam_vendor_notifications_table_name(): string
{
    if (defined('YUSTAM_VENDOR_NOTIFICATIONS_TABLE')) {
        $configured = (string) YUSTAM_VENDOR_NOTIFICATIONS_TABLE;
        if (preg_match('/^[A-Za-z0-9_]+$/', $configured)) {
            return $configured;
        }
    }
    return 'vendor_notifications';
}

function yustam_vendor_notifications_bind(mysqli_stmt $stmt, string $types, array $values): void
{
    if ($types === '') {
        return;
    }
    $params = [$types];
    foreach ($values as $index => $value) {
        $params[] = &$values[$index];
    }
    call_user_func_array([$stmt, 'bind_param'], $params);
}

function yustam_vendor_notifications_ensure(mysqli $db): void
{
    static $ensured = false;
    if ($ensured) {
        return;
    }
    $table = yustam_vendor_notifications_table_name();
    $sql = sprintf(
        'CREATE TABLE IF NOT EXISTS `%s` (
            `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            `vendor_id` INT NOT NULL,
            `title` VARCHAR(255) NOT NULL,
            `message` VARCHAR(255) NOT NULL,
            `detail` TEXT NULL,
            `type` VARCHAR(32) NOT NULL DEFAULT \'bell\',
            `status` VARCHAR(16) NOT NULL DEFAULT \'new\',
            `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            `created_by` INT NULL,
            INDEX `vendor_id_index` (`vendor_id`),
            INDEX `status_index` (`status`),
            INDEX `created_at_index` (`created_at`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;',
        $table
    );
    try {
        $db->query($sql);
        $ensured = true;
    } catch (Throwable $exception) {
        error_log('Unable to ensure vendor notifications table: ' . $exception->getMessage());
    }
}

function yustam_api_vendor_notifications_list(): array
{
    $vendor = yustam_api_require_auth('vendor');
    $vendorId = (int) ($vendor['vendorId'] ?? 0);
    if ($vendorId <= 0) {
        yustam_api_error(404, 'Vendor profile not found.');
    }

    $db = get_db_connection();
    yustam_vendor_notifications_ensure($db);
    $table = yustam_vendor_notifications_table_name();
    $stmt = $db->prepare(sprintf('SELECT id, title, message, detail, type, status, created_at FROM `%s` WHERE vendor_id = ? ORDER BY created_at DESC', $table));
    if (!$stmt instanceof mysqli_stmt) {
        yustam_api_error(500, 'Unable to load notifications.');
    }
    yustam_vendor_notifications_bind($stmt, 'i', [$vendorId]);
    $stmt->execute();
    $result = $stmt->get_result();
    $notifications = [];
    $unreadCount = 0;
    if ($result instanceof mysqli_result) {
        while ($row = $result->fetch_assoc()) {
            $createdAt = (string) ($row['created_at'] ?? '');
            $createdLabel = '';
            if ($createdAt !== '') {
                $timestamp = strtotime($createdAt);
                if ($timestamp) {
                    $createdLabel = date('M j, Y g:i A', $timestamp);
                    $createdAt = date(DATE_ATOM, $timestamp);
                }
            }
            $status = strtolower((string) ($row['status'] ?? 'new')) === 'read' ? 'read' : 'new';
            if ($status === 'new') {
                $unreadCount++;
            }
            $notifications[] = [
                'id' => (int) ($row['id'] ?? 0),
                'title' => (string) ($row['title'] ?? ''),
                'message' => (string) ($row['message'] ?? ''),
                'detail' => (string) ($row['detail'] ?? ''),
                'type' => (string) ($row['type'] ?? 'bell'),
                'status' => $status,
                'createdAt' => $createdAt,
                'createdLabel' => $createdLabel,
            ];
        }
        $result->free();
    }
    $stmt->close();

    $total = count($notifications);
    $counts = [
        'total' => $total,
        'unread' => $unreadCount,
        'read' => max(0, $total - $unreadCount),
    ];

    return [
        'success' => true,
        'data' => [
            'notifications' => $notifications,
            'counts' => $counts,
        ],
    ];
}

function yustam_api_vendor_notifications_action(): array
{
    $vendor = yustam_api_require_auth('vendor');
    $vendorId = (int) ($vendor['vendorId'] ?? 0);
    if ($vendorId <= 0) {
        yustam_api_error(404, 'Vendor profile not found.');
    }
    $body = yustam_api_read_json_body();
    $action = strtolower(trim((string) ($body['action'] ?? '')));
    if ($action === '') {
        yustam_api_error(400, 'Action is required.');
    }

    $db = get_db_connection();
    yustam_vendor_notifications_ensure($db);
    $table = yustam_vendor_notifications_table_name();

    if ($action === 'markallread') {
        $stmt = $db->prepare(sprintf('UPDATE `%s` SET `status` = \'read\' WHERE vendor_id = ? AND `status` = \'new\'', $table));
        if ($stmt instanceof mysqli_stmt) {
            yustam_vendor_notifications_bind($stmt, 'i', [$vendorId]);
            $stmt->execute();
            $stmt->close();
        }
        return [
            'success' => true,
            'message' => 'Notifications marked as read.',
        ];
    }

    if ($action === 'clearall') {
        $stmt = $db->prepare(sprintf('DELETE FROM `%s` WHERE vendor_id = ?', $table));
        if ($stmt instanceof mysqli_stmt) {
            yustam_vendor_notifications_bind($stmt, 'i', [$vendorId]);
            $stmt->execute();
            $stmt->close();
        }
        return [
            'success' => true,
            'message' => 'Notifications cleared.',
        ];
    }

    if ($action === 'markread') {
        $notificationId = (int) ($body['notificationId'] ?? $body['id'] ?? 0);
        if ($notificationId <= 0) {
            yustam_api_error(422, 'notificationId is required.');
        }
        $stmt = $db->prepare(sprintf('UPDATE `%s` SET `status` = \'read\' WHERE vendor_id = ? AND id = ? LIMIT 1', $table));
        if ($stmt instanceof mysqli_stmt) {
            yustam_vendor_notifications_bind($stmt, 'ii', [$vendorId, $notificationId]);
            $stmt->execute();
            $stmt->close();
        }
        return [
            'success' => true,
            'message' => 'Notification marked as read.',
        ];
    }

    yustam_api_error(400, 'Unsupported notification action.');
}

/**
 * --------------------------------------------------------------------------
 * Vendor Rewards & Points
 * --------------------------------------------------------------------------
 */

function yustam_vendor_rewards_ensure_tables(mysqli $db): void
{
    static $ensured = false;
    if ($ensured) {
        return;
    }

    $snapshotSql = <<<SQL
CREATE TABLE IF NOT EXISTS `vendor_reward_snapshots` (
    `vendor_id` INT UNSIGNED NOT NULL,
    `balance` INT NOT NULL DEFAULT 0,
    `lifetime_earned` INT NOT NULL DEFAULT 0,
    `lifetime_redeemed` INT NOT NULL DEFAULT 0,
    `meta` TEXT NULL,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`vendor_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
SQL;

    $ledgerSql = <<<SQL
CREATE TABLE IF NOT EXISTS `vendor_reward_ledger` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `vendor_id` INT UNSIGNED NOT NULL,
    `points` INT NOT NULL,
    `direction` VARCHAR(16) NOT NULL,
    `reason` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `meta` TEXT NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `vendor_reward_ledger_vendor_idx` (`vendor_id`),
    INDEX `vendor_reward_ledger_direction_idx` (`direction`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
SQL;

    $db->query($snapshotSql);
    if ($db->errno) {
        error_log('Unable to ensure vendor_reward_snapshots table: ' . $db->error);
    }

    $db->query($ledgerSql);
    if ($db->errno) {
        error_log('Unable to ensure vendor_reward_ledger table: ' . $db->error);
    }

    $ensured = true;
}

function yustam_vendor_rewards_encode_meta(array $meta = []): string
{
    $encoded = json_encode($meta, YUSTAM_API_JSON_FLAGS);
    return $encoded !== false ? $encoded : '{}';
}

function yustam_vendor_rewards_snapshot_fetch(mysqli $db, int $vendorId): array
{
    yustam_vendor_rewards_ensure_tables($db);

    $defaults = [
        'vendor_id' => $vendorId,
        'balance' => 0,
        'lifetime_earned' => 0,
        'lifetime_redeemed' => 0,
        'meta' => null,
        'updated_at' => null,
    ];

    $stmt = $db->prepare('SELECT vendor_id, balance, lifetime_earned, lifetime_redeemed, meta, updated_at FROM `vendor_reward_snapshots` WHERE vendor_id = ? LIMIT 1');
    if (!($stmt instanceof mysqli_stmt)) {
        return $defaults;
    }

    $stmt->bind_param('i', $vendorId);
    $stmt->execute();
    $result = $stmt->get_result();
    $row = $result ? $result->fetch_assoc() : null;
    $stmt->close();

    if (!$row) {
        return $defaults;
    }

    if (isset($row['meta']) && is_string($row['meta'])) {
        $row['meta'] = json_decode($row['meta'], true);
    }

    return $row + $defaults;
}

function yustam_vendor_rewards_snapshot_save(mysqli $db, int $vendorId, int $balance, int $earned, int $redeemed, array $meta = []): void
{
    yustam_vendor_rewards_ensure_tables($db);
    $metaString = yustam_vendor_rewards_encode_meta($meta);

    $stmt = $db->prepare(
        'INSERT INTO `vendor_reward_snapshots` (vendor_id, balance, lifetime_earned, lifetime_redeemed, meta, updated_at)
         VALUES (?, ?, ?, ?, ?, NOW())
         ON DUPLICATE KEY UPDATE balance = VALUES(balance), lifetime_earned = VALUES(lifetime_earned), lifetime_redeemed = VALUES(lifetime_redeemed), meta = VALUES(meta), updated_at = NOW()'
    );

    if (!($stmt instanceof mysqli_stmt)) {
        error_log('Failed to prepare vendor_reward_snapshots upsert: ' . $db->error);
        return;
    }

    $stmt->bind_param('iiiis', $vendorId, $balance, $earned, $redeemed, $metaString);
    $stmt->execute();
    $stmt->close();
}

function yustam_vendor_rewards_record_event(mysqli $db, int $vendorId, int $points, string $direction, string $reason, string $description = '', array $meta = []): void
{
    $points = (int) $points;
    if ($points === 0 || $vendorId <= 0) {
        return;
    }

    $direction = strtolower($direction);
    if (!in_array($direction, ['earn', 'redeem', 'adjust'], true)) {
        $direction = $points >= 0 ? 'earn' : 'adjust';
    }

    $snapshot = yustam_vendor_rewards_snapshot_fetch($db, $vendorId);
    $currentBalance = (int) ($snapshot['balance'] ?? 0);
    $earned = (int) ($snapshot['lifetime_earned'] ?? 0);
    $redeemed = (int) ($snapshot['lifetime_redeemed'] ?? 0);

    $delta = $direction === 'redeem' ? -abs($points) : ($direction === 'earn' ? abs($points) : $points);
    $nextBalance = max(0, $currentBalance + $delta);
    if ($direction === 'earn' || ($direction === 'adjust' && $delta > 0)) {
        $earned += abs($delta);
    } elseif ($direction === 'redeem' || ($direction === 'adjust' && $delta < 0)) {
        $redeemed += abs($delta);
    }

    $metaPayload = $snapshot['meta'];
    if (!is_array($metaPayload)) {
        $metaPayload = [];
    }
    $metaPayload['lastEvent'] = [
        'direction' => $direction,
        'points' => $delta,
        'reason' => $reason,
        'description' => $description,
        'meta' => $meta,
        'timestamp' => gmdate('c'),
    ];

    yustam_vendor_rewards_snapshot_save($db, $vendorId, $nextBalance, $earned, $redeemed, $metaPayload);

    $metaString = yustam_vendor_rewards_encode_meta($meta);
    $stmt = $db->prepare('INSERT INTO `vendor_reward_ledger` (vendor_id, points, direction, reason, description, meta) VALUES (?, ?, ?, ?, ?, ?)');
    if (!($stmt instanceof mysqli_stmt)) {
        error_log('Failed to prepare vendor_reward_ledger insert: ' . $db->error);
        return;
    }

    $stmt->bind_param('iissss', $vendorId, $delta, $direction, $reason, $description, $metaString);
    $stmt->execute();
    $stmt->close();
}

function yustam_vendor_rewards_apply_snapshot(int $vendorId, array $pointsPayload, array $integrationSnapshot = []): void
{
    if ($vendorId <= 0 || empty($pointsPayload)) {
        return;
    }

    $db = get_db_connection();
    $metaBase = [
        'entryId' => $integrationSnapshot['entryId'] ?? null,
        'intent' => $integrationSnapshot['intent'] ?? null,
        'syncedAt' => $integrationSnapshot['syncedAt'] ?? time(),
    ];

    if (isset($pointsPayload['balance'])) {
        $targetBalance = (int) $pointsPayload['balance'];
        $snapshot = yustam_vendor_rewards_snapshot_fetch($db, $vendorId);
        $currentBalance = (int) ($snapshot['balance'] ?? 0);
        $difference = $targetBalance - $currentBalance;
        if ($difference !== 0) {
            $reason = $pointsPayload['balanceReason'] ?? 'balance-adjustment';
            $description = $pointsPayload['balanceDescription'] ?? 'YustaAI balance reconciliation';
            $meta = array_merge($metaBase, (array) ($pointsPayload['balanceMeta'] ?? []));
            $direction = $difference > 0 ? 'earn' : 'redeem';
            yustam_vendor_rewards_record_event($db, $vendorId, abs($difference), $direction, $reason, $description, $meta);
        }
    }

    if (isset($pointsPayload['earn'])) {
        $points = (int) $pointsPayload['earn'];
        if ($points > 0) {
            $reason = $pointsPayload['reason'] ?? 'ai-insight';
            $description = $pointsPayload['description'] ?? 'Reward points earned from YustaAI insights.';
            $meta = array_merge($metaBase, (array) ($pointsPayload['meta'] ?? []));
            yustam_vendor_rewards_record_event($db, $vendorId, $points, 'earn', $reason, $description, $meta);
        }
    }

    if (isset($pointsPayload['redeem'])) {
        $points = (int) $pointsPayload['redeem'];
        if ($points > 0) {
            $reason = $pointsPayload['redeemReason'] ?? ($pointsPayload['reason'] ?? 'reward-redemption');
            $description = $pointsPayload['redeemDescription'] ?? ($pointsPayload['description'] ?? 'Reward redemption synced from YustaAI.');
            $meta = array_merge($metaBase, (array) ($pointsPayload['redeemMeta'] ?? $pointsPayload['meta'] ?? []));
            yustam_vendor_rewards_record_event($db, $vendorId, $points, 'redeem', $reason, $description, $meta);
        }
    }

    if (!empty($pointsPayload['events']) && is_array($pointsPayload['events'])) {
        foreach ($pointsPayload['events'] as $event) {
            $points = (int) ($event['points'] ?? 0);
            if ($points === 0) {
                continue;
            }
            $direction = strtolower((string) ($event['direction'] ?? 'earn'));
            $reason = $event['reason'] ?? ($direction === 'redeem' ? 'reward-redemption' : 'ai-insight');
            $description = $event['description'] ?? '';
            $meta = array_merge($metaBase, (array) ($event['meta'] ?? []));
            yustam_vendor_rewards_record_event($db, $vendorId, $points, $direction, $reason, $description, $meta);
        }
    }
}

function yustam_vendor_rewards_get_summary(mysqli $db, int $vendorId): array
{
    $snapshot = yustam_vendor_rewards_snapshot_fetch($db, $vendorId);
    $summary = [
        'balance' => (int) ($snapshot['balance'] ?? 0),
        'lifetimeEarned' => (int) ($snapshot['lifetime_earned'] ?? 0),
        'lifetimeRedeemed' => (int) ($snapshot['lifetime_redeemed'] ?? 0),
        'updatedAt' => $snapshot['updated_at'] ?? null,
        'meta' => $snapshot['meta'] ?? null,
        'lastEarnedAt' => null,
        'lastRedeemedAt' => null,
    ];

    $stmt = $db->prepare('SELECT direction, created_at FROM `vendor_reward_ledger` WHERE vendor_id = ? ORDER BY created_at DESC LIMIT 20');
    if ($stmt instanceof mysqli_stmt) {
        $stmt->bind_param('i', $vendorId);
        $stmt->execute();
        $result = $stmt->get_result();
        if ($result instanceof mysqli_result) {
            while ($row = $result->fetch_assoc()) {
                $direction = strtolower((string) ($row['direction'] ?? ''));
                if ($direction === 'earn' && $summary['lastEarnedAt'] === null) {
                    $summary['lastEarnedAt'] = $row['created_at'] ?? null;
                }
                if ($direction === 'redeem' && $summary['lastRedeemedAt'] === null) {
                    $summary['lastRedeemedAt'] = $row['created_at'] ?? null;
                }
                if ($summary['lastEarnedAt'] && $summary['lastRedeemedAt']) {
                    break;
                }
            }
        }
        $stmt->close();
    }

    return $summary;
}

function yustam_vendor_rewards_get_ledger(mysqli $db, int $vendorId, int $limit = 20): array
{
    yustam_vendor_rewards_ensure_tables($db);
    $limit = max(1, min(100, $limit));

    $stmt = $db->prepare('SELECT id, points, direction, reason, description, meta, created_at FROM `vendor_reward_ledger` WHERE vendor_id = ? ORDER BY created_at DESC LIMIT ?');
    if (!($stmt instanceof mysqli_stmt)) {
        error_log('Failed to prepare vendor_reward_ledger select: ' . $db->error);
        return [];
    }

    $stmt->bind_param('ii', $vendorId, $limit);
    $stmt->execute();
    $result = $stmt->get_result();
    $entries = [];
    if ($result instanceof mysqli_result) {
        while ($row = $result->fetch_assoc()) {
            $meta = [];
            if (isset($row['meta']) && is_string($row['meta']) && $row['meta'] !== '') {
                $decoded = json_decode($row['meta'], true);
                if (is_array($decoded)) {
                    $meta = $decoded;
                }
            }
            $entries[] = [
                'id' => (int) ($row['id'] ?? 0),
                'points' => (int) ($row['points'] ?? 0),
                'direction' => strtolower((string) ($row['direction'] ?? 'adjust')),
                'reason' => $row['reason'] ?? '',
                'description' => $row['description'] ?? '',
                'meta' => $meta,
                'createdAt' => $row['created_at'] ?? null,
            ];
        }
    }
    $stmt->close();

    return $entries;
}

function yustam_api_vendor_points_summary(): array
{
    $auth = yustam_api_require_auth(['vendor', 'admin']);
    $vendorId = $auth['role'] === 'vendor'
        ? (int) ($auth['vendorId'] ?? 0)
        : (int) ($_GET['vendorId'] ?? $_GET['vendor'] ?? 0);

    if ($vendorId <= 0) {
        yustam_api_error(404, 'Vendor not found.');
    }

    $db = get_db_connection();
    $summary = yustam_vendor_rewards_get_summary($db, $vendorId);
    $ledger = yustam_vendor_rewards_get_ledger($db, $vendorId, 20);

    return [
        'success' => true,
        'data' => [
            'summary' => $summary,
            'ledger' => $ledger,
        ],
    ];
}

function yustam_api_vendor_points_ledger(): array
{
    $auth = yustam_api_require_auth(['vendor', 'admin']);
    $vendorId = $auth['role'] === 'vendor'
        ? (int) ($auth['vendorId'] ?? 0)
        : (int) ($_GET['vendorId'] ?? $_GET['vendor'] ?? 0);

    if ($vendorId <= 0) {
        yustam_api_error(404, 'Vendor not found.');
    }

    $limit = isset($_GET['limit']) ? (int) $_GET['limit'] : 50;
    $db = get_db_connection();
    $ledger = yustam_vendor_rewards_get_ledger($db, $vendorId, $limit);

    return [
        'success' => true,
        'data' => $ledger,
    ];
}

function yustam_api_vendor_points_redeem(): array
{
    $auth = yustam_api_require_auth('vendor');
    $vendorId = (int) ($auth['vendorId'] ?? 0);
    if ($vendorId <= 0) {
        yustam_api_error(404, 'Vendor not found.');
    }

    $body = yustam_api_read_json_body();
    $points = (int) ($body['points'] ?? 0);
    if ($points <= 0) {
        yustam_api_error(422, 'A positive points value is required.');
    }

    $reason = trim((string) ($body['reason'] ?? 'reward-redemption'));
    $description = trim((string) ($body['description'] ?? ''));
    $meta = is_array($body['meta'] ?? null) ? $body['meta'] : [];

    $db = get_db_connection();
    $summary = yustam_vendor_rewards_get_summary($db, $vendorId);
    if ($points > (int) ($summary['balance'] ?? 0)) {
        yustam_api_error(409, 'Insufficient reward points.');
    }

    yustam_vendor_rewards_record_event($db, $vendorId, $points, 'redeem', $reason !== '' ? $reason : 'reward-redemption', $description, $meta);

    $updatedSummary = yustam_vendor_rewards_get_summary($db, $vendorId);
    $ledger = yustam_vendor_rewards_get_ledger($db, $vendorId, 20);

    return [
        'success' => true,
        'message' => 'Redemption successful.',
        'data' => [
            'summary' => $updatedSummary,
            'ledger' => $ledger,
        ],
    ];
}

function yustam_api_vendor_table_exists(mysqli $db, string $table): bool
{
    if (!preg_match('/^[A-Za-z0-9_]+$/', $table)) {
        return false;
    }
    $escaped = $db->real_escape_string($table);
    $sql = sprintf("SHOW TABLES LIKE '%s'", $escaped);
    $result = $db->query($sql);
    if ($result instanceof mysqli_result) {
        $exists = $result->num_rows > 0;
        $result->free();
        return $exists;
    }
    return false;
}

function yustam_api_vendor_delete_account(): array
{
    $vendor = yustam_api_require_auth('vendor');
    $vendorId = (int) ($vendor['vendorId'] ?? 0);
    if ($vendorId <= 0) {
        yustam_api_error(404, 'Unable to determine your account.');
    }
    $body = yustam_api_read_json_body();
    $password = trim((string) ($body['password'] ?? $body['current_password'] ?? ''));
    if ($password === '') {
        yustam_api_error(400, 'Please enter your password to confirm.');
    }

    $db = get_db_connection();
    $vendorRow = yustam_vendor_find_by_id($vendorId, $db);
    if (!$vendorRow) {
        yustam_api_error(404, 'This account no longer exists.');
    }

    $vendorEmail = trim((string) ($vendorRow['email'] ?? ''));
    if ($vendorEmail !== '') {
        try {
            yustam_firebase_sign_in_with_password($vendorEmail, $password);
        } catch (YustamFirebaseAuthException $authError) {
            yustam_api_error(400, 'Password is incorrect.');
        } catch (Throwable $authError) {
            error_log('Vendor deletion: unable to verify password for vendor ' . $vendorId . ': ' . $authError->getMessage());
            yustam_api_error(500, 'Unable to verify your password right now. Please try again.');
        }
    }

    $firebaseUid = trim((string) ($vendorRow['firebase_uid'] ?? ''));
    $vendorUid = trim((string) ($vendorRow['vendor_uid'] ?? ''));
    $settingsFile = yustam_vendor_settings_file($vendorId);

    $db->begin_transaction();
    try {
        if (yustam_api_vendor_table_exists($db, 'listings')) {
            $deleteListings = $db->prepare('DELETE FROM `listings` WHERE vendor_id = ?');
            if ($deleteListings) {
                $deleteListings->bind_param('i', $vendorId);
                $deleteListings->execute();
                $deleteListings->close();
            }
        }
        if (yustam_api_vendor_table_exists($db, 'password_resets')) {
            $deleteResets = $db->prepare('DELETE FROM `password_resets` WHERE user_id = ?');
            if ($deleteResets) {
                $deleteResets->bind_param('i', $vendorId);
                $deleteResets->execute();
                $deleteResets->close();
            }
        }
        $notificationsTable = yustam_vendor_notifications_table();
        if ($notificationsTable !== '' && yustam_api_vendor_table_exists($db, $notificationsTable)) {
            $deleteNotifications = $db->prepare(sprintf('DELETE FROM `%s` WHERE vendor_id = ?', $notificationsTable));
            if ($deleteNotifications instanceof mysqli_stmt) {
                $deleteNotifications->bind_param('i', $vendorId);
                $deleteNotifications->execute();
                $deleteNotifications->close();
            }
        }
        $deleteVendor = $db->prepare(sprintf('DELETE FROM `%s` WHERE id = ?', YUSTAM_VENDORS_TABLE));
        if ($deleteVendor === false) {
            throw new RuntimeException('Unable to prepare vendor deletion statement.');
        }
        $deleteVendor->bind_param('i', $vendorId);
        $deleteVendor->execute();
        $deleteVendor->close();
        $db->commit();
    } catch (Throwable $deletionError) {
        $db->rollback();
        error_log('Vendor deletion failed for vendor ' . $vendorId . ': ' . $deletionError->getMessage());
        yustam_api_error(500, 'We could not delete your account. Please try again.');
    }

    if (is_file($settingsFile)) {
        @unlink($settingsFile);
    }

    $potentialIds = array_filter([
        $firebaseUid,
        $vendorUid,
        $vendorEmail,
        (string) $vendorId,
    ], static fn($id) => $id !== '');

    foreach ($potentialIds as $firestoreId) {
        try {
            yustam_firestore_delete_document('vendors/' . $firestoreId);
        } catch (Throwable $firestoreError) {
            error_log('Vendor deletion: unable to delete Firestore vendor document ' . $firestoreId . ': ' . $firestoreError->getMessage());
        }
    }

    if ($vendorUid !== '' || $firebaseUid !== '') {
        try {
            $vendorQueryId = $firebaseUid !== '' ? $firebaseUid : $vendorUid;
            $listingsQuery = [
                'structuredQuery' => [
                    'from' => [['collectionId' => 'listings']],
                    'where' => [
                        'fieldFilter' => [
                            'field' => ['fieldPath' => 'vendorId'],
                            'op' => 'EQUAL',
                            'value' => yustam_firestore_string($vendorQueryId),
                        ],
                    ],
                    'select' => [
                        'fields' => [
                            ['fieldPath' => '__name__'],
                        ],
                    ],
                ],
            ];
            $listingResults = yustam_firestore_run_query($listingsQuery);
            foreach ($listingResults as $result) {
                if (isset($result['document']['name'])) {
                    $listingPath = yustam_firestore_relative_path($result['document']['name']);
                    try {
                        yustam_firestore_delete_document($listingPath);
                    } catch (Throwable $listingDeleteError) {
                        error_log('Vendor deletion: unable to delete Firestore listing ' . $listingPath . ': ' . $listingDeleteError->getMessage());
                    }
                }
            }
        } catch (Throwable $listingsError) {
            error_log('Vendor deletion: unable to query/delete Firestore listings for vendor ' . $vendorId . ': ' . $listingsError->getMessage());
        }
    }

    if ($firebaseUid !== '') {
        try {
            yustam_firebase_delete_user($firebaseUid);
        } catch (Throwable $firebaseError) {
            error_log('Vendor deletion: unable to delete Firebase account for vendor ' . $vendorId . ': ' . $firebaseError->getMessage());
        }
    }

    return [
        'success' => true,
        'message' => 'Your vendor account has been deleted.',
    ];
}

function yustam_api_plan_callback(): array
{
    $raw = file_get_contents('php://input') ?: '';
    $parsed = json_decode($raw, true);
    $body = [];
    if (is_array($parsed)) {
        $body = $parsed['data'] ?? $parsed;
    } elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $body = $_POST;
    } else {
        $body = $_GET;
    }

    $reference = trim((string) ($body['reference'] ?? $body['trxref'] ?? $_GET['reference'] ?? $_GET['trxref'] ?? ''));
    if ($reference === '') {
        yustam_api_error(400, 'Transaction reference is required.');
    }

    $vendorId = 0;
    $metadata = $body['metadata'] ?? ($body['data']['metadata'] ?? null);
    if (is_string($metadata)) {
        $decoded = json_decode($metadata, true);
        if (is_array($decoded)) {
            $metadata = $decoded;
        }
    }
    if (is_array($metadata)) {
        $vendorId = (int) ($metadata['vendor_id'] ?? $metadata['vendorId'] ?? 0);
        if ($vendorId <= 0 && isset($metadata['vendor'])) {
            [$role, $id] = yustam_api_parse_user_reference((string) $metadata['vendor']);
            if ($role === 'vendor') {
                $vendorId = $id;
            }
        }
    }

    if ($vendorId <= 0 && preg_match('/YUSTAM-V(\d+)-/i', $reference, $matches)) {
        $vendorId = (int) $matches[1];
    }

    if ($vendorId <= 0) {
        try {
            $transaction = yustam_paystack_verify_transaction($reference);
            $meta = $transaction['metadata'] ?? ($transaction['data']['metadata'] ?? null);
            if (is_string($meta)) {
                $decoded = json_decode($meta, true);
                if (is_array($decoded)) {
                    $meta = $decoded;
                }
            }
            if (is_array($meta)) {
                $vendorId = (int) ($meta['vendor_id'] ?? $meta['vendorId'] ?? 0);
                if ($vendorId <= 0 && isset($meta['vendor'])) {
                    [$role, $id] = yustam_api_parse_user_reference((string) $meta['vendor']);
                    if ($role === 'vendor') {
                        $vendorId = $id;
                    }
                }
            }
        } catch (Throwable $exception) {
            yustam_api_error(400, 'Unable to verify transaction reference.');
        }
    }

    if ($vendorId <= 0) {
        yustam_api_error(400, 'Vendor identifier missing.');
    }

    $db = get_db_connection();
    try {
        $result = yustam_vendor_subscription_process_payment($db, $vendorId, $reference);
    } catch (Throwable $exception) {
        yustam_api_error(400, $exception->getMessage());
    }

    $payload = [
        'success' => true,
        'subscription' => $result['subscription'] ?? null,
    ];

    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        header('Content-Type: text/html; charset=utf-8');
        echo '<!doctype html><html><head>';
        echo '<meta name="viewport" content="width=device-width, initial-scale=1">';
        echo '<title>Payment Complete</title>';
        echo '<style>body{font-family:Arial,sans-serif;padding:24px;text-align:center;color:#0F6A53;}button{margin-top:20px;padding:10px 20px;border:none;background:#0F6A53;color:#fff;border-radius:6px;font-size:16px;}p{font-size:16px;margin-top:16px;}</style>';
        echo '</head><body>';
        echo '<h1>Payment Verified</h1>';
        echo '<p>You can close this window and return to the app.</p>';
        echo '<button onclick="window.close()">Close</button>';
        echo '<script>setTimeout(function(){window.close();},4000);</script>';
        echo '</body></html>';
        return $payload;
    }

    return $payload;
}

function yustam_api_handle_subscription(string $method, array $segments): array
{
    $action = strtolower($segments[0] ?? 'status');
    if ($action === '' && $method === 'GET') {
        $action = 'status';
    }
    if ($action === 'status' && $method === 'GET') {
        return yustam_api_subscription_status();
    }
    if ($action === 'toggle-autorenew' && $method === 'POST') {
        return yustam_api_subscription_toggle_autorenew();
    }
    if ($action === 'cancel' && $method === 'POST') {
        return yustam_api_subscription_cancel();
    }
    yustam_api_error(404, 'Subscription endpoint not found.');
}

function yustam_api_subscription_status(): array
{
    $user = yustam_api_require_auth(['vendor', 'admin']);
    $vendorId = $user['role'] === 'vendor'
        ? (int) ($user['vendorId'] ?? 0)
        : (int) ($_GET['vendor'] ?? 0);
    if ($vendorId <= 0) {
        yustam_api_error(404, 'Vendor profile not found.');
    }
    $db = get_db_connection();
    $record = yustam_vendor_subscription_record_fetch($db, $vendorId);
    $vendor = yustam_vendor_subscription_fetch_vendor($db, $vendorId);
    if ((!$record || empty($record['subscription_code'])) && $vendor) {
        try {
            if (yustam_vendor_subscription_sync_remote_reference($db, $vendor)) {
                $record = yustam_vendor_subscription_record_fetch($db, $vendorId);
                $vendor = yustam_vendor_subscription_fetch_vendor($db, $vendorId);
            }
        } catch (Throwable $syncError) {
            error_log('Subscription status sync failed: ' . $syncError->getMessage());
        }
    }
    $status = yustam_vendor_subscription_record_format_status($record, $vendor);
    return [
        'success' => true,
        'subscription' => $status,
    ];
}

function yustam_api_subscription_toggle_autorenew(): array
{
    $user = yustam_api_require_auth(['vendor', 'admin']);
    $vendorId = $user['role'] === 'vendor'
        ? (int) ($user['vendorId'] ?? 0)
        : (int) ($_GET['vendor'] ?? 0);
    if ($vendorId <= 0) {
        yustam_api_error(404, 'Vendor profile not found.');
    }
    $body = yustam_api_read_json_body();
    $rawValue = $body['enabled'] ?? ($body['enable'] ?? $body['value'] ?? null);
    if ($rawValue === null) {
        yustam_api_error(400, 'enabled flag is required.');
    }
    $normalized = is_bool($rawValue)
        ? $rawValue
        : in_array(strtolower((string) $rawValue), ['1', 'true', 'yes', 'on'], true);
    $db = get_db_connection();
    try {
        yustam_vendor_subscription_set_autorenew($db, $vendorId, $normalized);
    } catch (Throwable $exception) {
        yustam_api_error(400, $exception->getMessage());
    }
    $record = yustam_vendor_subscription_record_fetch($db, $vendorId);
    $vendor = yustam_vendor_subscription_fetch_vendor($db, $vendorId);
    $status = yustam_vendor_subscription_record_format_status($record, $vendor);
    return [
        'success' => true,
        'autoRenew' => (bool) ($status['auto_renew'] ?? false),
        'subscription' => $status,
    ];
}

function yustam_api_subscription_cancel(): array
{
    $user = yustam_api_require_auth(['vendor', 'admin']);
    $vendorId = $user['role'] === 'vendor'
        ? (int) ($user['vendorId'] ?? 0)
        : (int) ($_GET['vendor'] ?? 0);
    if ($vendorId <= 0) {
        yustam_api_error(404, 'Vendor profile not found.');
    }
    $body = yustam_api_read_json_body();
    $reason = trim((string) ($body['reason'] ?? $body['note'] ?? ''));
    $db = get_db_connection();
    try {
        yustam_vendor_subscription_cancel($db, $vendorId, $reason);
    } catch (Throwable $exception) {
        yustam_api_error(400, $exception->getMessage());
    }
    $record = yustam_vendor_subscription_record_fetch($db, $vendorId);
    $vendor = yustam_vendor_subscription_fetch_vendor($db, $vendorId);
    $status = yustam_vendor_subscription_record_format_status($record, $vendor);
    return [
        'success' => true,
        'message' => 'Auto-renewal has been cancelled. You keep your benefits until this cycle ends.',
        'subscription' => $status,
    ];
}

function yustam_api_handle_paystack(string $method, array $segments): array
{
    $action = strtolower($segments[0] ?? '');
    if ($action === 'webhook' && $method === 'POST') {
        return yustam_api_paystack_webhook();
    }
    yustam_api_error(404, 'Paystack endpoint not found.');
}

function yustam_api_paystack_webhook(): array
{
    $secret = yustam_api_env('PAYSTACK_SECRET_KEY');
    if (!$secret) {
        yustam_api_error(500, 'Paystack secret is not configured.');
    }
    $raw = file_get_contents('php://input') ?: '';
    $signature = $_SERVER['HTTP_X_PAYSTACK_SIGNATURE'] ?? ($_SERVER['HTTP_PAYSTACK_SIGNATURE'] ?? '');
    if ($signature === '') {
        yustam_api_error(401, 'Missing Paystack signature.');
    }
    $expected = hash_hmac('sha512', $raw, $secret);
    if (!hash_equals($expected, $signature)) {
        yustam_api_error(401, 'Invalid Paystack signature.');
    }
    $payload = json_decode($raw, true);
    if (!is_array($payload)) {
        yustam_api_error(400, 'Invalid webhook payload.');
    }
    $event = strtolower((string) ($payload['event'] ?? ''));
    $supported = [
        'subscription.create',
        'subscription.enable',
        'subscription.disable',
        'invoice.update',
        'charge.success',
    ];
    if (!in_array($event, $supported, true)) {
        return ['success' => true, 'message' => 'Event ignored.'];
    }
    $data = $payload['data'] ?? [];
    if (!is_array($data)) {
        $data = [];
    }
    $db = get_db_connection();
    try {
        yustam_api_paystack_process_subscription_event($db, $event, $data);
    } catch (Throwable $exception) {
        error_log('Paystack webhook processing failed: ' . $exception->getMessage());
    }
    return ['success' => true];
}

function yustam_api_paystack_process_subscription_event(mysqli $db, string $event, array $data): void
{
    $vendorId = yustam_vendor_subscription_record_detect_vendor_id($db, $data);
    if ($vendorId <= 0) {
        throw new RuntimeException('Unable to match subscription event to a vendor.');
    }
    yustam_vendor_subscription_record_sync_from_paystack($db, $vendorId, $data, [
        'event' => $event,
    ]);
    $subscriptionCode = '';
    if (isset($data['subscription_code'])) {
        $subscriptionCode = trim((string) $data['subscription_code']);
    } elseif (isset($data['subscription']) && is_array($data['subscription'])) {
        $subscriptionCode = (string) ($data['subscription']['subscription_code'] ?? ($data['subscription']['code'] ?? ''));
    }
    if ($subscriptionCode) {
        try {
            yustam_vendor_subscription_refresh($db, $vendorId, $subscriptionCode);
        } catch (Throwable $refreshError) {
            error_log('Vendor refresh from webhook failed: ' . $refreshError->getMessage());
        }
    }
}

/**
 * --------------------------------------------------------------------------
 * Favorites
 * --------------------------------------------------------------------------
 */
function yustam_api_favorites_list(): array
{
    $user = yustam_api_require_auth();
    yustam_api_ensure_favorites_table();

    $db = get_db_connection();
    $stmt = $db->prepare('SELECT product_id FROM `api_favorites` WHERE user_ref = ? ORDER BY created_at DESC LIMIT 100');
    $items = [];
    if ($stmt instanceof mysqli_stmt) {
        $stmt->bind_param('s', $user['id']);
        $stmt->execute();
        $result = $stmt->get_result();
        if ($result instanceof mysqli_result) {
            while ($row = $result->fetch_assoc()) {
                $items[] = $row['product_id'];
            }
            $result->free();
        }
        $stmt->close();
    }

    $listings = [];
    foreach ($items as $productId) {
        $row = yustam_api_find_listing($productId);
        if ($row) {
            $vendor = null;
            if (!empty($row['v_id'])) {
                $vendor = [
                    'id' => (int) $row['v_id'],
                    'business_name' => $row['business_name'] ?? null,
                    'vendor_uid' => $row['vendor_uid'] ?? null,
                    'email' => $row['v_email'] ?? null,
                    'phone' => $row['v_phone'] ?? null,
                    'plan' => $row['v_plan'] ?? null,
                    'verification_status' => $row['v_verification'] ?? null,
                ];
            }
            $listings[] = yustam_api_normalise_listing_row($row, $vendor);
        }
    }

    return ['success' => true, 'items' => $listings];
}

function yustam_api_favorites_add(): array
{
    $user = yustam_api_require_auth();
    $body = yustam_api_read_json_body();
    $productId = trim((string) ($body['productId'] ?? $body['listingId'] ?? ''));
    if ($productId === '') {
        yustam_api_error(422, 'productId is required.');
    }

    if (!yustam_api_find_listing($productId)) {
        yustam_api_error(404, 'Listing not found.');
    }

    yustam_api_ensure_favorites_table();
    $db = get_db_connection();
    $stmt = $db->prepare('INSERT INTO `api_favorites` (user_ref, user_role, product_id) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE created_at = VALUES(created_at)');
    if ($stmt instanceof mysqli_stmt) {
        $stmt->bind_param('sss', $user['id'], $user['role'], $productId);
        $stmt->execute();
        $stmt->close();
    }

    return ['success' => true];
}

function yustam_api_favorites_remove(string $productId): array
{
    $user = yustam_api_require_auth();
    yustam_api_ensure_favorites_table();
    $db = get_db_connection();
    $stmt = $db->prepare('DELETE FROM `api_favorites` WHERE user_ref = ? AND product_id = ? LIMIT 1');
    if ($stmt instanceof mysqli_stmt) {
        $stmt->bind_param('ss', $user['id'], $productId);
        $stmt->execute();
        $stmt->close();
    }

    return ['success' => true];
}

/**
 * --------------------------------------------------------------------------
 * Notifications
 * --------------------------------------------------------------------------
 */
function yustam_api_notifications_list(): array
{
    $user = yustam_api_require_auth();
    yustam_api_ensure_notifications_table();

    $db = get_db_connection();
    $typeFilter = trim((string) ($_GET['type'] ?? ''));
    $unreadOnly = filter_var($_GET['unreadOnly'] ?? false, FILTER_VALIDATE_BOOLEAN);

    $where = ['user_ref = ?'];
    $types = 's';
    $params = [$user['id']];

    if ($typeFilter !== '') {
        $where[] = 'type = ?';
        $types .= 's';
        $params[] = $typeFilter;
    }
    if ($unreadOnly) {
        $where[] = 'is_read = 0';
    }

    $sql = 'SELECT * FROM `app_notifications` WHERE ' . implode(' AND ', $where) . ' ORDER BY created_at DESC LIMIT 200';
    $stmt = $db->prepare($sql);
    if (!$stmt instanceof mysqli_stmt) {
        yustam_api_error(500, 'Unable to load notifications.');
    }
    $stmt->bind_param($types, ...$params);
    $stmt->execute();
    $result = $stmt->get_result();
    $notifications = [];
    if ($result instanceof mysqli_result) {
        while ($row = $result->fetch_assoc()) {
            $rawData = $row['data'] ? json_decode($row['data'], true) : null;
            $payload = is_array($rawData) ? $rawData : null;

            $type = strtolower((string) ($row['type'] ?? 'system'));
            if ($type === 'wishlist-alert') {
                $type = 'wishlist';
            } elseif ($type === 'reward-alert') {
                $type = 'rewards';
            }

            $link = null;
            if ($payload && isset($payload['link'])) {
                $linkCandidate = trim((string) $payload['link']);
                $link = $linkCandidate !== '' ? $linkCandidate : null;
            }

            $route = null;
            if ($payload && isset($payload['route']) && is_array($payload['route'])) {
                $routeName = trim((string) ($payload['route']['name'] ?? ''));
                $routeParams = isset($payload['route']['params']) && is_array($payload['route']['params'])
                    ? $payload['route']['params']
                    : [];
                if ($routeName !== '') {
                    $route = [
                        'name' => $routeName,
                        'params' => $routeParams,
                    ];
                }
            }

            if ($route === null && $type === 'wishlist') {
                $route = [
                    'name' => 'BuyerSaved',
                    'params' => [],
                ];
            }

            $notifications[] = [
                'id' => (string) $row['id'],
                'title' => $row['title'],
                'message' => $row['body'],
                'body' => $row['body'],
                'type' => $type,
                'data' => $payload,
                'link' => $link,
                'route' => $route,
                'read' => (bool) $row['is_read'],
                'createdAt' => $row['created_at'],
                'readAt' => $row['read_at'],
            ];
        }
        $result->free();
    }
    $stmt->close();

    return ['success' => true, 'notifications' => $notifications];
}

function yustam_api_notifications_mark_many(): array
{
    $user = yustam_api_require_auth();
    $body = yustam_api_read_json_body();
    $ids = isset($body['ids']) && is_array($body['ids']) ? array_filter(array_map('intval', $body['ids'])) : [];
    if (!$ids) {
        return ['success' => true, 'updated' => 0];
    }

    yustam_api_ensure_notifications_table();
    $db = get_db_connection();
    $placeholders = implode(', ', array_fill(0, count($ids), '?'));
    $types = str_repeat('i', count($ids)) . 's';
    $params = $ids;
    $params[] = $user['id'];

    $sql = sprintf('UPDATE `app_notifications` SET is_read = 1, read_at = NOW() WHERE id IN (%s) AND user_ref = ?', $placeholders);
    $stmt = $db->prepare($sql);
    if ($stmt instanceof mysqli_stmt) {
        $stmt->bind_param($types, ...$params);
        $stmt->execute();
        $updated = $stmt->affected_rows;
        $stmt->close();
    } else {
        $updated = 0;
    }

    return ['success' => true, 'updated' => $updated];
}

function yustam_api_notifications_mark_all(): array
{
    $user = yustam_api_require_auth();
    yustam_api_ensure_notifications_table();
    $db = get_db_connection();
    $stmt = $db->prepare('UPDATE `app_notifications` SET is_read = 1, read_at = NOW() WHERE user_ref = ? AND is_read = 0');
    $updated = 0;
    if ($stmt instanceof mysqli_stmt) {
        $stmt->bind_param('s', $user['id']);
        $stmt->execute();
        $updated = $stmt->affected_rows;
        $stmt->close();
    }
    return ['success' => true, 'updated' => $updated];
}

function yustam_api_notifications_create(): array
{
    $admin = yustam_api_require_auth('admin');
    $body = yustam_api_read_json_body();
    $userRef = trim((string) ($body['userId'] ?? ''));
    $title = trim((string) ($body['title'] ?? ''));
    $message = trim((string) ($body['body'] ?? $body['message'] ?? ''));
    if ($userRef === '' || $title === '' || $message === '') {
        yustam_api_error(422, 'userId, title and body are required.');
    }

    yustam_api_ensure_notifications_table();
    $db = get_db_connection();
    $stmt = $db->prepare('INSERT INTO `app_notifications` (user_ref, title, body, type, data) VALUES (?, ?, ?, ?, ?)');
    if ($stmt instanceof mysqli_stmt) {
        $type = trim((string) ($body['type'] ?? 'system'));
        $data = isset($body['data']) ? json_encode($body['data'], YUSTAM_API_JSON_FLAGS) : null;
        $stmt->bind_param('sssss', $userRef, $title, $message, $type, $data);
        $stmt->execute();
        $stmt->close();
    }

    return ['success' => true];
}

/**
 * --------------------------------------------------------------------------
 * Support Tickets
 * --------------------------------------------------------------------------
 */
function yustam_api_support_list(): array
{
    $user = yustam_api_require_auth();
    yustam_api_ensure_support_tables();
    $db = get_db_connection();

    $scopeAll = $user['role'] === 'admin' && filter_var($_GET['all'] ?? false, FILTER_VALIDATE_BOOL);
    $where = $scopeAll ? '' : 'WHERE t.user_ref = ?';
    $sql = 'SELECT t.* FROM `support_tickets` t ' . $where . ' ORDER BY t.created_at DESC';
    $stmt = $db->prepare($sql);
    $tickets = [];
    if ($stmt instanceof mysqli_stmt) {
        if (!$scopeAll) {
            $stmt->bind_param('s', $user['id']);
        }
        $stmt->execute();
        $result = $stmt->get_result();
        if ($result instanceof mysqli_result) {
            while ($row = $result->fetch_assoc()) {
                $tickets[] = [
                    'id' => (int) $row['id'],
                    'subject' => $row['subject'],
                    'category' => $row['category'],
                    'status' => $row['status'],
                    'priority' => $row['priority'],
                    'createdAt' => $row['created_at'],
                    'updatedAt' => $row['updated_at'],
                ];
            }
            $result->free();
        }
        $stmt->close();
    }

    return ['success' => true, 'tickets' => $tickets];
}

function yustam_api_support_create(): array
{
    $user = yustam_api_require_auth();
    $body = yustam_api_read_json_body();
    $subject = trim((string) ($body['subject'] ?? ''));
    $category = trim((string) ($body['category'] ?? 'General'));
    $description = trim((string) ($body['description'] ?? ''));
    $priority = strtoupper(trim((string) ($body['priority'] ?? 'medium')));

    if ($subject === '' || $description === '') {
        yustam_api_error(422, 'Subject and description are required.');
    }

    yustam_api_ensure_support_tables();
    $db = get_db_connection();
    $stmt = $db->prepare('INSERT INTO `support_tickets` (user_ref, user_role, subject, category, description, priority) VALUES (?, ?, ?, ?, ?, ?)');
    if (!$stmt instanceof mysqli_stmt) {
        yustam_api_error(500, 'Unable to create ticket.');
    }
    $stmt->bind_param('ssssss', $user['id'], $user['role'], $subject, $category, $description, $priority);
    $stmt->execute();
    $ticketId = $stmt->insert_id;
    $stmt->close();

    return ['success' => true, 'ticket' => ['id' => $ticketId]];
}

function yustam_api_support_get(string $ticketId): array
{
    $user = yustam_api_require_auth();
    yustam_api_ensure_support_tables();
    $db = get_db_connection();

    $stmt = $db->prepare('SELECT * FROM `support_tickets` WHERE id = ? LIMIT 1');
    if (!$stmt instanceof mysqli_stmt) {
        yustam_api_error(500, 'Unable to load ticket.');
    }
    $id = (int) $ticketId;
    $stmt->bind_param('i', $id);
    $stmt->execute();
    $result = $stmt->get_result();
    $ticket = $result ? $result->fetch_assoc() : null;
    $stmt->close();
    if (!$ticket) {
        yustam_api_error(404, 'Ticket not found.');
    }
    if ($user['role'] !== 'admin' && $ticket['user_ref'] !== $user['id']) {
        yustam_api_error(403, 'You do not have access to this ticket.');
    }

    $messages = [];
    $msgStmt = $db->prepare('SELECT * FROM `support_messages` WHERE ticket_id = ? ORDER BY created_at ASC');
    if ($msgStmt instanceof mysqli_stmt) {
        $msgStmt->bind_param('i', $id);
        $msgStmt->execute();
        $res = $msgStmt->get_result();
        if ($res instanceof mysqli_result) {
            while ($row = $res->fetch_assoc()) {
                $messages[] = [
                    'id' => (int) $row['id'],
                    'body' => $row['body'],
                    'sender' => $row['sender_ref'],
                    'role' => $row['sender_role'],
                    'status' => $row['status'],
                    'isInternal' => (bool) $row['is_internal'],
                    'createdAt' => $row['created_at'],
                ];
            }
            $res->free();
        }
        $msgStmt->close();
    }

    return [
        'success' => true,
        'ticket' => [
            'id' => (int) $ticket['id'],
            'subject' => $ticket['subject'],
            'category' => $ticket['category'],
            'status' => $ticket['status'],
            'priority' => $ticket['priority'],
            'description' => $ticket['description'],
            'messages' => $messages,
        ],
    ];
}

function yustam_api_support_add_message(string $ticketId): array
{
    $user = yustam_api_require_auth();
    $body = yustam_api_read_json_body();
    $text = trim((string) ($body['body'] ?? $body['message'] ?? ''));
    if ($text === '') {
        yustam_api_error(422, 'Message body is required.');
    }

    yustam_api_ensure_support_tables();
    $db = get_db_connection();
    $ticket = yustam_api_support_fetch_ticket($db, (int) $ticketId);
    if (!$ticket) {
        yustam_api_error(404, 'Ticket not found.');
    }
    if ($user['role'] !== 'admin' && $ticket['user_ref'] !== $user['id']) {
        yustam_api_error(403, 'You do not have access to this ticket.');
    }

    $isInternal = filter_var($body['internal'] ?? false, FILTER_VALIDATE_BOOL) && $user['role'] === 'admin';
    $status = $body['status'] ?? null;
    if ($status !== null) {
        $status = strtolower((string) $status);
        if (!in_array($status, ['open', 'pending', 'closed'], true)) {
            $status = null;
        }
    }

    $stmt = $db->prepare('INSERT INTO `support_messages` (ticket_id, sender_ref, sender_role, body, is_internal, status) VALUES (?, ?, ?, ?, ?, ?)');
    if ($stmt instanceof mysqli_stmt) {
        $flag = $isInternal ? 1 : 0;
        $stmt->bind_param('isssis', $ticket['id'], $user['id'], $user['role'], $text, $flag, $status);
        $stmt->execute();
        $stmt->close();
    }

    if ($status !== null) {
        $updateStmt = $db->prepare('UPDATE `support_tickets` SET status = ?, updated_at = NOW() WHERE id = ? LIMIT 1');
        if ($updateStmt instanceof mysqli_stmt) {
            $updateStmt->bind_param('si', $status, $ticket['id']);
            $updateStmt->execute();
            $updateStmt->close();
        }
    }

    return ['success' => true];
}

function yustam_api_support_fetch_ticket(mysqli $db, int $ticketId): ?array
{
    $stmt = $db->prepare('SELECT * FROM `support_tickets` WHERE id = ? LIMIT 1');
    if (!$stmt instanceof mysqli_stmt) {
        return null;
    }
    $stmt->bind_param('i', $ticketId);
    $stmt->execute();
    $result = $stmt->get_result();
    $row = $result ? $result->fetch_assoc() : null;
    $stmt->close();
    return $row ?: null;
}

/**
 * --------------------------------------------------------------------------
 * Verification
 * --------------------------------------------------------------------------
 */
function yustam_api_normalise_verification_state($value): string
{
    if ($value === true || $value === 1 || $value === '1') {
        return 'verified';
    }
    if ($value === false || $value === 0 || $value === '0' || $value === null) {
        return 'not_submitted';
    }
    $normalised = strtolower(trim((string) $value));
    if ($normalised === '') {
        return 'not_submitted';
    }
    if (in_array($normalised, ['verified', 'approved', 'active', 'complete', 'completed', 'yes', 'true'], true)) {
        return 'verified';
    }
    if (in_array($normalised, ['pending', 'submitted', 'processing', 'under review', 'under_review', 'in review', 'in_review'], true)) {
        return 'pending';
    }
    if (in_array($normalised, ['rejected', 'declined', 'failed', 'needs_changes', 'needs update', 'needs-update'], true)) {
        return 'rejected';
    }
    return 'not_submitted';
}

function yustam_api_format_verification_label($value): string
{
    $normalised = yustam_api_normalise_verification_state($value);
    switch ($normalised) {
        case 'verified':
            return 'Verified';
        case 'pending':
            return 'Pending';
        case 'rejected':
            return 'Needs Attention';
        default:
            return 'Not Submitted';
    }
}
function yustam_api_verification_get_current(): array
{
    $user = yustam_api_require_auth(['vendor', 'admin']);
    $vendorId = $user['role'] === 'vendor'
        ? (int) ($user['vendorId'] ?? 0)
        : (int) ($_GET['vendor'] ?? 0);
    if ($vendorId <= 0) {
        yustam_api_error(404, 'Vendor not found.');
    }

    yustam_api_ensure_verification_table();
    $db = get_db_connection();
    $stmt = $db->prepare('SELECT * FROM `vendor_verifications` WHERE vendor_id = ? ORDER BY submitted_at DESC, id DESC LIMIT 1');
    $request = null;
    if ($stmt instanceof mysqli_stmt) {
        $stmt->bind_param('i', $vendorId);
        $stmt->execute();
        $result = $stmt->get_result();
        $request = $result ? $result->fetch_assoc() : null;
        $stmt->close();
    }

    $requestPayload = yustam_api_format_verification_request($request);

    if (!$requestPayload) {
        $vendor = yustam_vendor_find_by_id($vendorId, $db);
        if (!$vendor) {
            yustam_api_error(404, 'Vendor not found.');
        }
        $statusRaw = $vendor['verification_status']
            ?? $vendor['verification_state']
            ?? $vendor['kyc_status']
            ?? $vendor['verification_stage']
            ?? 'not_submitted';
        $status = yustam_api_normalise_verification_state($statusRaw);
        $requestPayload = [
            'status' => $status,
            'statusDisplay' => yustam_api_format_verification_label($statusRaw),
            'feedback' => $vendor['verification_feedback'] ?? $vendor['verification_notes'] ?? '',
            'submittedAt' => $vendor['verification_submitted_at'] ?? $vendor['kyc_submitted_at'] ?? null,
            'reviewedAt' => $vendor['verification_reviewed_at'] ?? $vendor['kyc_reviewed_at'] ?? $vendor['verified_at'] ?? null,
            'files' => [],
        ];
    }

    return ['success' => true, 'request' => $requestPayload];
}
function yustam_api_verification_submit(): array
{
    $user = yustam_api_require_auth(['vendor', 'admin']);
    $vendorId = $user['role'] === 'vendor'
        ? (int) ($user['vendorId'] ?? 0)
        : (int) ($_POST['vendorId'] ?? 0);
    if ($vendorId <= 0) {
        yustam_api_error(404, 'Vendor not found.');
    }

    $body = yustam_api_read_json_body();
    $documents = $body['documents'] ?? [];
    if (is_string($documents)) {
        $decoded = json_decode($documents, true);
        if (is_array($decoded)) {
            $documents = $decoded;
        }
    }
    if (!is_array($documents) || count($documents) === 0) {
        yustam_api_error(422, 'At least one verification document is required.');
    }

    $cleanFiles = [];
    foreach ($documents as $doc) {
        if (!is_array($doc)) {
            continue;
        }
        $url = trim((string) ($doc['url'] ?? ''));
        if ($url === '') {
            continue;
        }
        $cleanFiles[] = [
            'type' => $doc['type'] ?? 'document',
            'url' => $url,
        ];
    }

    if (!$cleanFiles) {
        yustam_api_error(422, 'Verification documents are invalid.');
    }

    $notes = trim((string) ($body['notes'] ?? ''));
    $filesJson = json_encode($cleanFiles, YUSTAM_API_JSON_FLAGS);
    $persisted = false;

    try {
        yustam_api_ensure_verification_table();
        $db = get_db_connection();
        $stmt = $db->prepare('INSERT INTO `vendor_verifications` (vendor_id, status, notes, files, submitted_at) VALUES (?, \'pending\', ?, ?, NOW())');
        if ($stmt instanceof mysqli_stmt) {
            $stmt->bind_param('iss', $vendorId, $notes, $filesJson);
            $stmt->execute();
            $stmt->close();
            $persisted = true;
        }
    } catch (Throwable $verificationError) {
        error_log('Verification insert failed: ' . $verificationError->getMessage());
    }

    yustam_api_update_vendor_verification_state($vendorId, 'pending', $notes);

    return ['success' => true, 'request' => [
            'status' => 'pending',
            'files' => $cleanFiles,
            'notes' => $notes,
            'persisted' => $persisted,
        ],
    ];
}
function yustam_api_verification_list_requests(): array
{
    yustam_api_require_auth('admin');
    yustam_api_ensure_verification_table();
    $db = get_db_connection();

    $sql = sprintf(
        'SELECT vr.*, v.business_name, v.email, v.phone FROM `vendor_verifications` vr
         LEFT JOIN `%s` v ON v.id = vr.vendor_id
         ORDER BY vr.submitted_at DESC, vr.id DESC LIMIT 200',
        YUSTAM_VENDORS_TABLE
    );
    $result = $db->query($sql);
    $requests = [];
    if ($result instanceof mysqli_result) {
        while ($row = $result->fetch_assoc()) {
            $requests[] = yustam_api_format_verification_request($row, true);
        }
        $result->free();
    }

    return ['success' => true, 'requests' => $requests];
}

function yustam_api_verification_update_request(string $requestId): array
{
    yustam_api_require_auth('admin');
    $body = yustam_api_read_json_body();
    $status = strtolower(trim((string) ($body['status'] ?? '')));
    if (!in_array($status, ['approved', 'rejected', 'pending'], true)) {
        yustam_api_error(422, 'Invalid status.');
    }
    $notes = trim((string) ($body['notes'] ?? ''));

    yustam_api_ensure_verification_table();
    $db = get_db_connection();
    $stmt = $db->prepare('UPDATE `vendor_verifications` SET status = ?, feedback = ?, reviewed_at = NOW() WHERE id = ? LIMIT 1');
    if (!$stmt instanceof mysqli_stmt) {
        yustam_api_error(500, 'Unable to update verification.');
    }
    $id = (int) $requestId;
    $stmt->bind_param('ssi', $status, $notes, $id);
    $stmt->execute();
    $stmt->close();

    $vendorStmt = $db->prepare('SELECT vendor_id FROM `vendor_verifications` WHERE id = ? LIMIT 1');
    $vendorId = 0;
    if ($vendorStmt instanceof mysqli_stmt) {
        $vendorStmt->bind_param('i', $id);
        $vendorStmt->execute();
        $result = $vendorStmt->get_result();
        $row = $result ? $result->fetch_assoc() : null;
        $vendorId = (int) ($row['vendor_id'] ?? 0);
        $vendorStmt->close();
    }
    if ($vendorId > 0) {
        yustam_api_update_vendor_verification_state($vendorId, $status, $notes);
    }

    return ['success' => true];
}

function yustam_api_format_verification_request(?array $row, bool $includeVendor = false): ?array
{
    if (!$row) {
        return null;
    }
    return [
        'id' => (int) $row['id'],
        'vendorId' => (int) ($row['vendor_id'] ?? 0),
        'status' => $row['status'] ?? 'pending',
        'notes' => $row['notes'] ?? '',
        'feedback' => $row['feedback'] ?? '',
        'files' => $row['files'] ? json_decode($row['files'], true) : [],
        'submittedAt' => $row['submitted_at'] ?? null,
        'reviewedAt' => $row['reviewed_at'] ?? null,
        'vendor' => $includeVendor ? [
            'businessName' => $row['business_name'] ?? null,
            'email' => $row['email'] ?? null,
            'phone' => $row['phone'] ?? null,
        ] : null,
    ];
}

function yustam_api_update_vendor_verification_state(int $vendorId, string $status, ?string $notes = null): void
{
    $db = get_db_connection();
    $fields = [];
    $types = '';
    $values = [];

    if (yustam_vendor_table_has_column('verification_status')) {
        $fields[] = '`verification_status` = ?';
        $types .= 's';
        $values[] = strtoupper($status);
    }
    if ($status === 'pending' && yustam_vendor_table_has_column('verification_submitted_at')) {
        $fields[] = '`verification_submitted_at` = NOW()';
    }
    if (in_array($status, ['approved', 'rejected'], true) && yustam_vendor_table_has_column('verification_reviewed_at')) {
        $fields[] = '`verification_reviewed_at` = NOW()';
    }
    if ($notes !== null && yustam_vendor_table_has_column('verification_notes')) {
        $fields[] = '`verification_notes` = ?';
        $types .= 's';
        $values[] = $notes;
    }
    if (!$fields) {
        return;
    }

    $sql = sprintf('UPDATE `%s` SET %s WHERE id = ? LIMIT 1', YUSTAM_VENDORS_TABLE, implode(', ', $fields));
    $stmt = $db->prepare($sql);
    if ($stmt instanceof mysqli_stmt) {
        $types .= 'i';
        $values[] = $vendorId;
        $stmt->bind_param($types, ...$values);
        $stmt->execute();
        $stmt->close();
    }
}

/**
 * --------------------------------------------------------------------------
 * Admin helpers
 * --------------------------------------------------------------------------
 */
function yustam_api_admin_dashboard(): array
{
    $db = get_db_connection();
    $stats = [
        'users' => 0,
        'vendors' => 0,
        'products' => 0,
        'openTickets' => 0,
    ];

    $result = $db->query('SELECT COUNT(*) AS total FROM `buyers`');
    if ($result instanceof mysqli_result) {
        $stats['users'] = (int) ($result->fetch_assoc()['total'] ?? 0);
        $result->free();
    }
    $result = $db->query(sprintf('SELECT COUNT(*) AS total FROM `%s`', YUSTAM_VENDORS_TABLE));
    if ($result instanceof mysqli_result) {
        $stats['vendors'] = (int) ($result->fetch_assoc()['total'] ?? 0);
        $result->free();
    }
    $result = $db->query('SELECT COUNT(*) AS total FROM `listings`');
    if ($result instanceof mysqli_result) {
        $stats['products'] = (int) ($result->fetch_assoc()['total'] ?? 0);
        $result->free();
    }
    $result = $db->query("SELECT COUNT(*) AS total FROM `support_tickets` WHERE status IN ('open','pending')");
    if ($result instanceof mysqli_result) {
        $stats['openTickets'] = (int) ($result->fetch_assoc()['total'] ?? 0);
        $result->free();
    }

    return ['success' => true, 'stats' => $stats];
}

function yustam_api_admin_products(): array
{
    $data = yustam_api_fetch_listings(['pageSize' => 100]);
    return ['success' => true, 'products' => $data['items']];
}

function yustam_api_admin_users(): array
{
    return yustam_api_auth_list_users(yustam_api_require_auth('admin'));
}

function yustam_api_admin_vendors(): array
{
    $db = get_db_connection();
    $result = $db->query(sprintf('SELECT id, business_name, email, phone, plan, verification_status, created_at FROM `%s` ORDER BY created_at DESC LIMIT 200', YUSTAM_VENDORS_TABLE));
    $vendors = [];
    if ($result instanceof mysqli_result) {
        while ($row = $result->fetch_assoc()) {
            $vendors[] = [
                'id' => yustam_api_user_reference('vendor', (int) $row['id']),
                'businessName' => $row['business_name'] ?? 'Vendor',
                'email' => $row['email'] ?? null,
                'phone' => $row['phone'] ?? null,
                'plan' => $row['plan'] ?? null,
                'verificationStatus' => $row['verification_status'] ?? null,
                'createdAt' => $row['created_at'] ?? null,
            ];
        }
        $result->free();
    }
    return ['success' => true, 'vendors' => $vendors];
}

function yustam_api_admin_verifications(): array
{
    return yustam_api_verification_list_requests();
}

function yustam_api_admin_support_tickets(): array
{
    $_GET['all'] = 'true';
    return yustam_api_support_list();
}

function yustam_api_admin_plans(): array
{
    return ['success' => true, 'plans' => yustam_api_plan_catalog()];
}

/**
 * --------------------------------------------------------------------------
 * Chats
 * --------------------------------------------------------------------------
 */
function yustam_api_chats_list(): array
{
    $user = yustam_api_require_auth();
    $context = yustam_api_chat_context($user);
    yustam_api_ensure_chat_table();
    $db = get_db_connection();

    $column = $context['role'] === 'vendor' ? 'vendor_uid' : 'buyer_uid';
    $sql = sprintf(
        'SELECT chat_id, metadata, updated_at FROM `api_chat_threads` WHERE `%s` = ? ORDER BY updated_at DESC LIMIT 100',
        $column
    );

    $threads = [];
    $stmt = $db->prepare($sql);
    if ($stmt instanceof mysqli_stmt) {
        $stmt->bind_param('s', $context['uid']);
        $stmt->execute();
        $result = $stmt->get_result();
        if ($result instanceof mysqli_result) {
            while ($row = $result->fetch_assoc()) {
                $chatId = (string) $row['chat_id'];
                $fields = ['chat_id' => $chatId];

                try {
                    $document = yustam_firestore_get_document('chats/' . $chatId);
                    if ($document && isset($document['fields'])) {
                        foreach ($document['fields'] as $key => $value) {
                            $fields[$key] = yustam_firestore_decode($value);
                        }
                    }
                } catch (Throwable $firestoreError) {
                    error_log('Chat list fetch Firestore failed: ' . $firestoreError->getMessage());
                }

                if (!empty($row['metadata'])) {
                    $metadata = json_decode((string) $row['metadata'], true);
                    if (is_array($metadata)) {
                        $fields = array_merge($metadata, $fields);
                    }
                }

                if (!isset($fields['last_ts']) && !empty($row['updated_at'])) {
                    $fields['last_ts'] = $row['updated_at'];
                }

                error_log(sprintf(
                    'Chat list cache candidate for %s: %s buyer=%s vendor=%s',
                    $context['uid'],
                    $chatId,
                    $fields['buyer_uid'] ?? $fields['buyerUid'] ?? '',
                    $fields['vendor_uid'] ?? $fields['vendorUid'] ?? ''
                ));

                $threads[] = yustam_api_chat_thread_from_fields($fields);
            }
            $result->free();
        }
        $stmt->close();
    }

    if (!$threads) {
        $fieldPath = $context['role'] === 'vendor' ? 'vendor_uid' : 'buyer_uid';
        $query = [
            'structuredQuery' => [
                'from' => [
                    ['collectionId' => 'chats'],
                ],
                'where' => [
                    'fieldFilter' => [
                        'field' => ['fieldPath' => $fieldPath],
                        'op' => 'EQUAL',
                        'value' => yustam_firestore_string($context['uid']),
                    ],
                ],
                'orderBy' => [
                    [
                        'field' => ['fieldPath' => 'last_ts'],
                        'direction' => 'DESCENDING',
                    ],
                ],
                'limit' => 50,
            ],
        ];

        try {
            $results = yustam_firestore_run_query($query);
            error_log(sprintf('Chat list fallback query returned %d entries for %s', count($results), $context['uid']));
            foreach ($results as $result) {
                $document = $result['document'] ?? $result['found'] ?? null;
                if (!is_array($document)) {
                    continue;
                }

                $fieldsRaw = isset($document['fields']) && is_array($document['fields']) ? $document['fields'] : [];
                $fields = [];
                foreach ($fieldsRaw as $key => $value) {
                    $fields[$key] = yustam_firestore_decode($value);
                }

                if (isset($document['name']) && !isset($fields['chat_id'])) {
                    $fields['chat_id'] = basename($document['name']);
                }

                $thread = yustam_api_chat_thread_from_fields($fields);
                $threads[] = $thread;

                error_log(sprintf(
                    'Chat list fallback candidate for %s: %s buyer=%s vendor=%s source=%s',
                    $context['uid'],
                    $thread['id'] ?? '',
                    $thread['buyerUid'] ?? '',
                    $thread['vendorUid'] ?? '',
                    isset($result['found']) ? 'found' : 'document'
                ));

                if (!empty($thread['id'])) {
                    $buyerUidFallback = $fields['buyer_uid'] ?? $fields['buyerUid'] ?? ($thread['buyerUid'] ?? '');
                    $vendorUidFallback = $fields['vendor_uid'] ?? $fields['vendorUid'] ?? ($thread['vendorUid'] ?? '');
                    if ($buyerUidFallback !== '' || $vendorUidFallback !== '') {
                        $cacheFields = [
                            'buyer_uid' => $buyerUidFallback,
                            'vendor_uid' => $vendorUidFallback,
                            'buyer_name' => $thread['buyerName'] ?? '',
                            'vendor_name' => $thread['vendorName'] ?? '',
                            'listing_id' => $thread['listingId'] ?? '',
                            'listing_title' => $thread['listingTitle'] ?? '',
                            'listing_image' => $thread['listingImage'] ?? '',
                            'last_text' => $thread['lastMessage'] ?? '',
                            'last_sender_role' => $thread['lastSenderRole'] ?? '',
                        ];

                        if (!yustam_api_chat_update_cached_thread($thread['id'], $cacheFields)) {
                            $cacheFields['buyer_ref'] = '';
                            $cacheFields['vendor_ref'] = '';
                            yustam_api_chat_store_metadata($thread['id'], $cacheFields);
                        }
                    }
                }
            }
        } catch (Throwable $exception) {
            error_log('Chat list fallback failed: ' . $exception->getMessage());
        }
    }

    if (count($threads) > 50) {
        $threads = array_slice($threads, 0, 50);
    }

    error_log(sprintf('Chat list returning %d threads for %s via metadata lookup', count($threads), $context['uid']));

    return ['success' => true, 'threads' => $threads];
}

function yustam_api_chats_open(): array
{
    $user = yustam_api_require_auth();
    $context = yustam_api_chat_context($user);
    $body = yustam_api_read_json_body();

    $buyerUid = trim((string) ($body['buyer_uid'] ?? $body['buyerUid'] ?? ($context['role'] === 'buyer' ? $context['uid'] : '')));
    $vendorUid = trim((string) ($body['vendor_uid'] ?? $body['vendorUid'] ?? ($context['role'] === 'vendor' ? $context['uid'] : '')));
    if ($buyerUid === '' || $vendorUid === '') {
        yustam_api_error(422, 'buyer_uid and vendor_uid are required.');
    }

    $buyerName = $body['buyer_name'] ?? $body['buyerName'] ?? ($context['role'] === 'buyer' ? $context['name'] : 'Buyer');
    $vendorName = $body['vendor_name'] ?? $body['vendorName'] ?? ($context['role'] === 'vendor' ? $context['name'] : 'Vendor');
    $vendorBusinessName = $body['vendor_business_name'] ?? $body['vendorBusinessName'] ?? $vendorName;

    $listingId = $body['listing_id'] ?? $body['listingId'] ?? '';
    $listingTitle = $body['listing_title'] ?? $body['listingTitle'] ?? '';
    $listingImage = $body['listing_image'] ?? $body['listingImage'] ?? '';

    $chatId = yustam_chat_build_id($buyerUid, $vendorUid);

    $chatFields = [
        'chat_id' => yustam_firestore_string($chatId),
        'buyer_uid' => yustam_firestore_string($buyerUid),
        'buyer_name' => yustam_firestore_string($buyerName),
        'vendor_uid' => yustam_firestore_string($vendorUid),
        'vendor_name' => yustam_firestore_string($vendorName),
        'vendor_business_name' => yustam_firestore_string($vendorBusinessName),
        'listing_id' => yustam_firestore_string($listingId),
        'listing_title' => yustam_firestore_string($listingTitle),
        'listing_image' => yustam_firestore_string($listingImage),
        'last_text' => yustam_firestore_string('Conversation started'),
        'last_sender_role' => yustam_firestore_string($context['role']),
        'unread_for_buyer' => yustam_firestore_integer(0),
        'unread_for_vendor' => yustam_firestore_integer(0),
    ];

    $threadFieldsForResponse = [
        'chat_id' => $chatId,
        'buyer_uid' => $buyerUid,
        'buyer_name' => $buyerName,
        'vendor_uid' => $vendorUid,
        'vendor_name' => $vendorName,
        'vendor_business_name' => $vendorBusinessName,
        'listing_id' => $listingId,
        'listing_title' => $listingTitle,
        'listing_image' => $listingImage,
        'last_text' => 'Conversation started',
        'last_sender_role' => $context['role'],
        'unread_for_buyer' => 0,
        'unread_for_vendor' => 0,
    ];

    $chatDocumentPath = yustam_firestore_document_path('chats', $chatId);

    try {
        yustam_firestore_commit([
            [
                'update' => [
                    'name' => $chatDocumentPath,
                    'fields' => $chatFields,
                ],
                'currentDocument' => ['exists' => false],
            ],
            [
                'transform' => [
                    'document' => $chatDocumentPath,
                    'fieldTransforms' => [
                        ['fieldPath' => 'last_ts', 'setToServerValue' => 'REQUEST_TIME'],
                    ],
                ],
            ],
        ]);
    } catch (Throwable $exception) {
        $message = $exception->getMessage();
        if (strpos($message, 'ALREADY_EXISTS') !== false) {
            error_log('Chat open detected existing thread, refreshing document.');
            try {
                yustam_firestore_commit([
                    [
                        'update' => [
                            'name' => $chatDocumentPath,
                            'fields' => $chatFields,
                        ],
                        'updateMask' => ['fieldPaths' => array_keys($chatFields)],
                    ],
                    [
                        'transform' => [
                            'document' => $chatDocumentPath,
                            'fieldTransforms' => [
                                ['fieldPath' => 'last_ts', 'setToServerValue' => 'REQUEST_TIME'],
                            ],
                        ],
                    ],
                ]);
            } catch (Throwable $refreshException) {
                error_log('Chat open refresh failed: ' . $refreshException->getMessage());
            }
            try {
                $document = yustam_firestore_get_document('chats/' . $chatId);
                if ($document && isset($document['fields'])) {
                    $decoded = [];
                    foreach ($document['fields'] as $key => $value) {
                        $decoded[$key] = yustam_firestore_decode($value);
                    }
                    $decoded['chat_id'] = $decoded['chat_id'] ?? $chatId;
                    $threadFieldsForResponse = array_merge($threadFieldsForResponse, $decoded);
                }
            } catch (Throwable $fetchException) {
                error_log('Chat open fetch existing failed: ' . $fetchException->getMessage());
            }
        } else {
            error_log('Chat open failed: ' . $message);
            yustam_api_error(500, 'Unable to open chat thread.');
        }
    }

    $metadataCache = [
        'buyer_ref' => $context['role'] === 'buyer' ? $user['id'] : ($body['buyerRef'] ?? ''),
        'vendor_ref' => $context['role'] === 'vendor' ? $user['id'] : ($body['vendorRef'] ?? ''),
        'buyer_uid' => $buyerUid,
        'vendor_uid' => $vendorUid,
        'buyer_name' => $buyerName,
        'vendor_name' => $vendorName,
        'vendor_business_name' => $vendorBusinessName,
        'listing_id' => $listingId,
        'listing_title' => $listingTitle,
        'listing_image' => $listingImage,
        'last_text' => 'Conversation started',
        'last_sender_role' => $context['role'],
    ];

    if (!empty($context['firebaseUid'])) {
        $metadataCache['firebase_uid'] = $context['firebaseUid'];
    }
    if (!empty($context['vendorUid'])) {
        $metadataCache['vendor_uid_primary'] = $context['vendorUid'];
    }

    yustam_api_chat_store_metadata($chatId, $metadataCache);

    return ['success' => true, 'thread' => yustam_api_chat_thread_from_fields($threadFieldsForResponse)];
}

function yustam_api_chats_assign(string $threadId): array
{
    $admin = yustam_api_require_auth('admin');
    yustam_api_ensure_chat_table();
    $db = get_db_connection();
    $stmt = $db->prepare('UPDATE `api_chat_threads` SET admin_ref = ?, updated_at = NOW() WHERE chat_id = ?');
    if ($stmt instanceof mysqli_stmt) {
        $stmt->bind_param('ss', $admin['id'], $threadId);
        $stmt->execute();
        $stmt->close();
    }
    return ['success' => true];
}

function yustam_api_chats_send_message(string $threadId): array
{
    $user = yustam_api_require_auth();
    $context = yustam_api_chat_context($user);
    $body = yustam_api_read_json_body();
    $text = trim((string) ($body['text'] ?? $body['message'] ?? ''));
    $imageUrl = trim((string) ($body['image_url'] ?? $body['imageUrl'] ?? ''));
    $voiceUrl = trim((string) ($body['voice_url'] ?? $body['voiceUrl'] ?? ''));

    if ($text === '' && $imageUrl === '' && $voiceUrl === '') {
        yustam_api_error(422, 'Message content required.');
    }

    $buyerUid = trim((string) ($body['buyer_uid'] ?? $body['buyerUid'] ?? ''));
    $vendorUid = trim((string) ($body['vendor_uid'] ?? $body['vendorUid'] ?? ''));
    if ($buyerUid === '' || $vendorUid === '') {
        yustam_api_error(422, 'buyer_uid and vendor_uid are required.');
    }

    $messageId = 'msg_' . yustam_api_random_string(12);
    $type = 'text';
    if ($voiceUrl !== '') {
        $type = 'voice';
    } elseif ($imageUrl !== '') {
        $type = 'image';
    }
    $preview = $type === 'text' ? $text : ($type === 'image' ? 'Photo' : 'Voice note');

    $messageFields = [
        'sender_uid' => yustam_firestore_string($context['uid']),
        'sender_role' => yustam_firestore_string($context['role']),
        'type' => yustam_firestore_string($type),
        'text' => yustam_firestore_string($text),
        'read_by' => yustam_firestore_map([$context['uid'] => yustam_firestore_boolean(true)]),
    ];
    if ($imageUrl !== '') {
        $messageFields['image_url'] = yustam_firestore_string($imageUrl);
    }
    if ($voiceUrl !== '') {
        $messageFields['voice_url'] = yustam_firestore_string($voiceUrl);
    }

    $chatPath = yustam_firestore_document_path('chats', $threadId);
    $messagePath = yustam_firestore_document_path('chats', $threadId, 'messages', $messageId);

    $transforms = [
        ['fieldPath' => 'last_ts', 'setToServerValue' => 'REQUEST_TIME'],
    ];
    $chatUpdate = [
        'last_text' => yustam_firestore_string($preview),
        'last_sender_role' => yustam_firestore_string($context['role']),
    ];

    if ($context['role'] === 'buyer') {
        $transforms[] = ['fieldPath' => 'unread_for_vendor', 'increment' => yustam_firestore_integer(1)];
        $chatUpdate['unread_for_buyer'] = yustam_firestore_integer(0);
    } else {
        $transforms[] = ['fieldPath' => 'unread_for_buyer', 'increment' => yustam_firestore_integer(1)];
        $chatUpdate['unread_for_vendor'] = yustam_firestore_integer(0);
    }

    try {
        yustam_firestore_commit([
            [
                'update' => [
                    'name' => $messagePath,
                    'fields' => $messageFields,
                ],
            ],
            [
                'transform' => [
                    'document' => $messagePath,
                    'fieldTransforms' => [
                        ['fieldPath' => 'ts', 'setToServerValue' => 'REQUEST_TIME'],
                    ],
                ],
            ],
            [
                'update' => [
                    'name' => $chatPath,
                    'fields' => $chatUpdate,
                ],
            ],
            [
                'transform' => [
                    'document' => $chatPath,
                    'fieldTransforms' => $transforms,
                ],
            ],
        ]);
        error_log(sprintf('Chat message stored for thread %s by %s', $threadId, $context['uid']));
    } catch (Throwable $exception) {
        error_log('Chat send failed: ' . $exception->getMessage());
        yustam_api_error(500, 'Unable to send message.');
    }

    $cacheUpdated = yustam_api_chat_update_cached_thread($threadId, [
        'last_text' => $preview,
        'last_sender_role' => $context['role'],
        'last_ts' => time(),
    ]);

    if (!$cacheUpdated) {
        yustam_api_chat_store_metadata($threadId, [
            'buyer_ref' => $context['role'] === 'buyer' ? ($user['id'] ?? '') : '',
            'vendor_ref' => $context['role'] === 'vendor' ? ($user['id'] ?? '') : '',
            'buyer_uid' => $buyerUid,
            'vendor_uid' => $vendorUid,
            'last_text' => $preview,
            'last_sender_role' => $context['role'],
        ]);
    }

    return ['success' => true, 'messageId' => $messageId];
}

function yustam_api_chats_list_messages(string $threadId): array
{
    yustam_api_require_auth();
    $query = [
        'parent' => yustam_firestore_document_path('chats', $threadId),
        'structuredQuery' => [
            'from' => [
                ['collectionId' => 'messages'],
            ],
            'orderBy' => [
                ['field' => ['fieldPath' => 'ts'], 'direction' => 'ASCENDING'],
            ],
            'limit' => 100,
        ],
    ];

    $messages = [];
    try {
        $results = yustam_firestore_run_query($query);
        error_log(sprintf('Chat messages query returned %d raw entries for %s', count($results), $threadId));
        foreach ($results as $result) {
            $document = $result['document'] ?? $result['found'] ?? null;
            if (!is_array($document)) {
                continue;
            }

            $fieldsRaw = isset($document['fields']) && is_array($document['fields']) ? $document['fields'] : [];
            $fields = [];
            foreach ($fieldsRaw as $key => $value) {
                $fields[$key] = yustam_firestore_decode($value);
            }

            $messages[] = [
                'id' => isset($document['name']) ? basename($document['name']) : '',
                'text' => $fields['text'] ?? $fields['message'] ?? '',
                'type' => $fields['type'] ?? $fields['message_type'] ?? 'text',
                'sender' => $fields['sender_uid'] ?? $fields['senderUid'] ?? $fields['sender'] ?? '',
                'role' => $fields['sender_role'] ?? $fields['role'] ?? '',
                'image' => $fields['image_url'] ?? $fields['imageUrl'] ?? null,
                'voice' => $fields['voice_url'] ?? $fields['voiceUrl'] ?? null,
                'timestamp' => $fields['ts'] ?? $fields['timestamp'] ?? null,
            ];
        }
        error_log(sprintf('Chat messages returning %d items for %s', count($messages), $threadId));
    } catch (Throwable $exception) {
        error_log('Chat messages failed: ' . $exception->getMessage());
    }

    return ['success' => true, 'messages' => $messages];
}

function yustam_api_chats_mark_read(string $threadId): array
{
    $user = yustam_api_require_auth();
    $context = yustam_api_chat_context($user);
    $field = $context['role'] === 'vendor' ? 'unread_for_vendor' : 'unread_for_buyer';

    try {
        yustam_firestore_commit([
            [
                'update' => [
                    'name' => yustam_firestore_document_path('chats', $threadId),
                    'fields' => [$field => yustam_firestore_integer(0)],
                ],
            ],
        ]);
    } catch (Throwable $exception) {
        // ignore failures
    }

    return ['success' => true];
}

function yustam_api_chat_context(array $user): array
{
    $role = $user['role'] === 'vendor' ? 'vendor' : 'buyer';
    $name = $user['displayName'] ?? ($role === 'vendor' ? 'Vendor' : 'Buyer');

    $firebaseUid = trim((string) ($user['firebaseUid'] ?? $user['uid'] ?? ''));
    $vendorUid = trim((string) ($user['vendorUid'] ?? $user['vendor_uid'] ?? ''));

    if ($role === 'vendor' && ( $vendorUid === '' || $firebaseUid === '')) {
        $vendorId = isset($user['vendorId']) ? (int) $user['vendorId'] : 0;
        if ($vendorId > 0) {
            $vendor = yustam_vendor_find_by_id($vendorId, get_db_connection());
            if ($vendor) {
                if ($vendorUid === '' && !empty($vendor['vendor_uid'])) {
                    $vendorUid = trim((string) $vendor['vendor_uid']);
                }
                if ($firebaseUid === '' && !empty($vendor['firebase_uid'])) {
                    $firebaseUid = trim((string) $vendor['firebase_uid']);
                }
            }
        }
    }

    $primaryUid = '';
    if ($role === 'vendor') {
        $primaryUid = $vendorUid !== '' ? $vendorUid : $firebaseUid;
    } else {
        if ($firebaseUid === '' && !empty($user['buyerId'])) {
            $firebaseUid = trim((string) $user['buyerId']);
        }
        $primaryUid = $firebaseUid;
    }

    if ($primaryUid === '') {
        yustam_api_error(400, 'Your chat identity could not be resolved. Please sign in again.');
    }

    return [
        'role' => $role,
        'uid' => $primaryUid,
        'name' => $name,
        'vendorUid' => $role === 'vendor' && $vendorUid !== '' ? $vendorUid : null,
        'firebaseUid' => $firebaseUid !== '' ? $firebaseUid : null,
    ];
}

function yustam_api_chat_thread_from_fields(array $fields): array
{
    $pick = static function (array $options, $default = null) use ($fields) {
        foreach ($options as $option) {
            if (array_key_exists($option, $fields) && $fields[$option] !== null && $fields[$option] !== '') {
                return $fields[$option];
            }
        }
        return $default;
    };

    return [
        'id' => (string) $pick(['chat_id', 'id', 'thread_id'], ''),
        'buyerUid' => $pick(['buyer_uid', 'buyerUid', 'buyer_id', 'buyerId']),
        'buyerName' => $pick(['buyer_name', 'buyerName'], $pick(['buyer_display_name', 'buyerDisplayName'], null)),
        'vendorUid' => $pick(['vendor_uid', 'vendorUid', 'vendor_id', 'vendorId']),
        'vendorName' => $pick(['vendor_business_name', 'vendorBusinessName', 'vendor_name', 'vendorName'], null),
        'listingId' => $pick(['listing_id', 'listingId']),
        'listingTitle' => $pick(['listing_title', 'listingTitle', 'product_title', 'productTitle']),
        'listingImage' => $pick(['listing_image', 'listingImage', 'image', 'photo']),
        'lastMessage' => $pick(['last_text', 'lastText', 'last_message', 'lastMessage']),
        'lastSenderRole' => $pick(['last_sender_role', 'lastSenderRole'], null),
        'unreadForBuyer' => (int) $pick(['unread_for_buyer', 'unreadForBuyer', 'buyer_unread_count'], 0),
        'unreadForVendor' => (int) $pick(['unread_for_vendor', 'unreadForVendor', 'vendor_unread_count'], 0),
    ];
}

function yustam_api_chat_update_cached_thread(string $chatId, array $fields): bool
{
    if ($chatId === '' || $fields === []) {
        return false;
    }

    $row = null;
    try {
        yustam_api_ensure_chat_table();
        $db = get_db_connection();
        $stmt = $db->prepare('SELECT buyer_ref, vendor_ref, buyer_uid, vendor_uid, metadata FROM `api_chat_threads` WHERE chat_id = ? LIMIT 1');
        if (!$stmt instanceof mysqli_stmt) {
            return false;
        }
        $stmt->bind_param('s', $chatId);
        $stmt->execute();
        $result = $stmt->get_result();
        $row = $result ? $result->fetch_assoc() : null;
        if ($result instanceof mysqli_result) {
            $result->free();
        }
        $stmt->close();
    } catch (Throwable $exception) {
        error_log('Chat cache lookup failed: ' . $exception->getMessage());
        return false;
    }

    if (!$row) {
        return false;
    }

    $metadata = [];
    if (!empty($row['metadata'])) {
        $decoded = json_decode((string) $row['metadata'], true);
        if (is_array($decoded)) {
            $metadata = $decoded;
        }
    }

    $metadata = array_merge($metadata, $fields);
    $metadata['buyer_ref'] = $row['buyer_ref'] ?? ($metadata['buyer_ref'] ?? '');
    $metadata['vendor_ref'] = $row['vendor_ref'] ?? ($metadata['vendor_ref'] ?? '');
    $metadata['buyer_uid'] = $row['buyer_uid'] ?? ($metadata['buyer_uid'] ?? '');
    $metadata['vendor_uid'] = $row['vendor_uid'] ?? ($metadata['vendor_uid'] ?? '');

    yustam_api_chat_store_metadata($chatId, $metadata);
    return true;
}

function yustam_api_chat_store_metadata(string $chatId, array $meta): void
{
    yustam_api_ensure_chat_table();
    $db = get_db_connection();
    $stmt = $db->prepare('REPLACE INTO `api_chat_threads` (chat_id, buyer_ref, vendor_ref, vendor_uid, buyer_uid, metadata) VALUES (?, ?, ?, ?, ?, ?)');
    if ($stmt instanceof mysqli_stmt) {
        $metadata = json_encode($meta, YUSTAM_API_JSON_FLAGS);
        $buyerRef = $meta['buyer_ref'] ?? '';
        $vendorRef = $meta['vendor_ref'] ?? '';
        $vendorUid = $meta['vendor_uid'] ?? '';
        $buyerUid = $meta['buyer_uid'] ?? '';
        $stmt->bind_param('ssssss', $chatId, $buyerRef, $vendorRef, $vendorUid, $buyerUid, $metadata);
        $stmt->execute();
        $stmt->close();
    }
}

/**
 * --------------------------------------------------------------------------
 * Home & Categories
 * --------------------------------------------------------------------------
 */
function yustam_api_category_list(): array
{
    return [
        'Phones & Tablets',
        'Electronics',
        'Fashion',
        'Property',
        'Food & Groceries',
        'Beauty',
        'Vehicles',
        'Home & Kitchen',
        'Power Solutions',
        'Computing',
        'Services',
        'Others',
    ];
}

function yustam_api_build_home_feed(): array
{
    $db = get_db_connection();
    $categories = yustam_api_category_list();

    $featured = yustam_api_fetch_listings([
        'status' => 'active',
        'limit' => 10,
        'order' => 'recent',
    ])['items'];

    $flashSales = yustam_api_fetch_listings([
        'status' => 'active',
        'limit' => 10,
        'order' => 'price',
    ])['items'];

    $vendorTable = YUSTAM_VENDORS_TABLE;
    $vendorCount = 0;
    $verifiedCount = 0;
    $listingCount = 0;

    $result = $db->query(sprintf('SELECT COUNT(*) AS total FROM `%s`', $vendorTable));
    if ($result instanceof mysqli_result) {
        $row = $result->fetch_assoc();
        $vendorCount = (int) ($row['total'] ?? 0);
        $result->free();
    }

    if (yustam_vendor_table_has_column('verification_status')) {
        $stmt = $db->prepare(sprintf(
            'SELECT COUNT(*) AS total FROM `%s` WHERE LOWER(`verification_status`) IN (\'approved\', \'verified\')',
            $vendorTable
        ));
        if ($stmt instanceof mysqli_stmt) {
            $stmt->execute();
            $rs = $stmt->get_result();
            $row = $rs ? $rs->fetch_assoc() : null;
            $verifiedCount = (int) ($row['total'] ?? 0);
            $stmt->close();
        }
    }

    $listingResult = $db->query("SELECT COUNT(*) AS total FROM `listings` WHERE LOWER(`status`) IN ('active','approved','live','published')");
    if ($listingResult instanceof mysqli_result) {
        $row = $listingResult->fetch_assoc();
        $listingCount = (int) ($row['total'] ?? 0);
        $listingResult->free();
    }

    return [
        'hero' => [
            'title' => 'Everything you need in one trusted marketplace',
            'subtitle' => 'Discover Nigerian vendors, compare listings, and shop safely.',
            'callToAction' => 'Shop now',
        ],
        'categories' => $categories,
        'featuredProducts' => $featured,
        'flashSales' => $flashSales,
        'stats' => [
            'totalVendors' => $vendorCount,
            'verifiedVendors' => $verifiedCount,
            'activeListings' => $listingCount,
        ],
    ];
}

/**
 * --------------------------------------------------------------------------
 * Products & Listings
 * --------------------------------------------------------------------------
 */
function yustam_api_fetch_listings(array $options = []): array
{
    $db = get_db_connection();
    yustam_listings_ensure_table($db);
    $columns = yustam_api_listings_columns($db);

    $page = max(1, (int) ($options['page'] ?? (int) ($_GET['page'] ?? 1)));
    $pageSize = max(1, min(100, (int) ($options['pageSize'] ?? (int) ($_GET['pageSize'] ?? 20))));
    if (!empty($options['limit'])) {
        $pageSize = min($pageSize, (int) $options['limit']);
        $page = 1;
    }
    $offset = ($page - 1) * $pageSize;

    $where = [];
    $types = '';
    $params = [];

    $search = trim((string) ($options['search'] ?? ($_GET['search'] ?? '')));
    if ($search !== '') {
        $where[] = '(l.`title` LIKE ? OR l.`description` LIKE ?)';
        $value = '%' . $search . '%';
        $types .= 'ss';
        $params[] = $value;
        $params[] = $value;
    }

    $category = trim((string) ($options['category'] ?? $options['categorySlug'] ?? ($_GET['categorySlug'] ?? $_GET['categoryId'] ?? '')));
    if ($category !== '') {
        $where[] = 'l.`category` = ?';
        $types .= 's';
        $params[] = $category;
    }

    $state = trim((string) ($options['locationState'] ?? ($_GET['locationState'] ?? '')));
    if ($state !== '' && in_array('state', $columns, true)) {
        $where[] = 'l.`state` = ?';
        $types .= 's';
        $params[] = $state;
    }

    $city = trim((string) ($options['locationCity'] ?? ($_GET['locationCity'] ?? '')));
    if ($city !== '' && in_array('city', $columns, true)) {
        $where[] = 'l.`city` = ?';
        $types .= 's';
        $params[] = $city;
    }

    $minPrice = $options['minPrice'] ?? $_GET['minPrice'] ?? null;
    if ($minPrice !== null && is_numeric($minPrice)) {
        $where[] = 'l.`price` >= ?';
        $types .= 'd';
        $params[] = (float) $minPrice;
    }

    $maxPrice = $options['maxPrice'] ?? $_GET['maxPrice'] ?? null;
    if ($maxPrice !== null && is_numeric($maxPrice)) {
        $where[] = 'l.`price` <= ?';
        $types .= 'd';
        $params[] = (float) $maxPrice;
    }

    $ownerRef = $options['ownerId'] ?? $_GET['ownerId'] ?? null;
    if ($ownerRef) {
        [$role, $id] = yustam_api_parse_user_reference((string) $ownerRef);
        if ($role === 'vendor' && $id > 0) {
            $where[] = 'l.`vendor_id` = ?';
            $types .= 'i';
            $params[] = $id;
        }
    }

    $statusFilter = strtolower((string) ($options['status'] ?? ($_GET['status'] ?? '')));
    $includeDrafts = filter_var($options['includeDrafts'] ?? $_GET['includeDrafts'] ?? false, FILTER_VALIDATE_BOOL);

    if ($statusFilter !== '') {
        $where[] = 'LOWER(l.`status`) = ?';
        $types .= 's';
        $params[] = $statusFilter;
    } elseif (!$includeDrafts && in_array('status', $columns, true)) {
        $where[] = 'LOWER(l.`status`) IN (\'active\', \'approved\', \'live\', \'published\')';
    }

    $isFeatured = $options['isFeatured'] ?? $_GET['isFeatured'] ?? null;
    if ($isFeatured !== null && in_array('is_featured', $columns, true)) {
        $where[] = 'l.`is_featured` = ?';
        $types .= 'i';
        $params[] = filter_var($isFeatured, FILTER_VALIDATE_BOOL) ? 1 : 0;
    }

    $isFlashSale = $options['isFlashSale'] ?? $_GET['isFlashSale'] ?? null;
    if ($isFlashSale !== null && in_array('is_flash_sale', $columns, true)) {
        $where[] = 'l.`is_flash_sale` = ?';
        $types .= 'i';
        $params[] = filter_var($isFlashSale, FILTER_VALIDATE_BOOL) ? 1 : 0;
    }

    $whereSql = $where ? 'WHERE ' . implode(' AND ', $where) : '';

    $countSql = 'SELECT COUNT(*) AS total FROM `listings` l ' . $whereSql;
    $countStmt = $db->prepare($countSql);
    if ($countStmt instanceof mysqli_stmt && $types !== '') {
        $countStmt->bind_param($types, ...$params);
    }
    $countStmt?->execute();
    $countResult = $countStmt ? $countStmt->get_result() : null;
    $total = $countResult ? (int) ($countResult->fetch_assoc()['total'] ?? 0) : 0;
    $countStmt?->close();

    $order = strtolower((string) ($options['order'] ?? $_GET['order'] ?? 'recent'));
    $orderBy = 'l.`created_at` DESC';
    if ($order === 'price') {
        $orderBy = 'CAST(l.`price` AS DECIMAL(18,2)) ASC';
    }

    $vendorTable = YUSTAM_VENDORS_TABLE;
    $listSql = sprintf(
        'SELECT l.*, v.id AS v_id, v.business_name, v.vendor_uid, v.email AS v_email, v.phone AS v_phone, v.plan AS v_plan, v.verification_status AS v_verification
         FROM `listings` l
         LEFT JOIN `%s` v ON v.id = l.vendor_id
         %s
         ORDER BY %s
         LIMIT ? OFFSET ?',
        $vendorTable,
        $whereSql,
        $orderBy
    );

    $dataStmt = $db->prepare($listSql);
    if ($dataStmt instanceof mysqli_stmt) {
        $bindTypes = $types . 'ii';
        $bindParams = $params;
        $bindParams[] = $pageSize;
        $bindParams[] = $offset;
        $dataStmt->bind_param($bindTypes, ...$bindParams);
        $dataStmt->execute();
        $result = $dataStmt->get_result();
    } else {
        $result = false;
    }

    $items = [];
    if ($result instanceof mysqli_result) {
        while ($row = $result->fetch_assoc()) {
            $vendor = null;
            if (!empty($row['v_id'])) {
                $vendor = [
                    'id' => (int) $row['v_id'],
                    'business_name' => $row['business_name'] ?? null,
                    'vendor_uid' => $row['vendor_uid'] ?? null,
                    'email' => $row['v_email'] ?? null,
                    'phone' => $row['v_phone'] ?? null,
                    'plan' => $row['v_plan'] ?? null,
                    'verification_status' => $row['v_verification'] ?? null,
                ];
            }
            $items[] = yustam_api_normalise_listing_row($row, $vendor);
        }
        $result->free();
    }
    $dataStmt?->close();

    return [
        'items' => $items,
        'pagination' => [
            'page' => $page,
            'pageSize' => $pageSize,
            'total' => $total,
            'totalPages' => max(1, (int) ceil($total / $pageSize)),
        ],
    ];
}

function yustam_api_find_listing(string $identifier): ?array
{
    $db = get_db_connection();
    yustam_listings_ensure_table($db);
    $vendorTable = YUSTAM_VENDORS_TABLE;

    $sql = sprintf(
        'SELECT l.*, v.id AS v_id, v.business_name, v.vendor_uid, v.email AS v_email, v.phone AS v_phone, v.plan AS v_plan, v.verification_status AS v_verification
         FROM `listings` l
         LEFT JOIN `%s` v ON v.id = l.vendor_id
         WHERE l.`public_id` = ? OR l.`firestore_id` = ? OR l.`id` = ?
         LIMIT 1',
        $vendorTable
    );

    $stmt = $db->prepare($sql);
    if (!$stmt instanceof mysqli_stmt) {
        return null;
    }
    $numericId = ctype_digit($identifier) ? (int) $identifier : 0;
    $stmt->bind_param('ssi', $identifier, $identifier, $numericId);
    $stmt->execute();
    $result = $stmt->get_result();
    $row = $result ? $result->fetch_assoc() : null;
    $stmt->close();
    return $row ?: null;
}

function yustam_api_products_list(): array
{
    $result = yustam_api_fetch_listings();
    return [
        'success' => true,
        'items' => $result['items'],
        'pagination' => $result['pagination'],
    ];
}

function yustam_api_products_get(string $productId): array
{
    $row = yustam_api_find_listing($productId);
    if (!$row) {
        yustam_api_error(404, 'Listing not found.');
    }
    $vendor = null;
    if (!empty($row['v_id'])) {
        $vendor = [
            'id' => (int) $row['v_id'],
            'business_name' => $row['business_name'] ?? null,
            'vendor_uid' => $row['vendor_uid'] ?? null,
            'email' => $row['v_email'] ?? null,
            'phone' => $row['v_phone'] ?? null,
            'plan' => $row['v_plan'] ?? null,
            'verification_status' => $row['v_verification'] ?? null,
        ];
    }
    return [
        'success' => true,
        'product' => yustam_api_normalise_listing_row($row, $vendor),
    ];
}

function yustam_api_products_create(): array
{
    $auth = yustam_api_require_auth(['vendor', 'admin']);
    $payload = yustam_api_read_json_body();

    $title = trim((string) ($payload['title'] ?? $payload['name'] ?? ''));
    if ($title === '') {
        yustam_api_error(422, 'Listing title is required.');
    }
    $description = trim((string) ($payload['description'] ?? ''));
    $price = isset($payload['price']) ? (float) $payload['price'] : null;
    if ($price === null || $price <= 0) {
        yustam_api_error(422, 'A valid price is required.');
    }

    $ownerRef = $payload['ownerId'] ?? null;
    $vendorId = null;
    if ($auth['role'] === 'vendor') {
        $vendorId = (int) ($auth['vendorId'] ?? 0);
    } elseif ($ownerRef) {
        [$role, $id] = yustam_api_parse_user_reference((string) $ownerRef);
        if ($role === 'vendor' && $id > 0) {
            $vendorId = $id;
        }
    }
    if (!$vendorId) {
        yustam_api_error(422, 'A vendor must be assigned to the listing.');
    }

    $db = get_db_connection();
    $vendor = yustam_vendor_find_by_id($vendorId, $db);
    if (!$vendor) {
        yustam_api_error(404, 'Vendor account not found.');
    }
    $vendorUid = yustam_vendor_assign_uid_if_missing($db, $vendor);

    $imageUrls = [];
    $videoUrl = trim((string) ($payload['video'] ?? $payload['videoUrl'] ?? ''));

    $appendImage = static function (string $url) use (&$imageUrls): void {
        $normalised = trim($url);
        if ($normalised === '') {
            return;
        }
        $imageUrls[$normalised] = $normalised;
    };

    $mediaPayload = $payload['media'] ?? null;
    if (is_string($mediaPayload)) {
        $decodedMedia = json_decode($mediaPayload, true);
        if (is_array($decodedMedia)) {
            $mediaPayload = $decodedMedia;
        }
    }

    if (is_array($mediaPayload)) {
        foreach ($mediaPayload as $entry) {
            if (is_array($entry)) {
                $mediaUrl = trim((string) ($entry['url'] ?? ''));
                if ($mediaUrl === '') {
                    continue;
                }
                $type = strtolower((string) ($entry['type'] ?? ''));
                if ($type === 'video' && $videoUrl === '') {
                    $videoUrl = $mediaUrl;
                    continue;
                }
                $appendImage($mediaUrl);
            } elseif (is_string($entry)) {
                $appendImage($entry);
            }
        }
    }

    $imagesPayload = $payload['images'] ?? null;
    if ($imagesPayload === null && !is_array($mediaPayload)) {
        $imagesPayload = $payload['media'] ?? [];
    }

    if (is_string($imagesPayload)) {
        $decodedImages = json_decode($imagesPayload, true);
        if (is_array($decodedImages)) {
            $imagesPayload = $decodedImages;
        }
    }

    if (is_array($imagesPayload)) {
        foreach ($imagesPayload as $imageItem) {
            if (is_string($imageItem)) {
                $appendImage($imageItem);
            } elseif (is_array($imageItem) && isset($imageItem['url'])) {
                $appendImage((string) $imageItem['url']);
            }
        }
    }

    $imageUrls = array_values($imageUrls);
    $primaryImage = trim((string) ($payload['primaryImage'] ?? $imageUrls[0] ?? ''));
    if ($primaryImage === '' && $imageUrls) {
        $primaryImage = $imageUrls[0];
    }

    $providedFirestoreId = trim((string) ($payload['firestoreId'] ?? $payload['firestore_id'] ?? ''));
    $providedPublicId = trim((string) ($payload['publicId'] ?? $payload['public_id'] ?? ''));
    $listingId = $providedFirestoreId !== '' ? $providedFirestoreId : 'lst_' . yustam_api_random_string(18);
    $publicId = $providedPublicId !== '' ? $providedPublicId : 'yustam-' . yustam_api_random_string(10);

    yustam_listings_upsert($db, [
        'vendor_id' => $vendorId,
        'vendor_uid' => $vendorUid,
        'firestore_id' => $listingId,
        'public_id' => $publicId,
        'title' => $title,
        'description' => $description,
        'price' => $price,
        'status' => $payload['status'] ?? 'active',
        'primary_image' => $primaryImage,
        'image_urls' => $imageUrls,
        'video_url' => $videoUrl,
        'category' => $payload['category'] ?? '',
        'subcategory' => $payload['subcategory'] ?? '',
        'location' => $payload['location'] ?? '',
        'city' => $payload['city'] ?? '',
        'state' => $payload['state'] ?? '',
        'country' => $payload['country'] ?? '',
    ]);

    return yustam_api_products_get($publicId);
}

function yustam_api_products_update(string $productId): array
{
    $auth = yustam_api_require_auth(['vendor', 'admin']);
    $row = yustam_api_find_listing($productId);
    if (!$row) {
        yustam_api_error(404, 'Listing not found.');
    }
    $vendorId = (int) ($row['vendor_id'] ?? 0);
    if ($auth['role'] !== 'admin' && (int) ($auth['vendorId'] ?? 0) !== $vendorId) {
        yustam_api_error(403, 'You can only update your own listings.');
    }

    $payload = yustam_api_read_json_body();
    $db = get_db_connection();
    $vendor = yustam_vendor_find_by_id($vendorId, $db);
    $vendorUid = $vendor ? yustam_vendor_assign_uid_if_missing($db, $vendor) : ($row['vendor_uid'] ?? '');

    $imageUrls = null;
    $videoUrl = null;
    $videoProvided = false;

    if (array_key_exists('video', $payload) || array_key_exists('videoUrl', $payload)) {
        $videoUrl = trim((string) ($payload['video'] ?? $payload['videoUrl'] ?? ''));
        $videoProvided = true;
    }

    $mediaPayload = $payload['media'] ?? null;
    if ($mediaPayload !== null) {
        if (is_string($mediaPayload)) {
            $decodedMedia = json_decode($mediaPayload, true);
            if (is_array($decodedMedia)) {
                $mediaPayload = $decodedMedia;
            }
        }
        if (is_array($mediaPayload)) {
            $imageAccumulator = [];
            $appendImage = static function (string $url) use (&$imageAccumulator): void {
                $normalised = trim($url);
                if ($normalised === '') {
                    return;
                }
                $imageAccumulator[$normalised] = $normalised;
            };
            foreach ($mediaPayload as $entry) {
                if (is_array($entry)) {
                    $mediaUrl = trim((string) ($entry['url'] ?? ''));
                    if ($mediaUrl === '') {
                        continue;
                    }
                    $type = strtolower((string) ($entry['type'] ?? ''));
                    if ($type === 'video' && !$videoProvided) {
                        $videoUrl = $mediaUrl;
                        $videoProvided = true;
                        continue;
                    }
                    $appendImage($mediaUrl);
                } elseif (is_string($entry)) {
                    $appendImage($entry);
                }
            }
            $imageUrls = array_values($imageAccumulator);
        }
    }

    $imagesPayload = $payload['images'] ?? null;
    if ($imagesPayload !== null) {
        if (is_string($imagesPayload)) {
            $decodedImages = json_decode($imagesPayload, true);
            if (is_array($decodedImages)) {
                $imagesPayload = $decodedImages;
            }
        }
        if (is_array($imagesPayload)) {
            $imageAccumulator = $imageUrls !== null ? array_flip($imageUrls) : [];
            $appendImage = static function (string $url) use (&$imageAccumulator): void {
                $normalised = trim($url);
                if ($normalised === '') {
                    return;
                }
                $imageAccumulator[$normalised] = $normalised;
            };
            foreach ($imagesPayload as $imageItem) {
                if (is_string($imageItem)) {
                    $appendImage($imageItem);
                } elseif (is_array($imageItem) && isset($imageItem['url'])) {
                    $appendImage((string) $imageItem['url']);
                }
            }
            $imageUrls = array_values($imageAccumulator);
        }
    }

    $updatePayload = [
        'vendor_id' => $vendorId,
        'vendor_uid' => $vendorUid,
        'firestore_id' => $row['firestore_id'] ?? $row['public_id'] ?? $productId,
        'public_id' => $row['public_id'] ?? $productId,
    ];
    $payloadFirestoreId = trim((string) ($payload['firestoreId'] ?? $payload['firestore_id'] ?? ''));
    if ($payloadFirestoreId !== '') {
        $updatePayload['firestore_id'] = $payloadFirestoreId;
    }
    $payloadPublicId = trim((string) ($payload['publicId'] ?? $payload['public_id'] ?? ''));
    if ($payloadPublicId !== '') {
        $updatePayload['public_id'] = $payloadPublicId;
    }

    foreach (['title', 'description', 'status', 'category', 'subcategory', 'location', 'city', 'state', 'country'] as $field) {
        if (array_key_exists($field, $payload)) {
            $updatePayload[$field] = $payload[$field];
        }
    }
    if (array_key_exists('price', $payload)) {
        $updatePayload['price'] = (float) $payload['price'];
    }
    if (array_key_exists('primaryImage', $payload)) {
        $updatePayload['primary_image'] = $payload['primaryImage'];
    }
    if ($imageUrls !== null) {
        $updatePayload['image_urls'] = $imageUrls;
    }
    if ($videoProvided) {
        $updatePayload['video_url'] = $videoUrl;
    }

    yustam_listings_upsert($db, $updatePayload);
    return yustam_api_products_get($productId);
}

function yustam_api_products_delete(string $productId): array
{
    $auth = yustam_api_require_auth(['vendor', 'admin']);
    $row = yustam_api_find_listing($productId);
    if (!$row) {
        yustam_api_error(404, 'Listing not found.');
    }
    $vendorId = (int) ($row['vendor_id'] ?? 0);
    if ($auth['role'] !== 'admin' && (int) ($auth['vendorId'] ?? 0) !== $vendorId) {
        yustam_api_error(403, 'You can only delete your own listings.');
    }

    $db = get_db_connection();
    $id = $row['public_id'] ?? $row['firestore_id'] ?? null;
    $stmt = $db->prepare('DELETE FROM `listings` WHERE `public_id` = ? OR `firestore_id` = ? LIMIT 1');
    if ($stmt instanceof mysqli_stmt) {
        $identifier = (string) $id;
        $stmt->bind_param('ss', $identifier, $identifier);
        $stmt->execute();
        $stmt->close();
    }

    return ['success' => true];
}





