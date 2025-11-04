<?php
declare(strict_types=1);

require_once __DIR__ . '/admin-session.php';

require_admin_auth();

header('Content-Type: application/json');

try {
    $db = get_db_connection();
} catch (Throwable $exception) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Unable to connect to the database.',
    ]);
    exit;
}

$vendorTable = 'vendors';
if (defined('YUSTAM_VENDORS_TABLE') && preg_match('/^[A-Za-z0-9_]+$/', (string) YUSTAM_VENDORS_TABLE)) {
    $vendorTable = YUSTAM_VENDORS_TABLE;
}

$planPriceMap = [
    'starter' => 3000,
    'pro' => 5000,
    'elite' => 8000,
    'power' => 15000,
];

/**
 * Convert a stored plan value into a canonical slug.
 */
function yustam_canonical_plan_slug($value): string
{
    $raw = strtolower(trim((string) $value));
    if ($raw === '') {
        return 'free';
    }

    $raw = preg_replace('/plan$/', '', $raw);
    $raw = preg_replace('/[^a-z0-9]+/', '-', $raw);
    $raw = trim((string) $raw, '-');

    if ($raw === '') {
        return 'free';
    }

    static $aliasMap = [
        'free' => 'free',
        'free-seller' => 'free',
        'free-vendor' => 'free',
        'starter' => 'starter',
        'starter-seller' => 'starter',
        'starter-plan' => 'starter',
        'starter-vendor' => 'starter',
        'plus' => 'starter',
        'plus-plan' => 'starter',
        'plus-seller' => 'starter',
        'basic' => 'starter',
        'basic-plan' => 'starter',
        'basic-seller' => 'starter',
        'pro' => 'pro',
        'pro-seller' => 'pro',
        'pro-plan' => 'pro',
        'elite' => 'elite',
        'elite-seller' => 'elite',
        'elite-plan' => 'elite',
        'premium' => 'elite',
        'premium-plan' => 'elite',
        'power' => 'power',
        'power-vendor' => 'power',
        'power-plan' => 'power',
        'platinum' => 'power',
        'platinum-plan' => 'power',
        'platinum-vendor' => 'power',
    ];

    if (isset($aliasMap[$raw])) {
        return $aliasMap[$raw];
    }

    $needles = [
        'starter' => ['starter', 'plus', 'basic'],
        'pro' => ['pro'],
        'elite' => ['elite', 'premium'],
        'power' => ['power', 'platinum'],
    ];

    foreach ($needles as $slug => $patterns) {
        foreach ($patterns as $pattern) {
            if (str_contains($raw, $pattern)) {
                return $slug;
            }
        }
    }

    return 'free';
}

/**
 * Normalise plan names to the dashboard buckets.
 */
function yustam_normalise_plan_bucket($value): string
{
    return yustam_canonical_plan_slug($value);
}

function yustam_plan_label_from_slug(string $slug): string
{
    static $labels = [
        'free' => 'Free',
        'starter' => 'Starter Seller',
        'pro' => 'Pro Seller',
        'elite' => 'Elite Seller',
        'power' => 'Power Vendor',
    ];

    return $labels[$slug] ?? 'Free';
}

function yustam_format_plan_label(?string $plan): string
{
    $slug = yustam_canonical_plan_slug($plan);
    return yustam_plan_label_from_slug($slug);
}

function yustam_slugify_plan(?string $plan): string
{
    return yustam_canonical_plan_slug($plan);
}

function yustam_normalise_verification_state($value): string
{
    if ($value === true || $value === 1 || $value === '1') {
        return 'verified';
    }
    if ($value === false || $value === 0 || $value === '0' || $value === null) {
        return 'unverified';
    }
    $value = strtolower(trim((string) $value));
    if (in_array($value, ['verified', 'approved', 'active', 'complete', 'completed', 'yes', 'true'], true)) {
        return 'verified';
    }
    if (in_array($value, ['pending', 'submitted', 'processing', 'under review', 'in_review', 'in-review'], true)) {
        return 'pending';
    }
    if (in_array($value, ['rejected', 'declined', 'failed', 'needs_changes', 'needs update', 'needs-update'], true)) {
        return 'rejected';
    }
    return 'unverified';
}

function yustam_verification_label(string $state): string
{
    switch ($state) {
        case 'verified':
            return 'Verified';
        case 'pending':
            return 'Pending Review';
        case 'rejected':
            return 'Needs Changes';
        default:
            return 'Not Verified';
    }
}

function yustam_normalise_account_status($value): string
{
    $value = strtolower(trim((string) $value));
    if ($value === '') {
        return 'active';
    }
    if (in_array($value, ['active', 'enabled', 'approved', 'verified', 'open'], true)) {
        return 'active';
    }
    if (in_array($value, ['suspended', 'disabled', 'blocked'], true)) {
        return 'suspended';
    }
    if (in_array($value, ['pending', 'awaiting', 'review'], true)) {
        return 'pending';
    }
    return 'active';
}

function yustam_account_status_label(string $state): string
{
    switch ($state) {
        case 'pending':
            return 'Pending Approval';
        case 'suspended':
            return 'Suspended';
        default:
            return 'Active';
    }
}

