import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Image,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Toast from '../../components/Toast';
import Button from '../../components/Button';
import theme from '../../theme';
import { vendorAPI } from '../../services/api';
import resolveMediaUrl from '../../utils/url';
import { goBackOrNavigate } from '../../utils/navigation';
import { formatDate, formatNaira } from '../../utils/formatters';

const sanitizePhoneNumber = (value = '') => value.replace(/[^0-9]/g, '');

const normaliseVerificationState = (value) => {
  if (value === true || value === 1 || value === '1') {
    return 'verified';
  }
  if (value === false || value === 0 || value === '0') {
    return 'unverified';
  }
  const normalised = String(value || '').trim().toLowerCase();
  if (!normalised) {
    return 'unverified';
  }
  const compact = normalised.replace(/[^a-z]/g, '');
  if (
    normalised.includes('verified') ||
    ['verified', 'approved', 'active', 'complete', 'completed', 'verifiedvendor'].includes(compact)
  ) {
    return 'verified';
  }
  if (
    normalised.includes('pending') ||
    normalised.includes('review') ||
    ['pending', 'submitted', 'processing', 'inreview', 'underreview'].includes(compact)
  ) {
    return 'pending';
  }
  if (normalised.includes('reject') || normalised.includes('declin') || normalised.includes('fail')) {
    return 'rejected';
  }
  return normalised;
};

const buildVerificationLabel = (state) => {
  const value = normaliseVerificationState(state);
  switch (value) {
    case 'verified':
      return 'Verified vendor';
    case 'pending':
      return 'Pending verification';
    case 'rejected':
      return 'Verification needs attention';
    default:
      return 'Unverified vendor';
  }
};

const buildPlanLabel = (value) => {
  const plan = String(value || '').trim();
  if (!plan) {
    return 'Free Plan';
  }
  if (/premium/i.test(plan)) {
    return 'Premium Plan';
  }
  if (/enterprise/i.test(plan)) {
    return 'Enterprise Plan';
  }
  if (/pro/i.test(plan)) {
    return 'Pro Plan';
  }
  return plan.replace(/plan$/i, '').trim() || 'Custom Plan';
};

