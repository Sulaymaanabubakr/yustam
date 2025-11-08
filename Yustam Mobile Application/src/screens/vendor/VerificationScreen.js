import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { useAuth } from '../../context/AuthContext';
import theme from '../../theme';
import Toast from '../../components/Toast';
import Button from '../../components/Button';
import { uploadImage } from '../../config/cloudinary';
import { vendorAPI } from '../../services/api';

const DOCUMENT_TYPES = [
  {
    key: 'cac',
    label: 'CAC Certificate',
    description: 'Business registration document',
    icon: 'document-text-outline',
    required: true,
  },
  {
    key: 'id_front',
    label: 'ID Card (Front)',
    description: 'National ID, Driver\'s License, or Passport',
    icon: 'card-outline',
    required: true,
  },
  {
    key: 'id_back',
    label: 'ID Card (Back)',
    description: 'Back side of your ID',
    icon: 'card-outline',
    required: true,
  },
  {
    key: 'address_proof',
    label: 'Proof of Address',
    description: 'Utility bill or bank statement',
    icon: 'location-outline',
    required: true,
  },
  {
    key: 'business_logo',
    label: 'Business Logo',
    description: 'Optional: Your brand logo',
    icon: 'image-outline',
    required: false,
  },
];

const STATUS_CONFIG = {
  not_submitted: {
    label: 'Not Submitted',
    color: theme.colors.textSecondary,
    icon: 'help-circle-outline',
    description: 'Submit your documents to get verified',
  },
  pending: {
    label: 'Pending Review',
    color: theme.colors.warning,
    icon: 'time-outline',
    description: 'Your documents are being reviewed by our team',
  },
  verified: {
    label: 'Verified',
    color: theme.colors.success,
    icon: 'checkmark-circle-outline',
    description: 'You are verified! Enjoy enhanced credibility',
  },
  rejected: {
    label: 'Rejected',
    color: theme.colors.error,
    icon: 'close-circle-outline',
    description: 'Some documents need to be resubmitted',
  },
};

const VerificationScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState('not_submitted');
  const [documents, setDocuments] = useState({});
  const [rejectionReason, setRejectionReason] = useState('');
  const [toast, setToast] = useState({ visible: false, message: '', type: 'info' });

  useEffect(() => {
    loadVerificationStatus();
  }, []);

  const loadVerificationStatus = async () => {
    try {
      setLoading(true);
      const response = await vendorAPI.getVerificationStatus();
      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Unable to load verification status.');
      }

      const data = response.data?.data || {};
      const normalizedStatus = (data.status || 'not_submitted').toLowerCase();
      setStatus(normalizedStatus);
      setRejectionReason(data.feedback || '');
    } catch (error) {
      console.error('Error loading verification status:', error);
      showToast('Failed to load verification status', 'error');
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

  const requestPermissions = async () => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow access to your photo library to upload documents.');
        return false;
      }
    }
    return true;
  };

  const pickDocument = async (docType) => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    Alert.alert(
      'Select Document',
      'Choose how you want to upload your document',
      [
        {
          text: 'Take Photo',
          onPress: () => takePhoto(docType),
        },
        {
          text: 'Choose from Gallery',
          onPress: () => pickFromGallery(docType),
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  const takePhoto = async (docType) => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow access to your camera.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        aspect: [4, 3],
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setDocuments(prev => ({
          ...prev,
          [docType]: { uri: asset.uri, uploaded: false },
        }));
        showToast('Document captured. Remember to submit for verification.');
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      showToast('Failed to take photo', 'error');
    }
  };

  const pickFromGallery = async (docType) => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        aspect: [4, 3],
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setDocuments(prev => ({
          ...prev,
          [docType]: { uri: asset.uri, uploaded: false },
        }));
        showToast('Document selected. Remember to submit for verification.');
      }
    } catch (error) {
      console.error('Error picking document:', error);
      showToast('Failed to select document', 'error');
    }
  };

  const removeDocument = (docType) => {
    Alert.alert(
      'Remove Document',
      'Are you sure you want to remove this document?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            setDocuments(prev => {
              const updated = { ...prev };
              delete updated[docType];
              return updated;
            });
          },
        },
      ]
    );
  };

  const uploadDocuments = async () => {
    const documentsToUpload = Object.entries(documents).filter(([_, doc]) => !doc.uploaded);
    if (documentsToUpload.length === 0) {
      return documents;
    }

    setUploading(true);
    const uploadedDocs = { ...documents };

    try {
      for (const [key, doc] of documentsToUpload) {
        const result = await uploadImage(doc.uri, {
          folder: `vendors/${user?.uid || 'vendor'}/verification`,
        });
        uploadedDocs[key] = { uri: result.url, uploaded: true };
      }
      setUploading(false);
      return uploadedDocs;
    } catch (error) {
      console.error('Error uploading documents:', error);
      setUploading(false);
      throw error;
    }
  };

  const handleSubmit = async () => {
    // Validate required documents
    const missingDocs = DOCUMENT_TYPES
      .filter(doc => doc.required && !documents[doc.key])
      .map(doc => doc.label);

    if (missingDocs.length > 0) {
      showToast(`Missing required documents: ${missingDocs.join(', ')}`, 'error');
      return;
    }

    try {
      setSubmitting(true);

      // Upload documents to Cloudinary
      const uploadedDocs = await uploadDocuments();
      setDocuments(uploadedDocs);

      const documentPayload = Object.entries(uploadedDocs).reduce((acc, [key, doc]) => {
        acc[key] = doc.uri;
        return acc;
      }, {});

      const response = await vendorAPI.submitVerification({
        action: 'submit',
        documents: JSON.stringify(documentPayload),
      });

      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Failed to submit verification');
      }

      const nextStatus = response.data?.data?.status || 'pending';
      setStatus(nextStatus);
      setRejectionReason('');
      showToast(
        response.data?.message || 'Verification submitted successfully! We\'ll review your documents shortly.'
      );
      await loadVerificationStatus();
    } catch (error) {
      console.error('Error submitting verification:', error);
      showToast(error.message || 'Failed to submit verification', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const statusConfig = STATUS_CONFIG[status] || STATUS_CONFIG.not_submitted;

  const DocumentItem = ({ docType }) => {
    const doc = documents[docType.key];

    return (
      <View style={styles.documentItem}>
        <View style={styles.documentHeader}>
          <View style={styles.documentIcon}>
            <Ionicons name={docType.icon} size={24} color={theme.colors.primary} />
          </View>
          <View style={styles.documentInfo}>
            <Text style={styles.documentLabel}>
              {docType.label}
              {docType.required && <Text style={styles.required}> *</Text>}
            </Text>
            <Text style={styles.documentDescription}>{docType.description}</Text>
          </View>
        </View>

        {doc ? (
          <View style={styles.documentPreview}>
            <Image source={{ uri: doc.uri }} style={styles.previewImage} resizeMode="cover" />
            <TouchableOpacity
              style={styles.removeButton}
              onPress={() => removeDocument(docType.key)}
            >
              <Ionicons name="close-circle" size={24} color={theme.colors.error} />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.uploadButton}
            onPress={() => pickDocument(docType.key)}
            disabled={status === 'pending' || status === 'verified'}
          >
            <Ionicons name="cloud-upload-outline" size={24} color={theme.colors.accent} />
            <Text style={styles.uploadButtonText}>Upload Document</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>VERIFICATION</Text>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading verification status...</Text>
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
        onDismiss={hideToast}
      />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>VERIFICATION</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Status Card */}
        <View style={[styles.statusCard, { borderLeftColor: statusConfig.color }]}>
          <View style={[styles.statusIcon, { backgroundColor: `${statusConfig.color}20` }]}>
            <Ionicons name={statusConfig.icon} size={32} color={statusConfig.color} />
          </View>
          <View style={styles.statusContent}>
            <Text style={[styles.statusLabel, { color: statusConfig.color }]}>
              {statusConfig.label}
            </Text>
            <Text style={styles.statusDescription}>{statusConfig.description}</Text>
            {status === 'rejected' && rejectionReason && (
              <Text style={styles.rejectionReason}>Reason: {rejectionReason}</Text>
            )}
          </View>
        </View>

        {/* Benefits Section */}
        {status !== 'verified' && (
          <View style={styles.benefitsSection}>
            <Text style={styles.benefitsTitle}>Why Get Verified?</Text>
            <View style={styles.benefitRow}>
              <Ionicons name="checkmark-circle" size={20} color={theme.colors.success} />
              <Text style={styles.benefitText}>Build trust with buyers</Text>
            </View>
            <View style={styles.benefitRow}>
              <Ionicons name="checkmark-circle" size={20} color={theme.colors.success} />
              <Text style={styles.benefitText}>Increase listing visibility</Text>
            </View>
            <View style={styles.benefitRow}>
              <Ionicons name="checkmark-circle" size={20} color={theme.colors.success} />
              <Text style={styles.benefitText}>Access premium features</Text>
            </View>
          </View>
        )}

        {/* Documents Section */}
        {(status === 'not_submitted' || status === 'rejected') && (
          <>
            <Text style={styles.sectionTitle}>Required Documents</Text>
            {DOCUMENT_TYPES.map(docType => (
              <DocumentItem key={docType.key} docType={docType} />
            ))}

            {/* Submit Button */}
            <Button
              title={submitting ? 'Submitting...' : 'Submit for Verification'}
              onPress={handleSubmit}
              disabled={submitting || uploading}
              loading={submitting || uploading}
              style={styles.submitButton}
            />

            {(uploading || submitting) && (
              <View style={styles.uploadingContainer}>
                <ActivityIndicator size="small" color={theme.colors.accent} />
                <Text style={styles.uploadingText}>
                  {uploading ? 'Uploading documents...' : 'Submitting verification...'}
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
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
  statusCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.xl,
    ...theme.shadows.medium,
    borderLeftWidth: 4,
  },
  statusIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.base,
  },
  statusContent: {
    flex: 1,
  },
  statusLabel: {
    fontFamily: theme.typography.fontFamilyBody,
    fontSize: theme.typography.sizes.lg,
    fontWeight: '700',
    marginBottom: theme.spacing.xs,
  },
  statusDescription: {
    fontFamily: theme.typography.fontFamilyBody,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  rejectionReason: {
    marginTop: theme.spacing.sm,
    fontFamily: theme.typography.fontFamilyBody,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.error,
    fontStyle: 'italic',
  },
  benefitsSection: {
    backgroundColor: theme.colors.beige,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.xl,
  },
  benefitsTitle: {
    fontFamily: theme.typography.fontFamilyBody,
    fontSize: theme.typography.sizes.base,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
    gap: theme.spacing.sm,
  },
  benefitText: {
    fontFamily: theme.typography.fontFamilyBody,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textPrimary,
  },
  sectionTitle: {
    fontFamily: theme.typography.fontFamilyBody,
    fontSize: theme.typography.sizes.lg,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.md,
  },
  documentItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    ...theme.shadows.small,
  },
  documentHeader: {
    flexDirection: 'row',
    marginBottom: theme.spacing.base,
  },
  documentIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${theme.colors.primary}10`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.base,
  },
  documentInfo: {
    flex: 1,
  },
  documentLabel: {
    fontFamily: theme.typography.fontFamilyBody,
    fontSize: theme.typography.sizes.base,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  required: {
    color: theme.colors.error,
  },
  documentDescription: {
    fontFamily: theme.typography.fontFamilyBody,
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textSecondary,
  },
  documentPreview: {
    position: 'relative',
  },
  previewImage: {
    width: '100%',
    height: 150,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.beige,
  },
  removeButton: {
    position: 'absolute',
    top: theme.spacing.xs,
    right: theme.spacing.xs,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${theme.colors.accent}10`,
    borderWidth: 2,
    borderColor: theme.colors.accent,
    borderStyle: 'dashed',
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  uploadButtonText: {
    fontFamily: theme.typography.fontFamilyBody,
    fontSize: theme.typography.sizes.base,
    fontWeight: '600',
    color: theme.colors.accent,
  },
  submitButton: {
    marginTop: theme.spacing.xl,
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

export default VerificationScreen;
