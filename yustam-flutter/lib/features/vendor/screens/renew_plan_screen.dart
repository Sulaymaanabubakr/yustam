import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../config/theme.dart';
import '../../../core/services/subscription_service.dart';
import '../../../core/services/auth_service.dart';
import '../../../core/services/paystack_service.dart';
import '../../../shared/models/plan_model.dart';

class RenewPlanScreen extends ConsumerStatefulWidget {
  const RenewPlanScreen({super.key});

  @override
  ConsumerState<RenewPlanScreen> createState() => _RenewPlanScreenState();
}

class _RenewPlanScreenState extends ConsumerState<RenewPlanScreen> {
  int _selectedDuration = 1;
  bool _isLoading = false;

  @override
  Widget build(BuildContext context) {
    final currentUser = ref.watch(currentUserProvider).value;
    if (currentUser == null) {
      return const Scaffold(body: Center(child: Text('Please log in')));
    }

    final currentPlan = SubscriptionPlans.getBySlug(currentUser.plan ?? 'free') ?? SubscriptionPlans.free;
    final durationOptions = [1, 3, 6, 12];

    return Scaffold(
      appBar: AppBar(
        title: const Text('Renew Plan'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Current Plan Card
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: AppTheme.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppTheme.gray200),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Current Plan',
                    style: TextStyle(
                      fontSize: 12,
                      color: AppTheme.gray600,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    currentPlan.name,
                    style: const TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    '₦${currentPlan.monthlyPrice.toStringAsFixed(0)}/month',
                    style: const TextStyle(
                      fontSize: 18,
                      color: AppTheme.primaryOrange,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      const Icon(Icons.access_time, size: 16, color: AppTheme.gray600),
                      const SizedBox(width: 8),
                      Text(
                        'Expires: Dec 31, 2024', // TODO: Get from backend
                        style: TextStyle(color: AppTheme.gray600),
                      ),
                    ],
                  ),
                ],
              ),
            ),

            const SizedBox(height: 32),

            // Renewal Options
            const Text(
              'Renewal Options',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 16),

            ...durationOptions.map((months) {
              final isSelected = _selectedDuration == months;
              final totalPrice = currentPlan.getPriceForDuration(months);
              final discount = months > 1 ? ((1 - (totalPrice / (currentPlan.monthlyPrice * months))) * 100).round() : 0;

              return GestureDetector(
                onTap: () => setState(() => _selectedDuration = months),
                child: Container(
                  margin: const EdgeInsets.only(bottom: 12),
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: isSelected ? AppTheme.primaryOrange.withOpacity(0.1) : AppTheme.white,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: isSelected ? AppTheme.primaryOrange : AppTheme.gray300,
                      width: isSelected ? 2 : 1,
                    ),
                  ),
                  child: Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              _getDurationLabel(months),
                              style: TextStyle(
                                fontWeight: FontWeight.bold,
                                color: isSelected ? AppTheme.primaryOrange : AppTheme.gray900,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              '₦${totalPrice.toStringAsFixed(0)} total',
                              style: TextStyle(
                                color: isSelected ? AppTheme.primaryOrange : AppTheme.gray600,
                              ),
                            ),
                          ],
                        ),
                      ),
                      if (discount > 0)
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: AppTheme.success.withOpacity(0.1),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Text(
                            'Save $discount%',
                            style: const TextStyle(
                              color: AppTheme.success,
                              fontSize: 12,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                      if (isSelected)
                        const Icon(Icons.check_circle, color: AppTheme.primaryOrange),
                    ],
                  ),
                ),
              );
            }).toList(),

            const SizedBox(height: 32),

            // Benefits
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: AppTheme.primaryEmerald.withOpacity(0.05),
                borderRadius: BorderRadius.circular(16),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Renewal Benefits',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 12),
                  _buildBenefit('Keep your listings visible without interruptions'),
                  _buildBenefit('Maintain your current ranking and insights'),
                  _buildBenefit('Instant confirmation once payment is successful'),
                ],
              ),
            ),

            const SizedBox(height: 32),

            // Renew Button
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _isLoading ? null : _handleRenew,
                style: ElevatedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 16),
                ),
                child: _isLoading
                    ? const SizedBox(
                        height: 20,
                        width: 20,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Text('Proceed to Renew'),
              ),
            ),

            const SizedBox(height: 16),

            // Support
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppTheme.primaryOrange.withOpacity(0.05),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Row(
                children: [
                  const Icon(Icons.help_outline, color: AppTheme.primaryOrange),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      'Need help with payment? Email support@yustam.com.ng',
                      style: TextStyle(fontSize: 12, color: AppTheme.gray700),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _getDurationLabel(int months) {
    switch (months) {
      case 1:
        return 'Monthly';
      case 3:
        return 'Quarterly';
      case 6:
        return 'Biannual';
      case 12:
        return 'Annual';
      default:
        return '$months Months';
    }
  }

  Widget _buildBenefit(String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        children: [
          const Icon(Icons.check_circle, size: 18, color: AppTheme.primaryEmerald),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              text,
              style: const TextStyle(fontSize: 14),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _handleRenew() async {
    final currentUser = ref.read(currentUserProvider).value;
    if (currentUser == null) return;

    final currentPlan = SubscriptionPlans.getBySlug(currentUser.plan ?? 'free') ?? SubscriptionPlans.free;

    setState(() => _isLoading = true);

    try {
      final service = ref.read(subscriptionServiceProvider);
      final paystack = ref.read(paystackServiceProvider);

      final authUrl = await service.subscribeToPlan(
        user: currentUser,
        plan: currentPlan,
        durationMonths: _selectedDuration,
      );

      await paystack.launchCheckout(authUrl);

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Payment initiated. Please complete in browser.')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e')),
        );
      }
    } finally {
      setState(() => _isLoading = false);
    }
  }
}
