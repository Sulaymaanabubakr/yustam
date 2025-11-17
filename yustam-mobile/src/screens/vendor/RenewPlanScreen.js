import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import { usePaystack } from 'react-native-paystack-webview';
import theme from '../../theme';
import { vendorAPI } from '../../services/api';
import Toast from '../../components/Toast';
import Button from '../../components/Button';
import { goBackOrNavigate } from '../../utils/navigation';
import { formatNaira } from '../../utils/formatters';
import { cleanPlanDisplayName } from '../../utils/subscription';
import { getPlanPreset } from '../../data/vendorPlans';

const resolveVendorId = (profile) => {
  if (!profile) {
    return null;
  }
  const candidates = [
    profile.vendorId,
    profile.vendor_id,
    profile.vendorID,
    profile.vendor?.id,
    profile.vendor?.vendorId,
    profile.id,
  ];
  for (const value of candidates) {
    if (value === undefined || value === null) continue;
    const numeric = parseInt(String(value).replace(/[^\d]/g, ''), 10);
    if (Number.isFinite(numeric) && numeric > 0) {
      return numeric;
    }
  }
  return null;
};

const buildPlanReference = (vendorId) => {
  const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `YUSTAM-V${vendorId}-${randomPart}-${Date.now()}`;
};

const normaliseDurationOptions = (options = []) => {
  if (!Array.isArray(options)) {
    return [];
  }
  return options
    .map((option) => {
      const months =
        Number(option?.months ?? option?.durationMonths ?? option?.interval ?? option?.period ?? 0) || 0;
      if (!Number.isFinite(months) || months <= 0) {
        return null;
      }
      const amount = Number(option?.amount ?? option?.price ?? option?.total ?? 0) || 0;
      const intervalLabel =
        option?.intervalLabel ||
        option?.label ||
        (months === 1 ? 'Monthly' : months === 3 ? 'Quarterly' : months === 6 ? 'Biannual' : `${months} Months`);
      const planCode = option?.planCode || option?.code || option?.plan || null;
      return {
        months,
        amount,
        intervalLabel,
        planCode,
      };
    })
    .filter(Boolean);
};

