import 'package:flutter/material.dart';
import 'dart:async';
import '../../utils/constants.dart';
import '../../services/storage_service.dart';

/// Splash Screen with YUSTAM logo and animation
class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> 
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _fadeAnimation;
  late Animation<double> _scaleAnimation;

  @override
  void initState() {
    super.initState();
    
    // Initialize animations
    _controller = AnimationController(
      duration: const Duration(milliseconds: 1500),
      vsync: this,
    );
    
    _fadeAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
        parent: _controller,
        curve: const Interval(0.0, 0.7, curve: Curves.easeIn),
      ),
    );
    
    _scaleAnimation = Tween<double>(begin: 0.5, end: 1.0).animate(
      CurvedAnimation(
        parent: _controller,
        curve: const Interval(0.0, 0.7, curve: Curves.easeOutBack),
      ),
    );
    
    _controller.forward();
    
    // Navigate after 3 seconds
    Timer(const Duration(seconds: 3), _navigateNext);
  }

  void _navigateNext() {
    // Check if onboarding is complete
    final onboardingComplete = StorageService.isOnboardingComplete();
    final isLoggedIn = StorageService.isLoggedIn();
    final userRole = StorageService.getUserRole();
    
    if (!onboardingComplete) {
      // Navigate to onboarding
      Navigator.of(context).pushReplacementNamed('/onboarding');
    } else if (isLoggedIn && userRole != null) {
      // Navigate to appropriate dashboard
      if (userRole == AppConstants.roleBuyer) {
        Navigator.of(context).pushReplacementNamed('/buyer-home');
      } else if (userRole == AppConstants.roleVendor) {
        Navigator.of(context).pushReplacementNamed('/vendor-home');
      } else {
        Navigator.of(context).pushReplacementNamed('/onboarding');
      }
    } else {
      // Navigate to onboarding
      Navigator.of(context).pushReplacementNamed('/onboarding');
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: Center(
        child: AnimatedBuilder(
          animation: _controller,
          builder: (context, child) {
            return Opacity(
              opacity: _fadeAnimation.value,
              child: Transform.scale(
                scale: _scaleAnimation.value,
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    // Logo
                    Container(
                      width: 150,
                      height: 150,
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(24),
                        boxShadow: [
                          BoxShadow(
                            color: AppConstants.emerald.withOpacity(0.2),
                            blurRadius: 20,
                            offset: const Offset(0, 10),
                          ),
                        ],
                      ),
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(24),
                        child: Image.asset(
                          'assets/logo.jpeg',
                          fit: BoxFit.cover,
                        ),
                      ),
                    ),
                    const SizedBox(height: 24),
                    
                    // App name
                    Text(
                      AppConstants.appName,
                      style: TextStyle(
                        fontFamily: 'Anton',
                        fontSize: 42,
                        color: AppConstants.emerald,
                        letterSpacing: 2,
                      ),
                    ),
                    const SizedBox(height: 8),
                    
                    // Tagline
                    Text(
                      AppConstants.appTagline,
                      style: TextStyle(
                        fontFamily: 'Inter',
                        fontSize: 14,
                        color: AppConstants.ink.withOpacity(0.6),
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
              ),
            );
          },
        ),
      ),
    );
  }
}
