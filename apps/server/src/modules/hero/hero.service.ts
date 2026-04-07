import { prisma } from '../../config/prisma';
import { Prisma } from '@prisma/client';

export const getActiveSlides = async () => {
  return prisma.heroSlide.findMany({
    where: { isActive: true },
    orderBy: [{ isMain: 'desc' }, { order: 'asc' }, { createdAt: 'asc' }],
  });
};

export const getAllSlides = async () => {
  return prisma.heroSlide.findMany({
    orderBy: [{ isMain: 'desc' }, { order: 'asc' }, { createdAt: 'asc' }],
  });
};

export const createSlide = async (data: {
  imagePath: string;
  title?: string;
  heading?: string;
  subtitle?: string;
  textPosition?: string;
  fontStyle?: string;
  buttons?: object;
  isMain?: boolean;
}) => {
  if (data.isMain) {
    await prisma.heroSlide.updateMany({ data: { isMain: false } });
  }
  const count = await prisma.heroSlide.count();
  return prisma.heroSlide.create({
    data: { ...data, order: count },
  });
};

export const updateSlide = async (id: string, data: { title?: string; heading?: string; subtitle?: string; textPosition?: string; fontStyle?: string; buttons?: object | null; isMain?: boolean; isActive?: boolean; order?: number }) => {
  if (data.isMain) {
    await prisma.heroSlide.updateMany({ data: { isMain: false } });
  }
  const { buttons, ...rest } = data;
  const updateData: Prisma.HeroSlideUpdateInput = {
    ...rest,
    ...(buttons !== undefined ? { buttons: buttons === null ? Prisma.JsonNull : (buttons as Prisma.InputJsonValue) } : {}),
  };
  return prisma.heroSlide.update({ where: { id }, data: updateData });
};

export const setMainSlide = async (id: string) => {
  await prisma.heroSlide.updateMany({ data: { isMain: false } });
  return prisma.heroSlide.update({ where: { id }, data: { isMain: true } });
};

export const deleteSlide = async (id: string) => {
  return prisma.heroSlide.delete({ where: { id } });
};
