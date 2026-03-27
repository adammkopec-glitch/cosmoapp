// filepath: apps/server/src/modules/reviews/reviews.service.ts
import { prisma } from '../../config/prisma';
import { AppError } from '../../middleware/error.middleware';
import { checkAndAward } from '../achievements/achievements.service';
import { getIO } from '../../socket';

export const createReview = async (
  userId: string,
  data: { appointmentId: string; rating: number; comment?: string }
) => {
  if (!Number.isInteger(data.rating) || data.rating < 1 || data.rating > 5) {
    throw new AppError('Ocena musi być liczbą całkowitą od 1 do 5', 400);
  }

  const review = await prisma.$transaction(async (tx) => {
    const appointment = await tx.appointment.findUnique({
      where: { id: data.appointmentId },
      include: { review: true },
    });

    if (!appointment) {
      throw new AppError('Wizyta nie została znaleziona', 404);
    }

    if (appointment.userId !== userId) {
      throw new AppError('Ta wizyta nie należy do Ciebie', 403);
    }

    if (appointment.status !== 'COMPLETED') {
      throw new AppError('Można wystawić recenzję tylko po zakończonej wizycie', 400);
    }

    if (appointment.review) {
      throw new AppError('Recenzja dla tej wizyty już istnieje', 400);
    }

    const created = await tx.review.create({
      data: {
        rating: data.rating,
        comment: data.comment,
        userId,
        appointmentId: data.appointmentId,
        serviceId: appointment.serviceId,
      },
      include: {
        user: { select: { name: true } },
        service: { select: { name: true } },
      },
    });

    // Add 5 loyalty points for leaving a review
    const user = await tx.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError('Użytkownik nie istnieje', 404);

    await tx.loyaltyTransaction.create({
      data: {
        userId,
        points: 5,
        type: 'EARN',
        description: 'Punkty za recenzję',
      },
    });

    await tx.user.update({
      where: { id: userId },
      data: { loyaltyPoints: user.loyaltyPoints + 5 },
    });

    return created;
  });

  // Check and award achievements after review creation (outside transaction)
  try {
    const newAchievements = await checkAndAward(userId);
    if (newAchievements.length > 0) {
      const io = getIO();
      for (const achievement of newAchievements) {
        io.to(`user:${userId}`).emit('notification:achievement', {
          type: 'ACHIEVEMENT_EARNED',
          achievement: {
            name: achievement.name,
            description: achievement.description,
            icon: achievement.icon,
            pointsBonus: achievement.pointsBonus,
          },
        });
      }
    }
  } catch {
    // Achievement check is not critical
  }

  return review;
};

export const getServiceReviews = async (
  serviceId: string,
  page = 1,
  limit = 10
) => {
  const skip = (page - 1) * limit;

  const [reviews, total, aggregate] = await Promise.all([
    prisma.review.findMany({
      where: { serviceId, isVisible: true },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: {
        user: { select: { name: true } },
      },
    }),
    prisma.review.count({
      where: { serviceId, isVisible: true },
    }),
    prisma.review.aggregate({
      where: { serviceId, isVisible: true },
      _avg: { rating: true },
      _count: { rating: true },
    }),
  ]);

  return {
    reviews,
    total,
    page,
    totalPages: Math.ceil(total / limit),
    avgRating: aggregate._avg.rating ?? 0,
    reviewCount: aggregate._count.rating,
  };
};

export const getPendingReviews = async (userId: string) => {
  return await prisma.appointment.findMany({
    where: {
      userId,
      status: 'COMPLETED',
      review: { is: null },
    },
    orderBy: { date: 'desc' },
    include: {
      service: { select: { id: true, name: true } },
      employee: { select: { name: true } },
    },
  });
};

export const toggleVisibility = async (reviewId: string) => {
  const review = await prisma.review.findUnique({ where: { id: reviewId } });
  if (!review) throw new AppError('Recenzja nie została znaleziona', 404);

  return await prisma.review.update({
    where: { id: reviewId },
    data: { isVisible: !review.isVisible },
  });
};

export const getAllReviews = async (page = 1, limit = 10) => {
  const skip = (page - 1) * limit;

  const [reviews, total] = await Promise.all([
    prisma.review.findMany({
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: {
        user: { select: { name: true } },
        service: { select: { name: true } },
      },
    }),
    prisma.review.count(),
  ]);

  return {
    reviews,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
};
