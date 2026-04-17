import { prisma } from '../../config/prisma';
import { AppError } from '../../middleware/error.middleware';
import { generateCode } from '../../utils/generateCode';
import { sendEmail } from '../../utils/email';
import bcrypt from 'bcryptjs';

const VISIT_POINTS_PREFIXES = ['Punkty za wizyte: ', 'Punkty za wizyte:', 'Punkty za wizytę: ', 'Punkty za wizytę:'];

const extractVisitServiceName = (description: string): string | null => {
  for (const prefix of VISIT_POINTS_PREFIXES) {
    if (description.startsWith(prefix)) {
      return description.slice(prefix.length).trim();
    }
  }

  return null;
};

const ensureAmbassadorCode = async (userId: string): Promise<string> => {
  while (true) {
    const code = generateCode(8);

    try {
      const updated = await prisma.user.update({
        where: { id: userId },
        data: { ambassadorCode: code },
        select: { ambassadorCode: true },
      });

      return updated.ambassadorCode!;
    } catch {
      // Unique constraint violation - retry with a new code.
    }
  }
};

export const getAllUsers = async () => {
  return prisma.user.findMany({
    where: { accountStatus: 'ACTIVE' },
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      role: true,
      avatarPath: true,
      loyaltyPoints: true,
      loyaltyTier: true,
      createdAt: true,
      ambassadorCode: true,
      referralCount: true,
      termsAcceptedAt: true,
      marketingConsent: true,
      photoConsent: true,
      cardAllergies: true,
      cardConditions: true,
      cardPreferences: true,
      cardStaffNotes: true,
      _count: {
        select: {
          appointments: {
            where: { status: 'COMPLETED' },
          },
        },
      },
    },
  });
};

export const getUserById = async (id: string) => {
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      role: true,
      avatarPath: true,
      loyaltyPoints: true,
      loyaltyTier: true,
      createdAt: true,
      ambassadorCode: true,
      referralCount: true,
      termsAcceptedAt: true,
      marketingConsent: true,
      photoConsent: true,
      cardAllergies: true,
      cardConditions: true,
      cardPreferences: true,
      onboardingCompleted: true,
      accountStatus: true,
      mustChangePassword: true,
    },
  });

  if (!user) {
    throw new AppError('Nie znaleziono uzytkownika', 404);
  }

  if (!user.ambassadorCode) {
    const code = await ensureAmbassadorCode(id);
    return { ...user, ambassadorCode: code };
  }

  return user;
};

export const getUserDetails = async (id: string) => {
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      role: true,
      avatarPath: true,
      loyaltyPoints: true,
      loyaltyTier: true,
      createdAt: true,
      termsAcceptedAt: true,
      marketingConsent: true,
      photoConsent: true,
      cardAllergies: true,
      cardConditions: true,
      cardPreferences: true,
      cardStaffNotes: true,
      appointments: {
        select: {
          id: true,
          date: true,
          status: true,
          notes: true,
          staffNote: true,
          createdAt: true,
          service: {
            select: {
              id: true,
              name: true,
              durationMinutes: true,
              price: true,
            },
          },
        },
        orderBy: { date: 'desc' },
      },
      loyaltyTransactions: {
        select: {
          id: true,
          points: true,
          type: true,
          description: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      },
    },
  });

  if (!user) {
    throw new AppError('Nie znaleziono uzytkownika', 404);
  }

  const now = new Date();
  const lastVisit =
    user.appointments.find((appointment) => appointment.status === 'COMPLETED' && new Date(appointment.date) < now) ??
    null;
  const upcoming = user.appointments.filter(
    (appointment) =>
      (appointment.status === 'PENDING' || appointment.status === 'CONFIRMED') &&
      new Date(appointment.date) >= now,
  );

  return {
    ...user,
    lastVisit,
    upcoming,
    allAppointments: user.appointments,
  };
};

