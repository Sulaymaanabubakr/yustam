<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

require_once __DIR__ . '/send-email.php';

echo "<h3>📨 Testing YUSTAM Email...</h3>";

$result = sendEmail(
    'yourrealemail@example.com',
    'Test from YUSTAM',
    '<h2>This is a test email from YUSTAM Marketplace</h2><p>If you got this, PHPMailer works fine.</p>'
);

if ($result) {
    echo "<p style='color:green;'>✅ Mail sent successfully!</p>";
} else {
    echo "<p style='color:red;'>❌ Mail failed to send. Check error log or screen below.</p>";
}
?>
