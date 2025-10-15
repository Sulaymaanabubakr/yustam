<?php
require_once __DIR__ . '/session-path.php';
session_start();

require_once __DIR__ . '/db.php';

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

$durationLabel = $durationMonths === 1 ? '1 month' : sprintf('%d months', $durationMonths);
$amountDisplay = $amountNaira !== null ? '₦' . number_format($amountNaira, 0, '.', ',') : null;

if ($planName !== '' && isset($_SESSION['vendor_id'])) {
    $planUpdate['attempted'] = true;
    try {
        $vendorId = (int) $_SESSION['vendor_id'];
        $db = get_db_connection();

        $vendorTable = defined('YUSTAM_VENDORS_TABLE') ? YUSTAM_VENDORS_TABLE : 'vendors';
        if (!preg_match('/^[A-Za-z0-9_]+$/', $vendorTable)) {
            throw new RuntimeException('Invalid vendor table name.');
        }

        $fields = [];
        $types = '';
        $values = [];

        if (yustam_vendor_table_has_column('plan')) {
            $fields[] = '`plan` = ?';
            $types .= 's';
            $values[] = $planName;
        }

        $statusColumn = null;
        foreach (['plan_status', 'subscription_status', 'plan_state', 'planstate'] as $candidate) {
            if (yustam_vendor_table_has_column($candidate)) {
                $statusColumn = $candidate;
                break;
            }
        }
        if ($statusColumn !== null) {
            $fields[] = sprintf('`%s` = ?', $statusColumn);
            $types .= 's';
            $values[] = 'Active';
        }

        $timezone = new DateTimeZone(date_default_timezone_get());
        $now = new DateTimeImmutable('now', $timezone);
        $expiry = $now->add(new DateInterval('P' . $durationMonths . 'M'));
        $nowFormatted = $now->format('Y-m-d H:i:s');
        $expiryFormatted = $expiry->format('Y-m-d H:i:s');

        $expiryColumn = null;
        foreach (['plan_expires_at', 'plan_expiry', 'plan_expiration', 'subscription_expires_at', 'subscription_expiry'] as $candidate) {
            if (yustam_vendor_table_has_column($candidate)) {
                $expiryColumn = $candidate;
                break;
            }
        }
        if ($expiryColumn !== null) {
            $fields[] = sprintf('`%s` = ?', $expiryColumn);
            $types .= 's';
            $values[] = $expiryFormatted;
        }

        $activatedColumn = null;
        foreach (['plan_started_at', 'subscription_started_at', 'plan_activated_at', 'plan_paid_at'] as $candidate) {
            if (yustam_vendor_table_has_column($candidate)) {
                $activatedColumn = $candidate;
                break;
            }
        }
        if ($activatedColumn !== null) {
            $fields[] = sprintf('`%s` = ?', $activatedColumn);
            $types .= 's';
            $values[] = $nowFormatted;
        }

        $renewedColumn = null;
        foreach (['plan_renewed_at', 'plan_updated_at', 'subscription_updated_at', 'last_payment_at'] as $candidate) {
            if (yustam_vendor_table_has_column($candidate) && $candidate !== $activatedColumn) {
                $renewedColumn = $candidate;
                break;
            }
        }
        if ($renewedColumn !== null) {
            $fields[] = sprintf('`%s` = ?', $renewedColumn);
            $types .= 's';
            $values[] = $nowFormatted;
        }

        $durationColumn = null;
        foreach (['plan_duration_months', 'plan_duration', 'subscription_duration', 'billing_duration'] as $candidate) {
            if (yustam_vendor_table_has_column($candidate)) {
                $durationColumn = $candidate;
                break;
            }
        }
        if ($durationColumn !== null) {
            $fields[] = sprintf('`%s` = ?', $durationColumn);
            $types .= 'i';
            $values[] = $durationMonths;
        }

        if ($amountNaira !== null) {
            $amountColumn = null;
            foreach (['plan_amount', 'subscription_amount', 'last_plan_amount', 'billing_amount'] as $candidate) {
                if (yustam_vendor_table_has_column($candidate)) {
                    $amountColumn = $candidate;
                    break;
                }
            }
            if ($amountColumn !== null) {
                $fields[] = sprintf('`%s` = ?', $amountColumn);
                $types .= 'd';
                $values[] = (float) $amountNaira;
            }
        }

        if ($reference !== '') {
            $referenceColumn = null;
            foreach (['plan_reference', 'payment_reference', 'subscription_reference', 'last_payment_reference'] as $candidate) {
                if (yustam_vendor_table_has_column($candidate)) {
                    $referenceColumn = $candidate;
                    break;
                }
            }
            if ($referenceColumn !== null) {
                $fields[] = sprintf('`%s` = ?', $referenceColumn);
                $types .= 's';
                $values[] = $reference;
            }
        }

        if (yustam_vendor_table_has_column('updated_at')) {
            $fields[] = '`updated_at` = NOW()';
        }

        if (empty($fields)) {
            throw new RuntimeException('No vendor plan fields available for update.');
        }

        $types .= 'i';
        $values[] = $vendorId;
        $sql = sprintf('UPDATE `%s` SET %s WHERE id = ?', $vendorTable, implode(', ', $fields));
        $stmt = $db->prepare($sql);
        if (!$stmt instanceof mysqli_stmt) {
            throw new RuntimeException('Plan update prepare failed: ' . $db->error);
        }

        $bindArgs = [$types];
        foreach ($values as $index => $value) {
            $bindArgs[] = &$values[$index];
        }
        call_user_func_array([$stmt, 'bind_param'], $bindArgs);
        $stmt->execute();
        $stmt->close();

        $_SESSION['vendor_plan_name'] = $planName;
        $planUpdate['success'] = true;
    } catch (Throwable $e) {
        $planUpdate['message'] = $e->getMessage();
        error_log('Plan update failed: ' . $e->getMessage());
    }
} elseif ($planName !== '' && !isset($_SESSION['vendor_id'])) {
    $planUpdate['message'] = 'Sign in again so we can sync this payment with your vendor account.';
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




