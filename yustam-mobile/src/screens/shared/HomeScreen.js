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
import { useAuth } from '../../context/AuthContext';
import theme from '../../theme';

const QUICK_CATEGORIES = [
  { id: 'power', label: 'Power', icon: 'flash-outline', background: '#F5FBF7', color: theme.colors.emerald },
  { id: 'audio', label: 'Audio', icon: 'headset-outline', background: '#FBF6FF', color: '#6C4BEF' },
  { id: 'smart', label: 'Smart', icon: 'phone-portrait-outline', background: '#FFF7F3', color: '#F4803A' },
  { id: 'fashion', label: 'Fashion', icon: 'shirt-outline', background: '#F3F9FF', color: '#2D99FF' },
  { id: 'home', label: 'Home', icon: 'home-outline', background: '#FFF5F7', color: '#F06292' },
  { id: 'tools', label: 'Tools', icon: 'construct-outline', background: '#F2FBFB', color: '#0BB5A2' },
  { id: 'deals', label: 'Deals', icon: 'pricetag-outline', background: '#FFF6E5', color: '#F4A259' },
  { id: 'beauty', label: 'Beauty', icon: 'heart-outline', background: '#FFE9F1', color: '#F06292' },
];

const PROMO_CARDS = [
  {
    id: 'promo-1',
    title: 'Game Feast',
    subtitle: 'Up to 40% off gaming gear',
    tag: 'Accessories',
    background: '#22242E',
    accent: '#F5C249',
    image: 'https://res.cloudinary.com/df9qmg3gy/image/upload/v1707249680/game-headset.png',
  },
  {
    id: 'promo-2',
    title: 'Sound Studio',
    subtitle: 'Premium audio, better prices',
    tag: 'Audio',
    background: '#0F6A53',
    accent: '#8EF6C3',
    image: 'https://res.cloudinary.com/df9qmg3gy/image/upload/v1707249680/sound-speaker.png',
  },
];

const FLASH_SALE_ITEMS = [
  {
    id: 'flash-1',
    name: 'Watch Nova HD Video Faces',
    price: 33900,
    oldPrice: 77900,
    rating: 4.8,
    reviews: '4k+',
    image: 'https://res.cloudinary.com/df9qmg3gy/image/upload/v1707249680/smartwatch-green.png',
    badge: 'Flash Sale',
    discount: '54% OFF',
  },
  {
    id: 'flash-2',
    name: 'Ultra Bass Wireless Buds',
    price: 18900,
    oldPrice: 28900,
    rating: 4.6,
    reviews: '2k+',
    image: 'https://res.cloudinary.com/df9qmg3gy/image/upload/v1707249680/buds-black.png',
    badge: 'Hot',
    discount: '35% OFF',
  },
  {
    id: 'flash-3',
    name: 'Soundflow Portable Speaker',
    price: 45900,
    oldPrice: 59900,
    rating: 4.9,
    reviews: '6k+',
    image: 'https://res.cloudinary.com/df9qmg3gy/image/upload/v1707249680/speaker-green.png',
    badge: 'Best Seller',
    discount: '22% OFF',
  },
  {
    id: 'flash-4',
    name: 'Smart Home Ambient Lamp',
    price: 20900,
    oldPrice: 30900,
    rating: 4.5,
    reviews: '1.9k',
    image: 'https://res.cloudinary.com/df9qmg3gy/image/upload/v1707249680/lamp-amber.png',
    badge: 'Limited',
    discount: '32% OFF',
  },
];

const HomeScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');

  const firstName = useMemo(() => {
    if (!user?.displayName) return 'there';
    return user.displayName.split(' ')[0];
  }, [user?.displayName]);

  const handleSearch = () => {
    const trimmedQuery = searchQuery.trim();
    if (!trimmedQuery) {
      return;
    }
    navigation.navigate('Search', { query: trimmedQuery });
  };

  const handleCategoryPress = (category) => {
    navigation.navigate('Search', { category });
  };

  const handlePromoPress = (tag) => {
    navigation.navigate('Search', { category: tag });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>YUSTAM</Text>
            <Text style={styles.welcome}>Hi {firstName}! 👋</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.headerIcon}
              onPress={() => navigation.navigate('Notifications')}
              activeOpacity={0.85}
            >
              <Ionicons name="notifications-outline" size={20} color={theme.colors.textPrimary} />
              <View style={styles.notificationDot} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerIcon}
              onPress={() => navigation.navigate('Chat')}
              activeOpacity={0.85}
            >
              <Ionicons name="cart-outline" size={20} color={theme.colors.textPrimary} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={20} color={theme.colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search gadgets, power banks, buds..."
            placeholderTextColor={theme.colors.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            onSubmitEditing={handleSearch}
          />
          <TouchableOpacity style={styles.filterButton} activeOpacity={0.85}>
            <Ionicons name="options-outline" size={20} color={theme.colors.white} />
          </TouchableOpacity>
        </View>

        <ImageBackground
          source={{ uri: 'https://res.cloudinary.com/df9qmg3gy/image/upload/v1707249680/hero-banner.png' }}
          style={styles.heroCard}
          imageStyle={styles.heroCardImage}
        >
          <View style={styles.heroOverlay} />
          <View style={styles.heroContent}>
            <View style={styles.heroTagWrapper}>
              <Text style={styles.heroTag}>Flash Sale</Text>
            </View>
            <Text style={styles.heroTitle}>Mega Deals Weekend</Text>
            <Text style={styles.heroSubtitle}>Grab limited-time offers on your favourite accessories.</Text>
            <TouchableOpacity
              style={styles.heroButton}
              onPress={() => navigation.navigate('Search', { tag: 'Flash Sale' })}
              activeOpacity={0.85}
            >
              <Text style={styles.heroButtonText}>Shop Deals</Text>
              <Ionicons name="arrow-forward" size={16} color={theme.colors.white} />
            </TouchableOpacity>
          </View>
          <Image
            source={{ uri: 'https://res.cloudinary.com/df9qmg3gy/image/upload/v1707249680/hero-headset.png' }}
            style={styles.heroImage}
            resizeMode="contain"
          />
        </ImageBackground>

        <View style={styles.quickSection}>
          {QUICK_CATEGORIES.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[styles.quickCard, { backgroundColor: item.background }]}
              onPress={() => handleCategoryPress(item.label)}
              activeOpacity={0.85}
            >
              <View style={[styles.quickIconWrapper, { backgroundColor: `${item.color}1A` }]}>
                <Ionicons name={item.icon} size={18} color={item.color} />
              </View>
              <Text style={styles.quickLabel}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Collections For You</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Search')} activeOpacity={0.8}>
            <Text style={styles.sectionLink}>See All</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.promoRow}
        >
          {PROMO_CARDS.map((promo) => (
            <TouchableOpacity
              key={promo.id}
              style={[styles.promoCard, { backgroundColor: promo.background }]}
              onPress={() => handlePromoPress(promo.tag)}
              activeOpacity={0.85}
            >
              <View style={styles.promoTextBlock}>
                <View style={[styles.promoTag, { backgroundColor: `${promo.accent}1F` }]}
                >
                  <Text style={[styles.promoTagText, { color: promo.accent }]}>{promo.tag}</Text>
                </View>
                <Text style={styles.promoTitle}>{promo.title}</Text>
                <Text style={styles.promoSubtitle}>{promo.subtitle}</Text>
              </View>
              <Image source={{ uri: promo.image }} style={styles.promoImage} resizeMode="contain" />
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Flash Sale</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Search', { tag: 'Flash Sale' })} activeOpacity={0.8}>
            <Text style={styles.sectionLink}>See All</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.flashGrid}>
          {FLASH_SALE_ITEMS.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.productCard}
              onPress={() => navigation.navigate('ProductDetail', { id: item.id })}
              activeOpacity={0.9}
            >
              <View style={styles.productImageWrapper}>
                <Image source={{ uri: item.image }} style={styles.productImage} resizeMode="contain" />
                <View style={styles.productBadge}>
                  <Text style={styles.productBadgeText}>{item.badge}</Text>
                </View>
                <View style={styles.discountBadge}>
                  <Text style={styles.discountText}>{item.discount}</Text>
                </View>
              </View>
              <Text style={styles.productName} numberOfLines={2}>
                {item.name}
              </Text>
              <View style={styles.productMeta}>
                <Ionicons name="star" size={14} color={theme.colors.orange} />
                <Text style={styles.productRating}>{item.rating}</Text>
                <Text style={styles.productReviews}>({item.reviews})</Text>
              </View>
              <View style={styles.priceRow}>
                <Text style={styles.productPrice}>{formatCurrency(item.price)}</Text>
                <Text style={styles.productOldPrice}>{formatCurrency(item.oldPrice)}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
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
    backgroundColor: theme.colors.backgroundLight,
  },
  contentContainer: {
    paddingBottom: theme.spacing['4xl'] + 120,
    paddingHorizontal: theme.spacing.lg,
    gap: theme.spacing['2xl'],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: theme.spacing.md,
  },
  brand: {
    fontFamily: theme.typography.fontFamily.anton,
    fontSize: theme.typography.fontSize['2xl'],
    color: theme.colors.emerald,
    letterSpacing: theme.typography.letterSpacing.wide,
  },
  welcome: {
    marginTop: theme.spacing.xs,
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  headerIcon: {
    width: 42,
    height: 42,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.soft,
  },
  notificationDot: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 7,
    height: 7,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.orange,
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
  filterButton: {
    width: 36,
    height: 36,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.emerald,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCard: {
    borderRadius: theme.radius['2xl'],
    overflow: 'hidden',
    height: 180,
    position: 'relative',
  },
  heroCardImage: {
    borderRadius: theme.radius['2xl'],
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 106, 83, 0.82)',
  },
  heroContent: {
    flex: 1,
    padding: theme.spacing.xl,
    justifyContent: 'center',
    maxWidth: '60%',
    gap: theme.spacing.sm,
  },
  heroTagWrapper: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.radius.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  heroTag: {
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
    color: 'rgba(255,255,255,0.8)',
    lineHeight: theme.typography.lineHeight.relaxed * theme.typography.fontSize.sm,
  },
  heroButton: {
    marginTop: theme.spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.14)',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.radius.full,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.24)',
  },
  heroButtonText: {
    fontFamily: theme.typography.fontFamily.interMedium,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.white,
  },
  heroImage: {
    position: 'absolute',
    right: -12,
    bottom: -8,
    width: 180,
    height: 180,
  },
  quickSection: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.md,
  },
  quickCard: {
    width: '47%',
    borderRadius: theme.radius.xl,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  quickIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: theme.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickLabel: {
    fontFamily: theme.typography.fontFamily.interMedium,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textPrimary,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontFamily: theme.typography.fontFamily.anton,
    fontSize: theme.typography.fontSize.xl,
    color: theme.colors.textPrimary,
    letterSpacing: theme.typography.letterSpacing.wide,
  },
  sectionLink: {
    fontFamily: theme.typography.fontFamily.interMedium,
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.emerald,
  },
  promoRow: {
    gap: theme.spacing.md,
  },
  promoCard: {
    width: 250,
    borderRadius: theme.radius['2xl'],
    padding: theme.spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...theme.shadows.medium,
  },
  promoTextBlock: {
    width: '60%',
    gap: theme.spacing.sm,
  },
  promoTag: {
    alignSelf: 'flex-start',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.radius.full,
  },
  promoTagText: {
    fontFamily: theme.typography.fontFamily.interSemiBold,
    fontSize: theme.typography.fontSize.xs,
  },
  promoTitle: {
    fontFamily: theme.typography.fontFamily.anton,
    fontSize: theme.typography.fontSize.lg,
    color: theme.colors.white,
    letterSpacing: theme.typography.letterSpacing.wide,
  },
  promoSubtitle: {
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.xs,
    color: 'rgba(255,255,255,0.75)',
  },
  promoImage: {
    width: 90,
    height: 90,
  },
  flashGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: theme.spacing.lg,
  },
  productCard: {
    width: '47%',
    borderRadius: theme.radius.xl,
    backgroundColor: theme.colors.white,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
    ...theme.shadows.card,
  },
  productImageWrapper: {
    position: 'relative',
    backgroundColor: theme.colors.backgroundLight,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
  },
  productImage: {
    width: '100%',
    height: 110,
  },
  productBadge: {
    position: 'absolute',
    top: theme.spacing.sm,
    left: theme.spacing.sm,
    backgroundColor: 'rgba(15, 106, 83, 0.12)',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.radius.full,
  },
  productBadgeText: {
    fontFamily: theme.typography.fontFamily.interMedium,
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.emerald,
  },
  discountBadge: {
    position: 'absolute',
    top: theme.spacing.sm,
    right: theme.spacing.sm,
    backgroundColor: 'rgba(244, 128, 58, 0.15)',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.radius.full,
  },
  discountText: {
    fontFamily: theme.typography.fontFamily.interSemiBold,
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.orange,
  },
  productName: {
    fontFamily: theme.typography.fontFamily.interMedium,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textPrimary,
    minHeight: 40,
  },
  productMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  productRating: {
    fontFamily: theme.typography.fontFamily.interSemiBold,
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textPrimary,
  },
  productReviews: {
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textSecondary,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  productPrice: {
    fontFamily: theme.typography.fontFamily.anton,
    fontSize: theme.typography.fontSize.lg,
    color: theme.colors.textPrimary,
  },
  productOldPrice: {
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textSecondary,
    textDecorationLine: 'line-through',
  },
});

export default HomeScreen;
