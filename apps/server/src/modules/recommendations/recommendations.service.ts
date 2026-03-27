import { prisma } from '../../config/prisma';
import { AppError } from '../../middleware/error.middleware';
import { getIO } from '../../socket';
import { createAndEmitNotification } from '../notifications/notifications.service';
import { sendPushToUser } from '../push/push.service';

export const addRecommendation = async (
  appointmentId: string,
  addedById: string,
  data: { name: string; brand?: string; description?: string; linkUrl?: string }
) => {
  const appointment = await prisma.appointment.findUnique({ where: { id: appointmentId } });
  if (!appointment) throw new AppError('Wizyta nie znaleziona', 404);

  const recommendation = await prisma.productRecommendation.create({
    data: {
      appointmentId,
      userId: appointment.userId,
      addedById,
      name: data.name,
      brand: data.brand,
      description: data.description,
      linkUrl: data.linkUrl,
    },
    include: { addedBy: { select: { name: true } } },
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

export const getMyRecommendations = async (userId: string) => {
  const recommendations = await prisma.productRecommendation.findMany({
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
      addedBy: { select: { name: true } },
    },
  });

  // Group by appointment
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
