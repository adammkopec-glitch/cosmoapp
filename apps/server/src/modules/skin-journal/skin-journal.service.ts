import { prisma } from '../../config/prisma';
import { AppError } from '../../middleware/error.middleware';
import { getISOWeek, getISOWeekYear } from 'date-fns';

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

export interface JournalSummary {
  mood: {
    average: number | null;
    trend: 'rising' | 'falling' | 'stable' | null;
    byWeek: { week: string; avg: number }[];
    distribution: { mood: number; count: number }[];
  };
  tags: { tag: string; count: number }[];
  activity: {
    totalEntries: number;
    activeDays: number;
    totalDays: number;
    currentStreak: number;
    longestStreak: number;
    afterAppointments: number;
  };
  photos: {
    total: number;
    paths: string[];
  };
  range: { from: string; to: string };
}

export const getSummary = async (
  userId: string,
  range: '30' | '90' | 'all',
): Promise<JournalSummary> => {
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);

  let fromDate: Date | null = null;
  if (range === '30') {
    fromDate = new Date(today);
    fromDate.setUTCDate(fromDate.getUTCDate() - 30);
  } else if (range === '90') {
    fromDate = new Date(today);
    fromDate.setUTCDate(fromDate.getUTCDate() - 90);
  }

  const entries = await prisma.skinJournalEntry.findMany({
    where: {
      userId,
      ...(fromDate ? { date: { gte: fromDate } } : {}),
    },
    orderBy: { date: 'asc' },
    select: {
      date: true,
      mood: true,
      tags: true,
      photoPath: true,
      linkedAppointmentId: true,
    },
  });

  // ── Range bounds ──────────────────────────────────────────────────────────
  let rangeFrom = todayStr;
  const rangeTo = todayStr;
  if (range === '30') {
    rangeFrom = fromDate!.toISOString().slice(0, 10);
  } else if (range === '90') {
    rangeFrom = fromDate!.toISOString().slice(0, 10);
  } else if (entries.length > 0) {
    rangeFrom = entries[0].date.toISOString().slice(0, 10);
  }

  // ── Mood ─────────────────────────────────────────────────────────────────
  const moodEntries = entries.filter((e) => e.mood !== null);
  const average =
    moodEntries.length > 0
      ? moodEntries.reduce((s, e) => s + e.mood!, 0) / moodEntries.length
      : null;

  // Trend
  let trend: 'rising' | 'falling' | 'stable' | null = null;
  if (moodEntries.length >= 4) {
    const half = Math.floor(moodEntries.length / 2);
    const first = moodEntries.slice(0, half);
    const second = moodEntries.slice(half);
    const avg1 = first.reduce((s, e) => s + e.mood!, 0) / first.length;
    const avg2 = second.reduce((s, e) => s + e.mood!, 0) / second.length;
    if (avg2 - avg1 >= 0.5) trend = 'rising';
    else if (avg1 - avg2 >= 0.5) trend = 'falling';
    else trend = 'stable';
  }

  // By week
  const weekMap = new Map<string, { sum: number; count: number }>();
  for (const e of moodEntries) {
    const week = `${getISOWeekYear(e.date)}-W${String(getISOWeek(e.date)).padStart(2, '0')}`;
    const existing = weekMap.get(week) ?? { sum: 0, count: 0 };
    weekMap.set(week, { sum: existing.sum + e.mood!, count: existing.count + 1 });
  }
  const byWeek = Array.from(weekMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, { sum, count }]) => ({ week, avg: sum / count }));

  // Distribution — always all 5 mood levels
  const distribution = [1, 2, 3, 4, 5].map((mood) => ({
    mood,
    count: moodEntries.filter((e) => e.mood === mood).length,
  }));

  // ── Tags ──────────────────────────────────────────────────────────────────
  const tagCounts = new Map<string, number>();
  for (const e of entries) {
    for (const tag of e.tags) {
      tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
    }
  }
  const tags = Array.from(tagCounts.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count);

  // ── Activity ─────────────────────────────────────────────────────────────
  const dateStrings = entries.map((e) => e.date.toISOString().slice(0, 10));
  const uniqueDays = new Set(dateStrings);
  const activeDays = uniqueDays.size;

  let totalDays: number;
  if (range === '30') totalDays = 30;
  else if (range === '90') totalDays = 90;
  else if (entries.length === 0) totalDays = 0;
  else {
    const oldest = entries[0].date;
    const diffMs = today.getTime() - oldest.getTime();
    totalDays = Math.floor(diffMs / 86400000) + 1;
  }

  // Current streak
  let currentStreak = 0;
  {
    const cursor = new Date(today);
    while (uniqueDays.has(cursor.toISOString().slice(0, 10))) {
      currentStreak++;
      cursor.setUTCDate(cursor.getUTCDate() - 1);
    }
  }

  // Longest streak
  let longestStreak = 0;
  {
    const sortedDays = Array.from(uniqueDays).sort();
    let run = 0;
    for (let i = 0; i < sortedDays.length; i++) {
      if (i === 0) {
        run = 1;
      } else {
        const prev = new Date(sortedDays[i - 1]);
        const curr = new Date(sortedDays[i]);
        const diff = (curr.getTime() - prev.getTime()) / 86400000;
        run = diff === 1 ? run + 1 : 1;
      }
      if (run > longestStreak) longestStreak = run;
    }
  }

  const afterAppointments = entries.filter((e) => e.linkedAppointmentId !== null).length;

  // ── Photos ────────────────────────────────────────────────────────────────
  const photoEntries = entries.filter((e) => e.photoPath !== null).reverse();
  const photos = {
    total: photoEntries.length,
    paths: photoEntries.slice(0, 8).map((e) => e.photoPath!),
  };

  return {
    mood: { average, trend, byWeek, distribution },
    tags,
    activity: { totalEntries: entries.length, activeDays, totalDays, currentStreak, longestStreak, afterAppointments },
    photos,
    range: { from: rangeFrom, to: rangeTo },
  };
};
