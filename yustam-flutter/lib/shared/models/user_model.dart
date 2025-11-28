/// User Model
/// Represents a user in the system (buyer, vendor, or admin)
class UserModel {
  final String id;
  final String role; // 'buyer', 'vendor', 'admin'
  final String? firebaseUid;
  final String email;
  final String name;
  final String? phone;
  final String? avatarUrl;

  // Vendor-specific fields
  final String? vendorUid;
  final String? businessName;
  final String? category;
  final String? state;
  final String? city;
  final String? address;
  final String? bio;
  final String? plan;
  final String? verificationStatus;
  final bool? verified;

  // Buyer-specific fields
  final String? buyerUid;

  final DateTime? createdAt;
  final DateTime? updatedAt;

  UserModel({
    required this.id,
    required this.role,
    this.firebaseUid,
    required this.email,
    required this.name,
    this.phone,
    this.avatarUrl,
    this.vendorUid,
    this.businessName,
    this.category,
    this.state,
    this.city,
    this.address,
    this.bio,
    this.plan,
    this.verificationStatus,
    this.verified,
    this.buyerUid,
    this.createdAt,
    this.updatedAt,
  });

  /// Create from JSON
  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      id: json['id']?.toString() ?? '',
      role: json['role']?.toString() ?? 'buyer',
      firebaseUid: json['firebase_uid']?.toString(),
      email: json['email']?.toString() ?? '',
      name: json['name']?.toString() ??
          json['full_name']?.toString() ??
          json['business_name']?.toString() ??
          '',
      phone: json['phone']?.toString(),
      avatarUrl: json['avatar_url']?.toString() ??
          json['profile_photo']?.toString(),
      vendorUid: json['vendor_uid']?.toString(),
      businessName: json['business_name']?.toString(),
      category: json['category']?.toString(),
      state: json['state']?.toString(),
      city: json['city']?.toString(),
      address: json['address']?.toString(),
      bio: json['bio']?.toString(),
      plan: json['plan']?.toString(),
      verificationStatus: json['verification_status']?.toString(),
      verified: json['verified'] == 1 || json['verified'] == true,
      buyerUid: json['buyer_uid']?.toString(),
      createdAt: json['created_at'] != null
          ? DateTime.parse(json['created_at'].toString())
          : null,
      updatedAt: json['updated_at'] != null
          ? DateTime.parse(json['updated_at'].toString())
          : null,
    );
  }

  /// Convert to JSON
  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'role': role,
      'firebase_uid': firebaseUid,
      'email': email,
      'name': name,
      'phone': phone,
      'avatar_url': avatarUrl,
      'vendor_uid': vendorUid,
      'business_name': businessName,
      'category': category,
      'state': state,
      'city': city,
      'address': address,
      'bio': bio,
      'plan': plan,
      'verification_status': verificationStatus,
      'verified': verified,
      'buyer_uid': buyerUid,
      'created_at': createdAt?.toIso8601String(),
      'updated_at': updatedAt?.toIso8601String(),
    };
  }

  /// Check if user is vendor
  bool get isVendor => role == 'vendor';

  /// Check if user is buyer
  bool get isBuyer => role == 'buyer';

  /// Check if user is admin
  bool get isAdmin => role == 'admin';

  /// Check if vendor is verified
  bool get isVerified => verified == true;

  /// Get display name
  String get displayName => businessName ?? name;

  /// Get user UID (vendor_uid or buyer_uid)
  String? get userUid => vendorUid ?? buyerUid;

  /// Copy with
  UserModel copyWith({
    String? id,
    String? role,
    String? firebaseUid,
    String? email,
    String? name,
    String? phone,
    String? avatarUrl,
    String? vendorUid,
    String? businessName,
    String? category,
    String? state,
    String? city,
    String? address,
    String? bio,
    String? plan,
    String? verificationStatus,
    bool? verified,
    String? buyerUid,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return UserModel(
      id: id ?? this.id,
      role: role ?? this.role,
      firebaseUid: firebaseUid ?? this.firebaseUid,
      email: email ?? this.email,
      name: name ?? this.name,
      phone: phone ?? this.phone,
      avatarUrl: avatarUrl ?? this.avatarUrl,
      vendorUid: vendorUid ?? this.vendorUid,
      businessName: businessName ?? this.businessName,
      category: category ?? this.category,
      state: state ?? this.state,
      city: city ?? this.city,
      address: address ?? this.address,
      bio: bio ?? this.bio,
      plan: plan ?? this.plan,
      verificationStatus: verificationStatus ?? this.verificationStatus,
      verified: verified ?? this.verified,
      buyerUid: buyerUid ?? this.buyerUid,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }
}
