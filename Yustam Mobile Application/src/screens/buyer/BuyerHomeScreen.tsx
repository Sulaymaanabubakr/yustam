import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  FlatList,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, SHADOWS } from '../../constants/theme';

interface Category {
  id: string;
  name: string;
  icon: string;
}

interface Product {
  id: string;
  name: string;
  price: string;
  rating: number;
  reviews: number;
  image: string;
}

const categories: Category[] = [
  { id: '1', name: 'Phones', icon: '📱' },
  { id: '2', name: 'Laptops', icon: '💻' },
  { id: '3', name: 'TVs', icon: '📺' },
  { id: '4', name: 'Headset', icon: '🎧' },
  { id: '5', name: 'Fashion', icon: '👕' },
  { id: '6', name: 'Beauty', icon: '💄' },
];

const popularProducts: Product[] = [
  {
    id: '1',
    name: 'iPhone 15 Pro',
    price: '₦1,250,000',
    rating: 4.8,
    reviews: 234,
    image: '📱',
  },
  {
    id: '2',
    name: 'Samsung Galaxy S24',
    price: '₦950,000',
    rating: 4.7,
    reviews: 189,
    image: '📱',
  },
  {
    id: '3',
    name: 'MacBook Pro',
    price: '₦2,100,000',
    rating: 4.9,
    reviews: 345,
    image: '💻',
  },
];

const BuyerHomeScreen: React.FC = () => {
  const renderCategory = ({ item }: { item: Category }) => (
    <TouchableOpacity style={styles.categoryCard}>
      <Text style={styles.categoryIcon}>{item.icon}</Text>
      <Text style={styles.categoryName}>{item.name}</Text>
    </TouchableOpacity>
  );

  const renderProduct = ({ item }: { item: Product }) => (
    <View style={styles.productCard}>
      <View style={styles.productImageContainer}>
        <Text style={styles.productEmoji}>{item.image}</Text>
      </View>
      <View style={styles.productInfo}>
        <Text style={styles.productName} numberOfLines={2}>
          {item.name}
        </Text>
        <Text style={styles.productPrice}>{item.price}</Text>
        <View style={styles.ratingContainer}>
          <Text style={styles.ratingStar}>⭐</Text>
          <Text style={styles.ratingText}>
            {item.rating} ({item.reviews})
          </Text>
        </View>
      </View>
      <TouchableOpacity style={styles.orderButton}>
        <Text style={styles.orderButtonText}>Order Now</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.locationContainer}>
          <Text style={styles.locationIcon}>📍</Text>
          <Text style={styles.locationText}>Lagos, Nigeria</Text>
        </View>
        <TouchableOpacity style={styles.notificationButton}>
          <Text style={styles.notificationIcon}>🔔</Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search products, vendors..."
          placeholderTextColor={COLORS.gray500}
        />
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Promotional Banner */}
        <LinearGradient
          colors={[COLORS.orange, COLORS.orangeDeep]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.banner}
        >
          <View style={styles.bannerContent}>
            <View style={styles.bannerTextContainer}>
              <Text style={styles.bannerTitle}>New Collection</Text>
              <Text style={styles.bannerSubtitle}>
                Flash Sale up to 40% off this weekend
              </Text>
              <TouchableOpacity style={styles.shopNowButton}>
                <Text style={styles.shopNowText}>Shop Now</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.bannerImageContainer}>
              <Text style={styles.bannerEmoji}>🎁</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Categories Section */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Category</Text>
            <TouchableOpacity>
              <Text style={styles.seeAllText}>See All →</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={categories}
            renderItem={renderCategory}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryList}
          />
        </View>

        {/* Popular Products Section */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Popular Now</Text>
            <TouchableOpacity>
              <Text style={styles.seeAllText}>See All →</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={popularProducts}
            renderItem={renderProduct}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.productList}
          />
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xxl + 10,
    paddingBottom: SPACING.md,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationIcon: {
    fontSize: 16,
    marginRight: SPACING.xs,
  },
  locationText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.ink,
  },
  notificationButton: {
    width: 40,
    height: 40,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.beige,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationIcon: {
    fontSize: 20,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.gray100,
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.lg,
  },
  searchIcon: {
    fontSize: 20,
    marginRight: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: FONT_SIZES.md,
    color: COLORS.ink,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: SPACING.xxl,
  },
  banner: {
    marginHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.xl,
    ...SHADOWS.large,
  },
  bannerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  bannerTextContainer: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: SPACING.xs,
  },
  bannerSubtitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.white,
    marginBottom: SPACING.md,
    lineHeight: 18,
  },
  shopNowButton: {
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    alignSelf: 'flex-start',
  },
  shopNowText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '700',
    color: COLORS.orange,
  },
  bannerImageContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  bannerEmoji: {
    fontSize: 60,
  },
  sectionContainer: {
    marginBottom: SPACING.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: 'bold',
    color: COLORS.ink,
  },
  seeAllText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.orange,
  },
  categoryList: {
    paddingHorizontal: SPACING.lg,
  },
  categoryCard: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginRight: SPACING.md,
    alignItems: 'center',
    width: 100,
    ...SHADOWS.small,
  },
  categoryIcon: {
    fontSize: 32,
    marginBottom: SPACING.xs,
  },
  categoryName: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.ink,
  },
  productList: {
    paddingHorizontal: SPACING.lg,
  },
  productCard: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginRight: SPACING.md,
    width: 180,
    ...SHADOWS.medium,
  },
  productImageContainer: {
    backgroundColor: COLORS.gray100,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.lg,
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  productEmoji: {
    fontSize: 48,
  },
  productInfo: {
    marginBottom: SPACING.sm,
  },
  productName: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.ink,
    marginBottom: SPACING.xs,
  },
  productPrice: {
    fontSize: FONT_SIZES.lg,
    fontWeight: 'bold',
    color: COLORS.orange,
    marginBottom: SPACING.xs,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingStar: {
    fontSize: 12,
    marginRight: SPACING.xs,
  },
  ratingText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.gray600,
  },
  orderButton: {
    backgroundColor: COLORS.emerald,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
  },
  orderButtonText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '700',
    color: COLORS.white,
  },
});

export default BuyerHomeScreen;
