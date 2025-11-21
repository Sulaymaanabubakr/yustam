import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Toast from '../../components/Toast';
import Button from '../../components/Button';
import theme from '../../theme';
import { collection, getDocs, limit, query, where } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import { vendorAPI, reviewsAPI } from '../../services/api';
import resolveMediaUrl from '../../utils/url';
import { goBackOrNavigate } from '../../utils/navigation';
import { formatDate, formatNaira, timeAgo } from '../../utils/formatters';
import { db } from '../../config/firebase';

const sanitizePhoneNumber = (value = '') => value.replace(/[^0-9]/g, '');

const PLAN_BADGES = {
  free: { background: '#E0E0E0', tick: '#757575', border: '#C5C5C5' },
  starter: { background: '#1877F2', tick: '#FFFFFF', border: '#145DB2' },
  pro: { background: '#CD7F32', tick: '#FFFFFF', border: '#A85B1F' },
  elite: { background: '#C0C0C0', tick: '#FFFFFF', border: '#9E9E9E' },
  power: { background: '#D4AF37', tick: '#FFFFFF', border: '#B78E1D' },
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
    vendorSlug: profile.storefrontSlug || profile.slug || profile.vendorSlug || '',
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
  if (!merged.vendorSlug) {
    merged.vendorSlug = update?.vendorSlug || base?.vendorSlug || '';
  }
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
    vendorSlug = '',
    vendorName = 'Marketplace Vendor',
    initialVendorProfile = null,
    listingId: routeListingId = null,
    listingPublicId: routeListingPublicId = '',
    listingTitle: routeListingTitle = '',
  } = route.params || {};

  const initialStorefront = useMemo(
    () => buildStorefrontFromProfile(initialVendorProfile),
    [initialVendorProfile]
  );

  const identifierCandidates = useMemo(() => {
    return [
      vendorSlug,
      vendorId,
      vendorUid,
      initialStorefront?.vendorSlug,
      initialStorefront?.vendorId,
      initialStorefront?.vendorUid,
    ]
      .map((value) => (value ? String(value).trim() : ''))
      .filter(Boolean)
      .filter((value, index, array) => array.indexOf(value) === index);
  }, [vendorId, vendorUid, vendorSlug, initialStorefront?.vendorId, initialStorefront?.vendorUid, initialStorefront?.vendorSlug]);

  const [storefront, setStorefront] = useState(initialStorefront);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [warning, setWarning] = useState('');
  const [toast, setToast] = useState({ visible: false, message: '', type: 'info' });
  const [activeTab, setActiveTab] = useState('listings');
  const [reviews, setReviews] = useState({ items: [], summary: { stats: {}, recent: [] } });
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsError, setReviewsError] = useState('');
  const [reviewForm, setReviewForm] = useState({ rating: 0, comment: '' });
  const [submittingReview, setSubmittingReview] = useState(false);
  const { user, role, isAuthenticated } = useAuth();
  const reviewsFetchedRef = useRef(false);

  const reviewVendorIdentifiers = useMemo(() => {
    const identifiers = {};
    const id = storefront?.vendorId || vendorId;
    if (id) {
      identifiers.vendorId = id;
    }
    const slugValue = storefront?.vendorSlug || vendorSlug;
    if (slugValue) {
      identifiers.vendorSlug = slugValue;
    }
    const uidValue = storefront?.vendorUid || vendorUid;
    if (uidValue) {
      identifiers.vendorUid = uidValue;
    }
    return identifiers;
  }, [storefront?.vendorId, vendorId, storefront?.vendorSlug, vendorSlug, storefront?.vendorUid, vendorUid]);

  const hasVendorIdentifiers = useMemo(
    () => Boolean(reviewVendorIdentifiers.vendorId || reviewVendorIdentifiers.vendorSlug || reviewVendorIdentifiers.vendorUid),
    [reviewVendorIdentifiers]
  );

  const listingContext = useMemo(() => {
    if (!routeListingId && !routeListingPublicId && !routeListingTitle) {
      return null;
    }
    return {
      listingId: routeListingId,
      listingPublicId: routeListingPublicId,
      title: routeListingTitle,
    };
  }, [routeListingId, routeListingPublicId, routeListingTitle]);

  const isBuyer = useMemo(() => {
    const resolvedRole = (role || user?.role || '').toString().toLowerCase();
    return resolvedRole === 'buyer';
  }, [role, user?.role]);

  const reviewerDisplayName = useMemo(
    () => user?.fullName || user?.displayName || user?.email || 'Buyer',
    [user?.displayName, user?.email, user?.fullName]
  );

  const reviewItems = useMemo(() => {
    if (Array.isArray(reviews.items) && reviews.items.length) {
      return reviews.items;
    }
    return Array.isArray(reviews.summary?.recent) ? reviews.summary.recent : [];
  }, [reviews.items, reviews.summary?.recent]);

  const totalReviewsCount = useMemo(() => {
    if (typeof reviews.summary?.stats?.totalReviews === 'number') {
      return reviews.summary.stats.totalReviews;
    }
    return typeof storefront?.totalReviews === 'number' ? storefront.totalReviews : reviewItems.length;
  }, [reviews.summary?.stats?.totalReviews, storefront?.totalReviews, reviewItems.length]);

  const averageRating = useMemo(() => {
    if (typeof reviews.summary?.stats?.averageRating === 'number') {
      return reviews.summary.stats.averageRating;
    }
    return typeof storefront?.rating === 'number' ? storefront.rating : null;
  }, [reviews.summary?.stats?.averageRating, storefront?.rating]);

  const distributionEntries = useMemo(() => {
    const source = reviews.summary?.stats?.distribution || {};
    const entries = [];
    for (let ratingValue = 5; ratingValue >= 1; ratingValue -= 1) {
      const rawCount = Number(source?.[ratingValue] ?? 0);
      const count = Number.isNaN(rawCount) ? 0 : rawCount;
      const percentage = totalReviewsCount > 0 ? Math.round((count / totalReviewsCount) * 100) : 0;
      entries.push({ value: ratingValue, count, percentage });
    }
    return entries;
  }, [reviews.summary?.stats?.distribution, totalReviewsCount]);

  const canSubmitReview = isAuthenticated && isBuyer;
  const submitDisabled =
    submittingReview ||
    !hasVendorIdentifiers ||
    reviewForm.rating < 1 ||
    reviewForm.comment.trim().length < 10;
  const hasReviews = reviewItems.length > 0;

  useEffect(() => {
    if (initialStorefront) {
      setStorefront((prev) => mergeStorefrontData(prev, initialStorefront));
    }
  }, [initialStorefront]);

  const showToast = (message, type = 'success') => setToast({ visible: true, message, type });
  const hideToast = () => setToast({ ...toast, visible: false });

  const tabs = useMemo(
    () => [
      { key: 'listings', label: 'Listings' },
      { key: 'reviews', label: 'Reviews' },
      { key: 'about', label: 'About' },
    ],
    []
  );

  const loadReviews = useCallback(
    async (force = false) => {
      if (!hasVendorIdentifiers) {
        return;
      }
      if (!force && reviewsFetchedRef.current) {
        return;
      }
      setReviewsLoading(true);
      setReviewsError('');
      try {
        const identifierPayload = { ...reviewVendorIdentifiers };
        const [summaryPayload, listPayload] = await Promise.all([
          reviewsAPI.summary(identifierPayload),
          reviewsAPI.list({ ...identifierPayload, status: 'published', pageSize: 25 }),
        ]);
        const nextSummary = summaryPayload || { stats: {}, recent: [] };
        const listItems = Array.isArray(listPayload?.reviews) ? listPayload.reviews : [];
        setReviews({ summary: nextSummary, items: listItems });
        reviewsFetchedRef.current = true;
      } catch (fetchError) {
        console.error('Vendor reviews load error:', fetchError);
        setReviewsError(fetchError?.message || 'Unable to load reviews right now.');
      } finally {
        setReviewsLoading(false);
      }
    },
    [hasVendorIdentifiers, reviewVendorIdentifiers]
  );

  useEffect(() => {
    if (activeTab === 'reviews') {
      loadReviews();
    }
  }, [activeTab, loadReviews]);

  useEffect(() => {
    reviewsFetchedRef.current = false;
    setReviews({ items: [], summary: { stats: {}, recent: [] } });
  }, [reviewVendorIdentifiers]);

  const handleSelectRating = (value) => {
    setReviewForm((prev) => ({ ...prev, rating: value }));
  };

  const handleChangeReviewComment = (text) => {
    setReviewForm((prev) => ({ ...prev, comment: text }));
  };

  const formatReviewMeta = (timestamp) => (timestamp ? timeAgo(timestamp) : 'Just now');

  const renderRatingIcons = (value, size = 16) => {
    const safe = Number(value) || 0;
    return Array.from({ length: 5 }, (_, index) => {
      const starValue = index + 1;
      const icon = safe >= starValue ? 'star' : 'star-outline';
      return (
        <Ionicons
          key={`display-star-${starValue}`}
          name={icon}
          size={size}
          color={theme.colors.orange}
        />
      );
    });
  };

  const handleSubmitReview = async () => {
    if (!isAuthenticated) {
      showToast('Sign in to share your experience.', 'info');
      navigation.navigate('Auth');
      return;
    }
    if (!isBuyer) {
      showToast('Switch to a buyer account to leave reviews.', 'info');
      return;
    }
    if (!hasVendorIdentifiers) {
      showToast('Unable to find this vendor.', 'error');
      return;
    }

    const ratingValue = Number(reviewForm.rating) || 0;
    if (ratingValue < 1) {
      showToast('Select a rating before submitting.', 'info');
      return;
    }

    const comment = reviewForm.comment.trim();
    if (comment.length < 10) {
      showToast('Please share at least 10 characters about your experience.', 'info');
      return;
    }

    setSubmittingReview(true);
    try {
      const payload = {
        ...reviewVendorIdentifiers,
        rating: ratingValue,
        comment,
        reviewerName: reviewerDisplayName,
      };
      if (listingContext?.listingId) {
        payload.listingId = listingContext.listingId;
      }
      if (listingContext?.listingPublicId) {
        payload.listingPublicId = listingContext.listingPublicId;
      }
      if (listingContext?.title) {
        payload.listingTitle = listingContext.title;
      }

      const response = await reviewsAPI.create(payload);
      const body = response?.data ?? response ?? {};
      const summaryRecord = body.summary ?? body.data?.summary ?? null;
      const createdFlag = Boolean(body.created ?? body.data?.created ?? true);

      if (summaryRecord?.stats) {
        setStorefront((prev) =>
          prev
            ? {
                ...prev,
                rating:
                  typeof summaryRecord.stats.averageRating === 'number'
                    ? summaryRecord.stats.averageRating
                    : prev.rating,
                totalReviews:
                  typeof summaryRecord.stats.totalReviews === 'number'
                    ? summaryRecord.stats.totalReviews
                    : prev.totalReviews,
              }
            : prev
        );
      }

      setReviewForm({ rating: 0, comment: '' });
      showToast(createdFlag ? 'Thanks! Your review was submitted.' : 'Your review has been updated.');

      reviewsFetchedRef.current = false;
      await loadReviews(true);
    } catch (submitError) {
      console.error('Submit review error:', submitError);
      const message =
        submitError?.response?.data?.message ||
        submitError?.message ||
        'Unable to submit review right now.';
      showToast(message, 'error');
    } finally {
      setSubmittingReview(false);
    }
  };

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
        <Text style={styles.headerTitle}>
          {storefront?.businessName || storefront?.name || vendorName}
        </Text>
        <View style={styles.headerSpacer} />
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabRow}
      >
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tabChip, activeTab === tab.key && styles.tabChipActive]}
            onPress={() => setActiveTab(tab.key)}
            activeOpacity={0.8}
          >
            <Text
              style={[styles.tabChipText, activeTab === tab.key && styles.tabChipTextActive]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

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
            <Text style={styles.businessName}>
              {storefront.businessName || storefront.name || vendorName}
            </Text>
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

          {activeTab === 'listings' && (
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
          )}

          {activeTab === 'reviews' && (
            <View style={styles.reviewsSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Reviews</Text>
                <Text style={styles.sectionHint}>
                  {totalReviewsCount ? `${totalReviewsCount} received` : 'No reviews yet'}
                </Text>
              </View>

              {reviewsLoading ? (
                <View style={styles.reviewsLoading}>
                  <ActivityIndicator size="small" color={theme.colors.primary} />
                  <Text style={styles.reviewsLoadingText}>Fetching reviews...</Text>
                </View>
              ) : reviewsError ? (
                <View style={styles.inlineErrorCard}>
                  <Ionicons name="warning-outline" size={18} color={theme.colors.orange} />
                  <Text style={styles.inlineErrorMessage}>{reviewsError}</Text>
                  <Button title="Try again" onPress={() => loadReviews(true)} />
                </View>
              ) : (
                <>
                  <View style={styles.reviewSummaryCard}>
                    <View style={styles.reviewSummaryValue}>
                      <Text style={styles.reviewAverageValue}>
                        {averageRating ? Number(averageRating).toFixed(1) : '—'}
                      </Text>
                      <View style={styles.reviewAverageStars}>{renderRatingIcons(averageRating, 20)}</View>
                      <Text style={styles.reviewCountText}>
                        {totalReviewsCount ? `${totalReviewsCount} review${totalReviewsCount > 1 ? 's' : ''}` : 'No reviews yet'}
                      </Text>
                    </View>
                    <View style={styles.reviewDistribution}>
                      {distributionEntries.map((entry) => (
                        <View key={`distribution-${entry.value}`} style={styles.distributionRow}>
                          <Text style={styles.distributionLabel}>{entry.value}★</Text>
                          <View style={styles.distributionBar}>
                            <View style={[styles.distributionFill, { width: `${entry.percentage}%` }]} />
                          </View>
                          <Text style={styles.distributionCount}>{entry.count}</Text>
                        </View>
                      ))}
                    </View>
                  </View>

                  {hasReviews ? (
                    <View style={styles.reviewList}>
                      {reviewItems.map((review, index) => {
                        const key =
                          review.id ||
                          review.reviewId ||
                          `${review.reviewerName || 'buyer'}-${review.createdAt || review.created_at || review.updatedAt || index}`;
                        const listingTitle = review.listingTitle || review.listing_name || review.listingTitleText;
                        return (
                          <View key={key} style={styles.reviewCard}>
                            <View style={styles.reviewCardHeader}>
                              <Text style={styles.reviewAuthor}>{review.reviewerName || review.reviewer || 'Buyer'}</Text>
                              <Text style={styles.reviewTimestamp}>
                                {formatReviewMeta(review.createdAt || review.created_at || review.updatedAt)}
                              </Text>
                            </View>
                            <View style={styles.reviewRatingRow}>{renderRatingIcons(review.rating, 16)}</View>
                            {review.comment ? (
                              <Text style={styles.reviewComment}>{review.comment}</Text>
                            ) : null}
                            {listingTitle ? (
                              <Text style={styles.reviewListingRef}>Listing: {listingTitle}</Text>
                            ) : null}
                          </View>
                        );
                      })}
                    </View>
                  ) : (
                    <View style={styles.emptyReviews}>
                      <Ionicons name="chatbox-ellipses-outline" size={40} color={theme.colors.textSecondary} />
                      <Text style={styles.emptyText}>No reviews yet. Be the first to share your experience.</Text>
                    </View>
                  )}
                </>
              )}

              <View style={styles.reviewFormCard}>
                <Text style={styles.reviewFormTitle}>Share your experience</Text>
                <Text style={styles.reviewFormSubtitle}>
                  {canSubmitReview
                    ? 'How would you rate this vendor?'
                    : 'Sign in as a buyer to leave a review.'}
                </Text>
                <View style={styles.reviewInputRatingRow}>
                  {Array.from({ length: 5 }, (_, index) => {
                    const starValue = index + 1;
                    const icon = reviewForm.rating >= starValue ? 'star' : 'star-outline';
                    return (
                      <TouchableOpacity
                        key={`input-star-${starValue}`}
                        onPress={() => handleSelectRating(starValue)}
                        activeOpacity={0.8}
                        disabled={!canSubmitReview || submittingReview}
                      >
                        <Ionicons
                          name={icon}
                          size={28}
                          color={
                            reviewForm.rating >= starValue
                              ? theme.colors.orange
                              : theme.colors.textSecondary
                          }
                        />
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <TextInput
                  style={styles.reviewCommentInput}
                  placeholder="Share details about your experience..."
                  value={reviewForm.comment}
                  onChangeText={handleChangeReviewComment}
                  multiline
                  numberOfLines={4}
                  editable={canSubmitReview && !submittingReview}
                  placeholderTextColor={theme.colors.textTertiary}
                  textAlignVertical="top"
                />
                <View style={styles.reviewSubmitWrapper}>
                  <Button
                    title={submittingReview ? 'Submitting...' : 'Submit review'}
                    onPress={handleSubmitReview}
                    disabled={!canSubmitReview || submitDisabled}
                  />
                </View>
                {!canSubmitReview ? (
                  <Text style={styles.reviewAuthHint}>
                    You need a buyer account to share reviews.
                  </Text>
                ) : null}
              </View>
            </View>
          )}

          {activeTab === 'about' && (
            <View style={styles.detailsCard}>
              <Text style={styles.detailsTitle}>Vendor details</Text>
              {storefront.description ? (
                <Text style={styles.detailDescription}>{storefront.description}</Text>
              ) : (
                <Text style={styles.detailPlaceholder}>Vendor has not added a storefront bio yet.</Text>
              )}
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
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const VerificationBadge = ({ verificationState, planSlug, label }) => {
  const state = normaliseVerificationState(verificationState);
  const planPalette = PLAN_BADGES[normalisePlanSlug(planSlug || 'free')] || PLAN_BADGES.free;
  if (state === 'verified') {
    const highlight = planPalette.tick || planPalette.background;
    return (
      <View style={styles.badgeRow}>
        <MaterialCommunityIcons name="check-decagram" size={18} color={highlight} />
        <Text style={[styles.metaText, styles.badgeVerifiedText, { color: highlight }]}>
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
  reviewsSection: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing['2xl'],
    gap: theme.spacing.lg,
  },
  reviewsLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  reviewsLoadingText: {
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  inlineErrorCard: {
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.xl,
    backgroundColor: `${theme.colors.orange}12`,
  },
  inlineErrorMessage: {
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.orange,
  },
  reviewSummaryCard: {
    flexDirection: 'row',
    gap: theme.spacing.lg,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.xl,
    backgroundColor: theme.colors.white,
    ...theme.shadows.small,
  },
  reviewSummaryValue: {
    width: '35%',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  reviewAverageValue: {
    fontFamily: theme.typography.fontFamily.anton,
    fontSize: theme.typography.fontSize['3xl'],
    color: theme.colors.textPrimary,
  },
  reviewAverageStars: {
    flexDirection: 'row',
    gap: 2,
  },
  reviewCountText: {
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  reviewDistribution: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  distributionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  distributionLabel: {
    width: 36,
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  distributionBar: {
    flex: 1,
    height: 8,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.backgroundLight,
    overflow: 'hidden',
  },
  distributionFill: {
    height: '100%',
    backgroundColor: theme.colors.orange,
  },
  distributionCount: {
    width: 24,
    textAlign: 'right',
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  reviewList: {
    gap: theme.spacing.md,
  },
  reviewCard: {
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.xl,
    backgroundColor: theme.colors.white,
    gap: theme.spacing.sm,
    ...theme.shadows.small,
  },
  reviewCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reviewAuthor: {
    fontFamily: theme.typography.fontFamily.interSemiBold,
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textPrimary,
  },
  reviewTimestamp: {
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textSecondary,
  },
  reviewRatingRow: {
    flexDirection: 'row',
    gap: 2,
  },
  reviewComment: {
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textSecondary,
    lineHeight: theme.typography.lineHeight.relaxed * theme.typography.fontSize.base,
  },
  reviewListingRef: {
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textTertiary,
  },
  emptyReviews: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing['2xl'],
  },
  reviewFormCard: {
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.xl,
    backgroundColor: theme.colors.white,
    gap: theme.spacing.md,
    ...theme.shadows.small,
  },
  reviewFormTitle: {
    fontFamily: theme.typography.fontFamily.interSemiBold,
    fontSize: theme.typography.fontSize.lg,
    color: theme.colors.textPrimary,
  },
  reviewFormSubtitle: {
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  reviewInputRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  reviewCommentInput: {
    minHeight: 120,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textPrimary,
    backgroundColor: theme.colors.background,
  },
  reviewSubmitWrapper: {
    alignItems: 'flex-start',
  },
  reviewAuthHint: {
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.xs,
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
