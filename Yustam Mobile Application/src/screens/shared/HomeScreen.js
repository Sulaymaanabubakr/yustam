import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  FlatList,
  Dimensions,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { CATEGORIES } from '../../config/constants';
import theme from '../../theme';
import Button from '../../components/Button';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.75;

// Flash Sale Banner Data
const FLASH_SALES = [
  {
    id: '1',
    title: 'New Collection',
    subtitle: 'Flash Sale up to 40% off this weekend',
    buttonText: 'Shop Now',
    color: theme.colors.orange,
  },
  {
    id: '2',
    title: 'Special Offer',
    subtitle: 'Limited time deals on electronics',
    buttonText: 'View Deals',
    color: theme.colors.emerald,
  },
];

// Mock Featured Listings
const FEATURED_LISTINGS = [
  {
    id: '1',
    title: 'iPhone 13 Pro Max',
    price: '₦450,000',
    location: 'Lagos',
    image: 'https://via.placeholder.com/200',
    verified: true,
  },
  {
    id: '2',
    title: 'Samsung Galaxy S21',
    price: '₦280,000',
    location: 'Abuja',
    image: 'https://via.placeholder.com/200',
    verified: true,
  },
  {
    id: '3',
    title: 'MacBook Pro M1',
    price: '₦850,000',
    location: 'Port Harcourt',
    image: 'https://via.placeholder.com/200',
    verified: false,
  },
];

