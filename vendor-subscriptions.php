<?php
declare(strict_types=1);

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/subscriptions/vendor-subscription-store.php';

function yustam_paystack_load_env(): void {
    static $loaded = false;
    if ($loaded) {
        return;
    }
    $loaded = true;

    $envPath = __DIR__ . '/.env';
    if (!is_file($envPath) || !is_readable($envPath)) {
        return;
    }

    $lines = file($envPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    if (!is_array($lines)) {
        return;
    }

    foreach ($lines as $line) {
        $trimmed = ltrim($line);
        if ($trimmed === '' || $trimmed[0] === '#') {
            continue;
        }
        if (!str_contains($line, '=')) {
            continue;
        }
        [$key, $value] = explode('=', $line, 2);
        $key = trim($key);
        if ($key === '') {
            continue;
        }
        $value = trim($value);
        $existing = getenv($key);
        if ($existing !== false && trim((string) $existing) !== '') {
            continue;
        }
        putenv($key . '=' . $value);
        $_ENV[$key] = $value;
        if (!array_key_exists($key, $_SERVER)) {
            $_SERVER[$key] = $value;
        }
    }
}

function yustam_vendor_subscription_display_label(?string $value): string {
    $label = trim((string) $value);
    if ($label === '') {
        return '';
    }
    $label = preg_replace('/\s*Plan$/i', '', $label);
    $label = preg_replace('/\s{2,}/', ' ', $label);
    return trim($label);
}

function yustam_vendor_subscription_plan_catalog(): array {
    return [
        'starter' => [
            'name' => 'Starter Plan',
            'displayName' => yustam_vendor_subscription_display_label('Starter Plan'),
            'monthlyPrice' => 3000,
            'listingLimit' => 15,
            'features' => [
                'Up to 15 active listings',
                'Verified vendor badge for credibility',
                'Higher placement in marketplace search',
                'Category-level exposure for listings',
                'Access to basic vendor analytics',
                'Priority listing approval',
                'Custom business profile with banner photo',
                'Limited access to vendor resources',
                'Basic customer support (chat + email)',
                'Eligible for promotional campaigns',
            ],
            'durations' => [
                1 => ['amount' => 3000, 'intervalLabel' => 'Monthly', 'planCode' => 'PLN_j1nrwlimkmfcg5q'],
                3 => ['amount' => 8370, 'intervalLabel' => 'Quarterly', 'planCode' => 'PLN_p5sdo8umjca4jbv'],
                6 => ['amount' => 15840, 'intervalLabel' => 'Biannually', 'planCode' => 'PLN_iuwpbvhy7vqgil0'],
                12 => ['amount' => 29880, 'intervalLabel' => 'Annually', 'planCode' => 'PLN_r7uurqe26e0dg2p'],
            ],
        ],
        'pro' => [
            'name' => 'Pro Seller Plan',
            'displayName' => yustam_vendor_subscription_display_label('Pro Seller Plan'),
            'monthlyPrice' => 5000,
            'listingLimit' => 25,
            'popular' => true,
            'features' => [
                'Up to 25 active listings',
                'Verified badge + "Top Rated" tag after 10 sales',
                'Priority placement in search & category listings',
                'Detailed listing analytics (views, reach, engagement)',
                'Discount eligibility on paid promotions',
                'Access to YUSTAM insights dashboard',
                'Custom storefront link (e.g. yustam.com/vendorname)',
                'Priority support response',
                'Participate in vendor spotlight campaigns',
                'Eligible for social media highlight features',
            ],
            'durations' => [
                1 => ['amount' => 5000, 'intervalLabel' => 'Monthly', 'planCode' => 'PLN_9paomaa1bl6ikft'],
                3 => ['amount' => 13950, 'intervalLabel' => 'Quarterly', 'planCode' => 'PLN_mvrb8re3t8wogm0'],
                6 => ['amount' => 26400, 'intervalLabel' => 'Biannually', 'planCode' => 'PLN_xijcfx9aaf5nvt1'],
                12 => ['amount' => 49800, 'intervalLabel' => 'Annually', 'planCode' => 'PLN_0bghda7lp46ew5u'],
            ],
        ],
        'elite' => [
            'name' => 'Elite Seller Plan',
            'displayName' => yustam_vendor_subscription_display_label('Elite Seller Plan'),
            'monthlyPrice' => 8000,
            'listingLimit' => 50,
            'features' => [
                'Up to 50 active listings',
                'Verified vendor + premium badge',
                'Homepage & category spotlight placements',
                'Full analytics dashboard (clicks, conversions, insights)',
                'Access to promotional event placements',
                'Exclusive discounts on paid ads & boosted posts',
                'Product performance comparison tools',
                'Access to beta features and vendor webinars',
                'Priority email + chat support',
                'Invitation to the Elite Vendor Network',
            ],
            'durations' => [
                1 => ['amount' => 8000, 'intervalLabel' => 'Monthly', 'planCode' => 'PLN_7fu939t6pelwv3s'],
                3 => ['amount' => 22320, 'intervalLabel' => 'Quarterly', 'planCode' => 'PLN_8q8av3vs9d52e6x'],
                6 => ['amount' => 42240, 'intervalLabel' => 'Biannually', 'planCode' => 'PLN_15uflpdg5thmfoj'],
                12 => ['amount' => 79680, 'intervalLabel' => 'Annually', 'planCode' => 'PLN_hvkc4s9j4o9nays'],
            ],
        ],
        'power' => [
            'name' => 'Power Vendor Plan',
            'displayName' => yustam_vendor_subscription_display_label('Power Vendor Plan'),
            'monthlyPrice' => 15000,
            'listingLimit' => 100,
            'features' => [
                'Up to 100 active listings',
                'Verified vendor + "Featured Partner" badge',
                'Featured vendor slots on the homepage',
                'Dedicated account manager',
                'Advanced analytics + trend and market reports',
                'Priority listing & product review moderation',
                'Promotional homepage banners',
                'Access to the YUSTAM advertising network',
                'Early access to new marketplace features',
                '24/7 premium vendor support',
                'Free vendor training & promotional materials',
                'Invite-only partnerships & affiliate campaigns',
            ],
            'durations' => [
                1 => ['amount' => 15000, 'intervalLabel' => 'Monthly', 'planCode' => 'PLN_m0mn0nw12o584dl'],
                3 => ['amount' => 41850, 'intervalLabel' => 'Quarterly', 'planCode' => 'PLN_176562aqdxtnglg'],
                6 => ['amount' => 79200, 'intervalLabel' => 'Biannually', 'planCode' => 'PLN_hxbk93v00ruczkb'],
                12 => ['amount' => 149400, 'intervalLabel' => 'Annually', 'planCode' => 'PLN_r7uurqe26e0dg2p'],
            ],
        ],
    ];
}

function yustam_vendor_subscription_normalise_slug(string $value): string {
    $raw = strtolower(trim($value));
    if ($raw === '') {
        return '';
    }
    $clean = preg_replace('/[^a-z0-9]+/', '-', preg_replace('/plan$/', '', $raw));
    return trim($clean, '-');
}

function yustam_vendor_subscription_plan_lookup(string $slug, int $months): ?array {
    $slug = yustam_vendor_subscription_normalise_slug($slug);
    if ($slug === '' || $months <= 0) {
        return null;
    }
    $catalog = yustam_vendor_subscription_plan_catalog();
    if (!isset($catalog[$slug]['durations'][$months])) {
        return null;
    }
    $entry = $catalog[$slug]['durations'][$months];
    $entry['slug'] = $slug;
    $entry['planName'] = $catalog[$slug]['name'];
    $entry['displayName'] = $catalog[$slug]['displayName'] ?? yustam_vendor_subscription_display_label($catalog[$slug]['name']);
    $entry['durationMonths'] = $months;
    return $entry;
}

function yustam_vendor_subscription_plan_lookup_by_code(string $planCode): ?array {
    $needle = strtolower(trim($planCode));
    if ($needle === '') {
        return null;
    }
    foreach (yustam_vendor_subscription_plan_catalog() as $slug => $plan) {
        foreach ($plan['durations'] as $months => $option) {
            if (strtolower($option['planCode']) === $needle) {
                return [
                    'slug' => $slug,
                    'planName' => $plan['name'],
                    'displayName' => $plan['displayName'] ?? yustam_vendor_subscription_display_label($plan['name']),
                    'durationMonths' => (int) $months,
                    'amount' => (int) $option['amount'],
                    'planCode' => $option['planCode'],
                    'intervalLabel' => $option['intervalLabel'],
                ];
            }
        }
    }
    return null;
}
function yustam_paystack_filter_key(?string $candidate): string {
    $value = trim((string) $candidate);
    if ($value === '') {
        return '';
    }
    if (preg_match('/(replace|your[_-]?key|example|pk_live_xxx|sk_live_xxx)/i', $value)) {
        return '';
    }
    return $value;
}

function yustam_paystack_public_key(): string {
    yustam_paystack_load_env();
    $key = getenv('PAYSTACK_PUBLIC_KEY');
    if ($key === false || trim($key) === '') {
        $key = defined('PAYSTACK_PUBLIC_KEY') ? constant('PAYSTACK_PUBLIC_KEY') : '';
    }
    return yustam_paystack_filter_key($key);
}

function yustam_paystack_secret_key(): string {
    yustam_paystack_load_env();
    $key = getenv('PAYSTACK_SECRET_KEY');
    if ($key === false || trim($key) === '') {
        $key = defined('PAYSTACK_SECRET_KEY') ? constant('PAYSTACK_SECRET_KEY') : '';
    }
    return yustam_paystack_filter_key($key);
}

function yustam_paystack_request(string $method, string $path, ?array $payload = null): array {
    $secret = yustam_paystack_secret_key();
    if ($secret === '') {
        throw new RuntimeException('Paystack secret key is not configured.');
    }
    $ch = curl_init('https://api.paystack.co/' . ltrim($path, '/'));
    if ($ch === false) {
        throw new RuntimeException('Unable to initialise curl for Paystack.');
    }
    $method = strtoupper($method);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 25,
        CURLOPT_CONNECTTIMEOUT => 10,
        CURLOPT_HTTPHEADER => [
            'Authorization: Bearer ' . $secret,
            'Content-Type: application/json',
            'Accept: application/json',
        ],
    ]);
    if ($method === 'POST' || $method === 'PUT' || $method === 'PATCH') {
        curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $payload !== null ? json_encode($payload) : '{}');
    } elseif ($method !== 'GET') {
        curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
    }
    $body = curl_exec($ch);
    if ($body === false) {
        $err = curl_error($ch);
        curl_close($ch);
        throw new RuntimeException('Paystack request failed: ' . $err);
    }
    $code = curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    curl_close($ch);
    $decoded = json_decode($body, true);
    if (!is_array($decoded) || ($decoded['status'] ?? false) !== true) {
        $message = is_array($decoded) && isset($decoded['message']) ? (string) $decoded['message'] : 'Unexpected Paystack response.';
        throw new RuntimeException($message, $code ?: 400);
    }
    return $decoded['data'] ?? [];
}

