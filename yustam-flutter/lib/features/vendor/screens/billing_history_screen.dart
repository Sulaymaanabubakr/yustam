import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../../config/theme.dart';

class BillingHistoryScreen extends ConsumerWidget {
  const BillingHistoryScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // TODO: Fetch from backend
    final payments = [
      {
        'date': DateTime(2024, 11, 1),
        'amount': 5000,
        'status': 'success',
        'plan': 'Pro Plan',
        'reference': 'YUSTAM-V123-ABC123',
      },
      {
        'date': DateTime(2024, 10, 1),
        'amount': 5000,
        'status': 'success',
        'plan': 'Pro Plan',
        'reference': 'YUSTAM-V123-XYZ789',
      },
      {
        'date': DateTime(2024, 9, 1),
        'amount': 2500,
        'status': 'success',
        'plan': 'Starter Plan',
        'reference': 'YUSTAM-V123-DEF456',
      },
    ];

    return Scaffold(
      appBar: AppBar(
        title: const Text('Billing History'),
      ),
      body: payments.isEmpty
          ? Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.receipt_long_outlined, size: 64, color: AppTheme.gray400),
                  const SizedBox(height: 16),
                  Text(
                    'No payment history yet',
                    style: Theme.of(context).textTheme.headlineMedium,
                  ),
                ],
              ),
            )
          : ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: payments.length,
              itemBuilder: (context, index) {
                final payment = payments[index];
                return _buildPaymentCard(context, payment);
              },
            ),
    );
  }

  Widget _buildPaymentCard(BuildContext context, Map<String, dynamic> payment) {
    final date = payment['date'] as DateTime;
    final amount = payment['amount'] as int;
    final status = payment['status'] as String;
    final plan = payment['plan'] as String;
    final reference = payment['reference'] as String;

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  plan,
                  style: const TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 16,
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: status == 'success' ? AppTheme.success.withOpacity(0.1) : AppTheme.error.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    status == 'success' ? 'Paid' : 'Failed',
                    style: TextStyle(
                      color: status == 'success' ? AppTheme.success : AppTheme.error,
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              '₦${amount.toString().replaceAllMapped(RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'), (Match m) => '${m[1]},')}',
              style: const TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.bold,
                color: AppTheme.primaryOrange,
              ),
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                Icon(Icons.calendar_today, size: 14, color: AppTheme.gray600),
                const SizedBox(width: 4),
                Text(
                  DateFormat('MMM dd, yyyy').format(date),
                  style: TextStyle(fontSize: 12, color: AppTheme.gray600),
                ),
                const SizedBox(width: 16),
                Icon(Icons.receipt, size: 14, color: AppTheme.gray600),
                const SizedBox(width: 4),
                Expanded(
                  child: Text(
                    reference,
                    style: TextStyle(fontSize: 12, color: AppTheme.gray600),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                onPressed: () {
                  // TODO: Download/view receipt
                },
                icon: const Icon(Icons.download, size: 16),
                label: const Text('View Receipt'),
                style: OutlinedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 8),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