const HomeScreen = ({ navigation }) => {
  const { user, role } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('All Nigeria');
  const scrollX = useRef(new Animated.Value(0)).current;

  const handleSearch = () => {
    // Navigate to search with query
    navigation.navigate('Search', { query: searchQuery });
  };

  const renderFlashSaleBanner = ({ item, index }) => {
    const inputRange = [
      (index - 1) * CARD_WIDTH,
      index * CARD_WIDTH,
      (index + 1) * CARD_WIDTH,
    ];

    const scale = scrollX.interpolate({
      inputRange,
      outputRange: [0.9, 1, 0.9],
      extrapolate: 'clamp',
    });

    return (
      <Animated.View
        style={[
          styles.flashSaleCard,
          { backgroundColor: item.color, transform: [{ scale }] },
        ]}
      >
        <View style={styles.flashSaleContent}>
          <Text style={styles.flashSaleTitle}>{item.title}</Text>
          <Text style={styles.flashSaleSubtitle}>{item.subtitle}</Text>
          <TouchableOpacity style={styles.flashSaleButton}>
            <Text style={styles.flashSaleButtonText}>{item.buttonText}</Text>
            <Ionicons name="arrow-forward" size={16} color={theme.colors.emerald} />
          </TouchableOpacity>
        </View>
      </Animated.View>
    );
  };

  const renderCategoryCard = ({ item }) => (
    <TouchableOpacity
      style={styles.categoryCard}
      onPress={() => navigation.navigate('Search', { category: item })}
      activeOpacity={0.8}
    >
      <View style={styles.categoryIconCircle}>
        <Ionicons name="grid-outline" size={32} color={theme.colors.orange} />
      </View>
      <Text style={styles.categoryLabel}>{item}</Text>
    </TouchableOpacity>
  );

  const renderFeaturedListing = ({ item }) => (
    <TouchableOpacity
      style={styles.listingCard}
      onPress={() => navigation.navigate('ProductDetail', { id: item.id })}
      activeOpacity={0.9}
    >
      <View style={styles.listingImageContainer}>
        <Image source={{ uri: item.image }} style={styles.listingImage} />
        {item.verified && (
          <View style={styles.verifiedBadge}>
            <Ionicons name="checkmark-circle" size={16} color="white" />
          </View>
        )}
      </View>
      <View style={styles.listingInfo}>
        <Text style={styles.listingTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={styles.listingPrice}>{item.price}</Text>
        <View style={styles.listingLocation}>
          <Ionicons name="location-outline" size={14} color={theme.colors.textSecondary} />
          <Text style={styles.listingLocationText}>{item.location}</Text>
        </View>
        <Button variant="primary" size="small" fullWidth style={styles.viewButton}>
          View
        </Button>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Hero / Search Section */}
        <View style={styles.heroSection}>
          <Text style={styles.heroTitle}>
            Everything you need – all in one trusted marketplace
          </Text>
          <Text style={styles.heroSubtitle}>
            Buy and sell safely with Nigeria's most trusted community
          </Text>

          {/* Search Card */}
          <View style={styles.searchCard}>
            <TouchableOpacity style={styles.locationSelector}>
              <Ionicons name="location" size={20} color={theme.colors.orange} />
              <Text style={styles.locationText}>{selectedLocation}</Text>
              <Ionicons name="chevron-down" size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>

            <View style={styles.searchInputContainer}>
              <Ionicons name="search" size={20} color={theme.colors.textSecondary} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search iPhone 13, sneakers, flats..."
                placeholderTextColor={theme.colors.textTertiary}
                value={searchQuery}
                onChangeText={setSearchQuery}
                onSubmitEditing={handleSearch}
              />
            </View>

            <Button
              onPress={handleSearch}
              variant="primary"
              size="large"
              fullWidth
              icon="search"
            >
              Search
            </Button>
          </View>
        </View>

        {/* Flash Sales Banner */}
        <View style={styles.section}>
          <Animated.FlatList
            data={FLASH_SALES}
            renderItem={renderFlashSaleBanner}
            keyExtractor={(item) => item.id}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            snapToInterval={CARD_WIDTH + theme.spacing.base}
            decelerationRate="fast"
            contentContainerStyle={styles.flashSaleList}
            onScroll={Animated.event(
              [{ nativeEvent: { contentOffset: { x: scrollX } } }],
              { useNativeDriver: true }
            )}
          />
        </View>

        {/* Browse by Categories */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Browse by Categories</Text>
          <Text style={styles.sectionSubtitle}>
            Discover a vibrant mix of products and services
          </Text>
          
          <View style={styles.categoryGrid}>
            {CATEGORIES.map((category) => (
              <TouchableOpacity
                key={category}
                style={styles.categoryCard}
                onPress={() => navigation.navigate('Search', { category })}
                activeOpacity={0.8}
              >
                <View style={styles.categoryIconCircle}>
                  <Ionicons name="grid-outline" size={32} color={theme.colors.orange} />
                </View>
                <Text style={styles.categoryLabel}>{category}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Featured Listings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Featured Listings</Text>
          <Text style={styles.sectionSubtitle}>
            Popular items from verified vendors
          </Text>

          <FlatList
            data={FEATURED_LISTINGS}
            renderItem={renderFeaturedListing}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.featuredList}
          />
        </View>
      </ScrollView>

      {/* Vendor FAB */}
      {role === 'vendor' && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => navigation.navigate('CreateListing')}
          activeOpacity={0.9}
        >
          <Ionicons name="add" size={28} color="white" />
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.white,
  },
  scrollContent: {
    paddingBottom: theme.spacing['4xl'],
  },
  heroSection: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing['2xl'],
    backgroundColor: 'linear-gradient(180deg, rgba(234, 220, 207, 0.85), rgba(255, 255, 255, 1))',
  },
  heroTitle: {
    fontFamily: theme.typography.fontFamily.anton,
    fontSize: theme.typography.fontSize['3xl'],
    color: theme.colors.emerald,
    textAlign: 'center',
    marginBottom: theme.spacing.md,
    letterSpacing: theme.typography.letterSpacing.wide,
  },
  heroSubtitle: {
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.xl,
    lineHeight: theme.typography.lineHeight.relaxed * theme.typography.fontSize.base,
  },
  searchCard: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
    ...theme.shadows.card,
  },
  locationSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.base,
    backgroundColor: theme.colors.beige,
    borderRadius: theme.radius.lg,
  },
  locationText: {
    flex: 1,
    fontFamily: theme.typography.fontFamily.interMedium,
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textPrimary,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.base,
    backgroundColor: theme.colors.backgroundLight,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  searchInput: {
    flex: 1,
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textPrimary,
  },
  section: {
    paddingVertical: theme.spacing.xl,
  },
  sectionTitle: {
    fontFamily: theme.typography.fontFamily.anton,
    fontSize: theme.typography.fontSize['2xl'],
    color: theme.colors.emerald,
    marginBottom: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    letterSpacing: theme.typography.letterSpacing.wide,
  },
  sectionSubtitle: {
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
  },
  flashSaleList: {
    paddingHorizontal: theme.spacing.lg,
    gap: theme.spacing.base,
  },
  flashSaleCard: {
    width: CARD_WIDTH,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.xl,
    marginRight: theme.spacing.base,
    ...theme.shadows.medium,
  },
  flashSaleContent: {
    gap: theme.spacing.md,
  },
  flashSaleTitle: {
    fontFamily: theme.typography.fontFamily.anton,
    fontSize: theme.typography.fontSize['2xl'],
    color: 'white',
    letterSpacing: theme.typography.letterSpacing.wide,
  },
  flashSaleSubtitle: {
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.base,
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: theme.typography.lineHeight.relaxed * theme.typography.fontSize.base,
  },
  flashSaleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    alignSelf: 'flex-start',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    backgroundColor: 'white',
    borderRadius: theme.radius.lg,
    marginTop: theme.spacing.md,
  },
  flashSaleButtonText: {
    fontFamily: theme.typography.fontFamily.interSemiBold,
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.emerald,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: theme.spacing.lg,
    gap: theme.spacing.base,
  },
  categoryCard: {
    width: (width - theme.spacing.lg * 2 - theme.spacing.base * 2) / 3,
    backgroundColor: theme.colors.beige,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.base,
    alignItems: 'center',
    gap: theme.spacing.sm,
    ...theme.shadows.soft,
  },
  categoryIconCircle: {
    width: 50,
    height: 50,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryLabel: {
    fontFamily: theme.typography.fontFamily.anton,
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.emerald,
    textAlign: 'center',
    letterSpacing: theme.typography.letterSpacing.normal,
  },
  featuredList: {
    paddingHorizontal: theme.spacing.lg,
    gap: theme.spacing.base,
  },
  listingCard: {
    width: 200,
    backgroundColor: theme.colors.white,
    borderRadius: theme.radius.lg,
    overflow: 'hidden',
    marginRight: theme.spacing.base,
    ...theme.shadows.card,
  },
  listingImageContainer: {
    position: 'relative',
  },
  listingImage: {
    width: '100%',
    height: 150,
    backgroundColor: theme.colors.beige,
  },
  verifiedBadge: {
    position: 'absolute',
    top: theme.spacing.sm,
    right: theme.spacing.sm,
    backgroundColor: theme.colors.success,
    borderRadius: theme.radius.full,
    padding: theme.spacing.xs,
  },
  listingInfo: {
    padding: theme.spacing.md,
    gap: theme.spacing.xs,
  },
  listingTitle: {
    fontFamily: theme.typography.fontFamily.interSemiBold,
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textPrimary,
  },
  listingPrice: {
    fontFamily: theme.typography.fontFamily.anton,
    fontSize: theme.typography.fontSize.lg,
    color: theme.colors.orange,
    letterSpacing: theme.typography.letterSpacing.normal,
  },
  listingLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  listingLocationText: {
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  viewButton: {
    marginTop: theme.spacing.sm,
  },
  fab: {
    position: 'absolute',
    bottom: theme.spacing.xl,
    right: theme.spacing.lg,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: theme.colors.orange,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.strong,
  },
});

export default HomeScreen;
