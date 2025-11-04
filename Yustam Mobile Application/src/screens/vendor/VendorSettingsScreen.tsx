import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { COLORS, FONT_SIZES, SPACING, BORDER_RADIUS, SHADOWS } from '../../constants/theme';
import { logOut } from '../../services/firebase';
import { clearAllData } from '../../services/storage';

interface VendorSettingsScreenProps {
  onLogout: () => void;
}

const SETTINGS_OPTIONS = [
  {
    id: 'notifications',
    label: 'Notifications',
    icon: 'notifications-outline' as const,
  },
  {
    id: 'password',
    label: 'Change Password',
    icon: 'key-outline' as const,
  },
  {
    id: 'terms',
    label: 'Terms & Conditions',
    icon: 'document-text-outline' as const,
  },
  {
    id: 'privacy',
    label: 'Privacy Policy',
    icon: 'shield-checkmark-outline' as const,
  },
];

const VendorSettingsScreen: React.FC<VendorSettingsScreenProps> = ({ onLogout }) => {
  const handleLogout = async () => {
    await logOut();
    await clearAllData();
    onLogout();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Settings</Text>

      <View style={styles.settingsGroup}>
        {SETTINGS_OPTIONS.map((option) => (
          <TouchableOpacity key={option.id} style={styles.settingItem}>
            <Ionicons name={option.icon} size={20} color={COLORS.emerald} />
            <Text style={styles.settingText}>{option.label}</Text>
            <Ionicons name="chevron-forward" size={18} color={COLORS.gray400} />
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={20} color={COLORS.white} />
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
    padding: SPACING.lg,
  },
  title: {
    fontSize: FONT_SIZES.xxxl,
    fontWeight: 'bold',
    color: COLORS.emerald,
    marginTop: SPACING.xxl,
    marginBottom: SPACING.xl,
  },
  settingsGroup: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    overflow: 'hidden',
    ...SHADOWS.small,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray200,
    gap: SPACING.md,
  },
  settingText: {
    flex: 1,
    fontSize: FONT_SIZES.md,
    color: COLORS.ink,
    fontWeight: '600',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.error,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginTop: SPACING.xl,
    ...SHADOWS.medium,
  },
  logoutText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.white,
  },
});

export default VendorSettingsScreen;
