import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  ImageBackground,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import theme from '../../theme';
import { useAuth } from '../../context/AuthContext';
import { getFlashSaleItems } from '../../data/buyerCatalog';

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

const BuyerHomeScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const flashSaleItems = useMemo(() => getFlashSaleItems(), []);

  const firstName = useMemo(() => {
    if (!user?.displayName) return 'there';
    return user.displayName.split(' ')[0];
  }, [user?.displayName]);

  const handleSearchSubmit = () => {
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      return;
    }
    navigation.navigate('BuyerSearch', { query: trimmed });
  };

  const goToFlashSale = () => {
    navigation.navigate('BuyerFlashSale');
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.brandRow}>
            <Image source={require('../../../assets/splash-logo.png')} style={styles.brandLogo} resizeMode="contain" />
            <Text style={styles.brand}>yustam</Text>
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
              <View style={styles.badgeDot} />
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
          <TouchableOpacity
            style={styles.searchButton}
            onPress={handleSearchSubmit}
            activeOpacity={0.85}
          >
            <Text style={styles.searchButtonText}>Search</Text>
          </TouchableOpacity>
        </View>

        <ImageBackground
          source={{ uri: 'https://res.cloudinary.com/dk-find-out/image/upload/q_80,w_1400,f_auto/flash_sale_banner.png' }}
          style={styles.heroCard}
          imageStyle={styles.heroImage}
        >
          <View style={styles.heroOverlay} />
          <View style={styles.heroContent}>
            <View style={styles.heroBadge}>
              <Text style={styles.heroBadgeText}>Flash Sale</Text>
            </View>
            <Text style={styles.heroTitle}>Green Friday Mega Deals</Text>
            <Text style={styles.heroSubtitle}>Save up to 60% on power, audio and more this weekend only.</Text>
            <TouchableOpacity style={styles.heroCta} onPress={goToFlashSale} activeOpacity={0.85}>
              <Text style={styles.heroCtaText}>Save Now</Text>
              <Ionicons name="arrow-forward" size={16} color={theme.colors.white} />
            </TouchableOpacity>
          </View>
        </ImageBackground>

        <View style={styles.categoriesSection}>
          {CATEGORY_ITEMS.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.categoryCard}
              activeOpacity={0.8}
              onPress={goToFlashSale}
            >
              <View style={styles.categoryIconWrapper}>
                <Ionicons name={item.icon} size={20} color={theme.colors.orange} />
              </View>
              <Text style={styles.categoryLabel} numberOfLines={2}>
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Game Feast</Text>
          <TouchableOpacity onPress={goToFlashSale} activeOpacity={0.7}>
            <Text style={styles.sectionLink}>View All</Text>
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

        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Flash Sale</Text>
            <Text style={styles.sectionSubtitle}>App-only deals refreshed hourly</Text>
          </View>
          <TouchableOpacity onPress={goToFlashSale} activeOpacity={0.7}>
            <Text style={styles.sectionLink}>See More</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.flashRow}
        >
          {flashSaleItems.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.flashCard}
              activeOpacity={0.85}
              onPress={() => navigation.navigate('BuyerProductDetail', { productId: item.id })}
            >
              <View style={styles.flashImageWrapper}>
                <Image source={{ uri: item.image }} style={styles.flashImage} resizeMode="contain" />
                <View style={styles.flashBadge}>
                  <Text style={styles.flashBadgeText}>Flash Sale</Text>
                </View>
              </View>
              <Text style={styles.flashName} numberOfLines={2}>
                {item.name}
              </Text>
              <View style={styles.flashRating}>
                <Ionicons name="star" size={14} color={theme.colors.orange} />
                <Text style={styles.ratingValue}>{item.rating}</Text>
                <Text style={styles.ratingCount}>({item.reviews})</Text>
              </View>
              <View style={styles.flashPrices}>
                <Text style={styles.newPrice}>{formatCurrency(item.price)}</Text>
                <Text style={styles.oldPrice}>{formatCurrency(item.oldPrice)}</Text>
              </View>
              <View style={styles.sellingPoints}>
                {item.sellingPoints.map((point) => (
                  <View key={point} style={styles.sellingChip}>
                    <Text style={styles.sellingChipText}>{point}</Text>
                  </View>
                ))}
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {!user && (
          <View style={styles.signInCard}>
            <View style={styles.signInIcon}>
              <Ionicons name="star-outline" size={22} color={theme.colors.white} />
            </View>
            <View style={styles.signInContent}>
              <Text style={styles.signInTitle}>Sign in for exclusive offers</Text>
              <Text style={styles.signInSubtitle}>Unlock personalised deals, faster checkout and loyalty points.</Text>
            </View>
            <TouchableOpacity
              style={styles.signInButton}
              onPress={() => navigation.navigate('Auth')}
              activeOpacity={0.9}
            >
              <Text style={styles.signInButtonText}>Sign In</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const formatCurrency = (value) => {
  const amount = Number(value) || 0;
  try {
    return `₦${amount.toLocaleString('en-NG')}`;
  } catch (error) {
    return `₦${amount.toLocaleString()}`;
  }
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  contentContainer: {
    paddingBottom: theme.spacing['4xl'] + theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
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
  brand: {
    fontFamily: theme.typography.fontFamily.anton,
    fontSize: theme.typography.fontSize['2xl'],
    color: theme.colors.emerald,
    letterSpacing: theme.typography.letterSpacing.wide,
    textTransform: 'uppercase',
  },
  brandLogo: {
    width: 32,
    height: 32,
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
    width: 6,
    height: 6,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.orange,
  },
  greeting: {
    gap: theme.spacing.xs,
  },
  greetingTitle: {
    fontFamily: theme.typography.fontFamily.interSemiBold,
    fontSize: theme.typography.fontSize.lg,
    color: theme.colors.textPrimary,
  },
  greetingSub: {
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    backgroundColor: theme.colors.white,
    borderRadius: theme.radius.xl,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    ...theme.shadows.card,
  },
  searchInput: {
    flex: 1,
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textPrimary,
  },
  searchButton: {
    backgroundColor: theme.colors.emerald,
    borderRadius: theme.radius.full,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
  },
  searchButtonText: {
    fontFamily: theme.typography.fontFamily.interMedium,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.white,
  },
  heroCard: {
    height: 190,
    borderRadius: theme.radius['2xl'],
    overflow: 'hidden',
    position: 'relative',
  },
  heroImage: {
    borderRadius: theme.radius['2xl'],
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 77, 64, 0.72)',
  },
  heroContent: {
    flex: 1,
    padding: theme.spacing.xl,
    justifyContent: 'center',
    gap: theme.spacing.sm,
  },
  heroBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.radius.full,
  },
  heroBadgeText: {
    fontFamily: theme.typography.fontFamily.interSemiBold,
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.white,
    letterSpacing: theme.typography.letterSpacing.wide,
  },
  heroTitle: {
    fontFamily: theme.typography.fontFamily.anton,
    fontSize: theme.typography.fontSize['2xl'],
    color: theme.colors.white,
    letterSpacing: theme.typography.letterSpacing.wide,
  },
  heroSubtitle: {
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.sm,
    color: 'rgba(255,255,255,0.85)',
    lineHeight: theme.typography.lineHeight.relaxed * theme.typography.fontSize.sm,
  },
  heroCta: {
    marginTop: theme.spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderRadius: theme.radius.full,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
  },
  heroCtaText: {
    fontFamily: theme.typography.fontFamily.interMedium,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.white,
  },
  categoriesSection: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.white,
    borderRadius: theme.radius['2xl'],
    padding: theme.spacing.lg,
    gap: theme.spacing.lg,
    ...theme.shadows.card,
  },
  categoryCard: {
    width: '28%',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  categoryIconWrapper: {
    width: 60,
    height: 60,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.backgroundLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryLabel: {
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textPrimary,
    textAlign: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  sectionTitle: {
    fontFamily: theme.typography.fontFamily.anton,
    fontSize: theme.typography.fontSize.xl,
    color: theme.colors.textPrimary,
    letterSpacing: theme.typography.letterSpacing.wide,
  },
  sectionSubtitle: {
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  sectionLink: {
    fontFamily: theme.typography.fontFamily.interMedium,
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.orange,
  },
  promoRow: {
    gap: theme.spacing.md,
  },
  promoCard: {
    width: 220,
    borderRadius: theme.radius['2xl'],
    padding: theme.spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    ...theme.shadows.medium,
  },
  promoIconCircle: {
    width: 42,
    height: 42,
    borderRadius: theme.radius.full,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  promoContent: {
    flex: 1,
    gap: 4,
  },
  promoTitle: {
    fontFamily: theme.typography.fontFamily.interSemiBold,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.white,
  },
  promoCaption: {
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.xs,
    color: 'rgba(255,255,255,0.75)',
  },
  flashRow: {
    gap: theme.spacing.md,
  },
  flashCard: {
    width: 220,
    borderRadius: theme.radius.xl,
    backgroundColor: theme.colors.white,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
    ...theme.shadows.card,
  },
  flashImageWrapper: {
    position: 'relative',
    backgroundColor: theme.colors.backgroundLight,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
  },
  flashImage: {
    width: '100%',
    height: 120,
  },
  flashBadge: {
    position: 'absolute',
    top: theme.spacing.sm,
    left: theme.spacing.sm,
    backgroundColor: theme.colors.orange,
    borderRadius: theme.radius.full,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
  },
  flashBadgeText: {
    fontFamily: theme.typography.fontFamily.interMedium,
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.white,
  },
  flashName: {
    fontFamily: theme.typography.fontFamily.interMedium,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textPrimary,
    minHeight: 40,
  },
  flashRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingValue: {
    fontFamily: theme.typography.fontFamily.interSemiBold,
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textPrimary,
  },
  ratingCount: {
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textSecondary,
  },
  flashPrices: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  newPrice: {
    fontFamily: theme.typography.fontFamily.anton,
    fontSize: theme.typography.fontSize.lg,
    color: theme.colors.textPrimary,
  },
  oldPrice: {
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textSecondary,
    textDecorationLine: 'line-through',
  },
  sellingPoints: {
    gap: theme.spacing.xs,
  },
  sellingChip: {
    backgroundColor: theme.colors.backgroundLight,
    borderRadius: theme.radius.full,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  sellingChipText: {
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textSecondary,
  },
  signInCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.emerald,
    borderRadius: theme.radius['2xl'],
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  signInIcon: {
    width: 46,
    height: 46,
    borderRadius: theme.radius.full,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  signInContent: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  signInTitle: {
    fontFamily: theme.typography.fontFamily.interSemiBold,
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.white,
  },
  signInSubtitle: {
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.xs,
    color: 'rgba(255,255,255,0.75)',
    lineHeight: theme.typography.lineHeight.relaxed * theme.typography.fontSize.xs,
  },
  signInButton: {
    backgroundColor: theme.colors.orange,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.full,
  },
  signInButtonText: {
    fontFamily: theme.typography.fontFamily.interSemiBold,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.white,
  },
});

export default BuyerHomeScreen;
