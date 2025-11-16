<?php
declare(strict_types=1);

require_once __DIR__ . '/../db.php';

if (!defined('YUSTAM_VENDOR_SUBSCRIPTIONS_TABLE')) {
    define('YUSTAM_VENDOR_SUBSCRIPTIONS_TABLE', 'vendor_subscriptions');
}

function yustam_vendor_subscription_records_table_name(): string
{
    $table = YUSTAM_VENDOR_SUBSCRIPTIONS_TABLE;
    return preg_match('/^[A-Za-z0-9_]+$/', (string) $table) ? $table : 'vendor_subscriptions';
}

function yustam_vendor_subscription_records_ensure_table(mysqli $db): void
{
    static $ensured = false;
    if ($ensured) {
        return;
    }
    $table = yustam_vendor_subscription_records_table_name();
    $sql = <<<SQL
CREATE TABLE IF NOT EXISTS `{$table}` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `vendor_id` BIGINT UNSIGNED NOT NULL,
    `subscription_code` VARCHAR(128) DEFAULT NULL,
    `authorization_code` VARCHAR(128) DEFAULT NULL,
    `email_token` VARCHAR(128) DEFAULT NULL,
    `plan_code` VARCHAR(128) DEFAULT NULL,
    `plan_name` VARCHAR(191) DEFAULT NULL,
    `plan_interval` VARCHAR(64) DEFAULT NULL,
    `plan_amount` BIGINT DEFAULT NULL,
    `status` VARCHAR(64) DEFAULT NULL,
    `next_payment_at` DATETIME DEFAULT NULL,
    `auto_renew` TINYINT(1) DEFAULT 1,
    `last_charge_reference` VARCHAR(191) DEFAULT NULL,
    `last_event` VARCHAR(64) DEFAULT NULL,
    `raw_payload` LONGTEXT NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uniq_vendor_id` (`vendor_id`),
    UNIQUE KEY `uniq_subscription_code` (`subscription_code`),
    KEY `idx_plan_code` (`plan_code`),
    KEY `idx_status` (`status`),
    KEY `idx_next_payment` (`next_payment_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
SQL;
    $db->query($sql);
    $ensured = true;
}

function yustam_vendor_subscription_record_normalize_datetime($value): ?string
{
    if ($value instanceof DateTimeInterface) {
        return $value->format('Y-m-d H:i:s');
    }
    if (is_numeric($value)) {
        $timestamp = (int) $value;
        return $timestamp > 0 ? date('Y-m-d H:i:s', $timestamp) : null;
    }
    if (!is_string($value)) {
        return null;
    }
    $trimmed = trim($value);
    if ($trimmed === '') {
        return null;
    }
    try {
        return (new DateTimeImmutable($trimmed))->format('Y-m-d H:i:s');
    } catch (Throwable $exception) {
        return $trimmed;
    }
}

function yustam_vendor_subscription_record_normalize_fields(array $fields): array
{
    $normalized = [];
    $map = [
        'subscription_code',
        'authorization_code',
        'email_token',
        'plan_code',
        'plan_name',
        'plan_interval',
        'plan_amount',
        'status',
        'next_payment_at',
        'auto_renew',
        'last_charge_reference',
        'last_event',
        'raw_payload',
    ];

    foreach ($map as $column) {
        if (!array_key_exists($column, $fields)) {
            continue;
        }
        $value = $fields[$column];
        if ($value === null) {
            $normalized[$column] = null;
            continue;
        }
        switch ($column) {
            case 'plan_amount':
                $normalized[$column] = is_numeric($value) ? (int) $value : null;
                break;
            case 'auto_renew':
                $normalized[$column] = is_bool($value)
                    ? (int) $value
                    : (in_array(strtolower((string) $value), ['1', 'true', 'yes', 'active'], true) ? 1 : 0);
                break;
            case 'next_payment_at':
                $normalized[$column] = yustam_vendor_subscription_record_normalize_datetime($value);
                break;
            case 'raw_payload':
                if (is_array($value)) {
                    $normalized[$column] = json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
                } elseif (is_string($value)) {
                    $trimmed = trim($value);
                    $normalized[$column] = $trimmed === '' ? null : $trimmed;
                } else {
                    $normalized[$column] = null;
                }
                break;
            default:
                $normalized[$column] = is_string($value) ? trim($value) : $value;
                break;
        }
    }

    return array_filter(
        $normalized,
        static function ($value) {
            if ($value === null) {
                return true;
            }
            if (is_string($value)) {
                return $value !== '';
            }
            return true;
        }
    );
}

