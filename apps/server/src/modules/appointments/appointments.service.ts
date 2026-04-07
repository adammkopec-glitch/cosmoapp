import { prisma } from '../../config/prisma';
import { addDays, differenceInCalendarDays, startOfDay } from 'date-fns';
import { markCouponUsed, getTierForVisits } from '../loyalty/loyalty.service';
import { getAvailability } from '../employees/employees.service';
import { AppError } from '../../middleware/error.middleware';
import { checkAndAward } from '../achievements/achievements.service';
import { getIO } from '../../socket';
import {
  advanceTreatmentSeriesAfterCompletion,
  attachAppointmentToSeries,
} from '../treatment-series/treatment-series.service';
import { createAndEmitNotification } from '../notifications/notifications.service';
import { sendPushToUser } from '../push/push.service';

const appointmentInclude = {
  service: true,
  employee: { select: { id: true, name: true, avatarPath: true } },
  coupon: { include: { reward: true } },
} as const;

const todayInclude = {
  service: { select: { id: true, name: true, durationMinutes: true, price: true } },
  employee: { select: { id: true, name: true } },
  user: {
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      loyaltyPoints: true,
      loyaltyTier: true,
      avatarPath: true,
      cardAllergies: true,
      cardConditions: true,
      cardPreferences: true,
      cardStaffNotes: true,
    },
  },
  coupon: { include: { reward: true } },
} as const;

export const getTodayAppointments = async (employeeId?: string) => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

  return prisma.appointment.findMany({
    where: {
      date: { gte: start, lte: end },
      ...(employeeId ? { employeeId } : {}),
    },
    include: todayInclude,
    orderBy: { date: 'asc' },
  });
};

export const updateStaffNote = async (id: string, staffNote: string) => {
  return prisma.appointment.update({
    where: { id },
    data: { staffNote },
    include: todayInclude,
  });
};

export const createAppointment = async (userId: string, data: any) => {
  const { couponId, discountCodeId, treatmentSeriesId, happyHourId, ...rest } = data;

  const appointment = await prisma.$transaction(async (tx) => {
    const created = await tx.appointment.create({
      data: {
        userId,
        serviceId: rest.serviceId,
        employeeId: rest.employeeId || null,
        date: new Date(rest.date),
        notes: rest.notes || null,
        allergies: rest.allergies || null,
        problemDescription: rest.problemDescription || null,
        ...(happyHourId ? { happyHourId } : {}),
      },
      include: appointmentInclude,
    });

    await attachAppointmentToSeries(tx, {
      appointmentId: created.id,
      userId,
      serviceId: rest.serviceId,
      explicitSeriesId: treatmentSeriesId ?? null,
    });

    return tx.appointment.findUniqueOrThrow({
      where: { id: created.id },
      include: appointmentInclude,
    });
  });

  if (couponId) {
    await markCouponUsed(couponId, appointment.id);
  }

  if (discountCodeId) {
    const code = await prisma.discountCode.findUnique({ where: { id: discountCodeId } });
    if (code && code.isActive && (!code.lockedToUserId || code.lockedToUserId === userId)) {
      const alreadyUsed = await prisma.discountCodeUsage.findUnique({
        where: { discountCodeId_userId: { discountCodeId, userId } },
      });
      if (!alreadyUsed) {
        await prisma.discountCodeUsage.create({
          data: { discountCodeId, userId, appointmentId: appointment.id },
        });
      }
    }
  }

  try {
    const io = getIO();
    const admins = await prisma.user.findMany({ where: { role: 'ADMIN' }, select: { id: true } });
    const client = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
    const clientName = client?.name ?? 'Klient';
    const serviceName = appointment.service?.name ?? 'Usługa';
    for (const admin of admins) {
      await createAndEmitNotification(io, {
        userId: admin.id,
        type: 'NEW_APPOINTMENT',
        title: 'Nowa rezerwacja',
        body: `${clientName} — ${serviceName}`,
        url: '/admin/wizyty',
        emitToAdminGlobal: true,
      });
    }
  } catch (err) {
    console.error('Notification delivery failed (createAppointment):', err);
  }

  return appointment;
};