function yustam_prepare_vendor_summary(mysqli $db, string $vendorTable, array $planPriceMap): array
{
    $response = [
        'success' => true,
        'summary' => [
            'total' => 0,
            'planCounts' => [
                'free' => 0,
                'starter' => 0,
                'pro' => 0,
                'elite' => 0,
                'power' => 0,
            ],
            'activePlans' => 0,
            'revenue' => 0,
        ],
        'vendors' => [],
    ];

    $totalResult = $db->query(sprintf('SELECT COUNT(*) AS total FROM `%s`', $vendorTable));
    if ($totalResult instanceof mysqli_result) {
        $row = $totalResult->fetch_assoc();
        $response['summary']['total'] = (int) ($row['total'] ?? 0);
        $totalResult->free();
    }

    if (yustam_vendor_table_has_column('plan')) {
        $planResult = $db->query(sprintf('SELECT `plan`, COUNT(*) AS total FROM `%s` GROUP BY `plan`', $vendorTable));
        if ($planResult instanceof mysqli_result) {
            while ($row = $planResult->fetch_assoc()) {
                $bucket = yustam_normalise_plan_bucket($row['plan'] ?? '');
                if (!array_key_exists($bucket, $response['summary']['planCounts'])) {
                    $response['summary']['planCounts'][$bucket] = 0;
                }
                $response['summary']['planCounts'][$bucket] += (int) ($row['total'] ?? 0);
            }
            $planResult->free();
        }
    } else {
        $response['summary']['planCounts']['free'] = $response['summary']['total'];
    }

    $response['summary']['activePlans'] = $response['summary']['planCounts']['starter']
        + $response['summary']['planCounts']['pro']
        + $response['summary']['planCounts']['elite']
        + $response['summary']['planCounts']['power'];

    $estimatedRevenue = 0;
    foreach ($planPriceMap as $plan => $price) {
        $estimatedRevenue += $price * ($response['summary']['planCounts'][$plan] ?? 0);
    }
    $response['summary']['revenue'] = $estimatedRevenue;

    $orderColumn = 'id';
    foreach (['created_at', 'updated_at', 'joined_at'] as $candidate) {
        if (yustam_vendor_table_has_column($candidate)) {
            $orderColumn = $candidate;
            break;
        }
    }

    $recentSql = sprintf(
        'SELECT * FROM `%s` ORDER BY `%s` DESC LIMIT 8',
        $vendorTable,
        $orderColumn
    );
    $recentResult = $db->query($recentSql);

    if ($recentResult instanceof mysqli_result) {
        $nameColumn = yustam_vendor_name_column();
        $businessColumn = yustam_vendor_table_has_column('business_name') ? 'business_name' : null;
        $emailColumn = yustam_vendor_table_has_column('email') ? 'email' : null;
        $profilePhotoColumn = yustam_vendor_table_has_column('profile_photo') ? 'profile_photo' : null;
        $avatarColumn = yustam_vendor_table_has_column('avatar_url') ? 'avatar_url' : null;
        $statusColumn = yustam_vendor_table_has_column('status') ? 'status' : null;

        $verificationColumn = null;
        foreach (['verification_status', 'verification_state', 'kyc_status', 'verification_stage'] as $candidate) {
            if (yustam_vendor_table_has_column($candidate)) {
                $verificationColumn = $candidate;
                break;
            }
        }

        $vendorUidColumn = yustam_vendor_table_has_column('vendor_uid') ? 'vendor_uid' : null;
        $firebaseUidColumn = yustam_vendor_table_has_column('firebase_uid') ? 'firebase_uid' : null;

        while ($row = $recentResult->fetch_assoc()) {
            $planValue = array_key_exists('plan', $row) ? ($row['plan'] ?? '') : '';
            $planLabel = yustam_format_plan_label($planValue);
            $planSlug = yustam_slugify_plan($planValue);

            $statusType = 'account';
            $statusValue = $statusColumn ? ($row[$statusColumn] ?? '') : '';
            if ($statusValue === '' && $verificationColumn) {
                $statusType = 'verification';
                $statusValue = $row[$verificationColumn] ?? '';
            }

            if ($statusType === 'verification') {
                $statusState = yustam_normalise_verification_state($statusValue);
                $statusLabel = yustam_verification_label($statusState);
            } else {
                $statusState = yustam_normalise_account_status($statusValue);
                $statusLabel = yustam_account_status_label($statusState);
            }

            $createdAt = $row[$orderColumn] ?? '';
            $joinedDisplay = '-';
            $timestamp = strtotime((string) $createdAt);
            if ($timestamp) {
                $joinedDisplay = date('j M Y', $timestamp);
            }

            $profilePhoto = '';
            if ($profilePhotoColumn && !empty($row[$profilePhotoColumn])) {
                $profilePhoto = (string) $row[$profilePhotoColumn];
            } elseif ($avatarColumn && !empty($row[$avatarColumn])) {
                $profilePhoto = (string) $row[$avatarColumn];
            }

            $response['vendors'][] = [
                'id' => (int) ($row['id'] ?? 0),
                'name' => trim((string) ($row[$nameColumn] ?? '')) ?: 'Vendor',
                'businessName' => $businessColumn ? (string) ($row[$businessColumn] ?? '') : '',
                'email' => $emailColumn ? (string) ($row[$emailColumn] ?? '') : '',
                'vendorUid' => $vendorUidColumn ? (string) ($row[$vendorUidColumn] ?? '') : '',
                'firebaseUid' => $firebaseUidColumn ? (string) ($row[$firebaseUidColumn] ?? '') : '',
                'plan' => $planLabel,
                'planSlug' => $planSlug,
                'status' => $statusLabel,
                'statusState' => $statusState,
                'profilePhoto' => $profilePhoto,
                'joined' => $joinedDisplay,
                'createdAt' => $createdAt,
            ];
        }

        $recentResult->free();
    }

    return $response;
}

try {
    $payload = yustam_prepare_vendor_summary($db, $vendorTable, $planPriceMap);
    echo json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
} catch (Throwable $error) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Unable to prepare vendor summary.',
    ]);
}
