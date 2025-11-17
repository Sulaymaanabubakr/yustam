import React, { useCallback, useMemo, useState } from 'react';
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
import { useFocusEffect } from '@react-navigation/native';
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
  const [filter, setFilter] = useState('all');
  const [summary, setSummary] = useState({ total: 0, unread: 0 });

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const response = await vendorAPI.getNotifications();
      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Unable to load notifications.');
      }
      const payload = response.data?.data || {};
      const items = Array.isArray(payload.notifications) ? payload.notifications : [];
      const normalized = items.map((notification) => {
        const status = (notification.status || '').toLowerCase() === 'read' ? 'read' : 'new';
        return {
          id: String(notification.id ?? notification.notificationId ?? notification.uid ?? Date.now()),
          type: notification.type || 'bell',
          title: notification.title || 'Notification',
          message: notification.message || notification.detail || '',
          detail: notification.detail || '',
          timestamp: notification.createdAt || notification.timestamp || '',
          createdLabel: notification.createdLabel || '',
          read: status === 'read',
        };
      });
      setNotifications(normalized);
      const counts = payload.counts || {};
      const total = typeof counts.total === 'number' ? counts.total : normalized.length;
      const unread =
        typeof counts.unread === 'number'
          ? counts.unread
          : normalized.filter((notif) => !notif.read).length;
      setSummary({ total, unread });
    } catch (error) {
      console.error('Error fetching notifications:', error);
      showToast(error.message || 'Failed to load notifications', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchNotifications();
    setRefreshing(false);
  };

  useFocusEffect(
    useCallback(() => {
      fetchNotifications();
    }, [fetchNotifications])
  );

  const showToast = (message, type = 'success') => {
    setToast({ visible: true, message, type });
  };

  const hideToast = () => {
    setToast({ ...toast, visible: false });
  };

  const markAsRead = async (notificationId) => {
    setNotifications((current) =>
      current.map((notif) =>
        notif.id === notificationId ? { ...notif, read: true } : notif
      )
    );
    try {
      await vendorAPI.updateNotifications('markRead', { notificationId });
      setSummary((prev) => ({
        total: prev.total,
        unread: Math.max(0, prev.unread - 1),
      }));
    } catch (error) {
      console.error('Error marking notification as read:', error);
      setNotifications((current) =>
        current.map((notif) =>
          notif.id === notificationId ? { ...notif, read: false } : notif
        )
      );
      showToast(error.message || 'Unable to update notification', 'error');
    }
  };

  const markAllAsRead = async () => {
    if (!summary.unread) {
      showToast('You are all caught up!');
      return;
    }
    try {
      await vendorAPI.updateNotifications('markAllRead');
      setNotifications((current) => current.map((notif) => ({ ...notif, read: true })));
      setSummary((prev) => ({ ...prev, unread: 0 }));
      showToast('All notifications marked as read');
    } catch (error) {
      console.error('Error updating notifications:', error);
      showToast(error.message || 'Unable to mark notifications as read', 'error');
    }
  };

  const clearAllNotifications = () => {
    if (!notifications.length) {
      showToast('No notifications to clear.');
      return;
    }
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
              setSummary({ total: 0, unread: 0 });
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

  const filterOptions = useMemo(
    () => [
      { key: 'all', label: 'All', count: summary.total },
      { key: 'unread', label: 'Unread', count: summary.unread },
      { key: 'read', label: 'Read', count: Math.max(0, summary.total - summary.unread) },
    ],
    [summary],
  );

  const filteredNotifications = useMemo(() => {
    if (filter === 'unread') {
      return notifications.filter((notif) => !notif.read);
    }
    if (filter === 'read') {
      return notifications.filter((notif) => notif.read);
    }
    return notifications;
  }, [filter, notifications]);

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
          {notification.detail ? (
            <Text style={styles.notificationDetail} numberOfLines={2}>
              {notification.detail}
            </Text>
          ) : null}
          {!notification.read && <View style={styles.unreadDot} />}
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => {
    const label =
      filter === 'unread'
        ? 'No unread notifications'
        : filter === 'read'
          ? 'No read notifications'
          : 'No notifications yet';
    return (
      <View style={styles.emptyState}>
        <Ionicons name="notifications-outline" size={64} color={theme.colors.textTertiary} />
        <Text style={styles.emptyText}>{label}</Text>
        <Text style={styles.emptySubtext}>
          You'll see updates about your listings, plan, and account activity here.
        </Text>
      </View>
    );
  };

  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.orange} />
          <Text style={styles.loadingText}>Loading notifications...</Text>
        </View>
      );
    }

    return (
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
        <View style={styles.summaryCard}>
          <View style={styles.summaryInfo}>
            <Text style={styles.summaryEyebrow}>Notification Center</Text>
            <Text style={styles.summaryHeadline}>{summary.unread} new</Text>
            <Text style={styles.summarySubtext}>
              {summary.total} total alerts
            </Text>
          </View>
          <View style={styles.summaryActions}>
            <TouchableOpacity
              style={[
                styles.summaryButton,
                summary.unread === 0 && styles.summaryButtonDisabled,
              ]}
              onPress={markAllAsRead}
              disabled={!summary.unread}
            >
              <Ionicons name="checkmark-done-outline" size={18} color="#fff" />
              <Text style={styles.summaryButtonText}>Mark all</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.summaryButton,
                styles.summaryButtonSecondary,
                notifications.length === 0 && styles.summaryButtonDisabled,
              ]}
              onPress={clearAllNotifications}
              disabled={!notifications.length}
            >
              <Ionicons name="trash-outline" size={18} color={theme.colors.orange} />
              <Text style={[styles.summaryButtonText, styles.summaryButtonSecondaryText]}>
                Clear all
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {filterOptions.map((option) => (
            <TouchableOpacity
              key={option.key}
              style={[
                styles.filterChip,
                filter === option.key && styles.filterChipActive,
              ]}
              onPress={() => setFilter(option.key)}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.filterChipText,
                  filter === option.key && styles.filterChipTextActive,
                ]}
              >
                {`${option.label} (${option.count})`}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.notificationsContainer}>
          {filteredNotifications.length === 0
            ? renderEmptyState()
            : filteredNotifications.map((notification) => (
                <NotificationCard key={notification.id} notification={notification} />
              ))}
        </View>
        <View style={styles.bottomPadding} />
      </ScrollView>
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
        <TouchableOpacity onPress={() => goBackOrNavigate(navigation)} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.emerald} />
        </TouchableOpacity>
        <Text style={styles.title}>Notifications</Text>
        {summary.unread > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{summary.unread}</Text>
          </View>
        )}
      </View>

      {renderContent()}
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
  summaryCard: {
    marginHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.lg,
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.lg,
    ...theme.shadows.medium,
  },
  summaryInfo: {
    gap: theme.spacing.xs,
  },
  summaryEyebrow: {
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
  },
  summaryHeadline: {
    fontFamily: theme.typography.fontFamily.anton,
    fontSize: theme.typography.fontSize['2xl'],
    color: theme.colors.emerald,
  },
  summarySubtext: {
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  summaryActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
  summaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.orange,
  },
  summaryButtonSecondary: {
    backgroundColor: `${theme.colors.orange}15`,
  },
  summaryButtonDisabled: {
    opacity: 0.5,
  },
  summaryButtonText: {
    fontFamily: theme.typography.fontFamily.interSemiBold,
    fontSize: theme.typography.fontSize.sm,
    color: '#FFFFFF',
  },
  summaryButtonSecondaryText: {
    color: theme.colors.orange,
  },
  content: {
    flex: 1,
    paddingBottom: theme.spacing.xl,
  },
  filterRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  filterChip: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  filterChipActive: {
    backgroundColor: theme.colors.orange,
    borderColor: theme.colors.orange,
  },
  filterChipText: {
    fontFamily: theme.typography.fontFamily.interMedium,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  filterChipTextActive: {
    color: theme.colors.white,
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
    paddingTop: theme.spacing.sm,
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
  notificationDetail: {
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs / 2,
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
