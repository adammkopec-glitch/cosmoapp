# Blog Comments Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add threaded comments with reactions, photo attachments, and admin moderation to the blog.

**Architecture:** Adjacency-list `BlogComment` model (parentId → self-ref); separate backend module at `/api/blog-comments`; flat list returned from API, tree built client-side; 4 React components added to BlogPost page. The single GET endpoint serves both public (filters spam, nulls hidden content) and admin (returns all including spam, full content) via an `includeAll` flag driven by the requester's role.

**Tech Stack:** Prisma + PostgreSQL, Express 5, Zod, Sharp (image), Vitest (tests), React Query, Zustand auth store, Tailwind CSS, Lucide icons.

**Spec:** `docs/superpowers/specs/2026-03-31-blog-comments-design.md`

---

## File Map

### Created
| File | Purpose |
|------|---------|
| `apps/server/src/modules/blog-comments/blog-comments.service.ts` | All DB logic for comments |
| `apps/server/src/modules/blog-comments/blog-comments.service.test.ts` | Vitest unit tests |
| `apps/server/src/modules/blog-comments/blog-comments.controller.ts` | HTTP handlers |
| `apps/server/src/modules/blog-comments/blog-comments.router.ts` | Express router + Zod validation |
| `apps/web/src/components/blog/BlogCommentsSection.tsx` | Root comments container in BlogPost |
| `apps/web/src/components/blog/CommentTree.tsx` | Builds tree from flat array, renders recursively |
| `apps/web/src/components/blog/CommentItem.tsx` | Single comment: content, reactions, reply/delete/moderate |
| `apps/web/src/components/blog/CommentForm.tsx` | Write/reply form with image upload + guest banner |
| `apps/web/src/components/blog/ReactionPicker.tsx` | Emoji picker shown on hover |
| `apps/web/src/pages/admin/AdminBlogComments.tsx` | Admin moderation page |

### Modified
| File | Change |
|------|--------|
| `apps/server/prisma/schema.prisma` | Add `BlogComment`, `BlogCommentReaction` models; `BLOG_COMMENT_REPLY` to `NotificationType`; relations on `User` + `BlogPost` |
| `apps/server/src/middleware/auth.middleware.ts` | Add exported `optionalAuth` middleware |
| `apps/server/src/modules/blog/blog.router.ts` | Remove inline `optionalAuth`, import from middleware |
| `apps/server/src/app.ts` | Import + mount `blogCommentsRouter` at `/api/blog-comments` |
| `apps/web/src/api/blog.api.ts` | Add 5 comment API functions |
| `apps/web/src/pages/public/BlogPost.tsx` | Mount `<BlogCommentsSection>` below article |
| `apps/web/src/pages/admin/Blog.tsx` | Add "Komentarze" button per post row |
| `apps/web/src/router.tsx` | Add `/admin/blog/:id/comments` route |

---

## Task 1: Prisma schema — add models and migration

**Files:**
- Modify: `apps/server/prisma/schema.prisma`

- [ ] **Step 1: Add `BLOG_COMMENT_REPLY` to `NotificationType` enum**

Find the existing `NotificationType` enum in `schema.prisma` (search for `enum NotificationType`) and add **only** the new value to the end of the enum body — do NOT replace the whole enum, just add the line:

```prisma
  BLOG_COMMENT_REPLY
```

The enum after the edit should contain all existing values plus the new one. Do not remove any existing values such as `CHAT_MESSAGE`, `NEW_REVIEW`, `JOURNAL_COMMENT`, etc.

- [ ] **Step 2: Add `BlogComment` and `BlogCommentReaction` models**

Append after the existing `Tag` model (search for `model Tag {`):

```prisma
model BlogComment {
  id        String   @id @default(cuid())
  postId    String
  post      BlogPost @relation(fields: [postId], references: [id], onDelete: Cascade)
  authorId  String
  author    User     @relation("BlogCommentAuthor", fields: [authorId], references: [id], onDelete: Restrict)
  parentId  String?
  parent    BlogComment?  @relation("CommentReplies", fields: [parentId], references: [id], onDelete: NoAction, onUpdate: NoAction)
  replies   BlogComment[] @relation("CommentReplies")
  content   String
  imagePath String?
  isHidden  Boolean  @default(false)
  isSpam    Boolean  @default(false)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  reactions BlogCommentReaction[]

  @@index([postId])
  @@index([parentId])
}

model BlogCommentReaction {
  id        String      @id @default(cuid())
  commentId String
  comment   BlogComment @relation(fields: [commentId], references: [id], onDelete: Cascade)
  userId    String
  user      User        @relation("BlogCommentReactions", fields: [userId], references: [id], onDelete: Cascade)
  emoji     String
  createdAt DateTime    @default(now())

  @@unique([commentId, userId])
  @@index([commentId])
}
```

- [ ] **Step 3: Add relations to `BlogPost` model**

Inside the `BlogPost` model, add after `tags Tag[] @relation("PostTags")`:

```prisma
  comments BlogComment[]
```

- [ ] **Step 4: Add relations to `User` model**

Inside the `User` model, add after `blogPosts BlogPost[]`:

```prisma
  blogComments         BlogComment[]         @relation("BlogCommentAuthor")
  blogCommentReactions BlogCommentReaction[] @relation("BlogCommentReactions")
```

- [ ] **Step 5: Run migration**

```bash
cd apps/server
npx prisma migrate dev --name add_blog_comments
```

Expected: Migration applied, `prisma generate` runs automatically. No errors.

- [ ] **Step 6: Commit**

```bash
git add apps/server/prisma/schema.prisma apps/server/prisma/migrations/
git commit -m "feat: add BlogComment and BlogCommentReaction schema with migration"
```

---

## Task 2: Export `optionalAuth` middleware

**Files:**
- Modify: `apps/server/src/middleware/auth.middleware.ts`
- Modify: `apps/server/src/modules/blog/blog.router.ts`

- [ ] **Step 1: Add `optionalAuth` export to `auth.middleware.ts`**

Append to the end of `apps/server/src/middleware/auth.middleware.ts`:

