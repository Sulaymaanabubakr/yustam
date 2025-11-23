import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import theme from '../../theme';
import Toast from '../../components/Toast';
import { subscribeChatsForBuyer } from '../../services/chatSync';
import resolveMediaUrl from '../../utils/url';
import { timeAgo } from '../../utils/formatters';
import { resolveUserUid } from '../../utils/user';

const ChatScreen = ({ navigation }) => {
  const { user } = useAuth();
  const buyerUid = resolveUserUid(user, 'buyer');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [chats, setChats] = useState([]);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'info' });

  const showToast = (message, type = 'success') => {
    setToast({ visible: true, message, type });
  };

  const hideToast = () => {
    setToast({ ...toast, visible: false });
  };

  const mapThreadToState = useCallback((chat) => ({
    id: chat.chat_id || chat.id,
    vendorName: chat.vendor_name || chat.vendor_business_name || chat.vendorName || 'Vendor',
    vendorPhoto: resolveMediaUrl(chat.vendor_avatar || chat.vendorAvatar),
    lastMessage: chat.last_text || chat.last_message || chat.lastMessage || '',
    lastMessageTime: chat.last_ts || chat.updated_at || chat.updatedAt || chat.created_at || chat.createdAt,
    unreadCount: Number(chat.unread_for_buyer ?? chat.unreadForBuyer ?? 0) || 0,
    lastType: chat.last_type || chat.lastType || 'text',
    vendorUid: chat.vendor_uid || chat.vendorUid || '',
    listingId: chat.listing_id || chat.listingId || '',
    listingTitle: chat.listing_title || chat.listingTitle || '',
    listingImage: resolveMediaUrl(chat.listing_image || chat.listingImage),
  }), []);

  const applyThreads = useCallback((threads = []) => {
    setChats(threads.map(mapThreadToState));
  }, [mapThreadToState]);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return () => {};
    }
    if (!buyerUid) {
      setChats([]);
      setLoading(false);
      showToast('We could not find your user ID. Please re-login and try again.', 'error');
      return () => {};
    }

    setLoading(true);
    const unsubscribe = subscribeChatsForBuyer(
      buyerUid,
      (threads = []) => {
        applyThreads(Array.isArray(threads) ? threads : []);
        setLoading(false);
        setRefreshing(false);
      },
      {
        onError: (error) => {
          console.error('Realtime chats failed:', error);
          showToast('Realtime chat updates are unavailable. Check your connection.', 'error');
        },
      }
    );

    return () => {
      unsubscribe?.();
    };
  }, [user, buyerUid, applyThreads]);

  const onRefresh = useCallback(async () => {
    // Firestore listener handles updates automatically
    setRefreshing(false);
  }, []);

  const formatTime = (value) => timeAgo(value);

  const getMessagePreview = (chat) => {
    if (chat.lastType === 'image') {
      return '📷 Photo attachment';
    }
    if (chat.lastType === 'voice') {
      return '🎤 Voice note';
    }
    return chat.lastMessage || 'New conversation';
  };

  const handleChatPress = (chat) => {
    navigation.navigate('ChatThread', {
      chatId: chat.id,
      vendorName: chat.vendorName,
      vendorPhoto: chat.vendorPhoto,
      vendorUid: chat.vendorUid,
      listingId: chat.listingId,
      listingTitle: chat.listingTitle,
      listingImage: chat.listingImage,
      buyerId: buyerUid,
      buyerName: user?.fullName || user?.displayName || user?.email || 'Buyer',
    });
  };

  const ChatItem = ({ item }) => (
    <TouchableOpacity
      style={styles.chatItem}
      onPress={() => handleChatPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.avatarContainer}>
        {item.vendorPhoto ? (
          <Image source={{ uri: item.vendorPhoto }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Ionicons name="storefront" size={24} color={theme.colors.white} />
          </View>
        )}
        {item.unreadCount > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadText}>{item.unreadCount}</Text>
          </View>
        )}
      </View>

      <View style={styles.chatContent}>
        <View style={styles.chatHeader}>
          <Text style={styles.vendorName}>{item.vendorName}</Text>
          <Text style={styles.time}>{formatTime(item.lastMessageTime)}</Text>
        </View>
        {item.listingTitle && (
          <Text style={styles.listingTitle} numberOfLines={1}>
            Re: {item.listingTitle}
          </Text>
        )}
        <Text
          style={[styles.lastMessage, item.unreadCount > 0 && styles.lastMessageUnread]}
          numberOfLines={1}
        >
          {getMessagePreview(item)}
        </Text>
      </View>

      <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
    </TouchableOpacity>
  );

  const EmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="chatbubbles-outline" size={80} color={theme.colors.textTertiary} />
      <Text style={styles.emptyText}>No messages yet</Text>
      <Text style={styles.emptySubtext}>
        Start a conversation with vendors by contacting them from product listings
      </Text>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>MESSAGES</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading messages...</Text>
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
        onDismiss={hideToast}
      />

      <View style={styles.header}>
        <Text style={styles.title}>MESSAGES</Text>
        {chats.length > 0 && (
          <View style={styles.totalUnreadBadge}>
            <Text style={styles.totalUnreadText}>
              {chats.reduce((sum, chat) => sum + chat.unreadCount, 0)}
            </Text>
          </View>
        )}
      </View>

      <FlatList
        data={chats}
        renderItem={({ item }) => <ChatItem item={item} />}
        keyExtractor={item => item.id}
        contentContainerStyle={chats.length === 0 ? styles.emptyContainer : styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
        ListEmptyComponent={<EmptyState />}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  title: {
    fontFamily: theme.typography.fontFamily.anton,
    fontSize: theme.typography.fontSize['2xl'],
    color: theme.colors.emerald,
    letterSpacing: theme.typography.letterSpacing.wide,
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
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.xs,
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
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textSecondary,
  },
  listContent: {
    paddingBottom: theme.spacing['2xl'],
  },
  emptyContainer: {
    flex: 1,
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.base,
    backgroundColor: theme.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
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
    borderColor: theme.colors.white,
  },
  unreadText: {
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.xs,
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
    marginBottom: 2,
  },
  vendorName: {
    fontFamily: theme.typography.fontFamily.interSemiBold,
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textPrimary,
  },
  time: {
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textSecondary,
  },
  listingTitle: {
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.accent,
    marginBottom: 2,
  },
  lastMessage: {
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  lastMessageUnread: {
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing['2xl'],
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
    lineHeight: theme.typography.lineHeight.relaxed * theme.typography.fontSize.base,
  },
});

export default ChatScreen;
