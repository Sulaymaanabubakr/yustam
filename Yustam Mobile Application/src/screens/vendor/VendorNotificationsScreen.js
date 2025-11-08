import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import theme from '../../theme';
import Toast from '../../components/Toast';
import { vendorAPI } from '../../services/api';
import { goBackOrNavigate } from '../../utils/navigation';
import { timeAgo } from '../../utils/formatters';

const VendorNotificationsScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'info' });
  const [notifications, setNotifications] = useState([]);
  const [filter, setFilter] = useState('all'); // all, unread, read

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await vendorAPI.getNotifications();
      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Unable to load notifications.');
      }
      const items = response.data?.data?.notifications || [];
      setNotifications(
        items.map((notification) => ({
          id: String(notification.id),
          type: notification.type || 'general',
          title: notification.title || 'Notification',
          message: notification.message || notification.detail || '',
          timestamp: notification.createdAt,
          read: (notification.status || '').toLowerCase() === 'read',
        }))
      );
    } catch (error) {
      console.error('Error fetching notifications:', error);
      showToast(error.message || 'Failed to load notifications', 'error');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchNotifications();
    setRefreshing(false);
  };

  const showToast = (message, type = 'success') => {
    setToast({ visible: true, message, type });
  };

  const hideToast = () => {
    setToast({ ...toast, visible: false });
  };

  const markAsRead = (notificationId) => {
    setNotifications(
      notifications.map((notif) =>
        notif.id === notificationId ? { ...notif, read: true } : notif
      )
    );
  };

  const markAllAsRead = async () => {
    try {
      await vendorAPI.updateNotifications('markAllRead');
      setNotifications((current) => current.map((notif) => ({ ...notif, read: true })));
      showToast('All notifications marked as read');
    } catch (error) {
      console.error('Error updating notifications:', error);
      showToast(error.message || 'Unable to mark notifications as read', 'error');
    }
  };

  const clearAllNotifications = () => {
    Alert.alert(
      'Clear All Notifications',
      'Are you sure you want to clear all notifications? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            try {
              await vendorAPI.updateNotifications('clearAll');
              setNotifications([]);
              showToast('All notifications cleared');
            } catch (error) {
              console.error('Error clearing notifications:', error);
              showToast(error.message || 'Unable to clear notifications', 'error');
            }
          },
        },
      ]
    );
  };

  const getTimeAgo = (timestamp) => timeAgo(timestamp);

  const getNotificationMeta = (type) => {
    switch ((type || '').toLowerCase()) {
      case 'approval':
        return { icon: 'checkmark-circle', color: '#0F9D58' };
      case 'rejection':
        return { icon: 'close-circle', color: '#D93025' };
      case 'message':
        return { icon: 'chatbubble', color: theme.colors.orange };
      case 'plan':
        return { icon: 'card-outline', color: '#FFA500' };
      case 'verification':
        return { icon: 'shield-checkmark', color: theme.colors.emerald };
      default:
        return { icon: 'notifications-outline', color: theme.colors.textSecondary };
    }
  };

  const filteredNotifications = notifications.filter((notif) => {
    if (filter === 'unread') return !notif.read;
    if (filter === 'read') return notif.read;
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  const NotificationCard = ({ notification }) => {
    const meta = getNotificationMeta(notification.type);
    return (
      <TouchableOpacity
        style={[styles.notificationCard, !notification.read && styles.unreadCard]}
        onPress={() => markAsRead(notification.id)}
        activeOpacity={0.7}
      >
        <View style={[styles.iconContainer, { backgroundColor: `${meta.color}20` }]}>
          <Ionicons name={meta.icon} size={24} color={meta.color} />
        </View>
        
        <View style={styles.notificationContent}>
          <View style={styles.notificationHeader}>
            <Text style={styles.notificationTitle} numberOfLines={1}>
              {notification.title}
            </Text>
            <Text style={styles.timestamp}>{getTimeAgo(notification.timestamp)}</Text>
          </View>
          <Text style={styles.notificationMessage} numberOfLines={2}>
            {notification.message}
          </Text>
          {!notification.read && <View style={styles.unreadDot} />}
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => goBackOrNavigate(navigation)} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.emerald} />
          </TouchableOpacity>
          <Text style={styles.title}>Notifications</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.orange} />
          <Text style={styles.loadingText}>Loading notifications...</Text>
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
        onHide={hideToast}
      />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => goBackOrNavigate(navigation)} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.emerald} />
        </TouchableOpacity>
        <Text style={styles.title}>Notifications</Text>
        {unreadCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{unreadCount}</Text>
          </View>
        )}
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'all' && styles.activeFilter]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterText, filter === 'all' && styles.activeFilterText]}>
            All ({notifications.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'unread' && styles.activeFilter]}
          onPress={() => setFilter('unread')}
        >
          <Text style={[styles.filterText, filter === 'unread' && styles.activeFilterText]}>
            Unread ({unreadCount})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'read' && styles.activeFilter]}
          onPress={() => setFilter('read')}
        >
          <Text style={[styles.filterText, filter === 'read' && styles.activeFilterText]}>
            Read ({notifications.length - unreadCount})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Actions */}
      {notifications.length > 0 && (
        <View style={styles.actionsBar}>
          {unreadCount > 0 && (
            <TouchableOpacity style={styles.actionLink} onPress={markAllAsRead}>
              <Ionicons name="checkmark-done-outline" size={16} color={theme.colors.orange} />
              <Text style={styles.actionLinkText}>Mark all as read</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.actionLink} onPress={clearAllNotifications}>
            <Ionicons name="trash-outline" size={16} color={theme.colors.orange} />
            <Text style={styles.actionLinkText}>Clear all</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.colors.orange]}
            tintColor={theme.colors.orange}
          />
        }
      >
        {filteredNotifications.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="notifications-outline" size={64} color={theme.colors.textTertiary} />
            <Text style={styles.emptyText}>
              {filter === 'unread' ? 'No unread notifications' : 
               filter === 'read' ? 'No read notifications' : 
               'No notifications yet'}
            </Text>
            <Text style={styles.emptySubtext}>
              You'll see updates about your listings, messages, and account activity here
            </Text>
          </View>
        ) : (
          <View style={styles.notificationsContainer}>
            {filteredNotifications.map((notification) => (
              <NotificationCard key={notification.id} notification={notification} />
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
    flex: 1,
    fontFamily: theme.typography.fontFamily.anton,
    fontSize: theme.typography.fontSize['2xl'],
    color: theme.colors.emerald,
    letterSpacing: theme.typography.letterSpacing.wide,
  },
  badge: {
    backgroundColor: theme.colors.orange,
    borderRadius: theme.borderRadius.full,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xs,
  },
  badgeText: {
    fontFamily: theme.typography.fontFamily.interBold,
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.white,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.base,
    backgroundColor: theme.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    gap: theme.spacing.sm,
  },
  filterButton: {
    paddingHorizontal: theme.spacing.base,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.background,
  },
  activeFilter: {
    backgroundColor: theme.colors.orange,
  },
  filterText: {
    fontFamily: theme.typography.fontFamily.interMedium,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  activeFilterText: {
    color: theme.colors.white,
  },
  actionsBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    gap: theme.spacing.base,
    backgroundColor: theme.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  actionLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  actionLinkText: {
    fontFamily: theme.typography.fontFamily.interMedium,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.orange,
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: theme.spacing.base,
  },
  loadingText: {
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textSecondary,
  },
  notificationsContainer: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.base,
    gap: theme.spacing.base,
  },
  notificationCard: {
    flexDirection: 'row',
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.base,
    gap: theme.spacing.base,
    ...theme.shadows.small,
  },
  unreadCard: {
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.orange,
    ...theme.shadows.medium,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: theme.borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationContent: {
    flex: 1,
    position: 'relative',
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.xs,
    gap: theme.spacing.sm,
  },
  notificationTitle: {
    flex: 1,
    fontFamily: theme.typography.fontFamily.interSemiBold,
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textPrimary,
  },
  timestamp: {
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textTertiary,
  },
  notificationMessage: {
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    lineHeight: theme.typography.lineHeight.relaxed * theme.typography.fontSize.sm,
  },
  unreadDot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 8,
    height: 8,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.orange,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing['3xl'],
    paddingHorizontal: theme.spacing.xl,
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
  },
  bottomPadding: {
    height: theme.spacing['2xl'],
  },
});

export default VendorNotificationsScreen;
