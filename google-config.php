<?php
// =======================================================
// YUSTAM Marketplace — Google OAuth Configuration
// =======================================================

require_once __DIR__ . '/google-api/vendor/autoload.php';

// --- Replace these with your real Google credentials ---
$googleClientID     = '90080814337-23s48plm9jo0o545h9m5b5c6ut8e5ami.apps.googleusercontent.com';
$googleClientSecret = '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';
$googleRedirectURL  = 'https://yustam.com.ng/google-callback.php';
// --------------------------------------------------------

// Create Google client
$gClient = new Google_Client();
$gClient->setClientId($googleClientID);
$gClient->setClientSecret($googleClientSecret);
$gClient->setRedirectUri($googleRedirectURL);

// Request basic profile and email
$gClient->addScope('email');
$gClient->addScope('profile');

// Optional: identify your app
$gClient->setApplicationName('YUSTAM Marketplace');

?>
