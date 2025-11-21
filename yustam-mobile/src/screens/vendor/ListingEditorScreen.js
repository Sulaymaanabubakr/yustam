import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  Alert,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../context/AuthContext';
import theme from '../../theme';
import Toast from '../../components/Toast';
import Button from '../../components/Button';
import { uploadMedia } from '../../config/cloudinary';
import { STATES } from '../../config/constants';
import { addDoc, collection, deleteDoc, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { goBackOrNavigate } from '../../utils/navigation';
import { resolveUserUid } from '../../utils/user';
import { homeAPI, listingsAPI } from '../../services/api';
import SelectField from '../../components/SelectField';
import {
  CATEGORY_OPTION_LIST,
  buildOptionsFromLabels,
  getSubcategoriesForCategory,
} from '../../data/categories';
import { getCategoryFieldDefinitions } from '../../data/listingFieldConfig';
import { db } from '../../config/firebase';

const CONDITIONS = ['New', 'Used - Like New', 'Used - Good', 'Used - Fair', 'Refurbished'];

const CONDITION_OPTIONS = CONDITIONS.map((label) => ({ label, value: label }));
const STATE_OPTIONS = STATES.map((label) => ({ label, value: label }));
const DEFAULT_COUNTRY = 'Nigeria';
const FALLBACK_CATEGORY_OPTIONS = CATEGORY_OPTION_LIST;
const MIN_IMAGE_COUNT = 2;
const MAX_IMAGE_COUNT = 8;
const VIDEO_FILE_EXTENSIONS = ['mp4', 'mov', 'm4v', 'avi'];

const inferMediaTypeFromUri = (uri) => {
  const value = (uri || '').toLowerCase();
  if (VIDEO_FILE_EXTENSIONS.some((ext) => value.includes(`.${ext}`))) {
    return 'video';
  }
  return 'image';
};
const GENERAL_FIELD_NAMES = new Set(
  [
    'title',
    'listingtitle',
    'producttitle',
    'productname',
    'name',
    'description',
    'price',
    'location',
    'city',
    'state',
    'country',
    'condition',
    'status',
  ].map((value) => value.toLowerCase())
);

const normalizeFieldName = (value) => String(value || '').trim().toLowerCase();

const filterDynamicFields = (fields = []) =>
  fields.filter((field) => field?.name && !GENERAL_FIELD_NAMES.has(normalizeFieldName(field.name)));

const formatAttributeInputValue = (field, value) => {
  if (value === undefined || value === null) {
    return '';
  }
  if (field?.type === 'number') {
    return String(value).replace(/[^0-9.]/g, '');
  }
  return String(value);
};

const buildAttributePayload = (fields = [], values = {}) => {
  const payload = {};
  fields.forEach((field) => {
    const key = field?.name;
    if (!key) {
      return;
    }
    const rawValue = values[key];
    if (rawValue === undefined || rawValue === null || rawValue === '') {
      return;
    }
    if (field.type === 'number') {
      const numeric = Number(String(rawValue).replace(/[^0-9.]/g, ''));
      if (!Number.isNaN(numeric)) {
        payload[key] = numeric;
      }
      return;
    }
    payload[key] = String(rawValue).trim();
  });
  return payload;
};

const extractAttributeValuesFromListing = (listing, fields = []) => {
  if (!listing) {
    return {};
  }
  const attributes = {};
  fields.forEach((field) => {
    const key = field?.name;
    if (!key) {
      return;
    }
    const sourceValue = listing[key];
    if (sourceValue === undefined || sourceValue === null || sourceValue === '') {
      return;
    }
    attributes[key] = formatAttributeInputValue(field, sourceValue);
  });
  return attributes;
};

const createDefaultFormState = () => ({
  title: '',
  description: '',
  price: '',
  category: '',
  subcategory: '',
  condition: 'New',
  location: '',
  state: '',
  country: DEFAULT_COUNTRY,
  status: 'pending',
});

const normalisePriceValue = (value) => {
  if (value === null || value === undefined) {
    return null;
  }
  const numeric = Number(String(value).replace(/[^0-9.]/g, ''));
  return Number.isFinite(numeric) ? numeric : null;
};

const formatPriceDisplay = (value) => {
  const numeric = normalisePriceValue(value);
  if (!numeric) {
    return '';
  }
  return Number(numeric).toLocaleString();
};

const ListingEditorScreen = ({ route, navigation }) => {
  const { listing } = route.params || {};
  const { user } = useAuth();
  const vendorUid = resolveUserUid(user, 'vendor');
  const vendorId = useMemo(() => {
    if (!user) {
      return null;
    }
    if (user.vendorId) {
      return user.vendorId;
    }
    if (user.vendor?.vendorId) {
      return user.vendor.vendorId;
    }
    return null;
  }, [user]);
  const isEditMode = !!listing;

  const [formData, setFormData] = useState(createDefaultFormState);
  const [categoryOptions, setCategoryOptions] = useState(FALLBACK_CATEGORY_OPTIONS);
  const [categoryLoading, setCategoryLoading] = useState(false);
  const [images, setImages] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'info' });
  const [attributeValues, setAttributeValues] = useState({});
  const subcategoryOptions = useMemo(
    () => (formData.category ? getSubcategoriesForCategory(formData.category) : []),
    [formData.category]
  );
  const categoryFieldDefinitions = useMemo(
    () => getCategoryFieldDefinitions(formData.category),
    [formData.category]
  );
  const dynamicFieldDefinitions = useMemo(
    () => filterDynamicFields(categoryFieldDefinitions),
    [categoryFieldDefinitions]
  );
  const attributePayload = useMemo(
    () => buildAttributePayload(dynamicFieldDefinitions, attributeValues),
    [attributeValues, dynamicFieldDefinitions]
  );
  const hasPresetSubcategories = subcategoryOptions.length > 0;
  const vendorProfile = user?.vendor || {};
  const vendorFriendlyName =
    vendorProfile.businessName ||
    vendorProfile.name ||
    user?.displayName ||
    user?.email ||
    'Marketplace Vendor';
  const vendorPlanLabel =
    vendorProfile.planLabel || vendorProfile.plan || user?.vendorPlan || 'Free';
  const vendorEmail = vendorProfile.email || user?.email || '';
  const vendorPhone = vendorProfile.phone || user?.phone || '';
  const defaultVendorLocation =
    vendorProfile.location ||
    [vendorProfile.city, vendorProfile.state].filter(Boolean).join(', ');

  const buildFirestoreDocument = useCallback(
    (imageUrls, videoUrl) => {
      const locationValue = (formData.location || '').trim();
      const mergedLocation = [locationValue, formData.state].filter(Boolean).join(', ');
      const trimmedTitle = formData.title.trim() || 'Marketplace Listing';
      const priceValue = normalisePriceValue(formData.price) ?? 0;
      const countryValue = formData.country || DEFAULT_COUNTRY;
      const attributeEntries = attributePayload;
      const hasAttributeEntries = Object.keys(attributeEntries).length > 0;
      return {
        title: trimmedTitle,
        productTitle: trimmedTitle,
        listingTitle: trimmedTitle,
        description: formData.description.trim(),
        category: formData.category,
        subcategory: formData.subcategory,
        status: isEditMode ? formData.status : 'pending',
        price: priceValue,
        amount: priceValue,
        listingPrice: priceValue,
        imageUrls,
        images: imageUrls,
        media: [
          ...imageUrls.map((url) => ({ type: 'image', url })),
          ...(videoUrl ? [{ type: 'video', url: videoUrl }] : []),
        ],
        coverImage: imageUrls[0] || '',
        videoUrl: videoUrl || '',
        video: videoUrl || '',
        vendorUid: vendorUid || user?.uid || '',
        vendorFirebaseUid: user?.uid || '',
        vendorID: vendorId || null,
        vendorId: vendorId || null,
        vendorName: vendorFriendlyName,
        vendorBusinessName: vendorFriendlyName,
        vendorEmail,
        vendorPlan: vendorPlanLabel,
        vendorLocation: defaultVendorLocation || mergedLocation,
        vendorPhone,
        location: mergedLocation,
        city: locationValue,
        state: formData.state,
        country: countryValue,
        ...(hasAttributeEntries ? attributeEntries : {}),
        ...(hasAttributeEntries ? { categoryAttributes: attributeEntries } : {}),
      };
    },
    [
      formData.category,
      formData.country,
      formData.description,
      formData.location,
      formData.state,
      formData.status,
      formData.subcategory,
      formData.title,
      formData.price,
      isEditMode,
      user?.uid,
      vendorUid,
      vendorId,
      vendorFriendlyName,
      vendorEmail,
      vendorPlanLabel,
      vendorPhone,
      defaultVendorLocation,
      attributePayload,
    ]
  );

  const syncListingWithFirestore = useCallback(
    async ({ imageUrls, videoUrl }) => {
      const sanitizedImages = Array.isArray(imageUrls) ? imageUrls : [];
      const payload = buildFirestoreDocument(sanitizedImages, videoUrl || '');
      if (isEditMode && listing?.firestoreId) {
        const listingRef = doc(db, 'listings', listing.firestoreId);
        await updateDoc(listingRef, {
          ...payload,
          updatedAt: serverTimestamp(),
        });
        return { firestoreId: listing.firestoreId, rollback: null };
      }
      const createPayload = {
        ...payload,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      const docRef = await addDoc(collection(db, 'listings'), createPayload);
      return {
        firestoreId: docRef.id,
        rollback: async () => {
          try {
            await deleteDoc(docRef);
          } catch (error) {
            console.warn('Failed to rollback listing document', error);
          }
        },
      };
    },
    [buildFirestoreDocument, isEditMode, listing?.firestoreId]
  );

  useEffect(() => {
    if (listing) {
      setFormData({
        ...createDefaultFormState(),
        title: listing.title || '',
        description: listing.description || '',
        price:
          listing.price !== undefined && listing.price !== null
            ? formatPriceDisplay(listing.price)
            : '',
        category: listing.category || '',
        subcategory: listing.subcategory || '',
        condition: listing.condition || 'New',
        location: listing.city || listing.location || '',
        state: listing.state || '',
        country: listing.country || DEFAULT_COUNTRY,
        status: listing.status_raw || listing.status || 'pending',
      });

      const preparedMedia = [];

      if (Array.isArray(listing.media) && listing.media.length > 0) {
        listing.media.forEach((entry) => {
          const mediaUrl = typeof entry === 'string' ? entry : entry?.url;
          if (!mediaUrl) {
            return;
          }
          const type = typeof entry === 'object' && entry?.type ? entry.type : inferMediaTypeFromUri(mediaUrl);
          preparedMedia.push({
            uri: mediaUrl,
            uploaded: true,
            type: type === 'video' ? 'video' : 'image',
            publicId: entry?.publicId || null,
            resourceType: type === 'video' ? 'video' : 'image',
          });
        });
      }

      if (!preparedMedia.length && Array.isArray(listing.images) && listing.images.length > 0) {
        listing.images.slice(0, MAX_IMAGE_COUNT).forEach((url) => {
          if (!url) {
            return;
          }
          preparedMedia.push({
            uri: url,
            uploaded: true,
            type: 'image',
            publicId: null,
            resourceType: 'image',
          });
        });
      }

      if (!preparedMedia.length && (listing.image || listing.primaryImage)) {
        const singleUrl = listing.image || listing.primaryImage;
        preparedMedia.push({
          uri: singleUrl,
          uploaded: true,
          type: inferMediaTypeFromUri(singleUrl),
          publicId: null,
          resourceType: inferMediaTypeFromUri(singleUrl),
        });
      }

      if (listing.videoUrl && !preparedMedia.some((item) => item.type === 'video')) {
        preparedMedia.push({
          uri: listing.videoUrl,
          uploaded: true,
          type: 'video',
          publicId: null,
          resourceType: 'video',
        });
      }

      setImages(preparedMedia.slice(0, MAX_IMAGE_COUNT));
      const initialAttributes = extractAttributeValuesFromListing(
        listing,
        filterDynamicFields(getCategoryFieldDefinitions(listing.category))
      );
      setAttributeValues(initialAttributes);
    } else {
      setFormData(createDefaultFormState());
      setImages([]);
      setAttributeValues({});
    }
  }, [listing]);

  useEffect(() => {
    setAttributeValues((prev) => {
      if (!dynamicFieldDefinitions.length) {
        return {};
      }
      const next = {};
      dynamicFieldDefinitions.forEach((field) => {
        const key = field?.name;
        if (key && prev[key] !== undefined) {
          next[key] = prev[key];
        }
      });
      const prevKeys = Object.keys(prev);
      const nextKeys = Object.keys(next);
      if (prevKeys.length === nextKeys.length) {
        let unchanged = true;
        for (let i = 0; i < nextKeys.length; i += 1) {
          const key = nextKeys[i];
          if (prev[key] !== next[key]) {
            unchanged = false;
            break;
          }
        }
        if (unchanged) {
          return prev;
        }
      }
      return next;
    });
  }, [dynamicFieldDefinitions]);

  useEffect(() => {
    let isMounted = true;
    const loadCategories = async () => {
      setCategoryLoading(true);
      try {
        const categories = await homeAPI.listCategories();
        if (!isMounted) {
          return;
        }
        if (Array.isArray(categories) && categories.length) {
          setCategoryOptions(buildOptionsFromLabels(categories));
        } else {
          setCategoryOptions(FALLBACK_CATEGORY_OPTIONS);
        }
      } catch (error) {
        console.warn('Failed to load categories', error);
        if (isMounted) {
          setCategoryOptions(FALLBACK_CATEGORY_OPTIONS);
        }
      } finally {
        if (isMounted) {
          setCategoryLoading(false);
        }
      }
    };

    loadCategories();
    return () => {
      isMounted = false;
    };
  }, []);

  const showToast = (message, type = 'success') => {
    setToast({ visible: true, message, type });
  };

  const hideToast = () => {
    setToast({ ...toast, visible: false });
  };

  const updateFormData = (key, value) => {
    setFormData((prev) => ({
      ...prev,
      [key]: value,
      ...(key === 'category' ? { subcategory: '' } : {}),
    }));
  };

  const updateAttributeField = useCallback((field, value) => {
    const key = field?.name;
    if (!key) {
      return;
    }
    const normalisedValue =
      field.type === 'number' ? String(value || '').replace(/[^0-9.]/g, '') : String(value || '');
    setAttributeValues((prev) => {
      if (!normalisedValue) {
        if (!(key in prev)) {
          return prev;
        }
        const { [key]: _, ...rest } = prev;
        return rest;
      }
      if (prev[key] === normalisedValue) {
        return prev;
      }
      return {
        ...prev,
        [key]: normalisedValue,
      };
    });
  }, []);

  const shouldShowCategoryDetails =
    dynamicFieldDefinitions.length > 0 &&
    formData.category &&
    (!hasPresetSubcategories || !!formData.subcategory);

  const renderDynamicField = (field) => {
    const key = field?.name;
    if (!key) {
      return null;
    }
    const label = field.label || key;
    const placeholder =
      field.placeholder ||
      (field.type === 'select' ? `Select ${label.toLowerCase()}` : `Enter ${label.toLowerCase()}`);
    const fieldType = field.type === 'datalist' || field.type === 'date' ? 'text' : field.type;
    const value = attributeValues[key] ?? '';

    if (fieldType === 'select') {
      return (
        <View key={key} style={styles.dynamicField}>
          <SelectField
            label={`${label} (optional)`}
            placeholder={placeholder}
            value={value || null}
            options={field.options || []}
            onSelect={(nextValue) => updateAttributeField(field, nextValue)}
            searchable={(field.options || []).length > 6}
          />
        </View>
      );
    }

    const isTextarea = fieldType === 'textarea';
    const keyboardType = fieldType === 'number' ? 'numeric' : 'default';

    return (
      <View key={key} style={styles.dynamicField}>
        <Text style={styles.label}>
          {label} <Text style={styles.optionalTag}>(optional)</Text>
        </Text>
        <TextInput
          style={[styles.input, isTextarea && styles.textArea]}
          value={value}
          onChangeText={(text) => updateAttributeField(field, text)}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.textSecondary}
          keyboardType={keyboardType}
          multiline={isTextarea}
          numberOfLines={isTextarea ? 4 : 1}
          textAlignVertical={isTextarea ? 'top' : 'center'}
        />
      </View>
    );
  };

  const handlePriceInputChange = (text) => {
    const sanitized = text.replace(/[^0-9]/g, '');
    if (!sanitized) {
      updateFormData('price', '');
      return;
    }
    const numeric = Number(sanitized);
    const formatted = Number.isFinite(numeric) ? numeric.toLocaleString() : '';
    updateFormData('price', formatted);
  };

  const requestPermissions = async () => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow access to your photo library to upload images.');
        return false;
      }
    }
    return true;
  };

  const pickMedia = async () => {
    if (images.length >= MAX_IMAGE_COUNT) {
      showToast(`You can only upload up to ${MAX_IMAGE_COUNT} media files`, 'error');
      return;
    }

    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    try {
      const remainingSlots = MAX_IMAGE_COUNT - images.length;
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsMultipleSelection: true,
        selectionLimit: remainingSlots,
        quality: 0.85,
      });

      if (result.canceled) {
        return;
      }

      const assets = result.assets || result.selected || [];
      const selections = assets
        .filter((asset) => asset?.uri)
        .slice(0, remainingSlots)
        .map((asset) => ({
          uri: asset.uri,
          uploaded: false,
          type: asset?.type === 'video' ? 'video' : 'image',
          resourceType: asset?.type === 'video' ? 'video' : 'image',
        }));

      if (selections.length) {
        setImages((prev) => [...prev, ...selections]);
        showToast(
          selections.length > 1
            ? `${selections.length} media files added. Remember to save the listing.`
            : `${selections[0].type === 'video' ? 'Video' : 'Image'} added. Remember to save the listing.`
        );
      }
    } catch (error) {
      console.error('Error picking media:', error);
      showToast('Failed to pick media', 'error');
    }
  };

  const removeImage = (index) => {
    Alert.alert(
      'Remove Image',
      'Are you sure you want to remove this image?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            setImages(prev => prev.filter((_, i) => i !== index));
          },
        },
      ]
    );
  };

  const uploadListingMedia = async () => {
    const pendingMedia = images.filter((item) => !item.uploaded);
    if (pendingMedia.length === 0) {
      const uploadedCopy = images.map((item) => ({ ...item, uploaded: true }));
      setImages(uploadedCopy);
      const imageUrls = uploadedCopy.filter((item) => item.type !== 'video').map((item) => item.uri);
      const videoItem = uploadedCopy.find((item) => item.type === 'video');
      return {
        images: imageUrls,
        video: videoItem ? videoItem.uri : null,
        media: uploadedCopy,
      };
    }

    setUploading(true);
    const updatedItems = images.map((item) => ({ ...item }));

    try {
      for (let index = 0; index < images.length; index += 1) {
        const item = images[index];
        if (item.uploaded) {
          continue;
        }
        const resourceType = item.type === 'video' ? 'video' : 'image';
        const uploadResult = await uploadMedia(item.uri, {
          folder: `listings/${vendorUid || 'vendor'}`,
          resourceType,
          watermark: true,
          vendorName: vendorFriendlyName,
          format: resourceType === 'video' ? 'mp4' : undefined,
        });

        updatedItems[index] = {
          ...item,
          uri: uploadResult.url,
          uploaded: true,
          publicId: uploadResult.publicId,
          originalUrl: uploadResult.originalUrl,
          resourceType: uploadResult.resourceType || resourceType,
        };
      }

      setImages(updatedItems);
      const imageUrls = updatedItems.filter((item) => item.type !== 'video').map((item) => item.uri);
      const videoItem = updatedItems.find((item) => item.type === 'video');
      return {
        images: imageUrls,
        video: videoItem ? videoItem.uri : null,
        media: updatedItems,
      };
    } catch (error) {
      console.error('Error uploading media:', error);
      showToast('Failed to upload media. Please try again.', 'error');
      throw error;
    } finally {
      setUploading(false);
    }
  };

  const validateForm = () => {
    if (!formData.title.trim()) {
      showToast('Please enter a title', 'error');
      return false;
    }
    if (!formData.description.trim()) {
      showToast('Please enter a description', 'error');
      return false;
    }
    const numericPrice = normalisePriceValue(formData.price);
    if (!numericPrice || numericPrice <= 0) {
      showToast('Please enter a valid price', 'error');
      return false;
    }
    if (!formData.category) {
      showToast('Please select a category', 'error');
      return false;
    }
    if (subcategoryOptions.length > 0 && !formData.subcategory) {
      showToast('Please select a subcategory', 'error');
      return false;
    }
    if (!formData.state) {
      showToast('Please select a state', 'error');
      return false;
    }
    if (!formData.location.trim()) {
      showToast('Please enter your city or location', 'error');
      return false;
    }
    const photoCount = images.filter((item) => item.type !== 'video').length;
    const mediaCount = images.length;
    if (photoCount < MIN_IMAGE_COUNT) {
      showToast(`Please add at least ${MIN_IMAGE_COUNT} photos`, 'error');
      return false;
    }
    if (mediaCount > MAX_IMAGE_COUNT) {
      showToast(`You can only upload up to ${MAX_IMAGE_COUNT} media files`, 'error');
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    const listingIdentifier = listing?.id || listing?.listing_id || listing?.listingId || null;
    let rollbackFirestore;

    try {
      setSaving(true);
      const mediaUploadResult = await uploadListingMedia();
      const imageUrls = mediaUploadResult.images;
      const videoUrl = mediaUploadResult.video;
      const mediaPayload = mediaUploadResult.media.map((item) => ({
        url: item.uri,
        type: item.type || (item.resourceType === 'video' ? 'video' : 'image'),
        publicId: item.publicId || null,
        resourceType: item.resourceType || (item.type === 'video' ? 'video' : 'image'),
        originalUrl: item.originalUrl || null,
      }));

      const firestoreSyncResult = await syncListingWithFirestore({ imageUrls, videoUrl });
      rollbackFirestore = firestoreSyncResult?.rollback;
      const resolvedFirestoreId =
        firestoreSyncResult?.firestoreId || listing?.firestoreId || listingIdentifier || null;
      const priceValue = normalisePriceValue(formData.price) || 0;
      const payload = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        price: priceValue,
        category: formData.category,
        subcategory: formData.subcategory,
        condition: formData.condition,
        location: formData.location.trim(),
        city: formData.location.trim(),
        state: formData.state,
        country: DEFAULT_COUNTRY,
        status: isEditMode ? formData.status : 'pending',
        images: imageUrls,
        primaryImage: imageUrls[0] || '',
        media: mediaPayload,
        videoUrl: videoUrl || '',
        video: videoUrl || '',
        firestoreId: resolvedFirestoreId,
      };

      if (Object.keys(attributePayload).length) {
        payload.categoryAttributes = attributePayload;
        Object.assign(payload, attributePayload);
      }

      if (vendorId) {
        payload.ownerId = `vendor:${vendorId}`;
      }

      if (isEditMode && listingIdentifier) {
        await listingsAPI.update(listingIdentifier, payload);
      } else {
        await listingsAPI.create(payload);
      }

      showToast(isEditMode ? 'Listing updated successfully' : 'Listing created successfully');
      setTimeout(() => {
        goBackOrNavigate(navigation, 'VendorListings');
      }, 700);
    } catch (error) {
      if (typeof rollbackFirestore === 'function') {
        await rollbackFirestore();
      }
      console.error('Error saving listing:', error);
      const message =
        error?.response?.data?.message ||
        error?.message ||
        'Failed to save listing';
      showToast(message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
    >
      <SafeAreaView style={styles.container}>
        <Toast
          visible={toast.visible}
          message={toast.message}
          type={toast.type}
          onDismiss={hideToast}
        />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => goBackOrNavigate(navigation)} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isEditMode ? 'EDIT LISTING' : 'NEW LISTING'}</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Images Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Product Media ({images.length}/{MAX_IMAGE_COUNT}) *
          </Text>
          <Text style={styles.helperText}>
            Add at least {MIN_IMAGE_COUNT} clear photos. Videos are optional. Maximum {MAX_IMAGE_COUNT} items.
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imagesContainer}>
            {images.map((image, index) => (
              <View key={index} style={styles.imageWrapper}>
                {image.type === 'video' ? (
                  <View style={styles.videoPreview}>
                    <Ionicons name="videocam" size={36} color="#fff" />
                    <Text style={styles.videoLabel}>Video</Text>
                  </View>
                ) : (
                  <Image source={{ uri: image.uri }} style={styles.image} resizeMode="cover" />
                )}
                <TouchableOpacity
                  style={styles.removeImageButton}
                  onPress={() => removeImage(index)}
                >
                  <Ionicons name="close-circle" size={24} color={theme.colors.error} />
                </TouchableOpacity>
              </View>
            ))}
            <TouchableOpacity style={styles.addImageButton} onPress={pickMedia}>
              <Ionicons name="add-circle-outline" size={40} color={theme.colors.accent} />
              <Text style={styles.addImageText}>
                {images.length >= MAX_IMAGE_COUNT ? 'Limit Reached' : 'Add Media'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Title */}
        <View style={styles.section}>
          <Text style={styles.label}>Title *</Text>
          <TextInput
            style={styles.input}
            value={formData.title}
            onChangeText={(text) => updateFormData('title', text)}
            placeholder="e.g., iPhone 13 Pro Max"
            placeholderTextColor={theme.colors.textSecondary}
          />
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.label}>Description *</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={formData.description}
            onChangeText={(text) => updateFormData('description', text)}
            placeholder="Describe your product..."
            placeholderTextColor={theme.colors.textSecondary}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* Price */}
        <View style={styles.section}>
          <Text style={styles.label}>Price (NGN) *</Text>
          <TextInput
            style={styles.input}
            value={formData.price}
            onChangeText={handlePriceInputChange}
            placeholder="e.g., 150,000"
            placeholderTextColor={theme.colors.textSecondary}
            keyboardType="number-pad"
          />
        </View>

        {/* Category */}
        <View style={styles.section}>
          <SelectField
            label="Category *"
            placeholder="Select category..."
            value={formData.category}
            options={categoryOptions}
            onSelect={(value) => updateFormData('category', value)}
            loading={categoryLoading}
            helperText={
              !categoryLoading && !categoryOptions.length
                ? 'Unable to load categories. Please try again later.'
                : undefined
            }
          />
        </View>

        {/* Subcategory */}
        <View style={styles.section}>
          <Text style={styles.label}>
            Subcategory {hasPresetSubcategories ? '*' : '(optional)'}
          </Text>
          {hasPresetSubcategories ? (
            <SelectField
              placeholder="Select subcategory..."
              value={formData.subcategory}
              options={subcategoryOptions}
              onSelect={(value) => updateFormData('subcategory', value)}
              searchable={subcategoryOptions.length > 8}
            />
          ) : (
            <>
              <TextInput
                style={styles.input}
                value={formData.subcategory}
                onChangeText={(text) => updateFormData('subcategory', text)}
                placeholder="Enter subcategory (optional)"
                placeholderTextColor={theme.colors.textSecondary}
              />
              {formData.category ? (
                <Text style={styles.helperText}>
                  No preset collections for this category yet. Use your own label if needed.
                </Text>
              ) : null}
            </>
          )}
        </View>

        {shouldShowCategoryDetails ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Category-specific details</Text>
            <Text style={styles.helperText}>
              Everything here is optional but helps buyers understand your offer.
            </Text>
            {dynamicFieldDefinitions.map((field) => renderDynamicField(field))}
          </View>
        ) : null}

        {/* Condition */}
        <View style={styles.section}>
          <SelectField
            label="Condition"
            value={formData.condition}
            options={CONDITION_OPTIONS}
            onSelect={(value) => updateFormData('condition', value)}
            searchable={false}
          />
        </View>

        {/* State */}
        <View style={styles.section}>
          <SelectField
            label="State *"
            placeholder="Select state..."
            value={formData.state}
            options={STATE_OPTIONS}
            onSelect={(value) => updateFormData('state', value)}
          />
        </View>

        {/* Location/City */}
        <View style={styles.section}>
          <Text style={styles.label}>City/Location</Text>
          <TextInput
            style={styles.input}
            value={formData.location}
            onChangeText={(text) => updateFormData('location', text)}
            placeholder="e.g., Ikeja"
            placeholderTextColor={theme.colors.textSecondary}
          />
        </View>

        {/* Save Button */}
        <Button
          title={saving ? 'Saving...' : isEditMode ? 'Update Listing' : 'Create Listing'}
          onPress={handleSave}
          disabled={saving || uploading}
          loading={saving || uploading}
          style={styles.saveButton}
        />

        {(uploading || saving) && (
          <View style={styles.uploadingContainer}>
            <ActivityIndicator size="small" color={theme.colors.accent} />
            <Text style={styles.uploadingText}>
              {uploading ? 'Uploading media...' : 'Saving listing...'}
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
    </KeyboardAvoidingView>
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
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: theme.spacing.md,
  },
  section: {
    marginBottom: theme.spacing.xl,
  },
  dynamicField: {
    marginTop: theme.spacing.md,
  },
  sectionTitle: {
    fontFamily: theme.typography.fontFamilyBody,
    fontSize: theme.typography.sizes.base,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
  },
  label: {
    fontFamily: theme.typography.fontFamilyBody,
    fontSize: theme.typography.sizes.sm,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  optionalTag: {
    fontFamily: theme.typography.fontFamilyBody,
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textSecondary,
    fontWeight: '400',
  },
  helperText: {
    fontFamily: theme.typography.fontFamilyBody,
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  input: {
    fontFamily: theme.typography.fontFamilyBody,
    fontSize: theme.typography.sizes.base,
    color: theme.colors.textPrimary,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.base,
  },
  textArea: {
    height: 100,
    paddingTop: theme.spacing.base,
  },
  imagesContainer: {
    flexDirection: 'row',
  },
  imageWrapper: {
    position: 'relative',
    marginRight: theme.spacing.base,
  },
  image: {
    width: 120,
    height: 120,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.beige,
  },
  videoPreview: {
    width: 120,
    height: 120,
    borderRadius: theme.borderRadius.md,
    backgroundColor: '#1F2933',
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoLabel: {
    marginTop: 8,
    color: '#FFFFFF',
    fontFamily: theme.typography.fontFamilyBody,
    fontSize: theme.typography.sizes.xs,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  removeImageButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
  },
  addImageButton: {
    width: 120,
    height: 120,
    borderRadius: theme.borderRadius.md,
    borderWidth: 2,
    borderColor: theme.colors.accent,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: `${theme.colors.accent}10`,
  },
  addImageText: {
    fontFamily: theme.typography.fontFamilyBody,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.accent,
    marginTop: theme.spacing.xs,
    fontWeight: '600',
    textAlign: 'center',
  },
  saveButton: {
    marginTop: theme.spacing.md,
  },
  uploadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  uploadingText: {
    fontFamily: theme.typography.fontFamilyBody,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
  },
});

export default ListingEditorScreen;

