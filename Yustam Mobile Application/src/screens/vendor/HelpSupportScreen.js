import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import theme from '../../theme';
import Toast from '../../components/Toast';
import Button from '../../components/Button';

const HelpSupportScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [expandedFaq, setExpandedFaq] = useState(null);
  const [showContactForm, setShowContactForm] = useState(false);
  const [contactForm, setContactForm] = useState({
    subject: '',
    message: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'info' });

  const faqs = [
    {
      id: '1',
      question: 'How do I create a new listing?',
      answer: 'To create a new listing, tap the orange "+" button on the home screen. Fill in all required fields including product name, description, price, category, and upload at least one image. Once submitted, your listing will be reviewed by our team.',
    },
    {
      id: '2',
      question: 'Why was my listing rejected?',
      answer: 'Listings are typically rejected due to: incomplete information, poor quality images, prohibited items, misleading descriptions, or pricing issues. Check your notifications for specific reasons and resubmit after making corrections.',
    },
    {
      id: '3',
      question: 'How do I upgrade my plan?',
      answer: 'Go to Profile > Plans & Billing to view available plans. Select your desired plan and complete the payment process. Your new plan benefits will be activated immediately after successful payment.',
    },
    {
      id: '4',
      question: 'What payment methods are accepted?',
      answer: 'We accept various payment methods including: Bank Transfer, Debit/Credit Cards (Visa, Mastercard), and mobile money. All payments are processed securely through our payment partners.',
    },
    {
      id: '5',
      question: 'How long does verification take?',
      answer: 'Business verification typically takes 2-5 business days. Upload clear copies of your business registration, ID, and proof of address. You\'ll be notified once verification is complete.',
    },
    {
      id: '6',
      question: 'Can I edit a published listing?',
      answer: 'Yes, you can edit published listings anytime. Go to Profile > My Listings, select the listing you want to edit, make your changes, and save. Major changes may require re-approval.',
    },
    {
      id: '7',
      question: 'How do I contact buyers?',
      answer: 'Buyers can message you through the app\'s chat feature. You\'ll receive notifications for new messages. Go to the Chat tab to view and respond to all inquiries.',
    },
    {
      id: '8',
      question: 'What are the listing fees?',
      answer: 'Listing fees vary by plan. Free plan includes basic listings. Premium and Business plans offer additional features like priority placement, unlimited listings, and enhanced visibility. Check Plans & Billing for details.',
    },
  ];

  const showToast = (message, type = 'success') => {
    setToast({ visible: true, message, type });
  };

  const hideToast = () => {
    setToast({ ...toast, visible: false });
  };

  const toggleFaq = (faqId) => {
    setExpandedFaq(expandedFaq === faqId ? null : faqId);
  };

  const handleSubmitContact = async () => {
    if (!contactForm.subject.trim() || !contactForm.message.trim()) {
      showToast('Please fill in all fields', 'error');
      return;
    }

    try {
      setSubmitting(true);
      
      // TODO: Replace with actual API call
      // const response = await fetch('https://yustam.com/send-email.php', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     subject: contactForm.subject,
      //     message: contactForm.message,
      //     email: user?.email,
      //   }),
      // });
      
      // Mock submission
      setTimeout(() => {
        showToast('Your message has been sent. We\'ll respond within 24 hours.');
        setContactForm({ subject: '', message: '' });
        setShowContactForm(false);
        setSubmitting(false);
      }, 1500);
    } catch (error) {
      console.error('Error submitting contact form:', error);
      showToast('Failed to send message. Please try again.', 'error');
      setSubmitting(false);
    }
  };

  const FaqItem = ({ faq }) => {
    const isExpanded = expandedFaq === faq.id;
    return (
      <TouchableOpacity
        style={styles.faqCard}
        onPress={() => toggleFaq(faq.id)}
        activeOpacity={0.7}
      >
        <View style={styles.faqHeader}>
          <Text style={styles.faqQuestion}>{faq.question}</Text>
          <Ionicons
            name={isExpanded ? 'chevron-up' : 'chevron-down'}
            size={20}
            color={theme.colors.orange}
          />
        </View>
        {isExpanded && (
          <Text style={styles.faqAnswer}>{faq.answer}</Text>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={hideToast}
      />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.emerald} />
        </TouchableOpacity>
        <Text style={styles.title}>Help & Support</Text>
      </View>

      <ScrollView style={styles.content}>
        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => setShowContactForm(!showContactForm)}
            >
              <Ionicons name="mail-outline" size={32} color={theme.colors.orange} />
              <Text style={styles.actionText}>Contact Support</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => {
                // TODO: Navigate to appropriate screen
                showToast('Opening documentation...', 'info');
              }}
            >
              <Ionicons name="document-text-outline" size={32} color={theme.colors.emerald} />
              <Text style={styles.actionText}>View Docs</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => {
                // TODO: Navigate to tutorial/guides
                showToast('Opening tutorials...', 'info');
              }}
            >
              <Ionicons name="book-outline" size={32} color="#1976D2" />
              <Text style={styles.actionText}>Tutorials</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => {
                // TODO: Open community/forum
                showToast('Opening community...', 'info');
              }}
            >
              <Ionicons name="people-outline" size={32} color="#0F9D58" />
              <Text style={styles.actionText}>Community</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Contact Form */}
        {showContactForm && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Send us a message</Text>
            <View style={styles.contactForm}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Subject</Text>
                <TextInput
                  style={styles.input}
                  placeholder="What do you need help with?"
                  placeholderTextColor={theme.colors.textTertiary}
                  value={contactForm.subject}
                  onChangeText={(text) => setContactForm({ ...contactForm, subject: text })}
                />
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Message</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Describe your issue or question in detail..."
                  placeholderTextColor={theme.colors.textTertiary}
                  value={contactForm.message}
                  onChangeText={(text) => setContactForm({ ...contactForm, message: text })}
                  multiline
                  numberOfLines={6}
                  textAlignVertical="top"
                />
              </View>

              <View style={styles.formActions}>
                <Button
                  title="Cancel"
                  onPress={() => setShowContactForm(false)}
                  variant="outline"
                  style={styles.formButton}
                />
                <Button
                  title="Send Message"
                  onPress={handleSubmitContact}
                  variant="primary"
                  icon="send-outline"
                  loading={submitting}
                  style={styles.formButton}
                />
              </View>
            </View>
          </View>
        )}

        {/* FAQ Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
          <Text style={styles.sectionSubtitle}>
            Find answers to common vendor questions
          </Text>
          
          <View style={styles.faqContainer}>
            {faqs.map((faq) => (
              <FaqItem key={faq.id} faq={faq} />
            ))}
          </View>
        </View>

        {/* Contact Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Other Ways to Reach Us</Text>
          <View style={styles.contactCard}>
            <View style={styles.contactItem}>
              <Ionicons name="mail" size={20} color={theme.colors.orange} />
              <View style={styles.contactInfo}>
                <Text style={styles.contactLabel}>Email</Text>
                <Text style={styles.contactValue}>support@yustam.com</Text>
              </View>
            </View>
            <View style={styles.contactDivider} />
            <View style={styles.contactItem}>
              <Ionicons name="call" size={20} color={theme.colors.orange} />
              <View style={styles.contactInfo}>
                <Text style={styles.contactLabel}>Phone</Text>
                <Text style={styles.contactValue}>+234 800 YUSTAM (987826)</Text>
              </View>
            </View>
            <View style={styles.contactDivider} />
            <View style={styles.contactItem}>
              <Ionicons name="time" size={20} color={theme.colors.orange} />
              <View style={styles.contactInfo}>
                <Text style={styles.contactLabel}>Support Hours</Text>
                <Text style={styles.contactValue}>Mon-Fri: 8AM - 6PM WAT</Text>
              </View>
            </View>
          </View>
        </View>

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
  section: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.xl,
    paddingBottom: theme.spacing.base,
  },
  sectionTitle: {
    fontFamily: theme.typography.fontFamily.anton,
    fontSize: theme.typography.fontSize.xl,
    color: theme.colors.emerald,
    letterSpacing: theme.typography.letterSpacing.wide,
    marginBottom: theme.spacing.xs,
  },
  sectionSubtitle: {
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.base,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.base,
  },
  actionCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    alignItems: 'center',
    gap: theme.spacing.sm,
    ...theme.shadows.medium,
  },
  actionText: {
    fontFamily: theme.typography.fontFamily.interSemiBold,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textPrimary,
    textAlign: 'center',
  },
  contactForm: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    ...theme.shadows.medium,
  },
  inputGroup: {
    marginBottom: theme.spacing.base,
  },
  inputLabel: {
    fontFamily: theme.typography.fontFamily.interSemiBold,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.base,
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textPrimary,
  },
  textArea: {
    minHeight: 120,
  },
  formActions: {
    flexDirection: 'row',
    gap: theme.spacing.base,
    marginTop: theme.spacing.base,
  },
  formButton: {
    flex: 1,
  },
  faqContainer: {
    gap: theme.spacing.base,
  },
  faqCard: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    ...theme.shadows.small,
  },
  faqHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: theme.spacing.base,
  },
  faqQuestion: {
    flex: 1,
    fontFamily: theme.typography.fontFamily.interSemiBold,
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textPrimary,
  },
  faqAnswer: {
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    lineHeight: theme.typography.lineHeight.relaxed * theme.typography.fontSize.sm,
    marginTop: theme.spacing.base,
    paddingTop: theme.spacing.base,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  contactCard: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    ...theme.shadows.medium,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.base,
    paddingVertical: theme.spacing.sm,
  },
  contactInfo: {
    flex: 1,
  },
  contactLabel: {
    fontFamily: theme.typography.fontFamily.interMedium,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs / 2,
  },
  contactValue: {
    fontFamily: theme.typography.fontFamily.interSemiBold,
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textPrimary,
  },
  contactDivider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: theme.spacing.sm,
  },
  bottomPadding: {
    height: theme.spacing['2xl'],
  },
});

export default HelpSupportScreen;
