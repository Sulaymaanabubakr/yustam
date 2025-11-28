import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

// Auth Screens
import '../features/auth/screens/splash_screen.dart';
import '../features/auth/screens/auth_screen.dart';
import '../features/auth/screens/login_screen.dart';
import '../features/auth/screens/register_screen.dart';
import '../features/auth/screens/forgot_password_screen.dart';
import '../features/auth/screens/onboarding_screen.dart';

// Buyer Screens
import '../features/buyer/screens/home_screen.dart';
import '../features/buyer/screens/listing_detail_screen.dart';
import '../features/buyer/screens/search_screen.dart';
import '../features/buyer/screens/vendor_storefront_screen.dart';
import '../features/buyer/screens/saved_screen.dart';
import '../features/buyer/screens/recently_viewed_screen.dart';
import '../features/buyer/screens/flash_sale_screen.dart';
import '../features/buyer/screens/buyer_main_screen.dart';

// Vendor Screens
import '../features/vendor/screens/vendor_dashboard_screen.dart';
import '../features/vendor/screens/create_listing_screen.dart';
import '../features/vendor/screens/vendor_listings_screen.dart';
import '../features/vendor/screens/subscription_screen.dart';
import '../features/vendor/screens/renew_plan_screen.dart';
import '../features/vendor/screens/manage_subscription_screen.dart';
import '../features/vendor/screens/billing_history_screen.dart';
import '../features/vendor/screens/analytics_screen.dart';
import '../features/vendor/screens/verification_screen.dart';
import '../features/vendor/screens/vendor_rewards_screen.dart';
import '../features/shared/screens/ai_assistant_screen.dart';

// Shared Screens
import '../features/shared/screens/chats_list_screen.dart';
import '../features/shared/screens/chat_screen.dart';
import '../features/shared/screens/profile_screen.dart';
import '../features/shared/screens/edit_profile_screen.dart';
import '../features/shared/screens/change_password_screen.dart';
import '../features/shared/screens/delete_account_screen.dart';
import '../features/shared/screens/settings_screen.dart';
import '../features/shared/screens/notifications_screen.dart';
import '../features/shared/screens/help_support_screen.dart';
import '../features/shared/screens/preferences_screen.dart';

// Auth State Provider
import '../core/services/auth_service.dart';

// Router Provider
final routerProvider = Provider<GoRouter>((ref) {
  // For testing with dummy keys, bypass authentication
  final isAuthenticated = false; // Always false for testing

  return GoRouter(
    initialLocation: '/splash',
    redirect: (context, state) {
      final isAuthRoute = state.matchedLocation.startsWith('/auth') || state.matchedLocation == '/onboarding';
      final isSplash = state.matchedLocation == '/splash';

      if (isSplash) return null;
      if (!isAuthenticated && !isAuthRoute) return '/auth';
      if (isAuthenticated && isAuthRoute) return '/';
      return null;
    },
    routes: [
      // Auth
      GoRoute(path: '/splash', builder: (context, state) => const SplashScreen()),
      GoRoute(path: '/onboarding', builder: (context, state) => const OnboardingScreen()),
      GoRoute(
        path: '/auth',
        builder: (context, state) => const AuthScreen(),
        routes: [
          GoRoute(path: 'login', builder: (context, state) => const LoginScreen()),
          GoRoute(path: 'register', builder: (context, state) => const RegisterScreen()),
          GoRoute(path: 'forgot-password', builder: (context, state) => const ForgotPasswordScreen()),
        ],
      ),



      // Buyer
      GoRoute(path: '/', builder: (context, state) => const BuyerMainScreen()),
      GoRoute(path: '/search', builder: (context, state) => const SearchScreen()),
      GoRoute(path: '/saved', builder: (context, state) => const SavedScreen()),
      GoRoute(path: '/recently-viewed', builder: (context, state) => const RecentlyViewedScreen()),
      GoRoute(path: '/flash-sale', builder: (context, state) => const FlashSaleScreen()),
      GoRoute(
        path: '/listing/:id',
        builder: (context, state) => ListingDetailScreen(listingId: state.pathParameters['id']!),
      ),
      GoRoute(
        path: '/store/:id',
        builder: (context, state) => VendorStorefrontScreen(vendorId: state.pathParameters['id']!),
      ),

      // Vendor
      GoRoute(path: '/vendor/dashboard', builder: (context, state) => const VendorDashboardScreen()),
      GoRoute(
        path: '/vendor/create-listing',
        builder: (context, state) {
          final id = state.uri.queryParameters['id'];
          return CreateListingScreen(listingId: id);
        },
      ),
      GoRoute(path: '/vendor/listings', builder: (context, state) => const VendorListingsScreen()),
      GoRoute(path: '/vendor/subscription', builder: (context, state) => const SubscriptionScreen()),
      GoRoute(path: '/vendor/renew-plan', builder: (context, state) => const RenewPlanScreen()),
      GoRoute(path: '/vendor/manage-subscription', builder: (context, state) => const ManageSubscriptionScreen()),
      GoRoute(path: '/vendor/billing-history', builder: (context, state) => const BillingHistoryScreen()),
      GoRoute(path: '/vendor/analytics', builder: (context, state) => const AnalyticsScreen()),
      GoRoute(path: '/vendor/rewards', builder: (context, state) => const VendorRewardsScreen()),
      GoRoute(path: '/vendor/verification', builder: (context, state) => const VerificationScreen()),
      GoRoute(path: '/vendor/ai-assistant', builder: (context, state) => const AiAssistantScreen()), // Keep for backward compat

      // Shared
      GoRoute(path: '/ai-assistant', builder: (context, state) => const AiAssistantScreen()),
      GoRoute(path: '/chats', builder: (context, state) => const ChatsListScreen()),
      GoRoute(path: '/chat/:id', builder: (context, state) => ChatScreen(threadId: state.pathParameters['id']!)),
      GoRoute(path: '/profile', builder: (context, state) => const ProfileScreen()),
      GoRoute(path: '/edit-profile', builder: (context, state) => const EditProfileScreen()),
      GoRoute(path: '/change-password', builder: (context, state) => const ChangePasswordScreen()),
      GoRoute(path: '/delete-account', builder: (context, state) => const DeleteAccountScreen()),
      GoRoute(path: '/settings', builder: (context, state) => const SettingsScreen()),
      GoRoute(path: '/notifications', builder: (context, state) => const NotificationsScreen()),
      GoRoute(path: '/help', builder: (context, state) => const HelpSupportScreen()),
      GoRoute(path: '/preferences', builder: (context, state) => const PreferencesScreen()),
    ],
    errorBuilder: (context, state) => Scaffold(
      body: Center(child: Text('Page not found: ${state.matchedLocation}')),
    ),
  );
});
