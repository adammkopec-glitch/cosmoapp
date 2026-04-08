import { api } from '../lib/axios';

export interface FollowUpReminder {
  serviceId: string;
  serviceName: string;
  serviceSlug: string;
  lastVisitDate: string;
  recommendedReturnDate: string;
  daysOverdue: number;
}

export const appointmentsApi = {
  getMy: async () => {
    const res = await api.get('/appointments/me');
    return res.data.data.appointments;
  },
  getAll: async (params?: {
    userId?: string;
    status?: string;
    page?: number;
    limit?: number;
  } | unknown) => {
    // Handle both React Query context and custom params
    // React Query passes { queryKey, signal, meta, ... } but we only care about our custom params
    const queryParams = params && typeof params === 'object' && !('queryKey' in params) && !('signal' in params)
      ? params
      : undefined;
    const res = await api.get('/appointments', { params: queryParams });
    return res.data.data.appointments;
  },
  create: async (data: {
    serviceId: string;
    treatmentSeriesId?: string | null;
    date: string;
    employeeId?: string | null;
    notes?: string;
    allergies?: string;
    problemDescription?: string;
    couponId?: string | null;
    discountCodeId?: string | null;
  }) => {
    const res = await api.post('/appointments', data);
    return res.data.data.appointment;
  },
  uploadPhoto: async (id: string, file: File) => {
    const formData = new FormData();
    formData.append('photo', file);
    const res = await api.post(`/appointments/${id}/photo`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data.data.appointment;
  },
  updateStatus: async (id: string, status: string) => {
    const res = await api.patch(`/appointments/${id}/status`, { status });
    return res.data.data.appointment;
  },
  createAdmin: async (data: {
    clientName: string;
    clientPhone: string;
    clientEmail?: string;
    serviceId: string;
    employeeId?: string;
    date: string;
    notes?: string;
  }) => {
    const res = await api.post('/appointments/admin', data);
    return res.data.data.appointment;
  },
  remove: async (id: string) => {
    await api.delete(`/appointments/${id}`);
  },
  getToday: async (employeeId?: string) => {
    const params = employeeId ? { employeeId } : {};
    const res = await api.get('/appointments/today', { params });
    return res.data.data.appointments;
  },
  updateStaffNote: async (id: string, staffNote: string) => {
    const res = await api.patch(`/appointments/${id}/staff-note`, { staffNote });
    return res.data.data.appointment;
  },
  requestReschedule: async (id: string, date: string) => {
    const res = await api.post(`/appointments/${id}/reschedule`, { date });
    return res.data.data.appointment;
  },
  approveReschedule: async (id: string) => {
    const res = await api.patch(`/appointments/${id}/reschedule/approve`);
    return res.data.data.appointment;
  },
  rejectReschedule: async (id: string) => {
    const res = await api.patch(`/appointments/${id}/reschedule/reject`);
    return res.data.data.appointment;
  },
  getFollowUpReminders: async (): Promise<FollowUpReminder[]> => {
    const res = await api.get('/appointments/follow-up-reminders');
    return res.data.data.reminders;
  },
};
