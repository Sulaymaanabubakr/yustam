import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import theme from '../../theme';
import Toast from '../../components/Toast';
import Button from '../../components/Button';
import { vendorAPI } from '../../services/api';
import { formatNaira, timeAgo } from '../../utils/formatters';

const DEFAULT_SUMMARY = {
  balance: 0,
  lifetimeEarned: 0,
  lifetimeRedeemed: 0,
  updatedAt: null,
  lastEarnedAt: null,
  lastRedeemedAt: null,
  meta: null,
};

const extractSummary = (payload = {}) => {
  const base = payload?.summary ?? payload?.data?.summary ?? payload ?? {};
  return {
    ...DEFAULT_SUMMARY,
    ...base,
  };
};

const extractLedger = (payload = {}) => {
  const list = payload?.ledger ?? payload?.data?.ledger ?? payload?.data ?? payload ?? [];
  if (!Array.isArray(list)) {
    return [];
  }
  return list.map((item) => ({ ...item }));
};

const resolveLedgerKey = (item, index) => {
  if (!item) {
    return `ledger-${index}`;
  }
  return item.id || item.reference || `${item.type || 'entry'}-${item.timestamp || item.createdAt || index}`;
};

const resolveLedgerAmount = (item) => {
  const amount = Number(item?.amount ?? item?.points ?? 0);
  return Number.isNaN(amount) ? 0 : amount;
};

const resolveLedgerType = (item) => {
  const raw = (item?.type || item?.action || '').toString().toLowerCase();
  if (raw.includes('redeem') || raw.includes('debit')) {
    return 'redeem';
  }
  if (raw.includes('earn') || raw.includes('credit')) {
    return 'earn';
  }
  return raw || 'activity';
};

const describeLedgerType = (item) => {
  const kind = resolveLedgerType(item);
  if (kind === 'earn') {
    return 'Reward earned';
  }
  if (kind === 'redeem') {
    return 'Redeemed';
  }
  return item?.title || item?.description || 'Activity';
};

const resolveLedgerTimestamp = (item) => item?.timestamp || item?.createdAt || item?.created_at || item?.date;

const VendorRewardsScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [summary, setSummary] = useState(DEFAULT_SUMMARY);
  const [ledger, setLedger] = useState([]);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'info' });
  const [error, setError] = useState('');
  const [redeemVisible, setRedeemVisible] = useState(false);
  const [redeemAmount, setRedeemAmount] = useState('');
  const [redeemNotes, setRedeemNotes] = useState('');
  const [submittingRedeem, setSubmittingRedeem] = useState(false);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ visible: true, message, type });
  }, []);

  const hideToast = useCallback(() => {
    setToast((prev) => ({ ...prev, visible: false }));
  }, []);

  const formattedBalance = useMemo(() => formatNaira(summary.balance || 0), [summary.balance]);
  const formattedLifetimeEarned = useMemo(() => formatNaira(summary.lifetimeEarned || 0), [summary.lifetimeEarned]);
  const formattedLifetimeRedeemed = useMemo(
    () => formatNaira(summary.lifetimeRedeemed || 0),
    [summary.lifetimeRedeemed]
  );

  const loadRewards = useCallback(async (force = false) => {
    try {
      if (!force) {
        setLoading(true);
      }
      setError('');
      const [summaryResponse, ledgerResponse] = await Promise.all([
        vendorAPI.getPointsSummary().catch(() => null),
        vendorAPI.getPointsLedger({ limit: 50 }).catch(() => null),
      ]);

      if (summaryResponse) {
        setSummary(extractSummary(summaryResponse?.data ?? summaryResponse));
      } else {
        setSummary(DEFAULT_SUMMARY);
      }
      if (ledgerResponse) {
        setLedger(extractLedger(ledgerResponse?.data ?? ledgerResponse));
      } else {
        setLedger([]);
      }
    } catch (fetchError) {
      console.error('VendorRewardsScreen load error:', fetchError);
      setError(fetchError?.message || 'Unable to load rewards activity right now.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadRewards(true);
  }, [loadRewards]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadRewards(true);
  }, [loadRewards]);

  const handleOpenRedeem = useCallback(() => {
    setRedeemAmount('');
    setRedeemNotes('');
    setRedeemVisible(true);
  }, []);

  const handleCloseRedeem = useCallback(() => {
    if (submittingRedeem) {
      return;
    }
    setRedeemVisible(false);
  }, [submittingRedeem]);

  const handleSubmitRedeem = useCallback(async () => {
    const numericAmount = Number(redeemAmount.replace(/[^0-9.]/g, ''));
    if (Number.isNaN(numericAmount) || numericAmount <= 0) {
      showToast('Enter a valid amount to redeem.', 'info');
      return;
    }
    if (numericAmount > (summary.balance || 0)) {
      showToast('You cannot redeem more than your available balance.', 'info');
      return;
    }

    setSubmittingRedeem(true);
    try {
      const payload = {
        amount: numericAmount,
      };
      if (redeemNotes.trim()) {
        payload.notes = redeemNotes.trim();
      }
      const response = await vendorAPI.redeemPoints(payload);
      const success = response?.success ?? response?.data?.success ?? true;
      if (!success) {
        throw new Error(response?.message || response?.data?.message || 'Redemption request failed.');
      }
      showToast('Redemption request submitted.');
      setRedeemVisible(false);
      await loadRewards(true);
    } catch (redeemError) {
      console.error('Redeem points error:', redeemError);
      showToast(redeemError?.message || 'Redeeming points failed.', 'error');
    } finally {
      setSubmittingRedeem(false);
    }
  }, [loadRewards, redeemAmount, redeemNotes, showToast, summary.balance]);

  const renderLedgerItem = ({ item, index }) => {
    const amount = resolveLedgerAmount(item);
    const type = resolveLedgerType(item);
    const timestamp = resolveLedgerTimestamp(item);
    const label = describeLedgerType(item);
    return (
      <View key={resolveLedgerKey(item, index)} style={styles.ledgerRow}>
        <View style={styles.ledgerIconWrapper}>
          <Ionicons
            name={type === 'redeem' ? 'arrow-down-circle-outline' : 'arrow-up-circle-outline'}
            size={20}
            color={type === 'redeem' ? theme.colors.error : theme.colors.emerald}
          />
        </View>
        <View style={styles.ledgerCopy}>
          <Text style={styles.ledgerLabel}>{label}</Text>
          <Text style={styles.ledgerMeta}>{timestamp ? timeAgo(timestamp) : 'Just now'}</Text>
          {item?.notes ? <Text style={styles.ledgerNotes}>{item.notes}</Text> : null}
        </View>
        <Text style={[styles.ledgerAmount, type === 'redeem' ? styles.ledgerAmountDebit : styles.ledgerAmountCredit]}>
          {type === 'redeem' ? '-' : '+'}
          {formatNaira(Math.abs(amount))}
        </Text>
      </View>
    );
  };

  const emptyLedger = !ledger.length && !loading;

  return (
    <SafeAreaView style={styles.safeArea}>
      <Toast visible={toast.visible} message={toast.message} type={toast.type} onDismiss={hideToast} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={20} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Rewards</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={theme.colors.orange} />
          <Text style={styles.loaderText}>Loading rewards...</Text>
        </View>
      ) : (
        <FlatList
          data={ledger}
          keyExtractor={(item, index) => resolveLedgerKey(item, index)}
          renderItem={renderLedgerItem}
          ListHeaderComponent={
            <>
              {error ? (
                <View style={styles.errorBanner}>
                  <Ionicons name="warning-outline" size={18} color={theme.colors.error} />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}
              <View style={styles.summaryCard}>
                <View style={styles.summaryHeader}>
                  <Text style={styles.summaryLabel}>Current balance</Text>
                  <TouchableOpacity onPress={handleRefresh} disabled={refreshing} activeOpacity={0.7}>
                    {refreshing ? (
                      <ActivityIndicator size="small" color={theme.colors.textSecondary} />
                    ) : (
                      <Ionicons name="refresh" size={18} color={theme.colors.textSecondary} />
                    )}
                  </TouchableOpacity>
                </View>
                <Text style={styles.summaryValue}>{formattedBalance}</Text>
                <View style={styles.summaryMetaRow}>
                  <View style={styles.summaryMetaItem}>
                    <Text style={styles.summaryMetaLabel}>Lifetime earned</Text>
                    <Text style={styles.summaryMetaValue}>{formattedLifetimeEarned}</Text>
                  </View>
                  <View style={styles.summaryMetaDivider} />
                  <View style={styles.summaryMetaItem}>
                    <Text style={styles.summaryMetaLabel}>Redeemed</Text>
                    <Text style={styles.summaryMetaValue}>{formattedLifetimeRedeemed}</Text>
                  </View>
                </View>
                <Button title="Redeem rewards" onPress={handleOpenRedeem} icon="wallet-outline" />
                {summary.updatedAt ? (
                  <Text style={styles.summaryUpdated}>Updated {timeAgo(summary.updatedAt)}</Text>
                ) : null}
              </View>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Recent activity</Text>
                <Text style={styles.sectionSubtitle}>Latest earnings and redemptions</Text>
              </View>
              {emptyLedger ? (
                <View style={styles.emptyLedger}>
                  <Ionicons name="receipt-outline" size={32} color={theme.colors.textSecondary} />
                  <Text style={styles.emptyLedgerTitle}>No activity yet</Text>
                  <Text style={styles.emptyLedgerText}>
                    Earn rewards from buyer purchases and track redemptions here.
                  </Text>
                </View>
              ) : null}
            </>
          }
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.colors.orange} />}
          contentContainerStyle={styles.listContent}
        />
      )}

      <Modal animationType="slide" transparent visible={redeemVisible} onRequestClose={handleCloseRedeem}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Redeem rewards</Text>
              <TouchableOpacity onPress={handleCloseRedeem} disabled={submittingRedeem} activeOpacity={0.8}>
                <Ionicons name="close" size={20} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalHelper}>Withdraw funds to your settlement account.</Text>
            <View style={styles.modalField}>
              <Text style={styles.modalLabel}>Amount</Text>
              <TextInput
                value={redeemAmount}
                onChangeText={setRedeemAmount}
                placeholder="e.g. 5000"
                keyboardType="numeric"
                style={styles.modalInput}
                placeholderTextColor={theme.colors.textTertiary}
              />
            </View>
            <View style={styles.modalField}>
              <Text style={styles.modalLabel}>Notes (optional)</Text>
              <TextInput
                value={redeemNotes}
                onChangeText={setRedeemNotes}
                placeholder="Add instructions for our team"
                style={[styles.modalInput, styles.modalInputMultiline]}
                multiline
                numberOfLines={3}
                placeholderTextColor={theme.colors.textTertiary}
              />
            </View>
            <Button
              title={submittingRedeem ? 'Submitting...' : 'Submit request'}
              onPress={handleSubmitRedeem}
              disabled={submittingRedeem}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.soft,
  },
  headerTitle: {
    fontFamily: theme.typography.fontFamily.interSemiBold,
    fontSize: theme.typography.fontSize.lg,
    color: theme.colors.textPrimary,
  },
  headerPlaceholder: {
    width: 40,
  },
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
  },
  loaderText: {
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textSecondary,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    backgroundColor: `${theme.colors.error}12`,
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.lg,
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },
  errorText: {
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.error,
    flex: 1,
  },
  summaryCard: {
    backgroundColor: theme.colors.white,
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
    ...theme.shadows.medium,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryLabel: {
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  summaryValue: {
    fontFamily: theme.typography.fontFamily.anton,
    fontSize: theme.typography.fontSize['2xl'],
    color: theme.colors.emerald,
    letterSpacing: theme.typography.letterSpacing.wide,
  },
  summaryMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${theme.colors.emerald}08`,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.sm,
  },
  summaryMetaItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  summaryMetaDivider: {
    width: 1,
    height: '100%',
    backgroundColor: `${theme.colors.emerald}20`,
  },
  summaryMetaLabel: {
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
  },
  summaryMetaValue: {
    fontFamily: theme.typography.fontFamily.interSemiBold,
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textPrimary,
  },
  summaryUpdated: {
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textSecondary,
  },
  sectionHeader: {
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },
  sectionTitle: {
    fontFamily: theme.typography.fontFamily.interSemiBold,
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textPrimary,
  },
  sectionSubtitle: {
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textSecondary,
  },
  listContent: {
    paddingBottom: theme.spacing['3xl'],
  },
  ledgerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
  },
  ledgerIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.small,
  },
  ledgerCopy: {
    flex: 1,
    gap: 2,
  },
  ledgerLabel: {
    fontFamily: theme.typography.fontFamily.interSemiBold,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textPrimary,
  },
  ledgerMeta: {
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textSecondary,
  },
  ledgerNotes: {
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textTertiary,
  },
  ledgerAmount: {
    fontFamily: theme.typography.fontFamily.interSemiBold,
    fontSize: theme.typography.fontSize.sm,
    textAlign: 'right',
  },
  ledgerAmountCredit: {
    color: theme.colors.emerald,
  },
  ledgerAmountDebit: {
    color: theme.colors.error,
  },
  emptyLedger: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing['2xl'],
    gap: theme.spacing.sm,
    marginHorizontal: theme.spacing.lg,
    backgroundColor: `${theme.colors.backgroundLight}`,
    borderRadius: theme.borderRadius.lg,
  },
  emptyLedgerTitle: {
    fontFamily: theme.typography.fontFamily.interSemiBold,
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textPrimary,
  },
  emptyLedgerText: {
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: theme.spacing.xl,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.lg,
  },
  modalCard: {
    width: '100%',
    borderRadius: theme.borderRadius.xl,
    backgroundColor: theme.colors.white,
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: {
    fontFamily: theme.typography.fontFamily.interSemiBold,
    fontSize: theme.typography.fontSize.lg,
    color: theme.colors.textPrimary,
  },
  modalHelper: {
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  modalField: {
    gap: theme.spacing.xs,
  },
  modalLabel: {
    fontFamily: theme.typography.fontFamily.interSemiBold,
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.lg,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textPrimary,
  },
  modalInputMultiline: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
});

export default VendorRewardsScreen;
