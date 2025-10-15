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
