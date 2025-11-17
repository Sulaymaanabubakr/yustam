import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import theme from '../../theme';
import Toast from '../../components/Toast';
import { profileAPI } from '../../services/api';
import { goBackOrNavigate } from '../../utils/navigation';

const DEFAULT_SETTINGS = {
  pushNotifications: true,
  emailNotifications: true,
  smsNotifications: false,
  listingApprovals: true,
  newMessages: false,
  planExpiry: true,
  marketingEmails: true,
  twoFactorAuth: false,
  loginAlerts: true,
  publicProfile: true,
  showEmail: false,
  showPhone: false,
};

const SETTINGS_KEYS = Object.keys(DEFAULT_SETTINGS);

const COMING_SOON_MESSAGES = {
  smsNotifications: 'SMS notifications',
  twoFactorAuth: 'Two-factor authentication',
  loginAlerts: 'Login alerts',
};

const parseBoolean = (value, fallback) => {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'number') {
    return value === 1;
  }
  if (typeof value === 'string') {
    const lowered = value.trim().toLowerCase();
    if (['1', 'true', 'yes', 'on', 'enabled'].includes(lowered)) {
      return true;
    }
    if (['0', 'false', 'no', 'off', 'disabled'].includes(lowered)) {
      return false;
    }
  }
  return fallback;
};

const extractSettingsPayload = (payload = {}) =>
  payload?.settings ??
  payload?.data?.settings ??
  payload?.data?.data?.settings ??
  payload?.data ??
  null;

const mapServerSettingsToUI = (serverSettings = {}) =>
  SETTINGS_KEYS.reduce((acc, key) => {
    acc[key] = parseBoolean(serverSettings[key], DEFAULT_SETTINGS[key]);
    return acc;
  }, {});

const buildServerPayload = (state = {}) =>
  SETTINGS_KEYS.reduce((acc, key) => {
    acc[key] = Boolean(state[key]);
    return acc;
  }, {});

