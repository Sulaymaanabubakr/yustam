import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import theme from '../../theme';
import Toast from '../../components/Toast';
import Button from '../../components/Button';
import { API_BASE_URL } from '../../config/constants';
import { vendorAPI } from '../../services/api';
import { goBackOrNavigate } from '../../utils/navigation';
import { formatNumber, formatNaira } from '../../utils/formatters';
import { DEFAULT_VENDOR_PLANS, getPlanPreset } from '../../data/vendorPlans';
import { WebView } from 'react-native-webview';

const BILLING_LABELS = {
  1: 'Monthly',
  3: 'Quarterly',
  6: 'Biannual',
  12: 'Annual',
};

const DEFAULT_DISCOUNT_MAP = {
  3: 0.07,
  6: 0.12,
  12: 0.17,
};
const getDurationLabel = (months, fallback = 'Custom') => {
  if (!Number.isFinite(months)) {
    return fallback;
  }
  return BILLING_LABELS[months] || fallback || `${months}-Month`;
};

const getDiscountPercent = (discountMap = {}, months) => {
  if (!months) {
    return 0;
  }
  const explicit = discountMap[months] ?? discountMap[String(months)];
  if (explicit !== undefined) {
    const parsed = Number(explicit);
    return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed * 100) : 0;
  }
  return 0;
};

const PlansScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [plans, setPlans] = useState(DEFAULT_VENDOR_PLANS);
  const [currentPlan, setCurrentPlan] = useState('free');
  const [selectedDurations, setSelectedDurations] = useState({});
  const [toast, setToast] = useState({ visible: false, message: '', type: 'info' });
  const [currentPlanInfo, setCurrentPlanInfo] = useState(null);
  const [discounts, setDiscounts] = useState(DEFAULT_DISCOUNT_MAP);
  const [processingPlan, setProcessingPlan] = useState(null);
  const [checkoutState, setCheckoutState] = useState({ visible: false, url: '', planName: '' });

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    try {
      setLoading(true);
      const response = await vendorAPI.getPlans();
      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Unable to load plans right now.');
      }

      const payload = response.data?.data || {};
      const catalog = payload.plans || {};
      const currency = payload.currency || 'NGN';
      const currencySymbol = payload.currencySymbol || (currency === 'NGN' ? '₦' : currency);
      const normalizedPlans = Object.entries(catalog).map(([slug, definition]) => {
        const fallback = getPlanPreset(slug);
        const durationOptions = Object.entries(definition?.durations || {})
          .map(([months, option]) => {
            const numericMonths = Number(months);
            if (!Number.isFinite(numericMonths) || numericMonths <= 0) {
              return null;
            }
            return {
              months: numericMonths,
              amount: Number(option?.amount) || 0,
              intervalLabel: option?.intervalLabel || getDurationLabel(numericMonths),
              planCode: option?.planCode || option?.code || null,
            };
          })
          .filter(Boolean)
          .sort((a, b) => a.months - b.months);

        const resolvedDurations =
          durationOptions.length > 0
            ? durationOptions
            : [
                {
                  months: 1,
                  amount: fallback.price || 0,
                  intervalLabel: fallback.duration || 'Monthly',
                  planCode: null,
                },
              ];
        const primaryDuration =
          resolvedDurations.find((option) => option.months === 1) || resolvedDurations[0] || {};

        return {
          slug,
          name: definition.displayName || definition.name || fallback.name || getPlanLabel(slug),
          price:
            primaryDuration?.amount ||
            definition.monthlyPrice ||
            fallback.price ||
            0,
          duration: primaryDuration?.intervalLabel || fallback.duration || 'Monthly',
          listings: definition.listings || definition.listingLimit || fallback.listings || 0,
          features: definition.features || fallback.features || [],
          color: fallback.color || '#F3731E',
          popular: definition.popular ?? fallback.popular ?? slug === 'pro',
          paystackCode: primaryDuration?.planCode || null,
          durationOptions: resolvedDurations,
          currency,
          currencySymbol,
        };
      });

      normalizedPlans.sort((a, b) => (a.price || 0) - (b.price || 0));

      const subscription = payload.subscription || payload.currentPlan || {};
      const slugRaw = (subscription.slug || subscription.planName || subscription.planSlug || 'free')
        .toLowerCase()
        .replace('-plan', '');

      let resolvedPlans = normalizedPlans.length ? normalizedPlans : DEFAULT_VENDOR_PLANS;
      if (!resolvedPlans.some((plan) => plan.slug === 'free')) {
        const freePreset = getPlanPreset('free');
        resolvedPlans = [
          {
            ...freePreset,
            durationOptions: Array.isArray(freePreset.durationOptions)
              ? [...freePreset.durationOptions]
              : [{ months: 1, amount: 0, intervalLabel: 'Monthly' }],
          },
          ...resolvedPlans,
        ];
      }

      setPlans(resolvedPlans);
      setSelectedDurations((prev) => {
        const next = { ...prev };
        resolvedPlans.forEach((plan) => {
          const options = Array.isArray(plan.durationOptions) ? plan.durationOptions : [];
          const availableMonths = options.map((option) => option.months);
          if (!availableMonths.length) {
            next[plan.slug] = 1;
            return;
          }
          if (!availableMonths.includes(next[plan.slug])) {
            next[plan.slug] = availableMonths[0];
          }
        });
        return next;
      });
      setCurrentPlan(slugRaw);
      setDiscounts(Object.keys(payload.discounts || {}).length ? payload.discounts : DEFAULT_DISCOUNT_MAP);
      const summary = payload.currentPlan || {};
      setCurrentPlanInfo({
        name: summary.displayName || summary.name || getPlanLabel(slugRaw),
        status: summary.status || subscription.statusLabel || 'Active',
        expiry: summary.expiryDisplay || summary.nextBillingDisplay || '--',
        notice: summary.notice || subscription.notice || '',
      });
    } catch (error) {
      console.error('Error loading plans:', error);
      setPlans(DEFAULT_VENDOR_PLANS);
      setSelectedDurations(() => {
        const defaults = {};
        DEFAULT_VENDOR_PLANS.forEach((plan) => {
          const fallbackOption = plan.durationOptions?.[0];
          defaults[plan.slug] = fallbackOption?.months || 1;
        });
        return defaults;
      });
      setDiscounts(DEFAULT_DISCOUNT_MAP);
      showToast(error.message || 'Failed to load plans', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPlans();
  };

  const showToast = (message, type = 'success') => {
    setToast({ visible: true, message, type });
  };

  const hideToast = () => {
    setToast({ ...toast, visible: false });
  };

  const handleSelectPlan = async (plan) => {
    if (plan.slug === currentPlan) {
      showToast('This is your current plan', 'info');
      return;
    }

    const selectedMonths =
      selectedDurations[plan.slug] ||
      plan.durationOptions?.[0]?.months ||
      1;

    const durationOptions = Array.isArray(plan.durationOptions) ? plan.durationOptions : [];
    const chosenOption =
      durationOptions.find((option) => option.months === selectedMonths) ||
      durationOptions[0];

    if (!chosenOption) {
      showToast('This plan is currently unavailable. Please try again later.', 'error');
      return;
    }

    try {
      setProcessingPlan(plan.slug);
      const response = await vendorAPI.createPlanCheckout(plan.slug, selectedMonths);
      const checkout = response.data?.checkout ?? response.data;
      if (!checkout?.authorizationUrl) {
        throw new Error('Unable to obtain checkout link.');
      }
      setCheckoutState({
        visible: true,
        url: checkout.authorizationUrl,
        planName: `${plan.name} · ${chosenOption.intervalLabel || getDurationLabel(chosenOption.months)}`,
      });
    } catch (error) {
      console.error('Plan selection error:', error);
      showToast(
        error?.response?.data?.message ||
          error.message ||
          'Unable to open payment page right now.',
        'error',
      );
    } finally {
      setProcessingPlan(null);
    }
  };

  const closeCheckout = () => {
    setCheckoutState({ visible: false, url: '', planName: '' });
    loadPlans();
  };

  const handleDurationChange = (planSlug, months) => {
    setSelectedDurations((prev) => ({
      ...prev,
      [planSlug]: months,
    }));
  };

  const getPlanLabel = (slug) => getPlanPreset(slug)?.name || 'Free Plan';

  const PlanCard = ({ plan, isCurrentPlan }) => {
    const formattedPrice = formatNaira(plan.price || 0);
    const listingLabel =
      Number(plan.listings) > 0
        ? `${formatNumber(plan.listings)} Active Listings`
        : 'Unlimited Listings';
    const durationOptions = Array.isArray(plan.durationOptions) ? plan.durationOptions : [];
    const selectedMonths =
      selectedDurations[plan.slug] ||
      durationOptions[0]?.months ||
      1;
    const selectedOption =
      durationOptions.find((option) => option.months === selectedMonths) || durationOptions[0] || null;

    const resolveDiscount = (option) => {
      const explicit = getDiscountPercent(discounts, option.months);
      if (explicit > 0) {
        return explicit;
      }
      const baseline = (plan.price || 0) * (option.months || 1);
      if (!baseline) {
        return 0;
      }
      const computed = 1 - (Number(option.amount) || 0) / baseline;
      return computed > 0 ? Math.round(computed * 100) : 0;
    };

    return (
      <View style={[styles.planCard, isCurrentPlan && styles.planCardCurrent]}>
        <>
          {plan.popular && (
            <View style={styles.popularBadge}>
              <Text style={styles.popularText}>MOST POPULAR</Text>
            </View>
          )}
          <View style={styles.planHeader}>
            <View style={[styles.planIcon, { backgroundColor: `${plan.color}20` }] }>
              <Ionicons
                name={
                  plan.slug === 'free'
                    ? 'cube-outline'
                    : plan.slug === 'starter'
                    ? 'rocket-outline'
                    : plan.slug === 'pro'
                    ? 'star-outline'
                    : 'trophy-outline'
                }
                size={32}
                color={plan.color}
              />
            </View>
            <View style={styles.planTitleContainer}>
              <Text style={styles.planName}>{plan.name}</Text>
              {isCurrentPlan && (
                <View style={styles.currentBadge}>
                  <Text style={styles.currentText}>Current Plan</Text>
                </View>
              )}
            </View>
          </View>
          <View style={styles.priceContainer}>
            <Text style={styles.price}>{formattedPrice}</Text>
            <Text style={styles.duration}>/{plan.duration}</Text>
          </View>
          <View style={styles.listingsInfo}>
            <Ionicons name="list-outline" size={20} color={theme.colors.textSecondary} />
            <Text style={styles.listingsText}>{listingLabel}</Text>
          </View>
          <View style={styles.featuresContainer}>
            {(Array.isArray(plan.features) ? plan.features : []).map((feature, index) => (
              <View key={`${plan.slug}-${feature}-${index}`} style={styles.featureRow}>
                <Ionicons name="checkmark-circle" size={20} color={theme.colors.success} />
                <Text style={styles.featureText}>{feature}</Text>
              </View>
            ))}
          </View>
          {durationOptions.length > 0 && (
            <View style={styles.durationExtras}>
              {durationOptions.map((option) => {
                const isSelected = option.months === selectedMonths;
                const discountPercent = resolveDiscount(option);
                return (
                  <TouchableOpacity
                    key={`${plan.slug}-${option.months}`}
                    style={[styles.durationPill, isSelected && styles.durationPillActive]}
                    onPress={() => handleDurationChange(plan.slug, option.months)}
                    activeOpacity={0.85}
                  >
                    <View style={styles.durationPillTextGroup}>
                      <Text style={[styles.durationPillLabel, isSelected && styles.durationPillLabelActive]}>
                        {option.intervalLabel || getDurationLabel(option.months)}
                      </Text>
                      <Text style={[styles.durationPillPrice, isSelected && styles.durationPillPriceActive]}>
                        {formatNaira(option.amount)} total
                      </Text>
                    </View>
                    {discountPercent > 0 && (
                      <View style={styles.durationDiscountBadge}>
                        <Text style={styles.durationDiscountText}>Save {discountPercent}%</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
          {selectedOption && (
            <View style={styles.selectionSummary}>
              <Text style={styles.selectionSummaryText}>
                {`Billing ${selectedOption.intervalLabel || getDurationLabel(selectedOption.months)} · ${formatNaira(selectedOption.amount)} total`}
              </Text>
            </View>
          )}
          <Button
            onPress={() => handleSelectPlan(plan)}
            disabled={isCurrentPlan || processingPlan === plan.slug}
            loading={processingPlan === plan.slug}
            variant={plan.popular ? 'secondary' : 'primary'}
            size="large"
            fullWidth
            icon="sparkles-outline"
            style={[
              styles.selectButton,
              isCurrentPlan && styles.selectButtonDisabled,
              plan.popular && !isCurrentPlan && styles.selectButtonPopular,
            ]}
          >
            {isCurrentPlan
              ? 'Current Plan'
              : plan.slug === 'free'
              ? 'Downgrade'
              : currentPlan === 'free'
              ? 'Upgrade'
              : 'Change Plan'}
          </Button>
        </>
      </View>
    );
  };

  const discountEntries = Object.entries(discounts || {})
    .map(([key, value]) => ({
      months: Number(key),
      rate: Number(value),
    }))
    .filter(({ months, rate }) => Number.isFinite(months) && months > 1 && Number.isFinite(rate) && rate > 0)
    .sort((a, b) => a.months - b.months);


  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => goBackOrNavigate(navigation)} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>PLANS & PRICING</Text>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading plans...</Text>
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
        onDismiss={hideToast}
      />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => goBackOrNavigate(navigation)} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>PLANS & PRICING</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
      >
        {/* Intro Section */}
        <View style={styles.introSection}>
          <Text style={styles.introTitle}>Choose Your Plan</Text>
          <Text style={styles.introText}>
            Select the perfect plan for your business. Upgrade or downgrade anytime.
          </Text>
        </View>

        {currentPlanInfo && (
          <View style={styles.summaryCard}>
            <View style={styles.summaryHeader}>
              <Text style={styles.summaryLabel}>Current Plan</Text>
              <View
                style={[
                  styles.summaryStatusBadge,
                  (currentPlanInfo.status || '').toLowerCase().includes('active')
                    ? styles.summaryStatusActive
                    : styles.summaryStatusWarning,
                ]}
              >
                <Text style={styles.summaryStatusText}>{currentPlanInfo.status || 'Active'}</Text>
              </View>
            </View>
            <Text style={styles.summaryPlanName}>{currentPlanInfo.name}</Text>
            <Text style={styles.summaryMeta}>Renews: {currentPlanInfo.expiry || '--'}</Text>
            {currentPlanInfo.notice ? (
              <View style={styles.summaryNotice}>
                <Ionicons name="information-circle-outline" size={18} color={theme.colors.accent} />
                <Text style={styles.summaryNoticeText}>{currentPlanInfo.notice}</Text>
              </View>
            ) : null}
          </View>
        )}

        <View style={styles.subscriptionSummary}>
          <Text style={styles.subscriptionSummaryText}>
            Current Plan: {currentPlanInfo?.name || getPlanLabel(currentPlan)}
          </Text>
          <Button
            variant="outline"
            size="small"
            icon="settings-outline"
            onPress={() => navigation.navigate('VendorManageSubscription')}
          >
            Manage Subscription
          </Button>
        </View>

        {discountEntries.length > 0 && (
          <View style={styles.discountCard}>
            <Text style={styles.discountTitle}>Long-term savings</Text>
            {discountEntries.map(({ months, rate }) => {
              const percent = Math.round(rate * 100);
              return (
                <View key={`discount-${months}`} style={styles.discountRow}>
                  <View style={styles.discountDot} />
                  <Text style={styles.discountText}>
                    Save {percent}% when billed {getDurationLabel(months)}
                  </Text>
                </View>
              );
            })}
          </View>
        )}

        {/* Plans Grid */}
        {plans.map((plan) => (
          <PlanCard
            key={plan.slug}
            plan={plan}
            isCurrentPlan={plan.slug === currentPlan}
          />
        ))}

        {/* Info Section */}
        <View style={styles.infoSection}>
          <View style={styles.infoCard}>
            <Ionicons name="shield-checkmark-outline" size={24} color={theme.colors.success} />
            <Text style={styles.infoText}>
              All plans include secure payment processing and customer support
            </Text>
          </View>

          <View style={styles.infoCard}>
            <Ionicons name="refresh-outline" size={24} color={theme.colors.accent} />
            <Text style={styles.infoText}>
              Cancel or change your plan anytime. No hidden fees.
            </Text>
          </View>
        </View>
      </ScrollView>

      <Modal
        animationType="slide"
        transparent
        visible={checkoutState.visible}
        onRequestClose={closeCheckout}
      >
        <View style={styles.checkoutBackdrop}>
          <View style={styles.checkoutContainer}>
            <View style={styles.checkoutHeader}>
              <Text style={styles.checkoutTitle}>
                {checkoutState.planName || 'Complete Payment'}
              </Text>
              <TouchableOpacity onPress={closeCheckout} style={styles.checkoutClose}>
                <Ionicons name="close" size={22} color={theme.colors.textPrimary} />
              </TouchableOpacity>
            </View>
            {checkoutState.url ? (
              <WebView
                style={styles.checkoutWebview}
                source={{ uri: checkoutState.url }}
                startInLoadingState
              />
            ) : (
              <View style={styles.checkoutFallback}>
                <ActivityIndicator color={theme.colors.primary} />
                <Text style={styles.checkoutFallbackText}>Preparing checkout…</Text>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.base,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    padding: theme.spacing.xs,
  },
  headerTitle: {
    fontFamily: theme.typography.fontFamilyHeading,
    fontSize: theme.typography.sizes.xl,
    color: theme.colors.primary,
    letterSpacing: 0.5,
  },
  headerRight: {
    width: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: theme.spacing.md,
    fontFamily: theme.typography.fontFamilyBody,
    fontSize: theme.typography.sizes.base,
    color: theme.colors.textSecondary,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: theme.spacing.md,
  },
  introSection: {
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  subscriptionSummary: {
    width: '100%',
    marginTop: theme.spacing.lg,
    gap: theme.spacing.sm,
    alignItems: 'center',
  },
  subscriptionSummaryText: {
    fontFamily: theme.typography.fontFamily.interMedium,
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textPrimary,
  },
  summaryCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    gap: theme.spacing.sm,
    ...theme.shadows.medium,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontFamily: theme.typography.fontFamily.interSemiBold,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  summaryStatusBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.full,
  },
  summaryStatusActive: {
    backgroundColor: `${theme.colors.success}20`,
  },
  summaryStatusWarning: {
    backgroundColor: theme.colors.orangeLight || `${theme.colors.accent}20`,
  },
  summaryStatusText: {
    fontFamily: theme.typography.fontFamily.interSemiBold,
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textPrimary,
    textTransform: 'uppercase',
  },
  summaryPlanName: {
    fontFamily: theme.typography.fontFamilyHeading,
    fontSize: theme.typography.sizes.xl,
    color: theme.colors.textPrimary,
  },
  summaryMeta: {
    fontFamily: theme.typography.fontFamilyBody,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
  },
  summaryNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    backgroundColor: theme.colors.beige,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.sm,
  },
  summaryNoticeText: {
    flex: 1,
    fontFamily: theme.typography.fontFamilyBody,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textPrimary,
  },
  discountCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    gap: theme.spacing.sm,
    ...theme.shadows.soft,
  },
  discountTitle: {
    fontFamily: theme.typography.fontFamily.interSemiBold,
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textPrimary,
  },
  discountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  discountDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.accent,
  },
  discountText: {
    flex: 1,
    fontFamily: theme.typography.fontFamilyBody,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
  },
  introTitle: {
    fontFamily: theme.typography.fontFamilyHeading,
    fontSize: theme.typography.sizes['2xl'],
    color: theme.colors.primary,
    marginBottom: theme.spacing.sm,
    letterSpacing: 0.5,
  },
  introText: {
    fontFamily: theme.typography.fontFamilyBody,
    fontSize: theme.typography.sizes.base,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  planCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.xl,
    marginBottom: theme.spacing.lg,
    ...theme.shadows.medium,
    position: 'relative',
  },
  planCardCurrent: {
    borderWidth: 2,
    borderColor: theme.colors.success,
  },
  popularBadge: {
    position: 'absolute',
    top: -12,
    alignSelf: 'center',
    backgroundColor: theme.colors.accent,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.full,
  },
  popularText: {
    fontFamily: theme.typography.fontFamilyBody,
    fontSize: theme.typography.sizes.xs,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  planIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.base,
  },
  planTitleContainer: {
    flex: 1,
  },
  planName: {
    fontFamily: theme.typography.fontFamilyHeading,
    fontSize: theme.typography.sizes.xl,
    color: theme.colors.textPrimary,
    letterSpacing: 0.5,
  },
  currentBadge: {
    marginTop: theme.spacing.xs,
    alignSelf: 'flex-start',
    backgroundColor: `${theme.colors.success}20`,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.sm,
  },
  currentText: {
    fontFamily: theme.typography.fontFamilyBody,
    fontSize: theme.typography.sizes.xs,
    fontWeight: '600',
    color: theme.colors.success,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: theme.spacing.md,
  },
  currency: {
    fontFamily: theme.typography.fontFamilyBody,
    fontSize: theme.typography.sizes.lg,
    fontWeight: '700',
    color: theme.colors.accent,
  },
  price: {
    fontFamily: theme.typography.fontFamilyBody,
    fontSize: theme.typography.sizes['3xl'],
    fontWeight: '700',
    color: theme.colors.accent,
  },
  duration: {
    fontFamily: theme.typography.fontFamilyBody,
    fontSize: theme.typography.sizes.base,
    color: theme.colors.textSecondary,
    marginLeft: theme.spacing.xs,
  },
  listingsInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.beige,
    paddingHorizontal: theme.spacing.base,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  listingsText: {
    fontFamily: theme.typography.fontFamilyBody,
    fontSize: theme.typography.sizes.base,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  featuresContainer: {
    marginBottom: theme.spacing.lg,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  featureText: {
    flex: 1,
    fontFamily: theme.typography.fontFamilyBody,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textPrimary,
  },
  durationExtras: {
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
  },
  durationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.beige,
    borderWidth: 1,
    borderColor: '#E8DED3',
    gap: theme.spacing.sm,
  },
  durationPillActive: {
    borderColor: theme.colors.accent,
    backgroundColor: `${theme.colors.accent}20`,
  },
  durationPillTextGroup: {
    flex: 1,
  },
  durationPillLabel: {
    fontFamily: theme.typography.fontFamily.interSemiBold,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textPrimary,
  },
  durationPillLabelActive: {
    color: theme.colors.accent,
  },
  durationPillPrice: {
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  durationPillPriceActive: {
    color: theme.colors.accent,
  },
  durationDiscountBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.full,
    backgroundColor: `${theme.colors.accent}20`,
  },
  durationDiscountText: {
    fontFamily: theme.typography.fontFamily.interSemiBold,
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.accent,
  },
  selectionSummary: {
    backgroundColor: theme.colors.beige,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.lg,
  },
  selectionSummaryText: {
    fontFamily: theme.typography.fontFamilyBody,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textPrimary,
  },
  checkoutBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  checkoutContainer: {
    width: '100%',
    maxHeight: '90%',
    backgroundColor: '#FFFFFF',
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    ...theme.shadows.large,
  },
  checkoutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#EFEFEF',
  },
  checkoutTitle: {
    flex: 1,
    fontFamily: theme.typography.fontFamilyHeading,
    fontSize: theme.typography.sizes.lg,
    color: theme.colors.textPrimary,
  },
  checkoutClose: {
    padding: theme.spacing.xs,
    marginLeft: theme.spacing.sm,
  },
  checkoutWebview: {
    flex: 1,
  },
  checkoutFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.lg,
  },
  checkoutFallbackText: {
    marginTop: theme.spacing.sm,
    fontFamily: theme.typography.fontFamilyBody,
    color: theme.colors.textSecondary,
  },
  selectButton: {
    marginTop: theme.spacing.sm,
  },
  selectButtonDisabled: {
    opacity: 0.6,
  },
  selectButtonPopular: {
    backgroundColor: theme.colors.accent,
  },
  infoSection: {
    marginTop: theme.spacing.xl,
    gap: theme.spacing.md,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    gap: theme.spacing.base,
    ...theme.shadows.small,
  },
  infoText: {
    flex: 1,
    fontFamily: theme.typography.fontFamilyBody,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textPrimary,
    lineHeight: 20,
  },
});

export default PlansScreen;
