import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import theme from '../../theme';
import Toast from '../../components/Toast';
import Button from '../../components/Button';
import { vendorAPI } from '../../services/api';
import { goBackOrNavigate } from '../../utils/navigation';
import { getPlanPreset } from '../../data/vendorPlans';

const normalisePlanSlug = (value = '') => {
  const base = String(value || '').toLowerCase();
  if (!base) {
    return 'free';
  }
  const trimmed = base.replace(/plan$/i, '');
  const slug = trimmed.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return slug || 'free';
};

const VendorManageSubscriptionScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'info' });
  const [details, setDetails] = useState(null);
  const [updatingAutoRenew, setUpdatingAutoRenew] = useState(false);

  const showToast = (message, type = 'success') => {
    setToast({ visible: true, message, type });
  };

  const hideToast = () => setToast({ ...toast, visible: false });

  const loadDetails = useCallback(async () => {
    try {
      if (!refreshing) {
        setLoading(true);
      }
      const response = await vendorAPI.getSubscriptionDetails();
      const payload = response.data?.data || response.data || {};
      const slug = normalisePlanSlug(payload.slug || payload.planSlug || payload.planName);
      const fallbackPlan = getPlanPreset(slug);
      const usagePayload = payload.usage || {
        allowed: payload.listingsAllowed ?? fallbackPlan.listings ?? 0,
        used: payload.listingsUsed ?? 0,
        pending: payload.pendingListings ?? 0,
      };
      const usage = {
        allowed: usagePayload.allowed ?? fallbackPlan.listings ?? 0,
        used: usagePayload.used ?? 0,
        pending: usagePayload.pending ?? 0,
      };
      const benefits =
        Array.isArray(payload.features) && payload.features.length
          ? payload.features
          : fallbackPlan.features || [];

      setDetails({
        planName: payload.planName || payload.displayName || fallbackPlan.name || 'Free Plan',
        status: payload.status || payload.subscription?.status || 'Active',
        expiryDisplay: payload.expiryDisplay || payload.nextBillingDisplay || '--',
        autoRenew: Boolean(payload.autoRenew ?? payload.renewalStatus === 'auto'),
        usage,
        benefits,
        notice: payload.notice || payload.subscription?.notice || '',
        slug,
      });
    } catch (error) {
      console.error('Failed to load subscription details', error);
      showToast(error.message || 'Unable to load subscription details.', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [refreshing]);

  useEffect(() => {
    loadDetails();
  }, [loadDetails]);

  const onRefresh = () => {
    setRefreshing(true);
    loadDetails();
  };

  const toggleAutoRenew = async () => {
    if (!details) {
      return;
    }
    const nextValue = !details.autoRenew;
    setDetails((prev) => ({ ...prev, autoRenew: nextValue }));
    setUpdatingAutoRenew(true);
    try {
      await vendorAPI.setAutoRenew(nextValue);
      showToast(nextValue ? 'Auto-renew enabled' : 'Auto-renew disabled');
      await loadDetails();
    } catch (error) {
      setDetails((prev) => ({ ...prev, autoRenew: !nextValue }));
      showToast(error.message || 'Unable to update auto-renew.', 'error');
    } finally {
      setUpdatingAutoRenew(false);
    }
  };

  const handleCancelSubscription = async () => {
    try {
      await vendorAPI.subscriptionAction({ action: 'cancel' });
      showToast('Cancellation requested. Support will reach out shortly.');
    } catch (error) {
      showToast(error.message || 'Unable to process cancellation.', 'error');
    }
  };

  const handleContactSupport = () => {
    navigation.navigate('HelpSupport', { topic: 'subscription' });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => goBackOrNavigate(navigation)} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.emerald} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Manage Subscription</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color={theme.colors.emerald} />
          <Text style={styles.loadingText}>Loading subscription...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Toast visible={toast.visible} message={toast.message} type={toast.type} onDismiss={hideToast} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => goBackOrNavigate(navigation)} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.emerald} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Manage Subscription</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.emerald]} />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.planCard}>
          <View style={styles.planHeader}>
            <Text style={styles.planName}>{details?.planName}</Text>
            <Text style={[styles.statusBadge, details?.status === 'Active' ? styles.statusActive : styles.statusPending]}>
              {details?.status}
            </Text>
          </View>
          <Text style={styles.planExpiry}>Next billing: {details?.expiryDisplay || '--'}</Text>
          <View style={styles.usageRow}>
            <View style={styles.usageStat}>
              <Text style={styles.usageValue}>{details?.usage?.used ?? 0}</Text>
              <Text style={styles.usageLabel}>Listings Used</Text>
            </View>
            <View style={styles.usageDivider} />
            <View style={styles.usageStat}>
              <Text style={styles.usageValue}>{details?.usage?.allowed ?? 0}</Text>
              <Text style={styles.usageLabel}>Listings Allowed</Text>
            </View>
          </View>
        </View>
        {details?.notice ? (
          <View style={styles.noticeCard}>
            <Ionicons name="information-circle-outline" size={18} color={theme.colors.accent} />
            <Text style={styles.noticeText}>{details.notice}</Text>
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Auto-Renewal</Text>
          <View style={styles.autoRenewRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.autoRenewLabel}>Auto-renew subscription</Text>
              <Text style={styles.autoRenewHint}>
                {details?.autoRenew
                  ? 'We will charge your saved payment method at renewal.'
                  : 'Keep auto-renew on to avoid interruptions.'}
              </Text>
            </View>
            <Switch
              value={details?.autoRenew}
              onValueChange={toggleAutoRenew}
              disabled={updatingAutoRenew}
              thumbColor={details?.autoRenew ? theme.colors.emerald : '#ccc'}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Plan Benefits</Text>
          {(details?.benefits || []).map((benefit) => (
            <View key={benefit} style={styles.benefitRow}>
              <Ionicons name="checkmark-circle" size={18} color={theme.colors.emerald} />
              <Text style={styles.benefitText}>{benefit}</Text>
            </View>
          ))}
          {!details?.benefits?.length && (
            <Text style={styles.benefitText}>Upgrade to premium tiers to unlock more benefits.</Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Actions</Text>
          <Button
            variant="primary"
            icon="sparkles-outline"
            fullWidth
            onPress={() => navigation.navigate('Plans')}
          >
            Change Plan
          </Button>
          <Button
            variant="outline"
            icon="refresh-outline"
            fullWidth
            onPress={() => navigation.navigate('VendorRenewPlan')}
          >
            Renew Now
          </Button>
          <Button variant="outline" icon="close-circle-outline" fullWidth onPress={handleCancelSubscription}>
            Cancel Subscription
          </Button>
          <Button variant="text" icon="help-circle-outline" onPress={handleContactSupport}>
            Contact Support
          </Button>
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
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backButton: {
    padding: theme.spacing.xs,
  },
  headerTitle: {
    fontFamily: theme.typography.fontFamily.anton,
    fontSize: theme.typography.fontSize['2xl'],
    color: theme.colors.emerald,
    letterSpacing: theme.typography.letterSpacing.wide,
  },
  headerSpacer: {
    width: 32,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing['3xl'],
    gap: theme.spacing.lg,
  },
  loadingState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
  },
  loadingText: {
    fontFamily: theme.typography.fontFamily.inter,
    color: theme.colors.textSecondary,
  },
  planCard: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.radius['2xl'],
    padding: theme.spacing.xl,
    gap: theme.spacing.sm,
    ...theme.shadows.card,
  },
  noticeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.beige,
    borderRadius: theme.radius['2xl'],
    padding: theme.spacing.md,
  },
  noticeText: {
    flex: 1,
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textPrimary,
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  planName: {
    fontFamily: theme.typography.fontFamily.anton,
    fontSize: theme.typography.fontSize['2xl'],
    color: theme.colors.textPrimary,
  },
  statusBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.radius.full,
    fontFamily: theme.typography.fontFamily.interSemiBold,
    fontSize: theme.typography.fontSize.xs,
  },
  statusActive: {
    backgroundColor: `${theme.colors.emerald}20`,
    color: theme.colors.emerald,
  },
  statusPending: {
    backgroundColor: `${theme.colors.orange}20`,
    color: theme.colors.orange,
  },
  planExpiry: {
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  usageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing.sm,
  },
  usageStat: {
    flex: 1,
    alignItems: 'center',
  },
  usageValue: {
    fontFamily: theme.typography.fontFamily.anton,
    fontSize: theme.typography.fontSize.lg,
    color: theme.colors.textPrimary,
  },
  usageLabel: {
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textSecondary,
  },
  usageDivider: {
    width: 1,
    height: 48,
    backgroundColor: theme.colors.border,
  },
  section: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.radius['2xl'],
    padding: theme.spacing.xl,
    gap: theme.spacing.md,
    ...theme.shadows.card,
  },
  sectionTitle: {
    fontFamily: theme.typography.fontFamily.interSemiBold,
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textPrimary,
  },
  autoRenewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  autoRenewLabel: {
    fontFamily: theme.typography.fontFamily.interSemiBold,
    color: theme.colors.textPrimary,
  },
  autoRenewHint: {
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textSecondary,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  benefitText: {
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
  },
});

export default VendorManageSubscriptionScreen;
