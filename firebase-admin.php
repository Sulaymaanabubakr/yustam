<?php
declare(strict_types=1);

require_once __DIR__ . '/firebase-support.php';

const YUSTAM_FIREBASE_IDENTITY_SCOPE = 'https://www.googleapis.com/auth/identitytoolkit';

class YustamFirebaseAuthException extends RuntimeException
{
    private string $errorCode;

    public function __construct(string $message, string $errorCode = '', ?Throwable $previous = null)
    {
        parent::__construct($message, 0, $previous);
        $this->errorCode = $errorCode;
    }

    public function getErrorCode(): string
    {
        return $this->errorCode;
    }
}

function yustam_firebase_extract_error_details(?string $body): array
{
    $raw = is_string($body) ? trim($body) : '';
    $code = '';
    $message = '';

    if ($raw !== '') {
        $decoded = json_decode($raw, true);
        if (is_array($decoded)) {
            if (isset($decoded['error'])) {
                $error = $decoded['error'];
                if (is_array($error)) {
                    if (isset($error['message']) && is_string($error['message'])) {
                        $message = trim($error['message']);
                    }
                    if (isset($error['status']) && is_string($error['status']) && $code === '') {
                        $code = trim($error['status']);
                    }
                }
            }
        }

        if ($code === '' && $message === '') {
            if (preg_match('/auth\/([A-Z0-9_\-]+)/i', $raw, $matches)) {
                $code = strtoupper($matches[1]);
            } elseif (preg_match('/"message"\s*:\s*"([^"]+)"/i', $raw, $matches)) {
                $message = trim($matches[1]);
            }
        }
    }

    if ($code === '' && $message !== '') {
        $code = strtoupper(preg_replace('/[^A-Z0-9_]+/', '_', $message));
    }

    return [
        'code' => $code,
        'message' => $message,
        'raw' => $raw,
    ];
}

function yustam_firebase_error_message_for_code(string $code, string $fallback): string
{
    $map = [
        'EMAIL_EXISTS' => 'This email is already registered.',
        'ERROR_EMAIL_ALREADY_IN_USE' => 'This email is already registered.',
        'INVALID_EMAIL' => 'Invalid email address.',
        'MISSING_EMAIL' => 'Please enter your email address.',
        'INVALID_PASSWORD' => 'Incorrect email or password.',
        'MISSING_PASSWORD' => 'Please enter your password.',
        'WEAK_PASSWORD' => 'Password must be at least 6 characters.',
        'EMAIL_NOT_FOUND' => 'We couldn\'t find an account with that email.',
        'USER_NOT_FOUND' => 'We couldn\'t find an account with that email.',
        'USER_DISABLED' => 'This account has been disabled. Contact support for help.',
        'OPERATION_NOT_ALLOWED' => 'Email and password sign-in is currently unavailable.',
        'TOO_MANY_ATTEMPTS_TRY_LATER' => 'Too many attempts. Please wait a moment and try again.',
        'INVALID_LOGIN_CREDENTIALS' => 'Incorrect email or password.',
        'INVALID_ID_TOKEN' => 'Your session has expired. Please sign in again.',
    ];

    $upperCode = strtoupper(trim($code));
    return $map[$upperCode] ?? $fallback;
}

function yustam_firebase_throw(string $fallbackMessage, array $errorDetails): void
{
    $code = $errorDetails['code'] ?? '';
    $message = yustam_firebase_error_message_for_code($code, $fallbackMessage);
    if (!empty($errorDetails['raw'])) {
        error_log('YUSTAM auth service error (' . ($code ?: 'unknown') . '): ' . $errorDetails['raw']);
    }
    throw new YustamFirebaseAuthException($message, $code);
}

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
    $payload = [
        'email' => strtolower(trim($email)),
        'password' => $password,
        'displayName' => $displayName ?: null,
    ];

    if ($payload['displayName'] === null) {
        unset($payload['displayName']);
    }

    $response = null;
    $adminErrorDetails = null;

    if (yustam_firebase_service_account_available()) {
        try {
            $projectId = yustam_firebase_project_id();
            $adminPayload = $payload + ['disabled' => false];
            $adminResponse = yustam_firebase_identity_admin_request(
                'POST',
                sprintf('projects/%s/accounts:signUp', $projectId),
                $adminPayload
            );

            if (($adminResponse['status'] ?? 0) >= 200 && ($adminResponse['status'] ?? 0) < 300) {
                $response = $adminResponse;
            } else {
                $adminErrorDetails = yustam_firebase_extract_error_details($adminResponse['body'] ?? null);
                $fallbackCodes = [
                    'PERMISSION_DENIED',
                    'UNAUTHENTICATED',
                    'SERVICE_DISABLED',
                    'PROJECT_NOT_FOUND',
                    'INVALID_ARGUMENT',
                ];

                if (!in_array(strtoupper($adminErrorDetails['code'] ?? ''), $fallbackCodes, true)) {
                    yustam_firebase_throw('We could not create your account. Please try again.', $adminErrorDetails);
                }
            }
        } catch (Throwable $adminError) {
            $adminErrorDetails = [
                'code' => '',
                'message' => $adminError->getMessage(),
                'raw' => '',
            ];
            error_log('YUSTAM auth admin sign-up fallback: ' . $adminError->getMessage());
        }
    }

    if ($response === null) {
        $webPayload = $payload + ['returnSecureToken' => true];
        $response = yustam_firebase_identity_web_request('POST', 'accounts:signUp', $webPayload);

        if (($response['status'] ?? 0) >= 400 && $adminErrorDetails !== null) {
            // Preserve the most helpful admin error message when the fallback also fails.
            yustam_firebase_throw('We could not create your account. Please try again.', $adminErrorDetails);
        }
    }

    if ($response['status'] < 200 || $response['status'] >= 300) {
        $details = yustam_firebase_extract_error_details($response['body'] ?? null);
        yustam_firebase_throw('We could not create your account. Please try again.', $details);
    }

    $data = json_decode($response['body'], true);
    if (!is_array($data) || empty($data['localId'])) {
        throw new YustamFirebaseAuthException('We could not create your account. Please try again.');
    }

    return $data;
}

