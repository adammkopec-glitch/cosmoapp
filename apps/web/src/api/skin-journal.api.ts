import { api } from '../lib/axios';

export type SkinJournalComment = {
  id: string;
  authorId: string;
  author: { id: string; name: string };
  content: string;
  readAt: string | null;
  createdAt: string;
};

export type SkinJournalEntry = {
  id: string;
  userId: string;
  authorId: string | null;
  author: { id: string; name: string } | null;
  isAdminEntry: boolean;
  date: string;
  mood: number | null;
  notes: string | null;
  photoPath: string | null;
  linkedAppointmentId: string | null;
  tags: string[];
  comments: SkinJournalComment[];
  _count?: { comments: number };
  createdAt: string;
  updatedAt: string;
};

export type JournalPage = {
  entries: SkinJournalEntry[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export type JournalSummary = {
  mood: {
    average: number | null;
    trend: 'rising' | 'falling' | 'stable' | null;
    byWeek: { week: string; avg: number }[];
    distribution: { mood: number; count: number }[];
  };
  tags: { tag: string; count: number }[];
  activity: {
    totalEntries: number;
    activeDays: number;
    totalDays: number;
    currentStreak: number;
    longestStreak: number;
    afterAppointments: number;
  };
  photos: {
    total: number;
    paths: string[];
  };
  range: { from: string; to: string };
};

const BASE = '/skin-journal';

export const skinJournalApi = {
  getJournal: async (page = 1): Promise<JournalPage> => {
    const res = await api.get(BASE, { params: { page } });
    return res.data.data;
  },

  createEntry: async (formData: FormData): Promise<SkinJournalEntry> => {
    const res = await api.post(BASE, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data.data.entry;
  },

  updateEntry: async (
    id: string,
    data: Partial<{ mood: number; notes: string; tags: string[] }>,
  ): Promise<SkinJournalEntry> => {
    const res = await api.patch(`${BASE}/${id}`, data);
    return res.data.data.entry;
  },

  deleteEntry: async (id: string): Promise<void> => {
    await api.delete(`${BASE}/${id}`);
  },

  addComment: async (entryId: string, content: string): Promise<SkinJournalComment> => {
    const res = await api.post(`${BASE}/${entryId}/comments`, { content });
    return res.data.data.comment;
  },

  getUnreadCount: async (): Promise<number> => {
    const res = await api.get(`${BASE}/unread-count`);
    return res.data.data.count;
  },

  markEntryRead: async (entryId: string): Promise<void> => {
    await api.post(`${BASE}/${entryId}/read`);
  },

  adminGetJournal: async (userId: string, page = 1): Promise<JournalPage> => {
    const res = await api.get(`${BASE}/admin/${userId}`, { params: { page } });
    return res.data.data;
  },

  adminCreateEntry: async (
    userId: string,
    data: { date?: string; notes?: string; tags?: string[] },
  ): Promise<SkinJournalEntry> => {
    const res = await api.post(`${BASE}/admin/${userId}`, data);
    return res.data.data.entry;
  },

  adminUpdateEntry: async (
    userId: string,
    entryId: string,
    data: Partial<{ notes: string; tags: string[] }>,
  ): Promise<SkinJournalEntry> => {
    const res = await api.patch(`${BASE}/admin/${userId}/${entryId}`, data);
    return res.data.data.entry;
  },

  adminDeleteEntry: async (userId: string, entryId: string): Promise<void> => {
    await api.delete(`${BASE}/admin/${userId}/${entryId}`);
  },

  getSummary: async (range: '30' | '90' | 'all'): Promise<JournalSummary> => {
    const res = await api.get(`${BASE}/summary`, { params: { range } });
    return res.data.data;
  },

  adminGetSummary: async (userId: string, range: '30' | '90' | 'all'): Promise<JournalSummary> => {
    const res = await api.get(`${BASE}/admin/${userId}/summary`, { params: { range } });
    return res.data.data;
  },

  // Legacy aliases for backward compatibility
  getAll: async (page = 1): Promise<JournalPage> => skinJournalApi.getJournal(page),
};
