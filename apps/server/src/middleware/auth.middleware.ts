// filepath: apps/server/src/middleware/auth.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';
import { env } from '../config/env';
import { AppError } from './error.middleware';

// Extend Express Request
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: string;
      };
    }
  }
}

export const optionalAuth = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return next();
  // Note: if token is present but invalid/expired, silently treats as unauthenticated
  authenticate(req, res, () => next());
};

export const authenticate = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new AppError('Brak autoryzacji', 401);
    }

    const token = authHeader.split(' ')[1];
    
    try {
      const decoded = verifyToken(token, env.JWT_SECRET) as { id: string; role: string };
      req.user = decoded;
      next();
    } catch (error) {
      throw new AppError('Nieprawidłowy lub wygasły token', 401);
    }
  } catch (error) {
    next(error);
  }
};