export const uploadAppointmentPhoto = async (id: string, photoPath: string) => {
  return prisma.appointment.update({
    where: { id },
    data: { photoPath },
    include: appointmentInclude,
  });
};

export const getUserAppointments = async (userId: string) => {
  return prisma.appointment.findMany({
    where: { userId },
    orderBy: { date: 'asc' },
    include: appointmentInclude,
  });
};

export const getAllAppointments = async (filters?: {
  userId?: string;
  status?: string;
  page?: number;
  limit?: number;
}) => {
  const where: Record<string, unknown> = {};
  if (filters?.userId) where.userId = filters.userId;
  if (filters?.status) where.status = filters.status;

  const take = filters?.limit ?? undefined;
  const skip = take && filters?.page ? (filters.page - 1) * take : undefined;

  return prisma.appointment.findMany({
    where,
    orderBy: { date: 'desc' },
    take,
    skip,
    include: {
      ...appointmentInclude,
      user: { select: { id: true, name: true, email: true, phone: true } },
    },
  });
};

export const createAppointmentByAdmin = async (data: {
  clientName: string;
  clientPhone: string;
  clientEmail?: string;
  serviceId: string;
  employeeId?: string;
  date: string;
  notes?: string;
}) => {
  let user = null;

  if (data.clientEmail) {
    user = await prisma.user.findUnique({ where: { email: data.clientEmail } });
  }
  if (!user) {
    user = await prisma.user.findFirst({ where: { phone: data.clientPhone } });
  }
  if (!user) {
    const email = data.clientEmail || `${data.clientPhone}@noemail.cosmo`;
    user = await prisma.user.create({
      data: {
        name: data.clientName,
        phone: data.clientPhone,
        email,
        passwordHash: '!',
      },
    });
  }

  const result = await prisma.$transaction(async (tx) => {
    const appointment = await tx.appointment.create({
      data: {
        userId: user.id,
        serviceId: data.serviceId,
        employeeId: data.employeeId || null,
        date: new Date(data.date),
        notes: data.notes || null,
        status: 'CONFIRMED',
      },
      include: {
        service: true,
        employee: { select: { id: true, name: true, avatarPath: true } },
        user: { select: { name: true, email: true, phone: true } },
      },
    });

    await attachAppointmentToSeries(tx, {
      appointmentId: appointment.id,
      userId: user.id,
      serviceId: data.serviceId,
    });

    if (appointment.service) {
      const existingRoutine = await tx.homecareRoutine.findUnique({
        where: { appointmentId: appointment.id },
      });
      if (!existingRoutine) {
        await tx.homecareRoutine.create({
          data: {
            appointmentId: appointment.id,
            first48h: appointment.service.routineFirst48h ?? '',
            followingDays: appointment.service.routineFollowingDays ?? '',
            products: appointment.service.routineProducts ?? '',
          },
        });
      }
    }

    return tx.appointment.findUniqueOrThrow({
      where: { id: appointment.id },
      include: {
        service: true,
        employee: { select: { id: true, name: true, avatarPath: true } },
        user: { select: { name: true, email: true, phone: true } },
      },
    });
  });

  try {
    const io = getIO();
    const serviceName = result.service?.name ?? 'Usługa';
    const dateStr = result.date.toISOString().slice(0, 10);
    await createAndEmitNotification(io, {
      userId: user.id,
      type: 'APPOINTMENT_CONFIRMED',
      title: 'Wizyta potwierdzona',
      body: `Twoja wizyta: ${serviceName} — ${dateStr}`,
      url: '/user/wizyty',
    });
  } catch (err) {
    console.error('Notification delivery failed (createAppointmentByAdmin):', err);
  }

  return result;
};

export const deleteAppointment = async (id: string) => {
  return prisma.appointment.delete({ where: { id } });
};

