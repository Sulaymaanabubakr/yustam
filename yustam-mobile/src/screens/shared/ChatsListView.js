import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, RefreshControl, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import theme from '../../theme';
import { timeAgo } from '../../utils/formatters';

const formatTime = (value) => timeAgo(value);

const getMessagePreview = (chat) => {
  if (chat.lastType === 'image') return '📷 Photo attachment';
  if (chat.lastType === 'voice') return '🎤 Voice note';
  return chat.lastMessage || 'New conversation';
};

const ChatItem = ({ item, onPress }) => (
  <TouchableOpacity style={styles.chatItem} onPress={() => onPress(item)} activeOpacity={0.7}>
    <View style={styles.avatarContainer}>
      {item.vendorPhoto ? (
        <Image source={{ uri: item.vendorPhoto }} style={styles.avatar} />
      ) : (
        <View style={styles.avatarPlaceholder}>
          <Ionicons name="storefront-outline" size={24} color={theme.colors.white} />
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
      <Text style={[styles.lastMessage, item.unreadCount > 0 && styles.lastMessageUnread]} numberOfLines={1}>
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
    <Text style={styles.emptyMessage}>When you contact a vendor about a listing, your messages will appear here.</Text>
  </View>
);

const ChatsListView = ({ chats = [], loading = false, refreshing = false, onRefresh = () => {}, onChatPress = () => {} }) => {
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading messages...</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={chats}
      renderItem={({ item }) => <ChatItem item={item} onPress={onChatPress} />}
      keyExtractor={(item, index) => String(item.id || index)}
      contentContainerStyle={chats.length === 0 ? styles.emptyContainer : styles.listContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} tintColor={theme.colors.primary} />}
      ListEmptyComponent={<EmptyState />}
    />
  );
};

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: theme.spacing.md, fontFamily: theme.typography.fontFamilyBody, fontSize: theme.typography.sizes.base, color: theme.colors.textSecondary },
  listContent: { paddingBottom: 80 },
  emptyContainer: { flex: 1 },
  chatItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.base, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  avatarContainer: { position: 'relative', marginRight: theme.spacing.base },
  avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: theme.colors.beige },
  avatarPlaceholder: { width: 50, height: 50, borderRadius: 25, backgroundColor: theme.colors.primary, justifyContent: 'center', alignItems: 'center' },
  unreadBadge: { position: 'absolute', top: -4, right: -4, backgroundColor: theme.colors.error, borderRadius: 10, minWidth: 20, height: 20, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 6, borderWidth: 2, borderColor: '#FFFFFF' },
  unreadText: { fontFamily: theme.typography.fontFamilyBody, fontSize: theme.typography.sizes.xs, fontWeight: '700', color: '#FFFFFF' },
  chatContent: { flex: 1 },
  chatHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  vendorName: { fontFamily: theme.typography.fontFamilyBody, fontSize: theme.typography.sizes.base, fontWeight: '600', color: theme.colors.textPrimary },
  time: { fontFamily: theme.typography.fontFamilyBody, fontSize: theme.typography.sizes.xs, color: theme.colors.textSecondary },
  lastMessage: { fontFamily: theme.typography.fontFamilyBody, fontSize: theme.typography.sizes.sm, color: theme.colors.textSecondary },
  lastMessageUnread: { fontWeight: '600', color: theme.colors.textPrimary },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: theme.spacing['2xl'] },
  emptyTitle: { fontFamily: theme.typography.fontFamilyHeading, fontSize: theme.typography.sizes.xl, color: theme.colors.textPrimary, marginTop: theme.spacing.md, marginBottom: theme.spacing.sm },
  emptyMessage: { fontFamily: theme.typography.fontFamilyBody, fontSize: theme.typography.sizes.base, color: theme.colors.textSecondary, textAlign: 'center', lineHeight: 24 },
});

export default ChatsListView;
