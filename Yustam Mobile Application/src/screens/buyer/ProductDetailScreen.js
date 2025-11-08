import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import theme from '../../theme';
import { getProductById } from '../../data/buyerCatalog';

const BuyerProductDetailScreen = ({ route, navigation }) => {
  const productId = route?.params?.productId;
  const product = useMemo(() => getProductById(productId), [productId]);

  if (!product) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-back" size={20} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title}>Product</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.emptyState}>
          <Ionicons name="cube-outline" size={48} color={theme.colors.textSecondary} />
          <Text style={styles.emptyTitle}>Product unavailable</Text>
          <Text style={styles.emptySubtitle}>We could not load the requested product. Please try again.</Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-back" size={20} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>
          {product.name}
        </Text>
        <TouchableOpacity
          style={styles.headerIcon}
          onPress={() => navigation.navigate('BuyerCart')}
          activeOpacity={0.8}
        >
          <Ionicons name="cart-outline" size={20} color={theme.colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
      >
        <View style={styles.gallery}>
          <Image source={{ uri: product.image }} style={styles.heroImage} resizeMode="contain" />
        </View>

        <View style={styles.infoCard}>
          <View style={styles.badgeRow}>
            {product.badges?.map((badge) => (
              <View key={badge} style={styles.badge}>
                <Text style={styles.badgeText}>{badge}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.productName}>{product.name}</Text>
          <View style={styles.ratingRow}>
            <Ionicons name="star" size={16} color={theme.colors.orange} />
            <Text style={styles.ratingValue}>{product.rating}</Text>
            <Text style={styles.ratingCount}>({product.reviews})</Text>
          </View>
          <View style={styles.priceRow}>
            <Text style={styles.newPrice}>{formatCurrency(product.price)}</Text>
            <Text style={styles.oldPrice}>{formatCurrency(product.oldPrice)}</Text>
          </View>
          <Text style={styles.description}>{product.description}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Why shoppers love it</Text>
          <View style={styles.chipWrap}>
            {product.sellingPoints?.map((point) => (
              <View key={point} style={styles.chip}>
                <Text style={styles.chipText}>{point}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tech specs</Text>
          <View style={styles.specList}>
            {product.specs?.map((spec) => (
              <View key={spec} style={styles.specItem}>
                <Ionicons name="checkmark-circle" size={16} color={theme.colors.emerald} />
                <Text style={styles.specText}>{spec}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Available Colours</Text>
          <View style={styles.colorRow}>
            {product.colors?.map((color) => (
              <View key={color} style={[styles.colorSwatch, { backgroundColor: color }]} />
            ))}
          </View>
        </View>
      </ScrollView>

      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.secondaryButton} activeOpacity={0.85}>
          <Ionicons name="heart-outline" size={20} color={theme.colors.emerald} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.ctaButton} activeOpacity={0.9}>
          <Text style={styles.ctaButtonText}>Add to Cart</Text>
        </TouchableOpacity>
      </View>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.sm,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.soft,
  },
  title: {
    flex: 1,
    marginHorizontal: theme.spacing.md,
    fontFamily: theme.typography.fontFamily.anton,
    fontSize: theme.typography.fontSize.lg,
    color: theme.colors.textPrimary,
    letterSpacing: theme.typography.letterSpacing.wide,
  },
  headerSpacer: {
    width: 40,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.soft,
  },
  contentContainer: {
    paddingBottom: theme.spacing['4xl'] + 80,
  },
  gallery: {
    height: 300,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.white,
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    borderRadius: theme.radius['2xl'],
    ...theme.shadows.card,
  },
  heroImage: {
    width: '75%',
    height: '75%',
  },
  infoCard: {
    marginHorizontal: theme.spacing.lg,
    backgroundColor: theme.colors.white,
    borderRadius: theme.radius['2xl'],
    padding: theme.spacing.lg,
    gap: theme.spacing.sm,
    ...theme.shadows.card,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  badge: {
    backgroundColor: `${theme.colors.orange}20`,
    borderRadius: theme.radius.full,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
  },
  badgeText: {
    fontFamily: theme.typography.fontFamily.interMedium,
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.orange,
  },
  productName: {
    fontFamily: theme.typography.fontFamily.interSemiBold,
    fontSize: theme.typography.fontSize.lg,
    color: theme.colors.textPrimary,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ratingValue: {
    fontFamily: theme.typography.fontFamily.interSemiBold,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textPrimary,
  },
  ratingCount: {
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  newPrice: {
    fontFamily: theme.typography.fontFamily.anton,
    fontSize: theme.typography.fontSize['2xl'],
    color: theme.colors.textPrimary,
  },
  oldPrice: {
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    textDecorationLine: 'line-through',
  },
  description: {
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    lineHeight: theme.typography.lineHeight.relaxed * theme.typography.fontSize.sm,
  },
  section: {
    marginTop: theme.spacing.xl,
    marginHorizontal: theme.spacing.lg,
    backgroundColor: theme.colors.white,
    borderRadius: theme.radius['2xl'],
    padding: theme.spacing.lg,
    gap: theme.spacing.base,
    ...theme.shadows.card,
  },
  sectionTitle: {
    fontFamily: theme.typography.fontFamily.anton,
    fontSize: theme.typography.fontSize.lg,
    color: theme.colors.textPrimary,
    letterSpacing: theme.typography.letterSpacing.wide,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  chip: {
    backgroundColor: theme.colors.backgroundLight,
    borderRadius: theme.radius.full,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
  },
  chipText: {
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textSecondary,
  },
  specList: {
    gap: theme.spacing.sm,
  },
  specItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  specText: {
    flex: 1,
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textPrimary,
  },
  colorRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  colorSwatch: {
    width: 36,
    height: 36,
    borderRadius: theme.radius.full,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: theme.spacing.lg,
    flexDirection: 'row',
    gap: theme.spacing.md,
    backgroundColor: theme.colors.white,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  secondaryButton: {
    width: 56,
    height: 56,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.backgroundLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaButton: {
    flex: 1,
    backgroundColor: theme.colors.emerald,
    borderRadius: theme.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.md,
  },
  ctaButtonText: {
    fontFamily: theme.typography.fontFamily.interSemiBold,
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.white,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: theme.spacing.lg,
    paddingHorizontal: theme.spacing.xl,
  },
  emptyTitle: {
    fontFamily: theme.typography.fontFamily.interSemiBold,
    fontSize: theme.typography.fontSize.lg,
    color: theme.colors.textPrimary,
  },
  emptySubtitle: {
    textAlign: 'center',
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    lineHeight: theme.typography.lineHeight.relaxed * theme.typography.fontSize.sm,
  },
  primaryButton: {
    backgroundColor: theme.colors.emerald,
    borderRadius: theme.radius.full,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
  },
  primaryButtonText: {
    fontFamily: theme.typography.fontFamily.interSemiBold,
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.white,
  },
});

export default BuyerProductDetailScreen;
