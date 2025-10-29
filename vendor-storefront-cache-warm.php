<?php
declare(strict_types=1);

require_once __DIR__ . '/vendor-storefront-cache.php';

$args = array_slice($argv ?? [], 1);
$vendorIds = yustam_storefront_cache_vendor_identifiers($args);

if (!$vendorIds) {
    fwrite(STDOUT, "No vendor identifiers found to warm.\n");
    exit(0);
}

fwrite(STDOUT, sprintf("Warming %d vendor storefront cache entries...\n", count($vendorIds)));
yustam_storefront_cache_warm($vendorIds, function (string $vendorId, bool $success): void {
    fwrite(STDOUT, sprintf("[%s] %s\n", $success ? 'OK' : 'ERR', $vendorId));
});
fwrite(STDOUT, "Done.\n");
