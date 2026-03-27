import { prisma } from '../../config/prisma';
import { AppError } from '../../middleware/error.middleware';
import { processAndSaveImage } from '../../utils/imageProcessor';

export const getAll = async () => {
  return prisma.product.findMany({ orderBy: { name: 'asc' } });
};

export const create = async (
  data: { name: string; brand?: string; description?: string; price: number; stock?: number; isActive?: boolean },
  file?: Express.Multer.File
) => {
  let imagePath: string | undefined;
  if (file) {
    imagePath = await processAndSaveImage(file.buffer, 'products');
  }

  return prisma.product.create({
    data: {
      name: data.name,
      brand: data.brand,
      description: data.description,
      price: Number(data.price),
      stock: data.stock !== undefined ? Number(data.stock) : 0,
      isActive: data.isActive !== undefined ? Boolean(data.isActive) : true,
      imagePath,
    },
  });
};

export const update = async (
  id: string,
  data: { name?: string; brand?: string; description?: string; price?: number; stock?: number; isActive?: boolean },
  file?: Express.Multer.File
) => {
  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) throw new AppError('Produkt nie znaleziony', 404);

  let imagePath: string | undefined;
  if (file) {
    imagePath = await processAndSaveImage(file.buffer, 'products');
  }

  return prisma.product.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.brand !== undefined && { brand: data.brand }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.price !== undefined && { price: Number(data.price) }),
      ...(data.stock !== undefined && { stock: Number(data.stock) }),
      ...(data.isActive !== undefined && { isActive: Boolean(data.isActive) }),
      ...(imagePath && { imagePath }),
    },
  });
};

export const updateStock = async (id: string, quantity: number) => {
  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) throw new AppError('Produkt nie znaleziony', 404);

  return prisma.product.update({
    where: { id },
    data: { stock: Number(quantity) },
  });
};

export const remove = async (id: string) => {
  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) throw new AppError('Produkt nie znaleziony', 404);

  return prisma.product.delete({ where: { id } });
};