function yustam_vendor_subscription_record_fetch(mysqli $db, int $vendorId): ?array
{
    yustam_vendor_subscription_records_ensure_table($db);
    $table = yustam_vendor_subscription_records_table_name();
    $stmt = $db->prepare(sprintf('SELECT * FROM `%s` WHERE vendor_id = ? LIMIT 1', $table));
    if (!$stmt instanceof mysqli_stmt) {
        return null;
    }
    $stmt->bind_param('i', $vendorId);
    $stmt->execute();
    $result = $stmt->get_result();
    $record = $result instanceof mysqli_result ? $result->fetch_assoc() : null;
    $stmt->close();
    return $record ?: null;
}

function yustam_vendor_subscription_record_fetch_by_code(mysqli $db, string $code): ?array
{
    $trimmed = trim($code);
    if ($trimmed === '') {
        return null;
    }
    yustam_vendor_subscription_records_ensure_table($db);
    $table = yustam_vendor_subscription_records_table_name();
    $stmt = $db->prepare(sprintf('SELECT * FROM `%s` WHERE subscription_code = ? LIMIT 1', $table));
    if (!$stmt instanceof mysqli_stmt) {
        return null;
    }
    $stmt->bind_param('s', $trimmed);
    $stmt->execute();
    $result = $stmt->get_result();
    $record = $result instanceof mysqli_result ? $result->fetch_assoc() : null;
    $stmt->close();
    return $record ?: null;
}

function yustam_vendor_subscription_record_find_vendor_id_by_code(mysqli $db, string $code): int
{
    $record = yustam_vendor_subscription_record_fetch_by_code($db, $code);
    if ($record && isset($record['vendor_id'])) {
        return (int) $record['vendor_id'];
    }
    $trimmed = trim($code);
    if ($trimmed === '') {
        return 0;
    }
    $stmt = $db->prepare(sprintf('SELECT id FROM `%s` WHERE `paystack_subscription_code` = ? LIMIT 1', YUSTAM_VENDORS_TABLE));
    if (!$stmt instanceof mysqli_stmt) {
        return 0;
    }
    $stmt->bind_param('s', $trimmed);
    $stmt->execute();
    $result = $stmt->get_result();
    $row = $result instanceof mysqli_result ? $result->fetch_assoc() : null;
    $stmt->close();
    return $row ? (int) $row['id'] : 0;
}

function yustam_vendor_subscription_record_lookup_vendor_by_email(mysqli $db, string $email): int
{
    $clean = strtolower(trim($email));
    if ($clean === '') {
        return 0;
    }
    $stmt = $db->prepare(sprintf('SELECT id FROM `%s` WHERE LOWER(email) = ? LIMIT 1', YUSTAM_VENDORS_TABLE));
    if (!$stmt instanceof mysqli_stmt) {
        return 0;
    }
    $stmt->bind_param('s', $clean);
    $stmt->execute();
    $result = $stmt->get_result();
    $row = $result instanceof mysqli_result ? $result->fetch_assoc() : null;
    $stmt->close();
    return $row ? (int) $row['id'] : 0;
}

function yustam_vendor_subscription_record_save(mysqli $db, int $vendorId, array $fields): ?array
{
    $normalized = yustam_vendor_subscription_record_normalize_fields($fields);
    if (!$normalized) {
        return yustam_vendor_subscription_record_fetch($db, $vendorId);
    }
    yustam_vendor_subscription_records_ensure_table($db);
    $table = yustam_vendor_subscription_records_table_name();
    $columns = array_keys($normalized);
    $placeholders = array_fill(0, count($columns), '?');
    $updates = array_map(
        static function (string $column): string {
            return sprintf('`%s` = VALUES(`%s`)', $column, $column);
        },
        $columns
    );
    $sql = sprintf(
        'INSERT INTO `%s` (vendor_id%s) VALUES (?%s) ON DUPLICATE KEY UPDATE %s',
        $table,
        $columns ? ', ' . implode(', ', array_map(static fn($column) => sprintf('`%s`', $column), $columns)) : '',
        $columns ? ', ' . implode(', ', $placeholders) : '',
        implode(', ', $updates)
    );
    $stmt = $db->prepare($sql);
    if (!$stmt instanceof mysqli_stmt) {
        return null;
    }
    $types = 'i';
    $values = [$vendorId];
    foreach ($columns as $column) {
        if ($column === 'plan_amount' || $column === 'auto_renew') {
            $types .= 'i';
            $values[] = $normalized[$column] !== null ? (int) $normalized[$column] : null;
        } else {
            $types .= 's';
            $values[] = $normalized[$column];
        }
    }
    $bind = [$types];
    foreach ($values as $idx => $value) {
        $bind[] = &$values[$idx];
    }
    call_user_func_array([$stmt, 'bind_param'], $bind);
    $stmt->execute();
    $stmt->close();
    return yustam_vendor_subscription_record_fetch($db, $vendorId);
}

