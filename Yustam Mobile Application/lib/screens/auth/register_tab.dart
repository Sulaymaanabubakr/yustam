import 'package:flutter/material.dart';
import 'package:firebase_auth/firebase_auth.dart';
import '../../utils/constants.dart';
import '../../services/firebase_service.dart';
import '../../services/storage_service.dart';

/// Register Tab with all necessary fields
class RegisterTab extends StatefulWidget {
  final bool isVendor;
  
  const RegisterTab({super.key, required this.isVendor});

  @override
  State<RegisterTab> createState() => _RegisterTabState();
}

class _RegisterTabState extends State<RegisterTab> {
  final _formKey = GlobalKey<FormState>();
  
  // Common fields
  final _nameController = TextEditingController();
  final _emailController = TextEditingController();
  final _phoneController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();
  
  // Vendor-specific fields
  final _businessNameController = TextEditingController();
  final _businessDescriptionController = TextEditingController();
  final _addressController = TextEditingController();
  String? _selectedCategory;
  String? _selectedPlan;
  
  bool _agreeToTerms = false;
  bool _isLoading = false;
  String? _errorMessage;
  bool _passwordValid = false;
  bool _passwordsMatch = false;

  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    _phoneController.dispose();
    _passwordController.dispose();
    _confirmPasswordController.dispose();
    _businessNameController.dispose();
    _businessDescriptionController.dispose();
    _addressController.dispose();
    super.dispose();
  }

  void _validatePassword() {
    setState(() {
      _passwordValid = _passwordController.text.length >= 6;
      _passwordsMatch = _passwordController.text == _confirmPasswordController.text;
    });
  }

  Future<void> _handleRegister() async {
    if (!_formKey.currentState!.validate()) {
      return;
    }

    if (!_agreeToTerms) {
      setState(() {
        _errorMessage = 'Please agree to the terms and conditions';
      });
      return;
    }

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      // Create Firebase Auth account
      final userCredential = await FirebaseService.registerWithEmailPassword(
        _emailController.text.trim(),
        _passwordController.text,
      );

      // Create user document in Firestore
      await _createUserDocument(userCredential.user!);

      // Save user data locally
      await _saveUserData(userCredential.user!);

      // Navigate to appropriate dashboard
      if (mounted) {
        _navigateToDashboard();
      }
    } on FirebaseAuthException catch (e) {
      setState(() {
        _errorMessage = _getErrorMessage(e.code);
      });
    } catch (e) {
      setState(() {
        _errorMessage = 'Registration failed. Please try again.';
      });
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  Future<void> _createUserDocument(User user) async {
    final userData = {
      'uid': user.uid,
      'email': _emailController.text.trim(),
      'name': _nameController.text.trim(),
      'phone': _phoneController.text.trim(),
      'role': widget.isVendor ? AppConstants.roleVendor : AppConstants.roleBuyer,
      'createdAt': DateTime.now().toIso8601String(),
    };

    if (widget.isVendor) {
      // Add vendor-specific fields
      userData['businessName'] = _businessNameController.text.trim();
      userData['category'] = _selectedCategory ?? '';
      userData['description'] = _businessDescriptionController.text.trim();
      userData['address'] = _addressController.text.trim();
      userData['plan'] = _selectedPlan ?? 'Free';
      userData['verified'] = false;
      userData['activeListings'] = 0;
      
      await FirebaseService.vendorsCollection.doc(user.uid).set(userData);
    } else {
      await FirebaseService.usersCollection.doc(user.uid).set(userData);
    }
  }

  Future<void> _saveUserData(User user) async {
    await StorageService.setLoggedIn(true);
    await StorageService.setFirebaseUid(user.uid);
    await StorageService.setUserEmail(user.email ?? '');
    await StorageService.setUserName(_nameController.text.trim());
    await StorageService.setUserPhone(_phoneController.text.trim());
  }

  void _navigateToDashboard() {
    final role = StorageService.getUserRole() ?? AppConstants.roleBuyer;
    
    if (role == AppConstants.roleBuyer) {
      Navigator.of(context).pushReplacementNamed('/buyer-home');
    } else {
      Navigator.of(context).pushReplacementNamed('/vendor-home');
    }
  }

  String _getErrorMessage(String code) {
    switch (code) {
      case 'email-already-in-use':
        return 'An account already exists with this email.';
      case 'invalid-email':
        return 'Invalid email address.';
      case 'weak-password':
        return 'Password is too weak. Use at least 6 characters.';
      default:
        return 'Registration failed. Please try again.';
    }
  }

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Form(
        key: _formKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const SizedBox(height: 16),
            
            // Full Name / Business Name
            TextFormField(
              controller: _nameController,
              decoration: InputDecoration(
                labelText: widget.isVendor ? 'Full Name' : 'Full Name',
                hintText: 'Adaeze Okafor',
                prefixIcon: Icon(Icons.person_outlined),
              ),
              validator: (value) {
                if (value == null || value.isEmpty) {
                  return 'Please enter your name';
                }
                return null;
              },
            ),
            const SizedBox(height: 16),
            
            // Email
            TextFormField(
              controller: _emailController,
              keyboardType: TextInputType.emailAddress,
              decoration: InputDecoration(
                labelText: 'Email Address',
                hintText: 'adaeze@yustam.com',
                prefixIcon: Icon(Icons.email_outlined),
              ),
              validator: (value) {
                if (value == null || value.isEmpty) {
                  return 'Please enter your email';
                }
                if (!value.contains('@')) {
                  return 'Please enter a valid email';
                }
                return null;
              },
            ),
            const SizedBox(height: 16),
            
            // Phone
            TextFormField(
              controller: _phoneController,
              keyboardType: TextInputType.phone,
              decoration: InputDecoration(
                labelText: 'Phone Number',
                hintText: '0801 234 5678',
                prefixIcon: Icon(Icons.phone_outlined),
              ),
              validator: (value) {
                if (value == null || value.isEmpty) {
                  return 'Please enter your phone number';
                }
                return null;
              },
            ),
            const SizedBox(height: 16),
            
            // Password
            TextFormField(
              controller: _passwordController,
              obscureText: true,
              decoration: InputDecoration(
                labelText: 'Password',
                hintText: 'Create a secure password',
                prefixIcon: Icon(Icons.lock_outlined),
              ),
              onChanged: (_) => _validatePassword(),
              validator: (value) {
                if (value == null || value.isEmpty) {
                  return 'Please enter a password';
                }
                if (value.length < 6) {
                  return 'Password must be at least 6 characters';
                }
                return null;
              },
            ),
            const SizedBox(height: 16),
            
            // Confirm Password
            TextFormField(
              controller: _confirmPasswordController,
              obscureText: true,
              decoration: InputDecoration(
                labelText: 'Confirm Password',
                hintText: 'Re-enter your password',
                prefixIcon: Icon(Icons.lock_outlined),
              ),
              onChanged: (_) => _validatePassword(),
              validator: (value) {
                if (value == null || value.isEmpty) {
                  return 'Please confirm your password';
                }
                if (value != _passwordController.text) {
                  return 'Passwords do not match';
                }
                return null;
              },
            ),
            const SizedBox(height: 16),
            
            // Password validation indicators
            _buildPasswordTips(),
            const SizedBox(height: 16),
            
            // Vendor-specific fields
            if (widget.isVendor) ...[
              TextFormField(
                controller: _businessNameController,
                decoration: InputDecoration(
                  labelText: 'Business Name',
                  hintText: 'Lagoon Tech Hub',
                  prefixIcon: Icon(Icons.business_outlined),
                ),
                validator: (value) {
                  if (value == null || value.isEmpty) {
                    return 'Please enter your business name';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 16),
              
              DropdownButtonFormField<String>(
                value: _selectedCategory,
                decoration: InputDecoration(
                  labelText: 'Main Category',
                  prefixIcon: Icon(Icons.category_outlined),
                ),
                items: AppConstants.categories.map((category) {
                  return DropdownMenuItem(
                    value: category,
                    child: Text(category),
                  );
                }).toList(),
                onChanged: (value) {
                  setState(() {
                    _selectedCategory = value;
                  });
                },
                validator: (value) {
                  if (value == null) {
                    return 'Please select a category';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 16),
              
              TextFormField(
                controller: _businessDescriptionController,
                maxLines: 3,
                decoration: InputDecoration(
                  labelText: 'Business Description (Optional)',
                  hintText: 'Tell us about your business',
                  prefixIcon: Icon(Icons.description_outlined),
                  alignLabelWithHint: true,
                ),
              ),
              const SizedBox(height: 16),
              
              TextFormField(
                controller: _addressController,
                decoration: InputDecoration(
                  labelText: 'Business Address (Optional)',
                  hintText: 'Lagos, Nigeria',
                  prefixIcon: Icon(Icons.location_on_outlined),
                ),
              ),
              const SizedBox(height: 16),
              
              DropdownButtonFormField<String>(
                value: _selectedPlan,
                decoration: InputDecoration(
                  labelText: 'Select Plan',
                  prefixIcon: Icon(Icons.card_membership_outlined),
                ),
                items: AppConstants.vendorPlans.map((plan) {
                  return DropdownMenuItem(
                    value: plan,
                    child: Text('$plan Plan'),
                  );
                }).toList(),
                onChanged: (value) {
                  setState(() {
                    _selectedPlan = value;
                  });
                },
              ),
              const SizedBox(height: 16),
            ],
            
            // Terms and conditions
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Checkbox(
                  value: _agreeToTerms,
                  onChanged: (value) {
                    setState(() {
                      _agreeToTerms = value ?? false;
                    });
                  },
                  activeColor: AppConstants.orange,
                ),
                Expanded(
                  child: Padding(
                    padding: const EdgeInsets.only(top: 12),
                    child: GestureDetector(
                      onTap: () {
                        setState(() {
                          _agreeToTerms = !_agreeToTerms;
                        });
                      },
                      child: Text(
                        'I agree to YUSTAM\'s Marketplace Policies & Privacy Policy',
                        style: TextStyle(
                          fontSize: 13,
                          color: AppConstants.ink.withOpacity(0.7),
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            
            // Error message
            if (_errorMessage != null)
              Container(
                padding: const EdgeInsets.all(12),
                margin: const EdgeInsets.only(bottom: 16),
                decoration: BoxDecoration(
                  color: AppConstants.error.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  _errorMessage!,
                  style: TextStyle(
                    color: AppConstants.error,
                    fontSize: 14,
                  ),
                  textAlign: TextAlign.center,
                ),
              ),
            
            // Register button
            SizedBox(
              height: 52,
              child: ElevatedButton(
                onPressed: _isLoading ? null : _handleRegister,
                child: _isLoading
                    ? SizedBox(
                        height: 20,
                        width: 20,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                        ),
                      )
                    : Text('Create Account'),
              ),
            ),
            const SizedBox(height: 32),
          ],
        ),
      ),
    );
  }

  Widget _buildPasswordTips() {
    return Column(
      children: [
        _buildPasswordTip(
          'Must be at least 6 characters',
          _passwordValid,
        ),
        const SizedBox(height: 8),
        _buildPasswordTip(
          'Passwords must match exactly',
          _passwordsMatch && _confirmPasswordController.text.isNotEmpty,
        ),
      ],
    );
  }

  Widget _buildPasswordTip(String text, bool isValid) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: isValid 
            ? AppConstants.orange.withOpacity(0.12)
            : AppConstants.beige.withOpacity(0.55),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isValid 
              ? AppConstants.orange.withOpacity(0.4)
              : AppConstants.beige.withOpacity(0.6),
        ),
      ),
      child: Row(
        children: [
          Icon(
            isValid ? Icons.check_circle : Icons.shield,
            size: 18,
            color: isValid 
                ? AppConstants.orange
                : AppConstants.ink.withOpacity(0.35),
          ),
          const SizedBox(width: 8),
          Text(
            text,
            style: TextStyle(
              fontSize: 13,
              color: isValid 
                  ? AppConstants.orange
                  : AppConstants.ink.withOpacity(0.58),
            ),
          ),
        ],
      ),
    );
  }
}
