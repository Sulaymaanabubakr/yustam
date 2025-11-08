import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import theme from '../../theme';

const SUPPORT_TOOLS = [
  {
    id: 'orders',
    title: 'Order & Delivery',
    description: 'Track orders, delivery timelines, and resolve shipping questions.',
    icon: 'cube-outline',
  },
  {
    id: 'returns',
    title: 'Returns & Refunds',
    description: 'Manage return requests and view refund status updates.',
    icon: 'swap-horizontal-outline',
  },
  {
    id: 'warranty',
    title: 'Warranty Support',
    description: 'Activate warranty, schedule repairs, and upload proof of purchase.',
    icon: 'shield-checkmark-outline',
  },
  {
    id: 'live-chat',
    title: 'Live Chat',
    description: 'Chat with a Yustam specialist for personalised assistance.',
    icon: 'chatbubbles-outline',
    action: (navigation) => navigation.navigate('Chat'),
  },
  {
    id: 'faq',
    title: 'Help Centre',
    description: 'Browse articles, buyer guides, and policy information.',
    icon: 'help-circle-outline',
  },
];

const BuyerSupportScreen = ({ navigation }) => {
  const handlePress = (tool) => {
    if (typeof tool.action === 'function') {
      tool.action(navigation);
      return;
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-back" size={20} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Buyer Support</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
      >
        <View style={styles.heroCard}>
          <View style={styles.heroIconWrapper}>
            <Ionicons name="headset-outline" size={28} color={theme.colors.white} />
          </View>
          <View style={styles.heroContent}>
            <Text style={styles.heroTitle}>Need help with your order?</Text>
            <Text style={styles.heroSubtitle}>
              Reach our buyer success team anytime for fast resolution and product support.
            </Text>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Support tools</Text>
          <Text style={styles.sectionSubtitle}>Popular help options for buyers</Text>
        </View>

        <View style={styles.grid}>
          {SUPPORT_TOOLS.map((tool) => (
            <TouchableOpacity
              key={tool.id}
              style={styles.toolCard}
              activeOpacity={0.85}
              onPress={() => handlePress(tool)}
            >
              <View style={styles.toolIconWrapper}>
                <Ionicons name={tool.icon} size={20} color={theme.colors.orange} />
              </View>
              <View style={styles.toolContent}>
                <Text style={styles.toolTitle}>{tool.title}</Text>
                <Text style={styles.toolDescription}>{tool.description}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.helpCard}>
          <View style={styles.helpIconWrapper}>
            <Ionicons name="call-outline" size={22} color={theme.colors.emerald} />
          </View>
          <View style={styles.helpContent}>
            <Text style={styles.helpTitle}>Prefer to talk?</Text>
            <Text style={styles.helpSubtitle}>Reach buyer care on 0700-YUSTAM between 8am - 8pm.</Text>
          </View>
          <TouchableOpacity style={styles.callButton} activeOpacity={0.85}>
            <Text style={styles.callButtonText}>Call now</Text>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.soft,
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontFamily: theme.typography.fontFamily.anton,
    fontSize: theme.typography.fontSize.xl,
    color: theme.colors.textPrimary,
    letterSpacing: theme.typography.letterSpacing.wide,
  },
  headerSpacer: {
    width: 40,
  },
  contentContainer: {
    gap: theme.spacing['2xl'],
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing['4xl'],
  },
  heroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.emerald,
    borderRadius: theme.radius['2xl'],
    padding: theme.spacing.lg,
    gap: theme.spacing.lg,
  },
  heroIconWrapper: {
    width: 52,
    height: 52,
    borderRadius: theme.radius.full,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroContent: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  heroTitle: {
    fontFamily: theme.typography.fontFamily.interSemiBold,
    fontSize: theme.typography.fontSize.lg,
    color: theme.colors.white,
  },
  heroSubtitle: {
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.sm,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: theme.typography.lineHeight.relaxed * theme.typography.fontSize.sm,
  },
  sectionHeader: {
    gap: theme.spacing.xs,
  },
  sectionTitle: {
    fontFamily: theme.typography.fontFamily.anton,
    fontSize: theme.typography.fontSize.lg,
    color: theme.colors.textPrimary,
    letterSpacing: theme.typography.letterSpacing.wide,
  },
  sectionSubtitle: {
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  grid: {
    gap: theme.spacing.md,
  },
  toolCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    backgroundColor: theme.colors.white,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    ...theme.shadows.card,
  },
  toolIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.backgroundLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolContent: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  toolTitle: {
    fontFamily: theme.typography.fontFamily.interSemiBold,
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textPrimary,
  },
  toolDescription: {
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textSecondary,
    lineHeight: theme.typography.lineHeight.relaxed * theme.typography.fontSize.xs,
  },
  helpCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.white,
    borderRadius: theme.radius['2xl'],
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
    ...theme.shadows.card,
  },
  helpIconWrapper: {
    width: 52,
    height: 52,
    borderRadius: theme.radius.full,
    backgroundColor: `${theme.colors.emerald}15`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  helpContent: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  helpTitle: {
    fontFamily: theme.typography.fontFamily.interSemiBold,
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textPrimary,
  },
  helpSubtitle: {
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textSecondary,
  },
  callButton: {
    backgroundColor: theme.colors.emerald,
    borderRadius: theme.radius.full,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
  },
  callButtonText: {
    fontFamily: theme.typography.fontFamily.interSemiBold,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.white,
  },
});

export default BuyerSupportScreen;
