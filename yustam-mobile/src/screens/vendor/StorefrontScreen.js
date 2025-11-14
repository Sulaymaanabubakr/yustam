import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Image,
  Share,
  Dimensions,
  Modal,
  Alert,
  Platform,
  Linking,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import theme from '../../theme';
import Toast from '../../components/Toast';
import Button from '../../components/Button';
import { vendorAPI } from '../../services/api';
import { goBackOrNavigate } from '../../utils/navigation';
import resolveMediaUrl from '../../utils/url';
import { API_BASE_URL, APP_DOWNLOAD_LINKS } from '../../config/constants';
import { formatDate, formatNaira } from '../../utils/formatters';
import { resolveUserUid } from '../../utils/user';
import { getPlanPreset } from '../../data/vendorPlans';
import * as ImagePicker from 'expo-image-picker';
import { uploadImage } from '../../config/cloudinary';

const { width } = Dimensions.get('window');
const LISTING_WIDTH = (width - theme.spacing.lg * 3) / 2;
const PUBLIC_BASE_URL = (API_BASE_URL || '').replace(/\/api\/?$/, '') || API_BASE_URL;
const normaliseBase = (value = '') => (value.endsWith('/') ? value.slice(0, -1) : value);
const buildStorefrontShareUrl = (slug) =>
  slug ? `${normaliseBase(PUBLIC_BASE_URL)}/storefront/${encodeURIComponent(slug)}` : '';
const buildApiStorefrontUrl = (identifier) =>
  identifier ? `${API_BASE_URL}/vendor/storefront/${encodeURIComponent(identifier)}` : '';
const withStorefrontQuery = (url, identifier) => {
  if (!url) {
    return '';
  }
  if (!identifier) {
    return url;
  }
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}storefront=${encodeURIComponent(identifier)}`;
};
const buildStorefrontDownloadLinks = (identifier) => ({
  universal: withStorefrontQuery(APP_DOWNLOAD_LINKS.universal, identifier),
  android: withStorefrontQuery(APP_DOWNLOAD_LINKS.android, identifier),
  ios: withStorefrontQuery(APP_DOWNLOAD_LINKS.ios, identifier),
});
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

const pickMediaUrl = (entry = {}) =>
  entry?.url ||
  entry?.secure_url ||
  entry?.secureUrl ||
  entry?.uri ||
  entry?.path ||
  entry?.image ||
  entry?.src ||
  '';

const resolveListingImageSource = (listing = {}) => {
  const mediaArray = Array.isArray(listing.media) ? listing.media : [];
  const primaryMedia = mediaArray.find((item) => item?.isPrimary || item?.primary);
  if (primaryMedia) {
    const candidate = pickMediaUrl(primaryMedia);
    if (candidate) {
      return resolveMediaUrl(candidate);
    }
  }
  for (const mediaEntry of mediaArray) {
    const candidate = pickMediaUrl(mediaEntry);
    if (candidate) {
      return resolveMediaUrl(candidate);
    }
  }

  const fallback =
    listing.image ||
    listing.coverImage ||
    listing.cover ||
    listing.thumbnail ||
    listing.primaryImage ||
    listing.featuredImage ||
    listing.photo ||
    listing.photoUrl ||
    (Array.isArray(listing.images) ? listing.images[0] : '') ||
    '';

  return resolveMediaUrl(fallback);
};

const normaliseHandle = (value = '') => value.replace(/^@/, '').trim();
const formatPercentage = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return null;
  }
  return `${Math.round(numeric)}%`;
};

const buildSocialLinks = (vendor = {}, storefront = {}) => {
  const links = [];
  const instagramHandle = normaliseHandle(
    vendor.instagram ||
      vendor.instagramHandle ||
      storefront.instagram ||
      storefront.social?.instagram ||
      ''
  );
  if (instagramHandle) {
    links.push({
      type: 'instagram',
      icon: 'logo-instagram',
      label: `@${instagramHandle}`,
      url: `https://instagram.com/${instagramHandle}`,
    });
  }
  const whatsapp = vendor.whatsapp || storefront.whatsapp || vendor.phone || storefront.phone;
  if (whatsapp) {
    const digits = whatsapp.replace(/[^0-9]/g, '');
    if (digits) {
      links.push({
        type: 'whatsapp',
        icon: 'logo-whatsapp',
        label: 'WhatsApp',
        url: `https://wa.me/${digits}`,
      });
    }
  }
  const websiteCandidate =
    vendor.website || storefront.website || vendor.siteUrl || storefront.social?.website;
  if (websiteCandidate) {
    const url = /^https?:\/\//i.test(websiteCandidate)
      ? websiteCandidate
      : `https://${websiteCandidate}`;
    links.push({
      type: 'website',
      icon: 'globe-outline',
      label: 'Website',
      url,
    });
  }
  return links;
};