const VendorRenewPlanScreen = ({ navigation }) => {
  const { user } = useAuth();
  const { popup } = usePaystack();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'info' });
  const [plan, setPlan] = useState(null);
  const [selectedDuration, setSelectedDuration] = useState(null);
  const [processingPayment, setProcessingPayment] = useState(false);
  const durationOptions = useMemo(
    () => (Array.isArray(plan?.durations) ? plan.durations : []),
    [plan]
  );
  const hasDurationOptions = durationOptions.length > 0;
  const selectedOption = useMemo(() => {
    if (!durationOptions.length) {
      return null;
    }
    const directMatch = durationOptions.find((option) => option.months === selectedDuration);
    return directMatch || durationOptions[0] || null;
  }, [durationOptions, selectedDuration]);

  const showToast = (message, type = 'success') => {
    setToast({ visible: true, message, type });
  };

  const hideToast = () => setToast({ ...toast, visible: false });

  const loadPlan = useCallback(async () => {
    try {
      if (!refreshing) {
        setLoading(true);
      }
      const response = await vendorAPI.getRenewPlan();
      const payload = response.data?.data || {};
      let durations = normaliseDurationOptions(payload.durationOptions || []);
      if (!durations.length) {
        const fallbackPreset = getPlanPreset(payload.slug || payload.planSlug || payload.planName || payload.plan);
        const fallbackDurations = normaliseDurationOptions(fallbackPreset?.durationOptions || []);
        durations = fallbackDurations;
      }
      setPlan({
        name: cleanPlanDisplayName(payload.planName || 'Current Plan'),
        badge: payload.planBadge || '',
        price: payload.monthlyPrice || 0,
        currency: payload.currency || 'NGN',
        expiresOn: payload.expiresOn || '',
        remainingListings: payload.remainingListings ?? null,
        contactEmail: payload.contactEmail || 'support@yustam.com.ng',
        vendorName: payload.vendorName || 'Yustam Vendor',
        slug: payload.slug || '',
        durations,
      });
      setSelectedDuration(durations[0]?.months || null);
    } catch (error) {
      console.error('Failed to load renewal plan', error);
      showToast(error.message || 'Unable to load renewal details', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [refreshing]);

  useEffect(() => {
    loadPlan();
  }, [loadPlan]);

  const onRefresh = () => {
    setRefreshing(true);
    loadPlan();
  };

  const handlePaystackSuccess = async (response, fallbackReference) => {
    try {
      const reference =
        response?.transactionRef?.reference ||
        response?.reference ||
        response?.transactionRef ||
        response?.trxref ||
        fallbackReference;
      if (!reference) {
        throw new Error('Missing payment reference.');
      }
      const verification = await vendorAPI.verifyPlanPayment(reference);
      if (verification.data?.success) {
        showToast('Renewal successful! Your plan has been updated.', 'success');
        await loadPlan();
      } else {
        showToast('Payment verified, but plan update failed.', 'error');
      }
    } catch (error) {
      showToast(error?.message || 'Unable to verify payment.', 'error');
    } finally {
      setProcessingPayment(false);
    }
  };

  const handlePaystackCancel = () => {
    setProcessingPayment(false);
    showToast('Renewal cancelled.', 'info');
  };

  const handleRenew = () => {
    if (!plan || !plan.slug) {
      showToast('Plan details are missing. Please refresh and try again.', 'error');
      return;
    }
    if (!popup?.checkout) {
      showToast('Payment module is not ready yet. Please try again shortly.', 'error');
      return;
    }
    if (!selectedOption) {
      if (!hasDurationOptions) {
        showToast('Renewal options are not available for this plan. Please contact support.', 'error');
        return;
      }
      showToast('Select a billing duration before renewing.', 'error');
      return;
    }
    if (!selectedOption?.planCode || !Number(selectedOption?.amount)) {
      showToast('This billing option is not available. Please pick another duration.', 'error');
      return;
    }
    if (!user?.email) {
      showToast('Please add an email address to your profile to continue.', 'error');
      return;
    }
    const vendorId = resolveVendorId(user);
    if (!vendorId) {
      showToast('We could not match your vendor profile. Please reload the app and try again.', 'error');
      return;
    }
    const reference = buildPlanReference(vendorId);
    try {
      setProcessingPayment(true);
      popup.checkout({
        email: user.email,
        amount: Number(selectedOption.amount),
        plan: selectedOption.planCode,
        reference,
        metadata: {
          vendor_id: vendorId,
          vendorId,
          vendor: `vendor:${vendorId}`,
          plan_slug: plan.slug,
          plan_code: selectedOption.planCode,
          duration_months: selectedOption.months,
          source: 'mobile-app',
        },
        onSuccess: (res) => handlePaystackSuccess(res, reference),
        onCancel: handlePaystackCancel,
      });
    } catch (error) {
      console.error('Paystack renewal error:', error);
      setProcessingPayment(false);
      showToast(error?.message || 'Unable to start payment. Please try again.', 'error');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => goBackOrNavigate(navigation)} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.emerald} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Renew Plan</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color={theme.colors.emerald} />
          <Text style={styles.loadingText}>Fetching your subscription...</Text>
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
        <Text style={styles.headerTitle}>Renew Plan</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.colors.emerald]}
            tintColor={theme.colors.emerald}
          />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
      >
        <View style={styles.planCard}>
          <Text style={styles.planLabel}>Current Plan</Text>
          <Text style={styles.planName}>{plan?.name}</Text>
          <Text style={styles.planPrice}>
            {formatNaira(plan?.price || selectedOption?.amount || 0)}
            {selectedOption ? ` / ${selectedOption.intervalLabel || 'month'}` : ''}
          </Text>
          <View style={styles.planMeta}>
            <Ionicons name="time-outline" size={18} color={theme.colors.textSecondary} />
            <Text style={styles.planMetaText}>
              Expires{' '}
              {plan?.expiresOn && !Number.isNaN(Date.parse(plan.expiresOn))
                ? new Date(plan.expiresOn).toDateString()
                : plan?.expiresOn || 'soon'}
            </Text>
          </View>
          {typeof plan?.remainingListings === 'number' && (
            <View style={styles.planMeta}>
              <Ionicons name="albums-outline" size={18} color={theme.colors.textSecondary} />
              <Text style={styles.planMetaText}>
                {plan.remainingListings} listings remaining this cycle
              </Text>
            </View>
          )}
        </View>

        {hasDurationOptions ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Renewal Options</Text>
            <View style={styles.durationSection}>
              {durationOptions.map((option) => {
                const isActive = selectedOption?.months === option.months;
                return (
                  <TouchableOpacity
                    key={`${plan?.slug || 'plan'}-${option.months}`}
                    style={[styles.durationOption, isActive && styles.durationOptionActive]}
                    onPress={() => setSelectedDuration(option.months)}
                  >
                    <View>
                      <Text style={[styles.durationLabel, isActive && styles.durationLabelActive]}>
                        {option.intervalLabel || `${option.months} month${option.months === 1 ? '' : 's'}`}
                      </Text>
                      <Text style={[styles.durationPrice, isActive && styles.durationPriceActive]}>
                        {formatNaira(option.amount)} total
                      </Text>
                    </View>
                    {isActive && (
                      <Ionicons name="checkmark-circle" size={20} color={theme.colors.emerald} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
            {selectedOption && (
              <Text style={styles.summaryText}>
                You'll pay {formatNaira(selectedOption.amount)} for{' '}
                {selectedOption.intervalLabel || `${selectedOption.months} months`}.
              </Text>
            )}
          </View>
        ) : (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Renewal Options</Text>
            <View style={styles.emptyDurationState}>
              <Ionicons name="alert-circle-outline" size={20} color={theme.colors.orange} />
              <View style={{ flex: 1 }}>
                <Text style={styles.emptyDurationTitle}>No billing options available</Text>
                <Text style={styles.emptyDurationText}>
                  We couldn't load renewal durations for this plan. Please contact support to renew manually.
                </Text>
              </View>
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Renewal Benefits</Text>
          {[
            'Keep your listings visible without interruptions',
            'Maintain your current ranking and insights',
            'Instant confirmation once payment is successful',
          ].map((benefit) => (
            <View key={benefit} style={styles.benefitRow}>
              <Ionicons name="checkmark-circle" size={18} color={theme.colors.emerald} />
              <Text style={styles.benefitText}>{benefit}</Text>
            </View>
          ))}
        </View>

        <Button
          variant="primary"
          size="large"
          fullWidth
          icon="sparkles-outline"
          onPress={handleRenew}
          loading={processingPayment}
          disabled={processingPayment || !selectedOption}
        >
          Proceed to Renew
        </Button>

        <View style={styles.supportCard}>
          <Text style={styles.supportTitle}>Need help with payment?</Text>
          <Text style={styles.supportText}>
            Email {plan?.contactEmail || 'support@yustam.com.ng'} or call our support line for
            assistance with your renewal.
          </Text>
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
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.white,
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
    gap: theme.spacing['2xl'],
  },
  loadingState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  planLabel: {
    fontFamily: theme.typography.fontFamily.interSemiBold,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  planName: {
    fontFamily: theme.typography.fontFamily.anton,
    fontSize: theme.typography.fontSize['2xl'],
    color: theme.colors.textPrimary,
  },
  planPrice: {
    fontFamily: theme.typography.fontFamily.anton,
    fontSize: theme.typography.fontSize.lg,
    color: theme.colors.orange,
  },
  planMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  planMetaText: {
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  durationSection: {
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
  emptyDurationState: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
    backgroundColor: `${theme.colors.orange}15`,
    borderRadius: theme.radius.lg,
    alignItems: 'flex-start',
  },
  emptyDurationTitle: {
    fontFamily: theme.typography.fontFamily.interSemiBold,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textPrimary,
  },
  emptyDurationText: {
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs / 2,
  },
  durationOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  durationOptionActive: {
    borderColor: theme.colors.emerald,
    backgroundColor: `${theme.colors.emerald}15`,
  },
  durationLabel: {
    fontFamily: theme.typography.fontFamily.interSemiBold,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textPrimary,
  },
  durationLabelActive: {
    color: theme.colors.emerald,
  },
  durationPrice: {
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  durationPriceActive: {
    color: theme.colors.emerald,
  },
  summaryText: {
    marginTop: theme.spacing.sm,
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
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
  supportCard: {
    backgroundColor: `${theme.colors.orange}15`,
    borderRadius: theme.radius['2xl'],
    padding: theme.spacing.lg,
    gap: theme.spacing.xs,
  },
  supportTitle: {
    fontFamily: theme.typography.fontFamily.interSemiBold,
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textPrimary,
  },
  supportText: {
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    lineHeight: theme.typography.lineHeight.relaxed * theme.typography.fontSize.sm,
  },
});

export default VendorRenewPlanScreen;
