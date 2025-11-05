import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import theme from '../../theme';
import Toast from '../../components/Toast';
import { API_BASE_URL } from '../../config/constants';

const VendorListingsScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [listings, setListings] = useState([]);
  const [filteredListings, setFilteredListings] = useState([]);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'info' });
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filters = [
    { key: 'all', label: 'All', count: 0 },
    { key: 'approved', label: 'Live', count: 0 },
    { key: 'pending', label: 'Pending', count: 0 },
    { key: 'draft', label: 'Draft', count: 0 },
    { key: 'sold', label: 'Sold', count: 0 },
  ];

  useEffect(() => {
    fetchListings();
  }, []);

  useEffect(() => {
    filterListings();
  }, [selectedFilter, searchQuery, listings]);

  const fetchListings = async () => {
    try {
      setLoading(true);
      
      // TODO: Replace with actual API call
      const response = await fetch(`${API_BASE_URL}/vendor-listings-data.php?format=json`, {
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch listings');
      }

      const data = await response.json();
      
      // Mock data for now
      const mockListings = [
        {
          id: '1',
          title: 'iPhone 13 Pro Max',
          description: 'Brand new sealed in box',
          price: 450000,
          status_raw: 'approved',
          status_label: 'Live',
          views: 125,
          added_on: '2024-11-01',
          image: 'https://via.placeholder.com/150',
          category: 'Electronics',
          location: 'Lagos',
        },
        {
          id: '2',
          title: 'Samsung Galaxy S23',
          description: 'Excellent condition, 6 months used',
          price: 280000,
          status_raw: 'pending',
          status_label: 'Pending Review',
          views: 45,
          added_on: '2024-11-03',
          image: 'https://via.placeholder.com/150',
          category: 'Electronics',
          location: 'Abuja',
        },
        {
          id: '3',
          title: 'MacBook Pro 2023',
          description: 'M2 chip, 16GB RAM, 512GB SSD',
          price: 850000,
          status_raw: 'draft',
          status_label: 'Draft',
          views: 0,
          added_on: '2024-11-04',
          image: 'https://via.placeholder.com/150',
          category: 'Electronics',
          location: 'Lagos',
        },
      ];

      setListings(mockListings);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching listings:', error);
      showToast('Failed to load listings', 'error');
      setLoading(false);
    }
  };

  const filterListings = () => {
    let filtered = [...listings];

    // Apply status filter
    if (selectedFilter !== 'all') {
      filtered = filtered.filter(listing => listing.status_raw === selectedFilter);
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(listing =>
        listing.title.toLowerCase().includes(query) ||
        listing.description.toLowerCase().includes(query)
      );
    }

    setFilteredListings(filtered);
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchListings();
    setRefreshing(false);
  }, []);

  const showToast = (message, type = 'success') => {
    setToast({ visible: true, message, type });
  };

  const hideToast = () => {
    setToast({ ...toast, visible: false });
  };

  const handleEditListing = (listing) => {
    navigation.navigate('ListingEditor', { listing });
  };

  const handleDeleteListing = (listing) => {
    Alert.alert(
      'Delete Listing',
      `Are you sure you want to delete "${listing.title}"? This action cannot be undone.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => confirmDeleteListing(listing.id),
        },
      ]
    );
  };

  const confirmDeleteListing = async (listingId) => {
    try {
      // TODO: Call API
      const response = await fetch(`${API_BASE_URL}/vendor-listing-delete.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ listingId }),
      });

      if (!response.ok) {
        throw new Error('Failed to delete listing');
      }

      // Remove from local state
      setListings(listings.filter(l => l.id !== listingId));
      showToast('Listing deleted successfully');
    } catch (error) {
      console.error('Error deleting listing:', error);
      showToast('Failed to delete listing', 'error');
    }
  };

  const handleAddListing = () => {
    navigation.navigate('ListingEditor', { listing: null });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved':
        return theme.colors.success;
      case 'pending':
        return theme.colors.warning;
      case 'draft':
        return theme.colors.textSecondary;
      case 'sold':
        return theme.colors.error;
      default:
        return theme.colors.textSecondary;
    }
  };

  const formatPrice = (price) => {
    return `₦${price?.toLocaleString() || '0'}`;
  };

  const FilterChip = ({ filterKey, label, isSelected }) => (
    <TouchableOpacity
      style={[styles.filterChip, isSelected && styles.filterChipSelected]}
      onPress={() => setSelectedFilter(filterKey)}
      activeOpacity={0.7}
    >
      <Text style={[styles.filterChipText, isSelected && styles.filterChipTextSelected]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const ListingCard = ({ item }) => (
    <TouchableOpacity
      style={styles.listingCard}
      onPress={() => handleEditListing(item)}
      activeOpacity={0.7}
    >
      <Image
        source={{ uri: item.image }}
        style={styles.listingImage}
        resizeMode="cover"
      />
      
      <View style={styles.listingContent}>
        <View style={styles.listingHeader}>
          <Text style={styles.listingTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(item.status_raw)}20` }]}>
            <Text style={[styles.statusText, { color: getStatusColor(item.status_raw) }]}>
              {item.status_label}
            </Text>
          </View>
        </View>

        <Text style={styles.listingPrice}>{formatPrice(item.price)}</Text>
        
        <View style={styles.listingMeta}>
          <View style={styles.metaItem}>
            <Ionicons name="eye-outline" size={16} color={theme.colors.textSecondary} />
            <Text style={styles.metaText}>{item.views} views</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="location-outline" size={16} color={theme.colors.textSecondary} />
            <Text style={styles.metaText}>{item.location}</Text>
          </View>
        </View>

        <View style={styles.listingActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleEditListing(item)}
            activeOpacity={0.7}
          >
            <Ionicons name="create-outline" size={20} color={theme.colors.primary} />
            <Text style={styles.actionButtonText}>Edit</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton]}
            onPress={() => handleDeleteListing(item)}
            activeOpacity={0.7}
          >
            <Ionicons name="trash-outline" size={20} color={theme.colors.error} />
            <Text style={[styles.actionButtonText, styles.deleteButtonText]}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  const EmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="cube-outline" size={64} color={theme.colors.textSecondary} />
      <Text style={styles.emptyTitle}>
        {selectedFilter === 'all' ? 'No Listings Yet' : `No ${filters.find(f => f.key === selectedFilter)?.label} Listings`}
      </Text>
      <Text style={styles.emptyMessage}>
        {selectedFilter === 'all'
          ? 'Start selling by creating your first listing'
          : 'You don\'t have any listings in this category'}
      </Text>
      {selectedFilter === 'all' && (
        <TouchableOpacity style={styles.addButton} onPress={handleAddListing}>
          <Text style={styles.addButtonText}>Add Listing</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>MY LISTINGS</Text>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading listings...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onDismiss={hideToast}
      />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>MY LISTINGS</Text>
        <TouchableOpacity onPress={handleAddListing} style={styles.addIconButton}>
          <Ionicons name="add-circle" size={28} color={theme.colors.accent} />
        </TouchableOpacity>
      </View>

      {/* Filter Chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterContainer}
        contentContainerStyle={styles.filterContent}
      >
        {filters.map(filter => (
          <FilterChip
            key={filter.key}
            filterKey={filter.key}
            label={filter.label}
            isSelected={selectedFilter === filter.key}
          />
        ))}
      </ScrollView>

      {/* Listings List */}
      <FlatList
        data={filteredListings}
        renderItem={({ item }) => <ListingCard item={item} />}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
        ListEmptyComponent={<EmptyState />}
      />

      {/* Floating Add Button */}
      <TouchableOpacity style={styles.fab} onPress={handleAddListing} activeOpacity={0.8}>
        <Ionicons name="add" size={32} color="#FFFFFF" />
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.base,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    padding: theme.spacing.xs,
  },
  headerTitle: {
    fontFamily: theme.typography.fontFamilyHeading,
    fontSize: theme.typography.sizes.xl,
    color: theme.colors.primary,
    letterSpacing: 0.5,
  },
  headerRight: {
    width: 32,
  },
  addIconButton: {
    padding: theme.spacing.xs,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: theme.spacing.md,
    fontFamily: theme.typography.fontFamilyBody,
    fontSize: theme.typography.sizes.base,
    color: theme.colors.textSecondary,
  },
  filterContainer: {
    maxHeight: 50,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  filterContent: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  filterChip: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.beige,
    marginRight: theme.spacing.sm,
  },
  filterChipSelected: {
    backgroundColor: theme.colors.accent,
  },
  filterChipText: {
    fontFamily: theme.typography.fontFamilyBody,
    fontSize: theme.typography.sizes.sm,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  filterChipTextSelected: {
    color: '#FFFFFF',
  },
  listContent: {
    padding: theme.spacing.md,
  },
  listingCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
    padding: theme.spacing.base,
    ...theme.shadows.medium,
  },
  listingImage: {
    width: 100,
    height: 100,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.beige,
  },
  listingContent: {
    flex: 1,
    marginLeft: theme.spacing.base,
  },
  listingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.xs,
  },
  listingTitle: {
    flex: 1,
    fontFamily: theme.typography.fontFamilyBody,
    fontSize: theme.typography.sizes.base,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginRight: theme.spacing.sm,
  },
  statusBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.sm,
  },
  statusText: {
    fontFamily: theme.typography.fontFamilyBody,
    fontSize: theme.typography.sizes.xs,
    fontWeight: '600',
  },
  listingPrice: {
    fontFamily: theme.typography.fontFamilyBody,
    fontSize: theme.typography.sizes.lg,
    fontWeight: '700',
    color: theme.colors.accent,
    marginBottom: theme.spacing.sm,
  },
  listingMeta: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontFamily: theme.typography.fontFamilyBody,
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textSecondary,
  },
  listingActions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: theme.spacing.base,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: `${theme.colors.primary}10`,
  },
  actionButtonText: {
    fontFamily: theme.typography.fontFamilyBody,
    fontSize: theme.typography.sizes.sm,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  deleteButton: {
    backgroundColor: `${theme.colors.error}10`,
  },
  deleteButtonText: {
    color: theme.colors.error,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing['3xl'],
  },
  emptyTitle: {
    fontFamily: theme.typography.fontFamilyHeading,
    fontSize: theme.typography.sizes.xl,
    color: theme.colors.textPrimary,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  emptyMessage: {
    fontFamily: theme.typography.fontFamilyBody,
    fontSize: theme.typography.sizes.base,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.xl,
    paddingHorizontal: theme.spacing['2xl'],
  },
  addButton: {
    backgroundColor: theme.colors.accent,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.base,
    borderRadius: theme.borderRadius.md,
  },
  addButtonText: {
    fontFamily: theme.typography.fontFamilyBody,
    fontSize: theme.typography.sizes.base,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  fab: {
    position: 'absolute',
    right: theme.spacing.xl,
    bottom: theme.spacing.xl,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadows.large,
  },
});

export default VendorListingsScreen;