```ts
// Note: if a Bearer token is present but invalid/expired, this silently treats
// the request as unauthenticated (matches existing blog.router.ts behaviour).
export const optionalAuth = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return next();
  authenticate(req, res, () => next());
};
```

- [ ] **Step 2: Update `blog.router.ts`**

In `apps/server/src/modules/blog/blog.router.ts`:

Replace the existing import line:
```ts
import { authenticate } from '../../middleware/auth.middleware';
```

With:
```ts
import { authenticate, optionalAuth } from '../../middleware/auth.middleware';
```

Then remove lines 10–14 (the inline `const optionalAuth = (req: any, res: any, next: any) => { ... }` block).

- [ ] **Step 3: Build to verify**

```bash
cd apps/server && pnpm build
```

Expected: No TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add apps/server/src/middleware/auth.middleware.ts apps/server/src/modules/blog/blog.router.ts
git commit -m "refactor: export optionalAuth from auth.middleware"
```

---

## Task 3: Backend service (TDD)

**Files:**
- Create: `apps/server/src/modules/blog-comments/blog-comments.service.ts`
- Create: `apps/server/src/modules/blog-comments/blog-comments.service.test.ts`

- [ ] **Step 1: Write failing tests**

Create `apps/server/src/modules/blog-comments/blog-comments.service.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../config/prisma', () => ({
  prisma: {
    blogPost: { findUnique: vi.fn() },
    blogComment: {
      findMany: vi.fn(),
      create: vi.fn(),
      findFirst: vi.fn(),
      delete: vi.fn(),
      update: vi.fn(),
    },
    blogCommentReaction: {
      findFirst: vi.fn(),
      delete: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    },
  },
}));

vi.mock('../../socket', () => ({
  getIO: vi.fn(() => ({ to: vi.fn(() => ({ emit: vi.fn() })) })),
}));

vi.mock('fs/promises', () => ({ unlink: vi.fn().mockResolvedValue(undefined) }));

// Mock notifications service so tests don't depend on its internals
vi.mock('../notifications/notifications.service', () => ({
  createNotification: vi.fn().mockResolvedValue({}),
}));

vi.mock('../../utils/imageProcessor', () => ({
  processAndSaveImage: vi.fn().mockResolvedValue('/uploads/comments/test.webp'),
}));

import { prisma } from '../../config/prisma';
import { createNotification } from '../notifications/notifications.service';
import {
  getComments,
  createComment,
  deleteComment,
  moderateComment,
  reactToComment,
} from './blog-comments.service';

const mockPost = { id: 'post1', title: 'Test Post', slug: 'test-post', isPublished: true };

const mockComment = {
  id: 'c1',
  postId: 'post1',
  authorId: 'u1',
  parentId: null,
  content: 'Hello',
  imagePath: null,
  isHidden: false,
  isSpam: false,
  createdAt: new Date(),
  updatedAt: new Date(),
  author: { name: 'Alice', avatarPath: null },
  reactions: [],
};

describe('getComments', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns flat list of non-spam comments for public view', async () => {
    (prisma.blogPost.findUnique as any).mockResolvedValue(mockPost);
    (prisma.blogComment.findMany as any).mockResolvedValue([mockComment]);

    const result = await getComments('test-post', { includeAll: false });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('c1');
    // public view filters isSpam
    expect((prisma.blogComment.findMany as any).mock.calls[0][0].where).toMatchObject({ isSpam: false });
  });

  it('returns all comments including spam when includeAll=true (admin)', async () => {
    (prisma.blogPost.findUnique as any).mockResolvedValue(mockPost);
    (prisma.blogComment.findMany as any).mockResolvedValue([mockComment]);

    await getComments('test-post', { includeAll: true });
    // admin query does NOT add isSpam filter
    const where = (prisma.blogComment.findMany as any).mock.calls[0][0].where;
    expect(where).not.toHaveProperty('isSpam');
  });

  it('nulls out content and imagePath for hidden comments in public view', async () => {
    (prisma.blogPost.findUnique as any).mockResolvedValue(mockPost);
    const hiddenComment = {
      ...mockComment,
      isHidden: true,
      content: 'secret',
      imagePath: '/uploads/comments/x.webp',
    };
    (prisma.blogComment.findMany as any).mockResolvedValue([hiddenComment]);

    const result = await getComments('test-post', { includeAll: false });
    expect(result[0].content).toBeNull();
    expect(result[0].imagePath).toBeNull();
  });

  it('does NOT null out content for hidden comments in admin view', async () => {
    (prisma.blogPost.findUnique as any).mockResolvedValue(mockPost);
    const hiddenComment = { ...mockComment, isHidden: true, content: 'secret' };
    (prisma.blogComment.findMany as any).mockResolvedValue([hiddenComment]);

    const result = await getComments('test-post', { includeAll: true });
    expect(result[0].content).toBe('secret');
  });

  it('throws 404 when post not found', async () => {
    (prisma.blogPost.findUnique as any).mockResolvedValue(null);
    await expect(getComments('no-such-slug', {})).rejects.toThrow('404');
  });
});

