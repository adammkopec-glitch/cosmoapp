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

export const productsApi = {
  getAll: async (): Promise<Product[]> => {
    const res = await api.get('/products');
    return res.data.data.products;
  },
  create: async (formData: FormData): Promise<Product> => {
    const res = await api.post('/products', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data.data.product;
  },
  update: async (id: string, formData: FormData): Promise<Product> => {
    const res = await api.patch(`/products/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data.data.product;
  },
  updateStock: async (id: string, stock: number): Promise<Product> => {
    const res = await api.patch(`/products/${id}/stock`, { stock });
    return res.data.data.product;
  },
  remove: async (id: string): Promise<void> => {
    await api.delete(`/products/${id}`);
  },
};
