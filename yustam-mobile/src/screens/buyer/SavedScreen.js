import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import theme from '../../theme';
import useBotQuery from '../../hooks/useBotQuery';
import { timeAgo } from '../../utils/formatters';
import Toast from '../../components/Toast';

const formatSummaryLines = (lines = []) =>
  lines
    .map((line) => (typeof line === 'string' ? line.trim() : ''))
    .filter((line, index, array) => line && array.indexOf(line) === index)
    .slice(0, 3);

const formatFollowUps = (items = []) =>
  items
    .map((line) => (typeof line === 'string' ? line.trim() : ''))
    .filter((line, index, array) => line && array.indexOf(line) === index)
    .slice(0, 2);

const BuyerSavedScreen = ({ navigation }) => {
  const { latestResponse, integrations, syncIntegrations } = useBotQuery();
  const wishlistIntegration = integrations?.wishlist ?? {};
  const [toast, setToast] = useState({ visible: false, message: '', type: 'info' });

  const showToast = useCallback((message, type = 'info') => {
    setToast({ visible: true, message, type });
  }, []);

  const hideToast = useCallback(() => {
    setToast((prev) => ({ ...prev, visible: false }));
  }, []);

  const summaryLines = useMemo(() => {
    if (!wishlistIntegration.ready || !latestResponse?.summary) {
      return [];
    }
    return formatSummaryLines(latestResponse.summary);
  }, [latestResponse?.summary, wishlistIntegration.ready]);

  const followUps = useMemo(() => {
    if (!wishlistIntegration.ready || !latestResponse?.followUps) {
      return [];
    }
    return formatFollowUps(latestResponse.followUps);
  }, [latestResponse?.followUps, wishlistIntegration.ready]);

  const hasInsights = summaryLines.length > 0;
  const lastSyncedLabel = wishlistIntegration.lastSynced ? timeAgo(wishlistIntegration.lastSynced) : null;

  const handleOpenBot = useCallback(() => {
    navigation.navigate('Bot');
  }, [navigation]);

  const handleSync = useCallback(() => {
    if (!wishlistIntegration.ready || wishlistIntegration.syncing) {
      return;
    }
    const outcome = syncIntegrations();
    if (!outcome?.success && outcome?.error) {
      showToast(outcome.error, 'info');
    }
  }, [syncIntegrations, wishlistIntegration.ready, wishlistIntegration.syncing, showToast]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={hideToast} />
      <View style={styles.header}>
        <Text style={styles.title}>Saved</Text>
        <TouchableOpacity
          style={styles.supportButton}
          onPress={() => navigation.navigate('BuyerSupport')}
          activeOpacity={0.8}
        >
          <Ionicons name="help-circle-outline" size={20} color={theme.colors.emerald} />
          <Text style={styles.supportText}>Help</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.insightsCard}>
          <View style={styles.insightsHeader}>
            <View style={styles.insightsTitleWrap}>
              <Ionicons name="sparkles" size={18} color={theme.colors.emerald} style={styles.insightsIcon} />
              <View>
                <Text style={styles.insightsTitle}>YustaAI wishlist alerts</Text>
                <Text style={styles.insightsSubtitle}>
                  {wishlistIntegration.syncing
                    ? 'Refreshing signals…'
                    : lastSyncedLabel
                      ? `Updated ${lastSyncedLabel}`
                      : 'Ask YustaAI for tailored picks'}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={[
                styles.refreshButton,
                (!wishlistIntegration.ready || wishlistIntegration.syncing) && styles.refreshButtonDisabled,
              ]}
              onPress={handleSync}
              disabled={!wishlistIntegration.ready || wishlistIntegration.syncing}
              activeOpacity={0.75}
            >
              {wishlistIntegration.syncing ? (
                <ActivityIndicator size="small" color={theme.colors.emerald} />
              ) : (
                <Ionicons name="refresh" size={16} color={theme.colors.emerald} />
              )}
            </TouchableOpacity>
          </View>

          {hasInsights ? (
            <View style={styles.summaryWrapper}>
              {summaryLines.map((line, index) => (
                <Text key={`wishlist-summary-${index}`} style={styles.summaryLine}>
                  <Text style={styles.summaryBullet}>• </Text>
                  {line}
                </Text>
              ))}
            </View>
          ) : (
            <Text style={styles.summaryPlaceholder}>
              Save a few products and ask YustaAI what other drops you should watch. Alerts will appear here once ready.
            </Text>
          )}

          {followUps.length ? (
            <View style={styles.followUpsRow}>
              {followUps.map((item, index) => (
                <TouchableOpacity
                  key={`wishlist-followup-${index}`}
                  style={styles.followUpChip}
                  onPress={handleOpenBot}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name="chatbubble-ellipses-outline"
                    size={14}
                    color={theme.colors.white}
                    style={styles.followUpIcon}
                  />
                  <Text style={styles.followUpText}>{item}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : null}

          {wishlistIntegration.error ? (
            <Text style={styles.integrationError}>{wishlistIntegration.error}</Text>
          ) : null}

          <TouchableOpacity style={styles.openBotButton} onPress={handleOpenBot} activeOpacity={0.85}>
            <Ionicons name="bulb-outline" size={16} color={theme.colors.emerald} style={styles.openBotIcon} />
            <Text style={styles.openBotText}>Chat with YustaAI</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.emptyState}>
          <View style={styles.iconWrapper}>
            <Ionicons name="bookmark-outline" size={40} color={theme.colors.emerald} />
          </View>
          <Text style={styles.emptyTitle}>Nothing saved yet</Text>
          <Text style={styles.emptySubtitle}>
            Tap the bookmark icon on products to keep them here for quick access.
          </Text>
          <TouchableOpacity
            style={styles.ctaButton}
            onPress={() => navigation.navigate('BuyerSearch')}
            activeOpacity={0.85}
          >
            <Text style={styles.ctaText}>Discover deals</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xxl,
    gap: theme.spacing.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
  },
  title: {
    fontFamily: theme.typography.fontFamily.anton,
    fontSize: theme.typography.fontSize.xl,
    color: theme.colors.textPrimary,
    letterSpacing: theme.typography.letterSpacing.wide,
  },
  supportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    backgroundColor: `${theme.colors.emerald}15`,
    borderRadius: theme.radius.full,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  supportText: {
    fontFamily: theme.typography.fontFamily.interSemiBold,
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.emerald,
  },
  insightsCard: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    shadowColor: theme.colors.shadowLight,
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
    gap: theme.spacing.md,
  },
  insightsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  insightsTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    flex: 1,
  },
  insightsIcon: {
    backgroundColor: `${theme.colors.emerald}15`,
    borderRadius: theme.radius.full,
    padding: 6,
  },
  insightsTitle: {
    fontFamily: theme.typography.fontFamily.interSemiBold,
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textPrimary,
  },
  insightsSubtitle: {
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textSecondary,
  },
  refreshButton: {
    width: 36,
    height: 36,
    borderRadius: theme.radius.full,
    borderWidth: 1,
    borderColor: `${theme.colors.emerald}40`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  refreshButtonDisabled: {
    opacity: 0.5,
  },
  summaryWrapper: {
    gap: theme.spacing.sm,
  },
  summaryLine: {
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textPrimary,
    lineHeight: theme.typography.lineHeight.relaxed * theme.typography.fontSize.sm,
  },
  summaryBullet: {
    color: theme.colors.emerald,
    fontWeight: '600',
  },
  summaryPlaceholder: {
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    lineHeight: theme.typography.lineHeight.relaxed * theme.typography.fontSize.sm,
  },
  followUpsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  followUpChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.emerald,
    borderRadius: theme.radius.full,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    gap: theme.spacing.xs,
  },
  followUpIcon: {
    marginRight: 2,
  },
  followUpText: {
    fontFamily: theme.typography.fontFamily.interMedium,
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.white,
  },
  integrationError: {
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.error,
  },
  openBotButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.full,
    borderWidth: 1,
    borderColor: `${theme.colors.emerald}35`,
    paddingVertical: theme.spacing.sm,
    gap: theme.spacing.xs,
  },
  openBotIcon: {
    marginRight: 2,
  },
  openBotText: {
    fontFamily: theme.typography.fontFamily.interSemiBold,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.emerald,
  },
  emptyState: {
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.lg,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.xxl,
    backgroundColor: `${theme.colors.emerald}08`,
    borderRadius: theme.radius.lg,
  },
  iconWrapper: {
    width: 72,
    height: 72,
    borderRadius: theme.radius.full,
    backgroundColor: `${theme.colors.emerald}15`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontFamily: theme.typography.fontFamily.interSemiBold,
    fontSize: theme.typography.fontSize.lg,
    color: theme.colors.textPrimary,
  },
  emptySubtitle: {
    textAlign: 'center',
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    lineHeight: theme.typography.lineHeight.relaxed * theme.typography.fontSize.sm,
  },
  ctaButton: {
    backgroundColor: theme.colors.emerald,
    borderRadius: theme.radius.full,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
  },
  ctaText: {
    fontFamily: theme.typography.fontFamily.interSemiBold,
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.white,
  },
});

export default BuyerSavedScreen;
