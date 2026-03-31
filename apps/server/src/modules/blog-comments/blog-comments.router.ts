import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as blogCommentsController from './blog-comments.controller';
import { authenticate, optionalAuth } from '../../middleware/auth.middleware';
import { requireAdmin } from '../../middleware/admin.middleware';
import { upload } from '../../config/multer';

const router = Router();

const createCommentSchema = z.object({
  content: z.string().min(1).max(2000),
  parentId: z.string().cuid().optional(),
});

const reactSchema = z.object({
  emoji: z.enum(['❤️', '😂', '😮', '😢', '😡', '👍']),
});

const moderateSchema = z.object({
  isHidden: z.boolean().optional(),
  isSpam: z.boolean().optional(),
});

const validate =
  (schema: z.ZodSchema) =>
  (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ status: 'error', message: result.error.errors[0].message });
    }
    req.body = result.data;
    next();
  };

// Public: get comments (admin token → all comments including spam + full hidden content)
router.get('/:slug', optionalAuth, blogCommentsController.getComments);

// Authenticated: create comment (multipart/form-data for optional image)
router.post(
  '/:slug',
  authenticate,
  upload.single('image'),
  validate(createCommentSchema),
  blogCommentsController.createComment
);

// Authenticated: delete own comment (admin can delete any)
router.delete('/:id', authenticate, blogCommentsController.deleteComment);

// Admin only: moderate comment
router.patch('/:id/moderate', authenticate, requireAdmin, validate(moderateSchema), blogCommentsController.moderateComment);

// Authenticated: react to comment
router.post('/:id/react', authenticate, validate(reactSchema), blogCommentsController.reactToComment);

export default router;