function yustam_paystack_verify_transaction(string $reference): array {
    $reference = trim($reference);
    if ($reference === '') {
        throw new RuntimeException('Missing Paystack reference.');
    }
    return yustam_paystack_request('GET', 'transaction/verify/' . rawurlencode($reference));
}

function yustam_paystack_fetch_subscription(string $code): array {
    $code = trim($code);
    if ($code === '') {
        return [];
    }
    return yustam_paystack_request('GET', 'subscription/' . rawurlencode($code));
}

function yustam_paystack_enable_subscription(string $code, string $token): void {
    $code = trim($code);
    $token = trim($token);
    if ($code === '' || $token === '') {
        throw new RuntimeException('Missing subscription credentials.');
    }
    yustam_paystack_request('POST', 'subscription/enable', ['code' => $code, 'token' => $token]);
}

function yustam_paystack_disable_subscription(string $code, string $token): void {
    $code = trim($code);
    $token = trim($token);
    if ($code === '' || $token === '') {
        throw new RuntimeException('Missing subscription credentials.');
    }
    yustam_paystack_request('POST', 'subscription/disable', ['code' => $code, 'token' => $token]);
}

function yustam_vendor_subscription_ensure_columns(mysqli $db): void {
    $table = YUSTAM_VENDORS_TABLE;
    $columns = [
        'paystack_plan_code' => "ALTER TABLE `{$table}` ADD COLUMN `paystack_plan_code` VARCHAR(64) DEFAULT NULL",
        'paystack_subscription_code' => "ALTER TABLE `{$table}` ADD COLUMN `paystack_subscription_code` VARCHAR(64) DEFAULT NULL",
        'paystack_email_token' => "ALTER TABLE `{$table}` ADD COLUMN `paystack_email_token` VARCHAR(128) DEFAULT NULL",
        'plan_cancelled_at' => "ALTER TABLE `{$table}` ADD COLUMN `plan_cancelled_at` DATETIME DEFAULT NULL",
    ];
    foreach ($columns as $column => $ddl) {
        $check = $db->query("SHOW COLUMNS FROM `{$table}` LIKE '" . $db->real_escape_string($column) . "'");
        $exists = $check instanceof mysqli_result && $check->num_rows > 0;
        if ($check instanceof mysqli_result) {
            $check->free();
        }
        if (!$exists) {
            $db->query($ddl);
        }
    }
}