const buildKpiStats = (vendor = {}, listings = []) => {
  const responseMinutes =
    vendor.avgResponseMinutes ||
    vendor.responseTimeMinutes ||
    vendor.response_minutes ||
    vendor.responseTime;
  const responseValue = responseMinutes
    ? `${Math.max(1, Math.round(Number(responseMinutes)))}m`
    : 'Under 1h';
  const fulfillmentRate =
    vendor.orderFulfillmentRate ||
    vendor.fulfillmentRate ||
    vendor.deliveryRate ||
    vendor.shipmentSuccessRate;
  const fulfillmentValue = formatPercentage(fulfillmentRate) || 'N/A';
  const followerCount =
    vendor.followers ||
    vendor.followerCount ||
    vendor.subscribers ||
    vendor.storeFollowers ||
    vendor.following ||
    null;
  const followerValue =
    typeof followerCount === 'number'
      ? followerCount.toLocaleString()
      : followerCount || `${listings.length || 0}+`;

  return [
    { label: 'Response', value: responseValue },
    { label: 'Fulfillment', value: fulfillmentValue },
    { label: 'Followers', value: followerValue },
  ];
};

const buildPromoHighlight = (vendor = {}) => {
  const promoSource =
    vendor.activePromo ||
    vendor.promo ||
    vendor.storefrontPromo ||
    vendor.featuredPromo ||
    vendor.promoHighlight ||
    {};
  const headline =
    promoSource.headline ||
    promoSource.title ||
    vendor.promoHeadline ||
    vendor.promoTitle ||
    vendor.promo_headline ||
    '';
  const description =
    promoSource.description ||
    promoSource.text ||
    vendor.promoDescription ||
    vendor.promoText ||
    vendor.promo_message ||
    '';
  const code =
    promoSource.code ||
    vendor.promoCode ||
    vendor.couponCode ||
    vendor.promo_code ||
    '';
  const link =
    promoSource.link ||
    vendor.promoLink ||
    vendor.couponLink ||
    vendor.promo_link ||
    '';
  if (!headline && !description && !code && !link) {
    return null;
  }
  return {
    headline,
    description,
    code,
    link,
    expiresAt: promoSource.expiresAt || vendor.promoExpiresAt || vendor.promo_expires_at || '',
  };
};

