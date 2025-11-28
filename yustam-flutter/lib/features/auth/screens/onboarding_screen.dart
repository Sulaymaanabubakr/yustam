import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:go_router/go_router.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../../config/theme.dart';

class OnboardingScreen extends StatefulWidget {
  const OnboardingScreen({super.key});

  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen> {
  final PageController _pageController = PageController();
  int _currentPage = 0;

  // From yustam-mobile/src/config/constants.js
  final List<Map<String, String>> _slides = [
    {
      'id': '1',
      'title': 'AI-Powered Smart Shopping',
      'description':
          'Shop with confidence using our AI assistant. Get personalized recommendations from verified vendors across Nigeria.',
      'icon': 'shield_checkmark',
    },
    {
      'id': '2',
      'title': 'AI-Assisted Selling',
      'description':
          'Leverage AI to optimize your listings, reach the right buyers, and grow your business faster with smart insights.',
      'icon': 'storefront',
    },
    {
      'id': '3',
      'title': 'Nigeria\'s No.1 AI-Powered Marketplace',
      'description':
          'Join thousands using AI to buy and sell smarter. Experience the future of e-commerce today!',
      'icon': 'people',
    },
  ];

  Future<void> _handleRoleSelection(String role) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('user_role', role);
    await prefs.setBool('has_seen_onboarding', true);
    if (mounted) {
      context.go('/auth');
    }
  }

  IconData _getIcon(String iconName) {
    switch (iconName) {
      case 'shield_checkmark':
        return Icons.verified_user_outlined;
      case 'storefront':
        return Icons.storefront_outlined;
      case 'people':
        return Icons.people_outline;
      default:
        return Icons.star_outline;
    }
  }

