import { Request, Response, NextFunction } from 'express';
import * as notificationsService from './notifications.service';
import { prisma } from '../../config/prisma';
import { getIO } from '../../socket';
import { sendPushToAllUsers } from '../push/push.service';

export const getMyNotifications = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const data = await notificationsService.getNotifications(req.user!.id, page, limit);
    res.status(200).json({ status: 'success', data });
  } catch (error) {
    next(error);
  }
};

export const markNotificationRead = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const notification = await notificationsService.markRead(req.user!.id, req.params.id);
    res.status(200).json({ status: 'success', data: { notification } });
  } catch (error) {
    next(error);
  }
};


export const markAllNotificationsRead = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await notificationsService.markAllRead(req.user!.id);
    res.status(200).json({ status: 'success', data: { message: 'Wszystkie powiadomienia oznaczone jako przeczytane' } });
  } catch (error) {
    next(error);
  }
};

export const getUnreadCount = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const count = await notificationsService.getUnreadCount(req.user!.id);
    res.status(200).json({ status: 'success', data: { count } });
  } catch (error) {
    next(error);
  }
};

export const broadcastNotification = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { title, body, url } = req.body;

    if (!title || !body) {
      res.status(400).json({ status: 'error', message: 'title and body are required' });
      return;
    }

    const users = await prisma.user.findMany({
      where: { role: 'USER' },
      select: { id: true },
    });

    await prisma.notification.createMany({
      data: users.map((u) => ({
        userId: u.id,
        type: 'BROADCAST' as const,
        title,
        body,
        url,
      })),
    });

    getIO().to('broadcast:notifications').emit('notification:new', {});

    await sendPushToAllUsers({ title, body, url });

    res.status(200).json({ status: 'success', data: { sent: users.length } });
  } catch (error) {
    next(error);
  }
};
