// Environment Configuration
// IMPORTANT: Never commit this file with real credentials
// Copy this to lib/config/env.dart and fill in your values

class Environment {
  // Supabase Configuration - Dummy values for testing
  static const String supabaseUrl = 'https://demo-supabase.co';
  static const String supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.demo-key';
  
  // Paystack Configuration - Dummy values for testing
  static const String paystackSecretKey = 'sk_test_demo1234567890';
  static const String paystackPublicKey = 'pk_test_demo1234567890';
  
  // AI Configuration
  static const String geminiApiKey = 'AIzaSyDACYxJFjbQbocAJgzWYnibJrT0NJUHN5M';
  
  // App Configuration
  static const String appName = 'Yustam Marketplace';
  
  // API Base URL
  static String get apiBaseUrl => supabaseUrl;
}