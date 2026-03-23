import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { requireAdmin } from '../../middleware/admin.middleware';
import * as ctrl from './quiz.controller';

const router = Router();

// Admin routes registered BEFORE /:id to avoid param conflict
router.get('/admin/list', authenticate, requireAdmin, ctrl.listAll);
router.post('/admin', authenticate, requireAdmin, ctrl.create);
router.patch('/admin/:id', authenticate, requireAdmin, ctrl.patch);
router.delete('/admin/:id', authenticate, requireAdmin, ctrl.remove);
router.put('/admin/:id/tree', authenticate, requireAdmin, ctrl.saveTree);
router.get('/admin/:id', authenticate, requireAdmin, ctrl.getOne);

// Public routes
router.get('/', ctrl.listActive);
router.get('/:id', ctrl.getOne);

export default router;
