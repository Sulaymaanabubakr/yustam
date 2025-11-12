<?php
/**
 * Normalises the PHP session save path so the application works both locally
 * and in production. The directory will be created automatically if it does
 * not exist.
 */
if (!defined('YUSTAM_SESSION_PATH')) {
    $sessionPath = __DIR__ . DIRECTORY_SEPARATOR . 'tmp' . DIRECTORY_SEPARATOR . 'sessions';
    if (!is_dir($sessionPath)) {
        mkdir($sessionPath, 0775, true);
    }
    ini_set('session.save_path', $sessionPath);
    ini_set('session.gc_maxlifetime', 60 * 60 * 24 * 30); // keep session files ~30 days
    define('YUSTAM_SESSION_PATH', $sessionPath);
}

if (!defined('YUSTAM_SESSION_COOKIE_INITIALISED')) {
    $secure = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || (isset($_SERVER['SERVER_PORT']) && (int) $_SERVER['SERVER_PORT'] === 443);
    $cookieParams = session_get_cookie_params();
    $lifetime = max($cookieParams['lifetime'], 60 * 60 * 24 * 30); // keep sessions for ~30 days unless user logs out
    session_set_cookie_params([
        'lifetime' => $lifetime,
        'path' => $cookieParams['path'] ?: '/',
        'domain' => $cookieParams['domain'] ?: '',
        'secure' => $secure,
        'httponly' => true,
        'samesite' => $cookieParams['samesite'] ?: 'Lax',
    ]);
    define('YUSTAM_SESSION_COOKIE_INITIALISED', true);
}
