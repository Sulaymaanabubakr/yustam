<?php
// Start session and point to same tmp directory
ini_set('session.save_path', '/home2/yustamco/tmp');
session_start();

// Destroy all session data
$_SESSION = [];
session_unset();
session_destroy();

// Optional: clear session cookie too
if (ini_get("session.use_cookies")) {
    $params = session_get_cookie_params();
    setcookie(session_name(), '', time() - 42000,
        $params["path"], $params["domain"],
        $params["secure"], $params["httponly"]
    );
}

// Redirect to login page
header("Location: vendor-login.html?message=You have been logged out successfully.&status=success");
exit;
?>
