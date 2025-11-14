import React, { useEffect, useMemo, useState } from 'react';
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
import { vendorAPI } from '../../services/api';

const VendorProfileScreen = ({ navigation }) => {
  const { user, logout } = useAuth();
  const [toast, setToast] = useState({ visible: false, message: '', type: 'info' });
  const [planSummary, setPlanSummary] = useState(null);

  useEffect(() => {
    let isMounted = true;
    vendorAPI
      .getPlans()
      .then((response) => {
        if (!isMounted) {
          return;
        }
        const summary = response.data?.data?.currentPlan;
        if (summary) {
          setPlanSummary(summary);
        }
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  const planLabel = useMemo(
    () => planSummary?.displayName || user?.planLabel || 'Free Plan',
    [planSummary?.displayName, user?.planLabel]
  );

  const showToast = (message, type = 'success') => {
    setToast({ visible: true, message, type });
  };

  const hideToast = () => {
    setToast({ ...toast, visible: false });
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
              showToast('Logged out successfully');
            } catch (error) {
              showToast(error.message, 'error');
            }
          },
        },
      ]
    );
  };

  const ProfileMenuItem = ({ icon, label, onPress, badge }) => (
    <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.75}>
      <View style={styles.menuItemLeft}>
        <Ionicons name={icon} size={22} color={theme.colors.textPrimary} />
        <Text style={styles.menuItemText}>{label}</Text>
      </View>
      {badge ? (
        <View style={styles.menuBadge}>
          <Text style={styles.menuBadgeText}>{badge}</Text>
        </View>
      ) : null}
      <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Toast visible={toast.visible} message={toast.message} type={toast.type} onDismiss={hideToast} />
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            {user?.photoURL ? (
              <Image source={{ uri: user.photoURL }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="storefront" size={42} color={theme.colors.white} />
              </View>
            )}
          </View>
          <Text style={styles.userName}>{user?.businessName || user?.displayName || 'Marketplace Vendor'}</Text>
          <Text style={styles.userEmail}>{user?.email}</Text>
          <View style={styles.badgeRow}>
            <View style={styles.badgePill}>
              <Ionicons name="shield-checkmark" size={14} color={theme.colors.white} />
              <Text style={styles.badgeText}>Vendor</Text>
            </View>
            <View style={[styles.badgePill, styles.planPill]}>
              <Ionicons name="trophy-outline" size={14} color={theme.colors.orange} />
              <Text style={[styles.badgeText, { color: theme.colors.orange }]}>{planLabel}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Business</Text>
          <ProfileMenuItem
            icon="grid-outline"
            label="Dashboard"
            onPress={() => navigation.navigate('VendorDashboard')}
          />
          <ProfileMenuItem
            icon="albums-outline"
            label="Listings"
            onPress={() => navigation.navigate('VendorListings')}
          />
          <ProfileMenuItem
            icon="chatbubbles-outline"
            label="Chats"
            onPress={() => navigation.navigate('VendorChats')}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Growth</Text>
          <ProfileMenuItem
            icon="bar-chart-outline"
            label="Analytics & Insights"
            onPress={() => navigation.navigate('Analytics')}
          />
          <ProfileMenuItem
            icon="briefcase-outline"
            label="Plans & Billing"
            badge="Manage"
            onPress={() => navigation.navigate('Plans')}
          />
          <ProfileMenuItem
            icon="refresh-outline"
            label="Renew Subscription"
            onPress={() => navigation.navigate('VendorRenewPlan')}
          />
          <ProfileMenuItem
            icon="calendar-outline"
            label="Manage Subscription"
            onPress={() => navigation.navigate('VendorManageSubscription')}
          />
          <ProfileMenuItem
            icon="document-text-outline"
            label="Verification"
            onPress={() => navigation.navigate('Verification')}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <ProfileMenuItem
            icon="create-outline"
            label="Edit Profile"
            onPress={() => navigation.navigate('EditProfile')}
          />
          <ProfileMenuItem
            icon="settings-outline"
            label="Vendor Settings"
            onPress={() => navigation.navigate('Settings')}
          />
          <ProfileMenuItem
            icon="help-circle-outline"
            label="Help & Support"
            onPress={() => navigation.navigate('HelpSupport')}
          />
          <ProfileMenuItem
            icon="warning-outline"
            label="Delete Account"
            color="#D93025"
            onPress={() => navigation.navigate('VendorDeleteAccount')}
          />
        </View>

        <View style={styles.logoutSection}>
          <Button onPress={handleLogout} variant="outline" size="large" fullWidth icon="log-out-outline">
            Logout
          </Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.backgroundLight,
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: theme.spacing['2xl'],
    paddingHorizontal: theme.spacing.lg,
    backgroundColor: theme.colors.white,
    ...theme.shadows.card,
    borderBottomLeftRadius: theme.radius['3xl'],
    borderBottomRightRadius: theme.radius['3xl'],
    gap: theme.spacing.sm,
  },
  avatarContainer: {
    marginBottom: theme.spacing.sm,
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
  },
  avatarPlaceholder: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: theme.colors.emerald,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userName: {
    fontFamily: theme.typography.fontFamily.anton,
    fontSize: theme.typography.fontSize['2xl'],
    color: theme.colors.textPrimary,
    letterSpacing: theme.typography.letterSpacing.wide,
    textAlign: 'center',
  },
  userEmail: {
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    backgroundColor: theme.colors.emerald,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radius.full,
  },
  planPill: {
    backgroundColor: `${theme.colors.orange}20`,
  },
  badgeText: {
    fontFamily: theme.typography.fontFamily.interSemiBold,
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.white,
  },
  section: {
    marginTop: theme.spacing['2xl'],
    paddingHorizontal: theme.spacing.lg,
    gap: theme.spacing.xs,
  },
  sectionTitle: {
    fontFamily: theme.typography.fontFamily.interSemiBold,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: theme.spacing.xs,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.base,
    backgroundColor: theme.colors.white,
    borderRadius: theme.radius.lg,
    paddingHorizontal: theme.spacing.md,
    ...theme.shadows.soft,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    flex: 1,
  },
  menuItemText: {
    fontFamily: theme.typography.fontFamily.interMedium,
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textPrimary,
  },
  menuBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    backgroundColor: `${theme.colors.orange}20`,
    borderRadius: theme.radius.full,
    marginRight: theme.spacing.sm,
  },
  menuBadgeText: {
    fontFamily: theme.typography.fontFamily.interSemiBold,
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.orange,
  },
  logoutSection: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing['2xl'],
  },
});

export default VendorProfileScreen;