function yustam_vendor_subscription_pick_column(array $candidates): ?string {
    foreach ($candidates as $candidate) {
        if (yustam_vendor_table_has_column($candidate)) {
            return $candidate;
        }
    }
    return null;
}
function yustam_vendor_subscription_format_state(array $vendor): array {
    $rawPlanName = (string) ($vendor['plan'] ?? '');
    $slug = yustam_vendor_subscription_normalise_slug($rawPlanName);
    $status = $vendor['plan_status'] ?? ($vendor['subscription_status'] ?? 'Active');
    $expiry = $vendor['plan_expires_at'] ?? ($vendor['plan_expiry'] ?? ($vendor['subscription_expires_at'] ?? ''));
    $expiryIso = '';
    $expiryDisplay = '--';
    if (is_string($expiry) && trim($expiry) !== '') {
        try {
            $dt = new DateTimeImmutable($expiry);
            $expiryIso = $dt->format('Y-m-d H:i:s');
            $expiryDisplay = $dt->format('j M Y');
        } catch (Throwable $e) {
            $expiryDisplay = $expiry;
        }
    }
    $cancelled = !empty($vendor['plan_cancelled_at']) || (is_string($status) && stripos($status, 'cancel') !== false);
    $notice = $expiryDisplay !== '--'
        ? ($cancelled ? 'Auto-renewal is off. You keep benefits until ' . $expiryDisplay . '.' : 'Your next billing date is ' . $expiryDisplay . '.')
        : '';
    $canCancel = !$cancelled && $slug !== '' && $slug !== 'free'
        && !empty($vendor['paystack_subscription_code']) && !empty($vendor['paystack_email_token']);
    $displayName = yustam_vendor_subscription_display_label($rawPlanName !== '' ? $rawPlanName : 'Free Plan');
    $planName = $rawPlanName !== '' ? $rawPlanName : 'Free Plan';

    return [
        'slug' => $slug,
        'planName' => $planName,
        'displayName' => $displayName,
        'status' => $status ?: 'Active',
        'statusLabel' => ucwords(strtolower($status ?: 'Active')),
        'nextBillingIso' => $expiryIso,
        'nextBillingDisplay' => $expiryDisplay,
        'durationMonths' => (int) ($vendor['plan_duration_months'] ?? $vendor['plan_duration'] ?? 0),
        'subscriptionCode' => $vendor['paystack_subscription_code'] ?? '',
        'planCode' => $vendor['paystack_plan_code'] ?? '',
        'canCancel' => $canCancel,
        'cancelled' => $cancelled,
        'notice' => $notice,
    ];
}

