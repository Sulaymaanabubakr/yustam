<?php
declare(strict_types=1);

/**
 * Shared helpers for interacting with Firebase/Google services using a service account.
 */

const YUSTAM_FIREBASE_SERVICE_ACCOUNT_FILENAME = 'firebase-service-account.json';

/**
 * Load the Firebase configuration array from disk.
 */
function yustam_firebase_config(): array
{
    static $config = null;
    if ($config !== null) {
        return $config;
    }

    $path = __DIR__ . '/firebase-config.php';
    if (is_file($path)) {
        $loaded = require $path;
        if (is_array($loaded)) {
            return $config = $loaded;
        }
    }

    return $config = [];
}

/**
 * Retrieve the Firebase service account credentials.
 *
 * @throws RuntimeException When credentials are not configured.
 */
function yustam_firebase_service_account(): array
{
    static $serviceAccount = null;
    if ($serviceAccount !== null) {
        return $serviceAccount;
    }

    $inline = getenv('FIREBASE_SERVICE_ACCOUNT');
    if ($inline) {
        $decoded = json_decode($inline, true);
        if (is_array($decoded)) {
            return $serviceAccount = $decoded;
        }
    }

    $envPath = getenv('GOOGLE_APPLICATION_CREDENTIALS');
    if ($envPath && is_file($envPath)) {
        $decoded = json_decode((string) file_get_contents($envPath), true);
        if (is_array($decoded)) {
            return $serviceAccount = $decoded;
        }
    }

    $defaultPath = __DIR__ . '/' . YUSTAM_FIREBASE_SERVICE_ACCOUNT_FILENAME;
    if (is_file($defaultPath)) {
        $decoded = json_decode((string) file_get_contents($defaultPath), true);
        if (is_array($decoded)) {
            return $serviceAccount = $decoded;
        }
    }

    throw new RuntimeException('Firebase service account credentials not configured.');
}

/**
 * Determine whether Firebase service account credentials are available.
 */
function yustam_firebase_service_account_available(): bool
{
    try {
        yustam_firebase_service_account();
        return true;
    } catch (Throwable $exception) {
        return false;
    }
}

/**
 * Determine the Firebase project ID.
 *
 * @throws RuntimeException When the project ID is unavailable.
 */
function yustam_firebase_project_id(): string
{
    $projectId = getenv('FIREBASE_PROJECT_ID');
    if ($projectId) {
        return trim($projectId);
    }

    $account = yustam_firebase_service_account();
    if (!empty($account['project_id'])) {
        return (string) $account['project_id'];
    }

    $config = yustam_firebase_config();
    if (!empty($config['projectId'])) {
        return (string) $config['projectId'];
    }

    throw new RuntimeException('Firebase project ID not configured.');
}

/**
 * Resolve the Firebase Web API key used for Identity Toolkit requests.
 *
 * @throws RuntimeException When the API key is missing.
 */
function yustam_firebase_api_key(): string
{
    $apiKey = getenv('FIREBASE_WEB_API_KEY');
    if ($apiKey) {
        return trim($apiKey);
    }

    $config = yustam_firebase_config();
    if (!empty($config['apiKey'])) {
        return (string) $config['apiKey'];
    }

    throw new RuntimeException('Firebase Web API key not configured.');
}

/**
 * Generate a signed JWT for the provided service account and scopes.
 */
function yustam_firebase_jwt(array $serviceAccount, array $scopes, ?int $issuedAt = null): string
{
    $issuedAt = $issuedAt ?? time();
    $scopesString = implode(' ', $scopes);

    if (empty($serviceAccount['client_email']) || empty($serviceAccount['private_key'])) {
        throw new RuntimeException('Firebase service account is missing client_email or private_key.');
    }

    $header = ['alg' => 'RS256', 'typ' => 'JWT'];
    $payload = [
        'iss' => $serviceAccount['client_email'],
        'scope' => $scopesString,
        'aud' => 'https://oauth2.googleapis.com/token',
        'iat' => $issuedAt,
        'exp' => $issuedAt + 3600,
    ];

    $segments = [];
    $segments[] = rtrim(strtr(base64_encode(json_encode($header, JSON_THROW_ON_ERROR)), '+/', '-_'), '=');
    $segments[] = rtrim(strtr(base64_encode(json_encode($payload, JSON_THROW_ON_ERROR)), '+/', '-_'), '=');
    $signingInput = implode('.', $segments);

    $signature = '';
    $success = openssl_sign($signingInput, $signature, $serviceAccount['private_key'], 'sha256');
    if (!$success) {
        throw new RuntimeException('Unable to sign Firebase JWT.');
    }

    $segments[] = rtrim(strtr(base64_encode($signature), '+/', '-_'), '=');
    return implode('.', $segments);
}

/**
 * Request an OAuth access token for the provided scopes.
 */
function yustam_firebase_access_token(array $scopes): string
{
    static $cache = [];
    sort($scopes);
    $cacheKey = implode(' ', $scopes);
    $now = time();

    if (isset($cache[$cacheKey]) && $cache[$cacheKey]['expires_at'] > ($now + 60)) {
        return $cache[$cacheKey]['token'];
    }

    $serviceAccount = yustam_firebase_service_account();
    $jwt = yustam_firebase_jwt($serviceAccount, $scopes, $now);

    $response = yustam_firebase_http_form('https://oauth2.googleapis.com/token', [
        'grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        'assertion' => $jwt,
    ]);

    if (($response['status'] ?? 0) !== 200) {
        throw new RuntimeException('Failed to obtain Firebase access token: ' . ($response['body'] ?? ''));
    }

    $data = json_decode($response['body'], true);
    if (empty($data['access_token'])) {
        throw new RuntimeException('Invalid Firebase access token response.');
    }

    $cache[$cacheKey] = [
        'token' => (string) $data['access_token'],
        'expires_at' => $now + (int) ($data['expires_in'] ?? 3600),
    ];

    return $cache[$cacheKey]['token'];
}

/**
 * Execute an HTTP request and return the status/body pair.
 *
 * @return array{status:int,body:string}
 */
function yustam_firebase_http_request(string $method, string $url, array $headers = [], ?string $body = null): array
{
    $ch = curl_init($url);
    if ($ch === false) {
        throw new RuntimeException('Unable to initialize cURL.');
    }

    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, strtoupper($method));
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, false);
    curl_setopt($ch, CURLOPT_TIMEOUT, 30);

    if ($headers) {
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    }

    if ($body !== null) {
        curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
    }

    $responseBody = curl_exec($ch);
    if ($responseBody === false) {
        $error = curl_error($ch);
        curl_close($ch);
        throw new RuntimeException('HTTP request failed: ' . $error);
    }

    $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    return ['status' => $status, 'body' => $responseBody];
}

/**
 * Perform a JSON request with optional payload.
 *
 * @return array{status:int,body:string}
 */
function yustam_firebase_http_json(string $method, string $url, ?array $payload = null, array $headers = []): array
{
    $headers[] = 'Content-Type: application/json';
    $headers[] = 'Accept: application/json';
    $body = $payload === null ? null : json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    return yustam_firebase_http_request($method, $url, $headers, $body);
}

/**
 * Perform a form-encoded POST request.
 *
 * @return array{status:int,body:string}
 */
function yustam_firebase_http_form(string $url, array $data, array $headers = []): array
{
    $headers[] = 'Content-Type: application/x-www-form-urlencoded';
    return yustam_firebase_http_request('POST', $url, $headers, http_build_query($data));
}