const SettingsScreen = ({ navigation }) => {
  const [toast, setToast] = useState({ visible: false, message: '', type: 'info' });
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingKeys, setSavingKeys] = useState({});

  const showToast = (message, type = 'success') => {
    setToast({ visible: true, message, type });
  };

  const hideToast = () => {
    setToast({ ...toast, visible: false });
  };

  const isToggleDisabled = (key) => loading || Boolean(savingKeys[key]);

  const fetchSettings = useCallback(
    async (silent = false) => {
      try {
        if (!silent) {
          setLoading(true);
        }
        const response = await profileAPI.getSettings();
        const payload = response?.data ?? {};
        if (payload?.success === false) {
          throw new Error(payload?.message || 'Unable to load settings.');
        }
        const serverSettings = extractSettingsPayload(payload);
        if (serverSettings) {
          setSettings(() => mapServerSettingsToUI(serverSettings));
        }
      } catch (error) {
        if (!silent) {
          showToast(error.message || 'Unable to load settings.', 'error');
        }
      } finally {
        if (!silent) {
          setLoading(false);
        }
      }
    },
    []
  );

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  useFocusEffect(
    useCallback(() => {
      fetchSettings(true);
    }, [fetchSettings])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchSettings(true);
    setRefreshing(false);
  }, [fetchSettings]);

  const handleToggle = async (key) => {
    if (COMING_SOON_MESSAGES[key]) {
      showToast(`${COMING_SOON_MESSAGES[key]} is coming soon.`, 'info');
      return;
    }
    let previousValue;
    let updatedSettings;

    setSettings((prev) => {
      previousValue = prev[key];
      updatedSettings = { ...prev, [key]: !prev[key] };
      return updatedSettings;
    });

    if (!updatedSettings) {
      return;
    }

    setSavingKeys((prev) => ({ ...prev, [key]: true }));

    try {
      const response = await profileAPI.updateSettings(buildServerPayload(updatedSettings));
      const payload = response?.data ?? {};
      if (payload?.success === false) {
        throw new Error(payload?.message || 'Unable to update settings.');
      }
      const serverSettings = extractSettingsPayload(payload);
      if (serverSettings) {
        setSettings(() => mapServerSettingsToUI(serverSettings));
      } else {
        await fetchSettings(true);
      }
      showToast('Settings updated');
    } catch (error) {
      setSettings((current) => ({ ...current, [key]: previousValue }));
      showToast(error.message || 'Failed to update settings.', 'error');
    } finally {
      setSavingKeys((prev) => ({ ...prev, [key]: false }));
    }
  };

  const handleChangePassword = () => {
    navigation.navigate('VendorChangePassword');
  };

  const SettingSection = ({ title, children }) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionContent}>{children}</View>
    </View>
  );

  const SettingItem = ({
    icon,
    label,
    value,
    onToggle,
    type = 'toggle',
    disabled = false,
    note,
    comingSoon = false,
  }) => (
    <View style={styles.settingItem}>
      <View style={styles.settingLeft}>
        <Ionicons name={icon} size={20} color={theme.colors.textSecondary} />
        <View style={styles.settingTextBlock}>
          <Text style={styles.settingLabel}>{label}</Text>
          {note ? <Text style={styles.settingNote}>{note}</Text> : null}
        </View>
      </View>
      {comingSoon ? (
        <Text style={styles.comingSoonText}>Coming soon</Text>
      ) : type === 'toggle' ? (
        <Switch
          value={Boolean(value)}
          onValueChange={onToggle}
          trackColor={{ false: theme.colors.border, true: theme.colors.orange }}
          thumbColor={theme.colors.white}
          disabled={disabled}
        />
      ) : (
        <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
      )}
    </View>
  );

  const ActionButton = ({ icon, label, onPress, color, variant = 'default', disabled = false }) => (
    <TouchableOpacity
      style={[
        styles.actionButton,
        variant === 'danger' && styles.dangerButton,
        disabled && styles.actionButtonDisabled,
      ]}
      onPress={onPress}
      activeOpacity={0.7}
      disabled={disabled}
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
        <TouchableOpacity onPress={() => goBackOrNavigate(navigation)} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.emerald} />
        </TouchableOpacity>
        <Text style={styles.title}>Settings</Text>
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
        {loading && (
          <View style={styles.loadingState}>
            <ActivityIndicator size="small" color={theme.colors.emerald} />
            <Text style={styles.loadingText}>Loading your preferences…</Text>
          </View>
        )}
        {/* Notifications Settings */}
        <SettingSection title="Notifications">
          <SettingItem
            icon="notifications-outline"
            label="Push Notifications"
            value={settings.pushNotifications}
            onToggle={() => handleToggle('pushNotifications')}
            disabled={isToggleDisabled('pushNotifications')}
          />
          <SettingItem
            icon="mail-outline"
            label="Email Notifications"
            value={settings.emailNotifications}
            onToggle={() => handleToggle('emailNotifications')}
            disabled={isToggleDisabled('emailNotifications')}
          />
          <SettingItem
            icon="chatbox-outline"
            label="SMS Notifications"
            value={settings.smsNotifications}
            onToggle={() => handleToggle('smsNotifications')}
            disabled
            comingSoon
            note="SMS alerts are in development"
          />
        </SettingSection>

        {/* Notification Preferences */}
        <SettingSection title="Notification Preferences">
          <SettingItem
            icon="checkmark-circle-outline"
            label="Listing Approvals"
            value={settings.listingApprovals}
            onToggle={() => handleToggle('listingApprovals')}
            disabled={isToggleDisabled('listingApprovals')}
          />
          <SettingItem
            icon="chatbubble-outline"
            label="New Messages"
            value={settings.newMessages}
            onToggle={() => handleToggle('newMessages')}
            disabled={isToggleDisabled('newMessages')}
          />
          <SettingItem
            icon="time-outline"
            label="Plan Expiry Alerts"
            value={settings.planExpiry}
            onToggle={() => handleToggle('planExpiry')}
            disabled={isToggleDisabled('planExpiry')}
          />
          <SettingItem
            icon="megaphone-outline"
            label="Marketing Emails"
            value={settings.marketingEmails}
            onToggle={() => handleToggle('marketingEmails')}
            disabled={isToggleDisabled('marketingEmails')}
          />
        </SettingSection>

        {/* Privacy & Security */}
        <SettingSection title="Privacy & Security">
          <SettingItem
            icon="shield-checkmark-outline"
            label="Two-Factor Authentication"
            value={settings.twoFactorAuth}
            onToggle={() => handleToggle('twoFactorAuth')}
            disabled
            comingSoon
            note="Protect your account with verification codes"
          />
          <SettingItem
            icon="alert-circle-outline"
            label="Login Alerts"
            value={settings.loginAlerts}
            onToggle={() => handleToggle('loginAlerts')}
            disabled
            comingSoon
            note="We'll notify you when we spot new sign-ins"
          />
          <SettingItem
            icon="globe-outline"
            label="Public Profile"
            value={settings.publicProfile}
            onToggle={() => handleToggle('publicProfile')}
            disabled={isToggleDisabled('publicProfile')}
          />
          <SettingItem
            icon="mail-open-outline"
            label="Show Email on Profile"
            value={settings.showEmail}
            onToggle={() => handleToggle('showEmail')}
            disabled={isToggleDisabled('showEmail')}
          />
          <SettingItem
            icon="call-outline"
            label="Show Phone on Profile"
            value={settings.showPhone}
            onToggle={() => handleToggle('showPhone')}
            disabled={isToggleDisabled('showPhone')}
          />
        </SettingSection>

        {/* Account Actions */}
        <SettingSection title="Account">
          <ActionButton
            icon="key-outline"
            label="Change Password"
            onPress={handleChangePassword}
          />
        </SettingSection>

        {/* Danger Zone */}
        <SettingSection title="Danger Zone">
          <ActionButton
            icon="warning-outline"
            label="Delete Account"
            onPress={() => navigation.navigate('VendorDeleteAccount')}
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
    alignItems: 'flex-start',
    gap: theme.spacing.base,
    flex: 1,
  },
  settingTextBlock: {
    flex: 1,
    gap: theme.spacing.xs / 2,
  },
  settingLabel: {
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textPrimary,
  },
  settingNote: {
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textSecondary,
  },
  comingSoonText: {
    fontFamily: theme.typography.fontFamily.interSemiBold,
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
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
  actionButtonDisabled: {
    opacity: 0.6,
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
  loadingState: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
  },
  loadingText: {
    marginLeft: theme.spacing.sm,
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
  },
});

export default SettingsScreen;
