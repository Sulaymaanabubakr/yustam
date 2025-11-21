<?php
declare(strict_types=1);

function yustam_cloudinary_credentials(): array
{
    static $cache = null;
    if ($cache !== null) {
        return $cache;
    }

    $cloudName = yustam_api_env('CLOUDINARY_CLOUD_NAME');
    $apiKey = yustam_api_env('CLOUDINARY_API_KEY');
    $apiSecret = yustam_api_env('CLOUDINARY_API_SECRET');
    $uploadPreset = yustam_api_env('CLOUDINARY_SIGNED_UPLOAD_PRESET', 'yustam_video_signed');

    return $cache = [
        'cloudName' => $cloudName,
        'apiKey' => $apiKey,
        'apiSecret' => $apiSecret,
        'uploadPreset' => $uploadPreset,
    ];
}

function yustam_cloudinary_check_credentials(): void
{
    $credentials = yustam_cloudinary_credentials();
    if (empty($credentials['cloudName']) || empty($credentials['apiKey']) || empty($credentials['apiSecret'])) {
        yustam_api_error(500, 'Cloudinary credentials are not configured.');
    }
}

function yustam_cloudinary_sanitize_folder(?string $folder): string
{
    $value = trim((string) $folder);
    if ($value === '') {
        return '';
    }
    $value = str_replace('..', '', $value);
    $value = str_replace(['\\', '//'], '/', $value);
    $value = preg_replace('/[^A-Za-z0-9_\-\/]/', '', $value) ?? '';
    $value = trim($value, '/');
    return $value;
}

function yustam_cloudinary_sanitize_public_id(?string $publicId): string
{
    $value = trim((string) $publicId);
    if ($value === '') {
        return '';
    }
    $value = preg_replace('/[^A-Za-z0-9_\-]/', '_', $value) ?? '';
    return substr($value, 0, 120);
}

function yustam_cloudinary_generate_public_id(array $user, string $resourceType = 'image'): string
{
    $role = strtolower((string) ($user['role'] ?? 'user'));
    $role = preg_replace('/[^a-z]/', '', $role) ?: 'user';
    $prefix = $resourceType === 'video' ? 'vid' : 'img';
    $identifier = $user['vendorUid'] ?? $user['firebaseUid'] ?? $user['id'] ?? '';
    $identifier = preg_replace('/[^A-Za-z0-9]/', '', (string) $identifier) ?: 'asset';
    $hash = substr(hash('sha1', microtime(true) . random_int(1000, 9999)), 0, 10);
    return sprintf('%s_%s_%s_%s', $prefix, $role, substr($identifier, -6), $hash);
}

function yustam_cloudinary_normalise_param_value(mixed $value): ?string
{
    if ($value === null) {
        return null;
    }
    if (is_bool($value)) {
        return $value ? 'true' : 'false';
    }
    if (is_array($value)) {
        $flattened = array_filter(array_map(static function ($item) {
            return $item === null ? null : (string) $item;
        }, $value), static function ($item) {
            return $item !== null && $item !== '';
        });
        return $flattened ? implode(',', $flattened) : null;
    }
    $stringValue = (string) $value;
    return $stringValue === '' ? null : $stringValue;
}

function yustam_cloudinary_sign(array $params): string
{
    $credentials = yustam_cloudinary_credentials();
    if (empty($credentials['apiSecret'])) {
        yustam_api_error(500, 'Cloudinary API secret missing.');
    }

    ksort($params);
    $components = [];
    foreach ($params as $key => $value) {
        if ($key === 'signature' || $key === 'api_key' || $key === 'resource_type') {
            continue;
        }
        $normalised = yustam_cloudinary_normalise_param_value($value);
        if ($normalised === null) {
            continue;
        }
        $components[] = $key . '=' . $normalised;
    }
    $baseString = implode('&', $components);
    return sha1($baseString . $credentials['apiSecret']);
}

function yustam_cloudinary_prepare_payload(array $params): array
{
    $payload = [];
    foreach ($params as $key => $value) {
        $normalised = yustam_cloudinary_normalise_param_value($value);
        if ($normalised === null) {
            continue;
        }
        $payload[$key] = $normalised;
    }
    return $payload;
}