export const getUserTimeline = async (userId: string, cursor?: string, limit = 20) => {
  const cursorDate = cursor ? new Date(cursor) : undefined;
  const dateFilter = cursorDate ? { lt: cursorDate } : undefined;

  const appointments = await prisma.appointment.findMany({
    where: {
      userId,
      status: 'COMPLETED',
      ...(dateFilter ? { date: dateFilter } : {}),
    },
    include: {
      service: { select: { name: true } },
      employee: { select: { name: true } },
      review: { select: { rating: true } },
    },
    orderBy: { date: 'desc' },
    take: limit + 1,
  });

  const appointmentPointsMap = new Map<string, number>();

  if (appointments.length > 0) {
    const earnTransactions = await prisma.loyaltyTransaction.findMany({
      where: {
        userId,
        type: 'EARN',
        OR: VISIT_POINTS_PREFIXES.map((prefix) => ({
          description: { startsWith: prefix },
        })),
      },
      select: {
        description: true,
        points: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    for (const transaction of earnTransactions) {
      const serviceName = extractVisitServiceName(transaction.description);
      if (!serviceName) continue;

      for (const appointment of appointments) {
        if (appointment.service.name === serviceName && !appointmentPointsMap.has(appointment.id)) {
          appointmentPointsMap.set(appointment.id, transaction.points);
          break;
        }
      }
    }
  }

  const visitItems = appointments.map((appointment) => ({
    type: 'visit' as const,
    date: appointment.date,
    data: {
      serviceName: appointment.service.name,
      employeeName: appointment.employee?.name ?? null,
      rating: appointment.review?.rating ?? null,
      pointsEarned: appointmentPointsMap.get(appointment.id) ?? null,
    },
  }));

  const achievements = await prisma.userAchievement.findMany({
    where: {
      userId,
      ...(dateFilter ? { earnedAt: dateFilter } : {}),
    },
    include: {
      achievement: {
        select: {
          name: true,
          icon: true,
          description: true,
          pointsBonus: true,
        },
      },
    },
    orderBy: { earnedAt: 'desc' },
    take: limit + 1,
  });

  const achievementItems = achievements.map((userAchievement) => ({
    type: 'achievement' as const,
    date: userAchievement.earnedAt,
    data: {
      name: userAchievement.achievement.name,
      icon: userAchievement.achievement.icon,
      description: userAchievement.achievement.description,
      pointsBonus: userAchievement.achievement.pointsBonus,
    },
  }));

  const manualTransactions = await prisma.loyaltyTransaction.findMany({
    where: {
      userId,
      type: 'MANUAL_ADJUST',
      ...(dateFilter ? { createdAt: dateFilter } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: limit + 1,
  });

  const loyaltyItems = manualTransactions.map((transaction) => ({
    type: 'loyalty' as const,
    date: transaction.createdAt,
    data: {
      description: transaction.description,
      points: transaction.points,
    },
  }));

  const allItems = [...visitItems, ...achievementItems, ...loyaltyItems].sort(
    (left, right) => right.date.getTime() - left.date.getTime(),
  );

  const hasMore = allItems.length > limit;
  const items = allItems.slice(0, limit);
  const nextCursor = hasMore && items.length > 0 ? items[items.length - 1].date.toISOString() : null;

  const [totalVisits, uniqueServicesResult, user] = await Promise.all([
    prisma.appointment.count({ where: { userId, status: 'COMPLETED' } }),
    prisma.appointment.findMany({
      where: { userId, status: 'COMPLETED' },
      select: { serviceId: true },
      distinct: ['serviceId'],
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { createdAt: true, loyaltyTier: true },
    }),
  ]);

  const monthsInCosmo = user
    ? Math.max(1, Math.floor((Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24 * 30)))
    : 0;

  return {
    items,
    stats: {
      totalVisits,
      uniqueServices: uniqueServicesResult.length,
      monthsInCosmo,
      tier: user?.loyaltyTier ?? 'BRONZE',
    },
    nextCursor,
  };
};

export const getMyReferrals = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      ambassadorCode: true,
      referralCount: true,
      referrals: {
        select: { id: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!user) throw new AppError('Użytkownik nie znaleziony', 404);

  const milestones = [
    { at: 5, reward: 'Odznaka Ambasadora' },
    { at: 10, reward: 'Specjalna nagroda lojalnościowa' },
    { at: 25, reward: 'VIP Ambasador' },
  ];

  const nextMilestone = milestones.find((m) => m.at > user.referralCount);

  return {
    ambassadorCode: user.ambassadorCode,
    count: user.referralCount,
    referrals: user.referrals.map((r) => ({ id: r.id, registeredAt: r.createdAt })),
    milestones,
    nextMilestone: nextMilestone ?? null,
    progressToNext: nextMilestone
      ? Math.round((user.referralCount / nextMilestone.at) * 100)
      : 100,
  };
};

export const updateUser = async (id: string, data: any) => {
  return prisma.user.update({
    where: { id },
    data,
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      role: true,
      avatarPath: true,
      loyaltyPoints: true,
      loyaltyTier: true,
      createdAt: true,
      ambassadorCode: true,
      referralCount: true,
      cardAllergies: true,
      cardConditions: true,
      cardPreferences: true,
      onboardingCompleted: true,
    },
  });
}

export const getPendingUsers = async () => {
  return prisma.user.findMany({
    where: { accountStatus: 'PENDING' },
    select: { id: true, name: true, email: true, phone: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  });
};

export const approveUser = async (id: string) => {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new AppError('Użytkownik nie istnieje', 404);
  if (user.accountStatus !== 'PENDING') throw new AppError('Konto nie jest w statusie oczekującym', 400);

  await prisma.user.update({ where: { id }, data: { accountStatus: 'ACTIVE' } });

  sendEmail(
    user.email,
    'Konto zatwierdzone — COSMO',
    `<p>Cześć ${user.name},</p><p>Twoje konto w aplikacji COSMO zostało zatwierdzone. Możesz się teraz zalogować.</p>`
  ).catch(err => console.warn('[WARN] approveUser: email send failed:', err.message));
};

export const rejectUser = async (id: string) => {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new AppError('Użytkownik nie istnieje', 404);
  if (user.accountStatus !== 'PENDING') throw new AppError('Konto nie jest w statusie oczekującym', 400);

  await prisma.user.update({ where: { id }, data: { accountStatus: 'REJECTED' } });
};

export const changeUserPassword = async (userId: string, currentPassword: string, newPassword: string) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError('Użytkownik nie istnieje', 404);

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) throw new AppError('Nieprawidłowe obecne hasło', 400);

  const newHash = await bcrypt.hash(newPassword, 10);
  const updated = await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: newHash, mustChangePassword: false },
    select: {
      id: true, email: true, name: true, phone: true, role: true,
      avatarPath: true, loyaltyPoints: true, loyaltyTier: true,
      createdAt: true, ambassadorCode: true, referralCount: true,
      termsAcceptedAt: true, marketingConsent: true, photoConsent: true,
      cardAllergies: true, cardConditions: true, cardPreferences: true,
      onboardingCompleted: true,
      accountStatus: true, mustChangePassword: true,
    },
  });
  return updated;
};;