describe('createComment', () => {
  beforeEach(() => vi.clearAllMocks());

  it('creates a top-level comment', async () => {
    (prisma.blogPost.findUnique as any).mockResolvedValue(mockPost);
    (prisma.blogComment.create as any).mockResolvedValue(mockComment);

    const result = await createComment('u1', 'test-post', { content: 'Hello' });
    expect(prisma.blogComment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ content: 'Hello', postId: 'post1', parentId: null }),
      })
    );
    expect(result.id).toBe('c1');
  });

  it('throws 400 if post is not published', async () => {
    (prisma.blogPost.findUnique as any).mockResolvedValue({ ...mockPost, isPublished: false });
    await expect(createComment('u1', 'test-post', { content: 'Hi' })).rejects.toThrow('400');
  });

  it('validates parent comment exists BEFORE creating the comment', async () => {
    (prisma.blogPost.findUnique as any).mockResolvedValue(mockPost);
    // Parent not found
    (prisma.blogComment.findFirst as any).mockResolvedValue(null);

    await expect(
      createComment('u1', 'test-post', { content: 'Reply', parentId: 'ghost-id' })
    ).rejects.toThrow('404');
    // Must NOT have called blogComment.create
    expect(prisma.blogComment.create).not.toHaveBeenCalled();
  });

  it('creates notification when reply is to a different user', async () => {
    const parentComment = { ...mockComment, id: 'parent1', authorId: 'u2' };
    (prisma.blogPost.findUnique as any).mockResolvedValue(mockPost);
    (prisma.blogComment.findFirst as any).mockResolvedValue(parentComment);
    (prisma.blogComment.create as any).mockResolvedValue({
      ...mockComment,
      parentId: 'parent1',
      author: { name: 'Alice', avatarPath: null },
    });

    await createComment('u1', 'test-post', { content: 'Reply', parentId: 'parent1' });

    expect(createNotification).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'u2', type: 'BLOG_COMMENT_REPLY' })
    );
  });

  it('does NOT create notification when replying to own comment', async () => {
    const parentComment = { ...mockComment, id: 'parent1', authorId: 'u1' }; // same user
    (prisma.blogPost.findUnique as any).mockResolvedValue(mockPost);
    (prisma.blogComment.findFirst as any).mockResolvedValue(parentComment);
    (prisma.blogComment.create as any).mockResolvedValue({
      ...mockComment,
      parentId: 'parent1',
      author: { name: 'Alice', avatarPath: null },
    });

    await createComment('u1', 'test-post', { content: 'Reply', parentId: 'parent1' });
    expect(createNotification).not.toHaveBeenCalled();
  });
});

describe('deleteComment', () => {
  beforeEach(() => vi.clearAllMocks());

  it('deletes own comment', async () => {
    (prisma.blogComment.findFirst as any).mockResolvedValue(mockComment);
    (prisma.blogComment.delete as any).mockResolvedValue(mockComment);

    await deleteComment('u1', 'c1', false);
    expect(prisma.blogComment.delete).toHaveBeenCalledWith({ where: { id: 'c1' } });
  });

  it('throws 403 when non-owner tries to delete', async () => {
    (prisma.blogComment.findFirst as any).mockResolvedValue({ ...mockComment, authorId: 'u2' });
    await expect(deleteComment('u1', 'c1', false)).rejects.toThrow('403');
  });

  it('allows admin to delete any comment', async () => {
    (prisma.blogComment.findFirst as any).mockResolvedValue({ ...mockComment, authorId: 'u2' });
    (prisma.blogComment.delete as any).mockResolvedValue(mockComment);

    await deleteComment('admin1', 'c1', true);
    expect(prisma.blogComment.delete).toHaveBeenCalled();
  });
});

describe('reactToComment', () => {
  beforeEach(() => vi.clearAllMocks());

  it('creates reaction when none exists', async () => {
    (prisma.blogCommentReaction.findFirst as any).mockResolvedValue(null);
    const newReaction = { id: 'r1', commentId: 'c1', userId: 'u1', emoji: '❤️', createdAt: new Date() };
    (prisma.blogCommentReaction.create as any).mockResolvedValue(newReaction);

    const result = await reactToComment('u1', 'c1', '❤️');
    expect(result).toEqual(newReaction);
  });

  it('removes reaction when same emoji toggled', async () => {
    const existing = { id: 'r1', commentId: 'c1', userId: 'u1', emoji: '❤️' };
    (prisma.blogCommentReaction.findFirst as any).mockResolvedValue(existing);
    (prisma.blogCommentReaction.delete as any).mockResolvedValue(existing);

    const result = await reactToComment('u1', 'c1', '❤️');
    expect(result).toBeNull();
    expect(prisma.blogCommentReaction.delete).toHaveBeenCalledWith({ where: { id: 'r1' } });
  });

  it('updates reaction when different emoji provided', async () => {
    const existing = { id: 'r1', commentId: 'c1', userId: 'u1', emoji: '❤️' };
    (prisma.blogCommentReaction.findFirst as any).mockResolvedValue(existing);
    const updated = { ...existing, emoji: '😂' };
    (prisma.blogCommentReaction.update as any).mockResolvedValue(updated);

    const result = await reactToComment('u1', 'c1', '😂');
    expect(result?.emoji).toBe('😂');
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
cd apps/server
pnpm vitest run src/modules/blog-comments/blog-comments.service.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement the service**

Create `apps/server/src/modules/blog-comments/blog-comments.service.ts`:

```ts
import path from 'path';
import fs from 'fs/promises';
import { prisma } from '../../config/prisma';
import { AppError } from '../../middleware/error.middleware';
import { processAndSaveImage } from '../../utils/imageProcessor';
import { createNotification } from '../notifications/notifications.service';
import { getIO } from '../../socket';

const UPLOADS_ROOT = path.join(process.cwd(), 'uploads');

export const getComments = async (
  slug: string,
  options: { includeAll?: boolean } = {}
) => {
  const post = await prisma.blogPost.findUnique({ where: { slug } });
  if (!post) throw new AppError('Wpis nie znaleziony', 404);

  const where: any = { postId: post.id };
  if (!options.includeAll) {
    where.isSpam = false;
  }

  const comments = await prisma.blogComment.findMany({
    where,
    include: {
      author: { select: { name: true, avatarPath: true } },
      reactions: { select: { emoji: true, userId: true } },
    },
    orderBy: { createdAt: 'asc' },
  });

  // For public view: null out content of hidden comments so the server
  // never leaks hidden text to non-admin clients.
  if (!options.includeAll) {
    return comments.map((c) =>
      c.isHidden ? { ...c, content: null, imagePath: null } : c
    );
  }

  return comments;
};

export const createComment = async (
  userId: string,
  slug: string,
  data: { content: string; parentId?: string },
  imageFile?: Express.Multer.File
) => {
  const post = await prisma.blogPost.findUnique({ where: { slug } });
  if (!post) throw new AppError('Wpis nie znaleziony', 404);
  if (!post.isPublished) throw new AppError('Nie można komentować niepublikowanych wpisów', 400);

  // Validate parent BEFORE creating the comment to avoid orphans
  let parentComment: { id: string; authorId: string } | null = null;
  if (data.parentId) {
    parentComment = await prisma.blogComment.findFirst({
      where: { id: data.parentId },
      select: { id: true, authorId: true },
    });
    if (!parentComment) throw new AppError('Komentarz nadrzędny nie istnieje', 404);
  }

  let imagePath: string | undefined;
  if (imageFile) {
    imagePath = await processAndSaveImage(imageFile.buffer, 'comments');
  }

  const comment = await prisma.blogComment.create({
    data: {
      postId: post.id,
      authorId: userId,
      content: data.content,
      parentId: data.parentId ?? null,
      imagePath: imagePath ?? null,
    },
    include: {
      author: { select: { name: true, avatarPath: true } },
      reactions: { select: { emoji: true, userId: true } },
    },
  });

  // Notify parent comment author if it's a reply from a different user
  if (parentComment && parentComment.authorId !== userId) {
    await createNotification({
      userId: parentComment.authorId,
      type: 'BLOG_COMMENT_REPLY',
      title: 'Nowa odpowiedź na komentarz',
      body: `${comment.author.name} odpowiedział(a) na Twój komentarz w artykule „${post.title}"`,
      url: `/blog/${post.slug}`,
    });
    try {
      const io = getIO();
      io.to(`user:${parentComment.authorId}`).emit('notification:new', {});
    } catch {
      // Socket not available in tests — skip silently
    }
  }

  return comment;
};