function yustam_vendor_subscription_fetch_vendor(mysqli $db, int $vendorId): array {
    $stmt = $db->prepare(sprintf('SELECT * FROM %s WHERE id = ? LIMIT 1', YUSTAM_VENDORS_TABLE));
    if (!$stmt instanceof mysqli_stmt) {
        return [];
    }
    $stmt->bind_param('i', $vendorId);
    $stmt->execute();
    $result = $stmt->get_result();
    $vendor = $result ? $result->fetch_assoc() : [];
    $stmt->close();
    return $vendor ?: [];
}
function yustam_vendor_subscription_process_payment(mysqli $db, int $vendorId, string $reference, ?string $planSlug = null, ?int $durationMonths = null): array {
    yustam_vendor_subscription_ensure_columns($db);
    $transaction = yustam_paystack_verify_transaction($reference);
    if (($transaction['status'] ?? '') !== 'success') {
        throw new RuntimeException('We could not confirm this payment as successful.');
    }
    $planCode = trim((string) ($transaction['plan'] ?? ($transaction['plan_object']['plan_code'] ?? '')));
    $plan = null;
    if ($planSlug !== null && $durationMonths !== null) {
        $plan = yustam_vendor_subscription_plan_lookup($planSlug, $durationMonths);
        if ($plan === null) {
            throw new RuntimeException('The selected plan is not supported.');
        }
        if ($planCode !== '' && strtolower($planCode) !== strtolower($plan['planCode'])) {
            throw new RuntimeException('The payment does not match the selected plan.');
        }
    }
    if ($plan === null) {
        $plan = yustam_vendor_subscription_plan_lookup_by_code($planCode);
    }
    if ($plan === null) {
        throw new RuntimeException('Unable to map this payment to a known plan.');
    }
    $subscriptionCode = (string) ($transaction['subscription']['subscription_code'] ?? $transaction['subscription']['code'] ?? '');
    $emailToken = (string) ($transaction['subscription']['email_token'] ?? '');
    $paidAt = $transaction['paid_at'] ?? ($transaction['paidAt'] ?? $transaction['created_at'] ?? '');
    $amountKobo = (int) ($transaction['amount'] ?? 0);
    $nextPayment = '';
    if ($subscriptionCode !== '') {
        try {
            $sub = yustam_paystack_fetch_subscription($subscriptionCode);
            $nextPayment = (string) ($sub['next_payment_date'] ?? $sub['next_payment'] ?? '');
        } catch (Throwable $e) {
            $nextPayment = '';
        }
    }
    if ($nextPayment === '') {
        try {
            $months = max(1, (int) ($plan['durationMonths'] ?? 1));
            $paidDate = new DateTimeImmutable($paidAt ?: 'now');
            $nextPayment = $paidDate->add(new DateInterval('P' . $months . 'M'))->format('Y-m-d H:i:s');
        } catch (Throwable $e) {
            $nextPayment = '';
        }
    }
    $fields = [];
    $types = '';
    $values = [];
    $planName = $plan['planName'] ?? 'Plan';
    if (yustam_vendor_table_has_column('plan')) {
        $fields[] = '`plan` = ?';
        $types .= 's';
        $values[] = $planName;
    }
    $statusColumn = yustam_vendor_subscription_pick_column(['plan_status', 'subscription_status', 'plan_state', 'planstate']);
    if ($statusColumn) {
        $fields[] = sprintf('`%s` = ?', $statusColumn);
        $types .= 's';
        $values[] = 'Active';
    }
    $durationColumn = yustam_vendor_subscription_pick_column(['plan_duration_months', 'plan_duration', 'subscription_duration', 'billing_duration']);
    if ($durationColumn) {
        $fields[] = sprintf('`%s` = ?', $durationColumn);
        $types .= 'i';
        $values[] = (int) ($plan['durationMonths'] ?? 1);
    }
    $expiryColumn = yustam_vendor_subscription_pick_column(['plan_expires_at', 'plan_expiry', 'plan_expiration', 'subscription_expires_at', 'subscription_expiry']);
    if ($expiryColumn) {
        $fields[] = sprintf('`%s` = ?', $expiryColumn);
        $types .= 's';
        $values[] = $nextPayment !== '' ? $nextPayment : null;
    }
    $activatedColumn = yustam_vendor_subscription_pick_column(['plan_started_at', 'subscription_started_at', 'plan_activated_at', 'plan_paid_at']);
    if ($activatedColumn) {
        $payTimestamp = null;
        if ($paidAt !== '') {
            try {
                $payTimestamp = (new DateTimeImmutable($paidAt))->format('Y-m-d H:i:s');
            } catch (Throwable $e) {
                $payTimestamp = null;
            }
        }
        if ($payTimestamp !== null) {
            $fields[] = sprintf('`%s` = ?', $activatedColumn);
            $types .= 's';
            $values[] = $payTimestamp;
        }
    }
    $renewedColumn = yustam_vendor_subscription_pick_column(['plan_renewed_at', 'plan_updated_at', 'subscription_updated_at', 'last_payment_at']);
    if ($renewedColumn) {
        $fields[] = sprintf('`%s` = NOW()', $renewedColumn);
    }
    if ($amountKobo > 0) {
        $amountColumn = yustam_vendor_subscription_pick_column(['plan_amount', 'subscription_amount', 'last_plan_amount', 'billing_amount']);
        if ($amountColumn) {
            $fields[] = sprintf('`%s` = ?', $amountColumn);
            $types .= 'd';
            $values[] = $amountKobo / 100;
        }
    }
    $referenceColumn = yustam_vendor_subscription_pick_column(['plan_reference', 'payment_reference', 'subscription_reference', 'last_payment_reference']);
    if ($referenceColumn) {
        $fields[] = sprintf('`%s` = ?', $referenceColumn);
        $types .= 's';
        $values[] = $reference;
    }
    foreach (['paystack_plan_code' => $plan['planCode'] ?? $planCode, 'paystack_subscription_code' => $subscriptionCode, 'paystack_email_token' => $emailToken] as $column => $value) {
        if ($value !== '' && yustam_vendor_table_has_column($column)) {
            $fields[] = sprintf('`%s` = ?', $column);
            $types .= 's';
            $values[] = $value;
        }
    }
    if (yustam_vendor_table_has_column('plan_cancelled_at')) {
        $fields[] = '`plan_cancelled_at` = NULL';
    }
    if (yustam_vendor_table_has_column('updated_at')) {
        $fields[] = '`updated_at` = NOW()';
    }
    $sql = sprintf('UPDATE `%s` SET %s WHERE id = ?', YUSTAM_VENDORS_TABLE, implode(', ', $fields));
    $stmt = $db->prepare($sql);
    if (!$stmt instanceof mysqli_stmt) {
        throw new RuntimeException('Unable to update vendor subscription.');
    }
    $types .= 'i';
    $values[] = $vendorId;
    $bind = [$types];
    foreach ($values as $idx => $val) {
        $bind[] = &$values[$idx];
    }
    call_user_func_array([$stmt, 'bind_param'], $bind);
    $stmt->execute();
    $stmt->close();

    try {
        yustam_vendor_subscription_record_sync_from_paystack($db, $vendorId, $transaction, [
            'plan_name' => $planName,
            'reference' => $reference,
            'event' => 'transaction.verify',
        ]);
    } catch (Throwable $syncError) {
        error_log('Subscription record sync failed: ' . $syncError->getMessage());
    }

    $vendor = yustam_vendor_subscription_fetch_vendor($db, $vendorId);
    return [
        'subscription' => yustam_vendor_subscription_format_state($vendor),
        'amountKobo' => $amountKobo,
        'currency' => $transaction['currency'] ?? 'NGN',
    ];
}

