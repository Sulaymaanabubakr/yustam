<?php
declare(strict_types=1);

/**
 * Compute a slug identifier for a vendor subscription plan.
 */
if (!function_exists('yustam_verification_plan_slug')) {
function yustam_verification_plan_slug(?string $plan): string
{
    $value = strtolower(trim((string) $plan));
    if ($value === '') {
        return 'free';
    }

    $value = preg_replace('/plan$/', '', $value);
    $value = preg_replace('/[^a-z0-9]+/', '-', $value);
    $value = trim((string) $value, '-');

    return $value !== '' ? $value : 'free';
}
}

/**
 * Retrieve the descriptive label associated with a plan slug.
 */
if (!function_exists('yustam_verification_plan_label')) {
function yustam_verification_plan_label(?string $plan): string
{
    static $labels = [
        'free' => 'Free Seller',
        'starter' => 'Starter Seller',
        'plus' => 'Starter Seller',
        'basic' => 'Starter Seller',
        'pro' => 'Pro Seller',
        'elite' => 'Elite Seller',
        'premium' => 'Elite Seller',
        'power' => 'Power Vendor',
        'platinum' => 'Power Vendor',
    ];

    $slug = yustam_verification_plan_slug($plan);
    if (isset($labels[$slug])) {
        return $labels[$slug];
    }

    $fallback = str_replace('-', ' ', $slug);
    $fallback = ucwords($fallback);

    if ($fallback === '') {
        $fallback = 'Verified Seller';
    } elseif (stripos($fallback, 'seller') === false && stripos($fallback, 'vendor') === false) {
        $fallback .= ' Seller';
    }

    return $fallback;
}
}

/**
 * Normalise different verification columns into a canonical state.
 */
if (!function_exists('yustam_verification_state_from_value')) {
function yustam_verification_state_from_value($value): string
{
    if ($value === true || $value === 1 || $value === '1') {
        return 'verified';
    }

    if ($value === false || $value === 0 || $value === '0' || $value === null) {
        return 'unverified';
    }

    $normalised = strtolower(trim((string) $value));

    if (in_array($normalised, ['verified', 'approved', 'active', 'true', 'yes', 'completed', 'complete'], true)) {
        return 'verified';
    }

    if (in_array($normalised, ['pending', 'submitted', 'processing', 'under review', 'under_review', 'in_review', 'in-review'], true)) {
        return 'pending';
    }

    if (in_array($normalised, ['rejected', 'declined', 'failed', 'needs_changes', 'needs-changes', 'needs update', 'needs-update'], true)) {
        return 'rejected';
    }

    return 'unverified';
}
}

if (!function_exists('yustam_is_verified_state')) {
function yustam_is_verified_state($value): bool
{
    return yustam_verification_state_from_value($value) === 'verified';
}
}

/**
 * Render a verification badge span for the provided plan.
 *
 * @param string|null $plan       The plan name or slug.
 * @param bool        $isVerified Whether the account is verified.
 * @param array       $options    Optional attributes: class, role_label, title.
 *
 * @return string HTML markup for the badge or empty string.
 */
if (!function_exists('yustam_render_verification_badge')) {
function yustam_render_verification_badge(?string $plan, bool $isVerified = true, array $options = []): string
{
    if (!$isVerified) {
        return '';
    }

    $slug = yustam_verification_plan_slug($plan);
    $labels = [
        'free' => 'verification-badge--free',
        'starter' => 'verification-badge--starter',
        'plus' => 'verification-badge--starter',
        'basic' => 'verification-badge--starter',
        'pro' => 'verification-badge--pro',
        'elite' => 'verification-badge--elite',
        'premium' => 'verification-badge--elite',
        'power' => 'verification-badge--power',
        'platinum' => 'verification-badge--power',
    ];

    $classSuffix = $labels[$slug] ?? 'verification-badge--unknown';
    $roleLabel = isset($options['role_label']) ? trim((string) $options['role_label']) : '';
    $planLabel = yustam_verification_plan_label($plan);
    $tooltipText = trim((string) ($options['title'] ?? ''));

    if ($tooltipText === '') {
        $tooltipText = 'Verified ' . ($roleLabel !== '' ? $roleLabel : $planLabel);
    }

    $classes = ['verification-badge', $classSuffix];
    if (!empty($options['class'])) {
        $classes[] = trim((string) $options['class']);
    }

    $attributes = [
        'class' => implode(' ', $classes),
        'data-plan' => $slug,
        'data-tooltip' => 'true',
        'role' => 'img',
        'aria-label' => $tooltipText,
        'title' => $tooltipText,
    ];

    $attributeString = '';
    foreach ($attributes as $key => $value) {
        $attributeString .= sprintf(' %s="%s"', $key, htmlspecialchars((string) $value, ENT_QUOTES, 'UTF-8'));
    }

    $tooltipMarkup = sprintf(
        '<span class="verification-badge-tooltip" role="tooltip">%s</span>',
        htmlspecialchars($tooltipText, ENT_QUOTES, 'UTF-8')
    );

    return sprintf('<span%s>%s</span>', $attributeString, $tooltipMarkup);
}
}
