<?php
declare(strict_types=1);

/**
 * Centralised CometChat configuration and helper functions for the YUSTAM project.
 */

if (!defined('YUSTAM_COMETCHAT_APP_ID')) {
    define('YUSTAM_COMETCHAT_APP_ID', '1670364000545cd8f');
}

if (!defined('YUSTAM_COMETCHAT_REGION')) {
    define('YUSTAM_COMETCHAT_REGION', 'us');
}

if (!defined('YUSTAM_COMETCHAT_AUTH_KEY')) {
    define('YUSTAM_COMETCHAT_AUTH_KEY', 'ab0e225adcc35b0d8de60ed7a6a1a1073725bc63');
}

if (!defined('YUSTAM_COMETCHAT_REST_API_KEY')) {
    define('YUSTAM_COMETCHAT_REST_API_KEY', 'ed4a12d81f966aac59523a6912d6fb4dcf9a45de');
}

/**
 * Check if the mandatory REST credentials are configured.
 */
function yustam_cometchat_rest_credentials_ready(): bool
{
    return YUSTAM_COMETCHAT_APP_ID !== ''
        && YUSTAM_COMETCHAT_REGION !== ''
        && YUSTAM_COMETCHAT_REST_API_KEY !== ''
        && YUSTAM_COMETCHAT_REST_API_KEY !== 'REPLACE_WITH_REST_API_KEY';
}

/**
 * Build a CometChat REST API URL for the given path segment.
 *
 * @param string $path
 */
function yustam_cometchat_rest_url(string $path): string
{
    $trimmedPath = ltrim($path, '/');
    return sprintf(
        'https://%s.api-%s.cometchat.io/v3/%s',
        rawurlencode(YUSTAM_COMETCHAT_APP_ID),
        rawurlencode(YUSTAM_COMETCHAT_REGION),
        $trimmedPath
    );
}

/**
 * Register or update a user inside CometChat using the REST API.
 *
 * @param string      $uid   Unique identifier (YUSTAM UID).
 * @param string      $name  Display name used in CometChat.
 * @param string|null $role  Optional role metadata (buyer/vendor).
 * @param string|null $avatar Optional avatar URL to sync with CometChat.
 *
 * @return array<string,mixed>
 */
function yustam_cometchat_register_user(
    string $uid,
    string $name,
    ?string $role = null,
    ?string $avatar = null
): array {
    if (!yustam_cometchat_rest_credentials_ready()) {
        return [
            'success' => false,
            'reason' => 'CometChat REST credentials are not configured.',
            'http_code' => 0,
        ];
    }

    $trimmedUid = trim($uid);
    if ($trimmedUid === '') {
        return [
            'success' => false,
            'reason' => 'Missing uid payload.',
            'http_code' => 0,
        ];
    }

    $displayName = trim($name) !== '' ? trim($name) : $trimmedUid;

    $metadata = [];
    if ($role !== null && $role !== '') {
        $metadata['role'] = $role;
    }

    $payload = [
        'uid' => $trimmedUid,
        'name' => $displayName,
    ];

    if ($avatar !== null && $avatar !== '') {
        $payload['avatar'] = $avatar;
    }

    if (!empty($metadata)) {
        $payload['metadata'] = $metadata;
    }

    $createResult = yustam_cometchat_execute_rest_request(
        'POST',
        yustam_cometchat_rest_url('users'),
        $payload
    );

    $httpCode = $createResult['http_code'] ?? 0;

    if ($httpCode === 200 || $httpCode === 201) {
        return [
            'success' => true,
            'status' => 'created',
            'http_code' => $httpCode,
            'response' => $createResult['response'] ?? null,
        ];
    }

    if ($httpCode === 409) {
        // User already exists – attempt an update to refresh profile details.
        $updatePayload = $payload;
        unset($updatePayload['uid']);

        $updateResult = yustam_cometchat_execute_rest_request(
            'PUT',
            yustam_cometchat_rest_url('users/' . rawurlencode($trimmedUid)),
            $updatePayload
        );

        $updateCode = $updateResult['http_code'] ?? 0;

        if ($updateCode >= 200 && $updateCode < 300) {
            return [
                'success' => true,
                'status' => 'exists',
                'http_code' => $updateCode,
                'response' => $updateResult['response'] ?? null,
            ];
        }

        return [
            'success' => false,
            'reason' => 'Unable to update existing CometChat user.',
            'http_code' => $updateCode,
            'response' => $updateResult['response'] ?? null,
        ];
    }

    return [
        'success' => false,
        'reason' => 'CometChat user creation failed.',
        'http_code' => $httpCode,
        'response' => $createResult['response'] ?? null,
    ];
}

