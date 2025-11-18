const normalisePlanSlug = (value = '') =>
  String(value || '')
    .toLowerCase()
    .replace(/\b(plan|seller|vendor)\b/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'free';

const PLAN_BADGES = {
  free: { background: '#E0E0E0', tick: '#757575', border: '#C5C5C5' },
  starter: { background: '#1877F2', tick: '#FFFFFF', border: '#145DB2' },
  basic: { background: '#1877F2', tick: '#FFFFFF', border: '#145DB2' },
  pro: { background: '#CD7F32', tick: '#FFFFFF', border: '#A85B1F' },
  premium: { background: '#CD7F32', tick: '#FFFFFF', border: '#A85B1F' },
  elite: { background: '#C0C0C0', tick: '#FFFFFF', border: '#9E9E9E' },
  professional: { background: '#C0C0C0', tick: '#FFFFFF', border: '#9E9E9E' },
  power: { background: '#0F6A53', tick: '#FFFFFF', border: '#0B4C3C' },
};

const getPlanPalette = (plan) => PLAN_BADGES[normalisePlanSlug(plan)] || PLAN_BADGES.free;

const normaliseVerificationState = (value) => {
  if (value === true || value === 1 || value === '1') {
    return 'verified';
  }
  if (value === false || value === 0 || value === '0') {
    return 'unverified';
  }
  const normalised = String(value || '').trim().toLowerCase();
  if (!normalised) {
    return 'unverified';
  }
  const compact = normalised.replace(/[^a-z]/g, '');
  if (
    normalised.includes('verified') ||
    ['verified', 'approved', 'active', 'complete', 'completed'].includes(compact)
  ) {
    return 'verified';
  }
  if (
    normalised.includes('pending') ||
    normalised.includes('review') ||
    ['pending', 'submitted', 'processing', 'inreview', 'underreview'].includes(compact)
  ) {
    return 'pending';
  }
  if (normalised.includes('reject') || normalised.includes('declin') || normalised.includes('fail')) {
    return 'rejected';
  }
  return 'unverified';
};

const buildVerificationLabel = (state) => {
  const value = normaliseVerificationState(state);
  switch (value) {
    case 'verified':
      return 'Verified vendor';
    case 'pending':
      return 'Pending verification';
    case 'rejected':
      return 'Verification needs attention';
    default:
      return 'Unverified vendor';
  }
};

const formatPlanLabel = (value) => {
  const plan = String(value || '').trim();
  if (!plan) {
    return 'Free plan';
  }
  return `${plan.replace(/plan$/i, '').trim() || 'Free'} plan`;
};

const formatListingLocation = (item = {}) => {
  const city = item.city || '';
  const state = item.state || '';
  const locationSource = typeof item.location === 'string' ? item.location : '';
  const fallback = locationSource ? locationSource.replace(/,\s*Nigeria$/i, '').trim() : '';
  const parts = [];
  if (city) {
    parts.push(city);
  }
  if (state && (!city || city.toLowerCase() !== state.toLowerCase())) {
    parts.push(state);
  }
  if (!parts.length && fallback) {
    parts.push(fallback);
  }
  return parts.join(', ');
};

const clampRating = (rating) => Math.max(0, Math.min(5, Number(rating) || 0));

const buildVendorBadgeMeta = (item = {}) => {
  const palette = getPlanPalette(item.vendorPlan);
  const verificationState = normaliseVerificationState(item.verification);
  const verificationLabel = buildVerificationLabel(verificationState);
  const planLabel = formatPlanLabel(item.vendorPlan);
  return {
    palette,
    verificationState,
    verificationLabel,
    planLabel,
  };
};

const describeVendorStatus = (item = {}) => {
  const meta = buildVendorBadgeMeta(item);
  const paidStatus = /free/i.test(meta.planLabel) ? 'Free vendor' : 'Paid vendor';
  return `${meta.planLabel}\n${paidStatus}\n${meta.verificationLabel}`;
};

export {
  PLAN_BADGES,
  normalisePlanSlug,
  getPlanPalette,
  normaliseVerificationState,
  buildVerificationLabel,
  formatPlanLabel,
  formatListingLocation,
  clampRating,
  buildVendorBadgeMeta,
  describeVendorStatus,
};


