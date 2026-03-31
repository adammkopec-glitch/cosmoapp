// filepath: apps/web/src/api/blog.api.ts
import { api } from '../lib/axios';

export const blogApi = {
  getAll: async () => {
    const res = await api.get('/blog');
    return res.data.data.posts;
  },
  getOne: async (slug: string) => {
    const res = await api.get(`/blog/${slug}`);
    return res.data.data.post;
  },
  create: async (formData: FormData) => {
    const res = await api.post('/blog', formData);
    return res.data.data.post;
  },
  update: async (id: string, formData: FormData) => {
    const res = await api.put(`/blog/${id}`, formData);
    return res.data.data.post;
  },
  remove: async (id: string) => {
    await api.delete(`/blog/${id}`);
  },
  uploadImage: async (file: File) => {
    const fd = new FormData();
    fd.append('image', file);
    const res = await api.post('/blog/upload-image', fd);
    return res.data.data.url as string;
  },

  // Comments
  getComments: async (slug: string) => {
    const res = await api.get(`/blog-comments/${slug}`);
    return res.data.data.comments as any[];
  },
  addComment: async (slug: string, data: { content: string; parentId?: string; image?: File }) => {
    const fd = new FormData();
    fd.append('content', data.content);
    if (data.parentId) fd.append('parentId', data.parentId);
    if (data.image) fd.append('image', data.image);
    const res = await api.post(`/blog-comments/${slug}`, fd);
    return res.data.data.comment;
  },
  deleteComment: async (id: string) => {
    await api.delete(`/blog-comments/${id}`);
  },
  moderateComment: async (id: string, data: { isHidden?: boolean; isSpam?: boolean }) => {
    const res = await api.patch(`/blog-comments/${id}/moderate`, data);
    return res.data.data.comment;
  },
  reactToComment: async (id: string, emoji: string) => {
    const res = await api.post(`/blog-comments/${id}/react`, { emoji });
    return res.data.data.reaction;
  },
};
