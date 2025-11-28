import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../config/theme.dart';
import '../../../shared/models/plan_model.dart';
import '../../../core/services/subscription_service.dart';
import '../../../core/services/paystack_service.dart';
import '../../../core/services/auth_service.dart';

class SubscriptionScreen extends ConsumerStatefulWidget {
  const SubscriptionScreen({super.key});

  @override
  ConsumerState<SubscriptionScreen> createState() => _SubscriptionScreenState();
}

class _SubscriptionScreenState extends ConsumerState<SubscriptionScreen> {
  int _selectedDuration = 1; // 1, 3, 6, 12 months
  bool _isLoading = false;

  final List<int> _durations = [1, 3, 6, 12];

  String _getDurationLabel(int months) {
    switch (months) {
      case 1:
        return 'Monthly';
      case 3:
        return 'Quarterly (7% off)';
      case 6:
        return 'Biannual (12% off)';
      case 12:
        return 'Annual (17% off)';
      default:
        return '$months Months';
    }
  }

  Future<void> _subscribe(PlanModel plan) async {
    final currentUser = ref.read(currentUserProvider).value;
    if (currentUser == null) return;

    setState(() {
      _isLoading = true;
    });

    try {
      final service = ref.read(subscriptionServiceProvider);
      final paystack = ref.read(paystackServiceProvider);

      final authUrl = await service.subscribeToPlan(
        user: currentUser,
        plan: plan,
        durationMonths: _selectedDuration,
      );

      // Launch Paystack checkout
      await paystack.launchCheckout(authUrl);

      // In a real app, we would listen for deep links or poll for status
      // For now, we just show a message
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Payment initiated. Please complete in browser.'),
            duration: Duration(seconds: 5),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e')),
        );
      }
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final currentUser = ref.watch(currentUserProvider).value;
    final currentPlanSlug = currentUser?.plan ?? 'free';

    return Scaffold(
      appBar: AppBar(
        title: const Text('Subscription Plans'),
      ),
      body: Column(
        children: [
          // Duration Selector
          Container(
            padding: const EdgeInsets.all(16),
            color: AppTheme.gray100,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Billing Cycle',
                  style: Theme.of(context).textTheme.labelLarge,
                ),
                const SizedBox(height: 8),
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: _durations.map((duration) {
                      final isSelected = _selectedDuration == duration;
                      return Padding(
                        padding: const EdgeInsets.only(right: 8),
                        child: ChoiceChip(
                          label: Text(_getDurationLabel(duration)),
                          selected: isSelected,
                          onSelected: (selected) {
                            if (selected) {
                              setState(() {
                                _selectedDuration = duration;
                              });
                            }
                          },
                          selectedColor: AppTheme.primaryOrange.withOpacity(0.2),
                          labelStyle: TextStyle(
                            color: isSelected ? AppTheme.primaryOrange : AppTheme.gray700,
                            fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                          ),
                        ),
                      );
                    }).toList(),
                  ),
                ),
              ],
            ),
          ),

          // Plans List
          Expanded(
            child: ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: SubscriptionPlans.allPlans.length,
              itemBuilder: (context, index) {
                final plan = SubscriptionPlans.allPlans[index];
                final isCurrent = plan.slug == currentPlanSlug;
                final price = plan.getPriceForDuration(_selectedDuration);

                return Card(
                  margin: const EdgeInsets.only(bottom: 16),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(16),
                    side: isCurrent
                        ? const BorderSide(color: AppTheme.primaryOrange, width: 2)
                        : BorderSide.none,
                  ),
                  child: Padding(
                    padding: const EdgeInsets.all(20),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  plan.name,
                                  style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                                        color: isCurrent ? AppTheme.primaryOrange : null,
                                        fontWeight: FontWeight.bold,
                                      ),
                                ),
                                if (isCurrent)
                                  Container(
                                    margin: const EdgeInsets.only(top: 4),
                                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                    decoration: BoxDecoration(
                                      color: AppTheme.primaryOrange.withOpacity(0.1),
                                      borderRadius: BorderRadius.circular(4),
                                    ),
                                    child: const Text(
                                      'Current Plan',
                                      style: TextStyle(
                                        fontSize: 10,
                                        color: AppTheme.primaryOrange,
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                  ),
                              ],
                            ),
                            Text(
                              '₦${price.toString().replaceAllMapped(RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'), (Match m) => '${m[1]},')}',
                              style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                                    fontWeight: FontWeight.bold,
                                  ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 16),
                        const Divider(),
                        const SizedBox(height: 16),
                        _buildFeatureRow(Icons.inventory_2_outlined, '${plan.maxListings} Listings'),
                        const SizedBox(height: 8),
                        _buildFeatureRow(Icons.auto_awesome, '${plan.aiPromptsPerDay == -1 ? 'Unlimited' : plan.aiPromptsPerDay} AI Prompts/Day'),
                        const SizedBox(height: 8),
                        _buildFeatureRow(Icons.star_outline, plan.features.first), // Just showing first feature for brevity
                        const SizedBox(height: 24),
                        SizedBox(
                          width: double.infinity,
                          child: ElevatedButton(
                            onPressed: isCurrent || _isLoading
                                ? null
                                : () => _subscribe(plan),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: isCurrent ? AppTheme.gray300 : AppTheme.primaryOrange,
                              foregroundColor: isCurrent ? AppTheme.gray600 : AppTheme.white,
                              padding: const EdgeInsets.symmetric(vertical: 16),
                            ),
                            child: _isLoading && !isCurrent
                                ? const SizedBox(
                                    height: 20,
                                    width: 20,
                                    child: CircularProgressIndicator(strokeWidth: 2),
                                  )
                                : Text(isCurrent ? 'Active' : 'Upgrade'),
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFeatureRow(IconData icon, String text) {
    return Row(
      children: [
        Icon(icon, size: 20, color: AppTheme.gray600),
        const SizedBox(width: 12),
        Text(
          text,
          style: const TextStyle(fontSize: 14),
        ),
      ],
    );
  }
}
