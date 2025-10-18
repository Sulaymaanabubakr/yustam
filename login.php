<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

require_once __DIR__ . '/session-path.php';
session_start();

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/firebase-admin.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'message' => 'Invalid request method.']);
    exit;
}

$email = strtolower(trim($_POST['email'] ?? ''));
$password = $_POST['password'] ?? '';

if ($email === '' || $password === '') {
    echo json_encode(['success' => false, 'message' => 'Please enter both email and password.']);
    exit;
}

try {
    $auth = yustam_firebase_sign_in_with_password($email, $password);
    $firebaseUid = (string) ($auth['localId'] ?? '');
    if ($firebaseUid === '') {
        throw new RuntimeException('Authentication service did not return a UID.');
    }

    $firebaseEmail = strtolower((string) ($auth['email'] ?? $email));
    $displayName = trim((string) ($auth['displayName'] ?? ''));
    if ($displayName === '') {
        $displayName = 'Vendor';
    }

    $db = get_db_connection();
    $vendor = yustam_vendor_find_by_firebase_uid($firebaseUid, $db);
    if (!$vendor && $firebaseEmail !== '') {
        $vendor = yustam_vendor_find_by_email($firebaseEmail, $db);
        if ($vendor) {
            yustam_vendor_set_firebase_uid((int) $vendor['id'], $firebaseUid, $db);
            $vendor = yustam_vendor_find_by_firebase_uid($firebaseUid, $db) ?: $vendor;
        }
    }

    if (!$vendor) {
        $vendorTable = YUSTAM_VENDORS_TABLE;
        if (!preg_match('/^[A-Za-z0-9_]+$/', $vendorTable)) {
            throw new RuntimeException('Invalid vendor table name.');
        }

        $businessName = $displayName . ' Store';
        $category = 'General';
        $provider = 'email';
        $verified = 1;
        $phone = '';
        $passwordHash = password_hash($password, PASSWORD_DEFAULT);

        $insertSql = sprintf(
            'INSERT INTO `%s` (vendor_uid, firebase_uid, full_name, email, phone, password, business_name, category, provider, verification_token, verified, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, NOW(), NOW())',
            $vendorTable
        );
        $stmt = $db->prepare($insertSql);
        if (!$stmt) {
            throw new RuntimeException('Unable to prepare vendor creation statement.');
        }

        $vendorUid = '';
        $stmt->bind_param('sssssssssi', $vendorUid, $firebaseUid, $displayName, $firebaseEmail, $phone, $passwordHash, $businessName, $category, $provider, $verified);

        $maxAttempts = 5;
        $created = false;
        for ($attempt = 0; $attempt < $maxAttempts; $attempt++) {
            $vendorUid = yustam_generate_vendor_uid($db);
            try {
                $stmt->execute();
                $created = true;
                break;
            } catch (mysqli_sql_exception $exception) {
                if ((int) $exception->getCode() === 1062 && stripos($exception->getMessage(), 'vendor_uid') !== false) {
                    $stmt->reset();
                    continue;
                }
                $stmt->close();
                throw $exception;
            }
        }

        if (!$created) {
            $stmt->close();
            throw new RuntimeException('Unable to generate a unique vendor UID. Please try again.');
        }

        $stmt->close();
        $vendor = yustam_vendor_find_by_firebase_uid($firebaseUid, $db);
        if (!$vendor) {
            throw new RuntimeException('Vendor record could not be created.');
        }
    } else {
        if (isset($vendor['verified']) && (int) $vendor['verified'] === 0) {
            echo json_encode(['success' => false, 'message' => 'Please verify your email before logging in.']);
            exit;
        }
        $update = $db->prepare(sprintf('UPDATE `%s` SET full_name = ?, email = ?, updated_at = NOW() WHERE id = ? LIMIT 1', YUSTAM_VENDORS_TABLE));
        if ($update) {
            $update->bind_param('ssi', $displayName, $firebaseEmail, $vendor['id']);
            $update->execute();
            $update->close();
            $vendor = yustam_vendor_find_by_firebase_uid($firebaseUid, $db) ?: $vendor;
        }
    }

    $vendorUid = yustam_vendor_assign_uid_if_missing($db, $vendor);

    if (yustam_vendor_table_has_column('updated_at')) {
        $updateLastLogin = $db->prepare(sprintf('UPDATE `%s` SET updated_at = NOW() WHERE id = ?', YUSTAM_VENDORS_TABLE));
        if ($updateLastLogin) {
            $updateLastLogin->bind_param('i', $vendor['id']);
            $updateLastLogin->execute();
            $updateLastLogin->close();
        }
    }

    $_SESSION['vendor_id'] = (int) $vendor['id'];
    $_SESSION['vendor_name'] = $displayName;
    $_SESSION['vendor_email'] = $firebaseEmail;
    $_SESSION['vendor_uid'] = $vendorUid;
    $_SESSION['vendor_firebase_uid'] = $firebaseUid;
    $_SESSION['firebase_uid'] = $firebaseUid;
    $_SESSION['yustam_uid'] = $firebaseUid;
    $_SESSION['yustam_role'] = 'vendor';

    echo json_encode([
        'success' => true,
        'message' => 'Login successful. Redirecting...',
        'redirect' => 'vendor-dashboard.php',
        'uid' => $firebaseUid,
        'firebase_uid' => $firebaseUid,
        'role' => 'vendor',
    ]);
} catch (YustamFirebaseAuthException $authError) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => $authError->getMessage()]);
} catch (Throwable $e) {
    error_log('Vendor login failed: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Unable to sign in. Please try again.']);
}
