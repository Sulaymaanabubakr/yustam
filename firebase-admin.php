<?php
declare(strict_types=1);

require_once __DIR__ . '/firebase-support.php';

const YUSTAM_FIREBASE_IDENTITY_SCOPE = 'https://www.googleapis.com/auth/identitytoolkit';

function yustam_firebase_identity_base_url(): string
{
    return 'https://identitytoolkit.googleapis.com/v1';
}

/**
 * Perform an Identity Toolkit request authenticated with the service account.
 *
 * @return array{status:int,body:string}
 */
function yustam_firebase_identity_admin_request(string $method, string $path, ?array $payload = null): array
{
    $url = rtrim(yustam_firebase_identity_base_url(), '/') . '/' . ltrim($path, '/');
    $headers = [
        'Authorization: Bearer ' . yustam_firebase_access_token([YUSTAM_FIREBASE_IDENTITY_SCOPE]),
    ];
    return yustam_firebase_http_json($method, $url, $payload, $headers);
}

/**
 * Perform an Identity Toolkit request that relies on the Web API key.
 *
 * @return array{status:int,body:string}
 */
function yustam_firebase_identity_web_request(string $method, string $path, array $payload): array
{
    $url = sprintf(
        '%s/%s?key=%s',
        rtrim(yustam_firebase_identity_base_url(), '/'),
        ltrim($path, '/'),
        rawurlencode(yustam_firebase_api_key())
    );

    return yustam_firebase_http_json($method, $url, $payload);
}

/**
 * Create a Firebase Authentication user using the admin credentials.
 *
 * @return array Decoded Firebase response.
 */
function yustam_firebase_create_user(string $email, string $password, ?string $displayName = null): array
{
    $projectId = yustam_firebase_project_id();
    $payload = [
        'email' => strtolower(trim($email)),
        'password' => $password,
        'displayName' => $displayName ?: null,
        'disabled' => false,
    ];

    $response = yustam_firebase_identity_admin_request(
        'POST',
        sprintf('projects/%s/accounts:signUp', $projectId),
        $payload
    );

    if ($response['status'] < 200 || $response['status'] >= 300) {
        throw new RuntimeException('Firebase create user failed: ' . $response['body']);
    }

    $data = json_decode($response['body'], true);
    if (!is_array($data) || empty($data['localId'])) {
        throw new RuntimeException('Firebase create user response missing localId.');
    }

    return $data;
}

/**
 * Sign in a Firebase user using email and password (Identity Toolkit REST API).
 *
 * @return array Decoded Firebase response containing idToken/localId when successful.
 */
function yustam_firebase_sign_in_with_password(string $email, string $password): array
{
    $payload = [
        'email' => strtolower(trim($email)),
        'password' => $password,
        'returnSecureToken' => true,
    ];

    $response = yustam_firebase_identity_web_request('POST', 'accounts:signInWithPassword', $payload);

    if ($response['status'] < 200 || $response['status'] >= 300) {
        throw new RuntimeException('Firebase sign-in failed: ' . $response['body']);
    }

    $data = json_decode($response['body'], true);
    if (!is_array($data) || empty($data['localId'])) {
        throw new RuntimeException('Firebase sign-in response missing localId.');
    }

    return $data;
}

/**
 * Lookup a Firebase user using an ID token obtained on the client.
 *
 * @return array Decoded user record.
 */
function yustam_firebase_lookup_id_token(string $idToken): array
{
    $payload = ['idToken' => trim($idToken)];
    $response = yustam_firebase_identity_web_request('POST', 'accounts:lookup', $payload);

    if ($response['status'] < 200 || $response['status'] >= 300) {
        throw new RuntimeException('Firebase token lookup failed: ' . $response['body']);
    }

    $data = json_decode($response['body'], true);
    if (!is_array($data) || empty($data['users']) || !is_array($data['users'])) {
        throw new RuntimeException('Firebase lookup did not return a user.');
    }

    return $data['users'][0];
}

/**
 * Lookup a Firebase user by UID using admin credentials.
 *
 * @return array|null
 */
function yustam_firebase_get_user_by_uid(string $firebaseUid): ?array
{
    $trimmed = trim($firebaseUid);
    if ($trimmed === '') {
        return null;
    }

    $projectId = yustam_firebase_project_id();
    $payload = ['localId' => [$trimmed]];

    $response = yustam_firebase_identity_admin_request(
        'POST',
        sprintf('projects/%s/accounts:lookup', $projectId),
        $payload
    );

    if ($response['status'] < 200 || $response['status'] >= 300) {
        throw new RuntimeException('Firebase admin lookup failed: ' . $response['body']);
    }

    $data = json_decode($response['body'], true);
    if (!is_array($data) || empty($data['users']) || !is_array($data['users'])) {
        return null;
    }

    return $data['users'][0];
}

/**
 * Generate a password reset link using the Firebase Admin REST API.
 */
function yustam_firebase_generate_password_reset_link(string $email, string $continueUrl): string
{
    $projectId = yustam_firebase_project_id();
    $payload = [
        'requestType' => 'PASSWORD_RESET',
        'email' => strtolower(trim($email)),
        'continueUrl' => $continueUrl,
        'returnOobLink' => true,
    ];

    $response = yustam_firebase_identity_admin_request(
        'POST',
        sprintf('projects/%s/accounts:sendOobCode', $projectId),
        $payload
    );

    if ($response['status'] < 200 || $response['status'] >= 300) {
        throw new RuntimeException('Firebase password reset link failed: ' . $response['body']);
    }

    $data = json_decode($response['body'], true);
    if (empty($data['oobLink'])) {
        throw new RuntimeException('Firebase password reset response missing oobLink.');
    }

    return (string) $data['oobLink'];
}

/**
 * Generate an email verification link using the Firebase Admin REST API.
 */
function yustam_firebase_generate_email_verification_link(string $email, string $continueUrl): string
{
    $projectId = yustam_firebase_project_id();
    $payload = [
        'requestType' => 'VERIFY_EMAIL',
        'email' => strtolower(trim($email)),
        'continueUrl' => $continueUrl,
        'returnOobLink' => true,
    ];

    $response = yustam_firebase_identity_admin_request(
        'POST',
        sprintf('projects/%s/accounts:sendOobCode', $projectId),
        $payload
    );

    if ($response['status'] < 200 || $response['status'] >= 300) {
        throw new RuntimeException('Firebase email verification link failed: ' . $response['body']);
    }

    $data = json_decode($response['body'], true);
    if (empty($data['oobLink'])) {
        throw new RuntimeException('Firebase email verification response missing oobLink.');
    }

    return (string) $data['oobLink'];
}
