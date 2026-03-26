import { Request, Response, NextFunction } from 'express';
import * as journalService from './skin-journal.service';
import { processAndSaveImage } from '../../utils/imageProcessor';
import { AppError } from '../../middleware/error.middleware';

export const getJournal = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const data = await journalService.getJournal(req.user!.id, page, limit);
    res.status(200).json({ status: 'success', data });
  } catch (error) {
    next(error);
  }
};

export const createEntry = async (req: Request, res: Response, next: NextFunction) => {
  try {
    let photoPath: string | undefined;
    if (req.file) {
      photoPath = await processAndSaveImage(req.file.buffer, 'journal');
    }
    const { mood, notes, linkedAppointmentId, tags, date } = req.body;
    const entry = await journalService.createEntry(req.user!.id, {
      mood: mood !== undefined ? parseInt(mood) : undefined,
      notes,
      photoPath,
      linkedAppointmentId,
      tags: tags ? (Array.isArray(tags) ? tags : [tags]) : [],
      date,
    });
    res.status(201).json({ status: 'success', data: { entry } });
  } catch (error) {
    next(error);
  }
};

export const updateEntry = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { mood, notes, tags } = req.body;
    const entry = await journalService.updateEntry(req.user!.id, req.params.id, {
      mood: mood !== undefined ? parseInt(mood) : undefined,
      notes,
      tags,
    });
    res.status(200).json({ status: 'success', data: { entry } });
  } catch (error) {
    next(error);
  }
};

export const deleteEntry = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await journalService.deleteEntry(req.user!.id, req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

export const addComment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { content } = req.body;
    if (!content?.trim()) throw new AppError('Treść komentarza jest wymagana', 400);
    const comment = await journalService.addComment(req.params.id, req.user!.id, content.trim());
    res.status(201).json({ status: 'success', data: { comment } });
  } catch (error) {
    next(error);
  }
};

export const getUnreadCount = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const count = await journalService.getUnreadCommentCount(req.user!.id);
    res.status(200).json({ status: 'success', data: { count } });
  } catch (error) {
    next(error);
  }
};

export const markEntryRead = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await journalService.markCommentsRead(req.user!.id, req.params.id);
    res.status(200).json({ status: 'success' });
  } catch (error) {
    next(error);
  }
};

export const adminGetJournal = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const data = await journalService.getAdminJournal(req.params.userId, page);
    res.status(200).json({ status: 'success', data });
  } catch (error) {
    next(error);
  }
};

export const adminCreateEntry = async (req: Request, res: Response, next: NextFunction) => {
  try {
    let photoPath: string | undefined;
    if (req.file) {
      photoPath = await processAndSaveImage(req.file.buffer, 'journal');
    }
    const { notes, tags, date } = req.body;
    const entry = await journalService.createEntry(
      req.params.userId,
      {
        notes,
        photoPath,
        tags: tags ? (Array.isArray(tags) ? tags : [tags]) : [],
        date,
      },
      req.user!.id,
      true,
    );
    res.status(201).json({ status: 'success', data: { entry } });
  } catch (error) {
    next(error);
  }
};

export const adminUpdateEntry = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { notes, tags } = req.body;
    const entry = await journalService.updateEntry(
      req.params.userId,
      req.params.entryId,
      { notes, tags },
      true,
    );
    res.status(200).json({ status: 'success', data: { entry } });
  } catch (error) {
    next(error);
  }
};

export const adminDeleteEntry = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await journalService.deleteEntry(req.params.userId, req.params.entryId, true);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
