// filepath: apps/web/src/api/services.api.ts
import { api } from '../lib/axios';
import type { Service } from '@cosmo/shared';

export const servicesApi = {
  getAll: async (): Promise<Service[]> => {
    const res = await api.get('/services');
    return res.data.data.services;
  },
  getOne: async (slug: string) => {
    const res = await api.get(`/services/${slug}`);
    return res.data.data.service;
  },
  create: async (formData: FormData) => {
    const res = await api.post('/services', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return res.data.data.service;
  },
  update: async (id: string, formData: FormData) => {
    const res = await api.put(`/services/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return res.data.data.service;
  },
  remove: async (id: string) => {
    await api.delete(`/services/${id}`);
  },
  uploadImage: async (file: File) => {
    const formData = new FormData();
    formData.append('image', file);
    const res = await api.post('/services/upload-image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data.url as string;
  },
};
