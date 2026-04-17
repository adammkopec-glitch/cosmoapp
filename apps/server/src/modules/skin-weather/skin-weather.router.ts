import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { requireAdmin } from '../../middleware/admin.middleware';
import * as controller from './skin-weather.controller';

const router = Router();

// User routes
router.get('/profile', authenticate, controller.getProfile);
router.put('/profile', authenticate, controller.upsertProfile);
router.get('/report/today', authenticate, controller.getTodayReport);
router.get('/report/history', authenticate, controller.getReportHistory);
router.patch('/profile/location', authenticate, controller.updateProfileLocation);
router.post('/report/generate', authenticate, controller.generateMyReport);

// Admin routes
router.get('/rules', authenticate, requireAdmin, controller.getRules);
router.post('/rules', authenticate, requireAdmin, controller.createRule);
router.put('/rules/:id', authenticate, requireAdmin, controller.updateRule);
router.delete('/rules/:id', authenticate, requireAdmin, controller.deleteRule);
router.post('/generate-all', authenticate, requireAdmin, controller.generateAllReports);

export default router;
