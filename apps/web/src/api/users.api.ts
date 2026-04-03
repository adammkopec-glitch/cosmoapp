import { api } from '../lib/axios';
import { User } from '@cosmo/shared';

export type ReferralsData = {
  ambassadorCode: string | null;
  count: number;
  referrals: { id: string; registeredAt: string }[];
  milestones: { at: number; reward: string }[];
  nextMilestone: { at: number; reward: string } | null;
  progressToNext: number;
};

export const usersApi = {
  uploadAvatar: async (file: File): Promise<User> => {
    const formData = new FormData();
    formData.append('avatar', file);
    const res = await api.patch('/users/me/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data.data.user;
  },
  updateMyCard: async (data: { cardAllergies?: string; cardConditions?: string; cardPreferences?: string }) => {
    const res = await api.patch('/users/me/card', data);
    return res.data.data.user;
  },
  updateUserCard: async (userId: string, data: { cardAllergies?: string; cardConditions?: string; cardPreferences?: string; cardStaffNotes?: string }) => {
    const res = await api.patch(`/users/${userId}/card`, data);
    return res.data.data.user;
  },
  getReferrals: async (): Promise<ReferralsData> => {
    const res = await api.get('/users/me/referrals');
    return res.data.data;
  },
  updateOnboarding: async (completed: boolean): Promise<void> => {
    await api.patch('/users/me', { onboardingCompleted: completed });
  },
};
