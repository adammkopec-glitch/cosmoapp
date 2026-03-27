import { prisma } from '../../config/prisma';
import { AppError } from '../../middleware/error.middleware';

export const getJournal = async (userId: string, page = 1, limit = 10) => {
  const skip = (page - 1) * limit;
  const [entries, total] = await Promise.all([
    prisma.skinJournalEntry.findMany({
      where: { userId },
      orderBy: { date: 'desc' },
      skip,
      take: limit,
      include: {
        author: { select: { id: true, name: true } },
        comments: {
          orderBy: { createdAt: 'asc' },
          include: { author: { select: { id: true, name: true } } },
        },
        _count: { select: { comments: true } },
      },
    }),
    prisma.skinJournalEntry.count({ where: { userId } }),
  ]);
  return { entries, total, page, limit, totalPages: Math.ceil(total / limit) };
};

export const createEntry = async (
  userId: string,
  data: { mood?: number; notes?: string; photoPath?: string; linkedAppointmentId?: string; tags?: string[]; date?: Date | string },
  authorId?: string,
  isAdminEntry?: boolean,
) => {
  if (data.mood !== undefined && (!Number.isInteger(data.mood) || data.mood < 1 || data.mood > 5)) {
    throw new AppError('Nastrój musi być wartością od 1 do 5', 400);
  }
  return prisma.skinJournalEntry.create({
    data: {
      userId,
      date: data.date ? new Date(data.date) : new Date(),
      mood: data.mood,
      notes: data.notes,
      photoPath: data.photoPath,
      linkedAppointmentId: data.linkedAppointmentId,
      tags: data.tags ?? [],
      authorId: authorId ?? null,
      isAdminEntry: isAdminEntry ?? false,
    },
    include: {
      author: { select: { id: true, name: true } },
      comments: { include: { author: { select: { id: true, name: true } } } },
    },
  });
};

export const updateEntry = async (
  userId: string,
  entryId: string,
  data: { mood?: number; notes?: string; tags?: string[]; photoPath?: string },
  isAdmin = false,
) => {
  const where = isAdmin ? { id: entryId } : { id: entryId, userId };
  const entry = await prisma.skinJournalEntry.findFirst({ where });
  if (!entry) throw new AppError('Wpis nie znaleziony', 404);
  return prisma.skinJournalEntry.update({
    where: { id: entryId },
    data,
    include: {
      author: { select: { id: true, name: true } },
      comments: { include: { author: { select: { id: true, name: true } } } },
    },
  });
};

export const deleteEntry = async (userId: string, entryId: string, isAdmin = false) => {
  const where = isAdmin ? { id: entryId } : { id: entryId, userId };
  const entry = await prisma.skinJournalEntry.findFirst({ where });
  if (!entry) throw new AppError('Wpis nie znaleziony', 404);
  await prisma.skinJournalEntry.delete({ where: { id: entryId } });
};

export const addComment = async (entryId: string, authorId: string, content: string) => {
  const entry = await prisma.skinJournalEntry.findUnique({ where: { id: entryId } });
  if (!entry) throw new AppError('Wpis nie znaleziony', 404);
  return prisma.skinJournalComment.create({
    data: { entryId, authorId, content },
    include: {
      author: { select: { id: true, name: true } },
      entry: { select: { userId: true } },
    },
  });
};

export const getUnreadCommentCount = async (userId: string) => {
  return prisma.skinJournalComment.count({
    where: {
      entry: { userId },
      readAt: null,
      authorId: { not: userId },
    },
  });
};

export const markCommentsRead = async (userId: string, entryId: string) => {
  await prisma.skinJournalComment.updateMany({
    where: {
      entryId,
      entry: { userId },
      readAt: null,
      authorId: { not: userId },
    },
    data: { readAt: new Date() },
  });
};

export const getAdminJournal = async (userId: string, page = 1, limit = 10) => {
  return getJournal(userId, page, limit);
};