/**
 * Delete a Firebase Authentication user using the available credentials.
 */
function yustam_firebase_delete_user(string $firebaseUid, ?string $idToken = null): void
{
    $uid = trim($firebaseUid);
    if ($uid === '') {
        return;
    }

    if (yustam_firebase_service_account_available()) {
        $projectId = yustam_firebase_project_id();
        $response = yustam_firebase_identity_admin_request(
            'POST',
            sprintf('projects/%s/accounts:delete', $projectId),
            ['localId' => $uid]
        );

        if ($response['status'] >= 200 && $response['status'] < 300) {
            return;
        }

        $details = yustam_firebase_extract_error_details($response['body'] ?? null);
        yustam_firebase_throw('Unable to delete Firebase account.', $details);
    }

    $token = trim((string)($idToken ?? ''));
    if ($token === '') {
        throw new RuntimeException('Firebase account deletion requires service credentials or an ID token.');
    }

    $response = yustam_firebase_identity_web_request('POST', 'accounts:delete', [
        'idToken' => $token,
    ]);

    if ($response['status'] < 200 || $response['status'] >= 300) {
        $details = yustam_firebase_extract_error_details($response['body'] ?? null);
        yustam_firebase_throw('Unable to delete Firebase account.', $details);
    }
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
        $details = yustam_firebase_extract_error_details($response['body'] ?? null);
        yustam_firebase_throw('Unable to sign in with email and password.', $details);
    }

    $data = json_decode($response['body'], true);
    if (!is_array($data) || empty($data['localId'])) {
        throw new YustamFirebaseAuthException('Unable to sign in. Please try again.');
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
        $details = yustam_firebase_extract_error_details($response['body'] ?? null);
        yustam_firebase_throw('Unable to verify your account details.', $details);
    }

    $data = json_decode($response['body'], true);
    if (!is_array($data) || empty($data['users']) || !is_array($data['users'])) {
        throw new YustamFirebaseAuthException('Unable to verify your account details.');
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
        $details = yustam_firebase_extract_error_details($response['body'] ?? null);
        yustam_firebase_throw('Unable to load account information.', $details);
    }

    $data = json_decode($response['body'], true);
    if (!is_array($data) || empty($data['users']) || !is_array($data['users'])) {
        return null;
    }

    return $data['users'][0];
}

/**
 * Lookup a Firebase user by email using admin credentials.
 *
 * @return array|null
 */
function yustam_firebase_get_user_by_email(string $email): ?array
{
    $trimmed = strtolower(trim($email));
    if ($trimmed === '') {
        return null;
    }

    $projectId = yustam_firebase_project_id();
    $payload = ['email' => [$trimmed]];

    $response = yustam_firebase_identity_admin_request(
        'POST',
        sprintf('projects/%s/accounts:lookup', $projectId),
        $payload
    );

    if ($response['status'] < 200 || $response['status'] >= 300) {
        $details = yustam_firebase_extract_error_details($response['body'] ?? null);
        yustam_firebase_throw('Unable to load account information.', $details);
    }

    $data = json_decode($response['body'], true);
    if (!is_array($data) || empty($data['users']) || !is_array($data['users'])) {
        return null;
    }

    return $data['users'][0];
}

/**
 * Update a Firebase user's password using admin credentials.
 */
function yustam_firebase_update_user_password(string $firebaseUid, string $newPassword): void
{
    $trimmedUid = trim($firebaseUid);
    if ($trimmedUid === '') {
        throw new InvalidArgumentException('Firebase UID is required to update the password.');
    }

    $password = (string) $newPassword;
    if ($password === '') {
        throw new InvalidArgumentException('Password cannot be empty.');
    }

    $projectId = yustam_firebase_project_id();
    $payload = [
        'localId' => $trimmedUid,
        'password' => $password,
        'returnSecureToken' => false,
    ];

    $response = yustam_firebase_identity_admin_request(
        'POST',
        sprintf('projects/%s/accounts:update', $projectId),
        $payload
    );

    if ($response['status'] < 200 || $response['status'] >= 300) {
        $details = yustam_firebase_extract_error_details($response['body'] ?? null);
        yustam_firebase_throw('Unable to update your password right now.', $details);
    }
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
        $details = yustam_firebase_extract_error_details($response['body'] ?? null);
        yustam_firebase_throw('Unable to generate a password reset link right now.', $details);
    }

    $data = json_decode($response['body'], true);
    if (empty($data['oobLink'])) {
        throw new YustamFirebaseAuthException('Unable to generate a password reset link right now.');
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
        $details = yustam_firebase_extract_error_details($response['body'] ?? null);
        yustam_firebase_throw('Unable to generate a verification link right now.', $details);
    }

    $data = json_decode($response['body'], true);
    if (empty($data['oobLink'])) {
        throw new YustamFirebaseAuthException('Unable to generate a verification link right now.');
    }

    return (string) $data['oobLink'];
}
