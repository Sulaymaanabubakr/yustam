import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import theme from '../../theme';
import Toast from '../../components/Toast';
import Input from '../../components/Input';
import Button from '../../components/Button';
import { profileAPI } from '../../services/api';
import { goBackOrNavigate } from '../../utils/navigation';

const VendorChangePasswordScreen = ({ navigation }) => {
  const [form, setForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'info' });

  const handleChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) {
      setErrors((prev) => ({ ...prev, [key]: '' }));
    }
  };

  const validate = () => {
    const nextErrors = {};
    if (!form.currentPassword.trim()) {
      nextErrors.currentPassword = 'Current password is required';
    }
    if (!form.newPassword.trim()) {
      nextErrors.newPassword = 'New password is required';
    } else if (form.newPassword.trim().length < 6) {
      nextErrors.newPassword = 'Password must be at least 6 characters';
    }
    if (!form.confirmPassword.trim()) {
      nextErrors.confirmPassword = 'Please confirm your new password';
    } else if (form.newPassword.trim() !== form.confirmPassword.trim()) {
      nextErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const showToast = (message, type = 'success') => {
    setToast({ visible: true, message, type });
  };

  const hideToast = () => setToast({ ...toast, visible: false });

  const handleSubmit = async () => {
    if (!validate()) {
      return;
    }
    setLoading(true);
    try {
      const response = await profileAPI.updatePassword({
        current_password: form.currentPassword.trim(),
        new_password: form.newPassword.trim(),
        confirm_password: form.confirmPassword.trim(),
      });
      const payload = response?.data ?? {};
      showToast(payload?.message || 'Password updated successfully');
      navigation.goBack();
    } catch (error) {
      showToast(error.message || 'Unable to update password.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Toast visible={toast.visible} message={toast.message} type={toast.type} onDismiss={hideToast} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => goBackOrNavigate(navigation)} style={styles.backButton} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.emerald} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Change Password</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.helperText}>
          For your security, please enter your current password before setting a new one.
        </Text>

        <Input
          label="Current Password"
          placeholder="Enter current password"
          secureTextEntry
          value={form.currentPassword}
          onChangeText={(text) => handleChange('currentPassword', text)}
          error={errors.currentPassword}
        />

        <Input
          label="New Password"
          placeholder="Enter new password"
          secureTextEntry
          value={form.newPassword}
          onChangeText={(text) => handleChange('newPassword', text)}
          error={errors.newPassword}
        />

        <Input
          label="Confirm New Password"
          placeholder="Re-enter new password"
          secureTextEntry
          value={form.confirmPassword}
          onChangeText={(text) => handleChange('confirmPassword', text)}
          error={errors.confirmPassword}
        />

        <Button
          variant="primary"
          size="large"
          fullWidth
          onPress={handleSubmit}
          loading={loading}
          disabled={loading}
        >
          Update Password
        </Button>
      </ScrollView>
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
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backButton: {
    padding: theme.spacing.xs,
  },
  headerTitle: {
    fontFamily: theme.typography.fontFamily.anton,
    fontSize: theme.typography.fontSize['2xl'],
    color: theme.colors.emerald,
    letterSpacing: theme.typography.letterSpacing.wide,
  },
  headerSpacer: {
    width: 32,
  },
  content: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.xl,
    gap: theme.spacing.lg,
  },
  helperText: {
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    lineHeight: theme.typography.lineHeight.relaxed * theme.typography.fontSize.sm,
  },
});

export default VendorChangePasswordScreen;
