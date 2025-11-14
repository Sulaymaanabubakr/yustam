import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Image,
  Share,
  Dimensions,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import theme from '../../theme';
import Toast from '../../components/Toast';
import Button from '../../components/Button';
import { vendorAPI } from '../../services/api';
import { goBackOrNavigate } from '../../utils/navigation';
import resolveMediaUrl from '../../utils/url';
import { API_BASE_URL } from '../../config/constants';
import { formatDate, formatNaira } from '../../utils/formatters';
import { resolveUserUid } from '../../utils/user';
import { getPlanPreset } from '../../data/vendorPlans';

const { width } = Dimensions.get('window');
const LISTING_WIDTH = (width - theme.spacing.lg * 3) / 2;
const PUBLIC_BASE_URL = (API_BASE_URL || '').replace(/\/api\/?$/, '') || API_BASE_URL;
const normaliseBase = (value = '') => (value.endsWith('/') ? value.slice(0, -1) : value);
const buildStorefrontShareUrl = (slug) =>
  slug ? `${normaliseBase(PUBLIC_BASE_URL)}/storefront/${encodeURIComponent(slug)}` : '';
const buildApiStorefrontUrl = (identifier) =>
  identifier ? `${API_BASE_URL}/vendor/storefront/${encodeURIComponent(identifier)}` : '';
const PLAN_BADGES = {
  free: { background: '#E0E0E0', tick: '#757575', border: '#C5C5C5' },
  starter: { background: '#1877F2', tick: '#FFFFFF', border: '#145DB2' },
  pro: { background: '#CD7F32', tick: '#FFFFFF', border: '#A85B1F' },
  elite: { background: '#C0C0C0', tick: '#FFFFFF', border: '#9E9E9E' },
  power: { background: '#D4AF37', tick: '#FFFFFF', border: '#B78E1D' },
};

