<?php
declare(strict_types=1);

require_once __DIR__ . '/db.php';

/**
 * Return vendor identifiers that should be pre-warmed.
 *
 * @param array<int|string> $requestedIds
 * @return array<int,string>
 */
function yustam_storefront_cache_vendor_identifiers(array $requestedIds = []): array
{
    $candidates = [];

    if ($requestedIds) {
        foreach ($requestedIds as $id) {
            $idString = trim((string) $id);
            if ($idString !== '') {
                $candidates[] = $idString;
            }
        }
    } else {
        try {
            $conn = get_db_connection();
            $sql = 'SELECT vendor_uid, firebase_uid, id FROM ' . YUSTAM_VENDORS_TABLE . ' WHERE status <> "inactive" ORDER BY id DESC LIMIT 100';
            $result = $conn->query($sql);
            if ($result instanceof mysqli_result) {
                while ($row = $result->fetch_assoc()) {
                    foreach (['vendor_uid', 'firebase_uid', 'id'] as $column) {
                        if (!empty($row[$column])) {
                            $candidates[] = (string) $row[$column];
                        }
                    }
                }
                $result->free();
            }
        } catch (Throwable $exception) {
            error_log('vendor cache warm list failed: ' . $exception->getMessage());
        }
    }

    $unique = [];
    foreach ($candidates as $candidate) {
        $candidate = preg_replace('/[^A-Za-z0-9_\-]/', '', $candidate);
        if ($candidate !== '') {
            $unique[$candidate] = true;
        }
    }

    return array_keys($unique);
}

/**
 * Warm the vendor storefront cache for provided identifiers.
 *
 * @param array<int,string> $vendorIds
 * @param callable|null $onProgress
 */
function yustam_storefront_cache_warm(array $vendorIds, ?callable $onProgress = null): void
{
    if (!$vendorIds) {
        return;
    }

    $baseUrl = 'http://localhost/vendor-storefront-data.php?id=';
    $isCli = php_sapi_name() === 'cli';

    foreach ($vendorIds as $vendorId) {
        $url = $baseUrl . rawurlencode($vendorId);
        $success = false;
        try {
            $context = stream_context_create([
                'http' => [
                    'method' => 'GET',
                    'timeout' => 10,
                    'ignore_errors' => true,
                    'header' => [
                        'Accept: application/json',
                    ],
                ],
            ]);
            $response = @file_get_contents($url, false, $context);
            if ($response !== false) {
                $decoded = json_decode($response, true);
                $success = is_array($decoded) && ($decoded['success'] ?? false);
            }
        } catch (Throwable $exception) {
            $success = false;
        }

        if ($onProgress) {
            $onProgress($vendorId, $success);
        } elseif ($isCli) {
            echo sprintf("[%s] %s\n", $success ? 'OK' : 'ERR', $vendorId);
        }
    }
}
