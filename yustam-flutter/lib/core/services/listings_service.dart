import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../services/supabase_service.dart';
import '../../shared/models/listing_model.dart';

/// Listings Service
/// Handles all listing-related operations
class ListingsService {
  final SupabaseService _supabase;

  ListingsService(this._supabase);

  // ============================================================================
  // Fetch Listings
  // ============================================================================

  /// Get all active listings
  Future<List<ListingModel>> getActiveListings({
    int? limit,
    String? category,
    String? state,
    String? city,
  }) async {
    final filters = <String, dynamic>{'status': 'active'};
    if (category != null) filters['category'] = category;
    if (state != null) filters['state'] = state;
    if (city != null) filters['city'] = city;

    final data = await _supabase.getFromTable(
      'listings',
      filters: filters,
      orderBy: 'created_at',
      ascending: false,
      limit: limit,
    );

    return data.map((json) => ListingModel.fromJson(json)).toList();
  }

  /// Get listing by ID
  Future<ListingModel?> getListingById(String id) async {
    final data = await _supabase.getFromTable(
      'listings',
      filters: {'id': id},
      limit: 1,
    );

    if (data.isEmpty) return null;
    return ListingModel.fromJson(data.first);
  }

  /// Get listings by vendor
  Future<List<ListingModel>> getVendorListings(String vendorId) async {
    final data = await _supabase.getFromTable(
      'listings',
      filters: {'vendor_id': vendorId},
      orderBy: 'created_at',
      ascending: false,
    );

    return data.map((json) => ListingModel.fromJson(json)).toList();
  }

  /// Search listings
  Future<List<ListingModel>> searchListings({
    required String query,
    String? category,
    double? minPrice,
    double? maxPrice,
    String? condition,
    String? state,
  }) async {
    // TODO: Implement full-text search using Supabase
    // For now, use simple title/description matching
    final data = await _supabase.getFromTable(
      'listings',
      filters: {'status': 'active'},
      orderBy: 'created_at',
      ascending: false,
    );

    var listings = data.map((json) => ListingModel.fromJson(json)).toList();

    // Filter by query
    if (query.isNotEmpty) {
      listings = listings.where((listing) {
        final titleMatch = listing.title.toLowerCase().contains(query.toLowerCase());
        final descMatch = listing.description?.toLowerCase().contains(query.toLowerCase()) ?? false;
        return titleMatch || descMatch;
      }).toList();
    }

    // Filter by category
    if (category != null) {
      listings = listings.where((l) => l.category == category).toList();
    }

    // Filter by price range
    if (minPrice != null) {
      listings = listings.where((l) => (l.price ?? 0) >= minPrice).toList();
    }
    if (maxPrice != null) {
      listings = listings.where((l) => (l.price ?? 0) <= maxPrice).toList();
    }

    // Filter by condition
    if (condition != null) {
      listings = listings.where((l) => l.condition == condition).toList();
    }

    // Filter by state
    if (state != null) {
      listings = listings.where((l) => l.state == state).toList();
    }

    return listings;
  }

  // ============================================================================
  // Create/Update Listings
  // ============================================================================

  /// Create new listing
  Future<ListingModel> createListing({
    required String vendorId,
    required String title,
    String? description,
    double? price,
    String? category,
    String? subcategory,
    List<String>? tags,
    String? location,
    String? city,
    String? state,
    String? condition,
    List<String>? images,
  }) async {
    final data = await _supabase.insertIntoTable('listings', {
      'vendor_id': vendorId,
      'title': title,
      'description': description,
      'price': price,
      'status': 'pending', // Requires approval
      'category': category,
      'subcategory': subcategory,
      'tags': tags ?? [],
      'location': location,
      'city': city,
      'state': state,
      'country': 'Nigeria',
      'condition': condition,
      'images': images ?? [],
      'primary_image': images?.isNotEmpty == true ? images!.first : null,
    });

    return ListingModel.fromJson(data);
  }