export const deleteComment = async (
  userId: string,
  commentId: string,
  isAdmin: boolean
) => {
  const comment = await prisma.blogComment.findFirst({ where: { id: commentId } });
  if (!comment) throw new AppError('Komentarz nie znaleziony', 404);

  if (!isAdmin && comment.authorId !== userId) {
    throw new AppError('Brak uprawnień do usunięcia tego komentarza', 403);
  }

  // Clean up image file from disk (non-blocking)
  if (comment.imagePath) {
    // imagePath is stored as '/uploads/comments/xyz.webp' — strip leading slash
    // before joining with cwd to avoid path.join discarding cwd on POSIX.
    const relPath = comment.imagePath.replace(/^\//, '');
    const absPath = path.join(process.cwd(), relPath);
    fs.unlink(absPath).catch(() => {
      // File cleanup failure is non-fatal — log and continue
    });
  }

  await prisma.blogComment.delete({ where: { id: commentId } });
};

export const moderateComment = async (
  commentId: string,
  data: { isHidden?: boolean; isSpam?: boolean }
) => {
  const comment = await prisma.blogComment.findFirst({ where: { id: commentId } });
  if (!comment) throw new AppError('Komentarz nie znaleziony', 404);

  return prisma.blogComment.update({
    where: { id: commentId },
    data,
    include: {
      author: { select: { name: true, avatarPath: true } },
      reactions: { select: { emoji: true, userId: true } },
    },
  });
};

export const reactToComment = async (
  userId: string,
  commentId: string,
  emoji: string
) => {
  const existing = await prisma.blogCommentReaction.findFirst({
    where: { commentId, userId },
  });

  if (existing) {
    if (existing.emoji === emoji) {
      await prisma.blogCommentReaction.delete({ where: { id: existing.id } });
      return null;
    }
    return prisma.blogCommentReaction.update({
      where: { id: existing.id },
      data: { emoji },
    });
  }

  return prisma.blogCommentReaction.create({
    data: { commentId, userId, emoji },
  });
};
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
cd apps/server
pnpm vitest run src/modules/blog-comments/blog-comments.service.test.ts
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/server/src/modules/blog-comments/
git commit -m "feat: add blog-comments service with tests"
```

---

## Task 4: Backend controller + router + mount in app.ts

**Files:**
- Create: `apps/server/src/modules/blog-comments/blog-comments.controller.ts`
- Create: `apps/server/src/modules/blog-comments/blog-comments.router.ts`
- Modify: `apps/server/src/app.ts`

- [ ] **Step 1: Create controller**

Create `apps/server/src/modules/blog-comments/blog-comments.controller.ts`:

```ts
import { Request, Response, NextFunction } from 'express';
import * as blogCommentsService from './blog-comments.service';

export const getComments = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const isAdmin = req.user?.role === 'ADMIN';
    const comments = await blogCommentsService.getComments(req.params.slug, { includeAll: isAdmin });
    res.status(200).json({ status: 'success', data: { comments } });
  } catch (error) {
    next(error);
  }
};

export const createComment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { content, parentId } = req.body;
    const comment = await blogCommentsService.createComment(
      req.user!.id,
      req.params.slug,
      { content, parentId },
      req.file
    );
    res.status(201).json({ status: 'success', data: { comment } });
  } catch (error) {
    next(error);
  }
};

export const deleteComment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const isAdmin = req.user!.role === 'ADMIN';
    await blogCommentsService.deleteComment(req.user!.id, req.params.id, isAdmin);
    res.status(200).json({ status: 'success', data: null });
  } catch (error) {
    next(error);
  }
};

export const moderateComment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const comment = await blogCommentsService.moderateComment(req.params.id, req.body);
    res.status(200).json({ status: 'success', data: { comment } });
  } catch (error) {
    next(error);
  }
};

export const reactToComment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const reaction = await blogCommentsService.reactToComment(
      req.user!.id,
      req.params.id,
      req.body.emoji
    );
    res.status(200).json({ status: 'success', data: { reaction } });
  } catch (error) {
    next(error);
  }
};
```

- [ ] **Step 2: Create router with Zod validation**

Create `apps/server/src/modules/blog-comments/blog-comments.router.ts`:

```ts
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

// Public: get comments (admin token → sees spam + full hidden content)
router.get('/:slug', optionalAuth, blogCommentsController.getComments);

// Authenticated: create comment (multipart/form-data for optional image)
router.post(
  '/:slug',
  authenticate,
  upload.single('image'),
  validate(createCommentSchema),
  blogCommentsController.createComment
);

// Authenticated: delete own comment (or admin any)
router.delete('/:id', authenticate, blogCommentsController.deleteComment);

// Admin only: moderate comment
router.patch('/:id/moderate', authenticate, requireAdmin, validate(moderateSchema), blogCommentsController.moderateComment);

// Authenticated: react to comment
router.post('/:id/react', authenticate, validate(reactSchema), blogCommentsController.reactToComment);