function yustam_cloudinary_request(string $resourceType, string $action, array $params): array
{
    yustam_cloudinary_check_credentials();
    $credentials = yustam_cloudinary_credentials();

    $resource = strtolower($resourceType);
    if (!in_array($resource, ['image', 'video', 'raw', 'auto'], true)) {
        $resource = 'image';
    }
    if ($resource === 'auto') {
        $resource = 'image';
    }

    if (!isset($params['timestamp'])) {
        $params['timestamp'] = time();
    }

    $signature = yustam_cloudinary_sign($params);
    $payload = yustam_cloudinary_prepare_payload($params + [
        'api_key' => $credentials['apiKey'],
        'signature' => $signature,
    ]);

    $endpoint = sprintf(
        'https://api.cloudinary.com/v1_1/%s/%s/%s',
        rawurlencode((string) $credentials['cloudName']),
        rawurlencode($resource),
        rawurlencode($action)
    );

    $handle = curl_init($endpoint);
    if ($handle === false) {
        throw new RuntimeException('Failed to initialise Cloudinary request.');
    }

    curl_setopt_array($handle, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => $payload,
        CURLOPT_TIMEOUT => 45,
    ]);

    $raw = curl_exec($handle);
    if ($raw === false) {
        $error = curl_error($handle);
        curl_close($handle);
        throw new RuntimeException('Cloudinary request failed: ' . $error);
    }

    $status = (int) curl_getinfo($handle, CURLINFO_RESPONSE_CODE);
    curl_close($handle);

    $decoded = json_decode($raw, true);
    if (!is_array($decoded)) {
        throw new RuntimeException(sprintf('Unexpected Cloudinary response (HTTP %d).', $status));
    }
    if ($status >= 400 || isset($decoded['error'])) {
        $message = $decoded['error']['message'] ?? $decoded['error'] ?? 'Cloudinary error.';
        throw new RuntimeException(sprintf('Cloudinary API error: %s', (string) $message));
    }

    return $decoded;
}

function yustam_cloudinary_build_watermark(string $publicId, string $vendorName, string $resourceType = 'image', array $options = []): array
{
    $headline = $options['headline'] ?? 'POSTED ON YUSTAM';
    $bylineSource = $options['byline'] ?? $vendorName;
    $byline = strtoupper(trim(preg_replace('/[^A-Za-z0-9\s]/', '', (string) $bylineSource) ?? ''));
    if ($byline === '') {
        $byline = 'YUSTAM VENDOR';
    }

    $fontHeadline = $options['headlineFont'] ?? 'Arial';
    $fontByline = $options['bylineFont'] ?? 'Arial';
    $headlineSize = (int) ($options['headlineSize'] ?? 60);
    $bylineSize = (int) ($options['bylineSize'] ?? 72);
    $color = $options['color'] ?? 'ffffff';
    $background = $options['background'] ?? '000000';
    $opacity = (int) ($options['opacity'] ?? 72);

    $lineOne = sprintf(
        'l_text:%s_%d_bold:%s,co_rgb:%s,b_rgb:%s,g_center,y_-90,opacity_%d',
        $fontHeadline,
        max(24, min(120, $headlineSize)),
        rawurlencode($headline),
        $color,
        $background,
        max(30, min(100, $opacity))
    );

    $lineTwo = sprintf(
        'l_text:%s_%d_bold:%s,co_rgb:%s,b_rgb:%s,g_center,y_0,opacity_%d',
        $fontByline,
        max(28, min(140, $bylineSize)),
        rawurlencode($byline),
        $color,
        $background,
        max(35, min(100, $opacity + 5))
    );

    $derivedPublicId = yustam_cloudinary_sanitize_public_id($publicId . '__wm');
    $format = $options['format'] ?? ($resourceType === 'video' ? 'mp4' : 'jpg');

    return [
        'transformation' => $lineOne . '/' . $lineTwo,
        'publicId' => $derivedPublicId,
        'format' => $format,
    ];
}

function yustam_cloudinary_apply_watermark(string $publicId, string $vendorName, string $resourceType = 'image', array $options = []): array
{
    $sanitisedId = yustam_cloudinary_sanitize_public_id($publicId);
    if ($sanitisedId === '') {
        throw new RuntimeException('Invalid Cloudinary public ID provided.');
    }

    $resource = strtolower($resourceType);
    if (!in_array($resource, ['image', 'video'], true)) {
        $resource = 'image';
    }

    $watermark = yustam_cloudinary_build_watermark($sanitisedId, $vendorName, $resource, $options);

    $response = yustam_cloudinary_request($resource, 'explicit', [
        'public_id' => $sanitisedId,
        'type' => 'upload',
        'overwrite' => 'true',
        'eager' => $watermark['transformation'],
        'eager_async' => 'false',
        'eager_public_id' => $watermark['publicId'],
        'eager_format' => $watermark['format'],
    ]);

    $derived = $response['eager'][0] ?? [];
    $secureUrl = $derived['secure_url'] ?? ($response['secure_url'] ?? null);

    return [
        'public_id' => $derived['public_id'] ?? $watermark['publicId'],
        'secure_url' => $secureUrl,
        'resource_type' => $resource,
        'width' => $derived['width'] ?? $response['width'] ?? null,
        'height' => $derived['height'] ?? $response['height'] ?? null,
        'duration' => $derived['duration'] ?? $response['duration'] ?? null,
        'transformation' => $watermark['transformation'],
    ];
}
