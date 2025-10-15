<?php
require_once __DIR__ . '/session-path.php';
session_start();

$reason = $_GET['reason'] ?? '';
$title = 'Payment Failed';
$message = 'We could not process your plan payment. Please try again or use a different payment method.';
$reasonText = $reason !== '' ? htmlspecialchars($reason) : '';
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Plan Payment Failed | YUSTAM Marketplace</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
    <style>
        :root {
            --emerald: #004D40;
            --danger: #C62828;
            --beige: #F5EDE2;
        }
        * { box-sizing: border-box; }
        body {
            margin: 0;
            font-family: 'Inter', system-ui, sans-serif;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: linear-gradient(135deg, rgba(198,40,40,0.1), rgba(0,77,64,0.1)), var(--beige);
            padding: 24px;
            color: #111;
        }
        .card {
            width: min(480px, 100%);
            background: #fff;
            border-radius: 18px;
            box-shadow: 0 24px 48px rgba(0,0,0,0.08);
            padding: clamp(28px, 5vw, 40px);
            text-align: center;
        }
        h1 {
            margin: 0 0 12px;
            font-size: clamp(1.8rem, 5vw, 2.4rem);
            color: var(--danger);
        }
        p {
            margin: 0 0 24px;
            line-height: 1.6;
            color: rgba(17,17,17,0.78);
        }
        a.button {
            display: inline-block;
            background: var(--emerald);
            color: #fff;
            padding: 14px 24px;
            border-radius: 999px;
            text-decoration: none;
            font-weight: 600;
            transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        a.button:hover {
            transform: translateY(-2px);
            box-shadow: 0 16px 24px rgba(0,77,64,0.25);
        }
        .secondary {
            margin-top: 14px;
            display: inline-block;
            color: var(--danger);
            text-decoration: none;
            font-weight: 600;
        }
    </style>
</head>
<body>
    <div class="card">
        <h1><?= htmlspecialchars($title) ?></h1>
        <p><?= htmlspecialchars($message) ?></p>
        <?php if ($reasonText !== ''): ?>
            <p style="margin-top:-8px;color:rgba(17,17,17,0.62);"><small>Reason: <?= $reasonText ?></small></p>
        <?php endif; ?>
        <a class="button" href="vendor-plans.php">Try Again</a>
        <a class="secondary" href="vendor-dashboard.php">Return to Dashboard</a>
    </div>
  <script src="theme-manager.js" defer></script>
</body>
</html>




