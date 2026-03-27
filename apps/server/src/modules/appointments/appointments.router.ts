import { Router } from 'express';
import * as appointmentsController from './appointments.controller';
import * as recommendationsController from '../recommendations/recommendations.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { requireAdmin, requireStaff } from '../../middleware/admin.middleware';
import { upload } from '../../config/multer';

const router = Router();

router.use(authenticate);

router.post('/', appointmentsController.create);
router.get('/me', appointmentsController.getMy);
router.post('/:id/photo', upload.single('photo'), appointmentsController.uploadPhoto);

router.post('/:id/reschedule', appointmentsController.requestReschedule);
router.patch('/:id/reschedule/approve', requireAdmin, appointmentsController.approveReschedule);
router.patch('/:id/reschedule/reject', requireAdmin, appointmentsController.rejectReschedule);

router.get('/today', requireAdmin, appointmentsController.getToday);
router.get('/', requireAdmin, appointmentsController.getAll);
router.post('/admin', requireAdmin, appointmentsController.createAdmin);
router.patch('/:id/status', requireAdmin, appointmentsController.updateStatus);
router.patch('/:id/staff-note', requireAdmin, appointmentsController.updateStaffNote);
router.get('/:id/recommendations', requireStaff, recommendationsController.getForAppointment);
router.post('/:id/recommendations', requireStaff, recommendationsController.addRecommendation);
router.delete('/:id/recommendations/:recId', authenticate, recommendationsController.deleteRecommendation);
router.patch('/:id/recommendations/:recId/pickup', requireStaff, recommendationsController.markPickedUp);
router.delete('/:id', requireAdmin, appointmentsController.remove);

export default router;
