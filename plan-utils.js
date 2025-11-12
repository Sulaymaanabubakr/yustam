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

const PLAN_SLUG_ALIASES = {
  free: 'free',
  'free-plan': 'free',
  'free-seller': 'free',
  'free-vendor': 'free',
  starter: 'starter',
  'starter-plan': 'starter',
  'starter-seller': 'starter',
  'starter-seller-plan': 'starter',
  'starter-vendor': 'starter',
  'starter-vendor-plan': 'starter',
  plus: 'starter',
  'plus-plan': 'starter',
  'plus-seller': 'starter',
  'plus-seller-plan': 'starter',
  basic: 'starter',
  'basic-plan': 'starter',
  'basic-seller': 'starter',
  'basic-seller-plan': 'starter',
  pro: 'pro',
  'pro-plan': 'pro',
  'pro-seller': 'pro',
  'pro-seller-plan': 'pro',
  elite: 'elite',
  'elite-plan': 'elite',
  'elite-seller': 'elite',
  'elite-seller-plan': 'elite',
  premium: 'elite',
  'premium-plan': 'elite',
  'premium-seller': 'elite',
  'premium-seller-plan': 'elite',
  power: 'power',
  'power-plan': 'power',
  'power-vendor': 'power',
  'power-vendor-plan': 'power',
  platinum: 'power',
  'platinum-plan': 'power',
  'platinum-vendor': 'power',
  'platinum-vendor-plan': 'power',
};

function canonicalPlanSlug(slug) {
  if (!slug) return 'free';
  if (PLAN_SLUG_ALIASES[slug]) {
    return PLAN_SLUG_ALIASES[slug];
  }
  if (slug.includes('starter') || slug.includes('plus') || slug.includes('basic')) {
    return 'starter';
  }
  if (slug.includes('pro')) {
    return 'pro';
  }
  if (slug.includes('elite') || slug.includes('premium')) {
    return 'elite';
  }
  if (slug.includes('power') || slug.includes('platinum')) {
    return 'power';
  }
  return slug || 'free';
}

export function stripPlanSuffix(plan) {
  const label = String(plan ?? '').trim();
  if (!label) return '';
  return label.replace(/\s*Plan$/i, '').replace(/\s{2,}/g, ' ').trim();
}

export function displayPlanLabel(plan) {
  const slug = normalisePlanSlug(plan);
  if (PLAN_LABEL_MAP[slug]) {
    return PLAN_LABEL_MAP[slug];
  }
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
  const canonical = canonicalPlanSlug(cleaned);
  return canonical || 'free';
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
