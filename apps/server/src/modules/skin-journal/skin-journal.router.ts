import { Router } from 'express';
import * as journalController from './skin-journal.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { requireAdmin } from '../../middleware/admin.middleware';
import { upload } from '../../config/multer';

const router = Router();

router.use(authenticate);

router.get('/unread-count', journalController.getUnreadCount);
router.get('/summary', journalController.getSummaryHandler);
router.get('/', journalController.getJournal);
router.post('/', upload.single('photo'), journalController.createEntry);
router.patch('/:id', journalController.updateEntry);
router.delete('/:id', journalController.deleteEntry);
router.post('/:id/comments', journalController.addComment);
router.post('/:id/read', journalController.markEntryRead);

// Admin routes
router.get('/admin/:userId/summary', requireAdmin, journalController.adminGetSummaryHandler);
router.get('/admin/:userId', requireAdmin, journalController.adminGetJournal);
router.post('/admin/:userId', requireAdmin, upload.single('photo'), journalController.adminCreateEntry);
router.patch('/admin/:userId/:entryId', requireAdmin, journalController.adminUpdateEntry);
router.delete('/admin/:userId/:entryId', requireAdmin, journalController.adminDeleteEntry);

export default router;
