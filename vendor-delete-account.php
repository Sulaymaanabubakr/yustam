<?php
require_once __DIR__ . '/session-path.php';
session_start();

header('Content-Type: application/json');

if (!isset($_SESSION['vendor_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Please sign in to delete your account.']);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Unsupported request method.']);
    exit;
}

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/firebase-admin.php';
require_once __DIR__ . '/notifications-storage.php';

$vendorId = (int) $_SESSION['vendor_id'];
if ($vendorId <= 0) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Unable to determine your account.']);
    exit;
}

try {
    $db = get_db_connection();
} catch (Throwable $connectionError) {
    error_log('Vendor deletion: database connection failed: ' . $connectionError->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'We could not connect to the database. Please try again.']);
    exit;
}

if (!preg_match('/^[A-Za-z0-9_]+$/', (string) YUSTAM_VENDORS_TABLE)) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Account configuration error.']);
    exit;
}

/**
 * Check whether a table exists in the current database.
 */
function yustam_table_exists(mysqli $db, string $table): bool
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

$vendorTable = YUSTAM_VENDORS_TABLE;
$vendorRow = null;

$fetchVendor = $db->prepare(sprintf('SELECT id, email, firebase_uid FROM `%s` WHERE id = ? LIMIT 1', $vendorTable));
if ($fetchVendor) {
    $fetchVendor->bind_param('i', $vendorId);
    $fetchVendor->execute();
    $vendorRow = $fetchVendor->get_result()->fetch_assoc();
    $fetchVendor->close();
}

if (!$vendorRow) {
    http_response_code(404);
    echo json_encode(['success' => false, 'message' => 'This account no longer exists.']);
    exit;
}

$firebaseUid = trim((string) ($vendorRow['firebase_uid'] ?? ''));
$settingsFile = __DIR__ . '/data/vendor-settings/vendor_' . $vendorId . '.json';

$db->begin_transaction();

try {
    if (yustam_table_exists($db, 'listings')) {
        $deleteListings = $db->prepare('DELETE FROM `listings` WHERE vendor_id = ?');
        if ($deleteListings) {
            $deleteListings->bind_param('i', $vendorId);
            $deleteListings->execute();
            $deleteListings->close();
        }
    }

    if (yustam_table_exists($db, 'password_resets')) {
        $deleteResets = $db->prepare('DELETE FROM `password_resets` WHERE user_id = ?');
        if ($deleteResets) {
            $deleteResets->bind_param('i', $vendorId);
            $deleteResets->execute();
            $deleteResets->close();
        }
    }

    $notificationsTable = yustam_vendor_notifications_table();
    if ($notificationsTable !== '' && yustam_table_exists($db, $notificationsTable)) {
        $deleteNotifications = $db->prepare(sprintf('DELETE FROM `%s` WHERE vendor_id = ?', $notificationsTable));
        if ($deleteNotifications instanceof mysqli_stmt) {
            $deleteNotifications->bind_param('i', $vendorId);
            $deleteNotifications->execute();
            $deleteNotifications->close();
        }
    }

    $deleteVendor = $db->prepare(sprintf('DELETE FROM `%s` WHERE id = ?', $vendorTable));
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
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'We could not delete your account. Please try again.']);
    exit;
}

if (is_file($settingsFile)) {
    @unlink($settingsFile);
}

if ($firebaseUid !== '') {
    try {
        yustam_firebase_delete_user($firebaseUid);
    } catch (Throwable $firebaseError) {
        error_log('Vendor deletion: unable to delete Firebase account for vendor ' . $vendorId . ': ' . $firebaseError->getMessage());
    }
}

$_SESSION = [];
if (session_status() === PHP_SESSION_ACTIVE) {
    session_destroy();
}

$redirect = 'vendor-login.html?message=account-deleted';

echo json_encode([
    'success' => true,
    'message' => 'Your vendor account has been deleted.',
    'redirect' => $redirect,
]);
exit;