const normalisePlanSlug = (value = '') =>
  (value || '')
    .toLowerCase()
    .replace(/plan$/i, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'free';

const StorefrontScreen = ({ navigation, route }) => {
  const { user } = useAuth();
  const vendorUid = resolveUserUid(user);
  const { vendorUid: routeVendorUid, vendorId: routeVendorId, vendorSlug: routeVendorSlug } = route?.params ?? {};
  const resolveIdentifier = () => routeVendorSlug || routeVendorUid || routeVendorId || vendorUid;
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'info' });
  const [storefront, setStorefront] = useState({
    businessName: '',
    description: '',
    location: '',
    verified: false,
    verificationStatus: '',
    planSlug: 'free',
    planName: 'Free Plan',
    planFeatures: [],
    rating: 0,
    totalReviews: 0,
    totalListings: 0,
    joinedDate: '',
    profileImage: '',
    coverImage: '',
    vendorUid: '',
    storefrontSlug: '',
    storefrontUrl: '',
  });
  const [listings, setListings] = useState([]);
  const [badgeModalVisible, setBadgeModalVisible] = useState(false);

  useEffect(() => {
    fetchStorefront();
  }, [route?.params, vendorUid]);

  const fetchStorefront = async () => {
    try {
      setLoading(true);
      const identifier = resolveIdentifier();
      if (!identifier) {
        throw new Error('Unable to determine your vendor account.');
      }

      const payload = await vendorAPI.getStorefront(identifier);
      const vendor = payload?.vendor || {};
      const listingData = Array.isArray(payload?.products)
        ? payload.products
        : Array.isArray(payload?.listings)
          ? payload.listings
          : [];

      const locationParts = [vendor.city, vendor.state, vendor.country].filter(Boolean);
      const verificationStatus = (vendor.verificationStatus || '').toLowerCase();
      const isVerified = verificationStatus === 'approved' || verificationStatus === 'verified' || vendor.verified;
      const planSlug = normalisePlanSlug(
        vendor.planSlug || vendor.plan?.slug || vendor.planId || vendor.plan || 'free'
      );
      const planDefinition = getPlanPreset(planSlug);
      const storefrontSlug = vendor.storefrontSlug;
      const shareUrl =
        buildStorefrontShareUrl(storefrontSlug) ||
        buildApiStorefrontUrl(storefrontSlug || vendor.vendorUid || vendor.userId || identifier);

      setStorefront({
        businessName: vendor.businessName || vendor.displayName || 'Your Storefront',
        description: vendor.description || vendor.about || '',
        location: locationParts.join(', '),
        verified: isVerified,
        verificationStatus,
        planSlug,
        planName: planDefinition.name,
        planFeatures: planDefinition.features,
        rating: vendor.averageRating || vendor.rating || 0,
        totalReviews: vendor.reviewCount || vendor.totalReviews || 0,
        totalListings: listingData.length,
        joinedDate: vendor.createdAt
          ? formatDate(vendor.createdAt, { month: 'long', year: 'numeric' })
          : '',
        profileImage: resolveMediaUrl(vendor.avatar || vendor.profileImage || vendor.user?.photoUrl),
        coverImage: resolveMediaUrl(vendor.banner),
        vendorUid: vendor.user?.firebaseUid || vendor.vendorUid || vendorUid,
        storefrontSlug,
        storefrontUrl: shareUrl,
      });

      setListings(
        listingData.map((listing) => {
          const mediaArray = Array.isArray(listing.media) ? listing.media : [];
          const primaryMedia =
            mediaArray.find((item) => item.isPrimary)?.url || mediaArray[0]?.url || listing.image || listing.coverImage;
          return {
            id: listing.id || listing.listing_id || listing.public_id,
            title: listing.title || listing.name || 'Untitled',
            price: listing.price || 0,
            image: resolveMediaUrl(primaryMedia),
            status: listing.status || 'active',
          };
        })
      );
    } catch (error) {
      console.error('Error fetching storefront:', error);
      showToast('Failed to load storefront', 'error');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchStorefront();
    setRefreshing(false);
  };

  const showToast = (message, type = 'success') => {
    setToast({ visible: true, message, type });
  };

  const hideToast = () => {
    setToast({ ...toast, visible: false });
  };

  const handleShareStorefront = async () => {
    try {
      const identifier = storefront.storefrontSlug || storefront.vendorUid || vendorUid;
      const storefrontUrl =
        storefront.storefrontUrl ||
        buildStorefrontShareUrl(storefront.storefrontSlug) ||
        buildApiStorefrontUrl(identifier);

      await Share.share({
        message: `Check out ${storefront.businessName} on YUSTAM Marketplace!\n${storefrontUrl}`,
        title: storefront.businessName,
      });
    } catch (error) {
      console.error('Error sharing:', error);
      showToast('Failed to share storefront', 'error');
    }
  };

  const formatPrice = (price) => formatNaira(price || 0);

  const ListingCard = ({ listing }) => (
    <TouchableOpacity
      style={styles.listingCard}
      onPress={() => {
        // TODO: Navigate to listing details
        showToast('Opening listing...', 'info');
      }}
      activeOpacity={0.7}
    >
      {listing.image ? (
        <Image source={{ uri: listing.image }} style={styles.listingImage} resizeMode="cover" />
      ) : (
        <View style={[styles.listingImage, styles.listingImagePlaceholder]}>
          <Ionicons name="image-outline" size={32} color={theme.colors.textSecondary} />
        </View>
      )}
      <View style={styles.listingInfo}>
        <Text style={styles.listingTitle} numberOfLines={2}>
          {listing.title}
        </Text>
        <Text style={styles.listingPrice}>{formatPrice(listing.price)}</Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => goBackOrNavigate(navigation)} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.emerald} />
          </TouchableOpacity>
          <Text style={styles.title}>My Storefront</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.orange} />
          <Text style={styles.loadingText}>Loading storefront...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={hideToast}
      />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => goBackOrNavigate(navigation)} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.emerald} />
        </TouchableOpacity>
        <Text style={styles.title}>My Storefront</Text>
        <TouchableOpacity onPress={handleShareStorefront} style={styles.shareButton}>
          <Ionicons name="share-outline" size={24} color={theme.colors.orange} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.colors.orange]}
            tintColor={theme.colors.orange}
          />
        }
      >
        {/* Cover Image */}
        {storefront.coverImage ? (
          <Image source={{ uri: storefront.coverImage }} style={styles.coverImage} resizeMode="cover" />
        ) : (
          <View style={[styles.coverImage, styles.coverPlaceholder]}>
            <Ionicons name="image-outline" size={28} color={theme.colors.textSecondary} />
            <Text style={styles.coverPlaceholderText}>Add a storefront banner</Text>
          </View>
        )}

        {/* Profile Section */}
        <View style={styles.profileSection}>
          <View style={styles.profileImageContainer}>
            {storefront.profileImage ? (
              <Image source={{ uri: storefront.profileImage }} style={styles.profileImage} resizeMode="cover" />
            ) : (
              <View style={[styles.profileImage, styles.profilePlaceholder]}>
                <Ionicons name="storefront" size={32} color={theme.colors.white} />
              </View>
            )}
          </View>

          <View style={styles.nameRow}>
            <Text style={styles.businessName}>{storefront.businessName}</Text>
            <PlanBadge
              planSlug={storefront.planSlug}
              verified={storefront.verified}
              onPress={() => setBadgeModalVisible(true)}
            />
          </View>
          
          {/* Rating */}
          <View style={styles.ratingContainer}>
            <Ionicons name="star" size={16} color="#FFA500" />
            <Text style={styles.ratingText}>
              {storefront.rating} ({storefront.totalReviews} reviews)
            </Text>
          </View>

          {/* Location */}
          <View style={styles.locationContainer}>
            <Ionicons name="location-outline" size={16} color={theme.colors.textSecondary} />
            <Text style={styles.locationText}>{storefront.location}</Text>
          </View>

          {/* Description */}
          <Text style={styles.description}>{storefront.description}</Text>

        {/* Stats */}
        <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{storefront.totalListings}</Text>
              <Text style={styles.statLabel}>Listings</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{storefront.totalReviews}</Text>
              <Text style={styles.statLabel}>Reviews</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{storefront.joinedDate}</Text>
              <Text style={styles.statLabel}>Joined</Text>
            </View>
        </View>

        {storefront.planFeatures?.length > 0 && (
          <View style={styles.planSection}>
            <Text style={styles.sectionTitle}>{storefront.planName} Perks</Text>
            <View style={styles.planFeatureList}>
              {storefront.planFeatures.slice(0, 6).map((feature) => (
                <View key={feature} style={styles.planFeatureItem}>
                  <Ionicons name="checkmark-circle" size={16} color={theme.colors.emerald} />
                  <Text style={styles.planFeatureText}>{feature}</Text>
                </View>
              ))}
            </View>
            {storefront.planFeatures.length > 6 && (
              <Text style={styles.planFeatureNote}>…and {storefront.planFeatures.length - 6} more benefits.</Text>
            )}
          </View>
        )}

        {/* Share Button */}
        <Button
            title="Share Storefront"
            onPress={handleShareStorefront}
            variant="outline"
            icon="share-social-outline"
            style={styles.shareButtonFull}
          />
        </View>

        {/* Listings Section */}
        <View style={styles.listingsSection}>
          <Text style={styles.sectionTitle}>Active Listings</Text>
          
          {listings.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="cube-outline" size={64} color={theme.colors.textTertiary} />
              <Text style={styles.emptyText}>No active listings</Text>
            </View>
          ) : (
            <View style={styles.listingsGrid}>
              {listings.map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </View>
          )}
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>

      <Modal
        visible={badgeModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setBadgeModalVisible(false)}
      >
        <View style={styles.badgeModalBackdrop}>
          <View style={styles.badgeModalCard}>
            <View style={styles.badgeModalHeader}>
              <Text style={styles.badgeModalTitle}>{storefront.planName}</Text>
              <TouchableOpacity onPress={() => setBadgeModalVisible(false)}>
                <Ionicons name="close" size={20} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <Text style={styles.badgeModalSubtitle}>
              {storefront.verified ? 'Verified vendor' : 'Not verified yet'}
            </Text>
            <View style={styles.badgeModalFeatures}>
              {(storefront.planFeatures || []).slice(0, 6).map((feature) => (
                <View key={feature} style={styles.planFeatureItem}>
                  <Ionicons name="checkmark-circle" size={16} color={theme.colors.emerald} />
                  <Text style={styles.planFeatureText}>{feature}</Text>
                </View>
              ))}
            </View>
            <Text style={styles.badgeModalHint}>
              Badge colors change with your subscription plan. Upgrade for stronger recognition across the
              marketplace.
            </Text>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.base,
    backgroundColor: theme.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    gap: theme.spacing.sm,
  },
  backButton: {
    padding: theme.spacing.xs,
  },
  title: {
    flex: 1,
    fontFamily: theme.typography.fontFamily.anton,
    fontSize: theme.typography.fontSize['2xl'],
    color: theme.colors.emerald,
    letterSpacing: theme.typography.letterSpacing.wide,
  },
  shareButton: {
    padding: theme.spacing.xs,
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: theme.spacing.base,
  },
  loadingText: {
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textSecondary,
  },
  coverImage: {
    width: '100%',
    height: 180,
    backgroundColor: theme.colors.beige,
  },
  coverPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  coverPlaceholderText: {
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  profileSection: {
    backgroundColor: theme.colors.white,
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
    alignItems: 'center',
  },
  profileImageContainer: {
    marginTop: -50,
    position: 'relative',
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: theme.borderRadius.full,
    borderWidth: 4,
    borderColor: theme.colors.white,
    backgroundColor: theme.colors.beige,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profilePlaceholder: {
    backgroundColor: theme.colors.emerald,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.base,
  },
  businessName: {
    fontFamily: theme.typography.fontFamily.anton,
    fontSize: theme.typography.fontSize['2xl'],
    color: theme.colors.emerald,
    letterSpacing: theme.typography.letterSpacing.wide,
    textAlign: 'center',
    flexShrink: 1,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    marginTop: theme.spacing.sm,
  },
  ratingText: {
    fontFamily: theme.typography.fontFamily.interMedium,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    marginTop: theme.spacing.xs,
  },
  locationText: {
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  description: {
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textSecondary,
    lineHeight: theme.typography.lineHeight.relaxed * theme.typography.fontSize.base,
    textAlign: 'center',
    marginTop: theme.spacing.base,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: theme.spacing.xl,
    paddingVertical: theme.spacing.base,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.lg,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontFamily: theme.typography.fontFamily.anton,
    fontSize: theme.typography.fontSize.xl,
    color: theme.colors.orange,
    letterSpacing: theme.typography.letterSpacing.wide,
  },
  statLabel: {
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs / 2,
  },
  statDivider: {
    width: 1,
    backgroundColor: theme.colors.border,
  },
  planSection: {
    width: '100%',
    paddingHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.xl,
  },
  planFeatureList: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    gap: theme.spacing.sm,
    ...theme.shadows.small,
  },
  planFeatureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  planFeatureText: {
    flex: 1,
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textPrimary,
  },
  planFeatureNote: {
    marginTop: theme.spacing.sm,
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textSecondary,
  },
  shareButtonFull: {
    width: '100%',
    marginTop: theme.spacing.xl,
  },
  listingsSection: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.xl,
  },
  sectionTitle: {
    fontFamily: theme.typography.fontFamily.anton,
    fontSize: theme.typography.fontSize.xl,
    color: theme.colors.emerald,
    letterSpacing: theme.typography.letterSpacing.wide,
    marginBottom: theme.spacing.base,
  },
  listingsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.base,
  },
  listingCard: {
    width: LISTING_WIDTH,
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    ...theme.shadows.medium,
  },
  listingImage: {
    width: '100%',
    height: 150,
    backgroundColor: theme.colors.beige,
  },
  listingImagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  listingInfo: {
    padding: theme.spacing.base,
  },
  listingTitle: {
    fontFamily: theme.typography.fontFamily.interSemiBold,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  listingPrice: {
    fontFamily: theme.typography.fontFamily.anton,
    fontSize: theme.typography.fontSize.lg,
    color: theme.colors.orange,
    letterSpacing: theme.typography.letterSpacing.wide,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing['3xl'],
    gap: theme.spacing.base,
  },
  emptyText: {
    fontFamily: theme.typography.fontFamily.interSemiBold,
    fontSize: theme.typography.fontSize.lg,
    color: theme.colors.textSecondary,
  },
  bottomPadding: {
    height: theme.spacing['2xl'],
  },
  badgeCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    backgroundColor: theme.colors.border,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs / 2,
    borderRadius: theme.borderRadius.full,
  },
  badgePillText: {
    fontFamily: theme.typography.fontFamily.interSemiBold,
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textSecondary,
  },
  badgeModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  badgeModalCard: {
    width: '100%',
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  badgeModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badgeModalTitle: {
    fontFamily: theme.typography.fontFamily.anton,
    fontSize: theme.typography.fontSize.xl,
    color: theme.colors.textPrimary,
  },
  badgeModalSubtitle: {
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  badgeModalFeatures: {
    gap: theme.spacing.sm,
  },
  badgeModalHint: {
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textSecondary,
  },
  planBadgeIcon: {
    marginLeft: theme.spacing.xs,
  },
});

const PlanBadge = ({ planSlug, verified, onPress }) => {
  const config = PLAN_BADGES[planSlug] || PLAN_BADGES.free;
  if (!verified) {
    return (
      <TouchableOpacity style={styles.badgePill} onPress={onPress} activeOpacity={0.8}>
        <Ionicons name="close-circle" size={14} color={theme.colors.textSecondary} />
        <Text style={styles.badgePillText}>Not verified</Text>
      </TouchableOpacity>
    );
  }
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
      <MaterialCommunityIcons
        name="check-decagram"
        size={18}
        color={config.background}
        style={styles.planBadgeIcon}
      />
    </TouchableOpacity>
  );
};

export default StorefrontScreen;
