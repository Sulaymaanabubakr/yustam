/// Subscription Plan Model
/// Represents a vendor subscription plan
class PlanModel {
  final String slug;
  final String name;
  final int price; // Monthly price in Naira
  final String color;
  final bool popular;
  final int listingsLimit;
  final List<String> features;
  final Map<String, PlanDuration> durationOptions;

  PlanModel({
    required this.slug,
    required this.name,
    required this.price,
    required this.color,
    this.popular = false,
    required this.listingsLimit,
    required this.features,
    required this.durationOptions,
  });

  /// Get price for specific duration
  int getPriceForDuration(int months) {
    final duration = durationOptions[months.toString()];
    return duration?.amount ?? (price * months);
  }

  /// Get Paystack plan code for duration
  String? getPlanCode(int months) {
    return durationOptions[months.toString()]?.planCode;
  }

  /// Check if plan is free
  bool get isFree => price == 0;

  /// Get monthly price (alias for price)
  int get monthlyPrice => price;

  /// Get max listings (alias for listingsLimit)
  int get maxListings => listingsLimit;

  /// Get AI prompts per day based on plan
  int get aiPromptsPerDay {
    if (slug == 'free') return 5;
    if (slug == 'starter') return 20;
    if (slug == 'pro') return 50;
    if (slug == 'elite') return 100;
    if (slug == 'power') return 200;
    return 5;
  }

  /// Get formatted monthly price
  String get formattedPrice {
    if (isFree) return 'Free';
    return '₦${price.toString().replaceAllMapped(
          RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'),
          (Match m) => '${m[1]},',
        )}/month';
  }
}

/// Plan Duration Option
class PlanDuration {
  final int months;
  final int amount;
  final String planCode; // Paystack plan code
  final int discount; // Discount percentage

  PlanDuration({
    required this.months,
    required this.amount,
    required this.planCode,
    this.discount = 0,
  });

  /// Get formatted price
  String get formattedPrice {
    return '₦${amount.toString().replaceAllMapped(
          RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'),
          (Match m) => '${m[1]},',
        )}';
  }

  /// Get duration label
  String get label {
    if (months == 1) return 'Monthly';
    if (months == 3) return 'Quarterly';
    if (months == 6) return 'Biannual';
    if (months == 12) return 'Annual';
    return '$months months';
  }
}

