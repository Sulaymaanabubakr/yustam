import React, { useState, useEffect, useMemo } from 'react';
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
import { CLOUDINARY_UPLOAD_PRESET, CLOUDINARY_CLOUD_NAME } from '../../config/cloudinary';
import { STATES } from '../../config/constants';
import { goBackOrNavigate } from '../../utils/navigation';
import { resolveUserUid } from '../../utils/user';
import { homeAPI, listingsAPI } from '../../services/api';
import SelectField from '../../components/SelectField';
import {
  CATEGORY_OPTION_LIST,
  buildOptionsFromLabels,
  getSubcategoriesForCategory,
} from '../../data/categories';

const CONDITIONS = ['New', 'Used - Like New', 'Used - Good', 'Used - Fair', 'Refurbished'];

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'pending', label: 'Pending Review' },
  { value: 'approved', label: 'Live' },
  { value: 'unlisted', label: 'Temporarily Unlisted' },
  { value: 'sold', label: 'Sold / Out of Stock' },
];

const CONDITION_OPTIONS = CONDITIONS.map((label) => ({ label, value: label }));
const STATUS_SELECT_OPTIONS = STATUS_OPTIONS;
const STATE_OPTIONS = STATES.map((label) => ({ label, value: label }));
const DEFAULT_COUNTRY = 'Nigeria';
const FALLBACK_CATEGORY_OPTIONS = CATEGORY_OPTION_LIST;

const CATEGORY_SELECT_OPTIONS = CATEGORY_OPTIONS.map((label) => ({ label, value: label }));
const CONDITION_OPTIONS = CONDITIONS.map((label) => ({ label, value: label }));
const STATUS_SELECT_OPTIONS = STATUS_OPTIONS;
const STATE_OPTIONS = NIGERIAN_STATES.map((label) => ({ label, value: label }));

