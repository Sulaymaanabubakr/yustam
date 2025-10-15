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
    define('YUSTAM_SESSION_PATH', $sessionPath);
}

if (!defined('YUSTAM_SESSION_LIFETIME')) {
    $lifetime = 60 * 60 * 24 * 30; // keep vendor sessions alive for 30 days unless they logout

    ini_set('session.gc_maxlifetime', (string) $lifetime);
    ini_set('session.cookie_lifetime', (string) $lifetime);

    $isSecure = !empty($_SERVER['HTTPS']) && strtolower((string) $_SERVER['HTTPS']) !== 'off';
    $cookieDomain = $_SERVER['HTTP_HOST'] ?? '';

    if (PHP_VERSION_ID >= 70300) {
        session_set_cookie_params([
            'lifetime' => $lifetime,
            'path' => '/',
            'domain' => $cookieDomain,
            'secure' => $isSecure,
            'httponly' => true,
            'samesite' => 'Lax',
        ]);
    } else {
        session_set_cookie_params($lifetime, '/', $cookieDomain, $isSecure, true);
        ini_set('session.cookie_samesite', 'Lax');
    }

    define('YUSTAM_SESSION_LIFETIME', $lifetime);
}