function yustam_vendor_subscription_record_save_by_code(mysqli $db, string $code, array $fields, ?int $vendorId = null): ?array
{
    $trimmed = trim($code);
    if ($trimmed === '') {
        return null;
    }
    if ($vendorId === null || $vendorId <= 0) {
        $vendorId = yustam_vendor_subscription_record_find_vendor_id_by_code($db, $trimmed);
    }
    if ($vendorId <= 0) {
        return null;
    }
    $fields['subscription_code'] = $trimmed;
    return yustam_vendor_subscription_record_save($db, $vendorId, $fields);
}

function yustam_vendor_subscription_record_extract_from_paystack(array $payload, ?array $context = null): array
{
    $subscription = [];
    if (isset($payload['subscription']) && is_array($payload['subscription'])) {
        $subscription = $payload['subscription'];
    } elseif (isset($payload['data']['subscription']) && is_array($payload['data']['subscription'])) {
        $subscription = $payload['data']['subscription'];
    }
    $plan = [];
    if (isset($payload['plan']) && is_array($payload['plan'])) {
        $plan = $payload['plan'];
    } elseif (isset($subscription['plan']) && is_array($subscription['plan'])) {
        $plan = $subscription['plan'];
    } elseif (isset($payload['plan_object']) && is_array($payload['plan_object'])) {
        $plan = $payload['plan_object'];
    }
    $authorization = [];
    if (isset($payload['authorization']) && is_array($payload['authorization'])) {
        $authorization = $payload['authorization'];
    } elseif (isset($payload['data']['authorization']) && is_array($payload['data']['authorization'])) {
        $authorization = $payload['data']['authorization'];
    }
    $status = strtoupper((string) ($subscription['status'] ?? ($payload['status'] ?? ($context['status'] ?? ''))));
    $subscriptionCode = (string) ($subscription['subscription_code'] ?? ($subscription['code'] ?? ($payload['subscription_code'] ?? '')));
    $emailToken = (string) ($subscription['email_token'] ?? ($payload['email_token'] ?? ''));
    $authorizationCode = (string) ($authorization['authorization_code'] ?? ($authorization['code'] ?? ($payload['authorization_code'] ?? '')));
    $nextPayment = $subscription['next_payment_date']
        ?? $subscription['next_payment']
        ?? ($payload['next_payment_date'] ?? ($payload['next_payment'] ?? ($payload['expiration'] ?? null)));
    $planAmount = $plan['amount'] ?? ($payload['amount'] ?? null);
    $planName = $plan['name'] ?? ($payload['plan_name'] ?? ($context['plan_name'] ?? null));
    $planCode = $plan['plan_code'] ?? ($plan['code'] ?? ($payload['plan'] ?? ($payload['plan_code'] ?? null)));
    $planInterval = $plan['interval'] ?? ($plan['interval_name'] ?? ($payload['interval'] ?? null));
    $autoRenew = !preg_match('/(cancel|disable|inactive)/i', $status ?: '');
    $fields = [
        'subscription_code' => $subscriptionCode,
        'authorization_code' => $authorizationCode,
        'email_token' => $emailToken,
        'plan_code' => $planCode,
        'plan_name' => $planName,
        'plan_interval' => $planInterval,
        'plan_amount' => $planAmount,
        'status' => $status ?: null,
        'next_payment_at' => yustam_vendor_subscription_record_normalize_datetime($nextPayment),
        'auto_renew' => $autoRenew,
        'last_charge_reference' => $payload['reference'] ?? ($context['reference'] ?? null),
        'last_event' => $context['event'] ?? null,
        'raw_payload' => $payload,
    ];
    return array_filter($fields, static function ($value) {
        return $value !== null && $value !== '';
    });
}

function yustam_vendor_subscription_record_sync_from_paystack(mysqli $db, int $vendorId, array $payload, ?array $context = null): ?array
{
    $fields = yustam_vendor_subscription_record_extract_from_paystack($payload, $context);
    if (!$fields) {
        return null;
    }
    return yustam_vendor_subscription_record_save($db, $vendorId, $fields);
}

