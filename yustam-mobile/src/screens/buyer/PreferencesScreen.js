import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../context/AuthContext';
import theme from '../../theme';
import Input from '../../components/Input';
import Button from '../../components/Button';
import Toast from '../../components/Toast';
import { uploadImage } from '../../config/cloudinary';

const BuyerPreferencesScreen = ({ navigation }) => {
  const { user, updateUserProfile } = useAuth();
  const [form, setForm] = useState({
    fullName: user?.fullName || user?.displayName || '',
    phone: user?.phone || '',
    location: user?.location || '',
  });
  const [photo, setPhoto] = useState(user?.photoURL || '');
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });

  const showToast = (message, type = 'success') => {
    setToast({ visible: true, message, type });
  };

  const hideToast = () => setToast({ ...toast, visible: false });

  const handleChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateUserProfile({
        fullName: form.fullName.trim(),
        displayName: form.fullName.trim(),
        phone: form.phone.trim(),
        location: form.location.trim(),
        photoURL: photo || user?.photoURL || '',
      });
      showToast('Preferences updated');
      navigation.goBack();
    } catch (error) {
      showToast(error.message || 'Unable to update preferences', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handlePickPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permission.status !== 'granted') {
      Alert.alert('Permission Required', 'Please allow photo access to change your profile image.');
      return;
    }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaType.IMAGE,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled || !result.assets?.length) {
      return;
    }

    try {
      setUploadingPhoto(true);
      const asset = result.assets[0];
      const upload = await uploadImage(asset.uri, { folder: 'yustam/buyers' });
      setPhoto(upload.url);
      await updateUserProfile({ photoURL: upload.url });
      showToast('Profile photo updated');
    } catch (error) {
      console.error('Photo upload failed', error);
      showToast(error.message || 'Failed to update photo', 'error');
    } finally {
      setUploadingPhoto(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Toast visible={toast.visible} message={toast.message} type={toast.type} onDismiss={hideToast} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Preferences</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.photoCard}>
          <View style={styles.photoWrapper}>
            {photo ? (
              <Image source={{ uri: photo }} style={styles.photo} />
            ) : (
              <View style={styles.photoPlaceholder}>
                <Ionicons name="person" size={40} color={theme.colors.white} />
              </View>
            )}
          </View>
          <TouchableOpacity
            style={styles.photoButton}
            onPress={handlePickPhoto}
            activeOpacity={0.8}
            disabled={uploadingPhoto}
          >
            {uploadingPhoto ? (
              <ActivityIndicator size="small" color={theme.colors.white} />
            ) : (
              <>
                <Ionicons name="camera-outline" size={16} color={theme.colors.white} />
                <Text style={styles.photoButtonText}>Change Photo</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionLabel}>Personal</Text>
        <Input
          label="Full Name"
          value={form.fullName}
          onChangeText={(text) => handleChange('fullName', text)}
          placeholder="Enter your full name"
        />
        <Input
          label="Phone Number"
          value={form.phone}
          onChangeText={(text) => handleChange('phone', text)}
          placeholder="e.g. 0801 000 0000"
          keyboardType="phone-pad"
        />

        <Text style={styles.sectionLabel}>Location</Text>
        <Input
          label="City / State"
          value={form.location}
          onChangeText={(text) => handleChange('location', text)}
          placeholder="Where do you shop from?"
        />

        <Button
          onPress={handleSave}
          variant="primary"
          size="large"
          fullWidth
          loading={saving}
          disabled={saving}
        >
          Save Preferences
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.backgroundLight,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: theme.radius.full,
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
  content: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing['3xl'],
    gap: theme.spacing.md,
  },
  photoCard: {
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.lg,
  },
  photoWrapper: {
    width: 110,
    height: 110,
    borderRadius: 55,
    overflow: 'hidden',
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  photoPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: theme.colors.orange,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    backgroundColor: theme.colors.emerald,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.full,
  },
  photoButtonText: {
    fontFamily: theme.typography.fontFamily.interSemiBold,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.white,
  },
  sectionLabel: {
    fontFamily: theme.typography.fontFamily.interSemiBold,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: theme.spacing.lg,
  },
});

export default BuyerPreferencesScreen;
