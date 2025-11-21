import React, { useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import theme from '../../theme';
import useBotQuery from '../../hooks/useBotQuery';
import { formatNaira } from '../../utils/formatters';
import { formatListingLocation } from '../../utils/listingBranding';

const FALLBACK_IMAGE = 'https://res.cloudinary.com/df9qmg3gy/image/upload/v1707249680/phone-blue.png';

const BotScreen = () => {
  const navigation = useNavigation();
  const inputRef = useRef(null);
  const [draft, setDraft] = useState('');
  const { history, mode, location, status, loading, error, sendQuery, setMode, updateLocation, clearHistory, clearError } = useBotQuery();

  const orderedHistory = useMemo(() => history.slice().sort((a, b) => a.timestamp - b.timestamp), [history]);
  const hasHistory = orderedHistory.length > 0;

  const statusMeta = useMemo(() => {
    if (status.loading) {
      return { icon: 'sync-outline', label: 'Connecting to YustaAI…', tone: theme.colors.info };
    }
    if (status.configured) {
      const modelText = status.model ? ` (${status.model})` : '';
      return { icon: 'sparkles', label: `YustaAI online${modelText}`, tone: theme.colors.success };
    }
    return { icon: 'warning-outline', label: status.error || 'YustaAI is unavailable', tone: theme.colors.warning };
  }, [status.configured, status.error, status.loading, status.model]);

  const handleSend = async () => {
    const trimmed = draft.trim();
    if (!trimmed || loading) {
      return;
    }
    const result = await sendQuery(trimmed);
    if (result.success) {
      setDraft('');
    }
  };

  const handleSuggestionPress = (suggestion) => {
    const value = (suggestion || '').trim();
    if (!value) {
      return;
    }
    setDraft(value);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleClearHistory = () => {
    if (!hasHistory) {
      return;
    }
    Alert.alert('Clear conversation?', 'This will remove previous YustaAI suggestions.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: () => {
          clearHistory();
        },
      },
    ]);
  };

  const handleListingPress = (listing) => {
    if (!listing?.id) {
      return;
    }
    navigation.navigate('BuyerProductDetail', {
      productId: listing.id,
      product: listing,
    });
  };

  const renderSummary = (summary = [], entryId) => {
    if (!summary.length) {
      return null;
    }
    return (
      <View style={styles.summaryContainer}>
        {summary.map((line, index) => (
          <Text key={`${entryId}-summary-${index}`} style={styles.summaryLine}>
            <Text style={styles.summaryBullet}>• </Text>
            {line}
          </Text>
        ))}
      </View>
    );
  };

  const renderFollowUps = (followUps = [], entryId) => {
    if (!followUps.length) {
      return null;
    }
    return (
      <View style={styles.followUpRow}>
        {followUps.map((question, index) => (
          <TouchableOpacity
            key={`${entryId}-followup-${index}`}
            style={styles.followUpPill}
            activeOpacity={0.85}
            onPress={() => handleSuggestionPress(question)}
          >
            <Ionicons name="chatbubble-ellipses-outline" size={14} color={theme.colors.primary} style={styles.followUpIcon} />
            <Text style={styles.followUpText}>{question}</Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderBadges = (response) => {
    const badges = [];
    if (response?.fallbackUsed) {
      badges.push({ label: 'Marketplace fallback', tone: theme.colors.warning });
    }
    if (response?.cached) {
      badges.push({ label: 'Cached filters', tone: theme.colors.info });
    }
    if (!badges.length && response?.intent) {
      badges.push({ label: response.intent, tone: theme.colors.accent });
    }
    if (!badges.length) {
      return null;
    }
    return (
      <View style={styles.badgeRow}>
        {badges.map((badge, index) => (
          <View key={`badge-${index}`} style={[styles.badge, { backgroundColor: `${badge.tone}1A` }]}>
            <Text style={[styles.badgeText, { color: badge.tone }]}>{badge.label}</Text>
          </View>
        ))}
      </View>
    );
  };

  const renderListings = (listings = [], entryId) => {
    if (!listings.length) {
      return null;
    }
    return (
      <View style={styles.listingsContainer}>
        {listings.map((listing, index) => {
          const imageUri = listing?.primaryImage || listing?.images?.[0] || FALLBACK_IMAGE;
          const hasPrice = listing?.price !== null && listing?.price !== undefined;
          const priceLabel = hasPrice ? formatNaira(listing.price) : 'Ask vendor';
          const locationLabel = formatListingLocation(listing) || 'Location not specified';
          const vendorLabel = listing?.vendor?.displayName || 'Yustam vendor';
          const listKey = listing?.id ? `${entryId}-${listing.id}` : `${entryId}-listing-${index}`;
          return (
            <TouchableOpacity
              key={listKey}
              style={styles.listingCard}
              activeOpacity={0.9}
              onPress={() => handleListingPress(listing)}
            >
              <Image source={{ uri: imageUri }} style={styles.listingImage} resizeMode="cover" />
              <View style={styles.listingContent}>
                <Text style={styles.listingTitle} numberOfLines={2}>{listing?.title || 'Marketplace listing'}</Text>
                <Text style={styles.listingPrice}>{priceLabel}</Text>
                <Text style={styles.listingMeta} numberOfLines={1}>{locationLabel}</Text>
                <Text style={styles.listingVendor} numberOfLines={1}>{vendorLabel}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.colors.textTertiary} />
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  const renderHistoryCard = (entry) => {
    const response = entry.response;
    return (
      <View key={entry.id} style={styles.historyCard}>
        <View style={styles.historyHeader}>
          <Ionicons name="person-circle" size={20} color={theme.colors.primary} />
          <Text style={styles.historyQuery}>{entry.query}</Text>
        </View>
        {entry.status === 'pending' ? (
          <View style={styles.historySpinner}>
            <ActivityIndicator size="small" color={theme.colors.primary} />
            <Text style={styles.historyAwaiting}>YustaAI is finding matches…</Text>
          </View>
        ) : null}
        {entry.status === 'error' ? (
          <Text style={styles.historyError}>{entry.error || 'Unable to process this request.'}</Text>
        ) : null}
        {entry.status === 'complete' && response ? (
          <View style={styles.historyResponse}>
            {renderBadges(response)}
            {renderSummary(response.summary, entry.id)}
            {renderListings(response.listings, entry.id)}
            {renderFollowUps(response.followUps, entry.id)}
          </View>
        ) : null}
      </View>
    );
  };

  const handleModePress = (targetMode) => {
    if (mode === targetMode) {
      return;
    }
    setMode(targetMode);
  };

  const handleLocationChange = (field, value) => {
    updateLocation({ [field]: value });
  };

  const shouldDisableSend = !draft.trim() || loading;

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}
      >
        <View style={styles.container}>
          <View style={styles.headerRow}>
            <View style={styles.statusChip}>
              <Ionicons name={statusMeta.icon} size={14} color={statusMeta.tone} style={styles.statusIcon} />
              <Text style={[styles.statusText, { color: statusMeta.tone }]} numberOfLines={1}>
                {statusMeta.label}
              </Text>
            </View>
            <TouchableOpacity style={styles.clearButton} onPress={handleClearHistory} disabled={!hasHistory}>
              <Ionicons name="trash-outline" size={16} color={hasHistory ? theme.colors.error : theme.colors.textTertiary} />
            </TouchableOpacity>
          </View>

          {error ? (
            <TouchableOpacity style={styles.errorBanner} activeOpacity={0.9} onPress={clearError}>
              <Ionicons name="alert-circle" size={18} color={theme.colors.error} style={styles.errorIcon} />
              <Text style={styles.errorText}>{error}</Text>
            </TouchableOpacity>
          ) : null}

          <View style={styles.historyContainer}>
            {hasHistory ? (
              <ScrollView contentContainerStyle={styles.historyScroll} showsVerticalScrollIndicator={false}>
                {orderedHistory.map(renderHistoryCard)}
              </ScrollView>
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="sparkles" size={32} color={theme.colors.primary} style={styles.emptyIcon} />
                <Text style={styles.emptyTitle}>Ask YustaAI anything</Text>
                <Text style={styles.emptyCopy}>
                  Describe the product, price range, or neighbourhood you prefer and we will curate matching listings in real time.
                </Text>
              </View>
            )}
          </View>

          <View style={styles.inputCard}>
            <View style={styles.modeToggle}>
              <TouchableOpacity
                style={[styles.modeOption, mode === 'global' && styles.modeOptionActive]}
                activeOpacity={0.85}
                onPress={() => handleModePress('global')}
              >
                <Ionicons
                  name="earth"
                  size={16}
                  color={mode === 'global' ? theme.colors.white : theme.colors.textSecondary}
                  style={styles.modeIcon}
                />
                <Text style={[styles.modeLabel, mode === 'global' && styles.modeLabelActive]}>Marketplace</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modeOption, mode === 'local' && styles.modeOptionActive]}
                activeOpacity={0.85}
                onPress={() => handleModePress('local')}
              >
                <Ionicons
                  name="location"
                  size={16}
                  color={mode === 'local' ? theme.colors.white : theme.colors.textSecondary}
                  style={styles.modeIcon}
                />
                <Text style={[styles.modeLabel, mode === 'local' && styles.modeLabelActive]}>Nearby</Text>
              </TouchableOpacity>
            </View>

            {mode === 'local' ? (
              <View style={styles.locationRow}>
                <TextInput
                  style={styles.locationInput}
                  placeholder="State"
                  placeholderTextColor={theme.colors.textTertiary}
                  value={location.state}
                  onChangeText={(value) => handleLocationChange('state', value)}
                  returnKeyType="next"
                />
                <TextInput
                  style={styles.locationInput}
                  placeholder="City (optional)"
                  placeholderTextColor={theme.colors.textTertiary}
                  value={location.city}
                  onChangeText={(value) => handleLocationChange('city', value)}
                  returnKeyType="next"
                />
              </View>
            ) : null}

            <View style={styles.inputRow}>
              <TextInput
                ref={inputRef}
                style={styles.textInput}
                placeholder="Ask for products, deals, or vendor tips"
                placeholderTextColor={theme.colors.textTertiary}
                value={draft}
                onChangeText={(value) => {
                  if (error) {
                    clearError();
                  }
                  setDraft(value);
                }}
                onSubmitEditing={handleSend}
                returnKeyType="send"
                multiline
                maxLength={320}
              />
              <TouchableOpacity
                style={[styles.sendButton, shouldDisableSend && styles.sendButtonDisabled]}
                onPress={handleSend}
                activeOpacity={0.85}
                disabled={shouldDisableSend}
              >
                {loading ? (
                  <ActivityIndicator size="small" color={theme.colors.white} />
                ) : (
                  <Ionicons name="arrow-up" size={18} color={theme.colors.white} />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.backgroundLight,
  },
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    gap: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.white,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    shadowColor: theme.colors.shadowLight,
    shadowOpacity: 0.6,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    maxWidth: '85%',
  },
  statusIcon: {
    marginRight: 6,
  },
  statusText: {
    fontFamily: theme.typography.fontFamily.interMedium,
    fontSize: theme.typography.fontSize.sm,
  },
  clearButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.white,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.errorDark + '12',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  errorIcon: {
    marginRight: 8,
  },
  errorText: {
    flex: 1,
    fontFamily: theme.typography.fontFamily.interMedium,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.error,
  },
  historyContainer: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  historyScroll: {
    paddingBottom: 12,
    gap: 12,
  },
  historyCard: {
    backgroundColor: theme.colors.white,
    borderRadius: 16,
    padding: 16,
    shadowColor: theme.colors.shadowLight,
    shadowOpacity: 0.6,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  historyQuery: {
    flex: 1,
    marginLeft: 8,
    fontFamily: theme.typography.fontFamily.interSemiBold,
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.textPrimary,
  },
  historySpinner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  historyAwaiting: {
    fontFamily: theme.typography.fontFamily.interRegular,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  historyError: {
    fontFamily: theme.typography.fontFamily.interMedium,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.error,
  },
  historyResponse: {
    gap: 12,
    marginTop: 4,
  },
  summaryContainer: {
    gap: 6,
  },
  summaryLine: {
    fontFamily: theme.typography.fontFamily.interRegular,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  summaryBullet: {
    fontFamily: theme.typography.fontFamily.interSemiBold,
    color: theme.colors.primary,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  badgeText: {
    fontFamily: theme.typography.fontFamily.interMedium,
    fontSize: theme.typography.fontSize.xs,
  },
  listingsContainer: {
    gap: 10,
  },
  listingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    borderRadius: 14,
    padding: 10,
    gap: 12,
  },
  listingImage: {
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: theme.colors.border,
  },
  listingContent: {
    flex: 1,
    gap: 4,
  },
  listingTitle: {
    fontFamily: theme.typography.fontFamily.interSemiBold,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textPrimary,
  },
  listingPrice: {
    fontFamily: theme.typography.fontFamily.interBold,
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.primary,
  },
  listingMeta: {
    fontFamily: theme.typography.fontFamily.interRegular,
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textSecondary,
  },
  listingVendor: {
    fontFamily: theme.typography.fontFamily.interRegular,
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textTertiary,
  },
  followUpRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  followUpPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    backgroundColor: theme.colors.primary + '12',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  followUpIcon: {
    marginRight: 6,
  },
  followUpText: {
    fontFamily: theme.typography.fontFamily.interMedium,
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.primary,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  emptyIcon: {
    marginBottom: 12,
  },
  emptyTitle: {
    fontFamily: theme.typography.fontFamily.interSemiBold,
    fontSize: theme.typography.fontSize.lg,
    color: theme.colors.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyCopy: {
    fontFamily: theme.typography.fontFamily.interRegular,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  inputCard: {
    backgroundColor: theme.colors.white,
    borderRadius: 20,
    padding: 16,
    shadowColor: theme.colors.shadowLight,
    shadowOpacity: 0.6,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
    gap: 12,
  },
  modeToggle: {
    flexDirection: 'row',
    backgroundColor: theme.colors.backgroundLight,
    borderRadius: 999,
    padding: 4,
    gap: 6,
  },
  modeOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'transparent',
    gap: 6,
  },
  modeOptionActive: {
    backgroundColor: theme.colors.primary,
  },
  modeIcon: {
    marginRight: 2,
  },
  modeLabel: {
    fontFamily: theme.typography.fontFamily.interMedium,
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textSecondary,
  },
  modeLabelActive: {
    color: theme.colors.white,
  },
  locationRow: {
    flexDirection: 'row',
    gap: 10,
  },
  locationInput: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: theme.typography.fontFamily.interRegular,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textPrimary,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
  },
  textInput: {
    flex: 1,
    minHeight: 48,
    maxHeight: 120,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: theme.typography.fontFamily.interRegular,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textPrimary,
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
  },
  sendButtonDisabled: {
    backgroundColor: theme.colors.primary + '55',
  },
});

export default BotScreen;