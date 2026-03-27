import { Request, Response, NextFunction } from 'express';
import * as productsService from './products.service';

export const getAll = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const products = await productsService.getAll();
    res.json({ status: 'success', data: { products } });
  } catch (error) {
    next(error);
  }
};

export const create = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const product = await productsService.create(req.body, req.file);
    res.status(201).json({ status: 'success', data: { product } });
  } catch (error) {
    next(error);
  }
};

export const update = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const product = await productsService.update(req.params.id, req.body, req.file);
    res.json({ status: 'success', data: { product } });
  } catch (error) {
    next(error);
  }
};

export const updateStock = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const product = await productsService.updateStock(req.params.id, req.body.stock);
    res.json({ status: 'success', data: { product } });
  } catch (error) {
    next(error);
  }
};

export const remove = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await productsService.remove(req.params.id);
    res.json({ status: 'success', data: null });
  } catch (error) {
    next(error);
  }
};
