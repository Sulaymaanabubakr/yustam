<?php
require_once __DIR__ . '/session-path.php';
session_start();

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Invalid request method.']);
    exit;
}

require_once __DIR__ . '/db.php';

$email = strtolower(trim($_POST['email'] ?? ''));
$password = (string)($_POST['password'] ?? '');

if ($email === '' || $password === '') {
    echo json_encode(['success' => false, 'message' => 'Please provide both email and password.']);
    exit;
}

try {
    $db = get_db_connection();
    $emailColumn = yustam_admin_email_column();
    $idColumn = yustam_admin_id_column();
    $passwordColumn = yustam_admin_password_column();
    $nameColumn = yustam_admin_name_column();
    $roleColumn = yustam_admin_role_column();
    $lastLoginColumn = yustam_admin_last_login_column();
    $updatedColumn = yustam_admin_updated_column();

    $query = sprintf('SELECT * FROM `%s` WHERE %s = ? LIMIT 1', YUSTAM_ADMINS_TABLE, $emailColumn);
    $stmt = $db->prepare($query);
    $stmt->bind_param('s', $email);
    $stmt->execute();
    $result = $stmt->get_result();
    $admin = $result->fetch_assoc();
    $stmt->close();

    if (!$admin) {
        echo json_encode(['success' => false, 'message' => 'Invalid admin credentials.']);
        exit;
    }

    $storedPassword = (string)($admin[$passwordColumn] ?? '');
    $passwordValid = false;

    if ($storedPassword !== '') {
        if (password_verify($password, $storedPassword)) {
            $passwordValid = true;
        } elseif (hash_equals($storedPassword, hash('sha256', $password))) {
            $passwordValid = true;
        } elseif ($password === $storedPassword) {
            $passwordValid = true;
        }
    }

    if (!$passwordValid) {
        echo json_encode(['success' => false, 'message' => 'Invalid admin credentials.']);
        exit;
    }

    $_SESSION['admin_id'] = (int)($admin[$idColumn] ?? 0);
    $_SESSION['admin_email'] = $email;
    $_SESSION['admin_name'] = $admin[$nameColumn] ?? '';
    $_SESSION['admin_role'] = $roleColumn ? ($admin[$roleColumn] ?? '') : '';

    if ($lastLoginColumn || $updatedColumn) {
        $now = date('Y-m-d H:i:s');
        $updates = [];
        $types = '';
        $values = [];

        if ($lastLoginColumn) {
            $updates[] = sprintf('%s = ?', $lastLoginColumn);
            $types .= 's';
            $values[] = $now;
        }

        if ($updatedColumn && $updatedColumn !== $lastLoginColumn) {
            $updates[] = sprintf('%s = ?', $updatedColumn);
            $types .= 's';
            $values[] = $now;
        }

        if ($updates) {
            $values[] = $_SESSION['admin_id'];
            $types .= 'i';
            $updateSql = sprintf(
                'UPDATE `%s` SET %s WHERE %s = ?',
                YUSTAM_ADMINS_TABLE,
                implode(', ', $updates),
                $idColumn
            );
            $updateStmt = $db->prepare($updateSql);
            $updateStmt->bind_param($types, ...$values);
            $updateStmt->execute();
            $updateStmt->close();
        }
    }

    echo json_encode([
        'success' => true,
        'redirect' => 'admin-dashboard.php'
    ]);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Server error: ' . $e->getMessage()]);
}
