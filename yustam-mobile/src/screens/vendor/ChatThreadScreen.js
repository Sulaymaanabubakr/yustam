import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import theme from '../../theme';
import Toast from '../../components/Toast';
import Button from '../../components/Button';
import { goBackOrNavigate } from '../../utils/navigation';
import { chatAPI } from '../../services/api';
import { timeAgo } from '../../utils/formatters';
import resolveMediaUrl from '../../utils/url';
import { USER_ROLES } from '../../config/constants';
import { resolveUserUid } from '../../utils/user';

const ChatThreadScreen = ({ navigation, route }) => {
  const {
    chatId,
    buyerName = 'Buyer',
    buyerPhoto,
    buyerId = '',
    vendorName,
    vendorPhoto,
    vendorPlanLabel,
    listingTitle = '',
    listingId = '',
    listingImage = '',
    vendorUid = '',
  } = route.params || {};
  const { user, role } = useAuth();
  const resolvedUid = resolveUserUid(user);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'info' });
  const listRef = useRef(null);
  const viewingAsVendor = role === USER_ROLES.VENDOR;
  const peerName = viewingAsVendor ? buyerName || 'Buyer' : vendorName || 'Marketplace Vendor';
  const peerSubtitle = viewingAsVendor
    ? buyerId ? `Buyer ID: ${buyerId}` : 'Buyer'
    : listingTitle || vendorPlanLabel || 'Vendor';
  const peerAvatar = viewingAsVendor ? resolveMediaUrl(buyerPhoto) : resolveMediaUrl(vendorPhoto);
  const viewerDisplayName = viewingAsVendor
    ? user?.businessName || user?.displayName || user?.fullName || user?.name || 'Vendor'
    : user?.fullName || user?.displayName || user?.email || 'Buyer';
  const buyerUidResolved = (viewingAsVendor ? buyerId : resolvedUid) || '';
  const vendorUidResolved = (viewingAsVendor ? resolvedUid : vendorUid) || '';
  const buyerDisplayName = viewingAsVendor ? buyerName || 'Buyer' : viewerDisplayName;
  const vendorDisplayName = viewingAsVendor ? viewerDisplayName : vendorName || 'Marketplace Vendor';
  const listingMeta = {
    id: listingId || '',
    title: listingTitle || '',
    image: resolveMediaUrl(listingImage) || '',
  };

  const showToast = (message, type = 'success') => {
    setToast({ visible: true, message, type });
  };

  const hideToast = () => {
    setToast({ ...toast, visible: false });
  };

  const mapMessage = useCallback(
    (message) => {
      const senderRaw = String(message.sender || message.role || message.author || '').toLowerCase();
      const senderUid = String(message.sender_uid || message.uid || '').trim();
      const viewerUid = (resolvedUid || '').toString();
      const senderRole = senderRaw.includes('vendor')
        ? USER_ROLES.VENDOR
        : senderRaw.includes('buyer')
        ? USER_ROLES.BUYER
        : null;
      const fallbackMine = senderRole
        ? senderRole === (viewingAsVendor ? USER_ROLES.VENDOR : USER_ROLES.BUYER)
        : viewingAsVendor
        ? !senderRaw.includes('buyer')
        : senderRaw.includes('buyer');
      const isMine =
        Boolean(message.isMine) ||
        (viewerUid && senderUid && viewerUid === senderUid) ||
        (!viewerUid && fallbackMine);

      return {
        id: message.id || message.message_id || message.clientId || `${Date.now()}-${Math.random()}`,
        text: message.message || message.text || message.body || '',
        type: message.type || (message.attachment ? 'image' : 'text'),
        timestamp: message.timestamp || message.created_at || message.sent_at || new Date().toISOString(),
        isMine,
        status: message.status || 'sent',
        attachment: resolveMediaUrl(message.attachment || message.image),
      };
    },
    [resolvedUid, viewingAsVendor]
  );

  const fetchMessages = useCallback(
    async (withSpinner = true) => {
      if (!chatId) {
        setLoading(false);
        setRefreshing(false);
        return;
      }

      try {
        if (withSpinner) {
          setLoading(true);
        }
        const response = await chatAPI.listMessages(chatId);
        const payload = response.data?.messages || response.data?.data?.messages || [];
        const nextMessages = payload
          .map(mapMessage)
          .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        setMessages(nextMessages);
        await chatAPI
          .markAsRead(chatId, viewingAsVendor ? 'vendor' : 'buyer')
          .catch(() => {});
        requestAnimationFrame(() => {
          listRef.current?.scrollToEnd({ animated: false });
        });
      } catch (error) {
        console.error('Error loading messages:', error);
        showToast(error.message || 'Unable to load messages right now.', 'error');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [chatId, mapMessage, viewingAsVendor]
  );

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  useFocusEffect(
    useCallback(() => {
      fetchMessages(false);
    }, [fetchMessages])
  );

  const handleSend = async () => {
    const trimmed = inputValue.trim();
    if (!trimmed || sending || !chatId) {
      return;
    }
    if (!buyerUidResolved || !vendorUidResolved) {
      showToast('Chat participants missing. Please reload the conversation.', 'error');
      return;
    }

    const tempId = `temp-${Date.now()}`;
    const optimisticMessage = {
      id: tempId,
      text: trimmed,
      type: 'text',
      timestamp: new Date().toISOString(),
      isMine: true,
      status: 'sending',
    };

    setMessages((prev) => [...prev, optimisticMessage]);
    setInputValue('');
    setSending(true);

    try {
      await chatAPI.sendMessage({
        chat_id: chatId,
        text: trimmed,
        message: trimmed,
        role: viewingAsVendor ? 'vendor' : 'buyer',
        buyer_uid: buyerUidResolved,
        buyer_name: buyerDisplayName,
        vendor_uid: vendorUidResolved,
        vendor_name: vendorDisplayName,
        vendor_business_name: vendorDisplayName,
        listing_id: listingMeta.id,
        listing_title: listingMeta.title,
        listing_image: listingMeta.image,
      });
      await fetchMessages(false);
    } catch (error) {
      console.error('Send message failed:', error);
      setMessages((prev) => prev.filter((msg) => msg.id !== tempId));
      showToast(error.message || 'Unable to send message. Please try again.', 'error');
    } finally {
      setSending(false);
    }
  };

  const renderMessage = ({ item }) => {
    const showTimestamp = !!item.timestamp;
    return (
      <View style={[styles.messageRow, item.isMine ? styles.myRow : styles.theirRow]}>
        <View style={[styles.messageBubble, item.isMine ? styles.myBubble : styles.theirBubble]}>
          {item.type === 'image' && item.attachment ? (
            <Image source={{ uri: item.attachment }} style={styles.messageImage} />
          ) : (
            <Text style={[styles.messageText, item.isMine && styles.myMessageText]}>{item.text}</Text>
          )}
          {showTimestamp && (
            <Text style={[styles.timestamp, item.isMine && styles.myTimestamp]}>
              {timeAgo(item.timestamp)}
              {item.status === 'sending' && ' - Sending'}
            </Text>
          )}
        </View>
      </View>
    );
  };

  const Header = () => (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => goBackOrNavigate(navigation)} style={styles.headerButton}>
        <Ionicons name="arrow-back" size={24} color={theme.colors.primary} />
      </TouchableOpacity>
      <View style={styles.headerInfo}>
        {peerAvatar ? (
          <Image source={{ uri: peerAvatar }} style={styles.headerAvatar} />
        ) : (
          <View style={styles.headerAvatarPlaceholder}>
            <Ionicons name="person" size={20} color={theme.colors.white} />
          </View>
        )}
        <View>
          <Text style={styles.headerTitle}>{peerName}</Text>
          <Text style={styles.headerSubtitle}>{peerSubtitle}</Text>
        </View>
      </View>
      <View style={styles.headerButton}>
        <Ionicons
          name={viewingAsVendor ? 'call-outline' : 'shield-checkmark-outline'}
          size={22}
          color={theme.colors.primary}
        />
      </View>
    </View>
  );

  if (!chatId) {
    return (
      <SafeAreaView style={styles.container}>
        <Header />
        <View style={styles.centerContent}>
          <Text style={styles.errorText}>Missing conversation details.</Text>
          <Button onPress={() => goBackOrNavigate(navigation)} variant="outline">
            Go Back
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Toast visible={toast.visible} message={toast.message} type={toast.type} onDismiss={hideToast} />
      <Header />

      {loading ? (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading conversation...</Text>
        </View>
      ) : (
        <KeyboardAvoidingView
          style={styles.keyboardAvoider}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderMessage}
            contentContainerStyle={styles.messagesContainer}
            onRefresh={() => {
              setRefreshing(true);
              fetchMessages(false);
            }}
            refreshing={refreshing}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          />

          <View style={styles.composer}>
            <TouchableOpacity style={styles.composerButton}>
              <Ionicons name="add-circle-outline" size={24} color={theme.colors.primary} />
            </TouchableOpacity>
            <TextInput
              style={styles.input}
              placeholder="Write a message..."
              placeholderTextColor={theme.colors.textSecondary}
              value={inputValue}
              onChangeText={setInputValue}
              multiline
            />
            <TouchableOpacity
              style={[
                styles.composerButton,
                styles.sendButton,
                (!inputValue.trim() || sending) && styles.sendButtonDisabled,
              ]}
              onPress={handleSend}
              disabled={!inputValue.trim() || sending}
            >
              {sending ? (
                <ActivityIndicator size="small" color={theme.colors.white} />
              ) : (
                <Ionicons name="send" size={20} color={theme.colors.white} />
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      )}
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
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.white,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${theme.colors.primary}10`,
  },
  headerInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginHorizontal: theme.spacing.md,
  },
  headerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  headerAvatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: theme.typography.fontFamily.interSemiBold,
    fontSize: theme.typography.fontSize.lg,
    color: theme.colors.textPrimary,
  },
  headerSubtitle: {
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textSecondary,
  },
  keyboardAvoider: {
    flex: 1,
  },
  messagesContainer: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  messageRow: {
    marginBottom: theme.spacing.sm,
    flexDirection: 'row',
  },
  myRow: {
    justifyContent: 'flex-end',
  },
  theirRow: {
    justifyContent: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.lg,
  },
  myBubble: {
    backgroundColor: theme.colors.primary,
    borderBottomRightRadius: 4,
  },
  theirBubble: {
    backgroundColor: theme.colors.backgroundLight,
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textPrimary,
  },
  myMessageText: {
    color: theme.colors.white,
  },
  timestamp: {
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.xs,
    marginTop: theme.spacing.xs / 2,
    color: theme.colors.textTertiary,
  },
  myTimestamp: {
    color: theme.colors.textLight,
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    backgroundColor: theme.colors.white,
    gap: theme.spacing.sm,
  },
  composerButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${theme.colors.primary}10`,
  },
  sendButton: {
    backgroundColor: theme.colors.primary,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  input: {
    flex: 1,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.lg,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textPrimary,
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.xl,
    gap: theme.spacing.base,
  },
  loadingText: {
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.sm,
  },
  errorText: {
    fontFamily: theme.typography.fontFamily.interSemiBold,
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.error,
    textAlign: 'center',
  },
  messageImage: {
    width: 180,
    height: 180,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.xs,
  },
});

export default ChatThreadScreen;