const VendorStorefrontScreen = ({ navigation, route }) => {
  const { vendorId = '', vendorUid = '', vendorName = 'Marketplace Vendor' } = route.params || {};
  const identifierCandidates = useMemo(() => {
    return [vendorId, vendorUid]
      .map((value) => (value ? String(value).trim() : ''))
      .filter(Boolean);
  }, [vendorId, vendorUid]);

  const [storefront, setStorefront] = useState(null);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState({ visible: false, message: '', type: 'info' });

  const showToast = (message, type = 'success') => setToast({ visible: true, message, type });
  const hideToast = () => setToast({ ...toast, visible: false });

  const fetchStorefront = useCallback(async () => {
    if (!identifierCandidates.length) {
      setError('Vendor information is missing.');
      setStorefront(null);
      setListings([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    setError('');
    setLoading(true);
    setListings([]);

    for (const identifier of identifierCandidates) {
      try {
        const response = await vendorAPI.getStorefront(identifier);
        if (response.data?.success && response.data.vendor) {
          const vendor = response.data.vendor;
          const listingData = Array.isArray(response.data.listings) ? response.data.listings : [];
          const verificationState =
            normaliseVerificationState(
              vendor.verificationState || vendor.verificationLabel || vendor.status || vendor.verification
            ) || 'unverified';
          const nextStorefront = {
            businessName: vendor.businessName || vendor.displayName || vendorName || 'Marketplace Vendor',
            planLabel: vendor.planLabel || buildPlanLabel(vendor.plan),
            verificationState,
            verificationLabel: vendor.verificationLabel || buildVerificationLabel(verificationState),
            location: vendor.location || vendor.city || vendor.state || vendor.country || '',
            description: vendor.about || vendor.bio || '',
            avatar: resolveMediaUrl(vendor.avatar),
            coverImage: resolveMediaUrl(vendor.banner),
            phone: vendor.phone || vendor.contactPhone || '',
            whatsapp: vendor.whatsapp || vendor.phone || '',
            email: vendor.email || '',
            rating: Number(vendor.rating) || 0,
            totalReviews: Number(vendor.totalReviews) || 0,
            totalListings: listingData.length,
            joinedDate: vendor.createdAt
              ? formatDate(vendor.createdAt, { month: 'long', year: 'numeric' })
              : '',
            vendorUid: vendor.vendorUid || vendor.firebaseUid || vendorUid || vendorId || '',
            vendorId: vendor.id ? String(vendor.id) : vendorId,
          };
          setStorefront(nextStorefront);
          setListings(
            listingData.map((listing) => ({
              id: listing.id || listing.listing_id || listing.public_id || '',
              title: listing.title || listing.name || 'Marketplace listing',
              price: listing.price || listing.amount || 0,
              location: listing.location || listing.city || listing.state || '',
              status: listing.status || 'active',
              image: resolveMediaUrl(listing.image || listing.cover),
            }))
          );
          setLoading(false);
          setRefreshing(false);
          return;
        }
      } catch (apiError) {
        console.error('Storefront fetch error:', apiError);
      }
    }

    setError('Unable to load vendor storefront right now.');
    setStorefront(null);
    setListings([]);
    setLoading(false);
    setRefreshing(false);
  }, [identifierCandidates, vendorId, vendorName, vendorUid]);

  useEffect(() => {
    fetchStorefront();
  }, [fetchStorefront]);

  const handleCallVendor = useCallback(() => {
    if (!storefront?.phone) {
      showToast('Phone number is not available for this vendor.', 'info');
      return;
    }
    const tel = sanitizePhoneNumber(storefront.phone);
    if (!tel) {
      showToast('Phone number is not valid.', 'error');
      return;
    }
    Linking.openURL(`tel:${tel}`).catch(() => showToast('Unable to open dialer.', 'error'));
  }, [storefront?.phone]);

  const handleWhatsappVendor = useCallback(() => {
    const digits = sanitizePhoneNumber(storefront?.whatsapp || storefront?.phone || '');
    if (!digits) {
      showToast('WhatsApp number is not available for this vendor.', 'info');
      return;
    }
    const message = encodeURIComponent(`Hi ${storefront?.businessName}, I'm interested in your listings on YUSTAM.`);
    const waUrl = `https://wa.me/${digits}?text=${message}`;
    Linking.openURL(waUrl).catch(() => showToast('Unable to open WhatsApp on this device.', 'error'));
  }, [storefront?.businessName, storefront?.phone, storefront?.whatsapp]);

  const verificationState = storefront?.verificationState || 'unverified';
  const verificationColor =
    verificationState === 'verified'
      ? theme.colors.emerald
      : verificationState === 'pending'
      ? theme.colors.orange
      : theme.colors.textSecondary;
  const verificationIcon =
    verificationState === 'verified'
      ? 'shield-checkmark'
      : verificationState === 'pending'
      ? 'shield-half-outline'
      : 'shield-outline';

  return (
    <SafeAreaView style={styles.screen}>
      <Toast visible={toast.visible} message={toast.message} type={toast.type} onDismiss={hideToast} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => goBackOrNavigate(navigation)} style={styles.headerButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Vendor Storefront</Text>
        <View style={styles.headerSpacer} />
      </View>

      {loading ? (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading storefront...</Text>
        </View>
      ) : error ? (
        <View style={styles.centerContent}>
          <Ionicons name="storefront-outline" size={64} color={theme.colors.textSecondary} />
          <Text style={styles.errorText}>{error}</Text>
          <Button title="Try again" onPress={fetchStorefront} />
        </View>
      ) : !storefront ? (
        <View style={styles.centerContent}>
          <Ionicons name="alert-circle-outline" size={64} color={theme.colors.textSecondary} />
          <Text style={styles.errorText}>No storefront information available.</Text>
        </View>
      ) : (
        <ScrollView
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchStorefront} tintColor={theme.colors.primary} />}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.coverWrapper}>
            {storefront.coverImage ? (
              <Image source={{ uri: storefront.coverImage }} style={styles.coverImage} />
            ) : (
              <View style={styles.coverPlaceholder}>
                <Ionicons name="storefront-outline" size={56} color={theme.colors.white} />
              </View>
            )}
            <View style={styles.avatarWrapper}>
              {storefront.avatar ? (
                <Image source={{ uri: storefront.avatar }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Ionicons name="storefront" size={32} color={theme.colors.white} />
                </View>
              )}
            </View>
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.businessName}>{storefront.businessName}</Text>
            <Text style={styles.planBadge}>{storefront.planLabel}</Text>
            <View style={styles.metaRow}>
              <Ionicons name={verificationIcon} size={16} color={verificationColor} />
              <Text style={[styles.metaText, { color: verificationColor }]}>{storefront.verificationLabel}</Text>
            </View>
            {storefront.location ? (
              <View style={styles.metaRow}>
                <Ionicons name="location-outline" size={16} color={theme.colors.textSecondary} />
                <Text style={styles.metaText}>{storefront.location}</Text>
              </View>
            ) : null}
            {storefront.description ? (
              <Text style={styles.description}>{storefront.description}</Text>
            ) : null}

            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{storefront.totalListings}</Text>
                <Text style={styles.statLabel}>Listings</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{storefront.totalReviews}</Text>
                <Text style={styles.statLabel}>Reviews</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>
                  {storefront.rating ? Number(storefront.rating).toFixed(1) : '—'}
                </Text>
                <Text style={styles.statLabel}>Rating</Text>
              </View>
            </View>

            {storefront.joinedDate ? (
              <Text style={styles.joinedText}>Joined {storefront.joinedDate}</Text>
            ) : null}
          </View>

          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={[styles.actionTile, !storefront.phone && styles.disabledButton]}
              onPress={handleCallVendor}
              disabled={!storefront.phone}
              activeOpacity={0.8}
            >
              <Ionicons
                name="call-outline"
                size={20}
                color={storefront.phone ? theme.colors.emerald : theme.colors.textSecondary}
              />
              <Text style={styles.actionLabel}>Call</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.actionTile,
                !(storefront.whatsapp || storefront.phone) && styles.disabledButton,
              ]}
              onPress={handleWhatsappVendor}
              disabled={!(storefront.whatsapp || storefront.phone)}
              activeOpacity={0.8}
            >
              <Ionicons
                name="logo-whatsapp"
                size={20}
                color={storefront.whatsapp || storefront.phone ? theme.colors.success : theme.colors.textSecondary}
              />
              <Text style={styles.actionLabel}>WhatsApp</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.listingsSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Listings</Text>
              <Text style={styles.sectionHint}>
                {storefront.totalListings
                  ? `${storefront.totalListings} available`
                  : 'No listings yet'}
              </Text>
            </View>

            {listings.length ? (
              <View style={styles.listingsGrid}>
                {listings.map((listing) => (
                  <TouchableOpacity
                    key={listing.id || listing.title}
                    style={styles.listingCard}
                    onPress={() =>
                      listing.id
                        ? navigation.navigate('BuyerProductDetail', { productId: listing.id })
                        : null
                    }
                    activeOpacity={0.8}
                  >
                    {listing.image ? (
                      <Image source={{ uri: listing.image }} style={styles.listingImage} />
                    ) : (
                      <View style={styles.listingPlaceholder}>
                        <Ionicons name="image-outline" size={28} color={theme.colors.textSecondary} />
                      </View>
                    )}
                    <View style={styles.listingInfo}>
                      <Text style={styles.listingTitle} numberOfLines={2}>
                        {listing.title}
                      </Text>
                      <Text style={styles.listingPrice}>{formatNaira(listing.price)}</Text>
                      {listing.location ? (
                        <Text style={styles.listingLocation} numberOfLines={1}>
                          {listing.location}
                        </Text>
                      ) : null}
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <View style={styles.emptyListings}>
                <Ionicons name="cube-outline" size={40} color={theme.colors.textSecondary} />
                <Text style={styles.emptyText}>This vendor has no listings yet.</Text>
              </View>
            )}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.white,
  },
  headerButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.white,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  headerTitle: {
    fontFamily: theme.typography.fontFamily.interSemiBold,
    fontSize: theme.typography.fontSize.lg,
    color: theme.colors.textPrimary,
  },
  headerSpacer: {
    width: 42,
  },
  scrollContent: {
    paddingBottom: theme.spacing['3xl'],
  },
  coverWrapper: {
    position: 'relative',
    height: 220,
    backgroundColor: theme.colors.backgroundLight,
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  coverPlaceholder: {
    flex: 1,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarWrapper: {
    position: 'absolute',
    bottom: -40,
    alignSelf: 'center',
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 4,
    borderColor: theme.colors.white,
    backgroundColor: theme.colors.white,
    overflow: 'hidden',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
  },
  infoCard: {
    marginTop: 56,
    marginHorizontal: theme.spacing.lg,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.xl,
    backgroundColor: theme.colors.white,
    gap: theme.spacing.sm,
    ...theme.shadows.medium,
  },
  businessName: {
    fontFamily: theme.typography.fontFamily.anton,
    fontSize: theme.typography.fontSize['2xl'],
    color: theme.colors.textPrimary,
    letterSpacing: theme.typography.letterSpacing.wide,
  },
  planBadge: {
    fontFamily: theme.typography.fontFamily.interSemiBold,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.primary,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  metaText: {
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  description: {
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textSecondary,
    lineHeight: theme.typography.lineHeight.relaxed * theme.typography.fontSize.base,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.base,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.backgroundLight,
    marginTop: theme.spacing.sm,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontFamily: theme.typography.fontFamily.anton,
    fontSize: theme.typography.fontSize.lg,
    color: theme.colors.primary,
  },
  statLabel: {
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textSecondary,
  },
  statDivider: {
    width: 1,
    height: '100%',
    backgroundColor: theme.colors.border,
  },
  joinedText: {
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.lg,
  },
  actionTile: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.white,
    ...theme.shadows.small,
  },
  actionLabel: {
    fontFamily: theme.typography.fontFamily.interSemiBold,
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textPrimary,
  },
  disabledButton: {
    opacity: 0.4,
  },
  listingsSection: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing['2xl'],
    gap: theme.spacing.base,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontFamily: theme.typography.fontFamily.interSemiBold,
    fontSize: theme.typography.fontSize.lg,
    color: theme.colors.textPrimary,
  },
  sectionHint: {
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  listingsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.md,
  },
  listingCard: {
    width: '47%',
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    backgroundColor: theme.colors.white,
    ...theme.shadows.small,
  },
  listingImage: {
    width: '100%',
    height: 140,
  },
  listingPlaceholder: {
    width: '100%',
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.backgroundLight,
  },
  listingInfo: {
    padding: theme.spacing.sm,
    gap: theme.spacing.xs,
  },
  listingTitle: {
    fontFamily: theme.typography.fontFamily.interSemiBold,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textPrimary,
  },
  listingPrice: {
    fontFamily: theme.typography.fontFamily.anton,
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.orange,
  },
  listingLocation: {
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textSecondary,
  },
  emptyListings: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing['2xl'],
    gap: theme.spacing.sm,
  },
  emptyText: {
    fontFamily: theme.typography.fontFamily.interSemiBold,
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textSecondary,
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.md,
    padding: theme.spacing['2xl'],
  },
  loadingText: {
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textSecondary,
  },
  errorText: {
    fontFamily: theme.typography.fontFamily.interSemiBold,
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.error,
    textAlign: 'center',
  },
});

export default VendorStorefrontScreen;
