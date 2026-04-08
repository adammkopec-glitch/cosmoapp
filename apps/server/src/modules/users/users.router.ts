// filepath: apps/server/src/modules/users/users.router.ts
import { Router } from 'express';
import * as usersController from './users.controller';
import * as recommendationsController from '../recommendations/recommendations.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { requireAdmin } from '../../middleware/admin.middleware';
import { upload } from '../../config/multer';

const router = Router();

router.use(authenticate);

router.get('/me', usersController.getMe);
router.patch('/me', usersController.updateMe);
router.patch('/me/avatar', upload.single('avatar'), usersController.updateAvatar);
router.patch('/me/consents', usersController.updateConsents);
router.patch('/me/card', usersController.updateMyCard);
router.get('/me/timeline', usersController.getMyTimeline);
router.get('/me/referrals', usersController.getMyReferrals);
router.get('/me/recommendations', recommendationsController.getMyRecommendations);

router.get('/', requireAdmin, usersController.getAllUsers);
router.patch('/:id/card', usersController.updateUserCard);
router.get('/:id/recommendations', requireAdmin, recommendationsController.getByUser);
router.get('/:id', requireAdmin, usersController.getUserDetails);

export default router;
