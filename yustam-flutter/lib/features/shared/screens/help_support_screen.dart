import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../config/theme.dart';

class HelpSupportScreen extends ConsumerStatefulWidget {
  const HelpSupportScreen({super.key});

  @override
  ConsumerState<HelpSupportScreen> createState() => _HelpSupportScreenState();
}

class _HelpSupportScreenState extends ConsumerState<HelpSupportScreen> {
  final _messageController = TextEditingController();
  final _emailController = TextEditingController();
  String? _selectedTopic;

  final List<Map<String, dynamic>> _faqs = [
    {
      'question': 'How do I create a listing?',
      'answer': 'Go to your vendor dashboard and tap "Create Listing". Fill in the details, add photos, and publish.',
    },
    {
      'question': 'How do I upgrade my plan?',
      'answer': 'Navigate to Settings > Subscription > Change Plan to view and select a new plan.',
    },
    {
      'question': 'How does payment work?',
      'answer': 'We use Paystack for secure payments. All transactions are encrypted and protected.',
    },
    {
      'question': 'How do I verify my account?',
      'answer': 'Go to Settings > Verification and upload a valid government-issued ID.',
    },
  ];

  final List<String> _topics = [
    'Account Issues',
    'Payment & Billing',
    'Listing Problems',
    'Technical Support',
    'Other',
  ];

  @override
  void dispose() {
    _messageController.dispose();
    _emailController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Help & Support'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Quick Actions
            Row(
              children: [
                Expanded(
                  child: _buildQuickAction(
                    icon: Icons.email_outlined,
                    label: 'Email Us',
                    onTap: () {
                      // TODO: Open email client
                    },
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _buildQuickAction(
                    icon: Icons.phone_outlined,
                    label: 'Call Us',
                    onTap: () {
                      // TODO: Open phone dialer
                    },
                  ),
                ),
              ],
            ),

            const SizedBox(height: 32),

            // FAQs
            const Text(
              'Frequently Asked Questions',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 16),

            ..._faqs.map((faq) => ExpansionTile(
                  title: Text(
                    faq['question'],
                    style: const TextStyle(fontWeight: FontWeight.w600),
                  ),
                  children: [
                    Padding(
                      padding: const EdgeInsets.all(16),
                      child: Text(
                        faq['answer'],
                        style: TextStyle(color: AppTheme.gray700),
                      ),
                    ),
                  ],
                )),

            const SizedBox(height: 32),

            // Contact Form
            const Text(
              'Send us a message',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 16),

            DropdownButtonFormField<String>(
              value: _selectedTopic,
              decoration: const InputDecoration(
                labelText: 'Topic',
                border: OutlineInputBorder(),
              ),
              items: _topics.map((topic) {
                return DropdownMenuItem(
                  value: topic,
                  child: Text(topic),
                );
              }).toList(),
              onChanged: (value) {
                setState(() => _selectedTopic = value);
              },
            ),
            const SizedBox(height: 16),

            TextFormField(
              controller: _emailController,
              decoration: const InputDecoration(
                labelText: 'Your Email',
                border: OutlineInputBorder(),
                prefixIcon: Icon(Icons.email_outlined),
              ),
              keyboardType: TextInputType.emailAddress,
            ),
            const SizedBox(height: 16),

            TextFormField(
              controller: _messageController,
              decoration: const InputDecoration(
                labelText: 'Message',
                border: OutlineInputBorder(),
                alignLabelWithHint: true,
              ),
              maxLines: 5,
            ),
            const SizedBox(height: 16),

            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: () {
                  // TODO: Submit support ticket
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Message sent! We\'ll respond within 24 hours.')),
                  );
                },
                style: ElevatedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 16),
                ),
                child: const Text('Send Message'),
              ),
            ),

            const SizedBox(height: 32),

            // Contact Info
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppTheme.gray100,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Contact Information',
                    style: TextStyle(fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 12),
                  _buildContactRow(Icons.email, 'support@yustam.com.ng'),
                  const SizedBox(height: 8),
                  _buildContactRow(Icons.phone, '+234 XXX XXX XXXX'),
                  const SizedBox(height: 8),
                  _buildContactRow(Icons.access_time, 'Mon-Fri: 9AM - 6PM WAT'),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildQuickAction({
    required IconData icon,
    required String label,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: AppTheme.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: AppTheme.gray200),
        ),
        child: Column(
          children: [
            Icon(icon, size: 32, color: AppTheme.primaryOrange),
            const SizedBox(height: 8),
            Text(
              label,
              style: const TextStyle(fontWeight: FontWeight.w600),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildContactRow(IconData icon, String text) {
    return Row(
      children: [
        Icon(icon, size: 16, color: AppTheme.gray600),
        const SizedBox(width: 8),
        Text(
          text,
          style: TextStyle(fontSize: 14, color: AppTheme.gray700),
        ),
      ],
    );
  }
}
