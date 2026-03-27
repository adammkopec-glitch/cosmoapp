import { prisma } from '../../config/prisma';
import { getIO } from '../../socket';
import { createAndEmitNotification } from '../notifications/notifications.service';

export const createLead = async (data: {
  name: string;
  email: string;
  phone: string;
  consentContact: boolean;
  consentData: boolean;
}) => {
  const lead = await prisma.consultationLead.create({ data });

  try {
    const io = getIO();
    const admins = await prisma.user.findMany({ where: { role: 'ADMIN' }, select: { id: true } });
    for (const admin of admins) {
      await createAndEmitNotification(io, {
        userId: admin.id,
        type: 'NEW_CONSULTATION',
        title: 'Nowe zapytanie konsultacyjne',
        body: `${lead.name} (${lead.phone})`,
        url: '/admin/konsultacje',
        emitToAdminGlobal: true,
      });
    }
  } catch (err) {
    console.error('Notification delivery failed (consultation):', err);
  }

  return lead;
};

export const getActiveLeads = async () => {
  return await prisma.consultationLead.findMany({
    where: { archived: false },
    orderBy: { createdAt: 'desc' },
  });
};

export const getArchivedLeads = async () => {
  return await prisma.consultationLead.findMany({
    where: { archived: true },
    orderBy: { contactedAt: 'desc' },
  });
};

export const markContacted = async (id: string) => {
  return await prisma.consultationLead.update({
    where: { id },
    data: { contacted: true, archived: true, contactedAt: new Date() },
  });
};

export const deleteLead = async (id: string) => {
  return await prisma.consultationLead.delete({ where: { id } });
};
