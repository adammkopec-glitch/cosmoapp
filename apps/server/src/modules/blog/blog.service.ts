// filepath: apps/server/src/modules/blog/blog.service.ts
import { prisma } from '../../config/prisma';
import { AppError } from '../../middleware/error.middleware';
import { CreateBlogPostInput, UpdateBlogPostInput } from '@cosmo/shared';
import { createSlug } from '../../utils/slug';

export const getAllPosts = async (includeUnpublished = false, userId?: string) => {
  const posts = await prisma.blogPost.findMany({
    where: includeUnpublished ? {} : { isPublished: true },
    orderBy: { createdAt: 'desc' },
    include: {
      author: { select: { name: true, avatarPath: true } },
      tags: true,
      _count: { select: { likes: true, comments: true } }
    }
  });

  const NEWNESS_BONUS = 10;
  const NEWNESS_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
  const isNew = (createdAt: Date) =>
    Date.now() - new Date(createdAt).getTime() < NEWNESS_WINDOW_MS;

  let likedPostIdSet = new Set<string>();
  if (userId) {
    const likedPostIds = await prisma.blogPostLike.findMany({
      where: { userId },
      select: { postId: true }
    });
    likedPostIdSet = new Set(likedPostIds.map(l => l.postId));
  }

  const mapped = posts.map(post => ({
    ...post,
    isLiked: likedPostIdSet.has(post.id),
    engagementScore: post._count.likes + post._count.comments + (isNew(post.createdAt) ? NEWNESS_BONUS : 0)
  }));

  // Admin calls keep createdAt desc (already sorted by Prisma); only sort public view
  if (includeUnpublished) return mapped;
  return mapped.sort((a, b) => b.engagementScore - a.engagementScore);
};

export const getPostBySlug = async (slug: string, userId?: string) => {
  const post = await prisma.blogPost.update({
    where: { slug },
    data: { views: { increment: 1 } },
    include: {
      author: { select: { name: true, avatarPath: true } },
      tags: true,
      _count: { select: { likes: true, comments: true } }
    }
  });
  if (!post) throw new AppError('Wpis nie znaleziony', 404);

  let isLiked = false;
  if (userId) {
    const existingLike = await prisma.blogPostLike.findUnique({
      where: { postId_userId: { postId: post.id, userId } }
    });
    isLiked = !!existingLike;
  }

  return { ...post, isLiked };
};

export const createPost = async (authorId: string, data: CreateBlogPostInput) => {
  let slug = createSlug(data.title);
  
  const existing = await prisma.blogPost.findUnique({ where: { slug } });
  if (existing) slug = `${slug}-${Date.now()}`;

  const { tags, ...rest } = data;

  return await prisma.blogPost.create({
    data: {
      ...rest,
      slug,
      authorId,
      tags: tags ? {
        connectOrCreate: tags.map(tag => ({
          where: { name: tag },
          create: { name: tag, slug: createSlug(tag) }
        }))
      } : undefined
    }
  });
};

export const updatePostImage = async (id: string, coverImage: string) => {
  return await prisma.blogPost.update({
    where: { id },
    data: { coverImage }
  });
};

export const updatePost = async (id: string, data: UpdateBlogPostInput) => {
  const { tags, ...rest } = data;
  let slug;
  if (data.title) slug = createSlug(data.title);

  return await prisma.blogPost.update({
    where: { id },
    data: {
      ...rest,
      ...(slug && { slug }),
      tags: tags ? {
        set: [], // clear existing
        connectOrCreate: tags.map(tag => ({
          where: { name: tag },
          create: { name: tag, slug: createSlug(tag) }
        }))
      } : undefined
    }
  });
};

export const deletePost = async (id: string) => {
  return await prisma.blogPost.delete({ where: { id } });
};

export const toggleLike = async (slug: string, userId: string) => {
  const post = await prisma.blogPost.findUnique({ where: { slug } });
  if (!post) throw new AppError('Wpis nie znaleziony', 404);

  const existingLike = await prisma.blogPostLike.findUnique({
    where: { postId_userId: { postId: post.id, userId } }
  });

  if (existingLike) {
    await prisma.blogPostLike.delete({ where: { id: existingLike.id } });
    return { liked: false };
  } else {
    await prisma.blogPostLike.create({
      data: { postId: post.id, userId }
    });
    return { liked: true };
  }
};