function yustam_vendor_subscription_set_autorenew(mysqli $db, int $vendorId, bool $enabled): array {
    yustam_vendor_subscription_ensure_columns($db);
    $vendor = yustam_vendor_subscription_fetch_vendor($db, $vendorId);
    if (!$vendor) {
        throw new RuntimeException('Vendor account was not found.');
    }

    $subscriptionCode = trim((string) ($vendor['paystack_subscription_code'] ?? ''));
    $emailToken = trim((string) ($vendor['paystack_email_token'] ?? ''));
    if ($subscriptionCode === '' || $emailToken === '') {
        $record = yustam_vendor_subscription_record_fetch($db, $vendorId);
        if ($record) {
            if ($subscriptionCode === '' && !empty($record['subscription_code'])) {
                $subscriptionCode = $record['subscription_code'];
            }
            if ($emailToken === '' && !empty($record['email_token'])) {
                $emailToken = $record['email_token'];
            }
        }
    }
    if ($subscriptionCode === '' || $emailToken === '') {
        throw new RuntimeException('There is no active subscription to manage.');
    }

    if ($enabled) {
        yustam_paystack_enable_subscription($subscriptionCode, $emailToken);
    } else {
        yustam_paystack_disable_subscription($subscriptionCode, $emailToken);
    }

    $fields = [];
    $statusColumn = yustam_vendor_subscription_pick_column(['plan_status', 'subscription_status', 'plan_state', 'planstate']);
    if ($statusColumn) {
        $fields[] = sprintf('`%s` = ?', $statusColumn);
    }
    if (yustam_vendor_table_has_column('plan_cancelled_at')) {
        $fields[] = $enabled ? '`plan_cancelled_at` = NULL' : '`plan_cancelled_at` = NOW()';
    }
    if (yustam_vendor_table_has_column('updated_at')) {
        $fields[] = '`updated_at` = NOW()';
    }
    if ($fields) {
        $sql = sprintf('UPDATE `%s` SET %s WHERE id = ?', YUSTAM_VENDORS_TABLE, implode(', ', $fields));
        $stmt = $db->prepare($sql);
        if (!$stmt instanceof mysqli_stmt) {
            throw new RuntimeException('Unable to update vendor subscription state.');
        }
        if ($statusColumn) {
            $statusValue = $enabled ? 'Active' : 'Cancel Pending';
            $stmt->bind_param('si', $statusValue, $vendorId);
        } else {
            $stmt->bind_param('i', $vendorId);
        }
        $stmt->execute();
        $stmt->close();
    }

    try {
        yustam_vendor_subscription_record_save($db, $vendorId, [
            'subscription_code' => $subscriptionCode,
            'email_token' => $emailToken,
            'auto_renew' => $enabled,
            'status' => $enabled ? 'ACTIVE' : 'CANCELLED',
            'last_event' => $enabled ? 'subscription.enable' : 'subscription.disable',
        ]);
    } catch (Throwable $syncError) {
        error_log('Unable to sync auto-renew state: ' . $syncError->getMessage());
    }

    $updated = yustam_vendor_subscription_fetch_vendor($db, $vendorId);
    return [
        'subscription' => yustam_vendor_subscription_format_state($updated ?: $vendor),
        'autoRenew' => $enabled,
    ];
}

