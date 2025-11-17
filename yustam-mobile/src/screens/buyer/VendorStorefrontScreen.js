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
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Toast from '../../components/Toast';
import Button from '../../components/Button';
import theme from '../../theme';
import { collection, getDocs, limit, query, where } from 'firebase/firestore';
import { vendorAPI } from '../../services/api';
import resolveMediaUrl from '../../utils/url';
import { goBackOrNavigate } from '../../utils/navigation';
import { formatDate, formatNaira } from '../../utils/formatters';
import { db } from '../../config/firebase';

const sanitizePhoneNumber = (value = '') => value.replace(/[^0-9]/g, '');

const PLAN_BADGES = {
  free: { background: '#E0E0E0' },
  starter: { background: '#1877F2' },
  pro: { background: '#CD7F32' },
  elite: { background: '#C0C0C0' },
  power: { background: '#D4AF37' },
};

const normalisePlanSlug = (value = '') =>
  (value || '')
    .toLowerCase()
    .replace(/plan$/i, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'free';

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

const buildStorefrontFromProfile = (profile) => {
  if (!profile || typeof profile !== 'object') {
    return null;
  }
  const verificationState = normaliseVerificationState(
    profile.verification || profile.verificationState || profile.status
  );
  return {
    businessName: profile.businessName || profile.name || 'Marketplace Vendor',
    planLabel: profile.planLabel || buildPlanLabel(profile.plan),
    planSlug: normalisePlanSlug(profile.planSlug || profile.plan || 'free'),
    verificationState,
    verificationLabel: profile.verificationLabel || buildVerificationLabel(verificationState),
    location: profile.location || '',
    description: profile.description || '',
    avatar: resolveMediaUrl(profile.avatar),
    coverImage: resolveMediaUrl(profile.coverImage),
    phone: profile.phone || '',
    whatsapp: profile.whatsapp || profile.phone || '',
    email: profile.email || '',
    website: profile.website || '',
    instagram: profile.instagram || '',
    facebook: profile.facebook || '',
    twitter: profile.twitter || '',
    rating: Number(profile.rating) || 0,
    totalReviews: Number(profile.totalReviews) || 0,
    totalListings: Number(profile.totalListings) || 0,
    joinedDate: profile.joinedDate || '',
    vendorUid: profile.vendorUid || profile.vendorFirebaseUid || '',
    vendorId: profile.vendorId || '',
  };
};

const mergeStorefrontData = (base, update) => {
  if (!update) {
    return base;
  }
  const merged = { ...(base || {}), ...update };
  const verificationState = merged.verificationState || merged.verification;
  merged.verificationState = normaliseVerificationState(verificationState);
  merged.verificationLabel =
    merged.verificationLabel || buildVerificationLabel(merged.verificationState);
  merged.planSlug = normalisePlanSlug(merged.planSlug || merged.plan || merged.planLabel);
  return merged;
};

const transformListingRecord = (listing = {}) => {
  const title =
    listing.title ||
    listing.name ||
    listing.productTitle ||
    listing.listingTitle ||
    'Marketplace listing';
  const price = listing.price ?? listing.amount ?? listing.current_price ?? 0;
  const location = [listing.location, listing.city, listing.state, listing.country]
    .filter(Boolean)
    .join(', ');
  const imageCandidate =
    listing.image ||
    listing.cover ||
    listing.coverImage ||
    (Array.isArray(listing.images) ? listing.images[0] : '');
  return {
    id: listing.id || listing.listing_id || listing.public_id || '',
    title,
    price,
    location,
    status: listing.status || 'active',
    image: resolveMediaUrl(imageCandidate),
  };
};

const fetchStorefrontFromFirestore = async (vendorUid) => {
  if (!vendorUid) {
    return null;
  }
  try {
    const listingsRef = collection(db, 'listings');
    const snapshot = await getDocs(
      query(listingsRef, where('vendorUid', '==', vendorUid), limit(40))
    );
    if (snapshot.empty) {
      return { vendor: null, listings: [] };
    }

    const listings = [];
    let vendorProfile = null;
    snapshot.forEach((docSnap) => {
      const data = docSnap.data() || {};
      listings.push(
        transformListingRecord({
          id: docSnap.id,
          ...data,
        })
      );
      if (!vendorProfile) {
        vendorProfile = buildStorefrontFromProfile({
          name: data.vendorName || data.vendorBusinessName,
          businessName: data.vendorBusinessName || data.vendorName,
          planLabel: buildPlanLabel(data.vendorPlan || data.plan),
          verification: data.vendorVerification || data.verificationStatus,
          location: data.vendorLocation || data.location,
          avatar: data.vendorAvatar || data.vendorPhoto,
          phone: data.vendorPhone,
          whatsapp: data.vendorWhatsapp,
          email: data.vendorEmail,
          vendorUid: data.vendorUid || vendorUid,
          vendorId: data.vendorId,
        });
      }
    });

    return { vendor: vendorProfile, listings };
  } catch (firestoreError) {
    console.error('Firestore storefront fallback failed:', firestoreError);
    return null;
  }
};

const VendorStorefrontScreen = ({ navigation, route }) => {
  const {
    vendorId = '',
    vendorUid = '',
    vendorName = 'Marketplace Vendor',
    initialVendorProfile = null,
  } = route.params || {};

  const initialStorefront = useMemo(
    () => buildStorefrontFromProfile(initialVendorProfile),
    [initialVendorProfile]
  );

  const identifierCandidates = useMemo(() => {
    return [vendorId, vendorUid, initialStorefront?.vendorId, initialStorefront?.vendorUid]
      .map((value) => (value ? String(value).trim() : ''))
      .filter(Boolean)
      .filter((value, index, array) => array.indexOf(value) === index);
  }, [vendorId, vendorUid, initialStorefront?.vendorId, initialStorefront?.vendorUid]);

  const [storefront, setStorefront] = useState(initialStorefront);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [warning, setWarning] = useState('');
  const [toast, setToast] = useState({ visible: false, message: '', type: 'info' });

  useEffect(() => {
    if (initialStorefront) {
      setStorefront((prev) => mergeStorefrontData(prev, initialStorefront));
    }
  }, [initialStorefront]);

  const showToast = (message, type = 'success') => setToast({ visible: true, message, type });
  const hideToast = () => setToast({ ...toast, visible: false });

  const fetchStorefront = useCallback(async () => {
    if (!identifierCandidates.length) {
      setError('Vendor information is missing.');
      setStorefront(initialStorefront);
      setListings([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    setError('');
    setWarning('');
    setLoading(true);
    let lastError = '';

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
          const planSlug = normalisePlanSlug(vendor.planSlug || vendor.plan || vendor.planId || 'free');
          const nextStorefront = {
            businessName: vendor.businessName || vendor.displayName || vendorName || 'Marketplace Vendor',
            planLabel: vendor.planLabel || buildPlanLabel(vendor.plan),
            planSlug,
            verificationState,
            verificationLabel: vendor.verificationLabel || buildVerificationLabel(verificationState),
            location: vendor.location || vendor.city || vendor.state || vendor.country || '',
            description: vendor.about || vendor.bio || '',
            avatar: resolveMediaUrl(vendor.avatar),
            coverImage: resolveMediaUrl(vendor.banner),
            phone: vendor.phone || vendor.contactPhone || '',
            whatsapp: vendor.whatsapp || vendor.phone || '',
            email: vendor.email || '',
            website: vendor.website || vendor.siteUrl || '',
            instagram: vendor.instagram || '',
            facebook: vendor.facebook || '',
            twitter: vendor.twitter || vendor.x || '',
            rating: Number(vendor.rating) || 0,
            totalReviews: Number(vendor.totalReviews) || 0,
            totalListings: listingData.length,
            joinedDate: vendor.createdAt
              ? formatDate(vendor.createdAt, { month: 'long', year: 'numeric' })
              : '',
            vendorUid: vendor.vendorUid || vendor.firebaseUid || vendorUid || vendorId || '',
            vendorId: vendor.id ? String(vendor.id) : vendorId,
          };
          setStorefront((prev) => mergeStorefrontData(prev, nextStorefront));
          setListings(listingData.map((listing) => transformListingRecord(listing)));
          setLoading(false);
          setRefreshing(false);
          setWarning('');
          setError('');
          return;
        }
        lastError = response.data?.message || 'Vendor storefront is unavailable.';
      } catch (apiError) {
        console.error('Storefront fetch error:', apiError);
        lastError = apiError?.message || 'Unable to load vendor storefront right now.';
      }
    }

    const fallbackUid =
      identifierCandidates.find((value) => value && !/^\d+$/.test(value)) ||
      initialStorefront?.vendorUid ||
      vendorUid;

    if (fallbackUid) {
      const fallback = await fetchStorefrontFromFirestore(fallbackUid);
      if (fallback) {
        const listingsPayload = Array.isArray(fallback.listings) ? fallback.listings : [];
        if (fallback.vendor || listingsPayload.length) {
          setStorefront((prev) =>
            mergeStorefrontData(prev, {
              ...(fallback.vendor || {}),
              totalListings: listingsPayload.length || (fallback.vendor?.totalListings ?? prev?.totalListings ?? 0),
            })
          );
        }
        if (listingsPayload.length) {
          setListings(listingsPayload);
        }
        setWarning(lastError || 'Showing limited storefront details.');
        setError('');
        setLoading(false);
        setRefreshing(false);
        return;
      }
    }

    setError(lastError || 'Unable to load vendor storefront right now.');
    setLoading(false);
    setRefreshing(false);
  }, [identifierCandidates, initialStorefront, vendorId, vendorName, vendorUid]);

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

  const handleEmailVendor = useCallback(() => {
    if (!storefront?.email) {
      showToast('Email address is not available for this vendor.', 'info');
      return;
    }
    Linking.openURL(`mailto:${storefront.email}`).catch(() =>
      showToast('Unable to open email app.', 'error')
    );
  }, [storefront?.email]);

  const handleOpenWebsite = useCallback(() => {
    if (!storefront?.website) {
      showToast('Website link is not available for this vendor.', 'info');
      return;
    }
    let url = storefront.website.trim();
    if (!/^https?:\/\//i.test(url)) {
      url = `https://${url}`;
    }
    Linking.openURL(url).catch(() => showToast('Unable to open website link.', 'error'));
  }, [storefront?.website]);

  const verificationState = storefront?.verificationState || 'unverified';

  const blockingError = !loading && !storefront && error;
  const noDataAvailable = !loading && !storefront && !error;

  const listingsAvailable = listings.length || storefront?.totalListings || 0;

  return (
    <SafeAreaView style={styles.screen}>
      <Toast visible={toast.visible} message={toast.message} type={toast.type} onDismiss={hideToast} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => goBackOrNavigate(navigation)} style={styles.headerButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{storefront?.businessName || vendorName}</Text>
        <View style={styles.headerSpacer} />
      </View>

      {loading ? (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading storefront...</Text>
        </View>
      ) : blockingError ? (
        <View style={styles.centerContent}>
          <Ionicons name="storefront-outline" size={64} color={theme.colors.textSecondary} />
          <Text style={styles.errorText}>{error}</Text>
          <Button title="Try again" onPress={fetchStorefront} />
        </View>
      ) : noDataAvailable ? (
        <View style={styles.centerContent}>
          <Ionicons name="alert-circle-outline" size={64} color={theme.colors.textSecondary} />
          <Text style={styles.errorText}>No storefront information available.</Text>
        </View>
      ) : (
        <ScrollView
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchStorefront} tintColor={theme.colors.primary} />}
          contentContainerStyle={styles.scrollContent}
        >
          {warning ? (
            <View style={styles.inlineError}>
              <Ionicons name="warning-outline" size={16} color={theme.colors.orange} />
              <Text style={styles.inlineErrorText}>{warning}</Text>
            </View>
          ) : null}
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
            <VerificationBadge
              verificationState={verificationState}
              planSlug={storefront.planSlug}
              label={storefront.verificationLabel}
            />
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

          {storefront.description || storefront.email || storefront.website || storefront.joinedDate ? (
            <View style={styles.detailsCard}>
              <Text style={styles.detailsTitle}>Vendor details</Text>
              {storefront.description ? (
                <Text style={styles.detailDescription}>{storefront.description}</Text>
              ) : null}
              {storefront.email ? (
                <TouchableOpacity
                  style={styles.detailRow}
                  onPress={handleEmailVendor}
                  activeOpacity={0.7}
                >
                  <Ionicons name="mail-outline" size={18} color={theme.colors.textSecondary} />
                  <View style={styles.detailTextGroup}>
                    <Text style={styles.detailLabel}>Email</Text>
                    <Text style={styles.detailValue}>{storefront.email}</Text>
                  </View>
                </TouchableOpacity>
              ) : null}
              {storefront.website ? (
                <TouchableOpacity
                  style={styles.detailRow}
                  onPress={handleOpenWebsite}
                  activeOpacity={0.7}
                >
                  <Ionicons name="globe-outline" size={18} color={theme.colors.textSecondary} />
                  <View style={styles.detailTextGroup}>
                    <Text style={styles.detailLabel}>Website</Text>
                    <Text style={styles.detailValue}>{storefront.website}</Text>
                  </View>
                </TouchableOpacity>
              ) : null}
              {storefront.joinedDate ? (
                <View style={styles.detailRow}>
                  <Ionicons name="calendar-outline" size={18} color={theme.colors.textSecondary} />
                  <View style={styles.detailTextGroup}>
                    <Text style={styles.detailLabel}>Joined</Text>
                    <Text style={styles.detailValue}>{storefront.joinedDate}</Text>
                  </View>
                </View>
              ) : null}
            </View>
          ) : null}

          <View style={styles.listingsSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Listings</Text>
              <Text style={styles.sectionHint}>
                {listingsAvailable ? `${listingsAvailable} available` : 'No listings yet'}
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
                    <View style={styles.listingImageContainer}>
                      {listing.image ? (
                        <>
                          <Image source={{ uri: listing.image }} style={styles.listingImage} resizeMode="cover" />
                          <View style={styles.listingImageSheen} />
                        </>
                      ) : (
                        <View style={styles.listingPlaceholder}>
                          <Ionicons name="image-outline" size={28} color={theme.colors.textSecondary} />
                          <Text style={styles.listingPlaceholderText}>No image</Text>
                        </View>
                      )}
                    </View>
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

const VerificationBadge = ({ verificationState, planSlug, label }) => {
  const state = normaliseVerificationState(verificationState);
  const planPalette = PLAN_BADGES[normalisePlanSlug(planSlug || 'free')] || PLAN_BADGES.free;
  if (state === 'verified') {
    return (
      <View style={styles.badgeRow}>
        <MaterialCommunityIcons name="check-decagram" size={18} color={planPalette.background} />
        <Text style={[styles.metaText, styles.badgeVerifiedText, { color: planPalette.background }]}>
          {label || 'Verified vendor'}
        </Text>
      </View>
    );
  }
  const pending = state === 'pending';
  const color = pending ? theme.colors.orange : theme.colors.textSecondary;
  const icon = pending ? 'shield-half-outline' : 'shield-outline';
  return (
    <View style={styles.badgeRow}>
      <Ionicons name={icon} size={16} color={color} />
      <Text style={[styles.metaText, styles.badgePillText, { color }]}>
        {label || buildVerificationLabel(state)}
      </Text>
    </View>
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
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  badgePillText: {
    fontFamily: theme.typography.fontFamily.interSemiBold,
    fontSize: theme.typography.fontSize.xs,
  },
  badgeVerifiedText: {
    fontFamily: theme.typography.fontFamily.interSemiBold,
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
  detailsCard: {
    marginHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.xl,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.xl,
    backgroundColor: theme.colors.white,
    gap: theme.spacing.sm,
    ...theme.shadows.small,
  },
  detailsTitle: {
    fontFamily: theme.typography.fontFamily.interSemiBold,
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textPrimary,
  },
  detailDescription: {
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textSecondary,
    lineHeight: theme.typography.lineHeight.relaxed * theme.typography.fontSize.base,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  detailTextGroup: {
    flex: 1,
  },
  detailLabel: {
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
  },
  detailValue: {
    fontFamily: theme.typography.fontFamily.interMedium,
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textPrimary,
  },
  inlineError: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: `${theme.colors.orange}20`,
  },
  inlineErrorText: {
    flex: 1,
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.orange,
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
    backgroundColor: theme.colors.white,
    ...theme.shadows.small,
    overflow: 'hidden',
  },
  listingImageContainer: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: theme.colors.backgroundLight,
    position: 'relative',
  },
  listingImage: {
    ...StyleSheet.absoluteFillObject,
    width: undefined,
    height: undefined,
    transform: [{ scale: 1.05 }],
  },
  listingImageSheen: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  listingPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xs,
  },
  listingPlaceholderText: {
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textSecondary,
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