/// Available subscription plans
class SubscriptionPlans {
  static final List<PlanModel> all = [
    // Free Plan
    PlanModel(
      slug: 'free',
      name: 'Free',
      price: 0,
      color: '#9CA3AF',
      listingsLimit: 5,
      features: [
        'Basic vendor profile',
        'General search appearance',
        'Standard upload speed',
        'Limited secure buyer messaging',
        'Email-only support',
        'Basic platform resources',
      ],
      durationOptions: {},
    ),

    // Starter Plan
    PlanModel(
      slug: 'starter',
      name: 'Starter',
      price: 3000,
      color: '#3B82F6',
      listingsLimit: 15,
      features: [
        'Verified vendor badge',
        'Higher search placement',
        'Category-level exposure',
        'Basic vendor analytics',
        'Priority listing approval',
        'Custom business profile with banner',
        'Basic chat + email support',
      ],
      durationOptions: {
        '1': PlanDuration(
          months: 1,
          amount: 3000,
          planCode: 'PLN_j1nrwlimkmfcg5q',
        ),
        '3': PlanDuration(
          months: 3,
          amount: 8370, // 7% discount
          planCode: 'PLN_p5sdo8umjca4jbv',
          discount: 7,
        ),
        '6': PlanDuration(
          months: 6,
          amount: 15840, // 12% discount
          planCode: 'PLN_iuwpbvhy7vqgil0',
          discount: 12,
        ),
        '12': PlanDuration(
          months: 12,
          amount: 29880, // 17% discount
          planCode: 'PLN_r7uurqe26e0dg2p',
          discount: 17,
        ),
      },
    ),

    // Pro Seller Plan
    PlanModel(
      slug: 'pro',
      name: 'Pro Seller',
      price: 5000,
      color: '#F3731E',
      popular: true,
      listingsLimit: 25,
      features: [
        'Verified + "Top Rated" badge (after 10 sales)',
        'Priority placement in search & categories',
        'Detailed listing analytics',
        'Discount eligibility on paid promotions',
        'YUSTAM insights dashboard',
        'Custom storefront link',
        'Priority support',
        'Participate in vendor spotlight',
      ],
      durationOptions: {
        '1': PlanDuration(
          months: 1,
          amount: 5000,
          planCode: 'PLN_9paomaa1bl6ikft',
        ),
        '3': PlanDuration(
          months: 3,
          amount: 13950, // 7% discount
          planCode: 'PLN_mvrb8re3t8wogm0',
          discount: 7,
        ),
        '6': PlanDuration(
          months: 6,
          amount: 26400, // 12% discount
          planCode: 'PLN_xijcfx9aaf5nvt1',
          discount: 12,
        ),
        '12': PlanDuration(
          months: 12,
          amount: 49800, // 17% discount
          planCode: 'PLN_0bghda7lp46ew5u',
          discount: 17,
        ),
      },
    ),

    // Elite Seller Plan
    PlanModel(
      slug: 'elite',
      name: 'Elite Seller',
      price: 8000,
      color: '#9333EA',
      listingsLimit: 50,
      features: [
        'Verified vendor + premium badge',
        'Homepage & category spotlight placements',
        'Full analytics dashboard',
        'Access to promotional event placements',
        'Exclusive discounts on paid ads',
        'Product performance comparison',
        'Beta features access',
        'Vendor webinars',
        'Priority email + chat support',
      ],
      durationOptions: {
        '1': PlanDuration(
          months: 1,
          amount: 8000,
          planCode: 'PLN_7fu939t6pelwv3s',
        ),
        '3': PlanDuration(
          months: 3,
          amount: 22320, // 7% discount
          planCode: 'PLN_8q8av3vs9d52e6x',
          discount: 7,
        ),
        '6': PlanDuration(
          months: 6,
          amount: 42240, // 12% discount
          planCode: 'PLN_15uflpdg5thmfoj',
          discount: 12,
        ),
        '12': PlanDuration(
          months: 12,
          amount: 79680, // 17% discount
          planCode: 'PLN_hvkc4s9j4o9nays',
          discount: 17,
        ),
      },
    ),

    // Power Vendor Plan
    PlanModel(
      slug: 'power',
      name: 'Power Vendor',
      price: 15000,
      color: '#0F6A53',
      listingsLimit: 100,
      features: [
        'Verified vendor + "Featured Partner" badge',
        'Featured vendor slots on homepage',
        'Dedicated account manager',
        'Advanced analytics + trend/market reports',
        'Priority listing/product review moderation',
        'Promotional homepage banners',
        'YUSTAM advertising network access',
        'Early access to new features',
        '24/7 premium support',
        'Free training/promotional materials',
      ],
      durationOptions: {
        '1': PlanDuration(
          months: 1,
          amount: 15000,
          planCode: 'PLN_m0mn0nw12o584dl',
        ),
        '3': PlanDuration(
          months: 3,
          amount: 41850, // 7% discount
          planCode: 'PLN_176562aqdxtnglg',
          discount: 7,
        ),
        '6': PlanDuration(
          months: 6,
          amount: 79200, // 12% discount
          planCode: 'PLN_hxbk93v00ruczkb',
          discount: 12,
        ),
        '12': PlanDuration(
          months: 12,
          amount: 149400, // 17% discount
          planCode: 'PLN_r7uurqe26e0dg2p',
          discount: 17,
        ),
      },
    ),
  ];

  /// Get plan by slug
  static PlanModel? getBySlug(String slug) {
    try {
      return all.firstWhere((plan) => plan.slug == slug);
    } catch (e) {
      return null;
    }
  }

  /// Get all plans (alias for all)
  static List<PlanModel> get allPlans => all;

  /// Get free plan
  static PlanModel get free => all.first;

  /// Get paid plans only
  static List<PlanModel> get paidPlans => all.where((p) => !p.isFree).toList();
}