export const requestReschedule = async (id: string, userId: string, newDate: string) => {
  const appointment = await prisma.appointment.findUnique({
    where: { id },
    include: appointmentInclude,
  });

  if (!appointment) throw new AppError('Wizyta nie istnieje', 404);
  if (appointment.userId !== userId) throw new AppError('Brak dostepu', 403);
  if (appointment.status !== 'PENDING' && appointment.status !== 'CONFIRMED') {
    throw new AppError('Zmiana terminu jest mozliwa tylko dla aktywnych wizyt', 400);
  }
  if (appointment.rescheduleStatus === 'PENDING') {
    throw new AppError('Wniosek o zmiane terminu juz czeka na decyzje', 400);
  }

  const date = new Date(newDate);
  if (isNaN(date.getTime()) || date <= new Date()) {
    throw new AppError('Nieprawidlowa data - musi byc w przyszlosci', 400);
  }

  const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const timeStr = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  const slots = await getAvailability(dateStr, appointment.serviceId, appointment.employeeId ?? undefined);
  const slot = slots.find((entry) => entry.time === timeStr);
  if (!slot || !slot.available) {
    throw new AppError('Wybrany slot jest niedostepny', 400);
  }

  return prisma.appointment.update({
    where: { id },
    data: { rescheduleDate: date, rescheduleStatus: 'PENDING' },
    include: appointmentInclude,
  });
};

export const approveReschedule = async (id: string) => {
  const appointment = await prisma.appointment.findUnique({ where: { id } });
  if (!appointment) throw new AppError('Wizyta nie istnieje', 404);
  if (appointment.rescheduleStatus !== 'PENDING') {
    throw new AppError('Brak oczekujacego wniosku o zmiane terminu', 400);
  }

  const updated = await prisma.appointment.update({
    where: { id },
    data: { date: appointment.rescheduleDate!, rescheduleDate: null, rescheduleStatus: null },
    include: {
      ...appointmentInclude,
      user: { select: { id: true, name: true, email: true, phone: true } },
    },
  });

  try {
    const io = getIO();
    await createAndEmitNotification(io, {
      userId: updated.user.id,
      type: 'APPOINTMENT_RESCHEDULED',
      title: 'Wizyta przełożona',
      body: `Twoja wizyta została zatwierdzona na nowy termin`,
      url: '/user/wizyty',
    });
    await sendPushToUser(updated.user.id, {
      title: 'Wizyta przełożona',
      body: 'Twoja wizyta została zatwierdzona na nowy termin',
      url: '/user/wizyty',
    });
  } catch (err) {
    console.error('Notification delivery failed (approveReschedule):', err);
  }

  return updated;
};

export const rejectReschedule = async (id: string) => {
  const appointment = await prisma.appointment.findUnique({ where: { id } });
  if (!appointment) throw new AppError('Wizyta nie istnieje', 404);
  if (appointment.rescheduleStatus !== 'PENDING') {
    throw new AppError('Brak oczekujacego wniosku o zmiane terminu', 400);
  }

  const updated = await prisma.appointment.update({
    where: { id },
    data: { rescheduleDate: null, rescheduleStatus: null },
    include: {
      ...appointmentInclude,
      user: { select: { id: true, name: true, email: true, phone: true } },
    },
  });

  try {
    const io = getIO();
    await createAndEmitNotification(io, {
      userId: appointment.userId,
      type: 'GENERIC',
      title: 'Zmiana terminu odrzucona',
      body: 'Twoja prośba o zmianę terminu wizyty została odrzucona. Wizyta odbywa się w pierwotnym terminie.',
      url: '/user/wizyty',
    });
  } catch (err) {
    console.error('Notification delivery failed (rejectReschedule):', err);
  }

  return updated;
};

