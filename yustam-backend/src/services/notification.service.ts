import { NotificationType, Prisma } from '@prisma/client';
import { prisma } from '../db/client';

interface NotificationFilters {
  type?: NotificationType;
  unreadOnly?: boolean;
}

export const listNotifications = async (userId: string, filters: NotificationFilters = {}) => {
  return prisma.notification.findMany({
    where: {
      userId,
      type: filters.type,
      isRead: filters.unreadOnly ? false : undefined,
    },
    orderBy: { createdAt: 'desc' },
  });
};

export const markNotificationsRead = async (userId: string, notificationIds: string[]) => {
  if (!notificationIds.length) {
    return { updated: 0 };
  }
  const result = await prisma.notification.updateMany({
    where: { userId, id: { in: notificationIds } },
    data: { isRead: true, readAt: new Date() },
  });
  return { updated: result.count };
};

export const markAllNotificationsRead = async (userId: string) => {
  const result = await prisma.notification.updateMany({ where: { userId, isRead: false }, data: { isRead: true, readAt: new Date() } });
  return { updated: result.count };
};

export const createNotification = async (input: {
  userId: string;
  title: string;
  body: string;
  type?: NotificationType;
  data?: Record<string, unknown>;
}) => {
  return prisma.notification.create({
    data: {
      userId: input.userId,
      title: input.title,
      body: input.body,
      type: input.type ?? NotificationType.SYSTEM,
      data: input.data as Prisma.JsonObject | undefined,
    },
  });
};
