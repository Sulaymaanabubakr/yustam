import React, { useState, useEffect } from 'react';
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
import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../context/AuthContext';
import theme from '../../theme';
import Toast from '../../components/Toast';
import Button from '../../components/Button';
import { API_BASE_URL } from '../../config/constants';
import { CLOUDINARY_UPLOAD_PRESET, CLOUDINARY_CLOUD_NAME } from '../../config/cloudinary';
import { goBackOrNavigate } from '../../utils/navigation';
import { resolveUserUid } from '../../utils/user';

const NIGERIAN_STATES = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno',
  'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'FCT Abuja', 'Gombe',
  'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara', 'Lagos',
  'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo', 'Plateau', 'Rivers', 'Sokoto',
  'Taraba', 'Yobe', 'Zamfara'
];

const CATEGORIES = [
  'Electronics', 'Fashion', 'Home & Garden', 'Vehicles', 'Beauty & Personal Care',
  'Sports & Outdoors', 'Books & Media', 'Toys & Kids', 'Health & Wellness',
  'Services', 'Real Estate', 'Other'
];

const CONDITIONS = ['New', 'Used - Like New', 'Used - Good', 'Used - Fair', 'Refurbished'];

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'pending', label: 'Pending Review' },
  { value: 'approved', label: 'Live' },
  { value: 'unlisted', label: 'Temporarily Unlisted' },
  { value: 'sold', label: 'Sold / Out of Stock' },
];

const ListingEditorScreen = ({ route, navigation }) => {
  const { listing } = route.params || {};
  const { user } = useAuth();
  const vendorUid = resolveUserUid(user, 'vendor');
  const isEditMode = !!listing;

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    category: '',
    subcategory: '',
    condition: 'New',
    location: '',
    state: '',
    status: 'draft',
  });

  const [images, setImages] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'info' });

  useEffect(() => {
    if (listing) {
      setFormData({
        title: listing.title || '',
        description: listing.description || '',
        price: listing.price?.toString() || '',
        category: listing.category || '',
        subcategory: listing.subcategory || '',
        condition: listing.condition || 'New',
        location: listing.location || '',
        state: listing.state || '',
        status: listing.status_raw || 'draft',
      });

      if (listing.images && listing.images.length > 0) {
        setImages(listing.images.map(url => ({ uri: url, uploaded: true })));
      } else if (listing.image) {
        setImages([{ uri: listing.image, uploaded: true }]);
      }
    }
  }, [listing]);

  const showToast = (message, type = 'success') => {
    setToast({ visible: true, message, type });
  };

  const hideToast = () => {
    setToast({ ...toast, visible: false });
  };

  const updateFormData = (key, value) => {
    setFormData(prev => ({ ...prev, [key]: value }));
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

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setImages(prev => [...prev, { uri: asset.uri, uploaded: false }]);
        showToast('Image added. Remember to save the listing.');
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
      return images.filter(img => img.uploaded).map(img => img.uri);
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
      setUploading(false);
      return [...existingUrls, ...uploadedUrls];
    } catch (error) {
      console.error('Error uploading images:', error);
      setUploading(false);
      throw error;
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
    if (!formData.price || isNaN(parseFloat(formData.price))) {
      showToast('Please enter a valid price', 'error');
      return false;
    }
    if (!formData.category) {
      showToast('Please select a category', 'error');
      return false;
    }
    if (!formData.state) {
      showToast('Please select a state', 'error');
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

    try {
      setSaving(true);

      // Upload images to Cloudinary
      const imageUrls = await uploadImagesToCloudinary();

      // Prepare payload
      const payload = {
        listingId: listing?.id || null,
        title: formData.title.trim(),
        description: formData.description.trim(),
        price: parseFloat(formData.price),
        category: formData.category,
        subcategory: formData.subcategory,
        condition: formData.condition,
        location: formData.location.trim(),
        state: formData.state,
        status: formData.status,
        images: imageUrls,
        image: imageUrls[0] || '',
      };

      // Call API
      const response = await fetch(`${API_BASE_URL}/vendor-listing-update.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('Failed to save listing');
      }

      const result = await response.json();

      if (result.success) {
        // Sync to Firestore
        if (result.listingId || listing?.id) {
          await fetch(`${API_BASE_URL}/vendor-listing-sync.php?listingId=${result.listingId || listing.id}`, {
            method: 'POST',
            credentials: 'include',
          });
        }

        showToast(isEditMode ? 'Listing updated successfully' : 'Listing created successfully');
        setTimeout(() => {
          goBackOrNavigate(navigation);
        }, 1000);
      } else {
        throw new Error(result.message || 'Failed to save listing');
      }
    } catch (error) {
      console.error('Error saving listing:', error);
      showToast(error.message || 'Failed to save listing', 'error');
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
          <Text style={styles.label}>Category *</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={formData.category}
              onValueChange={(value) => updateFormData('category', value)}
              style={styles.picker}
            >
              <Picker.Item label="Select category..." value="" />
              {CATEGORIES.map(cat => (
                <Picker.Item key={cat} label={cat} value={cat} />
              ))}
            </Picker>
          </View>
        </View>

        {/* Condition */}
        <View style={styles.section}>
          <Text style={styles.label}>Condition</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={formData.condition}
              onValueChange={(value) => updateFormData('condition', value)}
              style={styles.picker}
            >
              {CONDITIONS.map(cond => (
                <Picker.Item key={cond} label={cond} value={cond} />
              ))}
            </Picker>
          </View>
        </View>

        {/* State */}
        <View style={styles.section}>
          <Text style={styles.label}>State *</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={formData.state}
              onValueChange={(value) => updateFormData('state', value)}
              style={styles.picker}
            >
              <Picker.Item label="Select state..." value="" />
              {NIGERIAN_STATES.map(state => (
                <Picker.Item key={state} label={state} value={state} />
              ))}
            </Picker>
          </View>
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

        {/* Status */}
        <View style={styles.section}>
          <Text style={styles.label}>Status</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={formData.status}
              onValueChange={(value) => updateFormData('status', value)}
              style={styles.picker}
            >
              {STATUS_OPTIONS.map(opt => (
                <Picker.Item key={opt.value} label={opt.label} value={opt.value} />
              ))}
            </Picker>
          </View>
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
  pickerContainer: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: theme.borderRadius.md,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
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
