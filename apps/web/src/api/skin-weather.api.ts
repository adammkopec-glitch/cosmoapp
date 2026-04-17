import { api } from '@/lib/axios';

export const skinWeatherApi = {
  getProfile: async () => {
    const res = await api.get('/skin-weather/profile');
    return res.data;
  },

  upsertProfile: async (data: {
    skinType: string;
    skinConcerns?: string[];
    locationLat: number;
    locationLng: number;
    cityName: string;
    notificationsEnabled?: boolean;
  }) => {
    const res = await api.put('/skin-weather/profile', data);
    return res.data;
  },

  getTodayReport: async () => {
    const res = await api.get('/skin-weather/report/today');
    return res.data;
  },

  getReportHistory: async (page = 1, limit = 10) => {
    const res = await api.get('/skin-weather/report/history', { params: { page, limit } });
    return res.data;
  },

  getRules: async () => {
    const res = await api.get('/skin-weather/rules');
    return res.data;
  },

  createRule: async (data: {
    label: string;
    recommendation: string;
    sortOrder?: number;
    isActive?: boolean;
    conditions?: string[];
    thresholds?: Record<string, { min: number; max: number }>;
  }) => {
    const res = await api.post('/skin-weather/rules', data);
    return res.data;
  },

  updateRule: async (
    id: string,
    data: {
      label?: string;
      recommendation?: string;
      sortOrder?: number;
      isActive?: boolean;
      conditions?: string[];
      thresholds?: Record<string, { min: number; max: number }>;
    },
  ) => {
    const res = await api.put(`/skin-weather/rules/${id}`, data);
    return res.data;
  },

  deleteRule: async (id: string) => {
    await api.delete(`/skin-weather/rules/${id}`);
  },

  updateLocation: async (data: { locationLat: number; locationLng: number; cityName: string }) => {
    await api.patch('/skin-weather/profile/location', data);
  },

  generateMyReport: async (force = false) => {
    const params = force ? { force: 'true' } : undefined;
    const res = await api.post('/skin-weather/report/generate', null, { params });
    return res.data;
  },

  generateAllReports: async () => {
    const res = await api.post('/skin-weather/generate-all');
    return res.data;
  },

  getSkinTypeAdvice: async (): Promise<Array<{ id: string; skinType: string; content: string; updatedAt: string }>> => {
    const res = await api.get('/skin-weather/skin-type-advice');
    return res.data;
  },

  updateSkinTypeAdvice: async (skinType: string, content: string) => {
    const res = await api.put(`/skin-weather/skin-type-advice/${skinType}`, { content });
    return res.data;
  },
};
