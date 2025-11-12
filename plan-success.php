<?php
require_once __DIR__ . '/session-path.php';
session_start();

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/vendor-subscriptions.php';

$reference = trim((string)($_GET['reference'] ?? ''));
$planName = trim((string)($_GET['plan'] ?? ''));
$rawDuration = isset($_GET['duration']) ? (int) $_GET['duration'] : 0;
$durationMonths = $rawDuration > 0 ? $rawDuration : 1;
$durationMonths = min(max($durationMonths, 1), 36);
$amountNaira = null;
if (isset($_GET['amount'])) {
    $amountDigits = preg_replace('/[^\d]/', '', (string) $_GET['amount']);
    if ($amountDigits !== '' && ctype_digit($amountDigits)) {
        $amountNaira = (int) $amountDigits;
        if ($amountNaira <= 0) {
            $amountNaira = null;
        }
    }
}

$planUpdate = [
    'attempted' => false,
    'success' => false,
    'message' => '',
];

$planSlug = yustam_vendor_subscription_normalise_slug($planName);
if ($reference !== '' && isset($_SESSION['vendor_id'])) {
    $planUpdate['attempted'] = true;
    try {
        $db = get_db_connection();
        $vendorId = (int) $_SESSION['vendor_id'];
        $planSlug = $planName !== '' ? $planName : null;
        $result = yustam_vendor_subscription_process_payment($db, $vendorId, $reference, $planSlug !== '' ? $planSlug : null, $durationMonths > 0 ? $durationMonths : null);
        $subscription = $result['subscription'] ?? [];
        if (!empty($subscription['planName'])) {
            $planName = $subscription['planName'];
            $planSlug = yustam_vendor_subscription_normalise_slug($planName);
        }
        if (!empty($subscription['durationMonths'])) {
            $durationMonths = (int) $subscription['durationMonths'];
        }
        if (isset($result['amountKobo']) && (int) $result['amountKobo'] > 0) {
            $amountNaira = (int) round((int) $result['amountKobo'] / 100);
        }
        $planUpdate['success'] = true;
        $planUpdate['subscription'] = $subscription;
    } catch (Throwable $e) {
        $planUpdate['message'] = $e->getMessage();
        error_log('Plan update failed: ' . $e->getMessage());
    }
} else {
    try {
        $db = get_db_connection();
        $vendorId = isset($_SESSION['vendor_id']) ? (int) $_SESSION['vendor_id'] : 0;
        if ($vendorId > 0) {
            $vendorState = yustam_vendor_subscription_fetch_vendor($db, $vendorId);
            $planUpdate['subscription'] = yustam_vendor_subscription_format_state($vendorState);
            if (!empty($planUpdate['subscription']['planName'])) {
                $planName = $planUpdate['subscription']['planName'];
                $planSlug = yustam_vendor_subscription_normalise_slug($planName);
            }
            if (!empty($planUpdate['subscription']['durationMonths'])) {
                $durationMonths = (int) $planUpdate['subscription']['durationMonths'];
            }
        }
    } catch (Throwable $ignored) {
        // ignored
    }
    if ($planName !== '' && !isset($_SESSION['vendor_id'])) {
        $planUpdate['message'] = 'Sign in again so we can sync this payment with your vendor account.';
    }
}
$normalisedDuration = $durationMonths > 0 ? $durationMonths : 1;
$durationLabel = $normalisedDuration === 1 ? '1 month' : sprintf('%d months', $normalisedDuration);
$planCatalog = yustam_vendor_subscription_plan_catalog();
$planOption = null;
if ($planSlug !== '' && isset($planCatalog[$planSlug]['durations'][$normalisedDuration])) {
    $planOption = $planCatalog[$planSlug]['durations'][$normalisedDuration];
    if (empty($planName)) {
        $planName = $planCatalog[$planSlug]['name'] ?? '';
    }
}
if ($planName === '') {
    $planName = 'Selected Plan';
}
if ($amountNaira === null && $planOption !== null && isset($planOption['amount'])) {
    $amountNaira = (int) $planOption['amount'];
}
$amountDisplay = $amountNaira !== null ? '₦' . number_format((int) $amountNaira, 0) : null;
$subscriptionState = isset($planUpdate['subscription']) && is_array($planUpdate['subscription']) ? $planUpdate['subscription'] : [];
$nextBillingDisplay = trim((string)($subscriptionState['nextBillingDisplay'] ?? ''));
if ($nextBillingDisplay === '--') {
    $nextBillingDisplay = '';
}
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
        .status-message {
            margin: 0 0 16px;
            padding: 12px 16px;
            border-radius: 12px;
            font-weight: 500;
            font-size: 0.95rem;
        }
        .status-success {
            background: rgba(15, 106, 83, 0.1);
            color: #0f6a53;
        }
        .status-error {
            background: rgba(176, 0, 32, 0.12);
            color: #b00020;
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
        <?php if ($planUpdate['attempted']): ?>
            <?php if ($planUpdate['success']): ?>
                <p class="status-message status-success">
                    We've moved your store to the
                    <strong><?= htmlspecialchars($planName, ENT_QUOTES, 'UTF-8'); ?></strong>
                    for <strong><?= htmlspecialchars($durationLabel, ENT_QUOTES, 'UTF-8'); ?></strong>.
                    <?php if ($amountDisplay !== null): ?>
                        Total paid: <strong><?= htmlspecialchars($amountDisplay, ENT_QUOTES, 'UTF-8'); ?></strong>.
                    <?php endif; ?>
                    <?php if ($nextBillingDisplay !== ''): ?>
                        Next billing date: <strong><?= htmlspecialchars($nextBillingDisplay, ENT_QUOTES, 'UTF-8'); ?></strong>.
                    <?php endif; ?>
                    You are all set — head back to your dashboard to enjoy the upgraded features.
                </p>
            <?php else: ?>
                <p class="status-message status-error">
                    We recorded your payment but could not update your plan automatically.
                    <?php if ($planUpdate['message'] !== ''): ?>
                        <?= htmlspecialchars($planUpdate['message'], ENT_QUOTES, 'UTF-8'); ?>
                    <?php else: ?>
                        Please contact support with your payment reference so we can verify things quickly.
                    <?php endif; ?>
                </p>
            <?php endif; ?>
        <?php elseif ($planUpdate['message'] !== ''): ?>
            <p class="status-message status-error">
                <?= htmlspecialchars($planUpdate['message'], ENT_QUOTES, 'UTF-8'); ?>
            </p>
        <?php endif; ?>
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
  <script src="theme-manager.js" defer></script>
</body>
</html>




