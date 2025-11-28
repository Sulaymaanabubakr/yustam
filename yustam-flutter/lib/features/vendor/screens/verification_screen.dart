import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';
import '../../../config/theme.dart';

class VerificationScreen extends ConsumerStatefulWidget {
  const VerificationScreen({super.key});

  @override
  ConsumerState<VerificationScreen> createState() => _VerificationScreenState();
}

class _VerificationScreenState extends ConsumerState<VerificationScreen> {
  String? _selectedIdType;
  String? _idImagePath;
  bool _isLoading = false;

  Future<void> _pickImage() async {
    final picker = ImagePicker();
    final image = await picker.pickImage(source: ImageSource.gallery);
    if (image != null) {
      setState(() {
        _idImagePath = image.path;
      });
    }
  }

  Future<void> _submitVerification() async {
    if (_selectedIdType == null || _idImagePath == null) return;

    setState(() {
      _isLoading = true;
    });

    // Simulate API call
    await Future.delayed(const Duration(seconds: 2));

    setState(() {
      _isLoading = false;
    });

    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Verification submitted successfully')),
      );
      Navigator.pop(context);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Get Verified'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppTheme.primaryOrange.withOpacity(0.1),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Row(
                children: [
                  const Icon(Icons.verified_user, color: AppTheme.primaryOrange),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      'Verified vendors get 3x more views and sales. Upload your ID to get verified.',
                      style: Theme.of(context).textTheme.bodyMedium,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 32),
            DropdownButtonFormField<String>(
              value: _selectedIdType,
              decoration: const InputDecoration(
                labelText: 'Select ID Type',
                border: OutlineInputBorder(),
              ),
              items: const [
                DropdownMenuItem(value: 'nin', child: Text('NIN Slip')),
                DropdownMenuItem(value: 'passport', child: Text('International Passport')),
                DropdownMenuItem(value: 'drivers_license', child: Text('Driver\'s License')),
                DropdownMenuItem(value: 'voters_card', child: Text('Voter\'s Card')),
              ],
              onChanged: (value) {
                setState(() {
                  _selectedIdType = value;
                });
              },
            ),
            const SizedBox(height: 24),
            InkWell(
              onTap: _pickImage,
              child: Container(
                height: 200,
                width: double.infinity,
                decoration: BoxDecoration(
                  border: Border.all(color: AppTheme.gray300),
                  borderRadius: BorderRadius.circular(12),
                  color: AppTheme.gray100,
                ),
                child: _idImagePath != null
                    ? ClipRRect(
                        borderRadius: BorderRadius.circular(12),
                        child: Image.network(
                          _idImagePath!, // In real app use FileImage
                          fit: BoxFit.cover,
                          errorBuilder: (c, e, s) => const Icon(Icons.image),
                        ),
                      )
                    : Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.cloud_upload_outlined, size: 48, color: AppTheme.gray400),
                          const SizedBox(height: 8),
                          Text(
                            'Tap to upload ID document',
                            style: TextStyle(color: AppTheme.gray600),
                          ),
                        ],
                      ),
              ),
            ),
            const SizedBox(height: 32),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _isLoading || _selectedIdType == null || _idImagePath == null
                    ? null
                    : _submitVerification,
                child: _isLoading
                    ? const CircularProgressIndicator()
                    : const Text('Submit for Verification'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