function yustam_vendor_subscription_record_cancellation(mysqli $db, int $vendorId, ?string $reason): void {
    $createSql = <<<SQL
CREATE TABLE IF NOT EXISTS `api_subscription_cancellations` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `vendor_id` INT UNSIGNED NOT NULL,
    `reason` TEXT NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_vendor_id` (`vendor_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
SQL;
    $db->query($createSql);
    $stmt = $db->prepare('INSERT INTO `api_subscription_cancellations` (vendor_id, reason, created_at) VALUES (?, ?, NOW())');
    if ($stmt instanceof mysqli_stmt) {
        $text = trim((string) $reason);
        $stmt->bind_param('is', $vendorId, $text);
        $stmt->execute();
        $stmt->close();
    }
}

function yustam_vendor_subscription_cancel(mysqli $db, int $vendorId, ?string $reason = null): array {
    yustam_vendor_subscription_ensure_columns($db);
    $vendor = yustam_vendor_subscription_fetch_vendor($db, $vendorId);
    if (!$vendor) {
        throw new RuntimeException('Vendor account was not found.');
    }
    $subscriptionCode = trim((string) ($vendor['paystack_subscription_code'] ?? ''));
    $emailToken = trim((string) ($vendor['paystack_email_token'] ?? ''));
    if ($subscriptionCode === '' || $emailToken === '') {
        $record = yustam_vendor_subscription_record_fetch($db, $vendorId);
        if ($record) {
            if ($subscriptionCode === '' && !empty($record['subscription_code'])) {
                $subscriptionCode = $record['subscription_code'];
            }
            if ($emailToken === '' && !empty($record['email_token'])) {
                $emailToken = $record['email_token'];
            }
        }
    }
    if ($subscriptionCode === '' || $emailToken === '') {
        throw new RuntimeException('There is no active subscription to cancel.');
    }
    yustam_paystack_disable_subscription($subscriptionCode, $emailToken);
    yustam_vendor_subscription_record_cancellation($db, $vendorId, $reason);
    $fields = [];
    $statusColumn = yustam_vendor_subscription_pick_column(['plan_status', 'subscription_status', 'plan_state', 'planstate']);
    if ($statusColumn) {
        $fields[] = sprintf('`%s` = ?', $statusColumn);
    }
    if (yustam_vendor_table_has_column('plan_cancelled_at')) {
        $fields[] = '`plan_cancelled_at` = NOW()';
    }
    if (yustam_vendor_table_has_column('updated_at')) {
        $fields[] = '`updated_at` = NOW()';
    }
    $sql = sprintf('UPDATE `%s` SET %s WHERE id = ?', YUSTAM_VENDORS_TABLE, implode(', ', $fields));
    $stmt = $db->prepare($sql);
    if (!$stmt instanceof mysqli_stmt) {
        throw new RuntimeException('Unable to update vendor cancellation state.');
    }
    if ($statusColumn) {
        $statusValue = 'Cancel Pending';
        $stmt->bind_param('si', $statusValue, $vendorId);
    } else {
        $stmt->bind_param('i', $vendorId);
    }
    $stmt->execute();
    $stmt->close();
    try {
        yustam_vendor_subscription_record_save($db, $vendorId, [
            'subscription_code' => $subscriptionCode,
            'email_token' => $emailToken,
            'status' => 'CANCELLED',
            'auto_renew' => 0,
            'next_payment_at' => null,
            'last_event' => 'subscription.disable',
        ]);
    } catch (Throwable $syncError) {
        error_log('Unable to record cancellation state: ' . $syncError->getMessage());
    }

    $vendor = yustam_vendor_subscription_fetch_vendor($db, $vendorId);
    return [
        'subscription' => yustam_vendor_subscription_format_state($vendor),
    ];
}

