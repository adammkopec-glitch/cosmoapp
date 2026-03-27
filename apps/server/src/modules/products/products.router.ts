import { Router } from 'express';
import * as productsController from './products.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { requireAdmin, requireStaff } from '../../middleware/admin.middleware';
import { upload } from '../../config/multer';

const router = Router();

router.use(authenticate);

router.get('/', productsController.getAll);
router.post('/', requireStaff, upload.single('image'), productsController.create);
router.patch('/:id', requireStaff, upload.single('image'), productsController.update);
router.patch('/:id/stock', requireStaff, productsController.updateStock);
router.delete('/:id', requireAdmin, productsController.remove);

export default router;
