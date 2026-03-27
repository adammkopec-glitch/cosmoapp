import { Router } from 'express';
import * as notificationsController from './notifications.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { requireAdmin } from '../../middleware/admin.middleware';

const router = Router();

router.use(authenticate);

router.get('/', notificationsController.getMyNotifications);
router.get('/unread-count', notificationsController.getUnreadCount);
router.patch('/:id/read', notificationsController.markNotificationRead);
router.post('/read-all', notificationsController.markAllNotificationsRead);
router.post('/broadcast', requireAdmin, notificationsController.broadcastNotification);

export default router;
