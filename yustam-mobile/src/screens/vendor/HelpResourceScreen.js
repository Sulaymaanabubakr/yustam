import React from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import theme from '../../theme';
import { goBackOrNavigate } from '../../utils/navigation';

const RESOURCE_CONTENT = {
  docs: {
    key: 'docs',
    icon: 'document-text-outline',
    accentColor: theme.colors.orange,
    title: 'Vendor Documentation',
    subtitle: 'Guides and playbooks to help you sell faster on YUSTAM.',
    sections: [
      {
        heading: 'Store Setup',
        description:
          'Step-by-step articles on creating your storefront, completing verification, and making your first listing live.',
        bullets: [
          'Account activation & verification checklist',
          'Listing quality requirements',
          'Image, pricing, and compliance standards',
        ],
      },
      {
        heading: 'Billing & Plans',
        description:
          'Understand the different plan benefits, invoice schedules, and how to keep auto-renewal active.',
        bullets: [
          'Plan comparison matrix',
          'How to download invoices and receipts',
          'What happens when your plan expires',
        ],
      },
      {
        heading: 'Support Workflow',
        description:
          'Escalation paths for marketplace disputes, refunds, and suspended listings.',
        bullets: [
          'Contact points for urgent listing reviews',
          'Turnaround times for appeals',
          'Keeping your support PIN handy',
        ],
      },
    ],
    links: [
      {
        label: 'Seller Handbook (PDF)',
        description: '17-page starter kit covering best practices.',
        url: 'https://example.com/yustam-seller-handbook.pdf',
      },
      {
        label: 'Listing Quality Guide',
        description: 'Image, description, and compliance checklist.',
        url: 'https://example.com/yustam-listing-guide',
      },
    ],
  },
  tutorials: {
    key: 'tutorials',
    icon: 'book-outline',
    accentColor: '#1D4ED8',
    title: 'Video Tutorials & Workshops',
    subtitle: 'Hands-on lessons from the YUSTAM academy team.',
    sections: [
      {
        heading: 'Quick Start Series',
        description:
          '3 short modules that get new vendors from signup to first sale.',
        bullets: [
          'Optimising titles and descriptions for search',
          'Understanding the analytics dashboard',
          'Responding to chat leads effectively',
        ],
      },
      {
        heading: 'Growth Playbooks',
        description:
          'Long-form tutorials on scaling your catalogue and running campaigns.',
        bullets: [
          'Batch uploading listings with CSV',
          'Using sponsored placements & coupons',
          'Upsell tactics using bundles',
        ],
      },
      {
        heading: 'Live Workshops',
        description:
          'Monthly webinars hosted by the success team with live Q&A segments.',
        bullets: [
          'Product photography masterclass',
          'How to negotiate delivery SLAs',
          'Building trust through reviews',
        ],
      },
    ],
    links: [
      {
        label: 'Watch on YouTube',
        description: 'Full playlist of all tutorials.',
        url: 'https://youtube.com/@yustam',
      },
      {
        label: 'Register for next workshop',
        description: 'Secure a seat for the next live AMA.',
        url: 'https://example.com/yustam-workshops',
      },
    ],
  },
  community: {
    key: 'community',
    icon: 'people-outline',
    accentColor: '#0F9D58',
    title: 'Community & Forums',
    subtitle: 'Connect with other verified vendors, share tips, and get feedback.',
    sections: [
      {
        heading: 'Discussion Boards',
        description:
          'Channels dedicated to niche categories, logistics partners, and marketplace policy changes.',
        bullets: [
          'Weekly “Ask Me Anything” with the success team',
          'City-based groups for collaborative fulfilment',
          'Show-and-tell threads for storefront inspiration',
        ],
      },
      {
        heading: 'Mentorship Circles',
        description:
          'Invite-only groups pairing emerging vendors with top sellers for three-week sprints.',
        bullets: [
          'Goal setting templates',
          'Accountability check-ins',
          'Case studies and teardown sessions',
        ],
      },
      {
        heading: 'Events & Meetups',
        description:
          'Virtual and in-person meetups covering launches, festive campaigns, and cross-promotions.',
        bullets: [
          'Quarterly Vendor Summits',
          'Industry networking breakfasts',
          'Partner perks & grant announcements',
        ],
      },
    ],
    links: [
      {
        label: 'Join the Slack Workspace',
        description: 'Daily discussions, job boards, and polls.',
        url: 'https://example.com/yustam-community',
      },
      {
        label: 'Request a Mentor',
        description: 'Tell us your category and goals.',
        url: 'https://example.com/yustam-mentor',
      },
    ],
  },
  privacy: {
    key: 'privacy',
    icon: 'shield-checkmark-outline',
    accentColor: theme.colors.emerald,
    title: 'Privacy & Policy',
    subtitle: 'How YUSTAM collects, stores, and protects marketplace data.',
    sections: [
      {
        heading: 'Data We Collect',
        description:
          'Account details, listing metadata, device signals, payment confirmations, and chat messages are gathered to run the marketplace securely.',
        bullets: [
          'We never sell your personal information to advertisers',
          'Financial data is tokenised and stored with certified gateways',
          'Analytics dashboards only show aggregated metrics',
        ],
      },
      {
        heading: 'Your Rights',
        description:
          'You can request exports, corrections, or deletion of personal data at any time.',
        bullets: [
          'Use the “Download My Data” request inside Settings',
          'Right to be forgotten processed within 30 days',
          'Dedicated DPO email: privacy@yustam.com',
        ],
      },
      {
        heading: 'Policy Changes',
        description:
          'We notify vendors via email and in-app notifications before substantial updates.',
        bullets: [
          'Change log published quarterly',
          'Beta features gated until policies are updated',
          'Archived policies accessible for reference',
        ],
      },
    ],
    links: [
      {
        label: 'Read full Privacy Policy',
        description: 'Hosted on yustam.com/legal/privacy',
        url: 'https://example.com/yustam-privacy',
      },
    ],
  },
  dataProtection: {
    key: 'dataProtection',
    icon: 'lock-closed-outline',
    accentColor: '#7C3AED',
    title: 'Data Protection & Compliance',
    subtitle: 'Security practices you should know when operating on YUSTAM.',
    sections: [
      {
        heading: 'Platform Safeguards',
        description:
          'All traffic is encrypted (TLS 1.2+), and infrastructure is monitored 24/7.',
        bullets: [
          'Multi-factor authentication for staff tooling',
          'Quarterly penetration testing & audits',
          'Separate environments for staging vs. production',
        ],
      },
      {
        heading: 'Vendor Responsibilities',
        description:
          'Protect your login credentials and keep customer data inside the YUSTAM ecosystem.',
        bullets: [
          'Enable biometric unlock on the mobile app',
          'Never export buyer information without consent',
          'Report suspicious access immediately to security@yustam.com',
        ],
      },
      {
        heading: 'Incident Response',
        description:
          'We commit to transparent communication and collaborative remediation whenever issues arise.',
        bullets: [
          'All reports acknowledged within 12 business hours',
          'Dedicated WhatsApp hotline for critical incidents',
          'Status page updates for wider outages',
        ],
      },
    ],
    links: [
      {
        label: 'Download Data Processing Agreement',
        description: 'For enterprise and API partners.',
        url: 'https://example.com/yustam-dpa.pdf',
      },
    ],
  },
};

