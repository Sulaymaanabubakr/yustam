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
import Button from '../../components/Button';
import { vendorAPI } from '../../services/api';
import { goBackOrNavigate } from '../../utils/navigation';
import { formatNaira, formatDate } from '../../utils/formatters';
import { cleanPlanDisplayName } from '../../utils/subscription';

const BillingHistoryScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'info' });
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState({
    totalTransactions: 0,
    totalSpent: 0,
    lastPayment: null,
  });

  useEffect(() => {
    fetchBillingHistory();
  }, []);

  const parseAmount = (value) => {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === 'string') {
      const numeric = Number(value.replace(/[^0-9.]/g, ''));
      return Number.isNaN(numeric) ? 0 : numeric;
    }
    return 0;
  };

  const fetchBillingHistory = async () => {
    try {
      setLoading(true);
      const response = await vendorAPI.getBillingHistory();
      const apiPayload = response?.data?.data?.transactions;
      if (!response?.data?.success || !Array.isArray(apiPayload)) {
        throw new Error(response?.data?.message || 'No billing records found.');
      }

      const normalized = apiPayload.map((entry, index) => {
        const amount = parseAmount(entry?.amount ?? entry?.plan?.price ?? entry?.plan?.amount ?? 0);
        const status = String(entry?.status || 'completed').toLowerCase();
        const interval =
          entry?.plan?.intervalLabel ||
          entry?.intervalLabel ||
          (entry?.plan?.durationMonths ? `${entry.plan.durationMonths} months` : 'Monthly');
        return {
          id: entry?.id || entry?.reference || `txn-${index}`,
          plan: cleanPlanDisplayName(entry?.plan?.name || entry?.plan || 'Plan'),
          interval,
          amount,
          status,
          statusLabel: entry?.statusLabel || status.replace(/_/g, ' '),
          date: entry?.date || entry?.createdAt || entry?.startsAt || entry?.endsAt || new Date().toISOString(),
          reference: entry?.reference || entry?.id || `REF-${index}`,
          paymentMethod: entry?.paymentMethod || entry?.cardBrand || 'Card',
        };
      });

      const totalTransactions = normalized.length;
      const successStatuses = ['completed', 'success', 'active', 'paid'];
      const totalSpent = normalized.reduce(
        (sum, txn) => sum + (successStatuses.includes(txn.status) ? txn.amount : 0),
        0
      );
      setTransactions(normalized);
      setSummary({
        totalTransactions,
        totalSpent,
        lastPayment: normalized[0]?.date || null,
      });
    } catch (error) {
      console.error('Error fetching billing history:', error);
      setTransactions([]);
      setSummary({ totalTransactions: 0, totalSpent: 0, lastPayment: null });
      showToast(
        error.message || 'Billing history is not available right now. Please try again later.',
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchBillingHistory();
    setRefreshing(false);
  };

  const showToast = (message, type = 'success') => {
    setToast({ visible: true, message, type });
  };

  const hideToast = () => {
    setToast({ ...toast, visible: false });
  };

  const handleRenewPlan = () => {
    navigation.navigate('VendorRenewPlan');
  };

  const handleUpgradePlan = () => {
    navigation.navigate('Plans');
  };

  const formatDateLabel = (dateString) => formatDate(dateString);

  const formatAmount = (amount) => formatNaira(amount || 0);

  const getStatusColor = (status) => {
    switch (status.toLowerCase()) {
      case 'completed':
      case 'success':
      case 'active':
        return theme.colors.emerald;
      case 'pending':
      case 'processing':
        return theme.colors.orange;
      case 'failed':
      case 'cancelled':
        return theme.colors.red || '#D93025';
      default:
        return theme.colors.textSecondary;
    }
  };

  const TransactionCard = ({ transaction }) => (
    <View style={styles.transactionCard}>
      <View style={styles.transactionHeader}>
        <View style={styles.transactionLeft}>
          <Text style={styles.planName}>{transaction.plan}</Text>
          <Text style={styles.planInterval}>{transaction.interval}</Text>
        </View>
        <View style={styles.transactionAmountBlock}>
          <Text style={styles.amount}>{formatAmount(transaction.amount)}</Text>
          <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(transaction.status)}20` }]}>
            <Text style={[styles.statusText, { color: getStatusColor(transaction.status) }]}>
              {transaction.statusLabel}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.transactionDetails}>
        <View style={styles.detailRow}>
          <Ionicons name="calendar-outline" size={16} color={theme.colors.textSecondary} />
          <Text style={styles.detailText}>{formatDateLabel(transaction.date)}</Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="card-outline" size={16} color={theme.colors.textSecondary} />
          <Text style={styles.detailText}>{transaction.paymentMethod}</Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="receipt-outline" size={16} color={theme.colors.textSecondary} />
          <Text style={styles.detailText}>{transaction.reference}</Text>
        </View>
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => goBackOrNavigate(navigation)} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.emerald} />
          </TouchableOpacity>
          <Text style={styles.title}>Billing History</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.orange} />
          <Text style={styles.loadingText}>Loading transactions...</Text>
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
        <Text style={styles.title}>Billing History</Text>
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
        {/* Quick Actions */}
        <View style={styles.actionsContainer}>
          <Button
            title="Renew Plan"
            onPress={handleRenewPlan}
            variant="primary"
            icon="refresh-outline"
            style={styles.actionButton}
          />
          <Button
            title="Upgrade Plan"
            onPress={handleUpgradePlan}
            variant="outline"
            icon="arrow-up-outline"
            style={styles.actionButton}
          />
        </View>

        {/* Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Billing Summary</Text>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Total transactions</Text>
              <Text style={styles.summaryValue}>{summary.totalTransactions}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Total spent</Text>
              <Text style={styles.summaryValue}>{formatAmount(summary.totalSpent)}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Last payment</Text>
              <Text style={styles.summaryValue}>
                {summary.lastPayment ? formatDateLabel(summary.lastPayment) : 'Not yet'}
              </Text>
            </View>
          </View>
        </View>

        {/* Transactions List */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Payment History</Text>
          <Text style={styles.sectionSubtitle}>The most recent renewals and plan upgrades</Text>
        </View>

        {transactions.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="receipt-outline" size={64} color={theme.colors.textTertiary} />
            <Text style={styles.emptyText}>No payments yet</Text>
            <Text style={styles.emptySubtext}>
              Renew or upgrade your subscription to see payment details here.
            </Text>
          </View>
        ) : (
          <View style={styles.transactionsContainer}>
            {transactions.map((transaction) => (
              <TransactionCard key={transaction.id} transaction={transaction} />
            ))}
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
  actionsContainer: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.xl,
    gap: theme.spacing.base,
  },
  actionButton: {
    flex: 1,
  },
    summaryCard: {
      backgroundColor: theme.colors.white,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.lg,
      marginHorizontal: theme.spacing.lg,
      marginTop: theme.spacing.xl,
      gap: theme.spacing.base,
      ...theme.shadows.medium,
    },
    summaryTitle: {
      fontFamily: theme.typography.fontFamily.anton,
      fontSize: theme.typography.fontSize.lg,
      color: theme.colors.emerald,
      letterSpacing: theme.typography.letterSpacing.wide,
    },
    summaryGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.base,
    },
    summaryItem: {
      flexBasis: '48%',
      backgroundColor: theme.colors.background,
      borderRadius: theme.borderRadius.md,
      padding: theme.spacing.sm,
    },
    summaryLabel: {
      fontFamily: theme.typography.fontFamily.inter,
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.textSecondary,
      textTransform: 'uppercase',
    },
    summaryValue: {
      fontFamily: theme.typography.fontFamily.anton,
      fontSize: theme.typography.fontSize.lg,
      color: theme.colors.textPrimary,
      marginTop: theme.spacing.xs / 2,
    },
  section: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.xl,
    paddingBottom: theme.spacing.base,
  },
    sectionHeader: {
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing['2xl'],
      paddingBottom: theme.spacing.md,
      gap: theme.spacing.xs,
    },
  sectionTitle: {
    fontFamily: theme.typography.fontFamily.anton,
    fontSize: theme.typography.fontSize.xl,
    color: theme.colors.emerald,
    letterSpacing: theme.typography.letterSpacing.wide,
  },
  sectionSubtitle: {
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  transactionsContainer: {
    paddingHorizontal: theme.spacing.lg,
    gap: theme.spacing.base,
  },
    transactionCard: {
      backgroundColor: theme.colors.white,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.lg,
      ...theme.shadows.medium,
    },
    transactionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: theme.spacing.base,
    },
    transactionLeft: {
      flex: 1,
      gap: theme.spacing.xs,
    },
    transactionAmountBlock: {
      alignItems: 'flex-end',
      gap: theme.spacing.xs / 2,
    },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs / 2,
    borderRadius: theme.borderRadius.full,
  },
  statusText: {
    fontFamily: theme.typography.fontFamily.interSemiBold,
    fontSize: theme.typography.fontSize.xs,
    textTransform: 'uppercase',
    letterSpacing: theme.typography.letterSpacing.wide,
  },
    planName: {
      fontFamily: theme.typography.fontFamily.anton,
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.textPrimary,
      letterSpacing: theme.typography.letterSpacing.normal,
    },
    planInterval: {
      fontFamily: theme.typography.fontFamily.inter,
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.textSecondary,
    },
  amount: {
    fontFamily: theme.typography.fontFamily.anton,
    fontSize: theme.typography.fontSize['2xl'],
    color: theme.colors.orange,
    letterSpacing: theme.typography.letterSpacing.wide,
  },
  transactionDetails: {
    gap: theme.spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  detailText: {
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing['3xl'],
    paddingHorizontal: theme.spacing.xl,
    gap: theme.spacing.base,
  },
  emptyText: {
    fontFamily: theme.typography.fontFamily.interSemiBold,
    fontSize: theme.typography.fontSize.lg,
    color: theme.colors.textSecondary,
  },
  emptySubtext: {
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textTertiary,
    textAlign: 'center',
  },
  bottomPadding: {
    height: theme.spacing['2xl'],
  },
});

export default BillingHistoryScreen;
