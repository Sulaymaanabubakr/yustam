import 'package:shared_preferences/shared_preferences.dart';
import '../utils/constants.dart';

/// Local Storage Service using SharedPreferences
class StorageService {
  static SharedPreferences? _prefs;
  
  /// Initialize SharedPreferences
  static Future<void> initialize() async {
    _prefs = await SharedPreferences.getInstance();
  }
  
  /// Get SharedPreferences instance
  static SharedPreferences get prefs {
    if (_prefs == null) {
      throw Exception('StorageService not initialized. Call initialize() first.');
    }
    return _prefs!;
  }
  
  // Authentication state
  static Future<void> setLoggedIn(bool value) async {
    await prefs.setBool(AppConstants.keyIsLoggedIn, value);
  }
  
  static bool isLoggedIn() {
    return prefs.getBool(AppConstants.keyIsLoggedIn) ?? false;
  }
  
  // User role
  static Future<void> setUserRole(String role) async {
    await prefs.setString(AppConstants.keyUserRole, role);
  }
  
  static String? getUserRole() {
    return prefs.getString(AppConstants.keyUserRole);
  }
  
  // User ID
  static Future<void> setUserId(String id) async {
    await prefs.setString(AppConstants.keyUserId, id);
  }
  
  static String? getUserId() {
    return prefs.getString(AppConstants.keyUserId);
  }
  
  // Firebase UID
  static Future<void> setFirebaseUid(String uid) async {
    await prefs.setString(AppConstants.keyFirebaseUid, uid);
  }
  
  static String? getFirebaseUid() {
    return prefs.getString(AppConstants.keyFirebaseUid);
  }
  
  // User email
  static Future<void> setUserEmail(String email) async {
    await prefs.setString(AppConstants.keyUserEmail, email);
  }
  
  static String? getUserEmail() {
    return prefs.getString(AppConstants.keyUserEmail);
  }
  
  // User name
  static Future<void> setUserName(String name) async {
    await prefs.setString(AppConstants.keyUserName, name);
  }
  
  static String? getUserName() {
    return prefs.getString(AppConstants.keyUserName);
  }
  
  // User phone
  static Future<void> setUserPhone(String phone) async {
    await prefs.setString(AppConstants.keyUserPhone, phone);
  }
  
  static String? getUserPhone() {
    return prefs.getString(AppConstants.keyUserPhone);
  }
  
  // Profile photo
  static Future<void> setProfilePhoto(String url) async {
    await prefs.setString(AppConstants.keyProfilePhoto, url);
  }
  
  static String? getProfilePhoto() {
    return prefs.getString(AppConstants.keyProfilePhoto);
  }
  
  // Onboarding completion
  static Future<void> setOnboardingComplete(bool value) async {
    await prefs.setBool(AppConstants.keyOnboardingComplete, value);
  }
  
  static bool isOnboardingComplete() {
    return prefs.getBool(AppConstants.keyOnboardingComplete) ?? false;
  }
  
  /// Clear all stored data (logout)
  static Future<void> clearAll() async {
    await prefs.clear();
  }
  
  /// Clear authentication data
  static Future<void> clearAuthData() async {
    await Future.wait([
      prefs.remove(AppConstants.keyIsLoggedIn),
      prefs.remove(AppConstants.keyUserRole),
      prefs.remove(AppConstants.keyUserId),
      prefs.remove(AppConstants.keyFirebaseUid),
      prefs.remove(AppConstants.keyUserEmail),
      prefs.remove(AppConstants.keyUserName),
      prefs.remove(AppConstants.keyUserPhone),
      prefs.remove(AppConstants.keyProfilePhoto),
    ]);
  }
}
