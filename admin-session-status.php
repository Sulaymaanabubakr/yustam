<?php
require_once __DIR__ . '/admin-session.php';
require_once __DIR__ . '/api/bootstrap.php';

header('Content-Type: application/json');

if (admin_is_authenticated()) {
    $admin = current_admin();
    $adminId = (int) ($admin['id'] ?? 0);
    $resolvedRole = $admin['role'] ?? '';
    if ($resolvedRole === '') {
        $resolvedRole = 'admin';
    }

    $profile = [
        'id' => yustam_api_user_reference('admin', max(1, $adminId)),
        'role' => 'admin',
        'firebaseUid' => null,
        'email' => $admin['email'] ?? null,
        'displayName' => $admin['name'] ?? null,
    ];

    // Shorter-lived token for dashboard calls (6 hours)
    $tokenTtl = 6 * 60 * 60;
    $token = yustam_api_issue_token($profile, $tokenTtl);

    echo json_encode([
        'authenticated' => true,
        'admin' => [
            'id' => $adminId,
            'email' => $admin['email'] ?? '',
            'name' => $admin['name'] ?? '',
            'role' => $resolvedRole,
        ],
        'token' => $token,
        'expiresIn' => $tokenTtl,
    ]);
    exit;
}

http_response_code(401);
echo json_encode(['authenticated' => false]);
