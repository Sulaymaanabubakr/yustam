import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:go_router/go_router.dart';
import '../../../config/theme.dart';

class RecentlyViewedScreen extends ConsumerWidget {
  const RecentlyViewedScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // TODO: Implement recently viewed provider with local storage
    final recentlyViewed = []; // Placeholder

    return Scaffold(
      appBar: AppBar(
        title: const Text('Recently Viewed'),
        actions: [
          if (recentlyViewed.isNotEmpty)
            TextButton(
              onPressed: () {
                // TODO: Clear history
              },
              child: const Text('Clear All'),
            ),
        ],
      ),
      body: recentlyViewed.isEmpty
          ? Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.history, size: 64, color: AppTheme.gray400),
                  const SizedBox(height: 16),
                  Text(
                    'No recently viewed items',
                    style: Theme.of(context).textTheme.headlineMedium,
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'Items you view will appear here',
                    style: TextStyle(color: AppTheme.gray600),
                  ),
                ],
              ),
            )
          : ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: recentlyViewed.length,
              itemBuilder: (context, index) {
                // TODO: Build listing card
                return const SizedBox();
              },
            ),
    );
  }
}
