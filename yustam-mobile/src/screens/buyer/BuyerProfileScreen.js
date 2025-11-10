import React, { useMemo, useState } from 'react';
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

const BuyerProfileScreen = ({ navigation }) => {
  const { user, logout } = useAuth();
  const [toast, setToast] = useState({ visible: false, message: '', type: 'info' });

  const displayName = useMemo(
    () => user?.fullName || user?.displayName || 'Yustam Buyer',
    [user?.fullName, user?.displayName]
  );
  const phoneNumber = user?.phone || user?.mobile || 'Not provided';
  const location = user?.location || user?.city || 'Nigeria';

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

  const ProfileMenuItem = ({ icon, label, description, onPress }) => (
    <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.75}>
      <View style={styles.menuItemLeft}>
        <Ionicons name={icon} size={22} color={theme.colors.textPrimary} />
        <View style={styles.menuItemCopy}>
          <Text style={styles.menuItemText}>{label}</Text>
          {description ? <Text style={styles.menuItemDescription}>{description}</Text> : null}
        </View>
      </View>
      <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
    </TouchableOpacity>
  );

  const InfoRow = ({ icon, label, value }) => (
    <View style={styles.infoRow}>
      <View style={styles.infoIcon}>
        <Ionicons name={icon} size={18} color={theme.colors.orange} />
      </View>
      <View style={styles.infoCopy}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
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
                <Ionicons name="person" size={42} color={theme.colors.white} />
              </View>
            )}
          </View>
          <Text style={styles.userName}>{displayName}</Text>
          <Text style={styles.userEmail}>{user?.email}</Text>
          <View style={styles.badgeRow}>
            <View style={styles.badgePill}>
              <Ionicons name="bag-handle" size={14} color={theme.colors.white} />
              <Text style={styles.badgeText}>Buyer</Text>
            </View>
          </View>
        </View>

        <View style={styles.infoCard}>
          <InfoRow icon="call-outline" label="Phone Number" value={phoneNumber} />
          <InfoRow icon="location-outline" label="Location" value={location} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Activity</Text>
          <ProfileMenuItem
            icon="bookmark-outline"
            label="Saved Items"
            onPress={() => navigation.navigate('BuyerSaved')}
          />
          <ProfileMenuItem
            icon="chatbubbles-outline"
            label="Messages"
            onPress={() => navigation.navigate('Chat')}
          />
          <ProfileMenuItem
            icon="time-outline"
            label="Recently Viewed"
            onPress={() => navigation.navigate('BuyerRecentlyViewed')}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <ProfileMenuItem
              icon="settings-outline"
              label="Preferences"
              description="Update your basic info"
              onPress={() => navigation.navigate('BuyerPreferences')}
            />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support</Text>
          <ProfileMenuItem
            icon="help-circle-outline"
            label="Help & Support"
            onPress={() => navigation.navigate('BuyerSupport')}
          />
          <ProfileMenuItem
            icon="shield-checkmark-outline"
            label="Report an Issue"
            onPress={() => navigation.navigate('BuyerSupport', { mode: 'report' })}
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
    backgroundColor: theme.colors.orange,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userName: {
    fontFamily: theme.typography.fontFamily.anton,
    fontSize: theme.typography.fontSize['2xl'],
    color: theme.colors.textPrimary,
    letterSpacing: theme.typography.letterSpacing.wide,
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
  badgeText: {
    fontFamily: theme.typography.fontFamily.interSemiBold,
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.white,
  },
  infoCard: {
    marginTop: -theme.spacing.xl,
    marginHorizontal: theme.spacing.lg,
    backgroundColor: theme.colors.white,
    borderRadius: theme.radius['2xl'],
    padding: theme.spacing.lg,
    ...theme.shadows.card,
    gap: theme.spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  infoIcon: {
    width: 40,
    height: 40,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoCopy: {
    flex: 1,
    gap: 2,
  },
  infoLabel: {
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textSecondary,
  },
  infoValue: {
    fontFamily: theme.typography.fontFamily.interSemiBold,
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textPrimary,
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
  menuItemCopy: {
    flex: 1,
    gap: 2,
  },
  menuItemText: {
    fontFamily: theme.typography.fontFamily.interMedium,
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textPrimary,
  },
  menuItemDescription: {
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textSecondary,
  },
  logoutSection: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing['2xl'],
  },
});

export default BuyerProfileScreen;
