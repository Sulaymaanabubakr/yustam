const PLAN_CLASS_MAP = {
  free: 'verification-badge--free',
  starter: 'verification-badge--starter',
  plus: 'verification-badge--starter',
  basic: 'verification-badge--starter',
  pro: 'verification-badge--pro',
  elite: 'verification-badge--elite',
  premium: 'verification-badge--elite',
  power: 'verification-badge--power',
  platinum: 'verification-badge--power',
};

const PLAN_LABEL_MAP = {
  free: 'Free Seller',
  starter: 'Starter Seller',
  plus: 'Starter Seller',
  basic: 'Starter Seller',
  pro: 'Pro Seller',
  elite: 'Elite Seller',
  premium: 'Elite Seller',
  power: 'Power Vendor',
  platinum: 'Power Vendor',
};

export function normalisePlanSlug(plan) {
  const raw = String(plan ?? '').trim().toLowerCase();
  if (!raw) return 'free';
  const trimmed = raw.replace(/plan$/, '');
  const cleaned = trimmed.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return cleaned || 'free';
}

export function verificationPlanLabel(plan) {
  const slug = normalisePlanSlug(plan);
  if (PLAN_LABEL_MAP[slug]) {
    return PLAN_LABEL_MAP[slug];
  }
  const fallback = slug.replace(/-/g, ' ').trim();
  if (!fallback) return 'Verified Seller';
  const sentence = fallback
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
  if (/seller|vendor/i.test(sentence)) {
    return sentence;
  }
  return `${sentence} Seller`;
}

export function createVerificationBadge(verificationState, options = {}) {
  const state = String(verificationState ?? '').trim().toLowerCase();
  let resolvedState = 'unverified';
  if (state === 'verified' || state === 'approved' || state === 'active') {
    resolvedState = 'verified';
  } else if (state === 'pending' || state === 'processing' || state === 'under review' || state === 'under_review') {
    resolvedState = 'pending';
  }

  const icon =
    resolvedState === 'verified'
      ? 'ri-shield-check-line'
      : resolvedState === 'pending'
      ? 'ri-time-line'
      : 'ri-alert-line';

  const label =
    resolvedState === 'verified'
      ? options.verifiedLabel || 'Verified Vendor'
      : resolvedState === 'pending'
      ? options.pendingLabel || 'Pending Review'
      : options.unverifiedLabel || 'Not Verified';

  const badgeClass =
    resolvedState === 'verified' ? 'verified' : resolvedState === 'pending' ? 'pending' : 'unverified';

  return `<span class="vendor-badge vendor-verified ${badgeClass}"><i class="${icon}" aria-hidden="true"></i>${label}</span>`;
}

export function appendVerificationBadge(target, plan, options = {}) {
  if (!target) return null;
  if (options.verified === false) return null;

  const slug = normalisePlanSlug(plan);
  const className = PLAN_CLASS_MAP[slug] || PLAN_CLASS_MAP.free;
  const label = options.roleLabel || 'Verified Vendor';
  if (!label) return null;

  const wrapper = document.createElement('span');
  wrapper.className = `verification-badge verification-badge--inline ${className}`;
  wrapper.innerHTML = `<i class="ri-shield-check-line" aria-hidden="true"></i><span>${label}</span>`;
  if (options.title) {
    wrapper.title = options.title;
  } else {
    const planLabel = plan ? verificationPlanLabel(plan) : '';
    const suffix = planLabel && planLabel !== label ? ` · ${planLabel}` : '';
    wrapper.title = `${label}${suffix}`.trim();
  }
  target.appendChild(wrapper);
  return wrapper;
}
