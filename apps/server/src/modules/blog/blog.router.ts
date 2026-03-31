// filepath: apps/server/src/modules/blog/blog.router.ts
import { Router } from 'express';
import * as blogController from './blog.controller';
import { authenticate, optionalAuth } from '../../middleware/auth.middleware';
import { requireAdmin } from '../../middleware/admin.middleware';
import { upload } from '../../config/multer';

const router = Router();

router.get('/', optionalAuth, blogController.getAll);
router.get('/:slug', optionalAuth, blogController.getOne);

router.use(authenticate, requireAdmin);

router.post('/upload-image', upload.single('image'), blogController.uploadInlineImage);
router.post('/', upload.single('coverImage'), blogController.create);
router.put('/:id', upload.single('coverImage'), blogController.update);
router.delete('/:id', blogController.remove);

export default router;