  @override
  Widget build(BuildContext context) {
    final isLastSlide = _currentPage == _slides.length - 1;

    return Scaffold(
      backgroundColor: AppTheme.white,
      body: SafeArea(
        child: Column(
          children: [
            // Header with Back and Skip buttons
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  // Back button
                  if (_currentPage > 0)
                    TextButton.icon(
                      onPressed: () {
                        _pageController.previousPage(
                          duration: const Duration(milliseconds: 300),
                          curve: Curves.easeInOut,
                        );
                      },
                      icon: const Icon(Icons.arrow_back, size: 22),
                      label: const Text('Back'),
                      style: TextButton.styleFrom(
                        foregroundColor: AppTheme.textPrimary,
                      ),
                    )
                  else
                    const SizedBox(width: 72),

                  // Skip button
                  if (!isLastSlide)
                    TextButton(
                      onPressed: () {
                        _pageController.animateToPage(
                          _slides.length - 1,
                          duration: const Duration(milliseconds: 300),
                          curve: Curves.easeInOut,
                        );
                      },
                      child: const Text('Skip'),
                      style: TextButton.styleFrom(
                        foregroundColor: AppTheme.textSecondary,
                      ),
                    )
                  else
                    const SizedBox(width: 72),
                ],
              ),
            ),

            // PageView
            Expanded(
              child: PageView.builder(
                controller: _pageController,
                onPageChanged: (index) {
                  setState(() {
                    _currentPage = index;
                  });
                },
                itemCount: _slides.length,
                itemBuilder: (context, index) {
                  final slide = _slides[index];
                  final isLast = index == _slides.length - 1;

                  return Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 32),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        // Icon Circle with Beige background
                        Container(
                          width: 120,
                          height: 120,
                          decoration: BoxDecoration(
                            color: AppTheme.beige,
                            shape: BoxShape.circle,
                          ),
                          child: Icon(
                            _getIcon(slide['icon']!),
                            size: 80,
                            color: AppTheme.orange,
                          ),
                        ),

                        const SizedBox(height: 32),

                        // Title in Anton font, Emerald color
                        Text(
                          slide['title']!,
                          style: const TextStyle(
                            fontFamily: 'Anton',
                            fontSize: 28,
                            color: AppTheme.emerald,
                            letterSpacing: 1.5,
                            height: 1.2,
                          ),
                          textAlign: TextAlign.center,
                        ),

                        const SizedBox(height: 16),

                        // Description
                        Text(
                          slide['description']!,
                          style: TextStyle(
                            fontFamily: 'Inter',
                            fontSize: 16,
                            color: AppTheme.textSecondary,
                            height: 1.5,
                          ),
                          textAlign: TextAlign.center,
                        ),

                        // Role Selection Cards (only on last slide)
                        if (isLast) ...[
                          const SizedBox(height: 48),
                          Text(
                            'Continue As',
                            style: TextStyle(
                              fontFamily: 'Anton',
                              fontSize: 24,
                              color: AppTheme.emerald,
                              letterSpacing: 1.5,
                            ),
                          ),
                          const SizedBox(height: 20),
                          Row(
                            children: [
                              // Buyer Card
                              Expanded(
                                child: _RoleCard(
                                  icon: Icons.shopping_bag,
                                  iconColor: AppTheme.emerald,
                                  label: 'Buyer',
                                  subtext: 'Browse and shop',
                                  onTap: () => _handleRoleSelection('buyer'),
                                ),
                              ),
                              const SizedBox(width: 16),
                              // Vendor Card
                              Expanded(
                                child: _RoleCard(
                                  icon: Icons.storefront,
                                  iconColor: AppTheme.orange,
                                  label: 'Vendor',
                                  subtext: 'Sell and grow',
                                  onTap: () => _handleRoleSelection('vendor'),
                                ),
                              ),
                            ],
                          ),
                        ],
                      ],
                    ),
                  );
                },
              ),
            ),

            // Footer with Pagination and Arrow Navigation
            if (!isLastSlide)
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
                child: Column(
                  children: [
                    // Pagination Dots
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: List.generate(
                        _slides.length,
                        (index) => AnimatedContainer(
                          duration: const Duration(milliseconds: 300),
                          margin: const EdgeInsets.symmetric(horizontal: 4),
                          height: 10,
                          width: _currentPage == index ? 20 : 10,
                          decoration: BoxDecoration(
                            color: _currentPage == index
                                ? AppTheme.orange
                                : AppTheme.orange.withOpacity(0.3),
                            borderRadius: BorderRadius.circular(5),
                          ),
                        ),
                      ),
                    ),

                    const SizedBox(height: 24),

                    // Arrow Navigation Buttons
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        // Previous Arrow
                        if (_currentPage > 0)
                          IconButton(
                            onPressed: () {
                              _pageController.previousPage(
                                duration: const Duration(milliseconds: 300),
                                curve: Curves.easeInOut,
                              );
                            },
                            icon: Container(
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: AppTheme.emerald,
                                shape: BoxShape.circle,
                              ),
                              child: const Icon(
                                Icons.arrow_back,
                                color: AppTheme.white,
                                size: 24,
                              ),
                            ),
                          )
                        else
                          const SizedBox(width: 48),

                        // Next Arrow
                        IconButton(
                          onPressed: () {
                            if (_currentPage < _slides.length - 1) {
                              _pageController.nextPage(
                                duration: const Duration(milliseconds: 300),
                                curve: Curves.easeInOut,
                              );
                            }
                          },
                          icon: Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: AppTheme.orange,
                              shape: BoxShape.circle,
                            ),
                            child: const Icon(
                              Icons.arrow_forward,
                              color: AppTheme.white,
                              size: 24,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              )
            else
              const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }
}

// Role Selection Card Widget
class _RoleCard extends StatelessWidget {
  final IconData icon;
  final Color iconColor;
  final String label;
  final String subtext;
  final VoidCallback onTap;

  const _RoleCard({
    required this.icon,
    required this.iconColor,
    required this.label,
    required this.subtext,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 20, horizontal: 16),
        decoration: BoxDecoration(
          color: AppTheme.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppTheme.border, width: 1.5),
          boxShadow: [
            BoxShadow(
              color: AppTheme.shadowLight,
              blurRadius: 12,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Column(
          children: [
            // Icon Circle
            Container(
              width: 64,
              height: 64,
              decoration: BoxDecoration(
                color: iconColor,
                shape: BoxShape.circle,
              ),
              child: Icon(
                icon,
                size: 32,
                color: AppTheme.white,
              ),
            ),
            const SizedBox(height: 12),
            // Label
            Text(
              label,
              style: const TextStyle(
                fontFamily: 'Anton',
                fontSize: 18,
                color: AppTheme.emerald,
                letterSpacing: 1.2,
              ),
            ),
            const SizedBox(height: 4),
            // Subtext
            Text(
              subtext,
              style: TextStyle(
                fontFamily: 'Inter',
                fontSize: 13,
                color: AppTheme.textSecondary,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
