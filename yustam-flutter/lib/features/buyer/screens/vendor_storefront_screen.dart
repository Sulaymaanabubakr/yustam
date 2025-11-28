import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../../../config/theme.dart';
import '../../../shared/models/listing_model.dart';
import '../../../core/services/listings_service.dart';

class VendorStorefrontScreen extends ConsumerStatefulWidget {
  final String vendorId;

  const VendorStorefrontScreen({
    super.key,
    required this.vendorId,
  });

  @override
  ConsumerState<VendorStorefrontScreen> createState() => _VendorStorefrontScreenState();
}

class _VendorStorefrontScreenState extends ConsumerState<VendorStorefrontScreen> {
  // TODO: Fetch vendor details (name, avatar, etc.)
  // For now, we'll just fetch their listings

  @override
  Widget build(BuildContext context) {
    final listingsAsync = ref.watch(vendorListingsProvider(widget.vendorId));

    return Scaffold(
      body: CustomScrollView(
        slivers: [
          SliverAppBar(
            expandedHeight: 200,
            pinned: true,
            flexibleSpace: FlexibleSpaceBar(
              background: Container(
                color: AppTheme.primaryOrange,
                child: Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const CircleAvatar(
                        radius: 40,
                        backgroundColor: AppTheme.white,
                        child: Icon(Icons.store, size: 40, color: AppTheme.primaryOrange),
                      ),
                      const SizedBox(height: 12),
                      const Text(
                        'Vendor Store', // Placeholder
                        style: TextStyle(
                          color: AppTheme.white,
                          fontSize: 24,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                        decoration: BoxDecoration(
                          color: AppTheme.white.withOpacity(0.2),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: const Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(Icons.verified, color: AppTheme.white, size: 16),
                            SizedBox(width: 4),
                            Text(
                              'Verified Seller',
                              style: TextStyle(color: AppTheme.white),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
          SliverPadding(
            padding: const EdgeInsets.all(16),
            sliver: listingsAsync.when(
              data: (listings) {
                if (listings.isEmpty) {
                  return const SliverFillRemaining(
                    child: Center(child: Text('No listings yet')),
                  );
                }
                return SliverGrid(
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 2,
                    childAspectRatio: 0.75,
                    crossAxisSpacing: 12,
                    mainAxisSpacing: 12,
                  ),
                  delegate: SliverChildBuilderDelegate(
                    (context, index) => _buildListingCard(listings[index]),
                    childCount: listings.length,
                  ),
                );
              },
              loading: () => const SliverFillRemaining(
                child: Center(child: CircularProgressIndicator()),
              ),
              error: (error, stack) => SliverFillRemaining(
                child: Center(child: Text('Error: $error')),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildListingCard(ListingModel listing) {
    return Card(
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            flex: 3,
            child: listing.displayImage.isNotEmpty
                ? CachedNetworkImage(
                    imageUrl: listing.displayImage,
                    fit: BoxFit.cover,
                    width: double.infinity,
                    placeholder: (context, url) => Container(color: AppTheme.gray200),
                    errorWidget: (context, url, error) => const Icon(Icons.error),
                  )
                : Container(color: AppTheme.gray200),
          ),
          Expanded(
            flex: 2,
            child: Padding(
              padding: const EdgeInsets.all(8),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    listing.title,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontWeight: FontWeight.w600),
                  ),
                  const Spacer(),
                  Text(
                    listing.formattedPrice,
                    style: const TextStyle(
                      color: AppTheme.primaryOrange,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
