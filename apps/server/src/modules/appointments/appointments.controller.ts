import { Request, Response, NextFunction } from 'express';
import * as appointmentsService from './appointments.service';
import { processAndSaveImage } from '../../utils/imageProcessor';
import { AppError } from '../../middleware/error.middleware';
import { getIO } from '../../socket';
import { sendPushToAdmins } from '../push/push.service';
import { format } from 'date-fns';

export const create = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const appointment = await appointmentsService.createAppointment(req.user!.id, req.body);
    getIO().to('admin:global').emit('appointment:created', appointment as Record<string, unknown>);
    getIO().to('employee:global').emit('appointment:created', appointment as Record<string, unknown>);
    const appt = appointment as any;
    sendPushToAdmins({
      title: 'Nowa wizyta',
      body: `${appt.user?.name ?? ''} — ${appt.service?.name ?? ''}, ${format(new Date(appt.date), 'HH:mm')}`,
      url: '/admin/wizyty',
    }).catch(() => {});
    res.status(201).json({ status: 'success', data: { appointment } });
  } catch (error) {
    next(error);
  }
};

export const uploadPhoto = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) throw new AppError('Brak pliku zdjęcia', 400);
    const photoPath = await processAndSaveImage(req.file.buffer, 'appointments');
    const appointment = await appointmentsService.uploadAppointmentPhoto(req.params.id, photoPath);
    res.json({ status: 'success', data: { appointment } });
  } catch (error) {
    next(error);
  }
};

export const getMy = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const appointments = await appointmentsService.getUserAppointments(req.user!.id);
    res.status(200).json({ status: 'success', data: { appointments } });
  } catch (error) {
    next(error);
  }
};

export const getAll = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, status, page, limit } = req.query as Record<string, string | undefined>;
    const appointments = await appointmentsService.getAllAppointments({
      userId,
      status,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
    res.status(200).json({ status: 'success', data: { appointments } });
  } catch (error) {
    next(error);
  }
};

export const createAdmin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const appointment = await appointmentsService.createAppointmentByAdmin(req.body);
    getIO().to('admin:global').emit('appointment:created', appointment as Record<string, unknown>);
    getIO().to(`user:${(appointment as any).userId}`).emit('appointment:created', appointment as Record<string, unknown>);
    getIO().to('employee:global').emit('appointment:created', appointment as Record<string, unknown>);
    const appt = appointment as any;
    sendPushToAdmins({
      title: 'Nowa wizyta (admin)',
      body: `${appt.user?.name ?? ''} — ${appt.service?.name ?? ''}, ${format(new Date(appt.date), 'HH:mm')}`,
      url: '/admin/wizyty',
    }).catch(() => {});
    res.status(201).json({ status: 'success', data: { appointment } });
  } catch (error) {
    next(error);
  }
};

export const remove = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const deleted = await appointmentsService.deleteAppointment(req.params.id);
    getIO().to('admin:global').emit('appointment:deleted', req.params.id);
    getIO().to(`user:${deleted.userId}`).emit('appointment:deleted', req.params.id);
    getIO().to('employee:global').emit('appointment:deleted', req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

export const updateStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status } = req.body;
    const appointment = await appointmentsService.updateStatus(req.params.id, status);
    getIO().to('admin:global').emit('appointment:updated', appointment as Record<string, unknown>);
    getIO().to(`user:${(appointment as any).userId}`).emit('appointment:updated', appointment as Record<string, unknown>);
    getIO().to('employee:global').emit('appointment:updated', appointment as Record<string, unknown>);
    const appt = appointment as any;
    sendPushToAdmins({
      title: 'Wizyta zaktualizowana',
      body: `${appt.user?.name ?? ''} — ${appt.service?.name ?? ''} → ${status}`,
      url: '/admin/wizyty',
    }).catch(() => {});
    res.status(200).json({ status: 'success', data: { appointment } });
  } catch (error) {
    next(error);
  }
};

export const getToday = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { employeeId } = req.query;
    const appointments = await appointmentsService.getTodayAppointments(employeeId as string | undefined);
    res.json({ status: 'success', data: { appointments } });
  } catch (error) {
    next(error);
  }
};

export const updateStaffNote = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const appointment = await appointmentsService.updateStaffNote(req.params.id, req.body.staffNote ?? '');
    getIO().to('admin:global').emit('appointment:updated', appointment as Record<string, unknown>);
    getIO().to(`user:${(appointment as any).userId}`).emit('appointment:updated', appointment as Record<string, unknown>);
    getIO().to('employee:global').emit('appointment:updated', appointment as Record<string, unknown>);
    res.json({ status: 'success', data: { appointment } });
  } catch (error) {
    next(error);
  }
};

export const requestReschedule = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const appointment = await appointmentsService.requestReschedule(req.params.id, req.user!.id, req.body.date);
    getIO().to('admin:global').emit('appointment:updated', appointment as Record<string, unknown>);
    getIO().to('employee:global').emit('appointment:updated', appointment as Record<string, unknown>);
    res.json({ status: 'success', data: { appointment } });
  } catch (error) {
    next(error);
  }
};

export const approveReschedule = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const appointment = await appointmentsService.approveReschedule(req.params.id);
    getIO().to('admin:global').emit('appointment:updated', appointment as Record<string, unknown>);
    getIO().to(`user:${(appointment as any).userId}`).emit('appointment:updated', appointment as Record<string, unknown>);
    res.json({ status: 'success', data: { appointment } });
  } catch (error) {
    next(error);
  }
};

export const rejectReschedule = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const appointment = await appointmentsService.rejectReschedule(req.params.id);
    getIO().to('admin:global').emit('appointment:updated', appointment as Record<string, unknown>);
    getIO().to(`user:${(appointment as any).userId}`).emit('appointment:updated', appointment as Record<string, unknown>);
    res.json({ status: 'success', data: { appointment } });
  } catch (error) {
    next(error);
  }
};

export const getFollowUpReminders = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const reminders = await appointmentsService.getFollowUpReminders(req.user!.id);
    res.json({ status: 'success', data: { reminders } });
  } catch (err) {
    next(err);
  }
};
