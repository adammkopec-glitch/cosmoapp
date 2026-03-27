import { Request, Response, NextFunction } from 'express';
import * as recommendationsService from './recommendations.service';

export const addRecommendation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const recommendation = await recommendationsService.addRecommendation(
      req.params.id,
      req.user!.id,
      req.body
    );
    res.status(201).json({ status: 'success', data: { recommendation } });
  } catch (error) {
    next(error);
  }
};

export const deleteRecommendation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await recommendationsService.deleteRecommendation(
      req.params.recId,
      req.user!.id,
      req.user!.role
    );
    res.json({ status: 'success', data: null });
  } catch (error) {
    next(error);
  }
};

export const markPickedUp = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const recommendation = await recommendationsService.markPickedUp(req.params.recId);
    res.json({ status: 'success', data: { recommendation } });
  } catch (error) {
    next(error);
  }
};

export const getForAppointment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const recommendations = await recommendationsService.getForAppointment(req.params.id);
    res.json({ status: 'success', data: { recommendations } });
  } catch (error) {
    next(error);
  }
};

export const getMyRecommendations = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const groups = await recommendationsService.getMyRecommendations(req.user!.id);
    res.status(200).json({ status: 'success', data: { groups } });
  } catch (error) {
    next(error);
  }
};
