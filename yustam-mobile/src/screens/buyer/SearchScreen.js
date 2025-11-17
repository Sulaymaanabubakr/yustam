import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import theme from '../../theme';
import { CATEGORIES, STATES } from '../../config/constants';
import {
  collection,
  getDocs,
  limit,
  orderBy,
  query as buildFirestoreQuery,
  startAfter,
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { formatNaira } from '../../utils/formatters';
import { normalizeFirestoreListing } from '../../utils/listingTransforms';

const PAGE_SIZE = 40;

const PRICE_RANGES = [
  { id: 'all', label: 'Any price', min: 0, max: Infinity },
  { id: 'under-20k', label: 'Under ₦20k', min: 0, max: 20000 },
  { id: '20-50k', label: '₦20k - ₦50k', min: 20000, max: 50000 },
  { id: '50-150k', label: '₦50k - ₦150k', min: 50000, max: 150000 },
  { id: '150-plus', label: '₦150k+', min: 150000, max: Infinity },
];

const SORT_OPTIONS = [
  { id: 'trending', label: 'Trending' },
  { id: 'newest', label: 'Newest' },
  { id: 'priceLowHigh', label: 'Price: Low' },
  { id: 'priceHighLow', label: 'Price: High' },
];

const FALLBACK_IMAGE = 'https://res.cloudinary.com/df9qmg3gy/image/upload/v1707249680/phone-blue.png';

const FilterSelect = ({ label, value, onPress, isActive }) => (
  <TouchableOpacity style={[styles.filterSelect, isActive && styles.filterSelectActive]} onPress={onPress} activeOpacity={0.85}>
    <View style={styles.filterSelectTextGroup}>
      <Text style={styles.filterSelectLabel}>{label}</Text>
      <Text style={styles.filterSelectValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
    <Ionicons name={isActive ? 'chevron-up' : 'chevron-down'} size={16} color={theme.colors.textSecondary} />
  </TouchableOpacity>
);

const FilterModal = ({ visible, title, options, onClose }) => (
  <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
    <TouchableWithoutFeedback onPress={onClose}>
      <View style={styles.modalBackdrop}>
        <TouchableWithoutFeedback>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{title}</Text>
              <TouchableOpacity onPress={onClose} activeOpacity={0.8}>
                <Ionicons name="close" size={20} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {options.map((option) => (
                <TouchableOpacity
                  key={option.key}
                  style={[styles.modalOption, option.selected && styles.modalOptionSelected]}
                  activeOpacity={0.85}
                  onPress={option.onPress}
                >
                  <View style={styles.modalOptionCopy}>
                    <Text style={[styles.modalOptionLabel, option.selected && styles.modalOptionLabelSelected]}>
                      {option.label}
                    </Text>
                    {option.helper ? (
                      <Text style={styles.modalOptionHelper}>{option.helper}</Text>
                    ) : null}
                  </View>
                  {option.selected ? (
                    <Ionicons name="checkmark-circle" size={20} color={theme.colors.primary} />
                  ) : (
                    <Ionicons name="ellipse-outline" size={18} color={theme.colors.textTertiary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableWithoutFeedback>
      </View>
    </TouchableWithoutFeedback>
  </Modal>
);

const BuyerSearchScreen = ({ navigation, route }) => {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedPriceRange, setSelectedPriceRange] = useState(PRICE_RANGES[0]);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [selectedSort, setSelectedSort] = useState(SORT_OPTIONS[0]);
  const [listings, setListings] = useState([]);
  const [totalResults, setTotalResults] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [activeFilterKey, setActiveFilterKey] = useState(null);
  const [pageMeta, setPageMeta] = useState({ page: 1, perPage: PAGE_SIZE, hasMore: false });
  const lastVisibleRef = useRef(null);

  useEffect(() => {
    const handle = setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 250);

    return () => clearTimeout(handle);
  }, [query]);

  useEffect(() => {
    const incomingQuery = route?.params?.query;
    if (incomingQuery) {
      setQuery(incomingQuery);
    }
    const incomingCategory = route?.params?.category;
    if (incomingCategory) {
      setSelectedCategory(incomingCategory);
    }
  }, [route?.params?.query, route?.params?.category]);

  const fetchListings = useCallback(
    async ({ page: pageOverride = 1, reset = false } = {}) => {
      if (reset) {
        setLoading(true);
        setError('');
        lastVisibleRef.current = null;
      } else {
        if (!pageMeta.hasMore || !lastVisibleRef.current) {
          setPageMeta((prev) => ({ ...prev, hasMore: false }));
          return;
        }
        setLoadingMore(true);
      }

      try {
        const constraints = [orderBy('createdAt', 'desc'), limit(PAGE_SIZE)];
        if (!reset && lastVisibleRef.current) {
          constraints.push(startAfter(lastVisibleRef.current));
        }

        const snapshot = await getDocs(buildFirestoreQuery(collection(db, 'listings'), ...constraints));
        const docs = snapshot.docs;
        if (docs.length) {
          lastVisibleRef.current = docs[docs.length - 1];
        } else if (reset) {
          lastVisibleRef.current = null;
        }

        const mapped = docs.map(normalizeFirestoreListing).filter(Boolean);

        setListings((prev) => (reset ? mapped : [...prev, ...mapped]));
        setTotalResults((prev) => (reset ? mapped.length : prev + mapped.length));

        const hasMore = docs.length === PAGE_SIZE;
        setPageMeta({
          page: reset ? 1 : pageOverride,
          perPage: PAGE_SIZE,
          hasMore,
        });

        if (reset && !mapped.length) {
          setError('');
        }
      } catch (requestError) {
        const fallbackMessage = requestError?.message || 'Unable to fetch marketplace listings right now.';
        setError(fallbackMessage);
        if (reset) {
          setListings([]);
          setTotalResults(0);
          setPageMeta({ page: 1, perPage: PAGE_SIZE, hasMore: false });
        }
      } finally {
        if (reset) {
          setLoading(false);
          setRefreshing(false);
        } else {
          setLoadingMore(false);
        }
      }
    },
    [pageMeta.hasMore]
  );

  useEffect(() => {
    fetchListings({ page: 1, reset: true });
  }, [fetchListings]);

  const handleSelect = (item) => {
    navigation.navigate('BuyerProductDetail', { productId: item.id });
  };

  const handleClearFilters = () => {
    setQuery('');
    setSelectedCategory(null);
    setSelectedPriceRange(PRICE_RANGES[0]);
    setSelectedLocation(null);
    setSelectedSort(SORT_OPTIONS[0]);
    setActiveFilterKey(null);
  };

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchListings({ page: 1, reset: true });
  }, [fetchListings]);

  const handleLoadMore = useCallback(() => {
    if (loading || loadingMore || !pageMeta.hasMore) {
      return;
    }
    const nextPage = (pageMeta.page || 1) + 1;
    fetchListings({ page: nextPage, reset: false });
  }, [fetchListings, loading, loadingMore, pageMeta]);

  const filteredResults = useMemo(() => {
    const matches = listings.filter((item) => {
      const normalizedQuery = debouncedQuery.toLowerCase();
      const matchesQuery = normalizedQuery
        ? [item.name, item.category, item.vendor]
            .filter(Boolean)
            .some((value) => value.toLowerCase().includes(normalizedQuery))
        : true;

      const matchesCategory = !selectedCategory || item.category?.toLowerCase() === selectedCategory.toLowerCase();
      const matchesLocation =
        !selectedLocation || item.location?.toLowerCase().includes(selectedLocation.toLowerCase());
      const matchesPrice = priceMatches(selectedPriceRange, item.price);

      return matchesQuery && matchesCategory && matchesLocation && matchesPrice;
    });

    return sortResults(matches, selectedSort);
  }, [debouncedQuery, listings, selectedCategory, selectedLocation, selectedPriceRange, selectedSort]);

  const activeFilters = useMemo(() => {
    const filters = [];
    if (selectedCategory) {
      filters.push({ key: 'category', label: selectedCategory, onClear: () => setSelectedCategory(null) });
    }
    if (selectedLocation) {
      filters.push({ key: 'location', label: selectedLocation, onClear: () => setSelectedLocation(null) });
    }
    if (selectedPriceRange && selectedPriceRange.id !== 'all') {
      filters.push({
        key: 'price',
        label: selectedPriceRange.label,
        onClear: () => setSelectedPriceRange(PRICE_RANGES[0]),
      });
    }
    if (selectedSort && selectedSort.id !== 'trending') {
      filters.push({ key: 'sort', label: selectedSort.label, onClear: () => setSelectedSort(SORT_OPTIONS[0]) });
    }
    if (debouncedQuery) {
      filters.push({ key: 'query', label: `“${debouncedQuery}”`, onClear: () => setQuery('') });
    }
    return filters;
  }, [debouncedQuery, selectedCategory, selectedLocation, selectedPriceRange, selectedSort]);

  const modalConfig = useMemo(() => {
    if (!activeFilterKey) {
      return null;
    }

    if (activeFilterKey === 'category') {
      const options = [
        {
          key: 'category-all',
          label: 'All categories',
          selected: !selectedCategory,
          onSelect: () => setSelectedCategory(null),
        },
        ...CATEGORIES.map((category) => ({
          key: `category-${category}`,
          label: category,
          selected: selectedCategory === category,
          onSelect: () => setSelectedCategory(category),
        })),
      ];
      return { title: 'Select category', options };
    }

    if (activeFilterKey === 'price') {
      const options = PRICE_RANGES.map((range) => ({
        key: `price-${range.id}`,
        label: range.label,
        selected: selectedPriceRange?.id === range.id,
        onSelect: () => setSelectedPriceRange(range),
      }));
      return { title: 'Select price range', options };
    }

    if (activeFilterKey === 'location') {
      const stateOptions = [
        {
          key: 'location-all',
          label: 'All locations',
          helper: 'Nationwide',
          selected: !selectedLocation,
          onSelect: () => setSelectedLocation(null),
        },
        ...STATES.map((state) => ({
          key: `location-${state}`,
          label: state,
          selected: selectedLocation === state,
          onSelect: () => setSelectedLocation(state),
        })),
      ];
      return { title: 'Select location', options: stateOptions };
    }

    if (activeFilterKey === 'sort') {
      const options = SORT_OPTIONS.map((option) => ({
        key: `sort-${option.id}`,
        label: option.label,
        selected: selectedSort?.id === option.id,
        onSelect: () => setSelectedSort(option),
      }));
      return { title: 'Sort listings', options };
    }

    return null;
  }, [activeFilterKey, selectedCategory, selectedLocation, selectedPriceRange, selectedSort]);

  const renderProduct = ({ item }) => (
    <TouchableOpacity style={styles.productCard} onPress={() => handleSelect(item)} activeOpacity={0.92}>
      <View style={styles.productImageWrapper}>
        {item.image ? (
          <>
            <Image source={{ uri: item.image }} style={styles.productImage} resizeMode="cover" />
            <View style={styles.productImageOverlay} />
          </>
        ) : (
          <View style={styles.productImageFallback}>
            <Ionicons name="image-outline" size={24} color={theme.colors.textSecondary} />
            <Text style={styles.productImageFallbackText}>No image</Text>
          </View>
        )}
        <View style={styles.badgeRow}>
          {item.badges?.map((badge) => (
            <View key={`${item.id}-${badge}`} style={styles.productBadge}>
              <Text style={styles.productBadgeText}>{badge}</Text>
            </View>
          ))}
        </View>
      </View>
      <View style={styles.productBody}>
        <Text style={styles.productCategory}>{item.category}</Text>
        <Text style={styles.productTitle} numberOfLines={2}>
          {item.name}
        </Text>
        <View style={styles.priceRow}>
          <Text style={styles.priceText}>{formatNaira(item.price)}</Text>
          {item.oldPrice ? <Text style={styles.oldPriceText}>{formatNaira(item.oldPrice)}</Text> : null}
        </View>
        <View style={styles.metaRow}>
          <View style={styles.ratingRow}>
            <Ionicons name="star" size={14} color={theme.colors.orange} />
            <Text style={styles.ratingText}>{formatRating(item.rating)}</Text>
            {item.reviews ? <Text style={styles.ratingCount}>({item.reviews})</Text> : null}
          </View>
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={14} color={theme.colors.textSecondary} />
            <Text style={styles.locationText} numberOfLines={1}>
              {item.location}
            </Text>
          </View>
        </View>
        <View style={styles.vendorRow}>
          <View style={styles.vendorInfo}>
            <Text style={styles.vendorName} numberOfLines={1}>
              {item.vendor}
            </Text>
            {item.verification === 'verified' ? (
              <View style={styles.verificationChip}>
                <Ionicons name="shield-checkmark" size={12} color={theme.colors.white} />
                <Text style={styles.verificationText}>Verified</Text>
              </View>
            ) : null}
          </View>
          {item.vendorPlan ? (
            <View style={styles.planBadge}>
              <Text style={styles.planText}>{item.vendorPlan.toUpperCase()}</Text>
            </View>
          ) : null}
        </View>
        {item.tags?.length ? (
          <View style={styles.tagRow}>
            {item.tags.map((tag) => (
              <View key={`${item.id}-${tag}`} style={styles.tagPill}>
                <Text style={styles.tagPillText}>{tag}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );

  const renderHeader = () => (
    <View style={styles.listHeader}>
      <View style={styles.heroCard}>
        <View style={styles.heroBadge}>
          <Ionicons name="bag-handle" size={14} color={theme.colors.emerald} />
          <Text style={styles.heroBadgeText}>Yustam Marketplace</Text>
        </View>
        <Text style={styles.heroTitle}>Shop the best from verified vendors</Text>
        <Text style={styles.heroSubtitle}>
          Discover fresh drops, power deals, and everyday essentials curated for you.
        </Text>
        <View style={styles.heroMetrics}>
          <View style={styles.heroMetric}>
            <Ionicons name="shield-checkmark" size={14} color={theme.colors.emerald} />
            <Text style={styles.heroMetricText}>200+ verified sellers</Text>
          </View>
          <View style={styles.heroMetric}>
            <Ionicons name="flash" size={14} color={theme.colors.emerald} />
            <Text style={styles.heroMetricText}>Daily flash deals</Text>
          </View>
        </View>
      </View>

      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color={theme.colors.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search smart gadgets, property, services..."
          placeholderTextColor={theme.colors.textTertiary}
          value={query}
          onChangeText={setQuery}
          returnKeyType="search"
          autoFocus={Boolean(route?.params?.query)}
        />
        {query ? (
          <TouchableOpacity onPress={() => setQuery('')} activeOpacity={0.7}>
            <Ionicons name="close-circle" size={18} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={styles.filtersWrapper}>
        <FilterSelect
          label="Category"
          value={selectedCategory || 'All categories'}
          onPress={() => setActiveFilterKey(activeFilterKey === 'category' ? null : 'category')}
          isActive={activeFilterKey === 'category'}
        />
        <FilterSelect
          label="Price"
          value={selectedPriceRange?.label || PRICE_RANGES[0].label}
          onPress={() => setActiveFilterKey(activeFilterKey === 'price' ? null : 'price')}
          isActive={activeFilterKey === 'price'}
        />
      </View>

      <View style={styles.filtersWrapper}>
        <FilterSelect
          label="Location"
          value={selectedLocation || 'All locations'}
          onPress={() => setActiveFilterKey(activeFilterKey === 'location' ? null : 'location')}
          isActive={activeFilterKey === 'location'}
        />
        <FilterSelect
          label="Sort"
          value={selectedSort?.label || SORT_OPTIONS[0].label}
          onPress={() => setActiveFilterKey(activeFilterKey === 'sort' ? null : 'sort')}
          isActive={activeFilterKey === 'sort'}
        />
      </View>

      {activeFilters.length ? (
        <View style={styles.activeFilters}>
          {activeFilters.map((filter) => (
            <View key={filter.key} style={styles.activeFilterPill}>
              <Text style={styles.activeFilterText}>{filter.label}</Text>
              <TouchableOpacity onPress={filter.onClear}>
                <Ionicons name="close" size={12} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>
          ))}
          <TouchableOpacity onPress={handleClearFilters} style={styles.clearAllButton} activeOpacity={0.8}>
            <Ionicons name="refresh" size={14} color={theme.colors.primary} />
            <Text style={styles.clearAllText}>Reset</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <Text style={styles.resultsMeta}>
        {loading && !listings.length
          ? 'Fetching listings...'
          : `Showing ${filteredResults.length} of ${totalResults || filteredResults.length} products`}
      </Text>

      {error && listings.length ? (
        <View style={styles.errorBanner}>
          <Ionicons name="alert-circle" size={18} color={theme.colors.error} />
          <Text style={styles.errorText} numberOfLines={2}>
            {error}
          </Text>
          <TouchableOpacity onPress={() => fetchListings({ page: 1, reset: true })} activeOpacity={0.8}>
            <Text style={styles.errorRetry}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );

  const renderEmptyComponent = () => (
    <View style={styles.emptyState}>
      {loading ? (
        <>
          <ActivityIndicator color={theme.colors.primary} />
          <Text style={styles.emptyTitle}>Loading marketplace…</Text>
          <Text style={styles.emptySubtitle}>
            Fetching verified vendor listings tailored to your filters.
          </Text>
        </>
      ) : error ? (
        <>
          <Ionicons name="alert-circle" size={32} color={theme.colors.error} />
          <Text style={styles.emptyTitle}>We hit a snag</Text>
          <Text style={styles.emptySubtitle}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => fetchListings({ page: 1, reset: true })}>
            <Text style={styles.retryButtonText}>Try again</Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <Ionicons name="search-outline" size={32} color={theme.colors.textSecondary} />
          <Text style={styles.emptyTitle}>No matches found</Text>
          <Text style={styles.emptySubtitle}>
            Adjust your filters or try a different keyword to discover more marketplace offers.
          </Text>
        </>
      )}
    </View>
  );

  const renderFooter = () => {
    if (loadingMore) {
      return (
        <View style={styles.listFooterLoading}>
          <ActivityIndicator color={theme.colors.primary} />
          <Text style={styles.footerText}>Loading more products…</Text>
        </View>
      );
    }

    if (pageMeta.hasMore) {
      return <View style={styles.listFooterSpacer} />;
    }

    if (filteredResults.length) {
      return (
        <View style={styles.endOfList}>
          <Text style={styles.endOfListText}>You’ve reached the end of the catalogue.</Text>
        </View>
      );
    }

    return <View style={styles.listFooterSpacer} />;
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        data={filteredResults}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        numColumns={2}
        columnWrapperStyle={styles.listColumns}
        renderItem={renderProduct}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmptyComponent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.primary}
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.35}
      />

      {modalConfig ? (
        <FilterModal
          visible
          title={modalConfig.title}
          options={modalConfig.options.map((option) => ({
            ...option,
            onPress: () => {
              option.onSelect();
              setActiveFilterKey(null);
            },
          }))}
          onClose={() => setActiveFilterKey(null)}
        />
      ) : null}
    </SafeAreaView>
  );
};

const priceMatches = (priceRange, price) => {
  if (!priceRange) {
    return true;
  }
  const minimum = priceRange.min ?? 0;
  const maximum = priceRange.max ?? Infinity;
  return price >= minimum && price <= maximum;
};

const sortResults = (items, sortOption) => {
  if (!sortOption) {
    return items;
  }

  const sorted = [...items];
  switch (sortOption.id) {
    case 'priceLowHigh':
      return sorted.sort((a, b) => a.price - b.price);
    case 'priceHighLow':
      return sorted.sort((a, b) => b.price - a.price);
    case 'newest':
      return sorted.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    case 'trending':
    default:
      return sorted.sort((a, b) => {
        const ratingDifference = (b.rating || 0) - (a.rating || 0);
        if (Math.abs(ratingDifference) > 0.05) {
          return ratingDifference;
        }
        return parseReviewCount(b.reviews) - parseReviewCount(a.reviews);
      });
  }
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

const formatRating = (rating) => {
  if (!rating || Number.isNaN(rating)) {
    return '—';
  }
  return Number(rating).toFixed(1);
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.white,
    borderRadius: theme.radius.xl,
    paddingHorizontal: theme.spacing.lg,
    height: 48,
    ...theme.shadows.soft,
  },
  searchInput: {
    flex: 1,
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textPrimary,
  },
  listContainer: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing['4xl'],
  },
  listColumns: {
    justifyContent: 'space-between',
    columnGap: theme.spacing.md,
  },
  listHeader: {
    gap: theme.spacing.xl,
    paddingBottom: theme.spacing.xl,
  },
  heroCard: {
    backgroundColor: theme.colors.emeraldLight,
    borderRadius: theme.radius['2xl'],
    padding: theme.spacing.xl,
    gap: theme.spacing.md,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    backgroundColor: theme.colors.white,
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.radius.full,
  },
  heroBadgeText: {
    fontFamily: theme.typography.fontFamily.interSemiBold,
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.emerald,
  },
  heroTitle: {
    fontFamily: theme.typography.fontFamily.interBold,
    fontSize: theme.typography.fontSize['2xl'],
    color: theme.colors.primary,
    lineHeight: theme.typography.lineHeight.loose * theme.typography.fontSize['2xl'],
  },
  heroSubtitle: {
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    lineHeight: theme.typography.lineHeight.relaxed * theme.typography.fontSize.sm,
  },
  heroMetrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  heroMetric: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    backgroundColor: theme.colors.white,
    paddingVertical: 6,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.radius.full,
  },
  heroMetricText: {
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.primary,
  },
  filtersWrapper: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  filterSelect: {
    flex: 1,
    backgroundColor: theme.colors.white,
    borderRadius: theme.radius.xl,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
    ...theme.shadows.soft,
  },
  filterSelectActive: {
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  filterSelectTextGroup: {
    flex: 1,
    gap: 4,
  },
  filterSelectLabel: {
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textSecondary,
  },
  filterSelectValue: {
    fontFamily: theme.typography.fontFamily.interSemiBold,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textPrimary,
  },
  activeFilters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    alignItems: 'center',
  },
  activeFilterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    paddingVertical: 6,
    paddingHorizontal: theme.spacing.sm,
    backgroundColor: theme.colors.backgroundLight,
    borderRadius: theme.radius.full,
  },
  activeFilterText: {
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textSecondary,
  },
  clearAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    paddingVertical: 6,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.white,
    ...theme.shadows.soft,
  },
  clearAllText: {
    fontFamily: theme.typography.fontFamily.interSemiBold,
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.primary,
  },
  resultsMeta: {
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    padding: theme.spacing.sm,
    borderRadius: theme.radius.xl,
    backgroundColor: theme.colors.error + '19',
  },
  errorText: {
    flex: 1,
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.error,
  },
  errorRetry: {
    fontFamily: theme.typography.fontFamily.interSemiBold,
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.error,
  },
  productCard: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.radius['2xl'],
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
    gap: theme.spacing.md,
    flexBasis: '48%',
    maxWidth: '48%',
    flexGrow: 1,
    ...theme.shadows.card,
  },
  productImageWrapper: {
    position: 'relative',
    borderRadius: theme.radius['2xl'],
    backgroundColor: theme.colors.backgroundLight,
    overflow: 'hidden',
    aspectRatio: 1,
    marginBottom: theme.spacing.xs,
  },
  productImage: {
    ...StyleSheet.absoluteFillObject,
    width: undefined,
    height: undefined,
    transform: [{ scale: 1.05 }],
  },
  productImageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  productImageFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xs,
  },
  productImageFallbackText: {
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textSecondary,
  },
  badgeRow: {
    position: 'absolute',
    top: theme.spacing.sm,
    left: theme.spacing.sm,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
  },
  productBadge: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.radius.full,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 6,
    ...theme.shadows.soft,
  },
  productBadgeText: {
    fontFamily: theme.typography.fontFamily.interSemiBold,
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.orange,
  },
  productBody: {
    gap: theme.spacing.sm,
  },
  productCategory: {
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textSecondary,
  },
  productTitle: {
    fontFamily: theme.typography.fontFamily.interSemiBold,
    fontSize: theme.typography.fontSize.lg,
    color: theme.colors.textPrimary,
    lineHeight: theme.typography.lineHeight.relaxed * theme.typography.fontSize.lg,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  priceText: {
    fontFamily: theme.typography.fontFamily.interBold,
    fontSize: theme.typography.fontSize.lg,
    color: theme.colors.primary,
  },
  oldPriceText: {
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textTertiary,
    textDecorationLine: 'line-through',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontFamily: theme.typography.fontFamily.interSemiBold,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textPrimary,
  },
  ratingCount: {
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textSecondary,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    maxWidth: '55%',
  },
  locationText: {
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textSecondary,
  },
  vendorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  vendorInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  vendorName: {
    flex: 1,
    fontFamily: theme.typography.fontFamily.interSemiBold,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textPrimary,
  },
  verificationChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.full,
    paddingVertical: 4,
    paddingHorizontal: theme.spacing.sm,
  },
  verificationText: {
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textLight,
  },
  planBadge: {
    backgroundColor: theme.colors.backgroundLight,
    borderRadius: theme.radius.full,
    paddingVertical: 4,
    paddingHorizontal: theme.spacing.sm,
  },
  planText: {
    fontFamily: theme.typography.fontFamily.interSemiBold,
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textSecondary,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
  },
  tagPill: {
    backgroundColor: theme.colors.backgroundLight,
    borderRadius: theme.radius.full,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
  },
  tagPillText: {
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textSecondary,
  },
  emptyState: {
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingTop: theme.spacing['4xl'],
    paddingHorizontal: theme.spacing.xl,
  },
  emptyTitle: {
    fontFamily: theme.typography.fontFamily.interSemiBold,
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textPrimary,
  },
  emptySubtitle: {
    textAlign: 'center',
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textSecondary,
    lineHeight: theme.typography.lineHeight.relaxed * theme.typography.fontSize.xs,
  },
  retryButton: {
    marginTop: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.full,
  },
  retryButtonText: {
    fontFamily: theme.typography.fontFamily.interSemiBold,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.white,
  },
  listFooterLoading: {
    height: theme.spacing['4xl'],
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xs,
  },
  listFooterSpacer: {
    height: theme.spacing['4xl'],
  },
  footerText: {
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textSecondary,
  },
  endOfList: {
    paddingVertical: theme.spacing.lg,
    alignItems: 'center',
  },
  endOfListText: {
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textSecondary,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: theme.colors.overlayLight,
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: theme.colors.white,
    borderTopLeftRadius: theme.radius['2xl'],
    borderTopRightRadius: theme.radius['2xl'],
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing['3xl'],
    gap: theme.spacing.md,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: {
    fontFamily: theme.typography.fontFamily.interSemiBold,
    fontSize: theme.typography.fontSize.lg,
    color: theme.colors.textPrimary,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  modalOptionSelected: {
    borderBottomColor: theme.colors.primary,
  },
  modalOptionCopy: {
    flex: 1,
    gap: 4,
  },
  modalOptionLabel: {
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textPrimary,
  },
  modalOptionLabelSelected: {
    fontFamily: theme.typography.fontFamily.interSemiBold,
    color: theme.colors.primary,
  },
  modalOptionHelper: {
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textSecondary,
  },
});

export default BuyerSearchScreen;
