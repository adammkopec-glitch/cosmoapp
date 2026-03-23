import { api } from '@/lib/axios';

export interface QuizListItem {
  id: string;
  title: string;
}

export interface QuizResultConfig {
  id: string;
  mainService: { id: string; name: string; slug: string; price: number } | null;
  suggestions: { id: string; name: string; slug: string; order: number }[];
}

export interface QuizNodeData {
  id: string;
  type: 'START' | 'QUESTION' | 'RESULT';
  positionX: number;
  positionY: number;
  data: Record<string, unknown>;
  result: QuizResultConfig | null;
}

export interface QuizEdgeData {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  sourceHandle: string;
}

export interface FullQuiz {
  id: string;
  title: string;
  bodyPart: string;
  isActive: boolean;
  nodes: QuizNodeData[];
  edges: QuizEdgeData[];
}

export interface AdminQuizSummary {
  id: string;
  title: string;
  bodyPart: string;
  isActive: boolean;
  nodeCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ApiQuizResult {
  title: string;
  subtitle: string;
  description: string;
  extras: string;
  mainService: { id: string; name: string; slug: string; price: number } | null;
  suggestions: { id: string; name: string; slug: string }[];
}

export const quizApi = {
  // Public
  listByBodyPart: async (bodyPart: string): Promise<QuizListItem[]> => {
    const res = await api.get('/quizzes', { params: { bodyPart: bodyPart.toUpperCase() } });
    return res.data.data.quizzes;
  },
  getById: async (id: string): Promise<FullQuiz> => {
    const res = await api.get(`/quizzes/${id}`);
    return res.data.data.quiz;
  },

  // Admin
  adminList: async (): Promise<AdminQuizSummary[]> => {
    const res = await api.get('/quizzes/admin/list');
    return res.data.data.quizzes;
  },
  adminGet: async (id: string): Promise<FullQuiz> => {
    const res = await api.get(`/quizzes/admin/${id}`);
    return res.data.data.quiz;
  },
  create: async (title: string, bodyPart: string): Promise<{ id: string }> => {
    const res = await api.post('/quizzes/admin', { title, bodyPart });
    return res.data.data.quiz;
  },
  patch: async (id: string, data: { title?: string; bodyPart?: string; isActive?: boolean }) => {
    const res = await api.patch(`/quizzes/admin/${id}`, data);
    return res.data.data.quiz;
  },
  remove: async (id: string) => {
    await api.delete(`/quizzes/admin/${id}`);
  },
  saveTree: async (id: string, nodes: unknown[], edges: unknown[]) => {
    const res = await api.put(`/quizzes/admin/${id}/tree`, { nodes, edges });
    return res.data.data.quiz;
  },
};
