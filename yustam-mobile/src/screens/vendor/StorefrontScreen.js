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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
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

const { width } = Dimensions.get('window');
const LISTING_WIDTH = (width - theme.spacing.lg * 3) / 2;

const StorefrontScreen = ({ navigation }) => {
  const { user } = useAuth();
  const vendorUid = resolveUserUid(user);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'info' });
  const [storefront, setStorefront] = useState({
    businessName: '',
    description: '',
    location: '',
    verified: false,
    rating: 0,
    totalReviews: 0,
    totalListings: 0,
    joinedDate: '',
    profileImage: '',
    coverImage: '',
    vendorUid: '',
  });
  const [listings, setListings] = useState([]);

  useEffect(() => {
    fetchStorefront();
  }, []);

  const fetchStorefront = async () => {
    try {
      setLoading(true);
      if (!vendorUid) {
        throw new Error('Unable to determine your vendor account.');
      }

      const response = await vendorAPI.getStorefront(vendorUid);
      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Unable to load storefront data.');
      }

      const vendor = response.data.vendor || {};
      const listingData = Array.isArray(response.data.listings) ? response.data.listings : [];

      setStorefront({
        businessName: vendor.businessName || vendor.displayName || 'Your Storefront',
        description: vendor.about || '',
        location: vendor.location || vendor.city || vendor.state || vendor.country || '',
        verified: (vendor.verificationState || '').toLowerCase() === 'verified',
        rating: vendor.rating || 0,
        totalReviews: vendor.totalReviews || 0,
        totalListings: listingData.length,
        joinedDate: vendor.createdAt
          ? formatDate(vendor.createdAt, { month: 'long', year: 'numeric' })
          : '',
        profileImage: resolveMediaUrl(vendor.avatar),
        coverImage: resolveMediaUrl(vendor.banner),
        vendorUid: vendor.vendorUid || vendor.firebaseUid || vendorUid,
      });

      setListings(
        listingData.map((listing) => ({
          id: listing.id || listing.listing_id || listing.public_id,
          title: listing.title || 'Untitled',
          price: listing.price || 0,
          image: resolveMediaUrl(listing.image),
          status: listing.status || 'active',
        }))
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
      const identifier = storefront.vendorUid || vendorUid;
      const storefrontUrl = `${API_BASE_URL}/vendor-storefront.php?id=${identifier}`;
      
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
      <Image
        source={{ uri: listing.image }}
        style={styles.listingImage}
        resizeMode="cover"
      />
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
        <Image
          source={{ uri: storefront.coverImage }}
          style={styles.coverImage}
          resizeMode="cover"
        />

        {/* Profile Section */}
        <View style={styles.profileSection}>
          <View style={styles.profileImageContainer}>
            <Image
              source={{ uri: storefront.profileImage }}
              style={styles.profileImage}
              resizeMode="cover"
            />
            {storefront.verified && (
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark-circle" size={24} color="#0F9D58" />
              </View>
            )}
          </View>

          <Text style={styles.businessName}>{storefront.businessName}</Text>
          
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
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.full,
  },
  businessName: {
    fontFamily: theme.typography.fontFamily.anton,
    fontSize: theme.typography.fontSize['2xl'],
    color: theme.colors.emerald,
    letterSpacing: theme.typography.letterSpacing.wide,
    marginTop: theme.spacing.base,
    textAlign: 'center',
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
});

export default StorefrontScreen;
