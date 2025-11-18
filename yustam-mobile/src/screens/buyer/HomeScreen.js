import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { collection, getDocs, limit, orderBy, query as buildQuery } from 'firebase/firestore';
import theme from '../../theme';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../config/firebase';
import { formatNaira } from '../../utils/formatters';
import { normalizeFirestoreListing, normalizeStaticListing } from '../../utils/listingTransforms';
import {
  buildVendorBadgeMeta,
  clampRating,
  describeVendorStatus,
  formatListingLocation,
} from '../../utils/listingBranding';
import { getFlashSaleItems, getMarketplaceProducts } from '../../data/buyerCatalog';
import { getStoredNotificationsMeta } from '../../storage/notificationsMeta';

const CATEGORY_ITEMS = [
  { id: 'phones-tablets', label: 'Phones & Tablets', icon: 'phone-portrait-outline' },
  { id: 'electronics', label: 'Electronics', icon: 'tv-outline' },
  { id: 'fashion', label: 'Fashion', icon: 'shirt-outline' },
  { id: 'property', label: 'Property', icon: 'home-outline' },
  { id: 'food', label: 'Food & Groceries', icon: 'fast-food-outline' },
  { id: 'beauty', label: 'Beauty', icon: 'color-palette-outline' },
  { id: 'vehicles', label: 'Vehicles', icon: 'car-outline' },
  { id: 'home-kitchen', label: 'Home & Kitchen', icon: 'construct-outline' },
  { id: 'power', label: 'Power Solutions', icon: 'flash-outline' },
  { id: 'computing', label: 'Computing', icon: 'desktop-outline' },
  { id: 'services', label: 'Services', icon: 'people-outline' },
  { id: 'others', label: 'Others', icon: 'apps-outline' },
];

const PROMO_BANNERS = [
  {
    id: 'gacha',
    title: 'Gacha Bonanza',
    caption: 'Spin the wheel and win',
    icon: 'game-controller-outline',
    background: '#22242E',
  },
  {
    id: 'coupon',
    title: 'Coupon Rain',
    caption: 'Limited vouchers daily',
    icon: 'ticket-outline',
    background: '#0B7A61',
  },
  {
    id: 'scratch',
    title: 'Scratch To Win',
    caption: 'Unlock instant gifts',
    icon: 'gift-outline',
    background: '#9C27B0',
  },
  {
    id: 'spin',
    title: 'Spin To Win',
    caption: 'Every spin counts',
    icon: 'sync-outline',
    background: '#F3731E',
  },
];

const SECTION_LIMITS = {
  flash: 10,
  trending: 8,
  latest: 6,
};

const BuyerHomeScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [flashDeals, setFlashDeals] = useState([]);
  const [trendingListings, setTrendingListings] = useState([]);
  const [latestListings, setLatestListings] = useState([]);
  const [loadingFeed, setLoadingFeed] = useState(true);
  const [error, setError] = useState('');
  const [hasNewNotifications, setHasNewNotifications] = useState(false);

  const firstName = useMemo(() => {
    const source = (user?.fullName || user?.displayName || '').trim();
    if (!source) {
      return 'there';
    }
    return source.includes(' ') ? source.split(' ')[0] : source;
  }, [user?.fullName, user?.displayName]);

  const hydrateFromFallbacks = useCallback(() => {
    const fallbackFlash = getFlashSaleItems().map((item) =>
      normalizeStaticListing({
        ...item,
        category: 'Featured',
        location: 'Nigeria',
        vendor: 'Yustam Partner',
        vendorPlan: 'premium',
      })
    );

    const fallbackMarketplace = getMarketplaceProducts().map((item) => normalizeStaticListing(item));

    setFlashDeals(fallbackFlash.slice(0, SECTION_LIMITS.flash));
    setTrendingListings(fallbackMarketplace.slice(0, SECTION_LIMITS.trending));
    setLatestListings(fallbackMarketplace.slice(SECTION_LIMITS.trending, SECTION_LIMITS.trending + SECTION_LIMITS.latest));
  }, []);

  const hydrateFromRecords = useCallback(
    (records = []) => {
      if (!records.length) {
        hydrateFromFallbacks();
        return;
      }
      setFlashDeals(selectFlashDeals(records));
      setTrendingListings(selectTrendingListings(records));
      setLatestListings(records.slice(0, SECTION_LIMITS.latest));
    },
    [hydrateFromFallbacks]
  );

  const fetchHomeFeed = useCallback(async () => {
    try {
      setLoadingFeed(true);
      setError('');
      const listingsRef = collection(db, 'listings');
      const feedSnapshot = await getDocs(
        buildQuery(listingsRef, orderBy('createdAt', 'desc'), limit(60))
      );
      const normalized = feedSnapshot.docs
        .map((doc) => normalizeFirestoreListing(doc))
        .filter(Boolean);

      if (!normalized.length) {
        hydrateFromFallbacks();
        return;
      }

      hydrateFromRecords(normalized);
    } catch (err) {
      console.error('BuyerHomeScreen feed error:', err);
      setError(err?.message || 'Unable to load marketplace feed.');
      hydrateFromFallbacks();
    } finally {
      setLoadingFeed(false);
    }
  }, [hydrateFromFallbacks, hydrateFromRecords]);

  useEffect(() => {
    fetchHomeFeed();
  }, [fetchHomeFeed]);

  useEffect(() => {
    let isMounted = true;
    const syncNotificationMeta = async () => {
      const meta = await getStoredNotificationsMeta();
      if (isMounted) {
        setHasNewNotifications(Boolean(meta?.unread && meta.unread > 0));
      }
    };
    syncNotificationMeta();
    const intervalId = setInterval(syncNotificationMeta, 15000);
    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, []);

  const handleSearchSubmit = () => {
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      return;
    }
    navigation.navigate('BuyerSearch', { query: trimmed });
  };

  const handleOpenListing = (listing) => {
    navigation.navigate('BuyerProductDetail', {
      productId: listing.id,
      product: listing,
    });
  };

  const handleCategoryPress = (categoryLabel) => {
    navigation.navigate('BuyerSearch', { category: categoryLabel });
  };

  const renderListingRail = (title, listings, options = {}) => {
    if (!listings.length) {
      return null;
    }
    return (
      <View style={styles.sectionWrapper}>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>{title}</Text>
            {options.subtitle ? <Text style={styles.sectionSubtitle}>{options.subtitle}</Text> : null}
          </View>
          {options.ctaLabel ? (
            <TouchableOpacity onPress={options.onPressCta} activeOpacity={0.8}>
              <Text style={styles.sectionLink}>{options.ctaLabel}</Text>
            </TouchableOpacity>
          ) : null}
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.railContent}
        >
          {listings.map((item) => (
            <ListingCard key={`${options.key || title}-${item.id}`} item={item} onPress={() => handleOpenListing(item)} />
          ))}
        </ScrollView>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.brandRow}>
            <Image source={require('../../../assets/splash-logo.png')} style={styles.brandLogo} resizeMode="contain" />
            <Text style={styles.brand}>YUSTAM</Text>
          </View>
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate('BuyerSearch')}
              activeOpacity={0.85}
            >
              <Ionicons name="search-outline" size={18} color={theme.colors.textPrimary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate('BuyerNotifications')}
              activeOpacity={0.85}
            >
              <Ionicons name="notifications-outline" size={18} color={theme.colors.textPrimary} />
              {hasNewNotifications ? <View style={styles.badgeDot} /> : null}
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.greeting}>
          <Text style={styles.greetingTitle}>Hi {firstName},</Text>
          <Text style={styles.greetingSub}>Welcome back to the trusted marketplace.</Text>
        </View>

        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color={theme.colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search flash deals, smart watches, earbuds..."
            placeholderTextColor={theme.colors.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            onSubmitEditing={handleSearchSubmit}
          />
          <TouchableOpacity style={styles.searchButton} onPress={handleSearchSubmit} activeOpacity={0.85}>
            <Text style={styles.searchButtonText}>Search</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.promoRow}
        >
          {PROMO_BANNERS.map((banner) => (
            <View key={banner.id} style={[styles.promoCard, { backgroundColor: banner.background }]}>
              <View style={styles.promoIconCircle}>
                <Ionicons name={banner.icon} size={20} color={theme.colors.white} />
              </View>
              <View style={styles.promoContent}>
                <Text style={styles.promoTitle}>{banner.title}</Text>
                <Text style={styles.promoCaption}>{banner.caption}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={theme.colors.white} />
            </View>
          ))}
        </ScrollView>

        <View style={styles.categoriesCard}>
          <Text style={styles.categoriesTitle}>Browse by category</Text>
          <View style={styles.categoriesSection}>
            {CATEGORY_ITEMS.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.categoryCard}
                activeOpacity={0.85}
                onPress={() => handleCategoryPress(item.label)}
              >
                <View style={styles.categoryIconWrapper}>
                  <Ionicons name={item.icon} size={18} color={theme.colors.orange} />
                </View>
                <Text style={styles.categoryLabel} numberOfLines={1} ellipsizeMode="tail">
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {error ? (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle" size={18} color={theme.colors.error} />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={fetchHomeFeed} activeOpacity={0.8}>
              <Text style={styles.errorLink}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {loadingFeed && !flashDeals.length && !trendingListings.length ? (
          <View style={styles.loadingState}>
            <ActivityIndicator color={theme.colors.orange} />
            <Text style={styles.loadingText}>Fetching the freshest listings...</Text>
          </View>
        ) : null}

        {renderListingRail('Flash Deals', flashDeals, {
          key: 'flash-deals',
          subtitle: 'App-only deals refreshed hourly',
          ctaLabel: 'See all',
          onPressCta: () => navigation.navigate('BuyerFlashSale'),
        })}

        {renderListingRail('Trending Now', trendingListings, {
          key: 'trending-now',
          subtitle: 'Top rated picks from verified vendors',
          ctaLabel: 'Shop all',
          onPressCta: () => navigation.navigate('BuyerSearch'),
        })}

        <View style={styles.sectionWrapper}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Latest Listings</Text>
              <Text style={styles.sectionSubtitle}>Fresh drops from the marketplace</Text>
            </View>
            <TouchableOpacity onPress={() => navigation.navigate('BuyerSearch')} activeOpacity={0.8}>
              <Text style={styles.sectionLink}>Browse all</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.listingGrid}>
            {latestListings.map((item) => (
              <ListingCard key={`latest-${item.id}`} item={item} variant="grid" onPress={() => handleOpenListing(item)} />
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const hasFlashBadge = (listing) => {
  const matcher = /flash|deal|hot|sale/i;
  return (
    listing?.badges?.some((badge) => matcher.test(badge)) || listing?.tags?.some((tag) => matcher.test(tag))
  );
};

const parseReviewCount = (value) => {
  if (!value) {
    return 0;
  }
  if (typeof value === 'number') {
    return value;
  }
  const trimmed = String(value).trim().toLowerCase();
  if (trimmed.endsWith('k')) {
    const numeric = parseFloat(trimmed.replace('k', ''));
    return Number.isNaN(numeric) ? 0 : Math.round(numeric * 1000);
  }
  const numeric = parseInt(trimmed, 10);
  return Number.isNaN(numeric) ? 0 : numeric;
};

const selectFlashDeals = (records = []) => {
  const flashCandidates = records.filter((listing) => hasFlashBadge(listing));
  const source = flashCandidates.length ? flashCandidates : records;
  return source.slice(0, SECTION_LIMITS.flash);
};

const selectTrendingListings = (records = []) => {
  return [...records]
    .sort((a, b) => {
      const ratingDifference = (b.rating || 0) - (a.rating || 0);
      if (Math.abs(ratingDifference) > 0.05) {
        return ratingDifference;
      }
      return parseReviewCount(b.reviews) - parseReviewCount(a.reviews);
    })
    .slice(0, SECTION_LIMITS.trending);
};

const formatRating = (rating) => {
  if (!rating && rating !== 0) {
    return '-';
  }
  return Number(rating).toFixed(1);
};

const renderRatingStars = (rating) => {
  const safe = clampRating(rating);
  const stars = [];
  for (let i = 1; i <= 5; i += 1) {
    const icon = safe >= i ? 'star' : 'star-outline';
    stars.push(<Ionicons key={`star-${i}`} name={icon} size={14} color={theme.colors.orange} />);
  }
  return stars;
};

const ListingCard = ({ item, onPress, variant = 'rail' }) => {
  const displayBadges = (item.badges || []).filter((badge) => !/plan/i.test(badge));
  const vendorMeta = buildVendorBadgeMeta(item);
  const locationLabel = formatListingLocation(item);
  const handleVendorInfo = () => Alert.alert('Vendor authenticity', describeVendorStatus(item));
  return (
    <TouchableOpacity
      style={[styles.listingCard, variant === 'grid' && styles.listingCardGrid]}
      onPress={onPress}
      activeOpacity={0.92}
    >
      <View style={styles.listingImageWrapper}>
        {item.image ? (
          <>
            <Image source={{ uri: item.image }} style={styles.listingImage} resizeMode="cover" />
            <View style={styles.listingImageOverlay} />
          </>
        ) : (
          <View style={styles.listingImagePlaceholder}>
            <Ionicons name="image-outline" size={28} color={theme.colors.textSecondary} />
            <Text style={styles.listingImagePlaceholderText}>No image</Text>
          </View>
        )}
        {displayBadges.length ? (
          <View style={styles.listingBadge}>
            <Text style={styles.listingBadgeText}>{displayBadges[0]}</Text>
          </View>
        ) : null}
      </View>
      <Text style={styles.listingCategory}>{item.category}</Text>
      <Text style={styles.listingTitle} numberOfLines={2}>
        {item.name}
      </Text>
      <View style={styles.listingPriceRow}>
        <Text style={styles.listingPrice}>{formatNaira(item.price)}</Text>
        {item.oldPrice ? <Text style={styles.listingOldPrice}>{formatNaira(item.oldPrice)}</Text> : null}
      </View>
      <View style={styles.listingMetaRow}>
        <View style={styles.listingRatingRow}>
          <View style={styles.ratingStarsRow}>{renderRatingStars(item.rating)}</View>
          {item.reviews ? <Text style={styles.listingRatingCount}>({item.reviews})</Text> : null}
        </View>
        {locationLabel ? (
          <View style={styles.listingLocationRow}>
            <Ionicons name="location-outline" size={14} color={theme.colors.textSecondary} />
            <Text style={styles.listingLocationText} numberOfLines={1}>
              {locationLabel}
            </Text>
          </View>
        ) : null}
      </View>
      <View style={styles.listingVendorRow}>
        <View style={styles.vendorInfo}>
          <View style={styles.vendorNameRow}>
            <Text style={styles.listingVendorName} numberOfLines={1}>
              {item.vendor}
            </Text>
            {vendorMeta.verificationState === 'verified' ? (
              <MaterialCommunityIcons
                name="check-decagram"
                size={16}
                color={vendorMeta.palette.background}
                style={styles.vendorTick}
              />
            ) : null}
          </View>
        </View>
        <TouchableOpacity
          style={[
            styles.vendorBadgeButton,
            { borderColor: vendorMeta.palette.border || vendorMeta.palette.background },
          ]}
          onPress={handleVendorInfo}
          activeOpacity={0.85}
        >
          <Ionicons name="shield-checkmark-outline" size={16} color={vendorMeta.palette.background} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.backgroundLight,
  },
  contentContainer: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing['4xl'],
    gap: theme.spacing['2xl'],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: theme.spacing.sm,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  brandLogo: {
    width: 40,
    height: 40,
    borderRadius: theme.radius.full,
  },
  brand: {
    fontFamily: theme.typography.fontFamily.anton,
    fontSize: theme.typography.fontSize['2xl'],
    color: theme.colors.emerald,
    letterSpacing: theme.typography.letterSpacing.wide,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.soft,
  },
  badgeDot: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.orange,
  },
  greeting: {
    gap: theme.spacing.xs,
  },
  greetingTitle: {
    fontFamily: theme.typography.fontFamily.anton,
    fontSize: theme.typography.fontSize['3xl'],
    color: theme.colors.textPrimary,
  },
  greetingSub: {
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textSecondary,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.white,
    borderRadius: theme.radius['2xl'],
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    ...theme.shadows.soft,
  },
  searchInput: {
    flex: 1,
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textPrimary,
  },
  searchButton: {
    backgroundColor: theme.colors.emerald,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.full,
  },
  searchButtonText: {
    fontFamily: theme.typography.fontFamily.interSemiBold,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.white,
  },
  categoriesCard: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.radius['2xl'],
    padding: theme.spacing.lg,
    ...theme.shadows.card,
  },
  categoriesTitle: {
    fontFamily: theme.typography.fontFamily.interSemiBold,
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.md,
    textAlign: 'center',
  },
  categoriesSection: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: theme.spacing.lg,
  },
  categoryCard: {
    width: '30%',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  categoryIconWrapper: {
    width: 56,
    height: 56,
    borderRadius: theme.radius.full,
    backgroundColor: '#FAEFE6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryLabel: {
    textAlign: 'center',
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textPrimary,
    maxWidth: 100,
  },
  promoRow: {
    gap: theme.spacing.md,
  },
  promoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: theme.radius['2xl'],
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    gap: theme.spacing.md,
    minWidth: 220,
    ...theme.shadows.medium,
  },
  promoIconCircle: {
    width: 40,
    height: 40,
    borderRadius: theme.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  promoContent: {
    flex: 1,
    gap: 2,
  },
  promoTitle: {
    fontFamily: theme.typography.fontFamily.interSemiBold,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.white,
  },
  promoCaption: {
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.xs,
    color: 'rgba(255,255,255,0.8)',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.white,
    padding: theme.spacing.md,
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  errorText: {
    flex: 1,
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textPrimary,
  },
  errorLink: {
    fontFamily: theme.typography.fontFamily.interSemiBold,
    color: theme.colors.orange,
  },
  loadingState: {
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  loadingText: {
    fontFamily: theme.typography.fontFamily.inter,
    color: theme.colors.textSecondary,
  },
  sectionWrapper: {
    gap: theme.spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontFamily: theme.typography.fontFamily.anton,
    fontSize: theme.typography.fontSize['2xl'],
    color: theme.colors.textPrimary,
  },
  sectionSubtitle: {
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  sectionLink: {
    fontFamily: theme.typography.fontFamily.interSemiBold,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.orange,
  },
  railContent: {
    gap: theme.spacing.md,
    paddingRight: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
  },
  listingCard: {
    width: 240,
    borderRadius: theme.radius['2xl'],
    backgroundColor: theme.colors.white,
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
    gap: theme.spacing.xs,
    ...theme.shadows.card,
  },
  listingCardGrid: {
    width: '48%',
  },
  listingImageWrapper: {
    borderRadius: theme.radius['2xl'],
    overflow: 'hidden',
    backgroundColor: theme.colors.background,
    position: 'relative',
    aspectRatio: 1.15,
    marginBottom: theme.spacing.xs,
  },
  listingImage: {
    ...StyleSheet.absoluteFillObject,
    width: undefined,
    height: undefined,
    transform: [{ scale: 1.05 }],
  },
  listingImageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  listingImagePlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xs,
  },
  listingImagePlaceholderText: {
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textSecondary,
  },
  listingBadge: {
    position: 'absolute',
    top: theme.spacing.sm,
    left: theme.spacing.sm,
    backgroundColor: 'rgba(244,115,30,0.12)',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.radius.full,
  },
  listingBadgeText: {
    fontFamily: theme.typography.fontFamily.interSemiBold,
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.orange,
  },
  listingCategory: {
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textSecondary,
    marginBottom: 2,
  },
  listingTitle: {
    fontFamily: theme.typography.fontFamily.interSemiBold,
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs / 2,
  },
  listingPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  listingPrice: {
    fontFamily: theme.typography.fontFamily.anton,
    fontSize: theme.typography.fontSize.lg,
    color: theme.colors.textPrimary,
  },
  listingOldPrice: {
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textSecondary,
    textDecorationLine: 'line-through',
  },
  listingMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  listingRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingStarsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  listingRatingValue: {
    fontFamily: theme.typography.fontFamily.interSemiBold,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textPrimary,
  },
  listingRatingCount: {
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textSecondary,
  },
  listingLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  listingLocationText: {
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textSecondary,
  },
  listingVendorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  vendorInfo: {
    flex: 1,
    marginRight: theme.spacing.sm,
  },
  vendorNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs / 2,
  },
  listingVendorName: {
    fontFamily: theme.typography.fontFamily.interSemiBold,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textPrimary,
  },
  vendorTick: {
    marginTop: 1,
  },
  vendorBadgeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.white,
  },
  listingGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: theme.spacing.md,
  },
});

export default BuyerHomeScreen;
