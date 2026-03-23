import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { BodyPart } from '@prisma/client';
import * as quizService from './quiz.service';
import { AppError } from '../../middleware/error.middleware';

const bodyPartSchema = z.nativeEnum(BodyPart);

export async function listActive(req: Request, res: Response, next: NextFunction) {
  try {
    const bodyPart = bodyPartSchema.safeParse(req.query.bodyPart);
    if (!bodyPart.success) throw new AppError('Invalid bodyPart. Use STOPY, TWARZ, DLONIE or DEKOLT', 400);
    const quizzes = await quizService.listActiveByBodyPart(bodyPart.data);
    res.json({ status: 'success', data: { quizzes } });
  } catch (err) { next(err); }
}

export async function getOne(req: Request, res: Response, next: NextFunction) {
  try {
    const quiz = await quizService.getQuizById(req.params.id);
    res.json({ status: 'success', data: { quiz } });
  } catch (err) { next(err); }
}

export async function listAll(req: Request, res: Response, next: NextFunction) {
  try {
    const quizzes = await quizService.listAllQuizzes();
    res.json({ status: 'success', data: { quizzes } });
  } catch (err) { next(err); }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const schema = z.object({ title: z.string().min(1), bodyPart: z.nativeEnum(BodyPart) });
    const { title, bodyPart } = schema.parse(req.body);
    const quiz = await quizService.createQuiz(title, bodyPart);
    res.status(201).json({ status: 'success', data: { quiz } });
  } catch (err) { next(err); }
}

export async function patch(req: Request, res: Response, next: NextFunction) {
  try {
    const schema = z.object({
      title: z.string().min(1).optional(),
      bodyPart: z.nativeEnum(BodyPart).optional(),
      isActive: z.boolean().optional(),
    });
    const data = schema.parse(req.body);
    const quiz = await quizService.patchQuiz(req.params.id, data);
    res.json({ status: 'success', data: { quiz } });
  } catch (err) { next(err); }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    await quizService.deleteQuiz(req.params.id);
    res.status(204).send();
  } catch (err) { next(err); }
}

export async function saveTree(req: Request, res: Response, next: NextFunction) {
  try {
    const schema = z.object({
      nodes: z.array(z.object({
        id: z.string(),
        type: z.enum(['START', 'QUESTION', 'RESULT']),
        positionX: z.number(),
        positionY: z.number(),
        data: z.record(z.unknown()),
        result: z.object({
          mainServiceId: z.string().nullable(),
          suggestions: z.array(z.object({ serviceId: z.string(), order: z.number() })),
        }).optional(),
      })),
      edges: z.array(z.object({
        id: z.string(),
        sourceNodeId: z.string(),
        targetNodeId: z.string(),
        sourceHandle: z.string(),
      })),
    });
    const { nodes, edges } = schema.parse(req.body);
    const quiz = await quizService.saveTree(req.params.id, nodes as any, edges);
    res.json({ status: 'success', data: { quiz } });
  } catch (err) { next(err); }
}
