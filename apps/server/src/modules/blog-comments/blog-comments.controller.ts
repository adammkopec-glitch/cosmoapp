import { Request, Response, NextFunction } from 'express';
import * as blogCommentsService from './blog-comments.service';

export const getComments = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const isAdmin = req.user?.role === 'ADMIN';
    const comments = await blogCommentsService.getComments(req.params.slug, { includeAll: isAdmin });
    res.status(200).json({ status: 'success', data: { comments } });
  } catch (error) {
    next(error);
  }
};

export const createComment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { content, parentId } = req.body;
    const comment = await blogCommentsService.createComment(
      req.user!.id,
      req.params.slug,
      { content, parentId },
      req.file
    );
    res.status(201).json({ status: 'success', data: { comment } });
  } catch (error) {
    next(error);
  }
};

export const deleteComment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const isAdmin = req.user!.role === 'ADMIN';
    await blogCommentsService.deleteComment(req.user!.id, req.params.id, isAdmin);
    res.status(200).json({ status: 'success', data: null });
  } catch (error) {
    next(error);
  }
};

export const moderateComment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const comment = await blogCommentsService.moderateComment(req.params.id, req.body);
    res.status(200).json({ status: 'success', data: { comment } });
  } catch (error) {
    next(error);
  }
};

export const reactToComment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const reaction = await blogCommentsService.reactToComment(
      req.user!.id,
      req.params.id,
      req.body.emoji
    );
    res.status(200).json({ status: 'success', data: { reaction } });
  } catch (error) {
    next(error);
  }
};
