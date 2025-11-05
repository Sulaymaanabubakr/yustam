import React, { useState, useEffect } from 'react';
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

const VendorChatsScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [chats, setChats] = useState([]);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'info' });

  useEffect(() => {
    fetchChats();
  }, []);

  const fetchChats = async () => {
    try {
      setLoading(true);
      
      // TODO: Implement Firebase Firestore subscription for real-time chats
      // This should subscribe to the vendor's chat threads from Firestore
      // Similar to vendor-chats.js in the web app
      
      // Mock data for now
      setTimeout(() => {
        const mockChats = [
          {
            id: 'chat1',
            buyerName: 'John Doe',
            buyerPhoto: 'https://via.placeholder.com/50',
            lastMessage: 'Is this still available?',
            lastMessageTime: new Date(Date.now() - 1000 * 60 * 15), // 15 minutes ago
            unreadCount: 2,
            lastType: 'text',
            buyerId: 'buyer1',
          },
          {
            id: 'chat2',
            buyerName: 'Jane Smith',
            buyerPhoto: 'https://via.placeholder.com/50',
            lastMessage: 'What is your best price?',
            lastMessageTime: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
            unreadCount: 0,
            lastType: 'text',
            buyerId: 'buyer2',
          },
          {
            id: 'chat3',
            buyerName: 'Mike Johnson',
            buyerPhoto: 'https://via.placeholder.com/50',
            lastMessage: 'Photo attachment',
            lastMessageTime: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
            unreadCount: 0,
            lastType: 'image',
            buyerId: 'buyer3',
          },
        ];
        setChats(mockChats);
        setLoading(false);
      }, 1000);
    } catch (error) {
      console.error('Error fetching chats:', error);
      showToast('Failed to load chats', 'error');
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchChats();
    setRefreshing(false);
  };

  const showToast = (message, type = 'success') => {
    setToast({ visible: true, message, type });
  };

  const hideToast = () => {
    setToast({ ...toast, visible: false });
  };

  const formatTime = (date) => {
    if (!date) return '';
    
    const now = new Date();
    const diffMs = now - date;
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMinutes < 1) return 'just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

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
    // TODO: Navigate to chat thread detail screen
    // navigation.navigate('ChatThread', { chatId: chat.id, buyerName: chat.buyerName });
    showToast('Chat detail view coming soon', 'info');
  };

  const ChatItem = ({ item }) => (
    <TouchableOpacity
      style={styles.chatItem}
      onPress={() => handleChatPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.avatarContainer}>
        {item.buyerPhoto ? (
          <Image source={{ uri: item.buyerPhoto }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Ionicons name="person" size={24} color={theme.colors.white} />
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
          <Text style={styles.buyerName}>{item.buyerName}</Text>
          <Text style={styles.time}>{formatTime(item.lastMessageTime)}</Text>
        </View>
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
      <Ionicons name="chatbubbles-outline" size={64} color={theme.colors.textSecondary} />
      <Text style={styles.emptyTitle}>No Messages Yet</Text>
      <Text style={styles.emptyMessage}>
        When buyers contact you about your listings, their messages will appear here
      </Text>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>MESSAGES</Text>
          <View style={styles.headerRight} />
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

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>MESSAGES</Text>
        <View style={styles.headerRight}>
          {chats.length > 0 && (
            <View style={styles.totalUnreadBadge}>
              <Text style={styles.totalUnreadText}>
                {chats.reduce((sum, chat) => sum + chat.unreadCount, 0)}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Chat List */}
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

      {/* Info Banner */}
      {chats.length > 0 && (
        <View style={styles.infoBanner}>
          <Ionicons name="information-circle-outline" size={20} color={theme.colors.accent} />
          <Text style={styles.infoText}>
            Respond quickly to maintain good buyer relationships
          </Text>
        </View>
      )}
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
  buyerName: {
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
  infoBanner: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${theme.colors.accent}15`,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.base,
    gap: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: `${theme.colors.accent}30`,
  },
  infoText: {
    flex: 1,
    fontFamily: theme.typography.fontFamilyBody,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.accent,
  },
});

export default VendorChatsScreen;
