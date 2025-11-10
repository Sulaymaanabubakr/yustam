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
      '5 Active Listings',
      'Basic Marketplace Visibility',
      'Standard Support',
      'Community Resources',
    ],
  },
  starter: {
    slug: 'starter',
    name: 'Starter Plan',
    price: 3000,
    duration: 'Monthly',
    listings: 25,
    color: '#2D99FF',
    popular: false,
    features: [
      '25 Active Listings',
      '2 Featured Slots Monthly',
      'Priority Email Support',
      'Basic Insights Dashboard',
    ],
  },
  pro: {
    slug: 'pro',
    name: 'Pro Seller Plan',
    price: 5000,
    duration: 'Monthly',
    listings: 60,
    color: '#F3731E',
    popular: true,
    features: [
      '60 Active Listings',
      'Weekly Featured Placements',
      'Chat Priority & Voice Support',
      'Advanced Analytics Overview',
      'Verification Fast-Track',
    ],
  },
  elite: {
    slug: 'elite',
    name: 'Elite Seller Plan',
    price: 8000,
    duration: 'Monthly',
    listings: 120,
    color: '#7E57C2',
    popular: false,
    features: [
      '120 Active Listings',
      'Homepage Feature Slots',
      'Dedicated Success Partner',
      'Full Funnel Analytics',
      'Discounted Boosted Ads',
    ],
  },
  power: {
    slug: 'power',
    name: 'Power Vendor Plan',
    price: 15000,
    duration: 'Monthly',
    listings: 250,
    color: '#0F6A53',
    popular: false,
    features: [
      '250+ Active Listings',
      'Unlimited Featured Products',
      'Marketplace Ads Credits',
      'Custom Storefront Themes',
      'API + Bulk Upload Access',
    ],
  },
};

export const DEFAULT_VENDOR_PLANS = Object.values(PLAN_LIBRARY);

export const getPlanPreset = (slug = 'free') => PLAN_LIBRARY[slug] || PLAN_LIBRARY.free;

export default PLAN_LIBRARY;
