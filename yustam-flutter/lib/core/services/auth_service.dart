import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../services/supabase_service.dart';
import '../../shared/models/user_model.dart';

/// Authentication Service
/// Handles all authentication-related operations
class AuthService {
  final SupabaseService _supabase;

  AuthService(this._supabase);

  /// Get current user
  User? get currentUser => _supabase.currentUser;

  /// Check if authenticated
  bool get isAuthenticated => _supabase.isAuthenticated;

  /// Auth state stream
  Stream<AuthState> get authStateChanges => _supabase.authStateChanges;

  // ============================================================================
  // Sign Up
  // ============================================================================

  /// Register new user (buyer or vendor)
  Future<UserModel> registerUser({
    required String email,
    required String password,
    required String name,
    required String role, // 'buyer' or 'vendor'
    String? phone,
    String? businessName,
  }) async {
    try {
      // Sign up with Supabase Auth
      final authResponse = await _supabase.signUpWithEmail(
        email: email,
        password: password,
        metadata: {
          'name': name,
          'role': role,
          'phone': phone,
        },
      );

      if (authResponse.user == null) {
        throw Exception('Failed to create user account');
      }

      final firebaseUid = authResponse.user!.id;

      // Create user record in appropriate table
      if (role == 'vendor') {
        final vendorData = await _supabase.insertIntoTable('vendors', {
          'firebase_uid': firebaseUid,
          'email': email.toLowerCase(),
          'full_name': name,
          'business_name': businessName ?? name,
          'phone': phone,
          'plan': 'free',
          'verification_status': 'unverified',
        });

        return UserModel.fromJson({
          ...vendorData,
          'role': 'vendor',
        });
      } else {
        final buyerData = await _supabase.insertIntoTable('buyers', {
          'firebase_uid': firebaseUid,
          'email': email.toLowerCase(),
          'name': name,
          'phone': phone,
        });

        return UserModel.fromJson({
          ...buyerData,
          'role': 'buyer',
        });
      }
    } catch (e) {
      throw Exception('Registration failed: ${e.toString()}');
    }
  }

  // ============================================================================
  // Sign In
  // ============================================================================

  /// Sign in with email and password
  Future<UserModel> signInWithEmail({
    required String email,
    required String password,
  }) async {
    try {
      final authResponse = await _supabase.signInWithEmail(
        email: email,
        password: password,
      );

      if (authResponse.user == null) {
        throw Exception('Invalid credentials');
      }

      // Fetch user data from database
      return await _fetchUserData(authResponse.user!.id);
    } catch (e) {
      throw Exception('Sign in failed: ${e.toString()}');
    }
  }

  /// Sign in with Google
  Future<UserModel?> signInWithGoogle() async {
    try {
      final success = await _supabase.signInWithGoogle();
      if (!success) return null;

      // Wait for auth state to update
      await Future.delayed(const Duration(seconds: 1));

      if (_supabase.currentUser != null) {
        return await _fetchUserData(_supabase.currentUser!.id);
      }

      return null;
    } catch (e) {
      throw Exception('Google sign in failed: ${e.toString()}');
    }
  }

  // ============================================================================
  // Sign Out
  // ============================================================================

  /// Sign out current user
  Future<void> signOut() async {
    await _supabase.signOut();
  }

  // ============================================================================
  // Password Reset
  // ============================================================================

  /// Send password reset email
  Future<void> resetPassword(String email) async {
    await _supabase.resetPassword(email);
  }

  // ============================================================================
  // User Data
  // ============================================================================

  /// Fetch user data from database
  Future<UserModel> _fetchUserData(String firebaseUid) async {
    // Try to find in vendors table
    final vendors = await _supabase.getFromTable(
      'vendors',
      filters: {'firebase_uid': firebaseUid},
      limit: 1,
    );

    if (vendors.isNotEmpty) {
      return UserModel.fromJson({
        ...vendors.first,
        'role': 'vendor',
      });
    }

    // Try to find in buyers table
    final buyers = await _supabase.getFromTable(
      'buyers',
      filters: {'firebase_uid': firebaseUid},
      limit: 1,
    );

    if (buyers.isNotEmpty) {
      return UserModel.fromJson({
        ...buyers.first,
        'role': 'buyer',
      });
    }

    // Try to find in admins table
    final admins = await _supabase.getFromTable(
      'admins',
      filters: {'firebase_uid': firebaseUid},
      limit: 1,
    );

    if (admins.isNotEmpty) {
      return UserModel.fromJson({
        ...admins.first,
        'role': 'admin',
      });
    }

    throw Exception('User data not found');
  }

  /// Get current user data
  Future<UserModel?> getCurrentUserData() async {
    if (!isAuthenticated) return null;
    return await _fetchUserData(currentUser!.id);
  }

  /// Update user profile
  Future<UserModel> updateProfile({
    required String userId,
    required Map<String, dynamic> data,
  }) async {
    if (!isAuthenticated) {
      throw Exception('User not authenticated');
    }

    // Fetch current user to determine role
    final userData = await _fetchUserData(currentUser!.id);

    final tableName = userData.role == 'vendor' ? 'vendors' : 'buyers';

    final updated = await _supabase.updateInTable(
      tableName,
      data,
      filters: {'id': userId},
    );

    return UserModel.fromJson({
      ...updated,
      'role': userData.role,
    });
  }
}

// ============================================================================
// Riverpod Providers
// ============================================================================

/// Supabase service provider
final supabaseServiceProvider = Provider<SupabaseService>((ref) {
  return SupabaseService();
});

/// Auth service provider
final authServiceProvider = Provider<AuthService>((ref) {
  final supabase = ref.watch(supabaseServiceProvider);
  return AuthService(supabase);
});

/// Current user provider
final currentUserProvider = StreamProvider<UserModel?>((ref) async* {
  final authService = ref.watch(authServiceProvider);

  await for (final authState in authService.authStateChanges) {
    if (authState.session != null) {
      try {
        final user = await authService.getCurrentUserData();
        yield user;
      } catch (e) {
        yield null;
      }
    } else {
      yield null;
    }
  }
});

/// Auth state provider (simple boolean)
final authStateProvider = StreamProvider<bool>((ref) async* {
  final authService = ref.watch(authServiceProvider);

  await for (final authState in authService.authStateChanges) {
    yield authState.session != null;
  }
});