const HelpResourceScreen = ({ route, navigation }) => {
  const resourceKey = route?.params?.resource || 'docs';
  const resource = RESOURCE_CONTENT[resourceKey] || RESOURCE_CONTENT.docs;

  const handleLinkPress = (link) => {
    if (link?.url) {
      Linking.openURL(link.url).catch(() =>
        Alert.alert('Unable to open link', 'Please try again shortly.')
      );
    } else {
      Alert.alert('Coming soon', 'This resource will be available shortly.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => goBackOrNavigate(navigation)} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.emerald} />
        </TouchableOpacity>
        <Text style={styles.title}>{resource.title}</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={[styles.heroCard, { borderColor: resource.accentColor }]}>
          <View style={[styles.heroIcon, { backgroundColor: `${resource.accentColor}15` }]}>
            <Ionicons name={resource.icon} size={32} color={resource.accentColor} />
          </View>
          <Text style={styles.heroTitle}>{resource.title}</Text>
          <Text style={styles.heroSubtitle}>{resource.subtitle}</Text>
        </View>

        {resource.sections.map((section) => (
          <View key={section.heading} style={styles.sectionCard}>
            <Text style={styles.sectionHeading}>{section.heading}</Text>
            <Text style={styles.sectionDescription}>{section.description}</Text>
            {Array.isArray(section.bullets) &&
              section.bullets.map((bullet) => (
                <View key={bullet} style={styles.bulletRow}>
                  <Ionicons name="ellipse" size={8} color={resource.accentColor} />
                  <Text style={styles.bulletText}>{bullet}</Text>
                </View>
              ))}
          </View>
        ))}

        {Array.isArray(resource.links) && resource.links.length > 0 && (
          <View style={styles.linkSection}>
            <Text style={styles.sectionHeading}>Featured Resources</Text>
            {resource.links.map((link) => (
              <TouchableOpacity
                key={link.label}
                style={styles.linkCard}
                activeOpacity={0.8}
                onPress={() => handleLinkPress(link)}
              >
                <View style={styles.linkContent}>
                  <Text style={styles.linkLabel}>{link.label}</Text>
                  <Text style={styles.linkDescription}>{link.description}</Text>
                </View>
                <Ionicons name="open-outline" size={20} color={theme.colors.orange} />
              </TouchableOpacity>
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
    padding: theme.spacing.lg,
  },
  heroCard: {
    borderWidth: 1,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.white,
    marginBottom: theme.spacing.lg,
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
    ...theme.shadows.small,
  },
  heroIcon: {
    width: 54,
    height: 54,
    borderRadius: theme.borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroTitle: {
    fontFamily: theme.typography.fontFamily.anton,
    fontSize: theme.typography.fontSize['2xl'],
    color: theme.colors.textPrimary,
  },
  heroSubtitle: {
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    lineHeight: theme.typography.lineHeight.relaxed * theme.typography.fontSize.sm,
  },
  sectionCard: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.base,
    ...theme.shadows.small,
  },
  sectionHeading: {
    fontFamily: theme.typography.fontFamily.interSemiBold,
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  sectionDescription: {
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
    lineHeight: theme.typography.lineHeight.relaxed * theme.typography.fontSize.sm,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.xs / 2,
  },
  bulletText: {
    flex: 1,
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  linkSection: {
    marginTop: theme.spacing.lg,
  },
  linkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginTop: theme.spacing.sm,
    ...theme.shadows.small,
  },
  linkContent: {
    flex: 1,
    marginRight: theme.spacing.base,
  },
  linkLabel: {
    fontFamily: theme.typography.fontFamily.interSemiBold,
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textPrimary,
  },
  linkDescription: {
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs / 2,
  },
  bottomPadding: {
    height: theme.spacing['2xl'],
  },
});

export default HelpResourceScreen;
