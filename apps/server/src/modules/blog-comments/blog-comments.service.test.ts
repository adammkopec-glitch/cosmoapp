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
    expect((prisma.blogComment.findMany as any).mock.calls[0][0].where).toMatchObject({ isSpam: false });
  });

  it('returns all comments including spam when includeAll=true (admin)', async () => {
    (prisma.blogPost.findUnique as any).mockResolvedValue(mockPost);
    (prisma.blogComment.findMany as any).mockResolvedValue([mockComment]);

    await getComments('test-post', { includeAll: true });
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
    await expect(getComments('no-such-slug', {})).rejects.toMatchObject({ statusCode: 404 });
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
    await expect(createComment('u1', 'test-post', { content: 'Hi' })).rejects.toMatchObject({ statusCode: 400 });
  });

  it('validates parent comment exists BEFORE creating the comment', async () => {
    (prisma.blogPost.findUnique as any).mockResolvedValue(mockPost);
    (prisma.blogComment.findFirst as any).mockResolvedValue(null);

    await expect(
      createComment('u1', 'test-post', { content: 'Reply', parentId: 'ghost-id' })
    ).rejects.toMatchObject({ statusCode: 404 });
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
    const parentComment = { ...mockComment, id: 'parent1', authorId: 'u1' };
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
    await expect(deleteComment('u1', 'c1', false)).rejects.toMatchObject({ statusCode: 403 });
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
