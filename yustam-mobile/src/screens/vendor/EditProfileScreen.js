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
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../context/AuthContext';
import theme from '../../theme';
import Toast from '../../components/Toast';
import Button from '../../components/Button';
import SelectField from '../../components/SelectField';
import { STATES } from '../../config/constants';
import { uploadImage } from '../../config/cloudinary';
import { vendorAPI, authAPI } from '../../services/api';
import { goBackOrNavigate } from '../../utils/navigation';
import resolveMediaUrl from '../../utils/url';
import { resolveUserUid } from '../../utils/user';

const EditProfileScreen = ({ navigation }) => {
  const { user, updateUserProfile } = useAuth();
  const vendorUid = resolveUserUid(user, 'vendor');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'info' });

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    businessName: '',
    businessAddress: '',
    state: '',
    profilePhoto: '',
  });

  const [profileData, setProfileData] = useState({
    plan: 'Free',
    planStatus: 'Active',
    planExpiry: '',
  });

  const [newPhotoUri, setNewPhotoUri] = useState(null);

  const formatStatusLabel = (value) => {
    const normalised = String(value || '').trim().toLowerCase();
    if (!normalised) {
      return 'Active';
    }
    if (['active', 'approved', 'verified'].includes(normalised)) {
      return 'Active';
    }
    if (['pending', 'processing', 'in_review', 'in-review', 'under review'].includes(normalised)) {
      return 'Pending';
    }
    if (['rejected', 'declined', 'failed'].includes(normalised)) {
      return 'Needs Review';
    }
    return String(value)
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const response = await vendorAPI.getProfile();
      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Unable to load profile data.');
      }

      const profile = response.data?.data || {};
      const resolvedPhoto =
        resolveMediaUrl(profile.photoUrl || profile.profilePhoto) ||
        user?.photoURL ||
        '';

      setFormData({
        name: user?.displayName || profile.businessName || '',
        email: profile.email || user?.email || '',
        phone: profile.phone || user?.phone || '',
        businessName: profile.businessName || user?.businessName || '',
        businessAddress: profile.address || profile.businessAddress || '',
        state: profile.state || user?.state || '',
        profilePhoto: resolvedPhoto,
      });

      setProfileData({
        plan: profile.plan || 'Free',
        planStatus: formatStatusLabel(profile.verificationStatus),
        planExpiry: profile.planRenewal || '',
      });
    } catch (error) {
      console.error('Error loading profile:', error);
      showToast('Failed to load profile', 'error');
    } finally {
      setLoading(false);
    }
  };

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
        Alert.alert('Permission Required', 'Please allow access to your photo library to change your profile photo.');
        return false;
      }
    }
    return true;
  };

  const pickPhoto = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    try {
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: 'images',
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setNewPhotoUri(asset.uri);
        showToast('Photo selected. Save to apply changes.');
      }
    } catch (error) {
      console.error('Error picking photo:', error);
      showToast('Failed to select photo', 'error');
    }
  };

  const uploadProfilePhoto = async () => {
    if (!newPhotoUri) {
      return formData.profilePhoto;
    }

    try {
      setUploading(true);
      const result = await uploadImage(newPhotoUri, {
        folder: `vendors/${vendorUid || 'vendor'}/profile`,
      });
      setUploading(false);
      return result.url;
    } catch (error) {
      console.error('Error uploading photo:', error);
      setUploading(false);
      throw error;
    }
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      showToast('Please enter your full name', 'error');
      return false;
    }
    if (!formData.phone.trim()) {
      showToast('Please enter your phone number', 'error');
      return false;
    }
    if (!formData.businessName.trim()) {
      showToast('Please enter your business name', 'error');
      return false;
    }
    if (!formData.businessAddress.trim()) {
      showToast('Please enter your business address', 'error');
      return false;
    }
    if (!formData.state) {
      showToast('Please select a state', 'error');
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    try {
      setSaving(true);

      // Upload photo if new one selected
      let profilePhotoUrl = formData.profilePhoto;
      if (newPhotoUri) {
        profilePhotoUrl = await uploadProfilePhoto();
      }

      const payload = {
        businessName: formData.businessName.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim(),
        state: formData.state,
        address: formData.businessAddress.trim(),
      };

      const response = await vendorAPI.updateProfile(payload);

      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Failed to update profile');
      }

      const updatedProfile = response.data?.data || {};

      try {
        await authAPI.updateProfile({
          displayName: formData.name.trim(),
          phone: formData.phone.trim(),
          photoUrl: profilePhotoUrl,
        });
      } catch (authError) {
        console.warn('Failed to update auth profile', authError);
      }

      if (updateUserProfile) {
        await updateUserProfile({
          displayName: formData.name,
          photoURL: profilePhotoUrl,
          phone: formData.phone,
          businessName: formData.businessName,
          businessAddress: formData.businessAddress,
          state: formData.state,
        });
      }

      setFormData(prev => ({
        ...prev,
        profilePhoto: profilePhotoUrl || prev.profilePhoto,
      }));
      setNewPhotoUri(null);
      setProfileData(prev => ({
        ...prev,
        plan: updatedProfile.plan || prev.plan,
        planStatus: formatStatusLabel(updatedProfile.verificationStatus) || prev.planStatus,
      }));

      showToast('Profile updated successfully');
      setTimeout(() => {
        goBackOrNavigate(navigation);
      }, 1000);
    } catch (error) {
      console.error('Error saving profile:', error);
      showToast(error.message || 'Failed to update profile', 'error');
    } finally {
      setSaving(false);
    }
  };

  const renderContent = () => (
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
        <Text style={styles.headerTitle}>EDIT PROFILE</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Profile Photo Section */}
        <View style={styles.photoSection}>
          <View style={styles.photoContainer}>
            {(newPhotoUri || formData.profilePhoto) ? (
              <Image
                source={{ uri: newPhotoUri || formData.profilePhoto }}
                style={styles.photo}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.photoPlaceholder}>
                <Ionicons name="person" size={50} color={theme.colors.textSecondary} />
              </View>
            )}
          </View>
          <TouchableOpacity style={styles.changePhotoButton} onPress={pickPhoto}>
            <Ionicons name="camera" size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.photoLabel}>Profile Photo</Text>
        </View>

        {/* Plan Info (Read-only) */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Current Plan</Text>
            <View style={styles.planBadge}>
              <Text style={styles.planText}>{profileData.plan}</Text>
            </View>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Status</Text>
            <View style={[styles.statusBadge, { backgroundColor: profileData.planStatus === 'Active' ? '#E8F5E9' : '#FFEBEE' }]}>
              <Text style={[styles.statusText, { color: profileData.planStatus === 'Active' ? '#0F9D58' : '#D32F2F' }]}>
                {profileData.planStatus}
              </Text>
            </View>
          </View>
          {profileData.planExpiry && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Expires</Text>
              <Text style={styles.infoValue}>{profileData.planExpiry}</Text>
            </View>
          )}
        </View>

        {/* Form Fields */}
        <View style={styles.section}>
          <Text style={styles.label}>Full Name *</Text>
          <TextInput
            style={styles.input}
            value={formData.name}
            onChangeText={(text) => updateFormData('name', text)}
            placeholder="Enter your full name"
            placeholderTextColor={theme.colors.textSecondary}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Email Address *</Text>
          <TextInput
            style={[styles.input, styles.inputDisabled]}
            value={formData.email}
            editable={false}
            placeholderTextColor={theme.colors.textSecondary}
          />
          <Text style={styles.helperText}>Email cannot be changed</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Phone Number *</Text>
          <TextInput
            style={styles.input}
            value={formData.phone}
            onChangeText={(text) => updateFormData('phone', text)}
            placeholder="e.g., 08012345678"
            placeholderTextColor={theme.colors.textSecondary}
            keyboardType="phone-pad"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Business Name *</Text>
          <TextInput
            style={styles.input}
            value={formData.businessName}
            onChangeText={(text) => updateFormData('businessName', text)}
            placeholder="Enter your business name"
            placeholderTextColor={theme.colors.textSecondary}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Business Address *</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={formData.businessAddress}
            onChangeText={(text) => updateFormData('businessAddress', text)}
            placeholder="Enter your business address"
            placeholderTextColor={theme.colors.textSecondary}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        <View style={styles.section}>
          <SelectField
            label="State *"
            placeholder="Select state..."
            value={formData.state}
            options={STATES}
            onSelect={(value) => updateFormData('state', value)}
          />
        </View>

        {/* Save Button */}
        <Button
          title={saving ? 'Saving...' : 'Save Profile Changes'}
          onPress={handleSave}
          disabled={saving || uploading}
          loading={saving || uploading}
          style={styles.saveButton}
        />

        {(uploading || saving) && (
          <View style={styles.uploadingContainer}>
            <ActivityIndicator size="small" color={theme.colors.accent} />
            <Text style={styles.uploadingText}>
              {uploading ? 'Uploading photo...' : 'Saving changes...'}
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );

  const renderLoading = () => (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => goBackOrNavigate(navigation)} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>EDIT PROFILE</Text>
        <View style={styles.headerRight} />
      </View>
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    </SafeAreaView>
  );

  if (loading) {
    return (
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
      >
        {renderLoading()}
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
    >
      {renderContent()}
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
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: theme.spacing.md,
  },
  photoSection: {
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  photoContainer: {
    position: 'relative',
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: theme.spacing.sm,
  },
  photo: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: theme.colors.beige,
  },
  photoPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: theme.colors.beige,
    justifyContent: 'center',
    alignItems: 'center',
  },
  changePhotoButton: {
    position: 'absolute',
    // Position calculated based on photoContainer (120x120) centered in photoSection
    // right: (screenWidth/2) + (photoSize/2) - buttonSize = centered + 60 - 40 = ~130
    // bottom: photoSize - buttonSize - offset = 120 - 40 - 50 = 30
    right: 130, // Approximate center of screen + half photo size - button size
    bottom: 30, // From bottom of photo container
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadows.medium,
  },
  photoLabel: {
    fontFamily: theme.typography.fontFamilyBody,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
  },
  infoCard: {
    backgroundColor: theme.colors.beige,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.xl,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  infoLabel: {
    fontFamily: theme.typography.fontFamilyBody,
    fontSize: theme.typography.sizes.base,
    color: theme.colors.textPrimary,
  },
  infoValue: {
    fontFamily: theme.typography.fontFamilyBody,
    fontSize: theme.typography.sizes.base,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  planBadge: {
    backgroundColor: theme.colors.accent,
    paddingHorizontal: theme.spacing.base,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.full,
  },
  planText: {
    fontFamily: theme.typography.fontFamilyBody,
    fontSize: theme.typography.sizes.sm,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  statusBadge: {
    paddingHorizontal: theme.spacing.base,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.full,
  },
  statusText: {
    fontFamily: theme.typography.fontFamilyBody,
    fontSize: theme.typography.sizes.sm,
    fontWeight: '600',
  },
  section: {
    marginBottom: theme.spacing.lg,
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
  inputDisabled: {
    backgroundColor: '#F5F5F5',
    color: theme.colors.textSecondary,
  },
  textArea: {
    height: 80,
    paddingTop: theme.spacing.base,
  },
  helperText: {
    fontFamily: theme.typography.fontFamilyBody,
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
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

export default EditProfileScreen;
