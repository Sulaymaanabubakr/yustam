import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'utils/app_theme.dart';
import 'services/firebase_service.dart';
import 'services/storage_service.dart';
import 'screens/splash/splash_screen.dart';
import 'screens/onboarding/onboarding_screen.dart';
import 'screens/auth/auth_screen.dart';
import 'screens/buyer/buyer_home_screen.dart';
import 'screens/vendor/vendor_home_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Set system UI overlay style
  SystemChrome.setSystemUIOverlayStyle(
    SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: Brightness.dark,
    ),
  );
  
  // Initialize services
  await StorageService.initialize();
  
  try {
    await FirebaseService.initialize();
  } catch (e) {
    print('Firebase initialization error: $e');
  }
  
  runApp(const YustamApp());
}

class YustamApp extends StatelessWidget {
  const YustamApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'YUSTAM Marketplace',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme,
      initialRoute: '/',
      routes: {
        '/': (context) => const SplashScreen(),
        '/onboarding': (context) => const OnboardingScreen(),
        '/auth': (context) => const AuthScreen(),
        '/buyer-home': (context) => const BuyerHomeScreen(),
        '/vendor-home': (context) => const VendorHomeScreen(),
      },
    );
  }
}
