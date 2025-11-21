import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import theme from '../../theme';
import { formatNaira } from '../../utils/formatters';
import { describePreference, filterListingsByPreference, getBotPreferences } from '../../utils/aiPreferences';
import {
  getRecentlyViewedListings,
  clearRecentlyViewedListings,
} from '../../storage/recentlyViewed';

const BuyerRecentlyViewedScreen = ({ navigation }) => {
  const [items, setItems] = useState([]);
  const [rawItems, setRawItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [preference, setPreference] = useState(null);
  const [preferenceLabel, setPreferenceLabel] = useState(null);
  const [preferenceLoaded, setPreferenceLoaded] = useState(false);
  const [localityFallbackActive, setLocalityFallbackActive] = useState(false);

  const loadListings = useCallback(async () => {
    setLoading(true);
    const listings = await getRecentlyViewedListings();
    setRawItems(listings);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const syncData = async () => {
        try {
          await loadListings();
          const settings = await getBotPreferences();
          if (!isActive) {
            return;
          }
          setPreference(settings);
          setPreferenceLabel(describePreference(settings));
        } catch (prefError) {
          console.warn('BuyerRecentlyViewedScreen preference error:', prefError);
          if (!isActive) {
            return;
          }
          setPreference(null);
          setPreferenceLabel(null);
        } finally {
          if (isActive) {
            setPreferenceLoaded(true);
          }
        }
      };

      syncData();

      return () => {
        isActive = false;
      };
    }, [loadListings])
  );

  const handleClear = async () => {
    await clearRecentlyViewedListings();
    loadListings();
  };

  useEffect(() => {
    if (!preference || preference.mode !== 'local') {
      setItems(rawItems);
      setLocalityFallbackActive(false);
      return;
    }

    const filtered = filterListingsByPreference(rawItems, preference);
    if (filtered.length) {
      setItems(filtered);
      setLocalityFallbackActive(false);
    } else {
      setItems(rawItems);
      setLocalityFallbackActive(Boolean(rawItems.length));
    }
  }, [preference, rawItems]);

  const listHeader = useMemo(() => {
    if (!preferenceLoaded || preference?.mode !== 'local') {
      return null;
    }
    return (
      <View
        style={[
          styles.preferenceBanner,
          localityFallbackActive && styles.preferenceBannerWarning,
        ]}
      >
        <Ionicons
          name={localityFallbackActive ? 'alert-circle' : 'location'}
          size={16}
          color={localityFallbackActive ? theme.colors.warning : theme.colors.emerald}
        />
        <Text style={styles.preferenceBannerText}>
          {localityFallbackActive
            ? `No recently viewed items near ${preferenceLabel || 'your location'} yet. Showing your full history instead.`
            : `Showing recently viewed items near ${preferenceLabel || 'your location'}.`}
        </Text>
        <TouchableOpacity
          style={styles.preferenceBannerButton}
          onPress={() => navigation.navigate('Bot')}
          activeOpacity={0.85}
        >
          <Text style={styles.preferenceBannerButtonText}>Adjust</Text>
        </TouchableOpacity>
      </View>
    );
  }, [preferenceLoaded, preference?.mode, localityFallbackActive, preferenceLabel, navigation]);

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('BuyerProductDetail', { productId: item.id })}
      activeOpacity={0.85}
    >
      <View style={styles.cardImageWrapper}>
        {item.image ? (
          <Image source={{ uri: item.image }} style={styles.cardImage} resizeMode="cover" />
        ) : (
          <View style={styles.cardPlaceholder}>
            <Ionicons name="image" size={22} color={theme.colors.textSecondary} />
          </View>
        )}
      </View>

      <View style={styles.cardBody}>
        <Text style={styles.cardTitle} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.cardMeta}>
          {item.category ? `${item.category} • ` : ''}
          {item.location || 'Nigeria'}
        </Text>
        <Text style={styles.cardPrice}>{formatNaira(item.price)}</Text>
        <Text style={styles.cardTimestamp}>
          Viewed {new Date(item.viewedAt).toLocaleString()}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
    </TouchableOpacity>
  );

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <Ionicons name="time-outline" size={28} color={theme.colors.textSecondary} />
      <Text style={styles.emptyTitle}>No recently viewed items yet</Text>
      <Text style={styles.emptySubtitle}>
        Explore the marketplace and your viewed products will show up here.
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Recently Viewed</Text>
        <TouchableOpacity onPress={handleClear} disabled={!items.length} style={styles.clearButton}>
          <Text style={[styles.clearButtonText, !items.length && styles.clearDisabled]}>Clear</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingState}>
          <ActivityIndicator color={theme.colors.orange} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={listHeader}
          ListEmptyComponent={renderEmpty}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.backgroundLight,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: theme.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.white,
    ...theme.shadows.soft,
  },
  headerTitle: {
    fontFamily: theme.typography.fontFamily.interSemiBold,
    fontSize: theme.typography.fontSize.lg,
    color: theme.colors.textPrimary,
  },
  clearButton: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  clearButtonText: {
    fontFamily: theme.typography.fontFamily.interSemiBold,
    color: theme.colors.orange,
  },
  clearDisabled: {
    color: theme.colors.textTertiary,
  },
  loadingState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing['3xl'],
    gap: theme.spacing.sm,
  },
  preferenceBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    backgroundColor: `${theme.colors.emerald}12`,
    borderRadius: theme.radius.lg,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  preferenceBannerWarning: {
    backgroundColor: `${theme.colors.warning}12`,
  },
  preferenceBannerText: {
    flex: 1,
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textSecondary,
  },
  preferenceBannerButton: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.white,
    borderWidth: 1,
    borderColor: `${theme.colors.emerald}35`,
  },
  preferenceBannerButtonText: {
    fontFamily: theme.typography.fontFamily.interSemiBold,
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.emerald,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.white,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.md,
    gap: theme.spacing.md,
    ...theme.shadows.card,
  },
  cardImageWrapper: {
    width: 64,
    height: 64,
    borderRadius: theme.radius.lg,
    overflow: 'hidden',
    backgroundColor: theme.colors.background,
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  cardPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: {
    flex: 1,
    gap: 2,
  },
  cardTitle: {
    fontFamily: theme.typography.fontFamily.interSemiBold,
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textPrimary,
  },
  cardMeta: {
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textSecondary,
  },
  cardPrice: {
    fontFamily: theme.typography.fontFamily.anton,
    fontSize: theme.typography.fontSize.lg,
    color: theme.colors.textPrimary,
  },
  cardTimestamp: {
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textTertiary,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: theme.spacing['3xl'],
    paddingHorizontal: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  emptyTitle: {
    fontFamily: theme.typography.fontFamily.interSemiBold,
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textPrimary,
  },
  emptySubtitle: {
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
});

export default BuyerRecentlyViewedScreen;
