import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import theme from '../../theme';
import { getFlashSaleItems } from '../../data/buyerCatalog';

const BuyerSearchScreen = ({ navigation, route }) => {
  const [query, setQuery] = useState('');
  const flashDeals = useMemo(() => getFlashSaleItems(), []);

  useEffect(() => {
    const incomingQuery = route?.params?.query;
    if (incomingQuery) {
      setQuery(incomingQuery);
    }
  }, [route?.params?.query]);

  const results = useMemo(() => {
    if (!query) {
      return flashDeals;
    }
    const lower = query.toLowerCase();
    return flashDeals.filter((item) => item.name.toLowerCase().includes(lower));
  }, [flashDeals, query]);

  const handleSelect = (item) => {
    navigation.navigate('BuyerProductDetail', { productId: item.id });
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity style={styles.resultRow} onPress={() => handleSelect(item)} activeOpacity={0.85}>
      <View style={styles.resultIcon}>
        <Ionicons name="flash-outline" size={18} color={theme.colors.orange} />
      </View>
      <View style={styles.resultContent}>
        <Text style={styles.resultTitle}>{item.name}</Text>
        <Text style={styles.resultSubtitle}>{formatCurrency(item.price)}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={theme.colors.textSecondary} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.searchHeader}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-back" size={20} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color={theme.colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search smart watches, earbuds, power..."
            placeholderTextColor={theme.colors.textTertiary}
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
            autoFocus
          />
          {query ? (
            <TouchableOpacity onPress={() => setQuery('')} activeOpacity={0.7}>
              <Ionicons name="close-circle" size={18} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        renderItem={renderItem}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="search-outline" size={32} color={theme.colors.textSecondary} />
            <Text style={styles.emptyTitle}>No matches found</Text>
            <Text style={styles.emptySubtitle}>
              Try another keyword or check the flash sale collection for more options.
            </Text>
          </View>
        }
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
  searchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
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
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.white,
    borderRadius: theme.radius.xl,
    paddingHorizontal: theme.spacing.lg,
    height: 48,
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
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    paddingVertical: theme.spacing.md,
  },
  resultIcon: {
    width: 44,
    height: 44,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.backgroundLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultContent: {
    flex: 1,
    gap: 4,
  },
  resultTitle: {
    fontFamily: theme.typography.fontFamily.interSemiBold,
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textPrimary,
  },
  resultSubtitle: {
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textSecondary,
  },
  separator: {
    height: 1,
    backgroundColor: theme.colors.border,
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
});

export default BuyerSearchScreen;
