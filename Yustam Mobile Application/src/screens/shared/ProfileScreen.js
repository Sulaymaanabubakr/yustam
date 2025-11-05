import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import theme from '../../theme';
import Button from '../../components/Button';
import Toast from '../../components/Toast';

const ProfileScreen = ({ navigation }) => {
  const { user, role, logout, switchRole } = useAuth();
  const [toast, setToast] = useState({ visible: false, message: '', type: 'info' });

  const showToast = (message, type = 'success') => {
    setToast({ visible: true, message, type });
  };

  const hideToast = () => {
    setToast({ ...toast, visible: false });
  };

  const handleSwitchRole = () => {
    Alert.alert(
      'Switch Role',
      `Switch to ${role === 'buyer' ? 'Vendor' : 'Buyer'} mode?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Switch',
          onPress: async () => {
            try {
              const newRole = role === 'buyer' ? 'vendor' : 'buyer';
              await switchRole(newRole);
              showToast(`Switched to ${newRole} mode`);
            } catch (error) {
              showToast(error.message, 'error');
            }
          },
        },
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
              showToast('Logged out successfully');
              navigation.replace('Auth');
            } catch (error) {
              showToast(error.message, 'error');
            }
          },
        },
      ]
    );
  };

  const ProfileMenuItem = ({ icon, label, onPress, color, showBadge }) => (
    <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.menuItemLeft}>
        <Ionicons name={icon} size={24} color={color || theme.colors.textPrimary} />
        <Text style={[styles.menuItemText, color && { color }]}>{label}</Text>
      </View>
      {showBadge && (
        <View style={styles.roleBadge}>
          <Text style={styles.roleBadgeText}>{role}</Text>
        </View>
      )}
      <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onDismiss={hideToast}
      />

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            {user?.photoURL ? (
              <Image source={{ uri: user.photoURL }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="person" size={40} color={theme.colors.white} />
              </View>
            )}
          </View>
          
          <Text style={styles.userName}>{user?.displayName || user?.fullName || 'User'}</Text>
          <Text style={styles.userEmail}>{user?.email}</Text>
          
          <View style={styles.roleChip}>
            <Ionicons
              name={role === 'vendor' ? 'storefront' : 'bag-handle'}
              size={16}
              color={theme.colors.white}
            />
            <Text style={styles.roleChipText}>
              {role === 'vendor' ? 'Vendor' : 'Buyer'}
            </Text>
          </View>
        </View>

        {/* Menu Items */}
        <View style={styles.menuSection}>
          <ProfileMenuItem
            icon="create-outline"
            label="Edit Profile"
            onPress={() => navigation.navigate('EditProfile')}
          />
          
          {role === 'vendor' && (
            <>
              <ProfileMenuItem
                icon="grid-outline"
                label="Vendor Dashboard"
                onPress={() => navigation.navigate('VendorDashboard')}
              />
              <ProfileMenuItem
                icon="bar-chart-outline"
                label="Analytics & Insights"
                onPress={() => navigation.navigate('Analytics')}
              />
              <ProfileMenuItem
                icon="list-outline"
                label="My Listings"
                onPress={() => navigation.navigate('VendorListings')}
              />
              <ProfileMenuItem
                icon="receipt-outline"
                label="Billing History"
                onPress={() => navigation.navigate('BillingHistory')}
              />
              <ProfileMenuItem
                icon="card-outline"
                label="Plans & Billing"
                onPress={() => showToast('Opening Plans...', 'info')}
              />
              <ProfileMenuItem
                icon="storefront-outline"
                label="My Storefront"
                onPress={() => navigation.navigate('Storefront')}
              />
              <ProfileMenuItem
                icon="shield-checkmark-outline"
                label="Verification"
                onPress={() => showToast('Opening Verification...', 'info')}
              />
            </>
          )}

          {role === 'buyer' && (
            <ProfileMenuItem
              icon="heart-outline"
              label="Saved Items"
              onPress={() => {}}
            />
          )}

          <ProfileMenuItem
            icon="swap-horizontal-outline"
            label="Switch Role"
            onPress={handleSwitchRole}
            showBadge
          />
        </View>

        {/* Settings Section */}
        <View style={styles.menuSection}>
          <Text style={styles.sectionTitle}>Settings</Text>
          
          <ProfileMenuItem
            icon="settings-outline"
            label="App Settings"
            onPress={() => navigation.navigate('Settings')}
          />
          
          <ProfileMenuItem
            icon="lock-closed-outline"
            label="Change Password"
            onPress={() => showToast('Opening Change Password...', 'info')}
          />
          
          <ProfileMenuItem
            icon="notifications-outline"
            label="Notifications"
            onPress={() => navigation.navigate('VendorNotifications')}
          />
          
          <ProfileMenuItem
            icon="language-outline"
            label="Language"
            onPress={() => showToast('Language selection coming soon...', 'info')}
          />
        </View>

        {/* Support Section */}
        <View style={styles.menuSection}>
          <Text style={styles.sectionTitle}>Support</Text>
          
          <ProfileMenuItem
            icon="help-circle-outline"
            label="Help & Support"
            onPress={() => navigation.navigate('HelpSupport')}
          />
          
          <ProfileMenuItem
            icon="shield-outline"
            label="Privacy Policy"
            onPress={() => showToast('Opening Privacy Policy...', 'info')}
          />
          
          <ProfileMenuItem
            icon="document-text-outline"
            label="Terms & Conditions"
            onPress={() => showToast('Opening Terms...', 'info')}
          />
        </View>

        {/* Logout Button */}
        <View style={styles.logoutSection}>
          <Button
            onPress={handleLogout}
            variant="outline"
            size="large"
            fullWidth
            icon="log-out-outline"
          >
            Logout
          </Button>
        </View>

        <Text style={styles.version}>Version 1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.white,
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: theme.spacing['2xl'],
    paddingHorizontal: theme.spacing.lg,
    backgroundColor: theme.colors.beige,
    gap: theme.spacing.md,
  },
  avatarContainer: {
    marginBottom: theme.spacing.sm,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: theme.colors.orange,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userName: {
    fontFamily: theme.typography.fontFamily.anton,
    fontSize: theme.typography.fontSize['2xl'],
    color: theme.colors.emerald,
    letterSpacing: theme.typography.letterSpacing.wide,
  },
  userEmail: {
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textSecondary,
  },
  roleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.orange,
    borderRadius: theme.radius.full,
  },
  roleChipText: {
    fontFamily: theme.typography.fontFamily.interSemiBold,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.white,
  },
  menuSection: {
    paddingVertical: theme.spacing.lg,
    gap: theme.spacing.xs,
  },
  sectionTitle: {
    fontFamily: theme.typography.fontFamily.interSemiBold,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.base,
    paddingHorizontal: theme.spacing.lg,
    backgroundColor: theme.colors.white,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.base,
    flex: 1,
  },
  menuItemText: {
    fontFamily: theme.typography.fontFamily.interMedium,
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textPrimary,
  },
  roleBadge: {
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    backgroundColor: theme.colors.emerald,
    borderRadius: theme.radius.sm,
  },
  roleBadgeText: {
    fontFamily: theme.typography.fontFamily.interSemiBold,
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.white,
    textTransform: 'capitalize',
  },
  logoutSection: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.xl,
  },
  version: {
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textTertiary,
    textAlign: 'center',
    paddingBottom: theme.spacing.xl,
  },
});

export default ProfileScreen;
