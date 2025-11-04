import 'package:flutter/material.dart';

/// YUSTAM App Constants - Colors, Styles, and Configuration
class AppConstants {
  // Brand Colors
  static const Color emerald = Color(0xFF004D40);
  static const Color emeraldDark = Color(0xFF003D34);
  static const Color orange = Color(0xFFF3731E);
  static const Color orangeDeep = Color(0xFFE05E0E);
  static const Color beige = Color(0xFFEADCCF);
  static const Color white = Color(0xFFFFFFFF);
  static const Color ink = Color(0xFF111111);
  static const Color error = Color(0xFFD84315);
  static const Color success = Color(0xFF1B8A5A);
  
  // User Roles
  static const String roleBuyer = 'buyer';
  static const String roleVendor = 'vendor';
  
  // SharedPreferences Keys
  static const String keyIsLoggedIn = 'is_logged_in';
  static const String keyUserRole = 'user_role';
  static const String keyUserId = 'user_id';
  static const String keyUserEmail = 'user_email';
  static const String keyUserName = 'user_name';
  static const String keyUserPhone = 'user_phone';
  static const String keyProfilePhoto = 'profile_photo';
  static const String keyOnboardingComplete = 'onboarding_complete';
  static const String keyFirebaseUid = 'firebase_uid';
  
  // Categories
  static const List<String> categories = [
    'Phones & Tablets',
    'Electronics',
    'Fashion',
    'Property',
    'Food & Groceries',
    'Beauty',
    'Vehicles',
    'Home & Kitchen',
    'Power Solutions',
    'Computing',
    'Services',
    'Others',
  ];
  
  // Vendor Plans
  static const List<String> vendorPlans = [
    'Free',
    'Basic',
    'Premium',
    'Enterprise',
  ];
  
  // App Info
  static const String appName = 'YUSTAM';
  static const String appTagline = 'Nigeria\'s Trusted Marketplace';
  static const String appVersion = '1.0.0';
}
