import React, { useCallback, useEffect, useState } from 'react';
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
import * as WebBrowser from 'expo-web-browser';
import theme from '../../theme';
import { vendorAPI } from '../../services/api';
import Toast from '../../components/Toast';
import Button from '../../components/Button';
import { goBackOrNavigate } from '../../utils/navigation';
import { formatNaira } from '../../utils/formatters';

const VendorRenewPlanScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'info' });
  const [plan, setPlan] = useState(null);

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
      setPlan({
        name: payload.planName || 'Current Plan',
        badge: payload.planBadge || '',
        price: payload.monthlyPrice || 0,
        currency: payload.currency || 'NGN',
        expiresOn: payload.expiresOn || '',
        remainingListings: payload.remainingListings ?? null,
        contactEmail: payload.contactEmail || 'support@yustam.com.ng',
        vendorName: payload.vendorName || 'Yustam Vendor',
      });
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

  const handleRenew = async () => {
    if (!plan) {
      return;
    }
    try {
      showToast('Redirecting to secure checkout...', 'info');
      await WebBrowser.openBrowserAsync('https://paystack.com/pay/yustam-plan');
    } catch (error) {
      showToast('Unable to open checkout. Please try again.', 'error');
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
          <Text style={styles.planPrice}>{formatNaira(plan?.price || 0)}/month</Text>
          <View style={styles.planMeta}>
            <Ionicons name="time-outline" size={18} color={theme.colors.textSecondary} />
            <Text style={styles.planMetaText}>
              Expires {plan?.expiresOn ? new Date(plan.expiresOn).toDateString() : 'soon'}
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