function yustam_vendor_subscription_refresh(mysqli $db, int $vendorId, ?string $subscriptionCode = null): array {
    yustam_vendor_subscription_ensure_columns($db);
    $vendor = yustam_vendor_subscription_fetch_vendor($db, $vendorId);
    if (!$vendor) {
        throw new RuntimeException('Vendor account was not found.');
    }
    $record = yustam_vendor_subscription_record_fetch($db, $vendorId);
    $code = trim((string) ($subscriptionCode ?? ($vendor['paystack_subscription_code'] ?? '')));
    if ($code === '' && $record && !empty($record['subscription_code'])) {
        $code = $record['subscription_code'];
    }
    if ($code === '') {
        throw new RuntimeException('This vendor does not have a Paystack subscription reference to refresh.');
    }

    $subscription = yustam_paystack_fetch_subscription($code);
    if (!$subscription) {
        throw new RuntimeException('Unable to load subscription from Paystack.');
    }

    $plan = $subscription['plan'] ?? [];
    $planName = (string) ($plan['name'] ?? $subscription['plan_name'] ?? 'Plan');
    $planCode = (string) ($plan['plan_code'] ?? $plan['code'] ?? $subscription['plan_code'] ?? '');
    $emailToken = (string) ($subscription['email_token'] ?? '');
    $status = strtolower((string) ($subscription['status'] ?? 'active'));
    $nextPayment = $subscription['next_payment_date'] ?? $subscription['next_payment'] ?? ($subscription['expiration'] ?? null);
    $amount = isset($plan['amount']) ? (int) $plan['amount'] : (int) ($subscription['amount'] ?? 0);

    $expiryValue = null;
    if (is_string($nextPayment) && trim($nextPayment) !== '') {
        try {
            $expiryValue = (new DateTimeImmutable($nextPayment))->format('Y-m-d H:i:s');
        } catch (Throwable $exception) {
            $expiryValue = $nextPayment;
        }
    }

    $columns = yustam_vendor_table_columns();
    $assignments = [];
    $types = '';
    $values = [];

    $setColumn = function (?string $column, $value, string $type = 's') use (&$assignments, &$types, &$values, $columns): void {
        if (!$column || !in_array($column, $columns, true)) {
            return;
        }
        $assignments[] = "`{$column}` = ?";
        $types .= $type;
        $values[] = $value;
    };

    if (in_array('plan', $columns, true)) {
        $setColumn('plan', $planName);
    }
    $statusColumn = yustam_vendor_subscription_pick_column(['plan_status', 'subscription_status', 'plan_state', 'planstate']);
    if ($statusColumn) {
        $setColumn($statusColumn, strtoupper($status));
    }
    $expiryColumn = yustam_vendor_subscription_pick_column(['plan_expires_at', 'plan_expiry', 'subscription_expires_at']);
    if ($expiryColumn && $expiryValue !== null) {
        $setColumn($expiryColumn, $expiryValue);
    }
    $amountColumn = yustam_vendor_subscription_pick_column(['plan_amount', 'subscription_amount', 'last_plan_amount']);
    if ($amountColumn && $amount > 0) {
        $setColumn($amountColumn, $amount, 'i');
    }
    if (in_array('paystack_plan_code', $columns, true)) {
        $setColumn('paystack_plan_code', $planCode);
    }
    if (in_array('paystack_subscription_code', $columns, true)) {
        $setColumn('paystack_subscription_code', $code);
    }
    if ($emailToken !== '' && in_array('paystack_email_token', $columns, true)) {
        $setColumn('paystack_email_token', $emailToken);
    }

    $cancelColumn = yustam_vendor_subscription_pick_column(['plan_cancelled_at', 'subscription_cancelled_at']);
    if ($cancelColumn) {
        if (strpos($status, 'cancel') !== false || strpos($status, 'disable') !== false) {
            $assignments[] = "`{$cancelColumn}` = NOW()";
        } else {
            $assignments[] = "`{$cancelColumn}` = NULL";
        }
    }
    if (in_array('updated_at', $columns, true)) {
        $assignments[] = '`updated_at` = NOW()';
    }

    if ($assignments) {
        $sql = sprintf('UPDATE `%s` SET %s WHERE id = ? LIMIT 1', YUSTAM_VENDORS_TABLE, implode(', ', $assignments));
        $stmt = $db->prepare($sql);
        if ($stmt instanceof mysqli_stmt) {
            if ($types !== '') {
                $types .= 'i';
                $values[] = $vendorId;
                $stmt->bind_param($types, ...$values);
            } else {
                $stmt->bind_param('i', $vendorId);
            }
            $stmt->execute();
            $stmt->close();
        }
    }

    try {
        yustam_vendor_subscription_record_sync_from_paystack($db, $vendorId, $subscription, [
            'event' => 'subscription.refresh',
        ]);
    } catch (Throwable $syncError) {
        error_log('Unable to sync refreshed subscription: ' . $syncError->getMessage());
    }

    $updated = yustam_vendor_subscription_fetch_vendor($db, $vendorId);
    return [
        'subscription' => yustam_vendor_subscription_format_state($updated ?: $vendor),
    ];
}