export default router;
```

- [ ] **Step 3: Mount router in `app.ts`**

In `apps/server/src/app.ts`:

After the line `import homecareRouter from './modules/homecare/homecare.router';`, add:

```ts
import blogCommentsRouter from './modules/blog-comments/blog-comments.router';
```

After the line `app.use('/api/homecare', homecareRouter);`, add:

```ts
app.use('/api/blog-comments', blogCommentsRouter);
```

- [ ] **Step 4: Build and verify**

```bash
cd apps/server
pnpm build
```

Expected: No TypeScript errors.

- [ ] **Step 5: Commit**

```bash
git add apps/server/src/modules/blog-comments/ apps/server/src/app.ts
git commit -m "feat: add blog-comments controller, router, and mount in app"
```

---

## Task 5: Frontend API functions

**Files:**
- Modify: `apps/web/src/api/blog.api.ts`

- [ ] **Step 1: Add comment API functions to `blogApi` object**

In `apps/web/src/api/blog.api.ts`, add the following functions inside the `blogApi` object (after `uploadImage`):

```ts
  // Comments
  getComments: async (slug: string) => {
    const res = await api.get(`/blog-comments/${slug}`);
    return res.data.data.comments as any[];
  },
  addComment: async (slug: string, data: { content: string; parentId?: string; image?: File }) => {
    const fd = new FormData();
    fd.append('content', data.content);
    if (data.parentId) fd.append('parentId', data.parentId);
    if (data.image) fd.append('image', data.image);
    const res = await api.post(`/blog-comments/${slug}`, fd);
    return res.data.data.comment;
  },
  deleteComment: async (id: string) => {
    await api.delete(`/blog-comments/${id}`);
  },
  moderateComment: async (id: string, data: { isHidden?: boolean; isSpam?: boolean }) => {
    const res = await api.patch(`/blog-comments/${id}/moderate`, data);
    return res.data.data.comment;
  },
  reactToComment: async (id: string, emoji: string) => {
    const res = await api.post(`/blog-comments/${id}/react`, { emoji });
    return res.data.data.reaction;
  },
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/api/blog.api.ts
git commit -m "feat: add blog comment API functions"
```

---

## Task 6: `ReactionPicker` component

**Files:**
- Create: `apps/web/src/components/blog/ReactionPicker.tsx`

- [ ] **Step 1: Create component**

```tsx
// apps/web/src/components/blog/ReactionPicker.tsx
import { useState, useRef, useEffect } from 'react';

const EMOJIS = ['❤️', '😂', '😮', '😢', '😡', '👍'] as const;

interface Props {
  commentId: string;
  reactions: { emoji: string; userId: string }[];
  currentUserId?: string;
  onReact: (commentId: string, emoji: string) => void;
}

