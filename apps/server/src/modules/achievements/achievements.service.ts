// filepath: apps/server/src/modules/achievements/achievements.service.ts
import { prisma } from '../../config/prisma';
import { getIO } from '../../socket';
import { createAndEmitNotification } from '../notifications/notifications.service';

interface AchievementCondition {
  type: string;
  value?: number;
}

interface AwardedAchievement {
  id: string;
  key: string;
  name: string;
  description: string;
  icon: string;
  pointsBonus: number;
}

const DEFAULT_ACHIEVEMENTS = [
  { key: 'FIRST_VISIT', name: 'Pierwsza wizyta', description: 'Witaj w COSMO!', icon: '🌟', pointsBonus: 10, condition: { type: 'VISIT_COUNT', value: 1 }, sortOrder: 1 },
  { key: 'LOYAL_10', name: 'Wierna klientka', description: '10 wizyt w COSMO', icon: '💎', pointsBonus: 20, condition: { type: 'VISIT_COUNT', value: 10 }, sortOrder: 2 },
  { key: 'VIP_50', name: 'VIP', description: '50 wizyt w COSMO', icon: '🏆', pointsBonus: 50, condition: { type: 'VISIT_COUNT', value: 50 }, sortOrder: 3 },
  { key: 'EXPLORER_3', name: 'Odkrywczyni', description: 'Wypróbuj 3 różne kategorie zabiegów', icon: '🎯', pointsBonus: 15, condition: { type: 'CATEGORY_COUNT', value: 3 }, sortOrder: 4 },
  { key: 'FULL_PACKAGE', name: 'Pełen pakiet', description: 'Zabieg z każdej kategorii', icon: '🌸', pointsBonus: 30, condition: { type: 'ALL_CATEGORIES' }, sortOrder: 5 },
  { key: 'FIRST_REVIEW', name: 'Głos ma znaczenie', description: 'Pierwsza recenzja', icon: '✍️', pointsBonus: 10, condition: { type: 'REVIEW_COUNT', value: 1 }, sortOrder: 6 },
  { key: 'AMBASSADOR', name: 'Ambasadorka', description: 'Poleciłaś kogoś', icon: '👑', pointsBonus: 15, condition: { type: 'REFERRAL_COUNT', value: 1 }, sortOrder: 7 },
  { key: 'STREAK_5', name: 'Seria 5', description: '5 miesięcy z rzędu', icon: '🔥', pointsBonus: 25, condition: { type: 'STREAK_MONTHS', value: 5 }, sortOrder: 8 },
];

// ─── Seed default achievements ───────────────────────────────────────────────
export const seedAchievements = async () => {
  for (const a of DEFAULT_ACHIEVEMENTS) {
    await prisma.achievement.upsert({
      where: { key: a.key },
      update: { name: a.name, description: a.description, icon: a.icon, pointsBonus: a.pointsBonus, condition: a.condition, sortOrder: a.sortOrder },
      create: { key: a.key, name: a.name, description: a.description, icon: a.icon, pointsBonus: a.pointsBonus, condition: a.condition, sortOrder: a.sortOrder },
    });
  }
  console.log('🏅 Achievement badges seeded');
};

// ─── Gather user stats for progress calculation ──────────────────────────────
const getUserStats = async (userId: string) => {
  const [
    completedVisits,
    userCategories,
    totalActiveCategories,
    reviewCount,
    user,
    completedAppointments,
  ] = await Promise.all([
    prisma.appointment.count({
      where: { userId, status: 'COMPLETED' },
    }),

    // Distinct categories the user has visited
    prisma.appointment.findMany({
      where: { userId, status: 'COMPLETED' },
      select: { service: { select: { category: true } } },
      distinct: ['serviceId'],
    }),

    // Total active service categories
    prisma.service.findMany({
      where: { isActive: true },
      select: { category: true },
      distinct: ['category'],
    }),

    prisma.review.count({ where: { userId } }),

    prisma.user.findUnique({
      where: { id: userId },
      select: { referralCount: true },
    }),

    // Appointments for streak calculation (last 12 months of completed appointments)
    prisma.appointment.findMany({
      where: {
        userId,
        status: 'COMPLETED',
        date: { gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) },
      },
      select: { date: true },
      orderBy: { date: 'desc' },
    }),
  ]);

  const distinctUserCategories = new Set(userCategories.map((a) => a.service.category));
  const distinctActiveCategories = new Set(totalActiveCategories.map((s) => s.category));

  // Calculate consecutive months streak
  const streak = calculateMonthlyStreak(completedAppointments.map((a) => a.date));

  return {
    completedVisits,
    categoryCount: distinctUserCategories.size,
    allCategoriesCount: distinctActiveCategories.size,
    hasAllCategories: distinctActiveCategories.size > 0 && distinctUserCategories.size >= distinctActiveCategories.size,
    reviewCount,
    referralCount: user?.referralCount ?? 0,
    streakMonths: streak,
  };
};

