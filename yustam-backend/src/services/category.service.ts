import { prisma } from '../db/client';

export const listCategories = async () => {
  return prisma.category.findMany({ orderBy: { name: 'asc' } });
};