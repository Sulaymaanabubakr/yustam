import 'package:flutter/material.dart';
import '../../utils/constants.dart';
import '../../widgets/category_card.dart';
import '../../widgets/product_card.dart';

/// Buyer Home Screen with all sections
class BuyerHomeScreen extends StatefulWidget {
  const BuyerHomeScreen({super.key});

  @override
  State<BuyerHomeScreen> createState() => _BuyerHomeScreenState();
}

class _BuyerHomeScreenState extends State<BuyerHomeScreen> {
  int _selectedIndex = 0;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: _selectedIndex == 0 
          ? _buildHomeTab()
          : _buildPlaceholderTab(_selectedIndex),
      bottomNavigationBar: _buildBottomNavBar(),
    );
  }

  Widget _buildHomeTab() {
    return SafeArea(
      child: CustomScrollView(
        slivers: [
          // Header with location and search
          SliverToBoxAdapter(
            child: Container(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Location
                  Row(
                    children: [
                      Icon(
                        Icons.location_on,
                        color: AppConstants.orange,
                        size: 20,
                      ),
                      const SizedBox(width: 8),
                      Text(
                        'Lagos, Nigeria',
                        style: TextStyle(
                          fontFamily: 'Inter',
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                          color: AppConstants.ink,
                        ),
                      ),
                      Spacer(),
                      IconButton(
                        icon: Icon(Icons.notifications_outlined),
                        onPressed: () {
                          setState(() {
                            _selectedIndex = 3;
                          });
                        },
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  
                  // Search bar
                  GestureDetector(
                    onTap: () {
                      setState(() {
                        _selectedIndex = 1;
                      });
                    },
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 16,
                        vertical: 14,
                      ),
                      decoration: BoxDecoration(
                        color: Colors.grey.shade100,
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(
                          color: Colors.grey.shade300,
                        ),
                      ),
                      child: Row(
                        children: [
                          Icon(
                            Icons.search,
                            color: Colors.grey.shade600,
                          ),
                          const SizedBox(width: 12),
                          Text(
                            'Search products...',
                            style: TextStyle(
                              color: Colors.grey.shade600,
                              fontSize: 15,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
          
          // Promotional Banner
          SliverToBoxAdapter(
            child: Container(
              margin: const EdgeInsets.all(16),
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [
                    AppConstants.orange,
                    AppConstants.orangeDeep,
                  ],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(20),
                boxShadow: [
                  BoxShadow(
                    color: AppConstants.orange.withOpacity(0.3),
                    blurRadius: 15,
                    offset: Offset(0, 8),
                  ),
                ],
              ),
              child: Row(
                children: [
                  Expanded(
                    flex: 2,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'New Collection',
                          style: TextStyle(
                            fontFamily: 'Anton',
                            fontSize: 24,
                            color: Colors.white,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          'Flash Sale up to 40% off this weekend',
                          style: TextStyle(
                            fontFamily: 'Inter',
                            fontSize: 14,
                            color: Colors.white.withOpacity(0.9),
                          ),
                        ),
                        const SizedBox(height: 16),
                        ElevatedButton(
                          onPressed: () {},
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.white,
                            foregroundColor: AppConstants.orange,
                            padding: const EdgeInsets.symmetric(
                              horizontal: 20,
                              vertical: 10,
                            ),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                          ),
                          child: Text('Shop Now'),
                        ),
                      ],
                    ),
                  ),
                  Expanded(
                    child: Icon(
                      Icons.shopping_bag,
                      size: 80,
                      color: Colors.white.withOpacity(0.3),
                    ),
                  ),
                ],
              ),
            ),
          ),
          
          // Categories Section
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Category',
                    style: TextStyle(
                      fontFamily: 'Anton',
                      fontSize: 20,
                      color: AppConstants.ink,
                    ),
                  ),
                  TextButton(
                    onPressed: () {},
                    child: Text('See All'),
                  ),
                ],
              ),
            ),
          ),
          
          SliverToBoxAdapter(
            child: SizedBox(
              height: 110,
              child: ListView(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 16),
                children: [
                  CategoryCard(
                    icon: Icons.smartphone,
                    label: 'Phones',
                    color: AppConstants.emerald,
                  ),
                  CategoryCard(
                    icon: Icons.laptop,
                    label: 'Laptops',
                    color: AppConstants.orange,
                  ),
                  CategoryCard(
                    icon: Icons.tv,
                    label: 'TVs',
                    color: AppConstants.emerald,
                  ),
                  CategoryCard(
                    icon: Icons.headphones,
                    label: 'Headsets',
                    color: AppConstants.orange,
                  ),
                  CategoryCard(
                    icon: Icons.checkroom,
                    label: 'Fashion',
                    color: AppConstants.emerald,
                  ),
                  CategoryCard(
                    icon: Icons.home,
                    label: 'Home',
                    color: AppConstants.orange,
                  ),
                ],
              ),
            ),
          ),
          
          // Popular Products Section
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Popular Now',
                    style: TextStyle(
                      fontFamily: 'Anton',
                      fontSize: 20,
                      color: AppConstants.ink,
                    ),
                  ),
                  TextButton(
                    onPressed: () {},
                    child: Text('See All'),
                  ),
                ],
              ),
            ),
          ),
          
          SliverToBoxAdapter(
            child: SizedBox(
              height: 280,
              child: ListView(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 16),
                children: [
                  ProductCard(
                    name: 'iPhone 13 Pro',
                    price: '₦450,000',
                    rating: 4.8,
                    reviews: 124,
                    imageUrl: null,
                  ),
                  ProductCard(
                    name: 'MacBook Air M2',
                    price: '₦850,000',
                    rating: 4.9,
                    reviews: 89,
                    imageUrl: null,
                  ),
                  ProductCard(
                    name: 'Samsung TV 55"',
                    price: '₦320,000',
                    rating: 4.7,
                    reviews: 156,
                    imageUrl: null,
                  ),
                  ProductCard(
                    name: 'Sony Headphones',
                    price: '₦45,000',
                    rating: 4.6,
                    reviews: 203,
                    imageUrl: null,
                  ),
                ],
              ),
            ),
          ),
          
          const SliverToBoxAdapter(
            child: SizedBox(height: 24),
          ),
        ],
      ),
    );
  }

  Widget _buildPlaceholderTab(int index) {
    final titles = ['Home', 'Search', 'Chat', 'Notifications', 'Profile'];
    
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            _getTabIcon(index),
            size: 64,
            color: Colors.grey.shade400,
          ),
          const SizedBox(height: 16),
          Text(
            '${titles[index]} Screen',
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.w600,
              color: Colors.grey.shade600,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Coming soon...',
            style: TextStyle(
              fontSize: 14,
              color: Colors.grey.shade500,
            ),
          ),
        ],
      ),
    );
  }

  IconData _getTabIcon(int index) {
    switch (index) {
      case 0:
        return Icons.home;
      case 1:
        return Icons.search;
      case 2:
        return Icons.chat;
      case 3:
        return Icons.notifications;
      case 4:
        return Icons.person;
      default:
        return Icons.home;
    }
  }

  Widget _buildBottomNavBar() {
    return Container(
      decoration: BoxDecoration(
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.1),
            blurRadius: 10,
            offset: Offset(0, -2),
          ),
        ],
      ),
      child: BottomNavigationBar(
        currentIndex: _selectedIndex,
        onTap: (index) {
          setState(() {
            _selectedIndex = index;
          });
        },
        type: BottomNavigationBarType.fixed,
        selectedItemColor: AppConstants.orange,
        unselectedItemColor: Colors.grey,
        selectedFontSize: 12,
        unselectedFontSize: 12,
        items: [
          BottomNavigationBarItem(
            icon: Icon(Icons.home_outlined),
            activeIcon: Icon(Icons.home),
            label: 'Home',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.search_outlined),
            activeIcon: Icon(Icons.search),
            label: 'Search',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.chat_bubble_outline),
            activeIcon: Icon(Icons.chat_bubble),
            label: 'Chat',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.notifications_outlined),
            activeIcon: Icon(Icons.notifications),
            label: 'Notifications',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.person_outline),
            activeIcon: Icon(Icons.person),
            label: 'Profile',
          ),
        ],
      ),
    );
  }
}