export const updateStatus = async (
  id: string,
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED',
) => {
  const result = await prisma.$transaction(async (tx) => {
    const existing = await tx.appointment.findUnique({
      where: { id },
      include: { service: true, user: true, employee: { select: { id: true, name: true } } },
    });

    if (!existing) {
      throw new AppError('Wizyta nie istnieje', 404);
    }

    if (existing.status === 'COMPLETED' && status !== 'COMPLETED') {
      throw new AppError('Nie mozna cofnac zakonczonej wizyty', 400);
    }

    const appointment = await tx.appointment.update({
      where: { id },
      data: {
        status,
        ...(status === 'COMPLETED' && existing.status !== 'COMPLETED'
          ? { completedAt: new Date() }
          : {}),
      },
      include: { service: true, user: true, employee: { select: { id: true, name: true } } },
    });

    let tierChanged = false;
    let routineAutoSent = false;

    // When transitioning to CONFIRMED: create homecare routine draft from service template
    if (status === 'CONFIRMED' && existing.status !== 'CONFIRMED' && appointment.service) {
      const existingRoutine = await tx.homecareRoutine.findUnique({
        where: { appointmentId: appointment.id },
      });
      if (!existingRoutine) {
        await tx.homecareRoutine.create({
          data: {
            appointmentId: appointment.id,
            first48h: appointment.service.routineFirst48h ?? '',
            followingDays: appointment.service.routineFollowingDays ?? '',
            products: appointment.service.routineProducts ?? '',
          },
        });
      }
    }

    if (status === 'COMPLETED' && existing.status !== 'COMPLETED' && appointment.service) {
      await advanceTreatmentSeriesAfterCompletion(tx, appointment.id);

      const points = Math.floor(Number(appointment.service.price));

      await tx.loyaltyTransaction.create({
        data: {
          userId: appointment.user.id,
          points,
          type: 'EARN',
          description: `Punkty za wizyte: ${appointment.service.name}`,
        },
      });

      const completedVisits = await tx.appointment.count({
        where: { userId: appointment.user.id, status: 'COMPLETED' },
      });

      const newTier = getTierForVisits(completedVisits);
      if (newTier !== existing.user.loyaltyTier) {
        tierChanged = true;
      }

      await tx.user.update({
        where: { id: appointment.user.id },
        data: { loyaltyPoints: { increment: points }, loyaltyTier: newTier },
      });

      // Find existing routine and mark as sent if not already sent
      const existingRoutine = await tx.homecareRoutine.findUnique({
        where: { appointmentId: appointment.id },
      });
      if (existingRoutine && !existingRoutine.sentAt) {
        await tx.homecareRoutine.update({
          where: { appointmentId: appointment.id },
          data: { sentAt: new Date() },
        });
        routineAutoSent = true;
      }
    }

    return {
      appointment,
      wasNewlyCompleted: status === 'COMPLETED' && existing.status !== 'COMPLETED',
      tierChanged,
      routineAutoSent,
    };
  });

  if (result.wasNewlyCompleted) {
    try {
      const newAchievements = await checkAndAward(result.appointment.user.id);
      if (newAchievements.length > 0) {
        const io = getIO();
        for (const achievement of newAchievements) {
          io.to(`user:${result.appointment.user.id}`).emit('notification:achievement', {
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
      // Achievement refresh should not fail the main flow.
    }
  }

  if (result.routineAutoSent) {
    try {
      const io = getIO();
      const apt = result.appointment;
      const serviceName = apt.service?.name ?? 'Usługa';
      await createAndEmitNotification(io, {
        userId: apt.user.id,
        type: 'GENERIC',
        title: 'Twoja rutyna pielęgnacyjna jest gotowa 💆‍♀️',
        body: `Sprawdź co robić po zabiegu: ${serviceName}`,
        url: '/user/rutyna',
      });
      await sendPushToUser(apt.user.id, {
        title: 'Twoja rutyna pielęgnacyjna jest gotowa 💆‍♀️',
        body: `Sprawdź co robić po zabiegu: ${serviceName}`,
        url: '/user/rutyna',
      });
    } catch (err) {
      console.error('Notification delivery failed (routineAutoSent):', err);
    }
  }

  try {
    const io = getIO();
    const apt = result.appointment;
    const dateStr = apt.date.toISOString().slice(0, 10);
    const serviceName = apt.service?.name ?? 'Usługa';
    if (status === 'CONFIRMED') {
      await createAndEmitNotification(io, {
        userId: apt.user.id,
        type: 'APPOINTMENT_CONFIRMED',
        title: 'Wizyta potwierdzona',
        body: `Twoja wizyta: ${serviceName} — ${dateStr}`,
        url: '/user/wizyty',
      });
      await sendPushToUser(apt.user.id, {
        title: 'Wizyta potwierdzona',
        body: `Twoja wizyta na ${serviceName} została potwierdzona`,
        url: '/user/wizyty',
      });
    } else if (status === 'CANCELLED') {
      await createAndEmitNotification(io, {
        userId: apt.user.id,
        type: 'APPOINTMENT_CANCELLED',
        title: 'Wizyta odwołana',
        body: `Twoja wizyta: ${serviceName} — ${dateStr}`,
        url: '/user/wizyty',
      });
      await sendPushToUser(apt.user.id, {
        title: 'Wizyta odwołana',
        body: `Twoja wizyta na ${serviceName} została odwołana`,
        url: '/user/wizyty',
      });
    }
    if (result.tierChanged) {
      await createAndEmitNotification(io, {
        userId: apt.user.id,
        type: 'LOYALTY_TIER_UP',
        title: 'Nowy poziom lojalności!',
        body: 'Gratulacje! Osiągnąłeś nowy poziom w programie lojalnościowym.',
        url: '/user/lojalnosc',
      });
    }
  } catch (err) {
    console.error('Notification delivery failed (updateStatus):', err);
  }

  return result.appointment;
};

export interface FollowUpReminder {
  serviceId: string;
  serviceName: string;
  serviceSlug: string;
  lastVisitDate: string;
  recommendedReturnDate: string;
  daysOverdue: number;
}

interface CompletedAptForReminder {
  serviceId: string;
  serviceName: string;
  serviceSlug: string;
  lastVisitDate: Date;
  recommendedIntervalDays: number;
}

// Pure calculation — exported for unit testing.
// Uses date-fns for DST-safe calendar-day arithmetic.
export function computeFollowUpReminders(
  apts: CompletedAptForReminder[],
  today: Date
): FollowUpReminder[] {
  const todayDay = startOfDay(today);

  return apts
    .map((apt) => {
      const lastVisit = startOfDay(apt.lastVisitDate);
      const triggerDays = Math.floor(apt.recommendedIntervalDays * 0.85);
      const triggerDate = addDays(lastVisit, triggerDays);
      const recommendedReturnDate = addDays(lastVisit, apt.recommendedIntervalDays);

      if (todayDay < triggerDate) return null;

      const daysOverdue = differenceInCalendarDays(todayDay, recommendedReturnDate);

      return {
        serviceId: apt.serviceId,
        serviceName: apt.serviceName,
        serviceSlug: apt.serviceSlug,
        lastVisitDate: apt.lastVisitDate.toISOString(),
        recommendedReturnDate: recommendedReturnDate.toISOString(),
        daysOverdue,
      } satisfies FollowUpReminder;
    })
    .filter((r): r is FollowUpReminder => r !== null)
    .sort((a, b) => b.daysOverdue - a.daysOverdue);
}

export const getFollowUpReminders = async (userId: string): Promise<FollowUpReminder[]> => {
  const appointments = await prisma.appointment.findMany({
    where: {
      userId,
      status: 'COMPLETED',
      service: { recommendedIntervalDays: { not: null } },
    },
    include: {
      service: {
        select: { id: true, name: true, slug: true, recommendedIntervalDays: true },
      },
    },
    orderBy: { date: 'desc' },
  });

  // Keep only the most recent appointment per serviceId
  const latestByService = new Map<string, typeof appointments[number]>();
  for (const apt of appointments) {
    if (!latestByService.has(apt.serviceId)) {
      latestByService.set(apt.serviceId, apt);
    }
  }

  const input: CompletedAptForReminder[] = [...latestByService.values()].map((apt) => ({
    serviceId: apt.service.id,
    serviceName: apt.service.name,
    serviceSlug: apt.service.slug,
    lastVisitDate: new Date(apt.date),
    recommendedIntervalDays: apt.service.recommendedIntervalDays!,
  }));

  return computeFollowUpReminders(input, new Date());
};