// ─── Calculate consecutive month streak ──────────────────────────────────────
const calculateMonthlyStreak = (dates: Date[]): number => {
  if (dates.length === 0) return 0;

  // Collect unique year-month strings
  const months = new Set<string>();
  for (const d of dates) {
    months.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }

  // Sort descending
  const sorted = Array.from(months).sort().reverse();
  if (sorted.length === 0) return 0;

  // Start from the most recent month; check if it's current or previous month
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;

  // Streak must include current or previous month to be active
  if (sorted[0] !== currentMonth && sorted[0] !== prevMonth) return 0;

  let streak = 1;
  for (let i = 1; i < sorted.length; i++) {
    const [year, month] = sorted[i - 1].split('-').map(Number);
    const expectedPrev = new Date(year, month - 2, 1);
    const expectedStr = `${expectedPrev.getFullYear()}-${String(expectedPrev.getMonth() + 1).padStart(2, '0')}`;

    if (sorted[i] === expectedStr) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
};

// ─── Check condition against stats ───────────────────────────────────────────
const checkCondition = (
  condition: AchievementCondition,
  stats: Awaited<ReturnType<typeof getUserStats>>
): boolean => {
  switch (condition.type) {
    case 'VISIT_COUNT':
      return stats.completedVisits >= (condition.value ?? 0);
    case 'CATEGORY_COUNT':
      return stats.categoryCount >= (condition.value ?? 0);
    case 'ALL_CATEGORIES':
      return stats.hasAllCategories;
    case 'REVIEW_COUNT':
      return stats.reviewCount >= (condition.value ?? 0);
    case 'REFERRAL_COUNT':
      return stats.referralCount >= (condition.value ?? 0);
    case 'STREAK_MONTHS':
      return stats.streakMonths >= (condition.value ?? 0);
    default:
      return false;
  }
};

// ─── Get progress value for a condition ──────────────────────────────────────
const getProgress = (
  condition: AchievementCondition,
  stats: Awaited<ReturnType<typeof getUserStats>>
): { current: number; required: number } => {
  switch (condition.type) {
    case 'VISIT_COUNT':
      return { current: stats.completedVisits, required: condition.value ?? 0 };
    case 'CATEGORY_COUNT':
      return { current: stats.categoryCount, required: condition.value ?? 0 };
    case 'ALL_CATEGORIES':
      return { current: stats.categoryCount, required: stats.allCategoriesCount };
    case 'REVIEW_COUNT':
      return { current: stats.reviewCount, required: condition.value ?? 0 };
    case 'REFERRAL_COUNT':
      return { current: stats.referralCount, required: condition.value ?? 0 };
    case 'STREAK_MONTHS':
      return { current: stats.streakMonths, required: condition.value ?? 0 };
    default:
      return { current: 0, required: 0 };
  }
};

// ─── Get all achievements with user progress ─────────────────────────────────
export const getAllForUser = async (userId: string) => {
  const [achievements, userAchievements, stats] = await Promise.all([
    prisma.achievement.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    }),
    prisma.userAchievement.findMany({
      where: { userId },
      select: { achievementId: true, earnedAt: true },
    }),
    getUserStats(userId),
  ]);

  const earnedMap = new Map(userAchievements.map((ua) => [ua.achievementId, ua.earnedAt]));

  return achievements.map((a) => {
    const condition = a.condition as AchievementCondition;
    const earned = earnedMap.has(a.id);
    const progress = getProgress(condition, stats);

    return {
      id: a.id,
      key: a.key,
      name: a.name,
      description: a.description,
      icon: a.icon,
      pointsBonus: a.pointsBonus,
      sortOrder: a.sortOrder,
      earned,
      earnedAt: earnedMap.get(a.id) ?? null,
      progress: {
        current: Math.min(progress.current, progress.required),
        required: progress.required,
        percentage: progress.required > 0 ? Math.min(100, Math.round((progress.current / progress.required) * 100)) : 0,
      },
    };
  });
};

// ─── Check and award new achievements ────────────────────────────────────────
export const checkAndAward = async (userId: string): Promise<AwardedAchievement[]> => {
  const stats = await getUserStats(userId);

  const achievements = await prisma.achievement.findMany({
    where: { isActive: true },
  });

  const alreadyEarned = await prisma.userAchievement.findMany({
    where: { userId },
    select: { achievementId: true },
  });

  const earnedIds = new Set(alreadyEarned.map((ua) => ua.achievementId));

  // Find achievements the user qualifies for but hasn't earned yet
  const newlyQualified = achievements.filter((a) => {
    if (earnedIds.has(a.id)) return false;
    const condition = a.condition as AchievementCondition;
    return checkCondition(condition, stats);
  });

  if (newlyQualified.length === 0) return [];

  // Award all new achievements in a single transaction
  const awarded = await prisma.$transaction(async (tx) => {
    const results: AwardedAchievement[] = [];

    for (const achievement of newlyQualified) {
      // Create user achievement
      await tx.userAchievement.create({
        data: { userId, achievementId: achievement.id },
      });

      // Add bonus loyalty points if any
      if (achievement.pointsBonus > 0) {
        await tx.loyaltyTransaction.create({
          data: {
            userId,
            points: achievement.pointsBonus,
            type: 'EARN',
            description: `Odznaka: ${achievement.name}`,
          },
        });

        await tx.user.update({
          where: { id: userId },
          data: { loyaltyPoints: { increment: achievement.pointsBonus } },
        });
      }

      results.push({
        id: achievement.id,
        key: achievement.key,
        name: achievement.name,
        description: achievement.description,
        icon: achievement.icon,
        pointsBonus: achievement.pointsBonus,
      });
    }

    return results;
  });

  for (const achievement of awarded) {
    try {
      const io = getIO();
      await createAndEmitNotification(io, {
        userId,
        type: 'ACHIEVEMENT_UNLOCKED',
        title: achievement.name,
        body: achievement.description,
        url: '/user/wizyty',
      });
    } catch (err) {
      console.error('Notification delivery failed (achievement):', err);
    }
  }

  return awarded;
};