export const ReactionPicker = ({ commentId, reactions, currentUserId, onReact }: Props) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const counts = EMOJIS.reduce((acc, e) => {
    acc[e] = reactions.filter((r) => r.emoji === e).length;
    return acc;
  }, {} as Record<string, number>);

  const myReaction = currentUserId
    ? reactions.find((r) => r.userId === currentUserId)?.emoji
    : undefined;

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div className="relative inline-flex items-center gap-2" ref={ref}>
      {/* Reaction summary */}
      <div className="flex items-center gap-1 flex-wrap">
        {EMOJIS.filter((e) => counts[e] > 0).map((e) => (
          <button
            key={e}
            onClick={() => currentUserId && onReact(commentId, e)}
            className={`text-sm px-1.5 py-0.5 rounded-full border transition-colors ${
              myReaction === e
                ? 'bg-amber-100 border-amber-400'
                : 'bg-muted/40 border-border/30 hover:bg-muted/60'
            }`}
          >
            {e} {counts[e]}
          </button>
        ))}
      </div>

      {/* Add reaction button — only for logged-in users */}
      {currentUserId && (
        <button
          onClick={() => setOpen((v) => !v)}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-full hover:bg-muted/40"
          title="Dodaj reakcję"
        >
          {reactions.length === 0 ? '😊 Reaguj' : '➕'}
        </button>
      )}

      {/* Picker popup */}
      {open && (
        <div className="absolute bottom-full left-0 mb-1 bg-white border border-border/50 rounded-2xl shadow-lg p-2 flex gap-1 z-10">
          {EMOJIS.map((e) => (
            <button
              key={e}
              onClick={() => { onReact(commentId, e); setOpen(false); }}
              className={`text-xl p-1.5 rounded-xl transition-all hover:scale-125 ${
                myReaction === e ? 'bg-amber-100' : 'hover:bg-muted/40'
              }`}
            >
              {e}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/blog/ReactionPicker.tsx
git commit -m "feat: add ReactionPicker component"
```

---

## Task 7: `CommentForm` component

**Files:**
- Create: `apps/web/src/components/blog/CommentForm.tsx`

- [ ] **Step 1: Create component**

```tsx
// apps/web/src/components/blog/CommentForm.tsx
import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ImagePlus, X, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  slug: string;
  parentId?: string;
  isAuthenticated: boolean;
  onSubmit: (data: { content: string; parentId?: string; image?: File }) => Promise<void>;
  onCancel?: () => void;
  autoFocus?: boolean;
}

export const CommentForm = ({
  slug: _slug,
  parentId,
  isAuthenticated,
  onSubmit,
  onCancel,
  autoFocus,
}: Props) => {
  const [content, setContent] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  if (!isAuthenticated) {
    return (
      <div className="rounded-2xl border border-border/50 p-5 text-center bg-muted/20">
        <p className="text-sm text-muted-foreground mb-3">
          Aby dodać komentarz, musisz być zalogowany.
        </p>
        <div className="flex justify-center gap-3">
          <Link to="/auth/login">
            <Button size="sm">Zaloguj się</Button>
          </Link>
          <Link to="/auth/register">
            <Button size="sm" variant="outline">Zarejestruj się</Button>
          </Link>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    setSubmitting(true);
    try {
      await onSubmit({ content: content.trim(), parentId, image: image ?? undefined });
      setContent('');
      setImage(null);
      onCancel?.();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <textarea
        autoFocus={autoFocus}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        maxLength={2000}
        placeholder={parentId ? 'Napisz odpowiedź...' : 'Dodaj komentarz...'}
        rows={3}
        className="w-full resize-none rounded-xl border border-border/50 bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition"
      />
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="text-muted-foreground hover:text-foreground transition p-1.5 rounded-lg hover:bg-muted/40"
            title="Dodaj zdjęcie"
          >
            <ImagePlus size={16} />
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => setImage(e.target.files?.[0] ?? null)}
          />
          {image && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              {image.name}
              <button type="button" onClick={() => setImage(null)}>
                <X size={12} />
              </button>
            </span>
          )}
          <span className="text-xs text-muted-foreground">{content.length}/2000</span>
        </div>
        <div className="flex gap-2">
          {onCancel && (
            <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
              Anuluj
            </Button>
          )}
          <Button type="submit" size="sm" disabled={submitting || !content.trim()}>
            <Send size={14} className="mr-1.5" />
            {parentId ? 'Odpowiedz' : 'Opublikuj'}
          </Button>
        </div>
      </div>
    </form>
  );
};
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/blog/CommentForm.tsx
git commit -m "feat: add CommentForm component"
```

---

## Task 8: `CommentItem` and `CommentTree` components

**Files:**
- Create: `apps/web/src/components/blog/CommentItem.tsx`
- Create: `apps/web/src/components/blog/CommentTree.tsx`

- [ ] **Step 1: Create `CommentItem`**

```tsx
// apps/web/src/components/blog/CommentItem.tsx
import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { pl } from 'date-fns/locale';
import { Trash2, EyeOff, Eye, AlertTriangle } from 'lucide-react';
import { ReactionPicker } from './ReactionPicker';
import { CommentForm } from './CommentForm';

export interface CommentData {
  id: string;
  postId: string;
  authorId: string;
  parentId: string | null;
  content: string | null;
  imagePath: string | null;
  isHidden: boolean;
  isSpam: boolean;
  createdAt: string;
  author: { name: string; avatarPath: string | null };
  reactions: { emoji: string; userId: string }[];
  children?: CommentData[];
}

interface Props {
  comment: CommentData;
  slug: string;
  currentUserId?: string;
  isAdmin: boolean;
  depth?: number;
  onDelete: (id: string) => void;
  onModerate: (id: string, data: { isHidden?: boolean; isSpam?: boolean }) => void;
  onReact: (id: string, emoji: string) => void;
  onReply: (data: { content: string; parentId?: string; image?: File }) => Promise<void>;
}

export const CommentItem = ({
  comment,
  slug,
  currentUserId,
  isAdmin,
  depth = 0,
  onDelete,
  onModerate,
  onReact,
  onReply,
}: Props) => {
  const [replying, setReplying] = useState(false);
  const indentClass = depth > 0 ? 'ml-6 md:ml-10 pl-4 border-l border-border/30' : '';

  return (
    <div className={indentClass}>
      <div className="py-4">
        {comment.isHidden && !isAdmin ? (
          <p className="text-sm text-muted-foreground italic">
            Komentarz ukryty przez administratora.
          </p>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center gap-3 mb-2">
              {comment.author.avatarPath ? (
                <img
                  src={comment.author.avatarPath}
                  alt={comment.author.name}
                  className="w-8 h-8 rounded-full object-cover"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                  {comment.author.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <span className="text-sm font-semibold">{comment.author.name}</span>
                <span className="text-xs text-muted-foreground ml-2">
                  {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true, locale: pl })}
                </span>
              </div>

              {/* Controls */}
              <div className="ml-auto flex items-center gap-1">
                {isAdmin && (
                  <>
                    <button
                      onClick={() => onModerate(comment.id, { isHidden: !comment.isHidden })}
                      className="p-1 text-muted-foreground hover:text-foreground transition"
                      title={comment.isHidden ? 'Pokaż' : 'Ukryj'}
                    >
                      {comment.isHidden ? <Eye size={14} /> : <EyeOff size={14} />}
                    </button>
                    <button
                      onClick={() => onModerate(comment.id, { isSpam: !comment.isSpam })}
                      className="p-1 text-muted-foreground hover:text-amber-600 transition"
                      title={comment.isSpam ? 'Cofnij spam' : 'Oznacz jako spam'}
                    >
                      <AlertTriangle size={14} />
                    </button>
                  </>
                )}
                {(isAdmin || currentUserId === comment.authorId) && (
                  <button
                    onClick={() => { if (confirm('Usunąć komentarz?')) onDelete(comment.id); }}
                    className="p-1 text-muted-foreground hover:text-destructive transition"
                    title="Usuń"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>

            {/* Content */}
            {comment.content && (
              <p className="text-sm leading-relaxed mb-2 whitespace-pre-wrap">{comment.content}</p>
            )}

            {/* Image */}
            {comment.imagePath && (
              <img
                src={comment.imagePath}
                alt="Załącznik"
                className="rounded-xl max-w-xs max-h-64 object-cover mb-2"
              />
            )}

            {/* Reactions + reply */}
            <div className="flex items-center gap-4 mt-2 flex-wrap">
              <ReactionPicker
                commentId={comment.id}
                reactions={comment.reactions}
                currentUserId={currentUserId}
                onReact={onReact}
              />
              {currentUserId && depth < 6 && (
                <button
                  onClick={() => setReplying((v) => !v)}
                  className="text-xs text-muted-foreground hover:text-foreground transition"
                >
                  Odpowiedz
                </button>
              )}
            </div>

            {/* Inline reply form */}
            {replying && (
              <div className="mt-3">
                <CommentForm
                  slug={slug}
                  parentId={comment.id}
                  isAuthenticated={!!currentUserId}
                  onSubmit={async (data) => { await onReply(data); setReplying(false); }}
                  onCancel={() => setReplying(false)}
                  autoFocus
                />
              </div>
            )}
          </>
        )}

        {/* Recursive children */}
        {comment.children?.map((child) => (
          <CommentItem
            key={child.id}
            comment={child}
            slug={slug}
            currentUserId={currentUserId}
            isAdmin={isAdmin}
            depth={depth + 1}
            onDelete={onDelete}
            onModerate={onModerate}
            onReact={onReact}
            onReply={onReply}
          />
        ))}
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Create `CommentTree`**

```tsx
// apps/web/src/components/blog/CommentTree.tsx
import { useMemo } from 'react';
import { CommentItem, type CommentData } from './CommentItem';

interface Props {
  comments: CommentData[];
  slug: string;
  currentUserId?: string;
  isAdmin: boolean;
  onDelete: (id: string) => void;
  onModerate: (id: string, data: { isHidden?: boolean; isSpam?: boolean }) => void;
  onReact: (id: string, emoji: string) => void;
  onReply: (data: { content: string; parentId?: string; image?: File }) => Promise<void>;
}

function buildTree(comments: CommentData[]): CommentData[] {
  const map = new Map<string, CommentData>();
  const roots: CommentData[] = [];

  comments.forEach((c) => map.set(c.id, { ...c, children: [] }));
  map.forEach((c) => {
    if (c.parentId && map.has(c.parentId)) {
      map.get(c.parentId)!.children!.push(c);
    } else {
      roots.push(c);
    }
  });

  return roots;
}

export const CommentTree = ({
  comments,
  slug,
  currentUserId,
  isAdmin,
  onDelete,
  onModerate,
  onReact,
  onReply,
}: Props) => {
  const tree = useMemo(() => buildTree(comments), [comments]);

  if (tree.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        Brak komentarzy. Bądź pierwszy!
      </p>
    );
  }

  return (
    <div className="divide-y divide-border/30">
      {tree.map((comment) => (
        <CommentItem
          key={comment.id}
          comment={comment}
          slug={slug}
          currentUserId={currentUserId}
          isAdmin={isAdmin}
          onDelete={onDelete}
          onModerate={onModerate}
          onReact={onReact}
          onReply={onReply}
        />
      ))}
    </div>
  );
};
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/blog/CommentItem.tsx apps/web/src/components/blog/CommentTree.tsx
git commit -m "feat: add CommentItem and CommentTree components"
```

---

## Task 9: `BlogCommentsSection` + mount in BlogPost

**Files:**
- Create: `apps/web/src/components/blog/BlogCommentsSection.tsx`
- Modify: `apps/web/src/pages/public/BlogPost.tsx`

- [ ] **Step 1: Create `BlogCommentsSection`**

```tsx
// apps/web/src/components/blog/BlogCommentsSection.tsx
import { useQuery, useMutation } from '@tanstack/react-query';
import { MessageSquare } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { blogApi } from '@/api/blog.api';
import { queryClient } from '@/lib/queryClient';
import { toast } from 'sonner';
import { CommentTree } from './CommentTree';
import { CommentForm } from './CommentForm';

interface Props {
  slug: string;
}

export const BlogCommentsSection = ({ slug }: Props) => {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN';

  const { data: comments = [], isLoading } = useQuery({
    queryKey: ['blog-comments', slug],
    queryFn: () => blogApi.getComments(slug),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['blog-comments', slug] });

  const addMutation = useMutation({
    mutationFn: (data: { content: string; parentId?: string; image?: File }) =>
      blogApi.addComment(slug, data),
    onSuccess: invalidate,
    onError: () => toast.error('Nie udało się dodać komentarza'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => blogApi.deleteComment(id),
    onSuccess: () => { invalidate(); toast.success('Komentarz usunięty'); },
    onError: () => toast.error('Nie udało się usunąć komentarza'),
  });

  const moderateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { isHidden?: boolean; isSpam?: boolean } }) =>
      blogApi.moderateComment(id, data),
    onSuccess: invalidate,
    onError: () => toast.error('Nie udało się zmienić moderacji'),
  });

  const reactMutation = useMutation({
    mutationFn: ({ id, emoji }: { id: string; emoji: string }) =>
      blogApi.reactToComment(id, emoji),
    onSuccess: invalidate,
  });

  return (
    <section className="py-14" style={{ backgroundColor: '#F5F0EB' }}>
      <div className="container max-w-3xl mx-auto">
        <h2
          className="text-2xl font-heading font-bold mb-8 flex items-center gap-2"
          style={{ color: '#1A1208' }}
        >
          <MessageSquare size={22} />
          Komentarze
          {comments.length > 0 && (
            <span className="text-sm font-normal text-muted-foreground ml-1">
              ({comments.length})
            </span>
          )}
        </h2>

        {/* Top-level comment form */}
        <div className="mb-8">
          <CommentForm
            slug={slug}
            isAuthenticated={!!user}
            onSubmit={(data) => addMutation.mutateAsync(data)}
          />
        </div>

        {/* Comment tree */}
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          </div>
        ) : (
          <CommentTree
            comments={comments}
            slug={slug}
            currentUserId={user?.id}
            isAdmin={isAdmin}
            onDelete={(id) => deleteMutation.mutate(id)}
            onModerate={(id, data) => moderateMutation.mutate({ id, data })}
            onReact={(id, emoji) => reactMutation.mutate({ id, emoji })}
            onReply={(data) => addMutation.mutateAsync(data)}
          />
        )}
      </div>
    </section>
  );
};
```

- [ ] **Step 2: Mount in `BlogPost.tsx`**

In `apps/web/src/pages/public/BlogPost.tsx`:

Add import at the top after the last existing import:

```tsx
import { BlogCommentsSection } from '@/components/blog/BlogCommentsSection';
```

At the end of the returned JSX, after the closing `</section>` of the content section (the one with `py-14` and `FDFAF6` background), add:

```tsx
      <BlogCommentsSection slug={post.slug} />
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/blog/BlogCommentsSection.tsx apps/web/src/pages/public/BlogPost.tsx
git commit -m "feat: add BlogCommentsSection and mount in BlogPost"
```

---

## Task 10: Admin moderation page

**Files:**
- Create: `apps/web/src/pages/admin/AdminBlogComments.tsx`
- Modify: `apps/web/src/router.tsx`
- Modify: `apps/web/src/pages/admin/Blog.tsx`

- [ ] **Step 1: Create `AdminBlogComments.tsx`**

```tsx
// apps/web/src/pages/admin/AdminBlogComments.tsx
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { ArrowLeft, EyeOff, Eye, AlertTriangle, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { pl } from 'date-fns/locale';
import { blogApi } from '@/api/blog.api';
import { queryClient } from '@/lib/queryClient';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export const AdminBlogComments = () => {
  const { id: postId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Get slug from blog list
  const { data: posts } = useQuery({ queryKey: ['blog-admin'], queryFn: blogApi.getAll });
  const post = posts?.find((p: any) => p.id === postId);
  const slug = post?.slug;

  // Admin token is sent automatically by axios interceptor.
  // The backend detects ADMIN role and returns ALL comments including spam
  // with full content (no nulling of hidden comments).
  const { data: comments = [], isLoading } = useQuery({
    queryKey: ['blog-comments-admin', slug],
    queryFn: () => blogApi.getComments(slug!),
    enabled: !!slug,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['blog-comments-admin', slug] });

  const moderateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { isHidden?: boolean; isSpam?: boolean } }) =>
      blogApi.moderateComment(id, data),
    onSuccess: () => { invalidate(); toast.success('Zaktualizowano'); },
    onError: () => toast.error('Błąd moderacji'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => blogApi.deleteComment(id),
    onSuccess: () => { invalidate(); toast.success('Komentarz usunięty'); },
    onError: () => toast.error('Nie udało się usunąć'),
  });

  return (
    <div className="space-y-6 animate-enter">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/admin/blog')}>
          <ArrowLeft size={16} className="mr-1" /> Powrót
        </Button>
        <h1 className="text-2xl font-heading font-bold text-primary">
          Komentarze: {post?.title ?? '…'}
        </h1>
      </div>

      {isLoading && <div className="animate-pulse p-4">Ładowanie…</div>}

      {!isLoading && comments.length === 0 && (
        <div className="text-muted-foreground p-12 bg-muted/20 border-2 border-dashed rounded-2xl text-center">
          Brak komentarzy.
        </div>
      )}

      <div className="grid gap-3">
        {(comments as any[]).map((c) => (
          <Card
            key={c.id}
            className={`border-border/50 ${c.isHidden ? 'opacity-60' : ''} ${c.isSpam ? 'border-amber-400/50 bg-amber-50/30' : ''}`}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-semibold text-sm">{c.author?.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(c.createdAt), { addSuffix: true, locale: pl })}
                    </span>
                    {c.isHidden && (
                      <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">
                        Ukryty
                      </span>
                    )}
                    {c.isSpam && (
                      <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                        Spam
                      </span>
                    )}
                    {c.parentId && (
                      <span className="text-xs text-muted-foreground">↳ odpowiedź</span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {c.content ?? <em>brak treści</em>}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => moderateMutation.mutate({ id: c.id, data: { isHidden: !c.isHidden } })}
                    title={c.isHidden ? 'Pokaż' : 'Ukryj'}
                  >
                    {c.isHidden ? <Eye size={15} /> : <EyeOff size={15} />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => moderateMutation.mutate({ id: c.id, data: { isSpam: !c.isSpam } })}
                    title={c.isSpam ? 'Cofnij spam' : 'Oznacz spam'}
                  >
                    <AlertTriangle size={15} className={c.isSpam ? 'text-amber-600' : ''} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { if (confirm('Usunąć?')) deleteMutation.mutate(c.id); }}
                    title="Usuń"
                  >
                    <Trash2 size={15} className="text-destructive" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Add route to `router.tsx`**

In `apps/web/src/router.tsx`:

Add import after the last admin page import:

```tsx
import { AdminBlogComments } from './pages/admin/AdminBlogComments';
```

Inside the `/admin` children array, after `{ path: 'blog/:id/edit', element: <AdminBlogForm /> },` add:

```tsx
{ path: 'blog/:id/comments', element: <AdminBlogComments /> },
```

- [ ] **Step 3: Add "Komentarze" button in `Blog.tsx`**

In `apps/web/src/pages/admin/Blog.tsx`, find the `<div className="flex gap-2">` that contains the "Edytuj wpis" and "Usuń" buttons (around line 42–46). Add a new button **before** "Edytuj wpis":

```tsx
<Button variant="outline" size="sm" onClick={() => navigate(`/admin/blog/${p.id}/comments`)}>
  Komentarze
</Button>
```

- [ ] **Step 4: Build frontend**

```bash
cd apps/web
pnpm build
```

Expected: No TypeScript errors.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/pages/admin/AdminBlogComments.tsx apps/web/src/router.tsx apps/web/src/pages/admin/Blog.tsx
git commit -m "feat: add admin blog comments moderation page and route"
```

---

## Task 11: End-to-end smoke test

- [ ] **Step 1: Run all backend tests**

```bash
cd apps/server
pnpm test
```

Expected: All tests pass including the new `blog-comments.service.test.ts`.

- [ ] **Step 2: Start dev servers**

```bash
cd cosmo-app
pnpm dev
```

- [ ] **Step 3: Test public comment flow**

1. Open `http://localhost:5173/blog` — click a published post.
2. Scroll to bottom — "Komentarze" section should appear.
3. Without login — see "Zaloguj się lub zarejestruj" banner.
4. Log in as regular user. Banner replaced by textarea form.
5. Post a top-level comment — appears immediately.
6. Click "Odpowiedz" on that comment — inline form opens, submit reply — appears nested with indent.
7. Hover over the reaction area — emoji picker pops up. Click ❤️ — count shows. Click again → removed.
8. Upload image in comment — appears below text.

- [ ] **Step 4: Test admin moderation flow**

1. Log in as admin.
2. Navigate to `/admin/blog` — "Komentarze" button visible per post.
3. Click "Komentarze" — admin page opens, all comments listed including spam.
4. Click Hide icon on a comment — it becomes greyed, public blog shows "Komentarz ukryty przez administratora".
5. Click Spam icon — comment disappears from public view, stays in admin list with amber badge.
6. Click Spam icon again — spam reversed.
7. Delete a comment — disappears from both views.

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "feat: complete blog comments system — reactions, threads, moderation, notifications"
```
