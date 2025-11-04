import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, SHADOWS } from '../../constants/theme';
import { getUserData, type UserData } from '../../services/storage';

const quickActions = [
  {
    id: 'add-product',
    label: 'Add New Product',
    icon: 'add-circle-outline' as const,
  },
  {
    id: 'view-analytics',
    label: 'View Analytics',
    icon: 'analytics-outline' as const,
  },
  {
    id: 'customer-messages',
    label: 'Customer Messages',
    icon: 'chatbubble-ellipses-outline' as const,
  },
];

const VendorHomeScreen: React.FC = () => {
  const [userData, setUserData] = React.useState<UserData | null>(null);

  React.useEffect(() => {
    const loadUserData = async () => {
      const data = await getUserData();
      setUserData(data);
    };

    loadUserData();
  }, []);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Welcome back,</Text>
        <Text style={styles.businessName}>{userData?.businessName || 'Vendor'}</Text>
        {userData?.verified && (
          <View style={styles.verificationBadge}>
            <Ionicons name='shield-checkmark' size={16} color={COLORS.white} />
            <Text style={styles.badgeText}>Verified</Text>
          </View>
        )}
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>0</Text>
          <Text style={styles.statLabel}>Active Listings</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>0</Text>
          <Text style={styles.statLabel}>Total Orders</Text>
        </View>
      </View>

      <View style={styles.planCard}>
        <View style={{ flex: 1 }}>
          <Text style={styles.planTitle}>Current Plan</Text>
          <Text style={styles.planName}>{userData?.plan || 'Free Plan'}</Text>
          <Text style={styles.planSubtitle}>Unlock more visibility with premium plans.</Text>
        </View>
        <TouchableOpacity style={styles.upgradeButton}>
          <Text style={styles.upgradeText}>Upgrade Plan</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.actionsContainer}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        {quickActions.map((action) => (
          <TouchableOpacity key={action.id} style={styles.actionButton}>
            <Ionicons name={action.icon} size={22} color={COLORS.emerald} />
            <Text style={styles.actionText}>{action.label}</Text>
            <Ionicons name='chevron-forward' size={18} color={COLORS.gray400} />
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  content: {
    padding: SPACING.lg,
    paddingTop: SPACING.xxl,
    paddingBottom: SPACING.xxl,
    gap: SPACING.xl,
  },
  header: {
    gap: SPACING.xs,
  },
  greeting: {
    fontSize: FONT_SIZES.md,
    color: COLORS.gray600,
  },
  businessName: {
    fontSize: FONT_SIZES.xxxl,
    fontWeight: 'bold',
    color: COLORS.emerald,
  },
  verificationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: COLORS.success,
    alignSelf: 'flex-start',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
  },
  badgeText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    ...SHADOWS.medium,
  },
  statNumber: {
    fontSize: FONT_SIZES.xxxl,
    fontWeight: 'bold',
    color: COLORS.orange,
    marginBottom: SPACING.xs,
  },
  statLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.gray600,
  },
  planCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.lg,
    backgroundColor: COLORS.emerald,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    ...SHADOWS.large,
  },
  planTitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.white,
    opacity: 0.85,
  },
  planName: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '700',
    color: COLORS.white,
    marginVertical: SPACING.xs,
  },
  planSubtitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.white,
    opacity: 0.9,
  },
  upgradeButton: {
    backgroundColor: COLORS.orange,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
  },
  upgradeText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.sm,
    fontWeight: '700',
  },
  actionsContainer: {
    gap: SPACING.md,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: 'bold',
    color: COLORS.ink,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    ...SHADOWS.small,
  },
  actionText: {
    flex: 1,
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.ink,
  },
});

export default VendorHomeScreen;
