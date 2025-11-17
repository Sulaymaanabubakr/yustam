const normalisePlanKey = (value = '') =>
  String(value || '')
    .toLowerCase()
    .replace(/\b(plan|seller|vendor)\b/gi, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'free';

const PLAN_LIBRARY = {
  free: {
    slug: 'free',
    name: 'Free Plan',
    price: 0,
    duration: 'Forever',
    listings: 5,
    color: '#757575',
    popular: false,
    features: [
      'Up to 5 active listings',
      'Basic vendor profile page',
      'Appear in general search results',
      'Standard listing upload speed',
      'Secure buyer messaging (limited)',
      'Email-only customer support',
      'Access to basic platform resources',
      'No verification badge',
      'No promotional visibility',
      'Upgrade anytime when ready',
    ],
    durationOptions: [
      { months: 1, amount: 0, intervalLabel: 'Monthly', planCode: null },
    ],
  },
  starter: {
    slug: 'starter',
    name: 'Starter Plan',
    price: 3000,
    duration: 'Monthly',
    listings: 15,
    color: '#2D99FF',
    popular: false,
    features: [
      'Up to 15 active listings',
      'Verified vendor badge for credibility',
      'Higher placement in marketplace search',
      'Category-level exposure for listings',
      'Access to basic vendor analytics',
      'Priority listing approval',
      'Custom business profile with banner photo',
      'Limited access to vendor resources',
      'Basic customer support (chat + email)',
      'Eligible for promotional campaigns',
    ],
    durationOptions: [
      { months: 1, amount: 3000, intervalLabel: 'Monthly' },
      { months: 3, amount: 8370, intervalLabel: 'Quarterly' },
      { months: 6, amount: 15840, intervalLabel: 'Biannual' },
      { months: 12, amount: 29880, intervalLabel: 'Annual' },
    ],
  },
  pro: {
    slug: 'pro',
    name: 'Pro Seller Plan',
    price: 5000,
    duration: 'Monthly',
    listings: 25,
    color: '#F3731E',
    popular: true,
    features: [
      'Up to 25 active listings',
      'Verified badge + "Top Rated" tag after 10 sales',
      'Priority placement in search & category listings',
      'Detailed listing analytics (views, reach, engagement)',
      'Discount eligibility on paid promotions',
      'Access to YUSTAM insights dashboard',
      'Custom storefront link (e.g. yustam.com/vendorname)',
      'Priority support response',
      'Participate in vendor spotlight campaigns',
      'Eligible for social media highlight features',
    ],
    durationOptions: [
      { months: 1, amount: 5000, intervalLabel: 'Monthly' },
      { months: 3, amount: 13950, intervalLabel: 'Quarterly' },
      { months: 6, amount: 26400, intervalLabel: 'Biannual' },
      { months: 12, amount: 49800, intervalLabel: 'Annual' },
    ],
  },
  elite: {
    slug: 'elite',
    name: 'Elite Seller Plan',
    price: 8000,
    duration: 'Monthly',
    listings: 50,
    color: '#7E57C2',
    popular: false,
    features: [
      'Up to 50 active listings',
      'Verified vendor + premium badge',
      'Homepage & category spotlight placements',
      'Full analytics dashboard (clicks, conversions, insights)',
      'Access to promotional event placements',
      'Exclusive discounts on paid ads & boosted posts',
      'Product performance comparison tools',
      'Access to beta features and vendor webinars',
      'Priority email + chat support',
      'Invitation to the Elite Vendor Network',
    ],
    durationOptions: [
      { months: 1, amount: 8000, intervalLabel: 'Monthly' },
      { months: 3, amount: 22320, intervalLabel: 'Quarterly' },
      { months: 6, amount: 42240, intervalLabel: 'Biannual' },
      { months: 12, amount: 79680, intervalLabel: 'Annual' },
    ],
  },
  power: {
    slug: 'power',
    name: 'Power Vendor Plan',
    price: 15000,
    duration: 'Monthly',
    listings: 100,
    color: '#0F6A53',
    popular: false,
    features: [
      'Up to 100 active listings',
      'Verified vendor + "Featured Partner" badge',
      'Featured vendor slots on the homepage',
      'Dedicated account manager',
      'Advanced analytics + trend and market reports',
      'Priority listing & product review moderation',
      'Promotional homepage banners',
      'Access to the YUSTAM advertising network',
      'Early access to new marketplace features',
      '24/7 premium vendor support',
      'Free vendor training & promotional materials',
      'Invite-only partnerships & affiliate campaigns',
    ],
    durationOptions: [
      { months: 1, amount: 15000, intervalLabel: 'Monthly' },
      { months: 3, amount: 41850, intervalLabel: 'Quarterly' },
      { months: 6, amount: 79200, intervalLabel: 'Biannual' },
      { months: 12, amount: 149400, intervalLabel: 'Annual' },
    ],
  },
};

export const DEFAULT_VENDOR_PLANS = Object.values(PLAN_LIBRARY);

export const getPlanPreset = (slug = 'free') => {
  const normalized = normalisePlanKey(slug);
  if (PLAN_LIBRARY[normalized]) {
    return PLAN_LIBRARY[normalized];
  }
  const match = Object.values(PLAN_LIBRARY).find((plan) => {
    const planSlugKey = normalisePlanKey(plan.slug);
    const planNameKey = normalisePlanKey(plan.name);
    return planSlugKey === normalized || planNameKey === normalized;
  });
  return match || PLAN_LIBRARY.free;
};

export default PLAN_LIBRARY;
