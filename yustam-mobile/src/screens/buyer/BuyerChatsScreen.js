import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import theme from '../../theme';
import Toast from '../../components/Toast';
import { goBackOrNavigate } from '../../utils/navigation';
import { resolveUserUid } from '../../utils/user';
import useChats from '../../hooks/useChats';
import { openChatInFirestore } from '../../services/chatFirestore';
import ChatsListView from '../shared/ChatsListView';
// time formatting handled in shared component

const BuyerChatsScreen = ({ navigation }) => {
  const { user } = useAuth();
  const buyerUid = resolveUserUid(user, 'buyer');
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    try {
      console.debug('[BuyerChatsScreen] userSummary', { uid: user?.uid || user?.id || null, email: user?.email || null });
      console.debug('[BuyerChatsScreen] resolved buyerUid', { buyerUid });
    } catch (e) {
      console.debug('[BuyerChatsScreen] resolved buyerUid', { buyerUid });
    }
  }
  const [toast, setToast] = useState({ visible: false, message: '', type: 'info' });

  const showToast = (message, type = 'success') => setToast({ visible: true, message, type });
  const hideToast = () => setToast(prev => ({ ...prev, visible: false }));

  const { chats, loading, refreshing, onRefresh } = useChats({ uid: buyerUid, role: 'buyer', onError: () => {
    showToast('Realtime chat updates are unavailable. Check your connection.', 'error');
  }});
  // shared component handles per-item formatting

  const handleChatPress = async (chat) => {
    // Ensure Firestore chat doc exists and return the canonical chatId
    try {
      const canonicalChatId = await openChatInFirestore({
        buyerUid,
        vendorUid: chat.vendorId,
        buyerName: user?.fullName || user?.displayName || user?.email || 'Buyer',
        vendorName: chat.vendorName,
        buyerAvatar: user?.photoURL || '',
        vendorAvatar: chat.vendorPhoto || '',
        listingId: chat.listingId,
        listingTitle: chat.listingTitle,
        listingImage: chat.listingImage,
      });

      navigation.navigate('ChatThread', {
        chatId: canonicalChatId,
        vendorName: chat.vendorName,
        vendorPhoto: chat.vendorPhoto,
        vendorId: chat.vendorId,
        listingId: chat.listingId,
        listingTitle: chat.listingTitle,
        listingImage: chat.listingImage,
      });
    } catch (err) {
      console.error('Unable to open chat:', err);
      showToast('Unable to open conversation. Please try again.', 'error');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Toast visible={toast.visible} message={toast.message} type={toast.type} onDismiss={hideToast} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => goBackOrNavigate(navigation)} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>MESSAGES</Text>
        <View style={styles.headerRight}>
          {chats.length > 0 && (
            <View style={styles.totalUnreadBadge}>
              <Text style={styles.totalUnreadText}>{chats.reduce((sum, chat) => sum + (chat.unreadCount || 0), 0)}</Text>
            </View>
          )}
        </View>
      </View>

      <ChatsListView chats={chats} loading={loading} refreshing={refreshing} onRefresh={onRefresh} onChatPress={handleChatPress} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
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
    alignItems: 'flex-end',
  },
  totalUnreadBadge: {
    backgroundColor: theme.colors.error,
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  totalUnreadText: {
    fontFamily: theme.typography.fontFamilyBody,
    fontSize: theme.typography.sizes.xs,
    fontWeight: '700',
    color: '#FFFFFF',
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
  listContent: {
    paddingBottom: 80,
  },
  emptyContainer: {
    flex: 1,
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.base,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: theme.spacing.base,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: theme.colors.beige,
  },
  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unreadBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: theme.colors.error,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  unreadText: {
    fontFamily: theme.typography.fontFamilyBody,
    fontSize: theme.typography.sizes.xs,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  chatContent: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  vendorName: {
    fontFamily: theme.typography.fontFamilyBody,
    fontSize: theme.typography.sizes.base,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  time: {
    fontFamily: theme.typography.fontFamilyBody,
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textSecondary,
  },
  lastMessage: {
    fontFamily: theme.typography.fontFamilyBody,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
  },
  lastMessageUnread: {
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing['2xl'],
  },
  emptyTitle: {
    fontFamily: theme.typography.fontFamilyHeading,
    fontSize: theme.typography.sizes.xl,
    color: theme.colors.textPrimary,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  emptyMessage: {
    fontFamily: theme.typography.fontFamilyBody,
    fontSize: theme.typography.sizes.base,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
});

export default BuyerChatsScreen;
