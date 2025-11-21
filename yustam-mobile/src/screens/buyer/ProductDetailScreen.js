import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Linking,
  Modal,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { doc, getDoc } from 'firebase/firestore';
import { Video, ResizeMode } from 'expo-av';
import theme from '../../theme';
import Toast from '../../components/Toast';
import { db } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import { formatDate, formatNaira } from '../../utils/formatters';
import resolveMediaUrl from '../../utils/url';
import { API_BASE_URL, USER_ROLES } from '../../config/constants';
import { chatAPI, vendorAPI } from '../../services/api';
import { addRecentlyViewedListing } from '../../storage/recentlyViewed';

const { width } = Dimensions.get('window');
const HERO_HEIGHT = width * 0.78;
const LIGHTBOX_MAX_HEIGHT = width * 1.2;
const FEATURE_FIELDS = [
  'keyFeatures',
  'highlights',
  'highlightFeatures',
  'smartFeatures',
  'features',
  'featureList',
  'sellingPoints',
];
const EXCLUDED_SPEC_KEYS = new Set([
  'title',
  'listingtitle',
  'producttitle',
  'productname',
  'name',
  'price',
  'amount',
  'oldprice',
  'previousprice',
  'current_price',
  'currency',
  'description',
  'details',
  'highlights',
  'highlightfeatures',
  'smartfeatures',
  'features',
  'featurelist',
  'sellingpoints',
  'category',
  'subcategory',
  'collection',
  'segment',
  'status',
  'state',
  'city',
  'country',
  'vendor',
  'vendorid',
  'vendor_id',
  'vendoruid',
  'vendor_uid',
  'vendorfirebaseuid',
  'vendorfirebase_uid',
  'vendorname',
  'vendorbusinessname',
  'vendorplan',
  'vendorverified',
  'vendorverification',
  'verification',
  'verificationstatus',
  'verification_state',
  'verificationstage',
  'plan',
  'planlabel',
  'planslug',
  'image',
  'imageurl',
  'imageurls',
  'images',
  'gallery',
  'primaryimage',
  'coverimage',
  'thumbnail',
  'createdat',
  'updatedat',
  'approvedat',
  'rejectedat',
  'feedback',
  'tags',
  'badges',
  'locationfiltervalue',
  'location',
  'vendorlocation',
  'vendorcity',
  'vendorstate',
  'vendorphone',
  'vendorwhatsapp',
  'vendor_email',
  'vendoremail',
  'vendorphoto',
  'vendoravatar',
  'syncstatus',
  'synced',
  'metadata',
]);
const PLACEHOLDER_IMAGE = resolveMediaUrl('logo.jpeg');
const PUBLIC_BASE_URL = (API_BASE_URL || '').replace(/\/api\/?$/, '') || API_BASE_URL;

const buildPublicUrl = (path = '') => {
  const base = (PUBLIC_BASE_URL || '').replace(/\/$/, '');
  const normalisedPath = path.startsWith('/') ? path.slice(1) : path;
  return `${base}/${normalisedPath}`;
};