/**
 * Send a text message between two CometChat users via the REST API.
 *
 * @param string               $senderUid
 * @param string               $receiverUid
 * @param string               $text
 * @param array<string, mixed> $metadata
 *
 * @return array<string, mixed>
 */
function yustam_cometchat_send_text_message(
    string $senderUid,
    string $receiverUid,
    string $text,
    array $metadata = []
): array {
    if (!yustam_cometchat_rest_credentials_ready()) {
        return [
            'success' => false,
            'reason' => 'CometChat REST credentials are not configured on the server.',
            'http_code' => 0,
        ];
    }

    $sender = trim($senderUid);
    $receiver = trim($receiverUid);
    $payload = [
        'category' => 'message',
        'type' => 'text',
        'receiver' => $receiver,
        'receiverType' => 'user',
        'sender' => $sender,
        'data' => [
            'text' => $text,
        ],
    ];

    if (!empty($metadata)) {
        $payload['data']['metadata'] = $metadata;
    }

    $response = yustam_cometchat_execute_rest_request(
        'POST',
        yustam_cometchat_rest_url('messages'),
        $payload
    );

    $httpCode = (int) ($response['http_code'] ?? 0);

    return [
        'success' => $httpCode >= 200 && $httpCode < 300,
        'http_code' => $httpCode,
        'response' => $response['response'] ?? null,
    ];
}

/**
 * Call the internal API endpoint that wraps CometChat user creation.
 *
 * @param string      $uid
 * @param string      $name
 * @param string|null $role
 * @param string|null $avatar
 *
 * @return array<string,mixed>|null
 */
function yustam_cometchat_call_internal_endpoint(
    string $uid,
    string $name,
    ?string $role = null,
    ?string $avatar = null
): ?array {
    $scheme = 'http';
    if (
        (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
        || (isset($_SERVER['REQUEST_SCHEME']) && $_SERVER['REQUEST_SCHEME'] === 'https')
        || (isset($_SERVER['SERVER_PORT']) && (int) $_SERVER['SERVER_PORT'] === 443)
    ) {
        $scheme = 'https';
    }

    $host = $_SERVER['HTTP_HOST'] ?? ($_SERVER['SERVER_NAME'] ?? 'localhost');
    $endpoint = $scheme . '://' . $host . '/api/cometchat/create-user.php';

    $ch = curl_init($endpoint);
    if ($ch === false) {
        return null;
    }

    $postFields = [
        'uid' => $uid,
        'name' => $name,
    ];

    if ($role !== null) {
        $postFields['role'] = $role;
    }

    if ($avatar !== null) {
        $postFields['avatar'] = $avatar;
    }

    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 6,
        CURLOPT_POSTFIELDS => http_build_query($postFields),
        CURLOPT_HTTPHEADER => [
            'Accept: application/json',
        ],
    ]);

    $responseBody = curl_exec($ch);
    $error = curl_error($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($responseBody === false) {
        error_log('CometChat internal sync failed: ' . $error);
        return null;
    }

    $decoded = json_decode($responseBody, true);
    if (!is_array($decoded)) {
        $decoded = [
            'success' => false,
            'reason' => 'Unexpected response payload.',
        ];
    }

    $decoded['http_code'] = $httpCode;
    return $decoded;
}

/**
 * Execute a REST request towards the CometChat API.
 *
 * @param string              $method
 * @param string              $url
 * @param array<string,mixed> $payload
 *
 * @return array<string,mixed>
 */
function yustam_cometchat_execute_rest_request(string $method, string $url, array $payload): array
{
    $ch = curl_init($url);
    if ($ch === false) {
        return [
            'http_code' => 0,
            'response' => null,
        ];
    }

    $body = json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

    $options = [
        CURLOPT_CUSTOMREQUEST => strtoupper($method),
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => [
            'Content-Type: application/json',
            'Accept: application/json',
            'appid: ' . YUSTAM_COMETCHAT_APP_ID,
            'apikey: ' . YUSTAM_COMETCHAT_REST_API_KEY,
        ],
        CURLOPT_TIMEOUT => 8,
        CURLOPT_CONNECTTIMEOUT => 4,
        CURLOPT_POSTFIELDS => $body,
    ];

    curl_setopt_array($ch, $options);
    $responseBody = curl_exec($ch);
    $errorMessage = curl_error($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($responseBody === false) {
        error_log('CometChat REST call error: ' . $errorMessage);
        return [
            'http_code' => $httpCode,
            'response' => null,
        ];
    }

    $decoded = json_decode($responseBody, true);

    return [
        'http_code' => $httpCode,
        'response' => $decoded ?? $responseBody,
    ];
}
