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

export function stripPlanSuffix(plan) {
  const label = String(plan ?? '').trim();
  if (!label) return '';
  return label.replace(/\s*Plan$/i, '').replace(/\s{2,}/g, ' ').trim();
}

export function displayPlanLabel(plan) {
  const cleaned = stripPlanSuffix(plan);
  if (cleaned) {
    return cleaned;
  }
  return 'Free';
}

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
