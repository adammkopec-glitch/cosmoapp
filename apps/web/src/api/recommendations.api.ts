import { api } from '../lib/axios';

export type Product = {
  id: string;
  name: string;
  brand: string | null;
  description: string | null;
  price: number;
  stock: number;
  imagePath: string | null;
  isActive: boolean;
};

export type AppointmentRecommendation = {
  id: string;
  name: string;
  comment: string | null;
  pickedUp: boolean;
  pickedUpAt: string | null;
  product: Product | null;
  addedBy: { name: string };
  createdAt: string;
};

export type RecommendationGroup = {
  appointmentId: string;
  appointmentDate: string;
  serviceName: string;
  recommendations: AppointmentRecommendation[];
};

export const recommendationsApi = {
  getMy: async (): Promise<RecommendationGroup[]> => {
    const res = await api.get('/users/me/recommendations');
    return res.data.data.groups;
  },
  add: async (
    appointmentId: string,
    data: { productId?: string; name: string; comment?: string }
  ): Promise<AppointmentRecommendation> => {
    const res = await api.post(`/appointments/${appointmentId}/recommendations`, data);
    return res.data.data.recommendation;
  },
  remove: async (appointmentId: string, recId: string): Promise<void> => {
    await api.delete(`/appointments/${appointmentId}/recommendations/${recId}`);
  },
  markPickedUp: async (appointmentId: string, recId: string): Promise<AppointmentRecommendation> => {
    const res = await api.patch(`/appointments/${appointmentId}/recommendations/${recId}/pickup`);
    return res.data.data.recommendation;
  },
  getForAppointment: async (appointmentId: string): Promise<AppointmentRecommendation[]> => {
    const res = await api.get(`/appointments/${appointmentId}/recommendations`);
    return res.data.data.recommendations;
  },
  getByUser: async (userId: string): Promise<RecommendationGroup[]> => {
    const res = await api.get(`/users/${userId}/recommendations`);
    return res.data.data.groups;
  },
};
