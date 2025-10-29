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

export function createVerificationBadge(plan, options = {}) {
  const slug = normalisePlanSlug(plan);
  const className = PLAN_CLASS_MAP[slug] || PLAN_CLASS_MAP.free;
  const label = options.roleLabel || verificationPlanLabel(plan);
  const verified = options.verified !== false;
  const icon = verified ? 'ri-shield-check-line' : 'ri-time-line';
  const statusLabel = verified ? 'Verified Vendor' : 'Pending Review';

  return `
    <span class="verification-badge ${className} ${verified ? 'is-verified' : 'is-pending'}">
      <i class="${icon}" aria-hidden="true"></i>
      <span class="verification-badge__role">${label}</span>
      <span class="verification-badge__status">${statusLabel}</span>
    </span>
  `;
}

export function appendVerificationBadge(target, plan, options = {}) {
  if (!target) return null;
  const markup = createVerificationBadge(plan, options);
  const wrapper = document.createElement('span');
  wrapper.className = 'verification-badge';
  wrapper.innerHTML = markup;
  target.appendChild(wrapper);
  return wrapper;
}
