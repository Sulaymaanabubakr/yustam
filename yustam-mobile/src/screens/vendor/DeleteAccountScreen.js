import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import theme from '../../theme';
import Input from '../../components/Input';
import Button from '../../components/Button';
import Toast from '../../components/Toast';
import { profileAPI } from '../../services/api';
import { goBackOrNavigate } from '../../utils/navigation';

const VendorDeleteAccountScreen = ({ navigation }) => {
  const { logout } = useAuth();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'info' });

  const showToast = (message, type = 'success') => {
    setToast({ visible: true, message, type });
  };

  const hideToast = () => setToast({ ...toast, visible: false });

  const handleDelete = () => {
    if (!password.trim()) {
      showToast('Please enter your password to confirm.', 'error');
      return;
    }

    Alert.alert(
      'Delete Account',
      'This will permanently remove your vendor account, listings, messages and storefront. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: submitDeletion,
        },
      ],
    );
  };

  const submitDeletion = async () => {
    setLoading(true);
    try {
      const response = await profileAPI.deleteAccount({ password: password.trim() });
      const payload = response?.data ?? {};
      showToast(payload?.message || 'Your account has been deleted.', 'success');
      try {
        await logout();
      } catch (logoutError) {
        console.warn('Logout after deletion failed', logoutError);
      }
      setTimeout(() => {
        navigation.reset({ index: 0, routes: [{ name: 'Auth' }] });
      }, 600);
    } catch (error) {
      showToast(error.message || 'Unable to delete account. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Toast visible={toast.visible} message={toast.message} type={toast.type} onDismiss={hideToast} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => goBackOrNavigate(navigation)} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.emerald} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Delete Account</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.warningCard}>
          <Ionicons name="warning-outline" size={32} color="#D93025" />
          <Text style={styles.warningTitle}>This action is permanent</Text>
          <Text style={styles.warningText}>
            Deleting your account will remove your listings, chats, storefront, analytics and plan data. This cannot be
            undone.
          </Text>
        </View>

        <Input
          label="Confirm Password"
          placeholder="Enter your account password"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          autoCapitalize="none"
        />

        <Button
          variant="outline"
          size="large"
          fullWidth
          icon="trash-outline"
          onPress={handleDelete}
          loading={loading}
          disabled={loading}
          style={styles.deleteButton}
          textStyle={styles.deleteButtonText}
        >
          Permanently Delete Account
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
  warningCard: {
    backgroundColor: '#FDECEA',
    borderRadius: theme.radius['2xl'],
    padding: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  warningTitle: {
    fontFamily: theme.typography.fontFamily.interSemiBold,
    fontSize: theme.typography.fontSize.base,
    color: '#D93025',
  },
  warningText: {
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    lineHeight: theme.typography.lineHeight.relaxed * theme.typography.fontSize.sm,
  },
  deleteButton: {
    borderColor: '#D93025',
  },
  deleteButtonText: {
    color: '#D93025',
  },
});

export default VendorDeleteAccountScreen;