const CATEGORY_PRESETS = {
  'Phones & Tablets': ['Smartphones', 'Feature Phones', 'Tablets', 'Smartwatches & Wearables', 'Accessories'],
  Electronics: ['Computers', 'TV & Audio', 'Cameras', 'Accessories'],
  Fashion: ['Men', 'Women', 'Kids', 'Accessories'],
  'Home & Garden': ['Furniture', 'Appliances', 'Décor', 'Outdoor'],
  Vehicles: ['Cars', 'Motorcycles', 'Auto Parts', 'Trucks & Buses'],
  'Beauty & Personal Care': ['Skincare', 'Haircare', 'Fragrances', 'Makeup'],
  'Sports & Outdoors': ['Fitness', 'Outdoor Gear', 'Sportswear', 'Accessories'],
  'Books & Media': ['Books', 'Movies & Music', 'Educational'],
  'Toys & Kids': ['Toys', 'Baby Gear', 'Kids Wear'],
  'Health & Wellness': ['Supplements', 'Medical Devices', 'Wellness'],
  Services: ['Repairs', 'Logistics', 'Events', 'Consulting'],
  'Real Estate': ['Apartments', 'Houses', 'Land', 'Short Lets'],
  Other: [],
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
  const subcategoryOptions = useMemo(
    () => (formData.category ? getSubcategoriesForCategory(formData.category) : []),
    [formData.category]
  );
  const hasPresetSubcategories = subcategoryOptions.length > 0;

  useEffect(() => {
    if (listing) {
      setFormData({
        ...createDefaultFormState(),
        title: listing.title || '',
        description: listing.description || '',
        price: listing.price !== undefined && listing.price !== null ? String(listing.price) : '',
        category: listing.category || '',
        subcategory: listing.subcategory || '',
        condition: listing.condition || 'New',
        location: listing.city || listing.location || '',
        state: listing.state || '',
        country: listing.country || DEFAULT_COUNTRY,
        status: listing.status_raw || listing.status || 'pending',
      });

      if (Array.isArray(listing.images) && listing.images.length > 0) {
        setImages(listing.images.map((url) => ({ uri: url, uploaded: true })));
      } else if (listing.image || listing.primaryImage) {
        setImages([{ uri: listing.image || listing.primaryImage, uploaded: true }]);
      } else {
        setImages([]);
      }
    } else {
      setFormData(createDefaultFormState());
      setImages([]);
    }
  }, [listing]);

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

  const pickImage = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsMultipleSelection: false,
        quality: 0.8,
        aspect: [4, 3],
      });

      if (!result.canceled && Array.isArray(result.assets)) {
        const selections = result.assets
          .filter((asset) => asset?.uri)
          .map((asset) => ({ uri: asset.uri, uploaded: false }));
        if (selections.length) {
          setImages((prev) => [...prev, ...selections]);
          showToast('Image added. Remember to save the listing.');
        }
      }
    } catch (error) {
      console.error('Error picking image:', error);
      showToast('Failed to pick image', 'error');
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

  const uploadImagesToCloudinary = async () => {
    const imagesToUpload = images.filter(img => !img.uploaded);
    if (imagesToUpload.length === 0) {
      const uploaded = images.filter((img) => img.uploaded).map((img) => img.uri);
      setImages(uploaded.map((url) => ({ uri: url, uploaded: true })));
      return uploaded;
    }

    setUploading(true);
    const uploadedUrls = [];

    try {
      for (const image of imagesToUpload) {
        const formData = new FormData();
        formData.append('file', {
          uri: image.uri,
          type: 'image/jpeg',
          name: `listing_${Date.now()}.jpg`,
        });
        formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
        formData.append('folder', `listings/${vendorUid || 'vendor'}`);

        const uploadUrl = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;
        const response = await fetch(uploadUrl,
          {
            method: 'POST',
            body: formData,
          }
        );

        if (!response.ok) {
          throw new Error('Image upload failed');
        }

        const data = await response.json();
        uploadedUrls.push(data.secure_url);
      }

      // Add already uploaded images
      const existingUrls = images.filter(img => img.uploaded).map(img => img.uri);
      const combined = [...existingUrls, ...uploadedUrls];
      setImages(combined.map((url) => ({ uri: url, uploaded: true })));
      return combined;
    } catch (error) {
      console.error('Error uploading images:', error);
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
    const numericPrice = parseFloat(formData.price);
    if (!formData.price || Number.isNaN(numericPrice) || numericPrice <= 0) {
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
    if (images.length === 0) {
      showToast('Please add at least one image', 'error');
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    const listingIdentifier = listing?.id || listing?.listing_id || listing?.listingId || null;

    try {
      setSaving(true);
      const imageUrls = await uploadImagesToCloudinary();

      const payload = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        price: parseFloat(formData.price),
        category: formData.category,
        subcategory: formData.subcategory,
        condition: formData.condition,
        location: formData.location.trim(),
        city: formData.location.trim(),
        state: formData.state,
        country: formData.country || DEFAULT_COUNTRY,
        status: isEditMode ? formData.status : 'pending',
        images: imageUrls,
        primaryImage: imageUrls[0] || '',
      };

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
          <Text style={styles.sectionTitle}>Product Images *</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imagesContainer}>
            {images.map((image, index) => (
              <View key={index} style={styles.imageWrapper}>
                <Image source={{ uri: image.uri }} style={styles.image} resizeMode="cover" />
                <TouchableOpacity
                  style={styles.removeImageButton}
                  onPress={() => removeImage(index)}
                >
                  <Ionicons name="close-circle" size={24} color={theme.colors.error} />
                </TouchableOpacity>
              </View>
            ))}
            <TouchableOpacity style={styles.addImageButton} onPress={pickImage}>
              <Ionicons name="add-circle-outline" size={40} color={theme.colors.accent} />
              <Text style={styles.addImageText}>Add Photo</Text>
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
          <Text style={styles.label}>Price (₦) *</Text>
          <TextInput
            style={styles.input}
            value={formData.price}
            onChangeText={(text) => updateFormData('price', text)}
            placeholder="0.00"
            placeholderTextColor={theme.colors.textSecondary}
            keyboardType="numeric"
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

        {/* Country */}
        <View style={styles.section}>
          <Text style={styles.label}>Country</Text>
          <TextInput
            style={styles.input}
            value={formData.country}
            onChangeText={(text) => updateFormData('country', text)}
            placeholder="Nigeria"
            placeholderTextColor={theme.colors.textSecondary}
          />
        </View>

        {/* Status */}
        <View style={styles.section}>
          <SelectField
            label={`Status ${isEditMode ? '' : '(auto)'}`}
            value={formData.status}
            options={STATUS_SELECT_OPTIONS}
            onSelect={(value) => updateFormData('status', value)}
            disabled={!isEditMode}
            searchable={false}
            helperText={
              !isEditMode
                ? 'New listings are submitted for review before going live.'
                : undefined
            }
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
              {uploading ? 'Uploading images...' : 'Saving listing...'}
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
