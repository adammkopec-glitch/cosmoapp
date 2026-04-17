import path from 'path';
import fs from 'fs/promises';
import { prisma } from '../../config/prisma';
import { AppError } from '../../middleware/error.middleware';
import { processAndSaveImage } from '../../utils/imageProcessor';
import { createNotification } from '../notifications/notifications.service';
import { getIO } from '../../socket';

export const getComments = async (
  slug: string,
  options: { includeAll?: boolean } = {}
) => {
  const post = await prisma.blogPost.findUnique({ where: { slug } });
  if (!post) throw new AppError('Wpis nie znaleziony', 404);

  const where: Record<string, unknown> = { postId: post.id };
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

  // Public view: null out hidden comment content so server never leaks it
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

  // Validate parent BEFORE creating the comment to avoid orphaned replies
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

  // Notify parent comment author if reply is from a different user
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
      // Socket not available (e.g. in tests) — skip silently
    }
  }

  return comment;
};

const deleteCommentTree = async (commentId: string) => {
  const replies = await prisma.blogComment.findMany({ where: { parentId: commentId } });
  for (const reply of replies) {
    await deleteCommentTree(reply.id);
  }
  await prisma.blogCommentReaction.deleteMany({ where: { commentId } });
  const comment = await prisma.blogComment.findFirst({ where: { id: commentId } });
  if (comment?.imagePath) {
    const relPath = comment.imagePath.replace(/^\//, '');
    const absPath = path.join(process.cwd(), relPath);
    fs.unlink(absPath).catch(() => {});
  }
  await prisma.blogComment.delete({ where: { id: commentId } });
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

  if (comment.imagePath) {
    const relPath = comment.imagePath.replace(/^\//, '');
    const absPath = path.join(process.cwd(), relPath);
    fs.unlink(absPath).catch(() => {});
  }

  await deleteCommentTree(commentId);
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