const ProductDetailScreen = ({ navigation, route }) => {
  const { productId, product: initialProduct } = route.params || {};
  const { user, role } = useAuth();
  const [listingSource, setListingSource] = useState(initialProduct || null);
  const [listingId, setListingId] = useState(productId || initialProduct?.id || null);
  const [gallery, setGallery] = useState(() => deriveGallery(initialProduct));
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [loading, setLoading] = useState(!initialProduct);
  const [error, setError] = useState('');
  const [toast, setToast] = useState({ visible: false, message: '', type: 'info' });
  const [chatLoading, setChatLoading] = useState(false);
  const [vendorRecord, setVendorRecord] = useState(null);
  const [vendorLoading, setVendorLoading] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);
  const [lightboxVisible, setLightboxVisible] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const vendorLookupKeyRef = useRef('');
  const scrollRef = useRef(null);
  const lightboxScrollRef = useRef(null);

  const listing = useMemo(() => buildListingModel(listingSource, listingId), [listingSource, listingId]);
  const listingData = listing?.raw || listingSource || {};
  const features = useMemo(() => extractFeaturesFromListing(listingData), [listingData]);
  const specifications = useMemo(() => extractSpecifications(listingData), [listingData]);
  const baseVendor = useMemo(() => buildVendorFromListing(listing), [listing]);
  const vendorProfile = useMemo(() => mergeVendorProfiles(baseVendor, vendorRecord), [baseVendor, vendorRecord]);
  const verificationState = vendorProfile.verification || 'unverified';
  const verificationLabel = vendorProfile.verificationLabel || buildVerificationLabel(verificationState);
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
  const hasStorefront = Boolean(
    vendorProfile.storefrontSlug || vendorProfile.vendorUid || vendorProfile.vendorId || vendorProfile.storefrontUrl
  );

  const vendorIdentifiers = useMemo(() => {
    if (!listing) {
      return [];
    }
    return [listing.vendorSlug, listing.vendorUid, listing.vendorFirebaseUid, listing.vendorId]
      .map((value) => (value ? String(value).trim() : ''))
      .filter(Boolean);
  }, [listing]);

  const fetchVendorProfile = useCallback(async (identifiers) => {
    if (!identifiers.length) {
      return;
    }

    setVendorLoading(true);
    for (const identifier of identifiers) {
      try {
        const payload = await vendorAPI.getStorefront(identifier);
        if (payload?.vendor) {
          setVendorRecord(transformVendorPayload(payload.vendor));
          setVendorLoading(false);
          return;
        }
      } catch (fetchError) {
        console.warn('Vendor lookup failed for', identifier, fetchError);
      }
    }
    setVendorLoading(false);
  }, []);

  useEffect(() => {
    const identifierKey = vendorIdentifiers.join('|');
    if (!identifierKey || identifierKey === vendorLookupKeyRef.current) {
      return;
    }
    vendorLookupKeyRef.current = identifierKey;
    fetchVendorProfile(vendorIdentifiers);
  }, [fetchVendorProfile, vendorIdentifiers]);

  useEffect(() => {
    setGallery(deriveGallery(listingSource));
    setActiveImageIndex(0);
    setLightboxIndex(0);
  }, [listingSource]);

  useEffect(() => {
    if (!lightboxVisible) {
      return;
    }
    requestAnimationFrame(() => {
      if (lightboxScrollRef.current) {
        lightboxScrollRef.current.scrollTo({ x: lightboxIndex * width, animated: false });
      }
    });
  }, [lightboxVisible, lightboxIndex]);

  useEffect(() => {
    if (!listing) {
      return;
    }
    const heroAsset = gallery?.[0];
    const heroPreview = heroAsset?.preview || heroAsset?.uri || PLACEHOLDER_IMAGE;
    const entry = {
      id: listing.id,
      title: listing.title,
      name: listing.title,
      price: listing.price,
      image: heroPreview,
      location: listing.location,
      category: listing.category,
    };
    addRecentlyViewedListing(entry);
  }, [listing, gallery]);

  useEffect(() => {
    const targetId = productId || initialProduct?.id;
    if (!targetId) {
      setLoading(false);
      setError('Missing listing reference.');
      return;
    }

    let isMounted = true;

    const loadListing = async () => {
      try {
        setLoading(true);
        const snapshot = await getDoc(doc(db, 'listings', targetId));
        if (!snapshot.exists()) {
          if (isMounted) {
            setError('Listing not found or has been removed.');
          }
          return;
        }
        const data = snapshot.data() || {};
        if (isMounted) {
          setError('');
          setListingSource({ ...data });
          setListingId(snapshot.id);
        }
      } catch (fetchError) {
        console.error('Unable to load listing:', fetchError);
        if (isMounted) {
          setError(fetchError?.message || 'Unable to load this product right now.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadListing();
    return () => {
      isMounted = false;
    };
  }, [initialProduct?.id, productId, reloadToken]);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ visible: true, message, type });
  }, []);

  const hideToast = useCallback(() => {
    setToast((prev) => ({ ...prev, visible: false }));
  }, []);

  const handleShare = useCallback(async () => {
    if (!listing) {
      return;
    }
    const shareUrl = buildListingShareUrl(listing.id || productId);
    try {
      await Share.share({
        title: listing.title,
        message: `${listing.title} on Yustam Marketplace${listing.price ? ` - ${formatNaira(listing.price)}` : ''}\n${shareUrl}`,
        url: shareUrl,
      });
    } catch (shareError) {
      console.warn('Share failed:', shareError);
    }
  }, [listing, productId]);

  const handleCallVendor = useCallback(async () => {
    if (!vendorProfile.phone) {
      showToast('Vendor phone number is unavailable.', 'error');
      return;
    }
    const tel = vendorProfile.phone.replace(/\s+/g, '');
    try {
      await Linking.openURL(`tel:${tel}`);
    } catch (callError) {
      showToast('Unable to open the dialer on this device.', 'error');
    }
  }, [showToast, vendorProfile.phone]);

  const handleWhatsappVendor = useCallback(async () => {
    const number = vendorProfile.whatsapp || vendorProfile.phone;
    if (!number) {
      showToast('Vendor WhatsApp number is unavailable.', 'error');
      return;
    }
    const digits = sanitizePhoneNumber(number);
    if (!digits) {
      showToast('Vendor WhatsApp number is invalid.', 'error');
      return;
    }
    const messageLines = [
      `Hello ${vendorProfile.name || 'vendor'},`,
      '',
      `I am interested in "${listing?.title || 'your listing'}" on Yustam.`,
    ];
    if (listing?.price) {
      messageLines.push(`Displayed price: ${formatNaira(listing.price)}.`);
    }
    const url = buildListingShareUrl(listing?.id || productId || '');
    messageLines.push(`Listing link: ${url}`);
    const encodedMessage = encodeURIComponent(messageLines.join('\n'));
    const whatsappUrl = `https://wa.me/${digits}?text=${encodedMessage}`;
    try {
      await Linking.openURL(whatsappUrl);
    } catch (waError) {
      showToast('Unable to open WhatsApp on this device.', 'error');
    }
  }, [listing, productId, showToast, vendorProfile.name, vendorProfile.phone, vendorProfile.whatsapp]);

  const handleOpenStorefront = useCallback(() => {
    const targetVendorUid = vendorProfile.vendorUid;
    const targetVendorId = vendorProfile.vendorId;
    const targetSlug = vendorProfile.storefrontSlug;
    if (!targetVendorUid && !targetVendorId && !targetSlug) {
      showToast('Vendor storefront is not available yet.', 'info');
      return;
    }
    navigation.navigate('VendorStorefront', {
      vendorUid: targetVendorUid,
      vendorId: targetVendorId,
      vendorSlug: targetSlug,
      vendorName: vendorProfile.name,
      initialVendorProfile: vendorProfile,
    });
  }, [
    navigation,
    showToast,
    vendorProfile,
    vendorProfile.name,
    vendorProfile.storefrontSlug,
    vendorProfile.vendorId,
    vendorProfile.vendorUid,
  ]);

  const resolveExistingThread = useCallback(async () => {
    try {
      const threads = await chatAPI.listThreads();
      if (!Array.isArray(threads)) {
        return null;
      }
      const buyerUid = String(user?.uid || '').trim();
      const vendorUid = String(vendorProfile.vendorUid || '').trim();
      if (!buyerUid || !vendorUid) {
        return null;
      }
      const targetListingId = listing?.id ? String(listing.id) : '';
      return (
        threads.find((thread) => {
          const threadBuyerUid = String(thread?.buyerUid || thread?.buyer_uid || '').trim();
          const threadVendorUid = String(thread?.vendorUid || thread?.vendor_uid || '').trim();
          const threadListingId = String(thread?.listingId || thread?.listing_id || '').trim();
          const matchesListing = targetListingId ? threadListingId === targetListingId : true;
          return threadBuyerUid === buyerUid && threadVendorUid === vendorUid && matchesListing;
        }) || null
      );
    } catch (fallbackError) {
      console.warn('Chat fallback resolution failed:', fallbackError);
      return null;
    }
  }, [listing?.id, user?.uid, vendorProfile.vendorUid]);

  const handleChatVendor = useCallback(async () => {
    if (!listing || !vendorProfile.vendorUid) {
      showToast('Vendor chat is unavailable for this listing.', 'error');
      return;
    }
    if (!user?.uid) {
      showToast('Please sign in to start a chat.', 'error');
      return;
    }
    if (role && role !== USER_ROLES.BUYER) {
      showToast('Switch to buyer mode to chat with vendors.', 'info');
      return;
    }

    setChatLoading(true);
    try {
      const coverAsset = gallery[activeImageIndex] || gallery[0] || null;
      const coverImage = coverAsset?.preview || coverAsset?.uri || PLACEHOLDER_IMAGE;
      const payload = {
        buyer_uid: user.uid,
        buyer_name: user.fullName || user.displayName || user.email || 'Buyer',
        vendor_uid: vendorProfile.vendorUid,
        vendor_name: vendorProfile.name,
        vendor_business_name: vendorProfile.businessName || vendorProfile.name,
        vendor_plan: vendorProfile.planLabel,
        listing_id: listing.id,
        listing_title: listing.title,
        listing_image: coverImage,
      };
      const thread = await chatAPI.openChat(payload);
      const chatId = thread?.id || thread?.threadId;
      if (!chatId) {
        throw new Error('Unable to start chat right now.');
      }

      navigation.navigate('ChatThread', {
        chatId,
        firebaseThreadId: thread?.firebaseThreadId,
        vendorName: vendorProfile.name,
        vendorPhoto: vendorProfile.avatar,
        vendorPlanLabel: vendorProfile.planLabel,
        vendorUid: vendorProfile.vendorUid,
        listingTitle: listing.title,
        listingId: listing.id,
        listingImage: coverImage,
        buyerId: user.uid,
        buyerName: user.fullName || user.displayName || user.email || 'Buyer',
      });
    } catch (chatError) {
      console.error('Chat initialisation failed:', chatError);
      const messageText = typeof chatError?.message === 'string' ? chatError.message : '';
      if (messageText.toLowerCase().includes('unable to open chat thread')) {
        const fallbackThread = await resolveExistingThread();
        if (fallbackThread) {
          navigation.navigate('ChatThread', {
            chatId: fallbackThread.id || fallbackThread.chat_id,
            firebaseThreadId: fallbackThread.firebaseThreadId || null,
            vendorName: vendorProfile.name,
            vendorPhoto: vendorProfile.avatar,
            vendorPlanLabel: vendorProfile.planLabel,
            vendorUid: vendorProfile.vendorUid,
            listingTitle: fallbackThread.listingTitle || listing?.title,
            listingId: fallbackThread.listingId || listing?.id,
            listingImage:
              fallbackThread.listingImage || coverImage || gallery[0]?.preview || gallery[0]?.uri || PLACEHOLDER_IMAGE,
            buyerId: fallbackThread.buyerUid || user?.uid,
            buyerName: fallbackThread.buyerName || user?.fullName || user?.displayName || user?.email || 'Buyer',
          });
          return;
        }
      }
      showToast(messageText || 'Unable to start chat.', 'error');
    } finally {
      setChatLoading(false);
    }
  }, [
    activeImageIndex,
    gallery,
    listing,
    navigation,
    resolveExistingThread,
    role,
    showToast,
    user?.displayName,
    user?.email,
    user?.fullName,
    user?.uid,
    vendorProfile.avatar,
    vendorProfile.businessName,
    vendorProfile.name,
    vendorProfile.planLabel,
    vendorProfile.vendorUid,
  ]);

  const handleGalleryScroll = useCallback(
    (event) => {
      const offsetX = event.nativeEvent.contentOffset.x;
      const index = Math.round(offsetX / width);
      const clamped = Math.max(0, Math.min(index, Math.max(gallery.length - 1, 0)));
      setActiveImageIndex(clamped);
      setLightboxIndex(clamped);
    },
    [gallery.length]
  );

  const handleRetry = useCallback(() => {
    setReloadToken((prev) => prev + 1);
    setError('');
  }, []);

  const openLightbox = useCallback(
    (index) => {
      const clamped = Math.max(0, Math.min(index, Math.max(gallery.length - 1, 0)));
      setLightboxIndex(clamped);
      setLightboxVisible(true);
    },
    [gallery.length]
  );

  const closeLightbox = useCallback(() => {
    setLightboxVisible(false);
  }, []);

  const goToMedia = useCallback(
    (index) => {
      if (!gallery.length) {
        return;
      }
      const clamped = Math.max(0, Math.min(index, gallery.length - 1));
      setLightboxIndex(clamped);
      setActiveImageIndex(clamped);
      if (lightboxScrollRef.current) {
        lightboxScrollRef.current.scrollTo({ x: clamped * width, animated: true });
      }
    },
    [gallery.length]
  );

  const handleLightboxScroll = useCallback(
    (event) => {
      const offsetX = event.nativeEvent.contentOffset.x;
      const index = Math.round(offsetX / width);
      const clamped = Math.max(0, Math.min(index, Math.max(gallery.length - 1, 0)));
      setLightboxIndex(clamped);
      setActiveImageIndex(clamped);
    },
    [gallery.length]
  );

  const renderStatus = () => {
    if (!listing?.statusLabel) {
      return null;
    }
    return (
      <View style={styles.statusChip}>
        <Ionicons name="shield-checkmark-outline" size={14} color={theme.colors.emerald} />
        <Text style={styles.statusText}>{listing.statusLabel}</Text>
      </View>
    );
  };
  if (!loading && !listing) {
    return (
      <SafeAreaView style={styles.emptyContainer}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
            <Ionicons name="arrow-back" size={22} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Product</Text>
          <View style={styles.headerButton} />
        </View>
        <View style={styles.centerContent}>
          <Ionicons name="cube-outline" size={48} color={theme.colors.textSecondary} />
          <Text style={styles.emptyTitle}>We can&apos;t find that product</Text>
          <Text style={styles.emptyMessage}>
            The vendor might have removed it or changed the link. Please explore other listings.
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
            <Text style={styles.retryButtonText}>Refresh</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <Toast visible={toast.visible} message={toast.message} type={toast.type} onDismiss={hideToast} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
          <Ionicons name="arrow-back" size={22} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Product Details</Text>
        <TouchableOpacity onPress={handleShare} style={styles.headerButton}>
          <Ionicons name="share-social-outline" size={22} color={theme.colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {loading && !listingSource ? (
        <View style={styles.centerContent}>
          <ActivityIndicator color={theme.colors.primary} />
          <Text style={styles.loadingText}>Fetching live listing...</Text>
        </View>
      ) : (
        <ScrollView
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollBody}
        >
          <View style={styles.heroWrapper}>
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={handleGalleryScroll}
            >
              {gallery.map((media, index) => {
                const isVideo = media.type === 'video';
                const usePoster = isVideo && media.preview && media.preview !== media.uri;
                return (
                  <TouchableOpacity
                    key={media.id || `${media.uri}-${index}`}
                    activeOpacity={0.9}
                    style={styles.heroSlide}
                    onPress={() => openLightbox(index)}
                    accessibilityRole="button"
                    accessibilityLabel="Open media viewer"
                  >
                    {isVideo ? (
                      <View style={styles.heroVideoWrapper}>
                        <Video
                          source={{ uri: media.uri }}
                          style={styles.heroVideo}
                          resizeMode={ResizeMode.COVER}
                          shouldPlay={false}
                          isLooping
                          muted
                          useNativeControls={false}
                          posterSource={usePoster ? { uri: media.preview } : undefined}
                          posterStyle={styles.heroVideo}
                          usePoster={usePoster}
                        />
                        <View style={styles.heroPlayOverlay} pointerEvents="none">
                          <Ionicons name="play-circle" size={64} color={theme.colors.white} />
                        </View>
                      </View>
                    ) : (
                      <Image source={{ uri: media.preview }} style={styles.heroImage} resizeMode="cover" />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            {gallery.length > 1 ? (
              <View style={styles.paginationDots}>
                {gallery.map((_, index) => (
                  <View key={`dot-${index}`} style={[styles.dot, index === activeImageIndex && styles.activeDot]} />
                ))}
              </View>
            ) : null}
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.productTitle}>{listing?.title || 'Marketplace listing'}</Text>
            {renderStatus()}
            <View style={styles.priceRow}>
              {listing?.price ? (
                <Text style={styles.price}>{formatNaira(listing.price)}</Text>
              ) : (
                <Text style={styles.price}>Contact vendor</Text>
              )}
              {listing?.oldPrice ? <Text style={styles.oldPrice}>{formatNaira(listing.oldPrice)}</Text> : null}
            </View>
            <View style={styles.metaRow}>
              {listing?.categoryLabel ? (
                <View style={styles.metaPill}>
                  <Ionicons name="layers-outline" size={14} color={theme.colors.textSecondary} />
                  <Text style={styles.metaText}>{listing.categoryLabel}</Text>
                </View>
              ) : null}
              {listing?.location ? (
                <View style={styles.metaPill}>
                  <Ionicons name="location-outline" size={14} color={theme.colors.textSecondary} />
                  <Text style={styles.metaText}>{listing.location}</Text>
                </View>
              ) : null}
              {listing?.createdAt ? (
                <View style={styles.metaPill}>
                  <Ionicons name="time-outline" size={14} color={theme.colors.textSecondary} />
                  <Text style={styles.metaText}>{formatDate(listing.createdAt)}</Text>
                </View>
              ) : null}
            </View>

            {listing?.badges?.length ? (
              <View style={styles.badgeRow}>
                {listing.badges.map((badge) => (
                  <View key={badge} style={styles.badge}>
                    <Text style={styles.badgeText}>{badge}</Text>
                  </View>
                ))}
              </View>
            ) : null}

            <Text style={styles.sectionHeading}>Overview</Text>
            <Text style={styles.bodyText}>
              {listing?.description || 'This vendor has not provided additional information for this listing.'}
            </Text>
          </View>

          {features.length ? (
            <View style={styles.sectionCard}>
              <Text style={styles.sectionHeading}>Key features</Text>
              {features.map((feature) => (
                <View key={feature} style={styles.listRow}>
                  <Ionicons name="checkmark-circle-outline" size={20} color={theme.colors.primary} />
                  <Text style={styles.listText}>{feature}</Text>
                </View>
              ))}
            </View>
          ) : null}

          <View style={styles.sectionCard}>
            <Text style={styles.sectionHeading}>Specifications</Text>
            {specifications.length ? (
              specifications.map((spec) => (
                <View key={`${spec.label}-${spec.value}`} style={styles.specRow}>
                  <Text style={styles.specLabel}>{spec.label}</Text>
                  <Text style={styles.specValue}>{spec.value}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.bodyText}>
                Vendor has not provided detailed specifications for this item yet.
              </Text>
            )}
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionHeading}>Listing info</Text>
            {listing?.categoryLabel ? (
              <View style={styles.specRow}>
                <Text style={styles.specLabel}>Category</Text>
                <Text style={styles.specValue}>{listing.categoryLabel}</Text>
              </View>
            ) : null}
            {listing?.location ? (
              <View style={styles.specRow}>
                <Text style={styles.specLabel}>Location</Text>
                <Text style={styles.specValue}>{listing.location}</Text>
              </View>
            ) : null}
            {listing?.createdAt ? (
              <View style={styles.specRow}>
                <Text style={styles.specLabel}>Posted on</Text>
                <Text style={styles.specValue}>{formatDate(listing.createdAt)}</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.sectionCard}>
            <View style={styles.vendorHeader}>
              <View style={styles.vendorAvatarWrapper}>
                {vendorProfile.avatar ? (
                  <Image source={{ uri: vendorProfile.avatar }} style={styles.vendorAvatar} />
                ) : (
                  <View style={styles.vendorAvatarPlaceholder}>
                    <Ionicons name="storefront-outline" size={20} color={theme.colors.white} />
                  </View>
                )}
              </View>
              <View style={styles.vendorInfo}>
                <Text style={styles.vendorName}>{vendorProfile.name || 'Marketplace Vendor'}</Text>
                <Text style={styles.vendorPlan}>{vendorProfile.planLabel || 'Free Plan'}</Text>
                <View style={styles.metaRow}>
                  <View style={styles.metaPill}>
                    <Ionicons name={verificationIcon} size={14} color={verificationColor} />
                    <Text style={[styles.metaText, { color: verificationColor }]}>{verificationLabel}</Text>
                  </View>
                </View>
              </View>
              <TouchableOpacity
                style={[styles.storefrontButton, !hasStorefront && styles.disabledCta]}
                onPress={handleOpenStorefront}
                disabled={!hasStorefront}
              >
                <Ionicons name="open-outline" size={18} color={theme.colors.primary} />
                <Text style={styles.storefrontText}>Storefront</Text>
              </TouchableOpacity>
            </View>

            {vendorLoading ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator color={theme.colors.primary} />
                <Text style={styles.bodyText}>Syncing vendor profile...</Text>
              </View>
            ) : null}

            {vendorProfile.location ? (
              <View style={styles.listRow}>
                <Ionicons name="location-outline" size={20} color={theme.colors.textSecondary} />
                <Text style={styles.listText}>{vendorProfile.location}</Text>
              </View>
            ) : null}

            {vendorProfile.phone ? (
              <View style={styles.listRow}>
                <Ionicons name="call-outline" size={20} color={theme.colors.textSecondary} />
                <Text style={styles.listText}>{vendorProfile.phone}</Text>
              </View>
            ) : null}

            {vendorProfile.email ? (
              <View style={styles.listRow}>
                <Ionicons name="mail-outline" size={20} color={theme.colors.textSecondary} />
                <Text style={styles.listText}>{vendorProfile.email}</Text>
              </View>
            ) : null}

            {listing?.tags?.length ? (
              <View style={styles.tagRow}>
                {listing.tags.map((tag) => (
                  <View key={tag} style={styles.tagPill}>
                    <Text style={styles.tagText}>{tag}</Text>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        </ScrollView>
      )}

      <Modal
        visible={lightboxVisible}
        transparent
        animationType="fade"
        onRequestClose={closeLightbox}
        presentationStyle="overFullScreen"
      >
        <View style={styles.lightboxContainer}>
          <TouchableOpacity
            style={styles.lightboxClose}
            onPress={closeLightbox}
            accessibilityRole="button"
            accessibilityLabel="Close media viewer"
          >
            <Ionicons name="close" size={26} color={theme.colors.white} />
          </TouchableOpacity>

          {gallery.length > 1 ? (
            <>
              <TouchableOpacity
                style={[styles.lightboxNav, styles.lightboxPrev, lightboxIndex === 0 && styles.lightboxNavDisabled]}
                onPress={() => goToMedia(lightboxIndex - 1)}
                disabled={lightboxIndex === 0}
                accessibilityRole="button"
                accessibilityLabel="Previous media"
              >
                <Ionicons name="chevron-back" size={28} color={theme.colors.white} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.lightboxNav,
                  styles.lightboxNext,
                  lightboxIndex === gallery.length - 1 && styles.lightboxNavDisabled,
                ]}
                onPress={() => goToMedia(lightboxIndex + 1)}
                disabled={lightboxIndex === gallery.length - 1}
                accessibilityRole="button"
                accessibilityLabel="Next media"
              >
                <Ionicons name="chevron-forward" size={28} color={theme.colors.white} />
              </TouchableOpacity>
            </>
          ) : null}

          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            ref={lightboxScrollRef}
            onMomentumScrollEnd={handleLightboxScroll}
          >
            {gallery.map((media, index) => (
              <View key={`lightbox-${media.id}`} style={styles.lightboxSlide}>
                {media.type === 'video' ? (
                  <Video
                    source={{ uri: media.uri }}
                    style={styles.lightboxVideo}
                    resizeMode={ResizeMode.CONTAIN}
                    shouldPlay={lightboxVisible && lightboxIndex === index}
                    isLooping
                    useNativeControls
                  />
                ) : (
                  <Image source={{ uri: media.uri }} style={styles.lightboxImage} resizeMode="contain" />
                )}
              </View>
            ))}
          </ScrollView>

          <View style={styles.lightboxFooter}>
            <Text style={styles.lightboxCounter}>{`${lightboxIndex + 1} / ${gallery.length}`}</Text>
          </View>
        </View>
      </Modal>

      <View style={styles.contactBar}>
        <TouchableOpacity
          style={[styles.secondaryCta, !vendorProfile.phone && styles.disabledCta]}
          onPress={handleCallVendor}
          disabled={!vendorProfile.phone}
        >
          <Ionicons name="call-outline" size={20} color={theme.colors.primary} />
          <Text style={styles.secondaryCtaText}>Call</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.secondaryCta, !(vendorProfile.whatsapp || vendorProfile.phone) && styles.disabledCta]}
          onPress={handleWhatsappVendor}
          disabled={!(vendorProfile.whatsapp || vendorProfile.phone)}
        >
          <Ionicons name="logo-whatsapp" size={20} color={theme.colors.primary} />
          <Text style={styles.secondaryCtaText}>WhatsApp</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.primaryCta, chatLoading && styles.disabledCta]}
          onPress={handleChatVendor}
          disabled={chatLoading}
        >
          {chatLoading ? (
            <ActivityIndicator color={theme.colors.white} />
          ) : (
            <>
              <Ionicons name="chatbubble-ellipses-outline" size={20} color={theme.colors.white} />
              <Text style={styles.primaryCtaText}>Chat vendor</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};
const pickFirstString = (...values) => {
  for (const value of values) {
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed) {
        return trimmed;
      }
    }
  }
  return '';
};

const parsePrice = (value) => {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  const numeric = Number(String(value).replace(/[^0-9.]/g, ''));
  return Number.isFinite(numeric) ? numeric : null;
};

const ensureArray = (input) => {
  if (Array.isArray(input)) {
    return input;
  }
  if (input === null || input === undefined) {
    return [];
  }
  return [input];
};

const dedupeArray = (values = []) => {
  return Array.from(
    new Set(
      ensureArray(values)
        .map((value) => (typeof value === 'string' ? value.trim() : value))
        .filter(Boolean)
    )
  );
};

const normaliseStatus = (value) => {
  const normalised = String(value || '').trim().toLowerCase();
  if (!normalised) {
    return 'available';
  }
  if (['approved', 'active', 'live', 'available', 'published'].includes(normalised)) {
    return 'available';
  }
  if (['pending', 'in_review', 'review', 'processing'].includes(normalised)) {
    return 'pending';
  }
  if (['sold', 'soldout', 'unavailable', 'disabled', 'suspended'].includes(normalised)) {
    return 'unavailable';
  }
  return normalised;
};

const buildStatusLabel = (status) => {
  switch (status) {
    case 'pending':
      return 'Pending approval';
    case 'unavailable':
      return 'Temporarily unavailable';
    case 'available':
      return 'Available';
    default:
      return friendlyLabel(status || 'Status');
  }
};

const parseTimestamp = (value) => {
  if (!value) {
    return null;
  }
  if (typeof value.toDate === 'function') {
    return value.toDate();
  }
  if (value instanceof Date) {
    return value;
  }
  if (typeof value === 'object' && typeof value.seconds === 'number') {
    return new Date(value.seconds * 1000);
  }
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : new Date(parsed);
};

const deriveGallery = (source = {}) => {
  const items = [];
  const seen = new Set();

  const pushEntry = (type, uriCandidate, extras = {}) => {
    if (!uriCandidate) {
      return;
    }
    const resolvedUri = resolveMediaUrl(uriCandidate);
    if (!resolvedUri) {
      return;
    }
    const key = `${type}:${resolvedUri}`;
    if (seen.has(key)) {
      return;
    }
    seen.add(key);
    const previewCandidate =
      type === 'video'
        ? resolveMediaUrl(extras.preview) || resolveMediaUrl(extras.thumbnail) || resolveMediaUrl(extras.poster)
        : resolvedUri;
    const preview = previewCandidate || resolvedUri;
    items.push({
      id: extras.id || `${type}-${items.length}`,
      type,
      uri: resolvedUri,
      preview,
    });
  };

  if (Array.isArray(source.media)) {
    source.media.forEach((entry, index) => {
      const uriCandidate = entry?.url || entry?.secureUrl || entry?.secure_url;
      const resource = String(entry?.resourceType || entry?.type || '').toLowerCase();
      const type = resource === 'video' ? 'video' : 'image';
      const preview = entry?.preview || entry?.thumbnail || entry?.poster || entry?.image;
      pushEntry(type, uriCandidate, {
        id: entry?.publicId || entry?.public_id || `${type}-media-${index}`,
        preview,
        thumbnail: entry?.thumbnail,
        poster: entry?.poster,
      });
    });
  }

  const videoFields = [
    source.video,
    source.videoUrl,
    source.video_url,
    source.videoLink,
    source.video_link,
  ];
  videoFields.forEach((candidate, index) => {
    pushEntry('video', candidate, {
      id: `video-field-${index}`,
      preview: source.videoPoster || source.videoThumbnail || source.primaryImage || source.image,
    });
  });

  const imageCollections = [source.images, source.imageUrls, source.gallery, source.photos];
  imageCollections.forEach((collection, groupIndex) => {
    if (!Array.isArray(collection)) {
      return;
    }
    collection.forEach((item, index) => {
      const uriCandidate =
        typeof item === 'string' ? item : item?.url || item?.uri || item?.secureUrl || item?.secure_url;
      pushEntry('image', uriCandidate, {
        id: `image-${groupIndex}-${index}`,
      });
    });
  });

  const imageFields = [source.image, source.primaryImage, source.coverImage, source.thumbnail];
  imageFields.forEach((candidate, index) => {
    pushEntry('image', candidate, {
      id: `image-field-${index}`,
    });
  });

  if (!items.length) {
    items.push({
      id: 'placeholder',
      type: 'image',
      uri: PLACEHOLDER_IMAGE,
      preview: PLACEHOLDER_IMAGE,
    });
  }

  return items;
};

const extractFeaturesFromListing = (source = {}) => {
  const featureSet = new Set();
  FEATURE_FIELDS.forEach((field) => {
    const value = source[field];
    if (!value) {
      return;
    }
    if (Array.isArray(value)) {
      value.forEach((item) => {
        const text = String(item || '').trim();
        if (text) {
          featureSet.add(text);
        }
      });
      return;
    }
    if (typeof value === 'string') {
      value
        .split(/[\n;,•]+/)
        .map((item) => item.trim())
        .filter(Boolean)
        .forEach((item) => featureSet.add(item));
    }
  });
  return Array.from(featureSet);
};

const formatSpecValue = (rawValue) => {
  if (rawValue === null || rawValue === undefined) {
    return '';
  }
  if (typeof rawValue === 'string') {
    return rawValue.trim();
  }
  if (typeof rawValue === 'number') {
    return Number.isFinite(rawValue) ? `${rawValue}` : '';
  }
  if (typeof rawValue === 'boolean') {
    return rawValue ? 'Yes' : 'No';
  }
  if (typeof rawValue.toDate === 'function') {
    return formatDate(rawValue.toDate());
  }
  if (rawValue instanceof Date) {
    return formatDate(rawValue);
  }
  if (Array.isArray(rawValue)) {
    return rawValue.map((item) => formatSpecValue(item)).filter(Boolean).join(', ');
  }
  return '';
};

const friendlyLabel = (value) => {
  if (!value) {
    return '';
  }
  return String(value)
    .replace(/[_\-]/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .replace(/\b\w/g, (match) => match.toUpperCase())
    .trim();
};

const extractSpecifications = (source = {}) => {
  if (!source || typeof source !== 'object') {
    return [];
  }
  const rows = [];
  Object.entries(source).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return;
    }
    const normalisedKey = key.toLowerCase();
    if (EXCLUDED_SPEC_KEYS.has(normalisedKey)) {
      return;
    }
    if (normalisedKey.includes('uid') || normalisedKey.includes('token') || normalisedKey.includes('sync')) {
      return;
    }
    if (normalisedKey.includes('image') || normalisedKey.includes('photo') || normalisedKey.includes('url')) {
      return;
    }
    const displayValue = formatSpecValue(value);
    if (!displayValue) {
      return;
    }
    rows.push({ label: friendlyLabel(key), value: displayValue });
  });
  return rows.slice(0, 24);
};

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
  const cleaned = plan.replace(/plan$/i, '').trim();
  return `${cleaned || 'Free'} Plan`;
};

const buildLocationLabel = ({ location, city, state, country }) => {
  const parts = [];
  if (city) {
    parts.push(city);
  }
  if (state && (!city || city.toLowerCase() !== state.toLowerCase())) {
    parts.push(state);
  }
  if (!parts.length && location) {
    parts.push(location);
  }
  if (country && !parts.includes(country)) {
    parts.push(country);
  }
  return parts.filter(Boolean).join(', ');
};

const buildListingModel = (source = {}, fallbackId) => {
  if (!source) {
    return null;
  }
  const data = typeof source.data === 'function' ? source.data() : source;
  const id =
    data.id || data.listingId || data.listing_id || data.firestoreId || fallbackId || data.public_id || null;
  const title = pickFirstString(
    data.title,
    data.productTitle,
    data.listingTitle,
    data.name,
    id ? `Listing ${id}` : 'Yustam Listing'
  );
  const category = pickFirstString(data.category, data.productCategory, data.collection) || 'Marketplace';
  const subcategory = pickFirstString(data.subcategory, data.productSubcategory, data.segment);
  const categoryLabel = [category, subcategory && subcategory !== category ? subcategory : null]
    .filter(Boolean)
    .join(' / ');

  return {
    id,
    title,
    description: pickFirstString(data.description, data.productDescription, data.details, data.summary),
    price: parsePrice(data.price ?? data.amount ?? data.listingPrice ?? data.current_price),
    oldPrice: parsePrice(data.oldPrice ?? data.previousPrice ?? data.old_price ?? data.compareAt),
    status: normaliseStatus(data.status ?? data.state),
    statusLabel: buildStatusLabel(normaliseStatus(data.status ?? data.state)),
    badges: dedupeArray([
      ...(Array.isArray(data.badges) ? data.badges : []),
      data.isFeatured || data.featured ? 'Featured' : null,
      data.vendorPlan ? buildPlanLabel(data.vendorPlan) : null,
    ]),
    tags: dedupeArray([
      ...(Array.isArray(data.tags) ? data.tags : []),
      data.tagline,
      data.subcategory,
      data.segment,
    ]),
    category,
    subcategory,
    categoryLabel,
    location: buildLocationLabel({
      location: data.location ?? data.vendorLocation,
      city: data.city ?? data.vendorCity,
      state: data.state ?? data.vendorState,
      country: data.country,
    }),
    createdAt: parseTimestamp(data.createdAt),
    vendorUid: pickFirstString(data.vendorUid, data.vendorFirebaseUid, data.vendor_uid),
    vendorFirebaseUid: pickFirstString(data.vendorFirebaseUid, data.vendor_uid),
    vendorId: pickFirstString(data.vendorId, data.vendorID, data.vendorNumericId),
    vendorName: pickFirstString(data.vendorBusinessName, data.vendorName, data.vendor, 'Marketplace Vendor'),
    vendorPlan: data.vendorPlan || data.plan,
    vendorVerification: normaliseVerificationState(
      data.vendorVerification ?? data.verification ?? data.verificationStatus ?? data.vendorVerified ?? data.verified
    ),
    vendorPhone: pickFirstString(data.vendorPhone, data.phone, data.contactPhone),
    vendorWhatsapp: pickFirstString(data.vendorWhatsapp, data.whatsapp),
    vendorEmail: pickFirstString(data.vendorEmail, data.email, data.contactEmail),
    vendorLocation: pickFirstString(data.vendorLocation, data.location),
    vendorSlug: pickFirstString(
      data.vendorSlug,
      data.storefrontSlug,
      data.storeSlug,
      data.owner?.vendorProfile?.storefrontSlug
    ),
    vendorAvatar: resolveMediaUrl(
      pickFirstString(
        data.vendorAvatar,
        data.vendorPhoto,
        data.vendorImage,
        data.vendor_avatar,
        data.vendor_logo,
        data.vendorLogo,
        data.vendorProfilePhoto,
        data.vendorPicture
      )
    ),
    raw: data,
  };
};

const buildStorefrontUrl = ({ slug, vendorId, vendorUid } = {}) => {
  const normalise = (value) => {
    if (value === null || value === undefined) {
      return '';
    }
    if (typeof value === 'string') {
      return value.trim();
    }
    return String(value).trim();
  };

  const slugValue = normalise(slug);
  const id = normalise(vendorId);
  const uid = normalise(vendorUid);

  if (slugValue) {
    return buildPublicUrl(`storefront/${encodeURIComponent(slugValue)}`);
  }
  if (id) {
    return `${API_BASE_URL}/vendor/storefront/${encodeURIComponent(id)}`;
  }
  if (uid) {
    return `${API_BASE_URL}/vendor/storefront/${encodeURIComponent(uid)}`;
  }
  return '';
};

const buildListingShareUrl = (id) => {
  const safeId = typeof id === 'string' ? id.trim() : id ? String(id).trim() : '';
  if (!safeId) {
    return '';
  }
  return buildPublicUrl(`listings/${encodeURIComponent(safeId)}`);
};

const buildVendorFromListing = (listing) => {
  if (!listing) {
    return {};
  }
  return {
    name: listing.vendorName || 'Marketplace Vendor',
    businessName: listing.vendorName,
    planLabel: buildPlanLabel(listing.vendorPlan),
    verification: listing.vendorVerification,
    verificationLabel: buildVerificationLabel(listing.vendorVerification),
    phone: listing.vendorPhone,
    whatsapp: listing.vendorWhatsapp,
    email: listing.vendorEmail,
    location: listing.vendorLocation || listing.location,
    vendorUid: listing.vendorUid,
    vendorId: listing.vendorId,
    avatar: listing.vendorAvatar,
    storefrontSlug: listing.vendorSlug,
    storefrontUrl: buildStorefrontUrl({
      slug: listing.vendorSlug,
      vendorId: listing.vendorId,
      vendorUid: listing.vendorUid || listing.vendorFirebaseUid,
    }),
  };
};

const transformVendorPayload = (payload = {}) => {
  const location = buildLocationLabel({
    location: payload.location,
    city: payload.city,
    state: payload.state,
    country: payload.country,
  });

  const verificationState = normaliseVerificationState(
    payload.verificationState || payload.verification || payload.status || payload.verificationStatus
  );
  const storefrontUrl = buildStorefrontUrl({
    slug: payload.storefrontSlug || payload.slug || payload.storeSlug,
    vendorId: payload.userId || payload.id,
    vendorUid: payload.vendorUid || payload.firebaseUid || payload.user?.firebaseUid,
  });
  const avatarCandidate = pickFirstString(
    payload.avatar,
    payload.profilePhoto,
    payload.profile_image,
    payload.logo,
    payload.logoUrl,
    payload.photo,
    payload.photoURL,
    payload.image,
    payload.banner
  );

  return {
    name: payload.businessName || payload.displayName || 'Marketplace Vendor',
    businessName: payload.businessName || payload.displayName,
    planLabel: payload.planLabel || buildPlanLabel(payload.plan),
    verification: verificationState,
    verificationLabel: payload.verificationLabel || buildVerificationLabel(verificationState),
    phone: payload.phone,
    whatsapp: payload.whatsapp,
    email: payload.email || payload.user?.email,
    location,
    avatar: resolveMediaUrl(avatarCandidate),
    vendorUid: payload.vendorUid || payload.firebaseUid || payload.user?.firebaseUid,
    vendorId: payload.userId ? String(payload.userId) : payload.id ? String(payload.id) : '',
    storefrontSlug: payload.storefrontSlug || payload.slug || payload.storeSlug,
    storefrontUrl,
  };
};

const mergeVendorProfiles = (base = {}, override = {}) => {
  const safeBase = base && typeof base === 'object' ? base : {};
  const safeOverride = override && typeof override === 'object' ? override : {};
  return {
    name: safeOverride.name || safeBase.name || 'Marketplace Vendor',
    businessName: safeOverride.businessName || safeBase.businessName || safeOverride.name,
    planLabel: safeOverride.planLabel || safeBase.planLabel || 'Free Plan',
    verification: safeOverride.verification || safeBase.verification || 'unverified',
    verificationLabel:
      safeOverride.verificationLabel ||
      safeBase.verificationLabel ||
      buildVerificationLabel(safeOverride.verification || safeBase.verification),
    phone: safeOverride.phone || safeBase.phone || '',
    whatsapp:
      safeOverride.whatsapp ||
      safeBase.whatsapp ||
      safeOverride.phone ||
      safeBase.phone ||
      '',
    email: safeOverride.email || safeBase.email || '',
    location: safeOverride.location || safeBase.location || '',
    avatar: safeOverride.avatar || safeBase.avatar || '',
    vendorUid: safeOverride.vendorUid || safeBase.vendorUid || '',
    vendorId: safeOverride.vendorId || safeBase.vendorId || '',
    storefrontSlug: safeOverride.storefrontSlug || safeBase.storefrontSlug || '',
    storefrontUrl: safeOverride.storefrontUrl || safeBase.storefrontUrl || '',
  };
};

const sanitizePhoneNumber = (value = '') => value.replace(/[^0-9]/g, '');

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
    backgroundColor: theme.colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.soft,
  },
  headerTitle: {
    fontFamily: theme.typography.fontFamily.interSemiBold,
    fontSize: theme.typography.fontSize.lg,
    color: theme.colors.textPrimary,
  },
  scrollBody: {
    paddingBottom: 140,
    gap: theme.spacing.lg,
  },
  heroWrapper: {
    width: '100%',
    height: HERO_HEIGHT,
    backgroundColor: theme.colors.white,
  },
  heroSlide: {
    width,
    height: HERO_HEIGHT,
  },
  heroImage: {
    width,
    height: HERO_HEIGHT,
    backgroundColor: theme.colors.backgroundLight,
  },
  heroVideoWrapper: {
    width,
    height: HERO_HEIGHT,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroVideo: {
    width,
    height: HERO_HEIGHT,
    backgroundColor: '#000000',
  },
  heroPlayOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  paginationDots: {
    position: 'absolute',
    bottom: theme.spacing.md,
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.full,
    backgroundColor: `${theme.colors.overlayDark}70`,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.white,
    opacity: 0.4,
  },
  activeDot: {
    opacity: 1,
  },
  sectionCard: {
    marginHorizontal: theme.spacing.lg,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius['2xl'],
    backgroundColor: theme.colors.white,
    ...theme.shadows.medium,
    gap: theme.spacing.sm,
  },
  productTitle: {
    fontFamily: theme.typography.fontFamily.interSemiBold,
    fontSize: theme.typography.fontSize.xl,
    color: theme.colors.textPrimary,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: theme.spacing.sm,
  },
  price: {
    fontFamily: theme.typography.fontFamily.interBold,
    fontSize: theme.typography.fontSize['2xl'],
    color: theme.colors.emerald,
  },
  oldPrice: {
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textSecondary,
    textDecorationLine: 'line-through',
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.backgroundLight,
  },
  metaText: {
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
  },
  badge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.full,
    backgroundColor: `${theme.colors.orange}15`,
  },
  badgeText: {
    fontFamily: theme.typography.fontFamily.interMedium,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.orange,
  },
  sectionHeading: {
    marginTop: theme.spacing.sm,
    fontFamily: theme.typography.fontFamily.interSemiBold,
    fontSize: theme.typography.fontSize.lg,
    color: theme.colors.textPrimary,
  },
  bodyText: {
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textSecondary,
    lineHeight: theme.typography.lineHeight.relaxed * theme.typography.fontSize.base,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  listText: {
    flex: 1,
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textSecondary,
  },
  specRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  specLabel: {
    flex: 0.5,
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  specValue: {
    flex: 0.5,
    fontFamily: theme.typography.fontFamily.interSemiBold,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textPrimary,
    textAlign: 'right',
  },
  vendorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  vendorAvatarWrapper: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: theme.colors.backgroundLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vendorAvatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
  },
  vendorAvatarPlaceholder: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vendorInfo: {
    flex: 1,
    gap: 4,
  },
  vendorName: {
    fontFamily: theme.typography.fontFamily.interSemiBold,
    fontSize: theme.typography.fontSize.lg,
    color: theme.colors.textPrimary,
  },
  vendorPlan: {
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  storefrontButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  storefrontText: {
    fontFamily: theme.typography.fontFamily.interMedium,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.primary,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
  },
  tagPill: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.backgroundLight,
  },
  tagText: {
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textSecondary,
  },
  lightboxContainer: {
    flex: 1,
    backgroundColor: `${theme.colors.overlayDark}F2`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lightboxSlide: {
    width,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.lg,
  },
  lightboxImage: {
    width: width - theme.spacing['2xl'],
    height: LIGHTBOX_MAX_HEIGHT,
  },
  lightboxVideo: {
    width: width - theme.spacing['2xl'],
    height: LIGHTBOX_MAX_HEIGHT,
    backgroundColor: '#000000',
  },
  lightboxClose: {
    position: 'absolute',
    top: 40,
    right: 24,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: `${theme.colors.overlayDark}AA`,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  lightboxNav: {
    position: 'absolute',
    top: '50%',
    marginTop: -28,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: `${theme.colors.overlayDark}88`,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  lightboxPrev: {
    left: 16,
  },
  lightboxNext: {
    right: 16,
  },
  lightboxNavDisabled: {
    opacity: 0.35,
  },
  lightboxFooter: {
    position: 'absolute',
    bottom: 40,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.full,
    backgroundColor: `${theme.colors.overlayDark}88`,
  },
  lightboxCounter: {
    fontFamily: theme.typography.fontFamily.interMedium,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.white,
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.full,
    backgroundColor: `${theme.colors.emerald}15`,
  },
  statusText: {
    fontFamily: theme.typography.fontFamily.interMedium,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.emerald,
  },
  contactBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    padding: theme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    backgroundColor: theme.colors.white,
  },
  secondaryCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  secondaryCtaText: {
    fontFamily: theme.typography.fontFamily.interSemiBold,
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.primary,
  },
  primaryCta: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.primary,
  },
  primaryCtaText: {
    fontFamily: theme.typography.fontFamily.interSemiBold,
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.white,
  },
  disabledCta: {
    opacity: 0.5,
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing['2xl'],
    gap: theme.spacing.md,
  },
  loadingText: {
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  emptyTitle: {
    fontFamily: theme.typography.fontFamily.interSemiBold,
    fontSize: theme.typography.fontSize.lg,
    color: theme.colors.textPrimary,
  },
  emptyMessage: {
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  retryButton: {
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.primary,
  },
  retryButtonText: {
    fontFamily: theme.typography.fontFamily.interSemiBold,
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.white,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
});

export default ProductDetailScreen;
