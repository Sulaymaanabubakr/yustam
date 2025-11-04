import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  FlatList,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, SHADOWS } from '../../constants/theme';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

interface Category {
  id: string;
  name: string;
  icon: IoniconName;
}

interface Product {
  id: string;
  name: string;
  price: string;
  rating: number;
  reviews: number;
  icon: IoniconName;
}

interface Vendor {
  id: string;
  name: string;
  category: string;
  deliveryTime: string;
  icon: IoniconName;
}

const categories: Category[] = [
  { id: 'phones', name: 'Phones', icon: 'phone-portrait' },
  { id: 'laptops', name: 'Laptops', icon: 'laptop-outline' },
  { id: 'tvs', name: 'TV & Audio', icon: 'tv-outline' },
  { id: 'gaming', name: 'Gaming', icon: 'game-controller-outline' },
  { id: 'fashion', name: 'Fashion', icon: 'shirt-outline' },
  { id: 'beauty', name: 'Beauty', icon: 'color-palette-outline' },
];

const popularProducts: Product[] = [
  {
    id: 'iphone-15-pro',
    name: 'iPhone 15 Pro',
    price: 'NGN 1,250,000',
    rating: 4.8,
    reviews: 234,
    icon: 'phone-portrait-outline',
  },
  {
    id: 'galaxy-s24',
    name: 'Samsung Galaxy S24',
    price: 'NGN 950,000',
    rating: 4.7,
    reviews: 189,
    icon: 'hardware-chip-outline',
  },
  {
    id: 'macbook-pro',
    name: 'MacBook Pro 14"',
    price: 'NGN 2,100,000',
    rating: 4.9,
    reviews: 345,
    icon: 'laptop-outline',
  },
];

const featuredVendors: Vendor[] = [
  {
    id: 'bright-electronics',
    name: 'Bright Electronics',
    category: 'Verified Vendor - Electronics',
    deliveryTime: 'Same day delivery',
    icon: 'briefcase-outline',
  },
  {
    id: 'city-fashion',
    name: 'City Fashion Hub',
    category: 'Verified Vendor - Fashion',
    deliveryTime: 'Delivers in 24 hrs',
    icon: 'bag-handle-outline',
  },
];

const BuyerHomeScreen: React.FC = () => {
  const renderCategory = ({ item }: { item: Category }) => (
    <TouchableOpacity style={styles.categoryCard}>
      <Ionicons name={item.icon} size={28} color={COLORS.orange} />
      <Text style={styles.categoryName}>{item.name}</Text>
    </TouchableOpacity>
  );

  const renderProduct = ({ item }: { item: Product }) => (
    <View style={styles.productCard}>
      <View style={styles.productIconContainer}>
        <Ionicons name={item.icon} size={40} color={COLORS.emerald} />
      </View>
      <Text style={styles.productName} numberOfLines={2}>
        {item.name}
      </Text>
      <Text style={styles.productPrice}>{item.price}</Text>
      <View style={styles.ratingContainer}>
        <Ionicons name="star" size={16} color={COLORS.orange} />
        <Text style={styles.ratingText}>
          {item.rating.toFixed(1)} ({item.reviews})
        </Text>
      </View>
      <TouchableOpacity style={styles.orderButton}>
        <Text style={styles.orderButtonText}>Order Now</Text>
      </TouchableOpacity>
    </View>
  );

  const renderVendor = ({ item }: { item: Vendor }) => (
    <View style={styles.vendorCard}>
      <View style={styles.vendorIcon}>
        <Ionicons name={item.icon} size={22} color={COLORS.white} />
      </View>
      <View style={styles.vendorDetails}>
        <Text style={styles.vendorName}>{item.name}</Text>
        <Text style={styles.vendorCategory}>{item.category}</Text>
        <View style={styles.vendorMeta}>
          <Ionicons name="time-outline" size={14} color={COLORS.emerald} />
          <Text style={styles.vendorMetaText}>{item.deliveryTime}</Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={20} color={COLORS.gray400} />
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.welcomeText}>Welcome to YUSTAM</Text>
          <View style={styles.locationContainer}>
            <Ionicons name="location-sharp" size={16} color={COLORS.orange} />
            <Text style={styles.locationText}>Lagos, Nigeria</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.notificationButton}>
          <Ionicons name="notifications-outline" size={22} color={COLORS.ink} />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color={COLORS.gray500} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search products, vendors, categories"
          placeholderTextColor={COLORS.gray500}
        />
        <TouchableOpacity style={styles.filterButton}>
          <Ionicons name="options-outline" size={18} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient
          colors={[COLORS.orange, COLORS.orangeDeep]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.banner}
        >
          <View style={styles.bannerTextContainer}>
            <Text style={styles.bannerTitle}>Mega Gadget Deals</Text>
            <Text style={styles.bannerSubtitle}>
              Shop verified vendors and enjoy secure delivery to your doorstep.
            </Text>
            <TouchableOpacity style={styles.shopNowButton}>
              <Text style={styles.shopNowText}>Shop now</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.bannerIconContainer}>
            <Ionicons name="bag-handle" size={72} color={COLORS.white} />
          </View>
        </LinearGradient>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Popular Categories</Text>
            <TouchableOpacity>
              <Text style={styles.seeAllText}>See all</Text>
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

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Trending Products</Text>
            <TouchableOpacity>
              <Text style={styles.seeAllText}>View more</Text>
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

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Featured Vendors</Text>
            <TouchableOpacity>
              <Text style={styles.seeAllText}>Discover all</Text>
            </TouchableOpacity>
          </View>
          {featuredVendors.map((vendor) => (
            <View key={vendor.id} style={styles.vendorWrapper}>
              {renderVendor({ item: vendor })}
            </View>
          ))}
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
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.md,
  },
  welcomeText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.gray600,
    marginBottom: SPACING.xs,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  locationText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.gray600,
    fontWeight: '600',
  },
  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.gray100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.gray100,
    marginHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    gap: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: FONT_SIZES.md,
    color: COLORS.ink,
  },
  filterButton: {
    width: 40,
    height: 40,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.emerald,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingBottom: SPACING.xxl,
  },
  banner: {
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.lg,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'center',
    ...SHADOWS.large,
  },
  bannerTextContainer: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: SPACING.sm,
  },
  bannerSubtitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.white,
    opacity: 0.9,
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
  bannerIconContainer: {
    marginLeft: SPACING.lg,
  },
  section: {
    marginTop: SPACING.xl,
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
    gap: SPACING.md,
  },
  categoryCard: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.xl,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.small,
  },
  categoryName: {
    marginTop: SPACING.sm,
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.ink,
  },
  productList: {
    paddingHorizontal: SPACING.lg,
    gap: SPACING.md,
  },
  productCard: {
    width: 200,
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    ...SHADOWS.medium,
  },
  productIconContainer: {
    alignSelf: 'flex-start',
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
    fontWeight: '700',
    color: COLORS.orange,
    marginBottom: SPACING.sm,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: SPACING.sm,
  },
  ratingText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.gray600,
    fontWeight: '500',
  },
  orderButton: {
    marginTop: SPACING.sm,
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
  vendorWrapper: {
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
  },
  vendorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    ...SHADOWS.small,
  },
  vendorIcon: {
    width: 44,
    height: 44,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.emerald,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  vendorDetails: {
    flex: 1,
  },
  vendorName: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.ink,
  },
  vendorCategory: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.gray600,
    marginTop: SPACING.xs,
  },
  vendorMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginTop: SPACING.xs,
  },
  vendorMetaText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.emerald,
    fontWeight: '600',
  },
});

export default BuyerHomeScreen;
