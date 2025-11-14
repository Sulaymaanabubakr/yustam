import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import theme from '../../theme';
import Toast from '../../components/Toast';
import { vendorAPI } from '../../services/api';
import { goBackOrNavigate } from '../../utils/navigation';
import { formatNumber } from '../../utils/formatters';

const PLAN_LIMITS = {
  free: 5,
  starter: 20,
  basic: 20,
  pro: 50,
  premium: 50,
  elite: 80,
  professional: 150,
  power: 150,
};

const AnalyticsScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'info' });
  const [analytics, setAnalytics] = useState({
    totalListings: 0,
    activeListings: 0,
    pendingListings: 0,
    rejectedListings: 0,
    soldListings: 0,
    totalViews: 0,
    planName: 'Free',
    planStatus: 'Active',
    listingsUsed: 0,
    listingsAllowed: 10,
    verificationStatus: 'Pending',
    verificationProgress: 0,
  });

  useEffect(() => {
    fetchAnalytics();
  }, [user?.uid]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);

      const [plansResponse, dashboardResponse, verificationResponse] = await Promise.all([
        vendorAPI.getPlans(),
        vendorAPI.getDashboard(),
        vendorAPI.getVerificationStatus().catch(() => null),
      ]);

      const payload = dashboardResponse?.data?.data;
      if (!dashboardResponse?.data?.success || !payload) {
        throw new Error('Unable to load analytics data.');
      }

      const stats = payload.stats || {};
      const subscription = plansResponse?.data?.data?.currentPlan || payload.subscription || {};
      const listings = Array.isArray(payload.listings) ? payload.listings : [];

      const totalListings = stats.total_listings || listings.length;
      const getStatus = (item) => (item.status_raw || item.status || '').toLowerCase();

      const activeListings =
        stats.active_listings ||
        listings.filter((listing) => getStatus(listing) === 'approved').length;

      const pendingListings =
        typeof stats.pending_listings === 'number'
          ? stats.pending_listings
          : Math.max(0, totalListings - activeListings);

      const soldListings = listings.filter((listing) => getStatus(listing) === 'sold').length;
      const rejectedListings = listings.filter((listing) =>
        ['rejected', 'archived'].includes(getStatus(listing))
      ).length;

      const slug = (subscription.slug || subscription.planSlug || subscription.planName || '').toLowerCase();
      const listingsAllowed =
        PLAN_LIMITS[slug] || PLAN_LIMITS[slug.replace('-plan', '')] || PLAN_LIMITS.free;

      const verificationData = verificationResponse?.data?.data;
      const verificationStatus =
        verificationData?.statusDisplay ||
        (verificationData?.status
          ? verificationData.status.charAt(0).toUpperCase() + verificationData.status.slice(1)
          : 'Pending');
      const verificationProgress =
        verificationStatus.toLowerCase() === 'verified'
          ? 100
          : verificationStatus.toLowerCase() === 'pending'
          ? 60
          : 30;

      setAnalytics({
        totalListings,
        activeListings,
        pendingListings,
        rejectedListings,
        soldListings,
        totalViews: stats.total_views || 0,
        planName: subscription.displayName || 'Free',
        planStatus: subscription.statusLabel || subscription.status || 'Active',
        listingsUsed: activeListings,
        listingsAllowed,
        verificationStatus,
        verificationProgress,
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
      showToast(error.message || 'Failed to load analytics', 'error');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAnalytics();
    setRefreshing(false);
  };

  const showToast = (message, type = 'success') => {
    setToast({ visible: true, message, type });
  };

  const hideToast = () => {
    setToast({ ...toast, visible: false });
  };

const MetricCard = ({ icon, label, value, subtitle, color }) => {
  const displayValue =
    typeof value === 'number' ? formatNumber(value) : value ?? '-';

  return (
    <View style={[styles.metricCard, { borderLeftColor: color || theme.colors.orange }]}>
      <View style={styles.metricHeader}>
        <View
          style={[
            styles.metricIcon,
            { backgroundColor: color ? `${color}20` : `${theme.colors.orange}20` },
          ]}
        >
          <Ionicons name={icon} size={20} color={color || theme.colors.orange} />
        </View>
        <Text style={styles.metricLabel}>{label}</Text>
      </View>
      <Text style={[styles.metricValue, color && { color }]}>{displayValue}</Text>
      <Text style={styles.metricSubtitle}>{subtitle || 'Last 30 days'}</Text>
    </View>
  );
};

  const ProgressBar = ({ progress, color }) => (
    <View style={styles.progressBarContainer}>
      <View style={[styles.progressBarFill, { width: `${progress}%`, backgroundColor: color }]} />
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => goBackOrNavigate(navigation)} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.emerald} />
          </TouchableOpacity>
          <Text style={styles.title}>Analytics & Insights</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.orange} />
          <Text style={styles.loadingText}>Loading your insights...</Text>
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
        <TouchableOpacity onPress={() => goBackOrNavigate(navigation)} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.emerald} />
        </TouchableOpacity>
        <Text style={styles.title}>Analytics & Insights</Text>
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
        {/* Overview Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Performance Overview</Text>
          <Text style={styles.sectionSubtitle}>Fresh insights from your latest activity</Text>
        </View>

        {/* Listing Metrics */}
        <View style={styles.cardsGrid}>
          <MetricCard
            icon="layers-outline"
            label="Total Listings"
            value={analytics.totalListings}
            color={theme.colors.emerald}
          />
          <MetricCard
            icon="checkmark-circle-outline"
            label="Active Listings"
            value={analytics.activeListings}
            color="#0F9D58"
          />
          <MetricCard
            icon="time-outline"
            label="Pending Review"
            value={analytics.pendingListings}
            color="#FFA500"
          />
          <MetricCard
            icon="close-circle-outline"
            label="Rejected"
            value={analytics.rejectedListings}
            color="#D93025"
          />
          <MetricCard
            icon="checkmark-done-outline"
            label="Sold Items"
            value={analytics.soldListings}
            color="#1976D2"
          />
          <MetricCard
            icon="eye-outline"
            label="Total Views"
            value={analytics.totalViews}
            color={theme.colors.orange}
          />
        </View>

        {/* Plan Usage Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Plan Usage</Text>
          <View style={styles.planCard}>
            <View style={styles.planHeader}>
              <View>
                <Text style={styles.planName}>{analytics.planName} Plan</Text>
                <Text style={styles.planStatus}>Status: {analytics.planStatus}</Text>
              </View>
              <View style={styles.planBadge}>
                <Ionicons name="ribbon-outline" size={20} color={theme.colors.orange} />
              </View>
            </View>
            <View style={styles.usageContainer}>
              <Text style={styles.usageText}>
                Listings: {analytics.listingsUsed} / {analytics.listingsAllowed}
              </Text>
              <ProgressBar
                progress={
                  analytics.listingsAllowed
                    ? Math.min(100, (analytics.listingsUsed / analytics.listingsAllowed) * 100)
                    : 0
                }
                color={theme.colors.orange}
              />
            </View>
          </View>
        </View>

        {/* Verification Status Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Verification Status</Text>
          <View style={styles.verificationCard}>
            <View style={styles.verificationHeader}>
              <Ionicons
                name={analytics.verificationStatus === 'Verified' ? 'shield-checkmark' : 'shield-outline'}
                size={32}
                color={analytics.verificationStatus === 'Verified' ? '#0F9D58' : theme.colors.orange}
              />
              <View style={styles.verificationInfo}>
                <Text style={styles.verificationStatus}>{analytics.verificationStatus}</Text>
                <Text style={styles.verificationText}>
                  {analytics.verificationStatus === 'Verified'
                    ? 'Your account is fully verified'
                    : 'Complete verification to unlock more features'}
                </Text>
              </View>
            </View>
            {analytics.verificationProgress < 100 && (
              <View style={styles.usageContainer}>
                <Text style={styles.usageText}>Progress: {analytics.verificationProgress}%</Text>
                <ProgressBar progress={analytics.verificationProgress} color="#0F9D58" />
              </View>
            )}
          </View>
        </View>

        {/* Quick Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Stats</Text>
          <View style={styles.quickStatsCard}>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Approval Rate</Text>
              <Text style={styles.statValue}>
                {analytics.totalListings > 0
                  ? Math.round((analytics.activeListings / analytics.totalListings) * 100)
                  : 0}%
              </Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Avg. Views per Listing</Text>
              <Text style={styles.statValue}>
                {analytics.totalListings > 0
                  ? Math.round(analytics.totalViews / analytics.totalListings)
                  : 0}
              </Text>
            </View>
          </View>
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
    paddingBottom: theme.spacing.base,
  },
  sectionTitle: {
    fontFamily: theme.typography.fontFamily.anton,
    fontSize: theme.typography.fontSize.xl,
    color: theme.colors.emerald,
    letterSpacing: theme.typography.letterSpacing.wide,
    marginBottom: theme.spacing.xs,
  },
  sectionSubtitle: {
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  cardsGrid: {
    paddingHorizontal: theme.spacing.lg,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  metricCard: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    borderLeftWidth: 4,
    flexBasis: '48%',
    maxWidth: '48%',
    marginBottom: theme.spacing.base,
    ...theme.shadows.medium,
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: theme.borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  metricLabel: {
    fontFamily: theme.typography.fontFamily.interMedium,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  metricValue: {
    fontFamily: theme.typography.fontFamily.anton,
    fontSize: theme.typography.fontSize['3xl'],
    color: theme.colors.emerald,
    letterSpacing: theme.typography.letterSpacing.wide,
  },
  metricSubtitle: {
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textTertiary,
    marginTop: theme.spacing.xs,
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
  planName: {
    fontFamily: theme.typography.fontFamily.anton,
    fontSize: theme.typography.fontSize.xl,
    color: theme.colors.emerald,
    letterSpacing: theme.typography.letterSpacing.wide,
  },
  planStatus: {
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  planBadge: {
    width: 48,
    height: 48,
    borderRadius: theme.borderRadius.full,
    backgroundColor: `${theme.colors.orange}20`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  usageContainer: {
    gap: theme.spacing.sm,
  },
  usageText: {
    fontFamily: theme.typography.fontFamily.interMedium,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: theme.colors.border,
    borderRadius: theme.borderRadius.full,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: theme.borderRadius.full,
  },
  verificationCard: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    ...theme.shadows.medium,
  },
  verificationHeader: {
    flexDirection: 'row',
    gap: theme.spacing.base,
    marginBottom: theme.spacing.base,
  },
  verificationInfo: {
    flex: 1,
  },
  verificationStatus: {
    fontFamily: theme.typography.fontFamily.anton,
    fontSize: theme.typography.fontSize.lg,
    color: theme.colors.emerald,
    letterSpacing: theme.typography.letterSpacing.wide,
    marginBottom: theme.spacing.xs,
  },
  verificationText: {
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  quickStatsCard: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    ...theme.shadows.medium,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
  },
  statDivider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: theme.spacing.xs,
  },
  statLabel: {
    fontFamily: theme.typography.fontFamily.interMedium,
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textPrimary,
  },
  statValue: {
    fontFamily: theme.typography.fontFamily.anton,
    fontSize: theme.typography.fontSize.xl,
    color: theme.colors.orange,
    letterSpacing: theme.typography.letterSpacing.wide,
  },
  bottomPadding: {
    height: theme.spacing['2xl'],
  },
});

export default AnalyticsScreen;
