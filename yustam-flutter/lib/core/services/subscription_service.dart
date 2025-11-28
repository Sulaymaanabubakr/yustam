import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../services/supabase_service.dart';
import '../services/paystack_service.dart';
import '../../shared/models/plan_model.dart';
import '../../shared/models/user_model.dart';

class SubscriptionService {
  final SupabaseService _supabase;
  final PaystackService _paystack;

  SubscriptionService(this._supabase, this._paystack);

  /// Subscribe to a plan
  Future<String> subscribeToPlan({
    required UserModel user,
    required PlanModel plan,
    required int durationMonths,
  }) async {
    final amount = plan.getPriceForDuration(durationMonths);
    final planCode = plan.getPlanCode(durationMonths);
    final reference = 'sub_${user.id}_${DateTime.now().millisecondsSinceEpoch}';

    // Initialize Paystack transaction
    final authUrl = await _paystack.initializeTransaction(
      email: user.email,
      amount: amount.toDouble(),
      reference: reference,
      plan: planCode, // If using Paystack Plans
      metadata: {
        'user_id': user.id,
        'plan_slug': plan.slug,
        'duration_months': durationMonths,
        'custom_fields': [
          {
            'display_name': 'Plan Name',
            'variable_name': 'plan_name',
            'value': plan.name,
          }
        ]
      },
      callbackUrl: 'https://yustam.com.ng/payment/callback', // Deep link to app
    );

    if (authUrl == null) {
      throw Exception('Failed to initialize payment');
    }

    // Create subscription record (pending)
    await _supabase.insertIntoTable('subscription_records', {
      'user_id': user.id,
      'plan_slug': plan.slug,
      'amount': amount,
      'duration_months': durationMonths,
      'reference': reference,
      'status': 'pending',
      'created_at': DateTime.now().toIso8601String(),
    });

    return authUrl;
  }

  /// Verify subscription payment
  Future<bool> verifySubscription(String reference) async {
    final isValid = await _paystack.verifyTransaction(reference);

    if (isValid) {
      // Update subscription record
      await _supabase.updateInTable(
        'subscription_records',
        {'status': 'active', 'paid_at': DateTime.now().toIso8601String()},
        filters: {'reference': reference},
      );

      // Update user plan
      // We need to fetch the record to get user_id and plan_slug
      final records = await _supabase.getFromTable(
        'subscription_records',
        filters: {'reference': reference},
        limit: 1,
      );

      if (records.isNotEmpty) {
        final record = records.first;
        await _supabase.updateInTable(
          'vendors',
          {'plan': record['plan_slug']},
          filters: {'firebase_uid': record['user_id']}, // Assuming user_id matches firebase_uid/vendor_uid
        );
      }
      
      return true;
    } else {
      // Mark as failed
      await _supabase.updateInTable(
        'subscription_records',
        {'status': 'failed'},
        filters: {'reference': reference},
      );
      return false;
    }
  }

  /// Check if user can perform action based on plan
  bool canPerformAction(UserModel user, String action) {
    if (user.role != 'vendor') return true; // Buyers have no limits for now
    
    final plan = SubscriptionPlans.getBySlug(user.plan ?? 'free') ?? SubscriptionPlans.free;

    switch (action) {
      case 'create_listing':
        // Check listing limit
        // We would need to fetch current listing count
        return true; // Placeholder
      case 'ai_chat':
        // Check AI limits
        return true; // Placeholder
      default:
        return true;
    }
  }
}

final subscriptionServiceProvider = Provider<SubscriptionService>((ref) {
  final supabase = SupabaseService();
  final paystack = ref.watch(paystackServiceProvider);
  return SubscriptionService(supabase, paystack);
});
