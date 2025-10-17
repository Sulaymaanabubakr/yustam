<?php
declare(strict_types=1);

const YUSTAM_FIRESTORE_SCOPE = 'https://www.googleapis.com/auth/datastore';

function yustam_chat_service_account(): array
{
    static $serviceAccount = null;
    if ($serviceAccount !== null) {
        return $serviceAccount;
    }

    $json = getenv('FIREBASE_SERVICE_ACCOUNT');
    if ($json && trim($json) !== '') {
        $decoded = json_decode($json, true);
        if (is_array($decoded)) {
            return $serviceAccount = $decoded;
        }
    }

    $path = getenv('GOOGLE_APPLICATION_CREDENTIALS');
    if ($path && is_file($path)) {
        $decoded = json_decode((string)file_get_contents($path), true);
        if (is_array($decoded)) {
            return $serviceAccount = $decoded;
        }
    }

    $defaultPath = __DIR__ . '/../../firebase-service-account.json';
    if (is_file($defaultPath)) {
        $decoded = json_decode((string)file_get_contents($defaultPath), true);
        if (is_array($decoded)) {
            return $serviceAccount = $decoded;
        }
    }

    throw new RuntimeException('Firebase service account credentials not configured.');
}

function yustam_chat_project_id(): string
{
    $account = yustam_chat_service_account();
    if (!isset($account['project_id'])) {
        throw new RuntimeException('Service account missing project_id.');
    }
    return (string)$account['project_id'];
}

function yustam_chat_firestore_endpoint(string $path): string
{
    $projectId = urlencode(yustam_chat_project_id());
    return sprintf('https://firestore.googleapis.com/v1/projects/%s/databases/(default)%s', $projectId, $path);
}

function yustam_chat_access_token(): string
{
    static $token = null;
    static $expiresAt = 0;
    if ($token && time() < $expiresAt - 60) {
        return $token;
    }

    $account = yustam_chat_service_account();
    $now = time();
    $header = ['alg' => 'RS256', 'typ' => 'JWT'];
    $payload = [
        'iss' => $account['client_email'],
        'scope' => YUSTAM_FIRESTORE_SCOPE,
        'aud' => 'https://oauth2.googleapis.com/token',
        'iat' => $now,
        'exp' => $now + 3600,
    ];

    $jwt = yustam_jwt_encode($header, $payload, $account['private_key']);
    $response = yustam_http_post('https://oauth2.googleapis.com/token', [
        'grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        'assertion' => $jwt,
    ]);
    if (($response['status'] ?? 0) !== 200) {
        throw new RuntimeException('Failed to obtain Firebase access token.');
    }
    $data = json_decode($response['body'], true);
    if (!isset($data['access_token'])) {
        throw new RuntimeException('Invalid token response from Google.');
    }
    $token = (string)$data['access_token'];
    $expiresAt = $now + (int)($data['expires_in'] ?? 3600);
    return $token;
}

function yustam_jwt_encode(array $header, array $payload, string $privateKey): string
{
    $segments = [];
    $segments[] = rtrim(strtr(base64_encode(json_encode($header)), '+/', '-_'), '=');
    $segments[] = rtrim(strtr(base64_encode(json_encode($payload)), '+/', '-_'), '=');
    $signingInput = implode('.', $segments);
    $signature = '';
    $success = openssl_sign($signingInput, $signature, $privateKey, 'sha256');
    if (!$success) {
        throw new RuntimeException('Unable to sign JWT.');
    }
    $segments[] = rtrim(strtr(base64_encode($signature), '+/', '-_'), '=');
    return implode('.', $segments);
}

function yustam_http_post(string $url, array $data, array $headers = []): array
{
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, array_merge(['Content-Type: application/x-www-form-urlencoded'], $headers));
    curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($data));
    $body = curl_exec($ch);
    $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    if ($body === false) {
        throw new RuntimeException('HTTP request failed: ' . curl_error($ch));
    }
    curl_close($ch);
    return ['status' => $status, 'body' => $body];
}

function yustam_http_json(string $method, string $url, ?array $payload = null): array
{
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    $headers = ['Authorization: Bearer ' . yustam_chat_access_token(), 'Content-Type: application/json'];
    if ($payload !== null) {
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
    }
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    $body = curl_exec($ch);
    $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    if ($body === false) {
        throw new RuntimeException('HTTP request failed: ' . curl_error($ch));
    }
    curl_close($ch);
    return ['status' => $status, 'body' => $body];
}

