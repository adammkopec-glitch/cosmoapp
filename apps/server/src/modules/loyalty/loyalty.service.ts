// filepath: apps/server/src/modules/loyalty/loyalty.service.ts
import { prisma } from '../../config/prisma';
import { AppError } from '../../middleware/error.middleware';
import { AdjustPointsInput, RedeemRewardInput } from '@cosmo/shared';
import { getIO } from '../../socket';
import { generateCode } from '../../utils/generateCode';
import { validateCode as validateDiscountCode } from '../discount-codes/discount-codes.service';
import { createAndEmitNotification } from '../notifications/notifications.service';

export const TIERS = {
  BRONZE: { min: 0, max: 29, discount: 0.05 },
  SILVER: { min: 30, max: 99, discount: 0.10 },
  GOLD: { min: 100, max: Infinity, discount: 0.15 },
} as const;

export const getTierForVisits = (visits: number): 'BRONZE' | 'SILVER' | 'GOLD' => {
  if (visits >= 100) return 'GOLD';
  if (visits >= 30) return 'SILVER';
  return 'BRONZE';
};

export const getUserStats = async (userId: string) => {
  const completedVisits = await prisma.appointment.count({
    where: { userId, status: 'COMPLETED' },
  });
  return { completedVisits };
};

export const updateUserTier = async (userId: string, tier: 'BRONZE' | 'SILVER' | 'GOLD') => {
  const user = await prisma.user.update({
    where: { id: userId },
    data: { loyaltyTier: tier }
  });
  return user.loyaltyTier;
};

export const getRewards = async () => {
  return await prisma.loyaltyReward.findMany({ 
    where: { isActive: true },
    include: { applicableServices: true }
  });
};

export const createReward = async (data: any) => {
  const { applicableServiceIds, description, discountValue, requiredTier, ...rest } = data;
  return await prisma.loyaltyReward.create({
    data: {
      ...rest,
      description: description || '',
      ...(requiredTier ? { requiredTier } : {}),
      ...(discountValue != null ? { discountValue } : {}),
      applicableServices: applicableServiceIds?.length > 0 && !rest.isForAllServices ? {
        connect: applicableServiceIds.map((id: string) => ({ id }))
      } : undefined
    },
    include: { applicableServices: true }
  });
};

export const deleteReward = async (id: string) => {
  return await prisma.loyaltyReward.update({
    where: { id },
    data: { isActive: false }
  });
};

export const getHistory = async (userId: string) => {
  return await prisma.loyaltyTransaction.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    include: { reward: true }
  });
};

export const adjustPoints = async (data: AdjustPointsInput) => {
  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({ where: { id: data.userId } });
    if (!user) throw new AppError('Użytkownik nie istnieje', 404);

    const newPoints = user.loyaltyPoints + data.points;
    if (newPoints < 0) throw new AppError('Użytkownik ma za mało punktów', 400);

    const transaction = await tx.loyaltyTransaction.create({
      data: {
        userId: user.id,
        points: data.points,
        type: data.type,
        description: data.description,
      }
    });

    await tx.user.update({
      where: { id: user.id },
      data: { loyaltyPoints: newPoints }
    });

    return { transaction, newPoints, userId: user.id };
  });

  // Emit socket notification after transaction (outside to avoid rollback on socket error)
  try {
    const io = getIO();
    if (data.points > 0) {
      await createAndEmitNotification(io, {
        userId: result.userId,
        type: 'LOYALTY_POINTS',
        title: 'Zdobyto punkty lojalnościowe',
        body: `+${data.points} punktów`,
        url: '/user/lojalnosc',
      });
    }
  } catch (err) {
    console.error('Notification delivery failed (loyalty):', err);
  }

  return result;
};

export const activateCoupon = async (userId: string, data: RedeemRewardInput) => {
  return await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({ where: { id: userId } });
    const reward = await tx.loyaltyReward.findUnique({ where: { id: data.rewardId } });

    if (!user) throw new AppError('Użytkownik nie istnieje', 404);
    if (!reward || !reward.isActive) throw new AppError('Nagroda niedostępna', 400);

    if (user.loyaltyPoints < reward.pointsCost) {
      throw new AppError('Za mało punktów aby aktywować kupon', 400);
    }

    const newPoints = user.loyaltyPoints - reward.pointsCost;

    await tx.loyaltyTransaction.create({
      data: {
        userId,
        points: -reward.pointsCost,
        type: 'REDEEM',
        description: `Aktywacja kuponu: ${reward.name}`,
        rewardId: reward.id
      }
    });

    await tx.user.update({
      where: { id: userId },
      data: { loyaltyPoints: newPoints }
    });

    return await tx.userCoupon.create({
      data: { userId, rewardId: reward.id, code: 'COSMO-' + generateCode(8) },
      include: { reward: true }
    });
  });
};

export const getActiveCoupons = async (userId: string) => {
  return await prisma.userCoupon.findMany({
    where: { userId, status: 'ACTIVE' },
    include: { reward: true },
    orderBy: { activatedAt: 'desc' },
  });
};

export const markCouponUsed = async (couponId: string, appointmentId?: string) => {
  const coupon = await prisma.userCoupon.findUnique({ where: { id: couponId } });
  if (!coupon || coupon.status !== 'ACTIVE') throw new AppError('Kupon niedostępny lub już użyty', 400);
  return await prisma.userCoupon.update({
    where: { id: couponId },
    data: { status: 'USED', usedAt: new Date(), ...(appointmentId ? { appointmentId } : {}) },
    include: { reward: true },
  });
};

export const validateVoucher = async (code: string, userId: string) => {
  const normalized = code.trim().toUpperCase();

  const coupon = await prisma.userCoupon.findFirst({
    where: { code: normalized, userId, status: 'ACTIVE' },
    include: { reward: true },
  });

  if (coupon) {
    if (coupon.reward.discountType === 'OTHER' || !coupon.reward.discountValue) {
      throw new AppError('Ten kupon jest nagrodą specjalną — użyj go przy rezerwacji bez wpisywania kodu', 400);
    }
    return {
      type: 'COUPON' as const,
      id: coupon.id,
      code: coupon.code!,
      discountType: coupon.reward.discountType as 'PERCENTAGE' | 'AMOUNT',
      discountValue: Number(coupon.reward.discountValue),
    };
  }

  const dc = await validateDiscountCode(normalized, userId);
  return { type: 'DISCOUNT_CODE' as const, ...dc };
};
