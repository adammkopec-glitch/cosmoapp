// filepath: apps/server/src/middleware/admin.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { AppError } from './error.middleware';
import { Role } from '@cosmo/shared';

export const requireAdmin = (req: Request, res: Response, next: NextFunction): void => {
  try {
    if (!req.user) {
      throw new AppError('Brak autoryzacji', 401);
    }

    if (req.user.role !== Role.ADMIN) {
      throw new AppError('Brak uprawnień administratora', 403);
    }

    next();
  } catch (error) {
    next(error);
  }
};

export const requireStaff = (req: Request, res: Response, next: NextFunction): void => {
  try {
    if (!req.user) {
      throw new AppError('Brak autoryzacji', 401);
    }

    if (req.user.role !== Role.ADMIN && req.user.role !== Role.EMPLOYEE) {
      throw new AppError('Brak uprawnień', 403);
    }

    next();
  } catch (error) {
    next(error);
  }
};
