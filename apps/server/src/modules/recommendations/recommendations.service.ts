import { prisma } from '../../config/prisma';
import { AppError } from '../../middleware/error.middleware';
import { getIO } from '../../socket';
import { createAndEmitNotification } from '../notifications/notifications.service';
import { sendPushToUser } from '../push/push.service';

export const addRecommendation = async (
  appointmentId: string,
  addedById: string,
  data: { productId?: string; name: string; comment?: string }
) => {
  const appointment = await prisma.appointment.findUnique({ where: { id: appointmentId } });
  if (!appointment) throw new AppError('Wizyta nie znaleziona', 404);

  const recommendation = await prisma.appointmentRecommendation.create({
    data: {
      appointmentId,
      userId: appointment.userId,
      addedById,
      productId: data.productId ?? null,
      name: data.name,
      comment: data.comment,
    },
    include: { addedBy: { select: { name: true } }, product: true },
  });

  try {
    const io = getIO();
    await createAndEmitNotification(io, {
      userId: appointment.userId,
      type: 'RECOMMENDATION_ADDED',
      title: 'Nowa rekomendacja produktu',
      body: `Kosmetolog polecił/a: ${recommendation.name}`,
      url: '/user/produkty',
    });
    await sendPushToUser(appointment.userId, {
      title: 'Nowa rekomendacja',
      body: `Kosmetolog polecił/a produkt: ${recommendation.name}`,
      url: '/user/produkty',
    });
  } catch (err) {
    console.error('Notification delivery failed (recommendation):', err);
  }

  return recommendation;
};

export const deleteRecommendation = async (
  recId: string,
  requesterId: string,
  requesterRole: string
) => {
  const rec = await prisma.appointmentRecommendation.findUnique({ where: { id: recId } });
  if (!rec) throw new AppError('Rekomendacja nie znaleziona', 404);

  const isOwner = rec.userId === requesterId;
  const isStaff = requesterRole === 'ADMIN' || requesterRole === 'EMPLOYEE';

  if (!isOwner && !isStaff) {
    throw new AppError('Brak uprawnień', 403);
  }

  return prisma.appointmentRecommendation.delete({ where: { id: recId } });
};

export const markPickedUp = async (recId: string) => {
  const rec = await prisma.appointmentRecommendation.findUnique({ where: { id: recId } });
  if (!rec) throw new AppError('Rekomendacja nie znaleziona', 404);
  if (rec.pickedUp) throw new AppError('Rekomendacja już odebrana', 400);

  if (rec.productId) {
    const product = await prisma.product.findUnique({ where: { id: rec.productId } });
    const [updated] = await prisma.$transaction([
      prisma.appointmentRecommendation.update({
        where: { id: recId },
        data: { pickedUp: true, pickedUpAt: new Date() },
        include: { product: true, addedBy: { select: { name: true } } },
      }),
      ...(product && product.stock > 0
        ? [prisma.product.update({ where: { id: rec.productId }, data: { stock: { decrement: 1 } } })]
        : []),
    ]);
    return updated;
  }

  return prisma.appointmentRecommendation.update({
    where: { id: recId },
    data: { pickedUp: true, pickedUpAt: new Date() },
    include: { product: true, addedBy: { select: { name: true } } },
  });
};

export const getForAppointment = async (appointmentId: string) => {
  return prisma.appointmentRecommendation.findMany({
    where: { appointmentId },
    orderBy: { createdAt: 'asc' },
    include: {
      product: true,
      addedBy: { select: { name: true } },
    },
  });
};

export const getMyRecommendations = async (userId: string) => {
  const recommendations = await prisma.appointmentRecommendation.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    include: {
      appointment: {
        select: {
          id: true,
          date: true,
          service: { select: { name: true } },
        },
      },
      product: true,
      addedBy: { select: { name: true } },
    },
  });

  const grouped: Record<string, {
    appointmentId: string;
    appointmentDate: string;
    serviceName: string;
    recommendations: typeof recommendations;
  }> = {};

  for (const rec of recommendations) {
    const key = rec.appointmentId;
    if (!grouped[key]) {
      grouped[key] = {
        appointmentId: rec.appointment.id,
        appointmentDate: rec.appointment.date.toISOString(),
        serviceName: rec.appointment.service.name,
        recommendations: [],
      };
    }
    grouped[key].recommendations.push(rec);
  }

  return Object.values(grouped);
};