  /// Update listing
  Future<ListingModel> updateListing({
    required String listingId,
    String? title,
    String? description,
    double? price,
    String? category,
    String? subcategory,
    List<String>? tags,
    String? location,
    String? city,
    String? state,
    String? condition,
    List<String>? images,
  }) async {
    final updateData = <String, dynamic>{};
    if (title != null) updateData['title'] = title;
    if (description != null) updateData['description'] = description;
    if (price != null) updateData['price'] = price;
    if (category != null) updateData['category'] = category;
    if (subcategory != null) updateData['subcategory'] = subcategory;
    if (tags != null) updateData['tags'] = tags;
    if (location != null) updateData['location'] = location;
    if (city != null) updateData['city'] = city;
    if (state != null) updateData['state'] = state;
    if (condition != null) updateData['condition'] = condition;
    if (images != null) {
      updateData['images'] = images;
      updateData['primary_image'] = images.isNotEmpty ? images.first : null;
    }

    final data = await _supabase.updateInTable(
      'listings',
      updateData,
      filters: {'id': listingId},
    );

    return ListingModel.fromJson(data);
  }

  /// Delete listing
  Future<void> deleteListing(String listingId) async {
    await _supabase.deleteFromTable(
      'listings',
      filters: {'id': listingId},
    );
  }

  // ============================================================================
  // Favorites
  // ============================================================================

  /// Add listing to favorites
  Future<void> addToFavorites({
    required String userId,
    required String userRole,
    required String listingId,
  }) async {
    await _supabase.insertIntoTable('favorites', {
      'user_id': userId,
      'user_role': userRole,
      'listing_id': listingId,
    });
  }

  /// Remove from favorites
  Future<void> removeFromFavorites({
    required String userId,
    required String listingId,
  }) async {
    await _supabase.deleteFromTable(
      'favorites',
      filters: {
        'user_id': userId,
        'listing_id': listingId,
      },
    );
  }

  /// Get user's favorite listings
  Future<List<ListingModel>> getFavoriteListings(String userId) async {
    // Get favorite IDs
    final favorites = await _supabase.getFromTable(
      'favorites',
      filters: {'user_id': userId},
    );

    if (favorites.isEmpty) return [];

    final listingIds = favorites.map((f) => f['listing_id'].toString()).toList();

    // Fetch listings
    final listings = <ListingModel>[];
    for (final id in listingIds) {
      final listing = await getListingById(id);
      if (listing != null) listings.add(listing);
    }

    return listings;
  }

  /// Check if listing is favorited
  Future<bool> isListingFavorited({
    required String userId,
    required String listingId,
  }) async {
    final data = await _supabase.getFromTable(
      'favorites',
      filters: {
        'user_id': userId,
        'listing_id': listingId,
      },
      limit: 1,
    );

    return data.isNotEmpty;
  }

  /// Toggle favorite status
  Future<void> toggleFavorite(String listingId) async {
    // TODO: Get current user ID from auth
    // For now, this is a placeholder
    final userId = 'current_user_id';
    final isFavorited = await isListingFavorited(userId: userId, listingId: listingId);
    
    if (isFavorited) {
      await removeFromFavorites(userId: userId, listingId: listingId);
    } else {
      await addToFavorites(userId: userId, userRole: 'buyer', listingId: listingId);
    }
  }

  // ============================================================================
  // Views
  // ============================================================================

  /// Increment listing views
  Future<void> incrementViews(String listingId) async {
    // Get current views
    final listing = await getListingById(listingId);
    if (listing == null) return;

    // Increment
    await _supabase.updateInTable(
      'listings',
      {'views': listing.views + 1},
      filters: {'id': listingId},
    );
  }
}

// ============================================================================
// Riverpod Providers
// ============================================================================

/// Listings service provider
final listingsServiceProvider = Provider<ListingsService>((ref) {
  final supabase = ref.watch(supabaseServiceProvider);
  return ListingsService(supabase);
});

/// Active listings provider
final activeListingsProvider = FutureProvider<List<ListingModel>>((ref) async {
  final service = ref.watch(listingsServiceProvider);
  return await service.getActiveListings(limit: 50);
});

/// Vendor listings provider
final vendorListingsProvider = FutureProvider.family<List<ListingModel>, String>(
  (ref, vendorId) async {
    final service = ref.watch(listingsServiceProvider);
    return await service.getVendorListings(vendorId);
  },
);

/// Favorite listings provider
final favoriteListingsProvider = FutureProvider.family<List<ListingModel>, String>(
  (ref, userId) async {
    final service = ref.watch(listingsServiceProvider);
    return await service.getFavoriteListings(userId);
  },
);

// Import supabase service provider
final supabaseServiceProvider = Provider<SupabaseService>((ref) {
  return SupabaseService();
});
