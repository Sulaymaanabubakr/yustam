import React, { useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import theme from '../../theme';
import { getFlashSaleItems } from '../../data/buyerCatalog';

const BuyerFlashSaleScreen = ({ navigation }) => {
  const flashDeals = useMemo(() => getFlashSaleItems(), []);

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.85}
      onPress={() => navigation.navigate('BuyerProductDetail', { productId: item.id })}
    >
      <View style={styles.imageWrapper}>
        <Image source={{ uri: item.image }} style={styles.image} resizeMode="contain" />
        <View style={styles.badge}>
          <Text style={styles.badgeText}>Flash Sale</Text>
        </View>
      </View>
      <Text style={styles.name} numberOfLines={2}>
        {item.name}
      </Text>
      <View style={styles.ratingRow}>
        <Ionicons name="star" size={14} color={theme.colors.orange} />
        <Text style={styles.ratingValue}>{item.rating}</Text>
        <Text style={styles.ratingCount}>({item.reviews})</Text>
      </View>
      <View style={styles.priceRow}>
        <Text style={styles.newPrice}>{formatCurrency(item.price)}</Text>
        <Text style={styles.oldPrice}>{formatCurrency(item.oldPrice)}</Text>
      </View>
      <View style={styles.tagRow}>
        {item.sellingPoints.map((point) => (
          <View key={point} style={styles.tag}>
            <Text style={styles.tagText}>{point}</Text>
          </View>
        ))}
      </View>
    </TouchableOpacity>
  );

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
        <Text style={styles.title}>Flash Sale</Text>
        <View style={styles.headerSpacer} />
      </View>

      <FlatList
        data={flashDeals}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.columnWrapper}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        renderItem={renderItem}
      />
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
    paddingBottom: theme.spacing.md,
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
    textAlign: 'center',
    fontFamily: theme.typography.fontFamily.anton,
    fontSize: theme.typography.fontSize.xl,
    color: theme.colors.textPrimary,
    letterSpacing: theme.typography.letterSpacing.wide,
  },
  headerSpacer: {
    width: 40,
  },
  listContainer: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing['4xl'],
    gap: theme.spacing.lg,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    marginBottom: theme.spacing.lg,
  },
  card: {
    width: '47%',
    backgroundColor: theme.colors.white,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
    ...theme.shadows.card,
  },
  imageWrapper: {
    position: 'relative',
    backgroundColor: theme.colors.backgroundLight,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
  },
  image: {
    width: '100%',
    height: 110,
  },
  badge: {
    position: 'absolute',
    top: theme.spacing.sm,
    left: theme.spacing.sm,
    backgroundColor: theme.colors.orange,
    borderRadius: theme.radius.full,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
  },
  badgeText: {
    fontFamily: theme.typography.fontFamily.interMedium,
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.white,
  },
  name: {
    fontFamily: theme.typography.fontFamily.interMedium,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textPrimary,
    minHeight: 40,
  },
  ratingRow: {
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
  priceRow: {
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
  tagRow: {
    gap: theme.spacing.xs,
  },
  tag: {
    backgroundColor: theme.colors.backgroundLight,
    borderRadius: theme.radius.full,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  tagText: {
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textSecondary,
  },
});

export default BuyerFlashSaleScreen;