const StorefrontScreen = ({ navigation, route }) => {
  const { user } = useAuth();
  const vendorUid = resolveUserUid(user);
  const { vendorUid: routeVendorUid, vendorId: routeVendorId, vendorSlug: routeVendorSlug } = route?.params ?? {};
  const resolveIdentifier = () => routeVendorSlug || routeVendorUid || routeVendorId || vendorUid;
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'info' });
  const [storefront, setStorefront] = useState({
    businessName: '',
    description: '',
    location: '',
    verified: false,
    verificationStatus: '',
    planSlug: 'free',
    planName: 'Free Plan',
    planFeatures: [],
    rating: 0,
    totalReviews: 0,
    totalListings: 0,
    joinedDate: '',
    profileImage: '',
    coverImage: '',
    vendorUid: '',
    storefrontSlug: '',
    storefrontUrl: '',
  });
  const [listings, setListings] = useState([]);
  const [badgeModalVisible, setBadgeModalVisible] = useState(false);
  const [updatingBanner, setUpdatingBanner] = useState(false);
  const [featuredListings, setFeaturedListings] = useState([]);
  const [socialLinks, setSocialLinks] = useState([]);
  const [kpiStats, setKpiStats] = useState([]);
  const [promoHighlight, setPromoHighlight] = useState(null);
  const [promoModalVisible, setPromoModalVisible] = useState(false);
  const [promoForm, setPromoForm] = useState({ headline: '', description: '', code: '', link: '' });
  const [savingPromo, setSavingPromo] = useState(false);
  const canEditBranding = !routeVendorUid && !routeVendorId && !routeVendorSlug;

  useEffect(() => {
    fetchStorefront();
  }, [route?.params, vendorUid]);

  useEffect(() => {
    if (!toast.visible) {
      return undefined;
    }
    const timer = setTimeout(() => {
      setToast((prev) => ({ ...prev, visible: false }));
    }, 2500);
    return () => clearTimeout(timer);
  }, [toast.visible]);

  const fetchStorefront = async () => {
    try {
      setLoading(true);
      const identifier = resolveIdentifier();
      if (!identifier) {
        throw new Error('Unable to determine your vendor account.');
      }

      const payload = await vendorAPI.getStorefront(identifier);
      const vendor = payload?.vendor || {};
      const listingData = Array.isArray(payload?.products)
        ? payload.products
        : Array.isArray(payload?.listings)
          ? payload.listings
          : [];

      const locationParts = [vendor.city, vendor.state, vendor.country].filter(Boolean);
      const verificationStatus = (vendor.verificationStatus || '').toLowerCase();
      const isVerified = verificationStatus === 'approved' || verificationStatus === 'verified' || vendor.verified;
      const planSlug = normalisePlanSlug(
        vendor.planSlug || vendor.plan?.slug || vendor.planId || vendor.plan || 'free'
      );
      const planDefinition = getPlanPreset(planSlug);
      const storefrontSlug = vendor.storefrontSlug;
      const shareUrl =
        buildStorefrontShareUrl(storefrontSlug) ||
        buildApiStorefrontUrl(storefrontSlug || vendor.vendorUid || vendor.userId || identifier);
      const profileImageSource =
        vendor.profilePhotoUrl ||
        vendor.profile_photo_url ||
        vendor.profilePhoto ||
        vendor.profile_photo ||
        vendor.logoUrl ||
        vendor.logo ||
        vendor.avatar ||
        vendor.profileImage ||
        vendor.user?.photoUrl ||
        vendor.user?.photoURL ||
        user?.photoURL ||
        user?.photoUrl ||
        '';
      const bannerSource =
        vendor.bannerUrl ||
        vendor.banner_url ||
        vendor.banner ||
        vendor.bannerImage ||
        vendor.banner_image ||
        vendor.coverImage ||
        vendor.cover_image ||
        vendor.coverPhoto ||
        vendor.cover_photo ||
        '';

      const storefrontData = {
        businessName: vendor.businessName || vendor.displayName || 'Your Storefront',
        description: vendor.description || vendor.about || '',
        location: locationParts.join(', '),
        verified: isVerified,
        verificationStatus,
        planSlug,
        planName: planDefinition.name,
        planFeatures: planDefinition.features,
        rating: vendor.averageRating || vendor.rating || 0,
        totalReviews: vendor.reviewCount || vendor.totalReviews || 0,
        totalListings: listingData.length,
        joinedDate: vendor.createdAt
          ? formatDate(vendor.createdAt, { month: 'long', year: 'numeric' })
          : '',
        profileImage: resolveMediaUrl(profileImageSource),
        coverImage: resolveMediaUrl(bannerSource),
        vendorUid: vendor.user?.firebaseUid || vendor.vendorUid || vendorUid,
        storefrontSlug,
        storefrontUrl: shareUrl,
      };

      setStorefront(storefrontData);

      const enhancedListings = listingData.map((listing) => {
        const resolvedImage = resolveListingImageSource(listing);
        const createdAt =
          listing.createdAt ||
          listing.created_at ||
          listing.created_at ||
          listing.meta?.createdAt ||
          listing.added_on ||
          null;
        return {
          id: listing.id || listing.listing_id || listing.public_id,
          title: listing.title || listing.name || 'Untitled',
          price: listing.price || 0,
          image: resolvedImage,
          status: listing.status || 'active',
          createdAt,
        };
      });
      setListings(enhancedListings);
      const sortedFeatured = [...enhancedListings].sort((a, b) => {
        const dateA = new Date(a.createdAt || 0).getTime();
        const dateB = new Date(b.createdAt || 0).getTime();
        return dateB - dateA;
      });
      setFeaturedListings(sortedFeatured.slice(0, 5));
      setSocialLinks(buildSocialLinks(vendor, storefrontData));
      setKpiStats(buildKpiStats(vendor, enhancedListings));
      setPromoHighlight(buildPromoHighlight(vendor));
    } catch (error) {
      console.error('Error fetching storefront:', error);
      showToast('Failed to load storefront', 'error');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchStorefront();
    setRefreshing(false);
  };

  const showToast = (message, type = 'success') => {
    setToast({ visible: true, message, type });
  };

  const hideToast = () => {
    setToast({ ...toast, visible: false });
  };

  const handleShareStorefront = async () => {
    try {
      const identifier = storefront.storefrontSlug || storefront.vendorUid || vendorUid;
      const downloadLinks = buildStorefrontDownloadLinks(identifier);
      const storefrontUrl =
        storefront.storefrontUrl ||
        buildStorefrontShareUrl(storefront.storefrontSlug) ||
        buildApiStorefrontUrl(identifier);
      const shareLines = [
        `Discover ${storefront.businessName} on YUSTAM Marketplace.`,
      ];
      if (downloadLinks.universal || downloadLinks.android || downloadLinks.ios) {
        shareLines.push('Download the app to view their storefront:');
        if (downloadLinks.universal) {
          shareLines.push(downloadLinks.universal);
        }
        if (downloadLinks.android) {
          shareLines.push(`Android: ${downloadLinks.android}`);
        }
        if (downloadLinks.ios) {
          shareLines.push(`iOS: ${downloadLinks.ios}`);
        }
      }
      if (storefrontUrl) {
        shareLines.push(`Web preview: ${storefrontUrl}`);
      }
      await Share.share({
        message: shareLines.join('\n'),
        title: storefront.businessName,
      });
    } catch (error) {
      console.error('Error sharing:', error);
      showToast('Failed to share storefront', 'error');
    }
  };

  const handleOpenLink = (url, failureMessage = 'Unable to open link.') => {
    if (!url) {
      showToast('Link is not available yet.', 'info');
      return;
    }
    Linking.openURL(url).catch(() => showToast(failureMessage, 'error'));
  };

  const handlePressSocialLink = (link) => {
    if (!link || !link.url) {
      showToast('Link is not available yet.', 'info');
      return;
    }
    handleOpenLink(link.url, `Unable to open ${link.label || 'link'}.`);
  };

  const handlePressFeaturedListing = (listing) => {
    if (!listing?.id) {
      showToast('Listing is not available.', 'info');
      return;
    }
    showToast('Opening listing...', 'info');
  };

  const openPromoModal = () => {
    const current = promoHighlight || {};
    setPromoForm({
      headline: current.headline || '',
      description: current.description || '',
      code: current.code || '',
      link: current.link || '',
    });
    setPromoModalVisible(true);
  };

  const handleSavePromo = async () => {
    try {
      setSavingPromo(true);
      const payload = {
        promo_headline: promoForm.headline.trim(),
        promo_message: promoForm.description.trim(),
        promo_code: promoForm.code.trim(),
        promo_link: promoForm.link.trim(),
      };
      await vendorAPI.updateProfile(payload);
      const highlight = buildPromoHighlight({
        promo_headline: payload.promo_headline,
        promo_message: payload.promo_message,
        promo_code: payload.promo_code,
        promo_link: payload.promo_link,
      });
      setPromoHighlight(highlight);
      setPromoModalVisible(false);
      showToast('Promo highlight updated!', 'success');
    } catch (error) {
      console.error('Promo update error:', error);
      showToast(error.message || 'Unable to update promo highlight.', 'error');
    } finally {
      setSavingPromo(false);
    }
  };

  const requestMediaPermissions = async () => {
    if (Platform.OS === 'web') {
      return true;
    }
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission required',
        'Please allow photo access to update your storefront banner.'
      );
      return false;
    }
    return true;
  };

  const pickImageFromLibrary = async (options = {}) => {
    const hasPermission = await requestMediaPermissions();
    if (!hasPermission) {
      return null;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaType.IMAGE,
      allowsEditing: true,
      quality: 0.85,
      ...options,
    });
    if (result.canceled || !result.assets?.length) {
      return null;
    }
    return result.assets[0];
  };

  const handleUpdateBanner = async () => {
    if (!canEditBranding) {
      return;
    }
    const asset = await pickImageFromLibrary({ aspect: [5, 3] });
    if (!asset) {
      return;
    }
    try {
      setUpdatingBanner(true);
      const uploadResult = await uploadImage(asset.uri, {
        folder: `vendors/${storefront.vendorUid || vendorUid || 'vendor'}/storefront`,
      });
      await vendorAPI.updateProfile({
        banner_url: uploadResult.url,
        banner_image: uploadResult.url,
      });
      setStorefront((prev) => ({ ...prev, coverImage: uploadResult.url }));
      showToast('Storefront banner updated!', 'success');
    } catch (error) {
      console.error('Banner update error:', error);
      showToast(error.message || 'Unable to update banner. Please try again.', 'error');
    } finally {
      setUpdatingBanner(false);
    }
  };

  const formatPrice = (price) => formatNaira(price || 0);

  const ListingCard = ({ listing }) => (
    <TouchableOpacity
      style={styles.listingCard}
      onPress={() => {
        // TODO: Navigate to listing details
        showToast('Opening listing...', 'info');
      }}
      activeOpacity={0.7}
    >
      {listing.image ? (
        <Image source={{ uri: listing.image }} style={styles.listingImage} resizeMode="cover" />
      ) : (
        <View style={[styles.listingImage, styles.listingImagePlaceholder]}>
          <Ionicons name="image-outline" size={32} color={theme.colors.textSecondary} />
        </View>
      )}
      <View style={styles.listingInfo}>
        <Text style={styles.listingTitle} numberOfLines={2}>
          {listing.title}
        </Text>
        <Text style={styles.listingPrice}>{formatPrice(listing.price)}</Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => goBackOrNavigate(navigation)} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.emerald} />
          </TouchableOpacity>
          <Text style={styles.title}>My Storefront</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.orange} />
          <Text style={styles.loadingText}>Loading storefront...</Text>
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
        onHide={hideToast}
      />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => goBackOrNavigate(navigation)} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.emerald} />
        </TouchableOpacity>
        <Text style={styles.title}>My Storefront</Text>
        <TouchableOpacity onPress={handleShareStorefront} style={styles.shareButton}>
          <Ionicons name="share-outline" size={24} color={theme.colors.orange} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.colors.orange]}
            tintColor={theme.colors.orange}
          />
        }
      >
        {/* Cover Image */}
        <View style={styles.coverContainer}>
          <TouchableOpacity
            style={styles.coverTouchable}
            activeOpacity={canEditBranding ? 0.9 : 1}
            onPress={canEditBranding ? handleUpdateBanner : undefined}
            disabled={!canEditBranding}
          >
            {storefront.coverImage ? (
              <Image source={{ uri: storefront.coverImage }} style={styles.coverImage} resizeMode="cover" />
            ) : (
              <View style={[styles.coverImage, styles.coverPlaceholder]}>
                <Ionicons name="image-outline" size={28} color={theme.colors.textSecondary} />
                <Text style={styles.coverPlaceholderText}>Add a storefront banner</Text>
              </View>
            )}
          </TouchableOpacity>
          {canEditBranding ? (
            <TouchableOpacity
              style={styles.coverAction}
              onPress={handleUpdateBanner}
              activeOpacity={0.85}
              disabled={updatingBanner}
            >
              {updatingBanner ? (
                <ActivityIndicator size="small" color={theme.colors.white} />
              ) : (
                <>
                  <Ionicons name="camera" size={16} color={theme.colors.white} />
                  <Text style={styles.coverActionText}>Update banner</Text>
                </>
              )}
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Profile Section */}
        <View style={styles.profileSection}>
          <View style={styles.profileImageContainer}>
            {storefront.profileImage ? (
              <Image source={{ uri: storefront.profileImage }} style={styles.profileImage} resizeMode="cover" />
            ) : (
              <View style={[styles.profileImage, styles.profilePlaceholder]}>
                <Ionicons name="storefront" size={32} color={theme.colors.white} />
              </View>
            )}
          </View>

          <View style={styles.nameRow}>
            <Text style={styles.businessName}>{storefront.businessName}</Text>
            <PlanBadge
              planSlug={storefront.planSlug}
              verified={storefront.verified}
              onPress={() => setBadgeModalVisible(true)}
            />
          </View>
          
          {/* Rating */}
          <View style={styles.ratingContainer}>
            <Ionicons name="star" size={16} color="#FFA500" />
            <Text style={styles.ratingText}>
              {storefront.rating} ({storefront.totalReviews} reviews)
            </Text>
          </View>

          {/* Location */}
          <View style={styles.locationContainer}>
            <Ionicons name="location-outline" size={16} color={theme.colors.textSecondary} />
            <Text style={styles.locationText}>{storefront.location}</Text>
          </View>

          {/* Description */}
          <Text style={styles.description}>{storefront.description}</Text>

          {socialLinks.length ? (
            <View style={styles.socialBadges}>
              {socialLinks.map((link) => (
                <TouchableOpacity
                  key={link.type}
                  style={styles.socialBadge}
                  onPress={() => handlePressSocialLink(link)}
                  activeOpacity={0.8}
                >
                  <Ionicons name={link.icon} size={16} color={theme.colors.orange} />
                  <Text style={styles.socialBadgeText}>{link.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : null}

        {/* Stats */}
        <View style={styles.statsContainer}>
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
              <Text style={styles.statValue}>{storefront.joinedDate}</Text>
              <Text style={styles.statLabel}>Joined</Text>
            </View>
        </View>

        {kpiStats.length ? (
          <View style={styles.kpiRow}>
            {kpiStats.map((kpi) => (
              <View key={kpi.label} style={styles.kpiCard}>
                <Text style={styles.kpiValue}>{kpi.value}</Text>
                <Text style={styles.kpiLabel}>{kpi.label}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {promoHighlight ? (
          <View style={styles.promoCard}>
            <View style={styles.promoContent}>
              <Text style={styles.promoHeadline}>{promoHighlight.headline}</Text>
              {promoHighlight.description ? (
                <Text style={styles.promoDescription}>{promoHighlight.description}</Text>
              ) : null}
              {promoHighlight.code ? (
                <View style={styles.promoCodePill}>
                  <Text style={styles.promoCodeText}>{promoHighlight.code}</Text>
                </View>
              ) : null}
            </View>
            <View style={styles.promoActions}>
              {promoHighlight.link ? (
                <TouchableOpacity
                  style={styles.promoButton}
                  onPress={() => handleOpenLink(promoHighlight.link)}
                >
                  <Text style={styles.promoButtonText}>View offer</Text>
                </TouchableOpacity>
              ) : null}
              {canEditBranding ? (
                <TouchableOpacity style={styles.promoTextButton} onPress={openPromoModal}>
                  <Text style={styles.promoTextButtonLabel}>Edit</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        ) : canEditBranding ? (
          <TouchableOpacity style={styles.promoPlaceholderCard} onPress={openPromoModal}>
            <Ionicons name="pricetag" size={18} color={theme.colors.orange} />
            <View style={{ flex: 1 }}>
              <Text style={styles.promoPlaceholderTitle}>Add a promo highlight</Text>
              <Text style={styles.promoPlaceholderText}>
                Spotlight a coupon or flash deal to boost conversions.
              </Text>
            </View>
            <Ionicons name="add" size={20} color={theme.colors.orange} />
          </TouchableOpacity>
        ) : null}

        {/* Share Button */}
        <Button
            title="Share Storefront"
            onPress={handleShareStorefront}
            variant="outline"
            icon="share-social-outline"
            style={styles.shareButtonFull}
          />
        </View>

        {featuredListings.length ? (
          <View style={styles.featuredSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>New arrivals</Text>
              <Text style={styles.sectionHint}>Freshly added listings</Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.featuredCarousel}
            >
              {featuredListings.map((listing) => (
                <TouchableOpacity
                  key={listing.id}
                  style={styles.featuredCard}
                  onPress={() => handlePressFeaturedListing(listing)}
                  activeOpacity={0.85}
                >
                  {listing.image ? (
                    <Image source={{ uri: listing.image }} style={styles.featuredImage} />
                  ) : (
                    <View style={[styles.featuredImage, styles.listingImagePlaceholder]}>
                      <Ionicons name="image-outline" size={24} color={theme.colors.textSecondary} />
                    </View>
                  )}
                  <View style={styles.featuredBody}>
                    <Text style={styles.featuredTitle} numberOfLines={2}>
                      {listing.title}
                    </Text>
                    <Text style={styles.featuredPrice}>{formatPrice(listing.price)}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        ) : null}

        {/* Listings Section */}
        <View style={styles.listingsSection}>
          <Text style={styles.sectionTitle}>Active Listings</Text>
          
          {listings.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="cube-outline" size={64} color={theme.colors.textTertiary} />
              <Text style={styles.emptyText}>No active listings</Text>
            </View>
          ) : (
            <View style={styles.listingsGrid}>
              {listings.map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </View>
          )}
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>

      <Modal
        visible={badgeModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setBadgeModalVisible(false)}
      >
        <View style={styles.badgeModalBackdrop}>
          <View style={styles.badgeModalCard}>
            <View style={styles.badgeModalHeader}>
              <Text style={styles.badgeModalTitle}>{storefront.planName}</Text>
              <TouchableOpacity onPress={() => setBadgeModalVisible(false)}>
                <Ionicons name="close" size={20} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <Text style={styles.badgeModalSubtitle}>
              {storefront.verified ? 'Verified vendor' : 'Not verified yet'}
            </Text>
            <View style={styles.badgeModalFeatures}>
              {(storefront.planFeatures || []).slice(0, 6).map((feature) => (
                <View key={feature} style={styles.planFeatureItem}>
                  <Ionicons name="checkmark-circle" size={16} color={theme.colors.emerald} />
                  <Text style={styles.planFeatureText}>{feature}</Text>
                </View>
              ))}
            </View>
            <Text style={styles.badgeModalHint}>
              Badge colors change with your subscription plan. Upgrade for stronger recognition across the
              marketplace.
            </Text>
          </View>
        </View>
      </Modal>

      <Modal
        visible={promoModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setPromoModalVisible(false)}
      >
        <View style={styles.promoModalBackdrop}>
          <View style={styles.promoModalCard}>
            <Text style={styles.promoModalTitle}>Promo highlight</Text>
            <TextInput
              style={styles.promoInput}
              placeholder="Headline (e.g. Free delivery weekend)"
              value={promoForm.headline}
              onChangeText={(text) => setPromoForm((prev) => ({ ...prev, headline: text }))}
            />
            <TextInput
              style={[styles.promoInput, styles.promoTextarea]}
              placeholder="Description"
              multiline
              numberOfLines={3}
              value={promoForm.description}
              onChangeText={(text) => setPromoForm((prev) => ({ ...prev, description: text }))}
            />
            <TextInput
              style={styles.promoInput}
              placeholder="Coupon code (optional)"
              value={promoForm.code}
              onChangeText={(text) => setPromoForm((prev) => ({ ...prev, code: text }))}
              autoCapitalize="characters"
            />
            <TextInput
              style={styles.promoInput}
              placeholder="Promo link (optional)"
              value={promoForm.link}
              autoCapitalize="none"
              onChangeText={(text) => setPromoForm((prev) => ({ ...prev, link: text }))}
            />
            <View style={styles.promoModalActions}>
              <TouchableOpacity
                style={[styles.promoTextButton, styles.promoModalCancel]}
                onPress={() => setPromoModalVisible(false)}
              >
                <Text style={styles.promoTextButtonLabel}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.promoButton, styles.promoModalSave]}
                onPress={handleSavePromo}
                disabled={savingPromo}
              >
                {savingPromo ? (
                  <ActivityIndicator size="small" color={theme.colors.white} />
                ) : (
                  <Text style={styles.promoButtonText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.base,
    backgroundColor: theme.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    gap: theme.spacing.sm,
  },
  backButton: {
    padding: theme.spacing.xs,
  },
  title: {
    flex: 1,
    fontFamily: theme.typography.fontFamily.anton,
    fontSize: theme.typography.fontSize['2xl'],
    color: theme.colors.emerald,
    letterSpacing: theme.typography.letterSpacing.wide,
  },
  shareButton: {
    padding: theme.spacing.xs,
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: theme.spacing.base,
  },
  loadingText: {
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textSecondary,
  },
  coverContainer: {
    width: '100%',
    position: 'relative',
    backgroundColor: theme.colors.beige,
    marginBottom: theme.spacing.lg,
    borderBottomLeftRadius: theme.borderRadius.xl,
    borderBottomRightRadius: theme.borderRadius.xl,
    overflow: 'hidden',
  },
  coverTouchable: {
    width: '100%',
  },
  coverImage: {
    width: '100%',
    height: 180,
    backgroundColor: theme.colors.beige,
  },
  coverPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  coverPlaceholderText: {
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  coverAction: {
    position: 'absolute',
    right: theme.spacing.lg,
    bottom: theme.spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.base,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.full,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  coverActionText: {
    fontFamily: theme.typography.fontFamily.interMedium,
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.white,
  },
  profileSection: {
    backgroundColor: theme.colors.white,
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
    alignItems: 'center',
  },
  profileImageContainer: {
    marginTop: -50,
    position: 'relative',
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: theme.borderRadius.full,
    borderWidth: 4,
    borderColor: theme.colors.white,
    backgroundColor: theme.colors.beige,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profilePlaceholder: {
    backgroundColor: theme.colors.emerald,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.base,
  },
  businessName: {
    fontFamily: theme.typography.fontFamily.anton,
    fontSize: theme.typography.fontSize['2xl'],
    color: theme.colors.emerald,
    letterSpacing: theme.typography.letterSpacing.wide,
    textAlign: 'center',
    flexShrink: 1,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    marginTop: theme.spacing.sm,
  },
  ratingText: {
    fontFamily: theme.typography.fontFamily.interMedium,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    marginTop: theme.spacing.xs,
  },
  locationText: {
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  description: {
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textSecondary,
    lineHeight: theme.typography.lineHeight.relaxed * theme.typography.fontSize.base,
    textAlign: 'center',
    marginTop: theme.spacing.base,
  },
  socialBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    justifyContent: 'center',
    marginTop: theme.spacing.sm,
  },
  socialBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.background,
  },
  socialBadgeText: {
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textPrimary,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: theme.spacing.xl,
    paddingVertical: theme.spacing.base,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.lg,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontFamily: theme.typography.fontFamily.anton,
    fontSize: theme.typography.fontSize.xl,
    color: theme.colors.orange,
    letterSpacing: theme.typography.letterSpacing.wide,
  },
  statLabel: {
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs / 2,
  },
  statDivider: {
    width: 1,
    backgroundColor: theme.colors.border,
  },
  kpiRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.lg,
  },
  kpiCard: {
    flex: 1,
    borderRadius: theme.borderRadius.lg,
    paddingVertical: theme.spacing.base,
    paddingHorizontal: theme.spacing.sm,
    backgroundColor: theme.colors.white,
    ...theme.shadows.small,
    alignItems: 'center',
  },
  kpiValue: {
    fontFamily: theme.typography.fontFamily.anton,
    fontSize: theme.typography.fontSize.lg,
    color: theme.colors.textPrimary,
  },
  kpiLabel: {
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs / 2,
  },
  promoCard: {
    marginTop: theme.spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
    backgroundColor: `${theme.colors.orange}15`,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.lg,
  },
  promoContent: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  promoHeadline: {
    fontFamily: theme.typography.fontFamily.interSemiBold,
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textPrimary,
  },
  promoDescription: {
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  promoCodePill: {
    alignSelf: 'flex-start',
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.white,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs / 1.5,
  },
  promoCodeText: {
    fontFamily: theme.typography.fontFamily.interSemiBold,
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.orange,
  },
  promoActions: {
    alignItems: 'flex-end',
    gap: theme.spacing.xs,
    justifyContent: 'space-between',
  },
  promoButton: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.orange,
  },
  promoButtonText: {
    fontFamily: theme.typography.fontFamily.interSemiBold,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.white,
  },
  promoTextButton: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  promoTextButtonLabel: {
    fontFamily: theme.typography.fontFamily.interSemiBold,
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.orange,
  },
  promoPlaceholderCard: {
    marginTop: theme.spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.backgroundLight,
    padding: theme.spacing.lg,
  },
  promoPlaceholderTitle: {
    fontFamily: theme.typography.fontFamily.interSemiBold,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textPrimary,
  },
  promoPlaceholderText: {
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textSecondary,
  },
  planFeatureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  planFeatureText: {
    flex: 1,
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textPrimary,
  },
  shareButtonFull: {
    width: '100%',
    marginTop: theme.spacing.xl,
  },
  featuredSection: {
    paddingHorizontal: theme.spacing.lg,
    marginTop: theme.spacing['2xl'],
    gap: theme.spacing.sm,
  },
  featuredCarousel: {
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
  },
  featuredCard: {
    width: 200,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.white,
    overflow: 'hidden',
    ...theme.shadows.small,
    marginRight: theme.spacing.sm,
  },
  featuredImage: {
    width: '100%',
    height: 120,
    backgroundColor: theme.colors.beige,
  },
  featuredBody: {
    padding: theme.spacing.sm,
    gap: theme.spacing.xs / 2,
  },
  featuredTitle: {
    fontFamily: theme.typography.fontFamily.interSemiBold,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textPrimary,
  },
  featuredPrice: {
    fontFamily: theme.typography.fontFamily.anton,
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.orange,
  },
  listingsSection: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.xl,
  },
  sectionTitle: {
    fontFamily: theme.typography.fontFamily.anton,
    fontSize: theme.typography.fontSize.xl,
    color: theme.colors.emerald,
    letterSpacing: theme.typography.letterSpacing.wide,
    marginBottom: theme.spacing.base,
  },
  listingsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.base,
  },
  listingCard: {
    width: LISTING_WIDTH,
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    ...theme.shadows.medium,
  },
  listingImage: {
    width: '100%',
    height: 150,
    backgroundColor: theme.colors.beige,
  },
  listingImagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  listingInfo: {
    padding: theme.spacing.base,
  },
  listingTitle: {
    fontFamily: theme.typography.fontFamily.interSemiBold,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  listingPrice: {
    fontFamily: theme.typography.fontFamily.anton,
    fontSize: theme.typography.fontSize.lg,
    color: theme.colors.orange,
    letterSpacing: theme.typography.letterSpacing.wide,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing['3xl'],
    gap: theme.spacing.base,
  },
  emptyText: {
    fontFamily: theme.typography.fontFamily.interSemiBold,
    fontSize: theme.typography.fontSize.lg,
    color: theme.colors.textSecondary,
  },
  bottomPadding: {
    height: theme.spacing['2xl'],
  },
  badgeCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    backgroundColor: theme.colors.border,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs / 2,
    borderRadius: theme.borderRadius.full,
  },
  badgePillText: {
    fontFamily: theme.typography.fontFamily.interSemiBold,
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textSecondary,
  },
  badgeModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  badgeModalCard: {
    width: '100%',
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  badgeModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badgeModalTitle: {
    fontFamily: theme.typography.fontFamily.anton,
    fontSize: theme.typography.fontSize.xl,
    color: theme.colors.textPrimary,
  },
  badgeModalSubtitle: {
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  badgeModalFeatures: {
    gap: theme.spacing.sm,
  },
  badgeModalHint: {
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textSecondary,
  },
  planBadgeIcon: {
    marginLeft: theme.spacing.xs,
    marginTop: theme.spacing.xs / 2,
  },
  promoModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  promoModalCard: {
    width: '100%',
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  promoModalTitle: {
    fontFamily: theme.typography.fontFamily.anton,
    fontSize: theme.typography.fontSize.lg,
    color: theme.colors.textPrimary,
  },
  promoInput: {
    width: '100%',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textPrimary,
  },
  promoTextarea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  promoModalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  promoModalCancel: {
    backgroundColor: 'transparent',
  },
  promoModalSave: {
    minWidth: 120,
    alignItems: 'center',
  },
});

const PlanBadge = ({ planSlug, verified, onPress }) => {
  const config = PLAN_BADGES[planSlug] || PLAN_BADGES.free;
  if (!verified) {
    return (
      <TouchableOpacity style={styles.badgePill} onPress={onPress} activeOpacity={0.8}>
        <Ionicons name="close-circle" size={14} color={theme.colors.textSecondary} />
        <Text style={styles.badgePillText}>Not verified</Text>
      </TouchableOpacity>
    );
  }
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
      <MaterialCommunityIcons
        name="check-decagram"
        size={18}
        color={config.background}
        style={styles.planBadgeIcon}
      />
    </TouchableOpacity>
  );
};

export default StorefrontScreen;
