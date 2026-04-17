// filepath: apps/server/src/modules/users/users.controller.ts
import { Request, Response, NextFunction } from 'express';
import * as usersService from './users.service';
import * as authService from '../auth/auth.service';
import { processAndSaveImage } from '../../utils/imageProcessor';
import { AppError } from '../../middleware/error.middleware';

export const getMe = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await usersService.getUserById(req.user!.id);
    res.status(200).json({ status: 'success', data: { user } });
  } catch (error) {
    next(error);
  }
};

export const updateMe = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, phone, onboardingCompleted } = req.body;
    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = name;
    if (phone !== undefined) data.phone = phone;
    if (typeof onboardingCompleted === 'boolean') data.onboardingCompleted = onboardingCompleted;
    const user = await usersService.updateUser(req.user!.id, data);
    res.status(200).json({ status: 'success', data: { user } });
  } catch (error) {
    next(error);
  }
};

export const updateConsents = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { marketingConsent, photoConsent } = req.body;
    const data: Record<string, boolean> = {};
    if (typeof marketingConsent === 'boolean') data.marketingConsent = marketingConsent;
    if (typeof photoConsent === 'boolean') data.photoConsent = photoConsent;
    const user = await usersService.updateUser(req.user!.id, data);
    res.status(200).json({ status: 'success', data: { user } });
  } catch (error) {
    next(error);
  }
};

export const updateAvatar = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      return res.status(400).json({ status: 'error', message: 'Brak pliku' });
    }
    const avatarPath = await processAndSaveImage(req.file.buffer, 'avatars');
    const user = await usersService.updateUser(req.user!.id, { avatarPath });
    res.status(200).json({ status: 'success', data: { user } });
  } catch (error) {
    next(error);
  }
};

export const updateMyCard = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { cardAllergies, cardConditions, cardPreferences } = req.body;
    const data: Record<string, string | null> = {};
    if (cardAllergies !== undefined) data.cardAllergies = cardAllergies?.trim() || null;
    if (cardConditions !== undefined) data.cardConditions = cardConditions?.trim() || null;
    if (cardPreferences !== undefined) data.cardPreferences = cardPreferences?.trim() || null;
    const user = await usersService.updateUser(req.user!.id, data);
    res.status(200).json({ status: 'success', data: { user } });
  } catch (error) {
    next(error);
  }
};

export const updateUserCard = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.user!.role !== 'ADMIN' && req.user!.role !== 'EMPLOYEE') {
      throw new AppError('Brak uprawnień', 403);
    }
    const { cardAllergies, cardConditions, cardPreferences, cardStaffNotes } = req.body;
    const data: Record<string, string | null> = {};
    if (cardAllergies !== undefined) data.cardAllergies = cardAllergies?.trim() || null;
    if (cardConditions !== undefined) data.cardConditions = cardConditions?.trim() || null;
    if (cardPreferences !== undefined) data.cardPreferences = cardPreferences?.trim() || null;
    if (cardStaffNotes !== undefined) data.cardStaffNotes = cardStaffNotes?.trim() || null;
    const user = await usersService.updateUser(req.params.id, data);
    res.status(200).json({ status: 'success', data: { user } });
  } catch (error) {
    next(error);
  }
};

export const getMyTimeline = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cursor = req.query.cursor as string | undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
    const timeline = await usersService.getUserTimeline(req.user!.id, cursor, limit);
    res.status(200).json({ status: 'success', data: { timeline } });
  } catch (error) {
    next(error);
  }
};

export const getMyReferrals = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await usersService.getMyReferrals(req.user!.id);
    res.status(200).json({ status: 'success', data });
  } catch (error) {
    next(error);
  }
};

export const getAllUsers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const users = await usersService.getAllUsers();
    res.status(200).json({ status: 'success', data: { users } });
  } catch (error) {
    next(error);
  }
};

export const getUserDetails = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const user = await usersService.getUserDetails(id);
    res.status(200).json({ status: 'success', data: { user } });
  } catch (error) {
    next(error);
  }
};

export const getPendingUsers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const users = await usersService.getPendingUsers();
    res.status(200).json({ status: 'success', data: { users } });
  } catch (error) {
    next(error);
  }
};

export const approveUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await usersService.approveUser(req.params.id);
    res.status(200).json({ status: 'success', message: 'Konto zatwierdzone' });
  } catch (error) {
    next(error);
  }
};

export const rejectUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await usersService.rejectUser(req.params.id);
    res.status(200).json({ status: 'success', message: 'Konto odrzucone' });
  } catch (error) {
    next(error);
  }
};

export const adminCreateUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, email, phone, password } = req.body;
    const user = await authService.adminCreateUser({ name, email, phone, password });
    res.status(201).json({ status: 'success', data: { user } });
  } catch (error) {
    next(error);
  }
};

export const changePassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword || newPassword.length < 8) {
      throw new AppError('Nieprawidłowe dane', 400);
    }
    const user = await usersService.changeUserPassword(req.user!.id, currentPassword, newPassword);
    res.status(200).json({ status: 'success', data: { user } });
  } catch (error) {
    next(error);
  }
};
