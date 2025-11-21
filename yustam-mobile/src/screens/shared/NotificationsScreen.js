import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Linking,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import theme from '../../theme';
import Toast from '../../components/Toast';
import { notificationsAPI } from '../../services/api';
import { saveNotificationsMeta } from '../../storage/notificationsMeta';
import { timeAgo } from '../../utils/formatters';

const NotificationsScreen = () => {
  const { role } = useAuth();
  const navigation = useNavigation();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState({ visible: false, message: '', type: 'info' });

  const showToast = useCallback((message, type = 'info') => {
    setToast({ visible: true, message, type });
  }, []);

  const hideToast = useCallback(() => {
    setToast((prev) => ({ ...prev, visible: false }));
  }, []);

  const persistMeta = useCallback(async (list = []) => {
    const unread = list.filter((notification) => !notification.read).length;
    await saveNotificationsMeta({
      total: list.length,
      unread,
      lastFetchedAt: new Date().toISOString(),
    });
  }, []);

  // Redirect vendors to the full VendorNotificationsScreen
  useFocusEffect(
    useCallback(() => {
      if (role === 'vendor') {
        const timer = setTimeout(() => {
          navigation.replace('VendorNotifications');
        }, 100);
        return () => clearTimeout(timer);
      }
      return undefined;
    }, [navigation, role])
  );

  const mapNotification = useCallback((raw, index) => {
    const id = String(raw?.id ?? raw?._id ?? raw?.reference ?? index);
    const createdAt =
      raw?.createdAt ||
      raw?.created_at ||
      raw?.timestamp ||
      raw?.sentAt ||
      raw?.date ||
      null;
    const readAt = raw?.readAt || raw?.read_at || raw?.seenAt || raw?.seen_at || null;
    const type = (raw?.type || raw?.category || raw?.kind || 'general').toString().toLowerCase();
    return {
      id,
      title: raw?.title || raw?.subject || raw?.heading || 'Notification',
      message: raw?.message || raw?.body || raw?.description || raw?.text || '',
      type,
      createdAt,
      read: Boolean(readAt),
      link: raw?.url || raw?.link || null,
      route: raw?.route || null,
      raw,
    };
  }, []);

  const loadNotifications = useCallback(async () => {
    setError('');
    setLoading(true);
    try {
      const response = await notificationsAPI.list({ limit: 40 });
      const next = Array.isArray(response) ? response.map(mapNotification) : [];
      setNotifications(next);
      persistMeta(next);
    } catch (fetchError) {
      console.error('Buyer notifications load error:', fetchError);
      setError(fetchError?.message || 'Unable to load notifications right now.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [mapNotification, persistMeta]);

  useFocusEffect(
    useCallback(() => {
      loadNotifications();
    }, [loadNotifications])
  );

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadNotifications();
  }, [loadNotifications]);

  const handleMarkMany = useCallback(
    async (ids = []) => {
      if (!ids.length) {
        return;
      }
      try {
        await notificationsAPI.markMany(ids);
        let nextState = [];
        setNotifications((prev) => {
          nextState = prev.map((notification) =>
            ids.includes(notification.id) ? { ...notification, read: true } : notification
          );
          return nextState;
        });
        persistMeta(nextState);
      } catch (markError) {
        console.error('Buyer notifications mark error:', markError);
        showToast(markError?.message || 'Unable to update notification.', 'error');
      }
    },
    [persistMeta, showToast]
  );

  const handleMarkAll = useCallback(async () => {
    const unreadIds = notifications.filter((item) => !item.read).map((item) => item.id);
    if (!unreadIds.length) {
      showToast('All caught up!', 'info');
      return;
    }
    await handleMarkMany(unreadIds);
    showToast('Notifications marked as read.', 'success');
  }, [handleMarkMany, notifications, showToast]);

  const handleNotificationPress = useCallback(
    async (item) => {
      if (!item.read) {
        await handleMarkMany([item.id]);
      }
      if (item.route) {
        navigation.navigate(item.route.name || item.route, item.route.params || {});
        return;
      }
      if (item.link) {
        try {
          await Linking.openURL(item.link);
        } catch (linkError) {
          console.warn('Failed to open notification link:', linkError);
          showToast('Unable to open link.', 'error');
        }
      }
    },
    [handleMarkMany, navigation, showToast]
  );

  const resolveIcon = useCallback((type) => {
    switch (type) {
      case 'wishlist':
      case 'wish':
        return { name: 'heart-outline', color: theme.colors.orange };
      case 'reward':
      case 'rewards':
        return { name: 'gift-outline', color: theme.colors.emerald };
      case 'order':
        return { name: 'bag-check-outline', color: theme.colors.primary };
      case 'chat':
        return { name: 'chatbubble-ellipses-outline', color: theme.colors.primary };
      default:
        return { name: 'notifications-outline', color: theme.colors.textSecondary };
    }
  }, []);

  const unreadCount = useMemo(() => notifications.filter((notification) => !notification.read).length, [notifications]);

  const renderNotification = ({ item }) => {
    const iconMeta = resolveIcon(item.type);
    return (
      <TouchableOpacity
        style={[styles.notificationRow, !item.read && styles.notificationRowUnread]}
        onPress={() => handleNotificationPress(item)}
        activeOpacity={0.85}
      >
        <View style={styles.notificationIconWrapper}>
          <Ionicons name={iconMeta.name} size={20} color={iconMeta.color} />
        </View>
        <View style={styles.notificationBody}>
          <Text style={styles.notificationTitle}>{item.title}</Text>
          {item.message ? <Text style={styles.notificationMessage}>{item.message}</Text> : null}
          <Text style={styles.notificationMeta}>{item.createdAt ? timeAgo(item.createdAt) : 'Just now'}</Text>
        </View>
        {!item.read ? <View style={styles.unreadDot} /> : null}
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <Ionicons name="notifications-outline" size={64} color={theme.colors.textTertiary} />
      <Text style={styles.emptyText}>No notifications yet</Text>
      <Text style={styles.emptySubtext}>
        We will let you know when there are updates about your wishlist, rewards, or account activity.
      </Text>
    </View>
  );

  // Buyer notifications (simplified for now)
  return (
    <SafeAreaView style={styles.container}>
      <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={hideToast} />
      <View style={styles.header}>
        <Text style={styles.title}>Notifications</Text>
        <TouchableOpacity
          style={[styles.markAllButton, !unreadCount && styles.markAllButtonDisabled]}
          onPress={handleMarkAll}
          disabled={!unreadCount}
          activeOpacity={0.75}
        >
          <Ionicons name="checkmark-done" size={16} color={unreadCount ? theme.colors.emerald : theme.colors.textTertiary} />
          <Text
            style={[
              styles.markAllButtonText,
              !unreadCount && styles.markAllButtonTextDisabled,
            ]}
          >
            Mark all read
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={theme.colors.orange} />
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={renderNotification}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={renderEmpty}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={theme.colors.orange}
            />
          }
        />
      )}

      {error ? (
        <View style={styles.errorBanner}>
          <Ionicons name="warning-outline" size={18} color={theme.colors.error} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.white,
  },
  header: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontFamily: theme.typography.fontFamily.anton,
    fontSize: theme.typography.fontSize['2xl'],
    color: theme.colors.emerald,
    letterSpacing: theme.typography.letterSpacing.wide,
  },
  markAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radius.full,
    borderWidth: 1,
    borderColor: `${theme.colors.emerald}35`,
    backgroundColor: theme.colors.white,
  },
  markAllButtonDisabled: {
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
  },
  markAllButtonText: {
    fontFamily: theme.typography.fontFamily.interSemiBold,
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.emerald,
  },
  markAllButtonTextDisabled: {
    color: theme.colors.textTertiary,
  },
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  notificationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.white,
    borderRadius: theme.radius.xl,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    ...theme.shadows.card,
  },
  notificationRowUnread: {
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.emerald,
  },
  notificationIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: theme.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background,
  },
  notificationBody: {
    flex: 1,
    gap: 4,
  },
  notificationTitle: {
    fontFamily: theme.typography.fontFamily.interSemiBold,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textPrimary,
  },
  notificationMessage: {
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textSecondary,
    lineHeight: theme.typography.lineHeight.relaxed * theme.typography.fontSize.xs,
  },
  notificationMeta: {
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textTertiary,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.emerald,
    marginTop: theme.spacing.xs,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing['3xl'],
    paddingHorizontal: theme.spacing.lg,
  },
  emptyText: {
    fontFamily: theme.typography.fontFamily.interSemiBold,
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textPrimary,
  },
  emptySubtext: {
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    padding: theme.spacing.sm,
    borderRadius: theme.radius.lg,
    backgroundColor: `${theme.colors.error}10`,
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
  },
  errorText: {
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.error,
    flex: 1,
  },
});

export default NotificationsScreen;
