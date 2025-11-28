/// Listing Model
/// Represents a product listing in the marketplace
class ListingModel {
  final String id;
  final String publicId;
  final String vendorId;
  final String title;
  final String? description;
  final double? price;
  final String status; // 'draft', 'pending', 'active', 'rejected', 'archived'
  final String? primaryImage;
  final List<String> images;
  final String? category;
  final String? subcategory;
  final List<String> tags;
  final String? location;
  final String? city;
  final String? state;
  final String? country;
  final String? condition; // 'new', 'used'
  final int views;
  final int favoritesCount;
  final String? rejectionReason;
  final DateTime createdAt;
  final DateTime? updatedAt;

  // Vendor info (optional, populated when fetched with vendor data)
  final Map<String, dynamic>? vendor;

  ListingModel({
    required this.id,
    required this.publicId,
    required this.vendorId,
    required this.title,
    this.description,
    this.price,
    required this.status,
    this.primaryImage,
    this.images = const [],
    this.category,
    this.subcategory,
    this.tags = const [],
    this.location,
    this.city,
    this.state,
    this.country,
    this.condition,
    this.views = 0,
    this.favoritesCount = 0,
    this.rejectionReason,
    required this.createdAt,
    this.updatedAt,
    this.vendor,
  });

  /// Create from JSON
  factory ListingModel.fromJson(Map<String, dynamic> json) {
    return ListingModel(
      id: json['id']?.toString() ?? '',
      publicId: json['public_id']?.toString() ?? '',
      vendorId: json['vendor_id']?.toString() ?? '',
      title: json['title']?.toString() ?? '',
      description: json['description']?.toString(),
      price: json['price'] != null ? double.tryParse(json['price'].toString()) : null,
      status: json['status']?.toString() ?? 'draft',
      primaryImage: json['primary_image']?.toString(),
      images: json['images'] is List
          ? List<String>.from(json['images'])
          : (json['images'] != null ? [json['images'].toString()] : []),
      category: json['category']?.toString(),
      subcategory: json['subcategory']?.toString(),
      tags: json['tags'] is List ? List<String>.from(json['tags']) : [],
      location: json['location']?.toString(),
      city: json['city']?.toString(),
      state: json['state']?.toString(),
      country: json['country']?.toString() ?? 'Nigeria',
      condition: json['condition']?.toString(),
      views: json['views'] is int ? json['views'] : int.tryParse(json['views']?.toString() ?? '0') ?? 0,
      favoritesCount: json['favorites_count'] is int
          ? json['favorites_count']
          : int.tryParse(json['favorites_count']?.toString() ?? '0') ?? 0,
      rejectionReason: json['rejection_reason']?.toString(),
      createdAt: json['created_at'] != null
          ? DateTime.parse(json['created_at'].toString())
          : DateTime.now(),
      updatedAt: json['updated_at'] != null
          ? DateTime.parse(json['updated_at'].toString())
          : null,
      vendor: json['vendor'] is Map ? Map<String, dynamic>.from(json['vendor']) : null,
    );
  }

  /// Convert to JSON
  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'public_id': publicId,
      'vendor_id': vendorId,
      'title': title,
      'description': description,
      'price': price,
      'status': status,
      'primary_image': primaryImage,
      'images': images,
      'category': category,
      'subcategory': subcategory,
      'tags': tags,
      'location': location,
      'city': city,
      'state': state,
      'country': country,
      'condition': condition,
      'views': views,
      'favorites_count': favoritesCount,
      'rejection_reason': rejectionReason,
      'created_at': createdAt.toIso8601String(),
      'updated_at': updatedAt?.toIso8601String(),
      'vendor': vendor,
    };
  }

  /// Check if listing is active
  bool get isActive => status == 'active';

  /// Check if listing is pending approval
  bool get isPending => status == 'pending';

  /// Check if listing is draft
  bool get isDraft => status == 'draft';

  /// Check if listing is rejected
  bool get isRejected => status == 'rejected';

  /// Get formatted price
  String get formattedPrice {
    if (price == null) return 'Price not set';
    return '₦${price!.toStringAsFixed(2).replaceAllMapped(
          RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'),
          (Match m) => '${m[1]},',
        )}';
  }

  /// Get first image or placeholder
  String get displayImage => primaryImage ?? (images.isNotEmpty ? images.first : '');

  /// Copy with
  ListingModel copyWith({
    String? id,
    String? publicId,
    String? vendorId,
    String? title,
    String? description,
    double? price,
    String? status,
    String? primaryImage,
    List<String>? images,
    String? category,
    String? subcategory,
    List<String>? tags,
    String? location,
    String? city,
    String? state,
    String? country,
    String? condition,
    int? views,
    int? favoritesCount,
    String? rejectionReason,
    DateTime? createdAt,
    DateTime? updatedAt,
    Map<String, dynamic>? vendor,
  }) {
    return ListingModel(
      id: id ?? this.id,
      publicId: publicId ?? this.publicId,
      vendorId: vendorId ?? this.vendorId,
      title: title ?? this.title,
      description: description ?? this.description,
      price: price ?? this.price,
      status: status ?? this.status,
      primaryImage: primaryImage ?? this.primaryImage,
      images: images ?? this.images,
      category: category ?? this.category,
      subcategory: subcategory ?? this.subcategory,
      tags: tags ?? this.tags,
      location: location ?? this.location,
      city: city ?? this.city,
      state: state ?? this.state,
      country: country ?? this.country,
      condition: condition ?? this.condition,
      views: views ?? this.views,
      favoritesCount: favoritesCount ?? this.favoritesCount,
      rejectionReason: rejectionReason ?? this.rejectionReason,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      vendor: vendor ?? this.vendor,
    );
  }
}
