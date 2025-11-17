import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import theme from '../../theme';
import Toast from '../../components/Toast';
import Button from '../../components/Button';
import { vendorAPI } from '../../services/api';
import { formatNumber } from '../../utils/formatters';
import { resolveUserUid } from '../../utils/user';
import { deriveSubscriptionStatusMeta, normalizeAutoRenewFlag, cleanPlanDisplayName } from '../../utils/subscription';

const formatVerificationStatusLabel = (value) => {
  const normalised = String(value || '').trim().toLowerCase();
  if (['verified', 'approved', 'active'].includes(normalised)) {
    return 'Verified';
  }
  if (['pending', 'inreview', 'underreview'].includes(normalised)) {
    return 'Pending';
  }
  if (['rejected', 'declined', 'failed'].includes(normalised)) {
    return 'Needs attention';
  }
  return 'Not submitted';
};

const VendorDashboardScreen = ({ navigation }) => {
  const { user } = useAuth();
  const vendorUid = resolveUserUid(user);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'info' });
  const [dashboard, setDashboard] = useState({
    totalListings: 0,
    activeListings: 0,
    pendingListings: 0,
    totalViews: 0,
    unreadMessages: 0,
    unreadNotifications: 0,
    planName: 'Free',
    planStatus: 'Active',
    planStatusNote: null,
    planRenewal: '--',
    planRenewalLabel: 'Next billing',
    verificationStatus: 'Pending',
  });

  useEffect(() => {
    fetchDashboard();
  }, [vendorUid]);

  const fetchDashboard = async () => {
    try {
      setLoading(true);

      const [plansResponse, dashboardResponse, verificationResponse, notificationsResponse, chatsResponse] =
        await Promise.all([
          vendorAPI.getPlans(),
          vendorAPI.getDashboard(),
          vendorAPI.getVerificationStatus().catch(() => null),
          vendorAPI.getNotifications().catch(() => null),
          vendorUid ? vendorAPI.getChats(vendorUid).catch(() => null) : Promise.resolve(null),
        ]);

      const payload = dashboardResponse?.data?.data;
      if (!dashboardResponse?.data?.success || !payload) {
        throw new Error('Unable to load dashboard data.');
      }

      const stats = payload.stats || {};
      const planSummary = plansResponse?.data?.data?.currentPlan;
      const subscription = payload.subscription || {};
      const profile = payload.profile || {};

      const totalListings = stats.total_listings || 0;
      const activeListings = stats.active_listings || 0;
      const pendingListings =
        typeof stats.pending_listings === 'number'
          ? stats.pending_listings
          : Math.max(0, totalListings - activeListings);

      const notifications = notificationsResponse?.data?.data?.notifications;
      const unreadNotifications = Array.isArray(notifications)
        ? notifications.filter((notif) => (notif.status || '').toLowerCase() === 'new').length
        : 0;

      const chats = chatsResponse?.data?.chats;
      const unreadMessages = Array.isArray(chats)
        ? chats.reduce((sum, chat) => sum + (Number(chat.unread_for_vendor) || 0), 0)
        : 0;

      const verificationData = verificationResponse?.data?.data;
      const verificationStatus = formatVerificationStatusLabel(
        verificationData?.statusDisplay || verificationData?.status
      );

      const autoRenewSource =
        planSummary?.autoRenew ??
        planSummary?.auto_renew ??
        subscription.autoRenew ??
        subscription.renewalStatus;
      const normalizedAutoRenew = normalizeAutoRenewFlag(autoRenewSource, true);
      const statusMeta = deriveSubscriptionStatusMeta(
        planSummary?.status ||
          planSummary?.statusLabel ||
          subscription.status ||
          subscription.statusLabel ||
          profile.planStatus ||
          'Active',
        normalizedAutoRenew,
        planSummary?.cancelled ?? subscription.cancelled ?? false
      );
      const dashboardPlanStatus = statusMeta.primaryStatus;
      const planStatusNote = statusMeta.secondaryStatus;
      const dashboardPlanRenewal =
        planSummary?.nextBillingDisplay ||
        planSummary?.expiryDisplay ||
        subscription.nextBillingDisplay ||
        profile.planRenewal ||
        '--';
      const dashboardPlanRenewalLabel =
        subscription?.renewalLabel ||
        planSummary?.renewalLabel ||
        statusMeta.renewalLabel ||
        (planStatusNote ? 'Expires on' : 'Next billing');
      setDashboard({
        totalListings,
        activeListings,
        pendingListings,
        totalViews: stats.total_views || 0,
        unreadMessages,
        unreadNotifications,
        planName: cleanPlanDisplayName(
          planSummary?.displayName || subscription.displayName || profile.plan || 'Free'
        ),
        planStatus: dashboardPlanStatus,
        planStatusNote,
        planRenewal: dashboardPlanRenewal,
        planRenewalLabel: dashboardPlanRenewalLabel,
        verificationStatus,
      });
    } catch (error) {
      console.error('Error fetching dashboard:', error);
      showToast(error.message || 'Failed to load dashboard', 'error');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchDashboard();
    setRefreshing(false);
  };

  const showToast = (message, type = 'success') => {
    setToast({ visible: true, message, type });
  };

  const hideToast = () => {
    setToast({ ...toast, visible: false });
  };

  const QuickStatCard = ({ icon, label, value, color, onPress }) => {
    const displayValue =
      typeof value === 'number' ? formatNumber(value) : value ?? '--';

    return (
      <TouchableOpacity
        style={[styles.statCard, { borderLeftColor: color }]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <View style={[styles.statIconContainer, { backgroundColor: `${color}20` }]}>
          <Ionicons name={icon} size={24} color={color} />
        </View>
        <View style={styles.statContent}>
          <Text style={styles.statLabel}>{label}</Text>
          <Text style={[styles.statValue, { color }]}>{displayValue}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const QuickActionCard = ({ icon, title, subtitle, color, onPress }) => (
    <TouchableOpacity style={styles.actionCard} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.actionIcon, { backgroundColor: `${color}20` }]}>
        <Ionicons name={icon} size={28} color={color} />
      </View>
      <View style={styles.actionContent}>
        <Text style={styles.actionTitle}>{title}</Text>
        <Text style={styles.actionSubtitle}>{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Vendor Dashboard</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.orange} />
          <Text style={styles.loadingText}>Loading your dashboard...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={hideToast}
      />
      
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Welcome back,</Text>
          <Text style={styles.title}>{user?.displayName || user?.fullName || 'Vendor'}</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('Profile')} style={styles.profileButton}>
          {user?.photoURL ? (
            <Image source={{ uri: user.photoURL }} style={styles.profileImage} />
          ) : (
            <View style={styles.profilePlaceholder}>
              <Ionicons name="person" size={24} color={theme.colors.white} />
            </View>
          )}
        </TouchableOpacity>
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
        {/* Quick Stats Grid */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Stats</Text>
          <View style={styles.statsGrid}>
            <QuickStatCard
              icon="layers-outline"
              label="Total Listings"
              value={dashboard.totalListings}
              color={theme.colors.emerald}
              onPress={() => navigation.navigate('Analytics')}
            />
            <QuickStatCard
              icon="checkmark-circle-outline"
              label="Active"
              value={dashboard.activeListings}
              color="#0F9D58"
              onPress={() => navigation.navigate('Analytics')}
            />
            <QuickStatCard
              icon="time-outline"
              label="Pending"
              value={dashboard.pendingListings}
              color="#FFA500"
              onPress={() => navigation.navigate('Analytics')}
            />
            <QuickStatCard
              icon="eye-outline"
              label="Views"
              value={dashboard.totalViews}
              color={theme.colors.orange}
              onPress={() => navigation.navigate('Analytics')}
            />
          </View>
        </View>

        {/* Plan Status */}
        <View style={styles.section}>
          <View style={styles.planCard}>
            <View style={styles.planHeader}>
              <View style={styles.planInfo}>
                <Text style={styles.planLabel}>Current Plan</Text>
                <Text style={styles.planName}>{dashboard.planName}</Text>
              </View>
              <View style={styles.statusPills}>
                <View style={[styles.statusBadge, styles.activeBadge]}>
                  <Text style={styles.statusText}>{dashboard.planStatus}</Text>
                </View>
                {dashboard.planStatusNote ? (
                  <View style={[styles.statusBadge, styles.inactiveBadge]}>
                    <Text style={styles.statusText}>{dashboard.planStatusNote}</Text>
                  </View>
                ) : null}
              </View>
            </View>
            <Text style={styles.planRenewal}>
              {dashboard.planRenewalLabel}:{' '}
              {dashboard.planRenewal && dashboard.planRenewal !== '--' ? dashboard.planRenewal : 'Not scheduled'}
            </Text>
            <Button
              title="Manage Plan"
              onPress={() => navigation.navigate('BillingHistory')}
              variant="outline"
              size="small"
              icon="card-outline"
            />
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsContainer}>
            <QuickActionCard
              icon="add-circle-outline"
              title="Add New Listing"
              subtitle="Create a new product"
              color={theme.colors.orange}
              onPress={() => navigation.navigate('ListingEditor', { listing: null })}
            />
            <QuickActionCard
              icon="list-outline"
              title="My Listings"
              subtitle="Manage your products"
              color={theme.colors.emerald}
              onPress={() => navigation.navigate('VendorListings')}
            />
            <QuickActionCard
              icon="chatbubbles-outline"
              title="Messages"
              subtitle={`${dashboard.unreadMessages} unread`}
              color="#1976D2"
              onPress={() => navigation.navigate('VendorChats')}
            />
            <QuickActionCard
              icon="notifications-outline"
              title="Notifications"
              subtitle={`${dashboard.unreadNotifications} new`}
              color={theme.colors.emerald}
              onPress={() => navigation.navigate('VendorNotifications')}
            />
            <QuickActionCard
              icon="bar-chart-outline"
              title="Full Analytics"
              subtitle="View detailed insights"
              color="#9C27B0"
              onPress={() => navigation.navigate('Analytics')}
            />
            <QuickActionCard
              icon="storefront-outline"
              title="My Storefront"
              subtitle="View & share your page"
              color="#FF6F00"
              onPress={() => navigation.navigate('Storefront')}
            />
            <QuickActionCard
              icon="help-circle-outline"
              title="Help & Support"
              subtitle="Get assistance"
              color="#00897B"
              onPress={() => navigation.navigate('HelpSupport')}
            />
          </View>
        </View>

        {/* Verification Status */}
        {dashboard.verificationStatus !== 'Verified' && (
          <View style={styles.section}>
            <View style={styles.verificationBanner}>
              <Ionicons name="shield-outline" size={32} color={theme.colors.orange} />
              <View style={styles.verificationContent}>
                <Text style={styles.verificationTitle}>Complete Verification</Text>
                <Text style={styles.verificationText}>
                  Get verified to unlock more features and build trust with buyers
                </Text>
              </View>
              <TouchableOpacity
                style={styles.verificationButton}
                onPress={() => navigation.navigate('Verification')}
              >
                <Text style={styles.verificationButtonText}>Verify</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.base,
    backgroundColor: theme.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  greeting: {
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  title: {
    fontFamily: theme.typography.fontFamily.anton,
    fontSize: theme.typography.fontSize['2xl'],
    color: theme.colors.emerald,
    letterSpacing: theme.typography.letterSpacing.wide,
  },
  profileButton: {
    padding: theme.spacing.xs,
  },
  profileImage: {
    width: 48,
    height: 48,
    borderRadius: theme.borderRadius.full,
  },
  profilePlaceholder: {
    width: 48,
    height: 48,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.emerald,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: theme.spacing.base,
  },
  loadingText: {
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textSecondary,
  },
  section: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.xl,
  },
  sectionTitle: {
    fontFamily: theme.typography.fontFamily.anton,
    fontSize: theme.typography.fontSize.lg,
    color: theme.colors.emerald,
    letterSpacing: theme.typography.letterSpacing.wide,
    marginBottom: theme.spacing.base,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.base,
  },
  statCard: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.base,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    borderLeftWidth: 4,
    ...theme.shadows.small,
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: theme.borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statContent: {
    flex: 1,
  },
  statLabel: {
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs / 2,
  },
  statValue: {
    fontFamily: theme.typography.fontFamily.anton,
    fontSize: theme.typography.fontSize.xl,
    letterSpacing: theme.typography.letterSpacing.wide,
  },
  planCard: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    ...theme.shadows.medium,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.base,
  },
  statusPills: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  planInfo: {
    flex: 1,
  },
  planLabel: {
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs / 2,
  },
  planName: {
    fontFamily: theme.typography.fontFamily.anton,
    fontSize: theme.typography.fontSize.xl,
    color: theme.colors.emerald,
    letterSpacing: theme.typography.letterSpacing.wide,
  },
  planRenewal: {
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.base,
  },
  statusBadge: {
    paddingHorizontal: theme.spacing.base,
    paddingVertical: theme.spacing.xs / 2,
    borderRadius: theme.borderRadius.full,
  },
  activeBadge: {
    backgroundColor: '#E8F5E9',
  },
  inactiveBadge: {
    backgroundColor: '#FFEBEE',
  },
  statusText: {
    fontFamily: theme.typography.fontFamily.interSemiBold,
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.emerald,
  },
  actionsContainer: {
    gap: theme.spacing.base,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.base,
    gap: theme.spacing.base,
    ...theme.shadows.small,
  },
  actionIcon: {
    width: 56,
    height: 56,
    borderRadius: theme.borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontFamily: theme.typography.fontFamily.interSemiBold,
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs / 2,
  },
  actionSubtitle: {
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  verificationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${theme.colors.orange}10`,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.base,
    gap: theme.spacing.base,
    borderWidth: 1,
    borderColor: `${theme.colors.orange}30`,
  },
  verificationContent: {
    flex: 1,
  },
  verificationTitle: {
    fontFamily: theme.typography.fontFamily.interSemiBold,
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs / 2,
  },
  verificationText: {
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  verificationButton: {
    backgroundColor: theme.colors.orange,
    paddingHorizontal: theme.spacing.base,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
  },
  verificationButtonText: {
    fontFamily: theme.typography.fontFamily.interSemiBold,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.white,
  },
  bottomPadding: {
    height: theme.spacing['2xl'],
  },
});

export default VendorDashboardScreen;
