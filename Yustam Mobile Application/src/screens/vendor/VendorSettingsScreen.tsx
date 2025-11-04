import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS, FONT_SIZES, SPACING, BORDER_RADIUS, SHADOWS } from '../../constants/theme';
import { logOut } from '../../services/firebase';
import { clearAllData } from '../../services/storage';

interface VendorSettingsScreenProps {
  onLogout: () => void;
}

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
        <TouchableOpacity style={styles.settingItem}>
          <Text style={styles.settingIcon}>🔔</Text>
          <Text style={styles.settingText}>Notifications</Text>
          <Text style={styles.arrow}>→</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.settingItem}>
          <Text style={styles.settingIcon}>🔒</Text>
          <Text style={styles.settingText}>Change Password</Text>
          <Text style={styles.arrow}>→</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.settingItem}>
          <Text style={styles.settingIcon}>📄</Text>
          <Text style={styles.settingText}>Terms & Conditions</Text>
          <Text style={styles.arrow}>→</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.settingItem}>
          <Text style={styles.settingIcon}>🔐</Text>
          <Text style={styles.settingText}>Privacy Policy</Text>
          <Text style={styles.arrow}>→</Text>
        </TouchableOpacity>
      </View>
      
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
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
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray200,
  },
  settingIcon: {
    fontSize: 24,
    marginRight: SPACING.md,
  },
  settingText: {
    flex: 1,
    fontSize: FONT_SIZES.md,
    color: COLORS.ink,
    fontWeight: '600',
  },
  arrow: {
    fontSize: FONT_SIZES.xl,
    color: COLORS.gray400,
  },
  logoutButton: {
    backgroundColor: COLORS.error,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginTop: SPACING.xl,
    alignItems: 'center',
    ...SHADOWS.medium,
  },
  logoutText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.white,
  },
});

export default VendorSettingsScreen;
