<?php
require_once __DIR__ . '/session-path.php';
session_start();

$reference = $_GET['reference'] ?? '';
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Plan Payment Successful | YUSTAM Marketplace</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap" rel="stylesheet" />
    <style>
        body {
            margin: 0;
            font-family: 'Inter', system-ui, sans-serif;
            background: linear-gradient(135deg, rgba(0, 77, 64, 0.12), rgba(243, 115, 30, 0.12)), #f5ede2;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #111;
            padding: 24px;
        }
        .card {
            background: #fff;
            border-radius: 18px;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
            width: min(480px, 100%);
            padding: clamp(28px, 5vw, 40px);
            text-align: center;
        }
        h1 {
            margin: 0 0 12px;
            color: #004d40;
        }
        p {
            margin: 0 0 20px;
            line-height: 1.6;
            color: rgba(17, 17, 17, 0.75);
        }
        a.button {
            display: inline-block;
            padding: 12px 22px;
            border-radius: 999px;
            background: #004d40;
            color: #fff;
            text-decoration: none;
            font-weight: 600;
        }
        small {
            display: block;
            margin-top: 8px;
            color: rgba(17, 17, 17, 0.6);
        }
    </style>
</head>
<body>
    <div class="card">
        <h1>Payment Successful</h1>
        <p>Your plan payment was processed successfully. You can now continue managing your listings.</p>
        <?php if ($reference !== ''): ?>
            <small>Reference: <?= htmlspecialchars($reference, ENT_QUOTES, 'UTF-8'); ?></small>
        <?php endif; ?>
        <p>
            <a class="button" href="vendor-dashboard.php">Go to Dashboard</a>
        </p>
        <a href="vendor-plans.php" style="color:#f3731e;font-weight:600;text-decoration:none;">
            Manage plans
        </a>
    </div>
</body>
</html>
