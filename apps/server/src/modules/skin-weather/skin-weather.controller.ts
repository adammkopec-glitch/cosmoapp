import { Request, Response, NextFunction } from 'express';
import * as service from './skin-weather.service';

export const getProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const profile = await service.getProfile(req.user!.id);
    res.json(profile);
  } catch (err) {
    next(err);
  }
};

export const upsertProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const profile = await service.upsertProfile(req.user!.id, req.body);
    res.json(profile);
  } catch (err) {
    next(err);
  }
};

export const getTodayReport = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const report = await service.getTodayReport(req.user!.id);
    if (!report) return res.status(404).json({ message: 'Brak raportu na dziś' });
    res.json(report);
  } catch (err) {
    next(err);
  }
};

export const getReportHistory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(String(req.query.page)) || 1;
    const limit = parseInt(String(req.query.limit)) || 10;
    const result = await service.getReportHistory(req.user!.id, page, limit);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

export const updateProfileLocation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await service.updateProfileLocation(req.user!.id, req.body);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

export const generateMyReport = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const report = await service.generateReportForUser(req.user!.id);
    res.json(report);
  } catch (err) {
    next(err);
  }
};

export const generateAllReports = async (req: Request, res: Response, next: NextFunction) => {
  try {
    service.processSkinWeatherReports(); // fire and forget
    res.json({ message: 'Generowanie raportów rozpoczęte' });
  } catch (err) {
    next(err);
  }
};

export const getRules = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rules = await service.getRules();
    res.json(rules);
  } catch (err) {
    next(err);
  }
};

export const createRule = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { label, recommendation, conditions, isActive, sortOrder } = req.body;
    const rule = await service.createRule({ label, recommendation, conditions, isActive, sortOrder });
    res.status(201).json(rule);
  } catch (err) {
    next(err);
  }
};

export const updateRule = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { label, recommendation, conditions, isActive, sortOrder } = req.body;
    const rule = await service.updateRule(id, { label, recommendation, conditions, isActive, sortOrder });
    res.json(rule);
  } catch (err) {
    next(err);
  }
};

export const deleteRule = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await service.deleteRule(req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};
