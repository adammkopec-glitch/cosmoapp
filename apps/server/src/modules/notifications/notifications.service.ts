import { prisma } from '../../config/prisma';
import { NotificationType } from '@prisma/client';
import type { Server } from 'socket.io';

export const getNotifications = async (userId: string, page = 1, limit = 20) => {
  const skip = (page - 1) * limit;

  const [notifications, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.notification.count({ where: { userId } }),
    prisma.notification.count({ where: { userId, readAt: null } }),
  ]);

  return {
    notifications,
    total,
    page,
    totalPages: Math.ceil(total / limit),
    unreadCount,
  };
};

export const markRead = async (userId: string, notificationId: string) => {
  const notification = await prisma.notification.findFirst({
    where: { id: notificationId, userId },
  });

  if (!notification) {
    return null;
  }

  return await prisma.notification.update({
    where: { id: notificationId },
    data: { readAt: new Date() },
  });
};

export const markAllRead = async (userId: string) => {
  await prisma.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });
};

export const createNotification = async (data: {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  url?: string;
}) => {
  return await prisma.notification.create({ data });
};

export async function createAndEmitNotification(
  io: Server,
  data: {
    userId: string;
    type: NotificationType;
    title: string;
    body: string;
    url?: string;
    emitToAdminGlobal?: boolean;
  },
) {
  const notification = await createNotification(data);
  const unreadCount = await getUnreadCount(data.userId);
  io.to(`user:${data.userId}`).emit('notification:new', { unreadCount });
  if (data.emitToAdminGlobal) {
    io.to('admin:global').emit('notification:new', {});
  }
  return notification;
}

export const getUnreadCount = async (userId: string) => {
  return await prisma.notification.count({ where: { userId, readAt: null } });
};
