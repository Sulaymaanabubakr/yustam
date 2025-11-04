import 'package:flutter/material.dart';
import '../../utils/constants.dart';
import '../../services/storage_service.dart';
import 'login_tab.dart';
import 'register_tab.dart';

/// Authentication Screen with Login and Register tabs
class AuthScreen extends StatefulWidget {
  const AuthScreen({super.key});

  @override
  State<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends State<AuthScreen> 
    with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final userRole = StorageService.getUserRole() ?? AppConstants.roleBuyer;
    final isVendor = userRole == AppConstants.roleVendor;
    
    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: Column(
          children: [
            // Header
            Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [
                    AppConstants.emerald,
                    AppConstants.emerald.withOpacity(0.85),
                  ],
                ),
              ),
              child: Column(
                children: [
                  Text(
                    AppConstants.appName,
                    style: TextStyle(
                      fontFamily: 'Anton',
                      fontSize: 32,
                      color: Colors.white,
                      letterSpacing: 2,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    isVendor ? 'Vendor Portal' : 'Buyer Access',
                    style: TextStyle(
                      fontFamily: 'Inter',
                      fontSize: 14,
                      color: Colors.white.withOpacity(0.9),
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],
              ),
            ),
            
            // Tabs
            Container(
              decoration: BoxDecoration(
                color: Colors.grey.shade100,
                border: Border(
                  bottom: BorderSide(color: Colors.grey.shade300),
                ),
              ),
              child: TabBar(
                controller: _tabController,
                labelColor: AppConstants.orange,
                unselectedLabelColor: Colors.grey,
                indicatorColor: AppConstants.orange,
                indicatorWeight: 3,
                labelStyle: TextStyle(
                  fontFamily: 'Inter',
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                ),
                tabs: const [
                  Tab(text: 'Login'),
                  Tab(text: 'Create Account'),
                ],
              ),
            ),
            
            // Tab views
            Expanded(
              child: TabBarView(
                controller: _tabController,
                children: [
                  LoginTab(isVendor: isVendor),
                  RegisterTab(isVendor: isVendor),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
