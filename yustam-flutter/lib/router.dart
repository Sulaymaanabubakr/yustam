import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'features/auth/screens/login_screen.dart';
import 'features/auth/screens/onboarding_screen.dart';
import 'features/auth/screens/register_screen.dart';
import 'features/auth/screens/splash_screen.dart';
import 'features/buyer/screens/home_screen.dart';
import 'features/buyer/screens/listing_detail_screen.dart';
import 'features/buyer/screens/search_screen.dart';
import 'features/shared/screens/profile_screen.dart';

final routerProvider = Provider<GoRouter>((ref) {
  return GoRouter(
    initialLocation: '/splash',
    routes: [
      // Splash
      GoRoute(
        path: '/splash',
        builder: (context, state) => const SplashScreen(),
      ),

      // Onboarding
      GoRoute(
        path: '/onboarding',
        builder: (context, state) => const OnboardingScreen(),
      ),

      // Auth
      GoRoute(
        path: '/auth',
        builder: (context, state) => const LoginScreen(),
        routes: [
          GoRoute(
            path: 'login',
            builder: (context, state) => const LoginScreen(),
          ),
          GoRoute(
            path: 'register',
            builder: (context, state) => const RegisterScreen(),
          ),
        ],
      ),

      // Buyer Routes
      GoRoute(
        path: '/',
        builder: (context, state) => const BuyerHomeScreen(),
        routes: [
          GoRoute(
            path: 'buyer/search',
            builder: (context, state) => const BuyerSearchScreen(),
          ),
          GoRoute(
            path: 'buyer/listing/:id',
            builder: (context, state) {
              final id = state.pathParameters['id']!;
              return ListingDetailScreen(listingId: id);
            },
          ),
          GoRoute(
            path: 'profile',
            builder: (context, state) => const ProfileScreen(),
          ),
        ],
      ),
    ],
  );
});

// Placeholder for Search Screen since it wasn't in the original list but referenced in Home
class BuyerSearchScreen extends StatelessWidget {
  const BuyerSearchScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Search')),
      body: const Center(child: Text('Search Screen')),
    );
  }
}