function yustam_vendor_subscription_handle_expiry(mysqli $db, array $vendor): array {
    $plan = strtolower(trim((string) ($vendor['plan'] ?? '')));
    if ($plan === '' || strpos($plan, 'free') !== false) {
        return ['changed' => false];
    }
    $expiry = $vendor['plan_expires_at'] ?? ($vendor['plan_expiry'] ?? ($vendor['subscription_expires_at'] ?? ''));
    if (!is_string($expiry) || trim($expiry) === '') {
        return ['changed' => false];
    }
    try {
        $dt = new DateTimeImmutable($expiry);
        if ($dt > new DateTimeImmutable('now')) {
            return ['changed' => false];
        }
    } catch (Throwable $e) {
        return ['changed' => false];
    }
    yustam_vendor_subscription_ensure_columns($db);
    $fields = ['`plan` = "Free Plan"'];
    $statusColumn = yustam_vendor_subscription_pick_column(['plan_status', 'subscription_status', 'plan_state', 'planstate']);
    if ($statusColumn) {
        $fields[] = sprintf('`%s` = "Expired"', $statusColumn);
    }
    foreach (['plan_expires_at', 'plan_expiry', 'plan_expiration', 'subscription_expires_at', 'subscription_expiry'] as $col) {
        if (yustam_vendor_table_has_column($col)) {
            $fields[] = sprintf('`%s` = NULL', $col);
        }
    }
    foreach (['paystack_plan_code', 'paystack_subscription_code', 'paystack_email_token'] as $col) {
        if (yustam_vendor_table_has_column($col)) {
            $fields[] = sprintf('`%s` = NULL', $col);
        }
    }
    if (yustam_vendor_table_has_column('plan_cancelled_at')) {
        $fields[] = '`plan_cancelled_at` = NULL';
    }
    if (yustam_vendor_table_has_column('updated_at')) {
        $fields[] = '`updated_at` = NOW()';
    }
    $sql = sprintf('UPDATE `%s` SET %s WHERE id = ?', YUSTAM_VENDORS_TABLE, implode(', ', $fields));
    $stmt = $db->prepare($sql);
    if ($stmt instanceof mysqli_stmt) {
        $stmt->bind_param('i', $vendor['id']);
        $stmt->execute();
        $stmt->close();
    }
    $updated = yustam_vendor_subscription_fetch_vendor($db, (int) $vendor['id']);
    return [
        'changed' => true,
        'subscription' => yustam_vendor_subscription_format_state($updated ?: $vendor),
    ];
}

