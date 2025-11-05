import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import theme from '../../theme';
import Toast from '../../components/Toast';

const SettingsScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [toast, setToast] = useState({ visible: false, message: '', type: 'info' });
  const [settings, setSettings] = useState({
    pushNotifications: true,
    emailNotifications: true,
    smsNotifications: false,
    listingApprovals: true,
    newMessages: true,
    planExpiry: true,
    marketingEmails: false,
    twoFactorAuth: false,
    publicProfile: true,
    showEmail: false,
    showPhone: false,
  });

  const showToast = (message, type = 'success') => {
    setToast({ visible: true, message, type });
  };

  const hideToast = () => {
    setToast({ ...toast, visible: false });
  };

  const handleToggle = async (key) => {
    setSettings({ ...settings, [key]: !settings[key] });
    
    // TODO: Save settings to backend
    // await saveSettings({ [key]: !settings[key] });
    
    showToast('Settings updated');
  };

  const handleChangePassword = () => {
    // TODO: Navigate to change password screen or show modal
    showToast('Opening change password...', 'info');
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action cannot be undone and all your data will be permanently removed.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: () => {
            // TODO: Implement account deletion
            showToast('Account deletion initiated', 'error');
          },
        },
      ]
    );
  };

  const handleClearCache = () => {
    Alert.alert(
      'Clear Cache',
      'This will clear all cached data and temporary files. Continue?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Clear',
          onPress: () => {
            // TODO: Clear cache logic
            showToast('Cache cleared successfully');
          },
        },
      ]
    );
  };

  const SettingSection = ({ title, children }) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionContent}>{children}</View>
    </View>
  );

  const SettingItem = ({ icon, label, value, onToggle, type = 'toggle' }) => (
    <View style={styles.settingItem}>
      <View style={styles.settingLeft}>
        <Ionicons name={icon} size={20} color={theme.colors.textSecondary} />
        <Text style={styles.settingLabel}>{label}</Text>
      </View>
      {type === 'toggle' ? (
        <Switch
          value={value}
          onValueChange={onToggle}
          trackColor={{ false: theme.colors.border, true: theme.colors.orange }}
          thumbColor={theme.colors.white}
        />
      ) : (
        <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
      )}
    </View>
  );

  const ActionButton = ({ icon, label, onPress, color, variant = 'default' }) => (
    <TouchableOpacity
      style={[
        styles.actionButton,
        variant === 'danger' && styles.dangerButton,
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Ionicons name={icon} size={20} color={color || theme.colors.textPrimary} />
      <Text style={[styles.actionButtonText, color && { color }]}>
        {label}
      </Text>
      <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={hideToast}
      />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.emerald} />
        </TouchableOpacity>
        <Text style={styles.title}>Settings</Text>
      </View>

      <ScrollView style={styles.content}>
        {/* Notifications Settings */}
        <SettingSection title="Notifications">
          <SettingItem
            icon="notifications-outline"
            label="Push Notifications"
            value={settings.pushNotifications}
            onToggle={() => handleToggle('pushNotifications')}
          />
          <SettingItem
            icon="mail-outline"
            label="Email Notifications"
            value={settings.emailNotifications}
            onToggle={() => handleToggle('emailNotifications')}
          />
          <SettingItem
            icon="chatbox-outline"
            label="SMS Notifications"
            value={settings.smsNotifications}
            onToggle={() => handleToggle('smsNotifications')}
          />
        </SettingSection>

        {/* Notification Preferences */}
        <SettingSection title="Notification Preferences">
          <SettingItem
            icon="checkmark-circle-outline"
            label="Listing Approvals"
            value={settings.listingApprovals}
            onToggle={() => handleToggle('listingApprovals')}
          />
          <SettingItem
            icon="chatbubble-outline"
            label="New Messages"
            value={settings.newMessages}
            onToggle={() => handleToggle('newMessages')}
          />
          <SettingItem
            icon="time-outline"
            label="Plan Expiry Alerts"
            value={settings.planExpiry}
            onToggle={() => handleToggle('planExpiry')}
          />
          <SettingItem
            icon="megaphone-outline"
            label="Marketing Emails"
            value={settings.marketingEmails}
            onToggle={() => handleToggle('marketingEmails')}
          />
        </SettingSection>

        {/* Privacy & Security */}
        <SettingSection title="Privacy & Security">
          <SettingItem
            icon="shield-checkmark-outline"
            label="Two-Factor Authentication"
            value={settings.twoFactorAuth}
            onToggle={() => handleToggle('twoFactorAuth')}
          />
          <SettingItem
            icon="globe-outline"
            label="Public Profile"
            value={settings.publicProfile}
            onToggle={() => handleToggle('publicProfile')}
          />
          <SettingItem
            icon="mail-open-outline"
            label="Show Email on Profile"
            value={settings.showEmail}
            onToggle={() => handleToggle('showEmail')}
          />
          <SettingItem
            icon="call-outline"
            label="Show Phone on Profile"
            value={settings.showPhone}
            onToggle={() => handleToggle('showPhone')}
          />
        </SettingSection>

        {/* Account Actions */}
        <SettingSection title="Account">
          <ActionButton
            icon="key-outline"
            label="Change Password"
            onPress={handleChangePassword}
          />
          <ActionButton
            icon="trash-outline"
            label="Clear Cache"
            onPress={handleClearCache}
          />
        </SettingSection>

        {/* Danger Zone */}
        <SettingSection title="Danger Zone">
          <ActionButton
            icon="warning-outline"
            label="Delete Account"
            onPress={handleDeleteAccount}
            color="#D93025"
            variant="danger"
          />
        </SettingSection>

        {/* App Info */}
        <View style={styles.appInfo}>
          <Text style={styles.appInfoText}>YUSTAM Marketplace</Text>
          <Text style={styles.appInfoText}>Version 1.0.0</Text>
          <Text style={styles.appInfoSubtext}>© 2025 YUSTAM. All rights reserved.</Text>
        </View>

        <View style={styles.bottomPadding} />
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
    fontFamily: theme.typography.fontFamily.anton,
    fontSize: theme.typography.fontSize['2xl'],
    color: theme.colors.emerald,
    letterSpacing: theme.typography.letterSpacing.wide,
  },
  content: {
    flex: 1,
  },
  section: {
    paddingTop: theme.spacing.xl,
  },
  sectionTitle: {
    fontFamily: theme.typography.fontFamily.anton,
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.emerald,
    letterSpacing: theme.typography.letterSpacing.wide,
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
    textTransform: 'uppercase',
  },
  sectionContent: {
    backgroundColor: theme.colors.white,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: theme.colors.border,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.base,
    flex: 1,
  },
  settingLabel: {
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textPrimary,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.base,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  dangerButton: {
    backgroundColor: '#FFF5F5',
  },
  actionButtonText: {
    flex: 1,
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textPrimary,
  },
  appInfo: {
    alignItems: 'center',
    paddingVertical: theme.spacing['2xl'],
    gap: theme.spacing.xs,
  },
  appInfoText: {
    fontFamily: theme.typography.fontFamily.interMedium,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  appInfoSubtext: {
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textTertiary,
    marginTop: theme.spacing.sm,
  },
  bottomPadding: {
    height: theme.spacing['2xl'],
  },
});

export default SettingsScreen;
