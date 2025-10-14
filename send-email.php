<?php
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

// Include PHPMailer classes
require_once __DIR__ . '/phpmailer/src/Exception.php';
require_once __DIR__ . '/phpmailer/src/PHPMailer.php';
require_once __DIR__ . '/phpmailer/src/SMTP.php';

// Email sending function
function sendEmail($to, $subject, $message)
{
    $mail = new PHPMailer(true);

    try {
        // SMTP Settings
        $mail->isSMTP();
        $mail->Host       = 'mail.yustam.com.ng';       // your domain mail server
        $mail->SMTPAuth   = true;
        $mail->Username   = 'noreply@yustam.com.ng';    // your cPanel email
        $mail->Password   = 'Akanni24434$##';           // your email password
        $mail->SMTPSecure = PHPMailer::ENCRYPTION_SMTPS; // use 'ssl'
        $mail->Port       = 465;                        // SSL port

        // Sender info
        $mail->setFrom('noreply@yustam.com.ng', 'YUSTAM Marketplace');
        $mail->addAddress($to);
        $mail->isHTML(true);
        $mail->Subject = $subject;
        $mail->Body    = $message;

        $mail->send();
        return true;
    } catch (Exception $e) {
        error_log('Mail Error: ' . $mail->ErrorInfo);
        return false;
    }
}
?>