function yustam_vendor_subscription_record_detect_vendor_id(mysqli $db, array $payload): int
{
    $metaCandidates = [];
    foreach (['metadata', 'data'] as $key) {
        if (isset($payload[$key]['metadata'])) {
            $metaCandidates[] = $payload[$key]['metadata'];
        }
    }
    if (isset($payload['customer']) && is_array($payload['customer'])) {
        $customer = $payload['customer'];
        if (isset($customer['metadata'])) {
            $metaCandidates[] = $customer['metadata'];
        }
    }
    foreach ($metaCandidates as $metaCandidate) {
        if (is_string($metaCandidate)) {
            $decoded = json_decode($metaCandidate, true);
            if (is_array($decoded)) {
                $metaCandidate = $decoded;
            }
        }
        if (!is_array($metaCandidate)) {
            continue;
        }
        $vendorId = (int) ($metaCandidate['vendor_id'] ?? $metaCandidate['vendorId'] ?? $metaCandidate['user_id'] ?? 0);
        if ($vendorId > 0) {
            return $vendorId;
        }
        if (!empty($metaCandidate['vendor'])) {
            if (preg_match('/(\d+)/', (string) $metaCandidate['vendor'], $matches)) {
                return (int) $matches[1];
            }
        }
    }

    $subscriptionCode = '';
    if (isset($payload['subscription_code'])) {
        $subscriptionCode = trim((string) $payload['subscription_code']);
    } elseif (isset($payload['subscription']) && is_array($payload['subscription'])) {
        $subscriptionCode = (string) ($payload['subscription']['subscription_code'] ?? ($payload['subscription']['code'] ?? ''));
    }
    if ($subscriptionCode !== '') {
        $vendorId = yustam_vendor_subscription_record_find_vendor_id_by_code($db, $subscriptionCode);
        if ($vendorId > 0) {
            return $vendorId;
        }
    }

    $email = null;
    if (isset($payload['customer']) && is_array($payload['customer']) && !empty($payload['customer']['email'])) {
        $email = $payload['customer']['email'];
    } elseif (isset($payload['authorization']) && is_array($payload['authorization']) && !empty($payload['authorization']['email'])) {
        $email = $payload['authorization']['email'];
    }
    if (is_string($email) && $email !== '') {
        $vendorId = yustam_vendor_subscription_record_lookup_vendor_by_email($db, $email);
        if ($vendorId > 0) {
            return $vendorId;
        }
    }

    return 0;
}

function yustam_vendor_subscription_record_format_status(?array $record, ?array $vendor = null): array
{
    $vendor = $vendor ?? [];
    $status = 'INACTIVE';
    $planName = $vendor['plan'] ?? 'Free Plan';
    $planCode = $vendor['paystack_plan_code'] ?? null;
    $subscriptionCode = $vendor['paystack_subscription_code'] ?? '';
    $nextPayment = $vendor['plan_expires_at'] ?? ($vendor['plan_expiry'] ?? ($vendor['subscription_expires_at'] ?? null));
    $autoRenew = empty($vendor['plan_cancelled_at']);
    if ($record) {
        $status = strtoupper((string) ($record['status'] ?? $status));
        $planName = $record['plan_name'] ?? $planName;
        $planCode = $record['plan_code'] ?? $planCode;
        $subscriptionCode = $record['subscription_code'] ?? $subscriptionCode;
        $autoRenew = isset($record['auto_renew']) ? (bool) $record['auto_renew'] : $autoRenew;
        $nextPayment = $record['next_payment_at'] ?? $nextPayment;
    }
    $expiresDisplay = $nextPayment ? yustam_vendor_subscription_record_normalize_datetime($nextPayment) : null;
    $statusValue = $status ?: 'INACTIVE';
    $activeFlags = !in_array(strtolower($statusValue), ['inactive', 'disabled', 'cancelled', 'expired', 'cancel pending'], true);
    $active = $subscriptionCode !== '' && $activeFlags;
    return [
        'active' => $active,
        'status' => $statusValue,
        'plan_name' => $planName ?: 'Free Plan',
        'plan_code' => $planCode,
        'subscription_code' => $subscriptionCode,
        'authorization_code' => $record['authorization_code'] ?? null,
        'next_payment_date' => $expiresDisplay,
        'expires' => $expiresDisplay,
        'auto_renew' => (bool) $autoRenew,
        'vendor_id' => $record['vendor_id'] ?? ($vendor['id'] ?? null),
        'plan_interval' => $record['plan_interval'] ?? null,
        'plan_amount' => $record['plan_amount'] ?? null,
        'last_event' => $record['last_event'] ?? null,
        'updated_at' => $record['updated_at'] ?? null,
    ];
}