function yustam_firestore_commit(array $writes): array
{
    $endpoint = yustam_chat_firestore_endpoint('/documents:commit');
    $payload = ['writes' => $writes];
    $response = yustam_http_json('POST', $endpoint, $payload);
    if ($response['status'] >= 200 && $response['status'] < 300) {
        return json_decode($response['body'], true) ?? [];
    }
    throw new RuntimeException('Firestore commit failed: ' . $response['body']);
}

function yustam_firestore_get_document(string $path): ?array
{
    $endpoint = yustam_chat_firestore_endpoint('/documents/' . $path);
    $response = yustam_http_json('GET', $endpoint);
    if ($response['status'] === 200) {
        return json_decode($response['body'], true);
    }
    if ($response['status'] === 404) {
        return null;
    }
    throw new RuntimeException('Firestore get failed: ' . $response['body']);
}

function yustam_firestore_run_query(array $structuredQuery): array
{
    $endpoint = yustam_chat_firestore_endpoint('/documents:runQuery');
    $response = yustam_http_json('POST', $endpoint, ['structuredQuery' => $structuredQuery]);
    if ($response['status'] >= 200 && $response['status'] < 300) {
        $lines = array_filter(array_map('trim', explode("\n", trim($response['body']))));
        $results = [];
        foreach ($lines as $line) {
            $decoded = json_decode($line, true);
            if ($decoded) {
                $results[] = $decoded;
            }
        }
        if (!$results) {
            $decoded = json_decode($response['body'], true);
            if (is_array($decoded)) {
                $results = $decoded;
            }
        }
        return $results;
    }
    throw new RuntimeException('Firestore query failed: ' . $response['body']);
}

function yustam_firestore_document_path(string ...$segments): string
{
    $projectId = yustam_chat_project_id();
    $path = implode('/', array_map(static fn($segment) => rawurlencode($segment), $segments));
    return sprintf('projects/%s/databases/(default)/documents/%s', $projectId, $path);
}

function yustam_firestore_string(?string $value): array
{
    return ['stringValue' => (string)$value];
}

function yustam_firestore_integer(int $value): array
{
    return ['integerValue' => (string)$value];
}

function yustam_firestore_double(float $value): array
{
    return ['doubleValue' => $value];
}

function yustam_firestore_boolean(bool $value): array
{
    return ['booleanValue' => $value];
}

function yustam_firestore_map(array $fields): array
{
    return ['mapValue' => ['fields' => $fields]];
}

function yustam_firestore_null(): array
{
    return ['nullValue' => null];
}

function yustam_firestore_field($value): array
{
    if ($value === null) {
        return yustam_firestore_null();
    }
    if (is_bool($value)) {
        return yustam_firestore_boolean($value);
    }
    if (is_int($value)) {
        return yustam_firestore_integer($value);
    }
    if (is_float($value)) {
        return yustam_firestore_double($value);
    }
    if (is_array($value)) {
        return yustam_firestore_map(array_map('yustam_firestore_field', $value));
    }
    return yustam_firestore_string((string)$value);
}

function yustam_firestore_decode(array $value)
{
    if (isset($value['stringValue'])) {
        return (string)$value['stringValue'];
    }
    if (isset($value['integerValue'])) {
        return (int)$value['integerValue'];
    }
    if (isset($value['doubleValue'])) {
        return (float)$value['doubleValue'];
    }
    if (isset($value['booleanValue'])) {
        return (bool)$value['booleanValue'];
    }
    if (isset($value['mapValue']['fields'])) {
        $decoded = [];
        foreach ($value['mapValue']['fields'] as $key => $inner) {
            $decoded[$key] = yustam_firestore_decode($inner);
        }
        return $decoded;
    }
    if (isset($value['arrayValue']['values'])) {
        return array_map('yustam_firestore_decode', $value['arrayValue']['values']);
    }
    if (isset($value['timestampValue'])) {
        return $value['timestampValue'];
    }
    if (array_key_exists('nullValue', $value)) {
        return null;
    }
    return $value;
}

