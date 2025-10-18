<?php
require_once __DIR__ . '/session-path.php';
session_start();

$target = null;

if (isset($_SESSION['buyer_id'])) {
    $target = 'buyer-chats.php';
} elseif (isset($_SESSION['vendor_id'])) {
    $target = 'vendor-chats.php';
}

if ($target === null) {
    $target = 'login.php';
}

header('Location: ' . $target);
exit;
