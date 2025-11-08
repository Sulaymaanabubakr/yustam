import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import theme from '../../theme';
import Toast from '../../components/Toast';
import Button from '../../components/Button';
import { API_BASE_URL } from '../../config/constants';
import { vendorAPI } from '../../services/api';
import { formatNumber } from '../../utils/formatters';
import * as WebBrowser from 'expo-web-browser';

const DEFAULT_PLANS = [
  {
    slug: 'free',
    name: 'Free',
    price: 0,
    duration: 'Forever',
    listings: 5,
    features: [
      '5 Active Listings',
      'Basic Support',
      'Standard Visibility',
      'No Featured Listings',
    ],
    color: '#757575',
  },
  {
    slug: 'basic',
    name: 'Basic',
    price: 5000,
    duration: 'Monthly',
    listings: 20,
    features: [
      '20 Active Listings',
      'Priority Support',
      'Enhanced Visibility',
      '2 Featured Listings',
      'Basic Analytics',
    ],
    color: '#1976D2',
    popular: false,
  },
  {
    slug: 'premium',
    name: 'Premium',
    price: 12000,
    duration: 'Monthly',
    listings: 50,
    features: [
      '50 Active Listings',
      '24/7 Priority Support',
      'Maximum Visibility',
      '10 Featured Listings',
      'Advanced Analytics',
      'Verification Badge',
    ],
    color: '#F3731E',
    popular: true,
  },
  {
    slug: 'professional',
    name: 'Professional',
    price: 25000,
    duration: 'Monthly',
    listings: 150,
    features: [
      '150 Active Listings',
      'Dedicated Account Manager',
      'Premium Visibility',
      'Unlimited Featured Listings',
      'Full Analytics Suite',
      'Verified & Trusted Badge',
      'API Access',
      'Custom Storefront',
    ],
    color: '#9C27B0',
    popular: false,
  },
];

const PlansScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [plans, setPlans] = useState(DEFAULT_PLANS);
  const [currentPlan, setCurrentPlan] = useState('free');
  const [paystackKey, setPaystackKey] = useState('');
  const [processingPlan, setProcessingPlan] = useState(null);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'info' });

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
      const normalizedPlans = Object.entries(catalog).map(([slug, definition]) => {
        const monthly = definition?.durations?.['1'] || definition?.durations?.[1] || {};
        const fallback = DEFAULT_PLANS.find((plan) => plan.slug === slug) || {};
        return {
          slug,
          name: definition.displayName || definition.name || fallback.name || getPlanLabel(slug),
          price: monthly.amount || definition.monthlyPrice || fallback.price || 0,
          duration: monthly.intervalLabel || definition.durationLabel || fallback.duration || 'Monthly',
          listings: definition.listings || definition.listingLimit || fallback.listings || 0,
          features: definition.features || fallback.features || [],
          color: fallback.color || '#F3731E',
          popular: definition.popular ?? fallback.popular ?? slug === 'premium',
          paystackCode: monthly.planCode || null,
        };
      });

      normalizedPlans.sort((a, b) => (a.price || 0) - (b.price || 0));

      const subscription = payload.subscription || payload.currentPlan || {};
      const slugRaw = (subscription.slug || subscription.planName || subscription.planSlug || 'free')
        .toLowerCase()
        .replace('-plan', '');

      setPlans(normalizedPlans.length ? normalizedPlans : DEFAULT_PLANS);
      setCurrentPlan(slugRaw);
      setPaystackKey(payload.paystackKey || '');
    } catch (error) {
      console.error('Error loading plans:', error);
      setPlans(DEFAULT_PLANS);
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

  const handleSelectPlan = (plan) => {
    if (plan.slug === currentPlan) {
      showToast('This is your current plan', 'info');
      return;
    }

    if (!paystackKey) {
      showToast('Payment configuration is not available yet. Please try again shortly.', 'error');
      return;
    }

    const openCheckout = async () => {
      try {
        setProcessingPlan(plan.slug);
        const checkoutUrl = `${API_BASE_URL}/vendor-renew-plan.php?plan=${encodeURIComponent(plan.slug)}`;
        await WebBrowser.openBrowserAsync(checkoutUrl);
        showToast('Complete the payment in your browser and return to refresh your plan.', 'info');
        await loadPlans();
      } catch (error) {
        console.error('Plan selection error:', error);
        showToast(error.message || 'Unable to open payment page right now.', 'error');
      } finally {
        setProcessingPlan(null);
      }
    };

    openCheckout();
  };

  const getPlanLabel = (slug) =>
    slug ? slug.replace(/-/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase()) : 'Free';

  const PlanCard = ({ plan, isCurrentPlan }) => {
    const priceLabel = formatNumber(plan.price || 0);

    return (
      <View style={[styles.planCard, isCurrentPlan && styles.planCardCurrent]}>
        {plan.popular && (
          <View style={styles.popularBadge}>
            <Text style={styles.popularText}>MOST POPULAR</Text>
          </View>
        )}
        
        <View style={styles.planHeader}>
          <View style={[styles.planIcon, { backgroundColor: `${plan.color}20` }]}>
            <Ionicons
              name={
                plan.slug === 'free' ? 'cube-outline' :
                plan.slug === 'basic' ? 'rocket-outline' :
                plan.slug === 'premium' ? 'star-outline' :
                'trophy-outline'
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
          <Text style={styles.currency}>₦</Text>
          <Text style={styles.price}>{priceLabel}</Text>
          <Text style={styles.duration}>/{plan.duration}</Text>
        </View>

        <View style={styles.listingsInfo}>
          <Ionicons name="list-outline" size={20} color={theme.colors.textSecondary} />
          <Text style={styles.listingsText}>{plan.listings} Active Listings</Text>
        </View>

        <View style={styles.featuresContainer}>
          {(Array.isArray(plan.features) ? plan.features : []).map((feature, index) => (
            <View key={`${plan.slug}-${feature}-${index}`} style={styles.featureRow}>
              <Ionicons name="checkmark-circle" size={20} color={theme.colors.success} />
              <Text style={styles.featureText}>{feature}</Text>
            </View>
          ))}
        </View>

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
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
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
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
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
        <View style={styles.subscriptionSummary}>
          <Text style={styles.subscriptionSummaryText}>
            Current Plan: {getPlanLabel(currentPlan)}
          </Text>
          <Button
            variant="outline"
            size="small"
            icon="information-circle-outline"
            onPress={() => navigation.navigate('SubscriptionDetails')}
          >
            View Details
          </Button>
        </View>
      </View>

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
