import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Button from '../../components/Button';
import Toast from '../../components/Toast';
import theme from '../../theme';
import { vendorAPI } from '../../services/api';
import { goBackOrNavigate } from '../../utils/navigation';
import { API_BASE_URL } from '../../config/constants';
import { formatNaira, formatNumber } from '../../utils/formatters';
import * as WebBrowser from 'expo-web-browser';

const SubscriptionDetailsScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'info' });
  const [plan, setPlan] = useState({
    slug: 'free',
    name: 'Free',
    displayName: 'Free Plan',
    status: 'Active',
    price: 0,
    duration: 'Monthly',
    autoRenew: false,
    nextBillingDisplay: '--',
    nextBillingIso: '',
  });
  const [usage, setUsage] = useState({
    listingsAllowed: 5,
    listingsUsed: 0,
    pendingListings: 0,
  });
  const [benefits, setBenefits] = useState([]);
  const [paystackKey, setPaystackKey] = useState('');
  const [subscriptionMeta, setSubscriptionMeta] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ visible: true, message, type });
  };

  const hideToast = () => setToast({ ...toast, visible: false });

  const loadDetails = useCallback(async () => {
    try {
      if (!refreshing) {
        setLoading(true);
      }
      const [plansResponse, dashboardResponse] = await Promise.all([
        vendorAPI.getPlans(),
        vendorAPI.getDashboard(),
      ]);

      const plansPayload = plansResponse.data?.data || {};
      const dashboardPayload = dashboardResponse.data?.data || {};
      const planCatalog = plansPayload.plans || {};
      const subscription = plansPayload.subscription || plansPayload.currentPlan || {};
      const activeSlugRaw =
        subscription.slug ||
        subscription.planName ||
        subscription.planSlug ||
        (plansPayload.currentPlan && plansPayload.currentPlan.slug) ||
        'free';
      const activeSlug = activeSlugRaw.toLowerCase().replace('-plan', '');
      const planDefinition =
        planCatalog[activeSlug] ||
        planCatalog[`${activeSlug}-plan`] ||
        planCatalog[activeSlugRaw] || {
          name: subscription.displayName || subscription.name || 'Free',
          price: subscription.price || 0,
          duration: subscription.durationLabel || 'Monthly',
          listings: subscription.listings || 5,
          features: subscription.features || [],
        };

      setPlan({
        slug: activeSlug,
        name: planDefinition.name || subscription.name || 'Free',
        displayName: planDefinition.displayName || planDefinition.name || 'Free',
        status: subscription.statusLabel || subscription.status || 'Active',
        price: planDefinition.price || subscription.amount || subscription.price || 0,
        duration: planDefinition.duration || subscription.durationLabel || 'Monthly',
        autoRenew: Boolean(subscription.autoRenew || subscription.renewalStatus === 'auto'),
        nextBillingDisplay: subscription.nextBillingDisplay || subscription.expiryDisplay || '--',
        nextBillingIso: subscription.nextBillingIso || subscription.expiryIso || '',
      });

      setSubscriptionMeta(subscription);
      setPaystackKey(plansPayload.paystackKey || '');

      const stats = dashboardPayload.stats || {};
      setUsage({
        listingsAllowed: planDefinition.listings || subscription.listings || 5,
        listingsUsed: stats.active_listings || stats.total_listings || 0,
        pendingListings: stats.pending_listings || 0,
      });

      const featureList = Array.isArray(planDefinition.features)
        ? planDefinition.features
        : Array.isArray(subscription.features)
        ? subscription.features
        : [];
      setBenefits(featureList);
    } catch (error) {
      console.error('Error loading subscription details:', error);
      showToast(error.message || 'Unable to load subscription details.', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [refreshing]);

  useEffect(() => {
    loadDetails();
  }, [loadDetails]);

  const usagePercent = usage.listingsAllowed
    ? Math.min(100, Math.round((usage.listingsUsed / usage.listingsAllowed) * 100))
    : 0;

  const handleManagePlan = () => {
    navigation.navigate('Plans');
  };

  const handleViewBilling = () => {
    navigation.navigate('BillingHistory');
  };

  const handleRenewPlan = async () => {
    if (!paystackKey) {
      showToast('Payment configuration is not available yet. Please try again later.', 'error');
      return;
    }
    const slug = plan.slug || subscriptionMeta?.slug || 'free';
    try {
      const url = `${API_BASE_URL}/vendor-renew-plan.php?plan=${encodeURIComponent(slug)}`;
      await WebBrowser.openBrowserAsync(url);
      showToast('Complete the renewal in your browser and return to refresh.', 'info');
      await loadDetails();
    } catch (error) {
      console.error('Renew plan error:', error);
      showToast(error.message || 'Unable to open renewal page.', 'error');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => goBackOrNavigate(navigation)}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Subscription Details</Text>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading subscription details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Toast visible={toast.visible} message={toast.message} type={toast.type} onDismiss={hideToast} />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => goBackOrNavigate(navigation)}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Subscription Details</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadDetails();
            }}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
      >
        <View style={styles.section}>
          <View style={styles.summaryCard}>
            <View style={styles.summaryHeader}>
              <View>
                <Text style={styles.planLabel}>Current Plan</Text>
                <Text style={styles.planName}>{plan.displayName}</Text>
              </View>
              <View
                style={[
                  styles.statusBadge,
                  plan.status.toLowerCase().includes('active') ? styles.statusActive : styles.statusPaused,
                ]}
              >
                <Ionicons
                  name={plan.status.toLowerCase().includes('active') ? 'checkmark-circle' : 'time-outline'}
                  size={16}
                  color={theme.colors.white}
                />
                <Text style={styles.statusText}>{plan.status}</Text>
              </View>
            </View>

            <View style={styles.priceRow}>
              <Text style={styles.priceText}>{formatNaira(plan.price)}</Text>
              <Text style={styles.priceDuration}>/ {plan.duration}</Text>
            </View>
            <Text style={styles.nextBilling}>
              Next billing date: {plan.nextBillingDisplay || 'Not scheduled'}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Usage Overview</Text>
          <View style={styles.usageCard}>
            <View style={styles.usageRow}>
              <Text style={styles.usageLabel}>Listings Used</Text>
              <Text style={styles.usageValue}>
                {formatNumber(usage.listingsUsed)} / {formatNumber(usage.listingsAllowed)}
              </Text>
            </View>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${usagePercent}%` }]} />
            </View>
            <View style={styles.usageFooter}>
              <Text style={styles.usagePercent}>{usagePercent}% of allowance</Text>
              {usage.pendingListings > 0 && (
                <Text style={styles.pendingText}>{usage.pendingListings} pending approvals</Text>
              )}
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Benefits & Features</Text>
          <View style={styles.featuresCard}>
            {benefits.length === 0 && (
              <Text style={styles.emptyFeatures}>Plan features will appear here once available.</Text>
            )}
            {benefits.map((benefit) => (
              <View key={benefit} style={styles.featureRow}>
                <Ionicons name="checkmark-circle" size={18} color={theme.colors.success} />
                <Text style={styles.featureText}>{benefit}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            <Button variant="primary" fullWidth icon="sparkles-outline" onPress={handleManagePlan}>
              Change / Upgrade Plan
            </Button>
            <Button variant="outline" fullWidth icon="refresh-outline" onPress={handleRenewPlan}>
              Renew Current Plan
            </Button>
            <Button variant="outline" fullWidth icon="receipt-outline" onPress={handleViewBilling}>
              View Billing History
            </Button>
          </View>
        </View>
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
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.white,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${theme.colors.primary}10`,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontFamily: theme.typography.fontFamilyHeading,
    fontSize: theme.typography.sizes.xl,
    color: theme.colors.primary,
  },
  headerRight: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: theme.spacing.lg,
    gap: theme.spacing.lg,
  },
  section: {
    gap: theme.spacing.sm,
  },
  sectionTitle: {
    fontFamily: theme.typography.fontFamilyHeading,
    fontSize: theme.typography.sizes.lg,
    color: theme.colors.textPrimary,
    letterSpacing: 0.4,
  },
  summaryCard: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    ...theme.shadows.medium,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  planLabel: {
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  planName: {
    fontFamily: theme.typography.fontFamilyHeading,
    fontSize: theme.typography.sizes['2xl'],
    color: theme.colors.primary,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.base,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.full,
  },
  statusActive: {
    backgroundColor: theme.colors.success,
  },
  statusPaused: {
    backgroundColor: theme.colors.warning,
  },
  statusText: {
    fontFamily: theme.typography.fontFamily.interSemiBold,
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.white,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: theme.spacing.xs,
    marginTop: theme.spacing.sm,
  },
  priceText: {
    fontFamily: theme.typography.fontFamilyHeading,
    fontSize: theme.typography.sizes['3xl'],
    color: theme.colors.accent,
  },
  priceDuration: {
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textSecondary,
  },
  nextBilling: {
    marginTop: theme.spacing.sm,
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  usageCard: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    ...theme.shadows.medium,
    gap: theme.spacing.sm,
  },
  usageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  usageLabel: {
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textSecondary,
  },
  usageValue: {
    fontFamily: theme.typography.fontFamilyHeading,
    fontSize: theme.typography.sizes.xl,
    color: theme.colors.primary,
  },
  progressBar: {
    height: 10,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.border,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.primary,
  },
  usageFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  usagePercent: {
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  pendingText: {
    fontFamily: theme.typography.fontFamily.interMedium,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.warning,
  },
  featuresCard: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    gap: theme.spacing.sm,
    ...theme.shadows.medium,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  featureText: {
    flex: 1,
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textPrimary,
  },
  emptyFeatures: {
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  actionsGrid: {
    gap: theme.spacing.sm,
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.base,
  },
  loadingText: {
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textSecondary,
  },
});

export default SubscriptionDetailsScreen;
