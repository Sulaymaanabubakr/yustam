import { prisma } from '../db/client';
import { HttpError } from '../middleware/error-handler';

export const listSavedItems = async (userId: string) => {
  return prisma.savedItem.findMany({
    where: { userId },
    include: { product: { include: { media: true, category: true } } },
    orderBy: { createdAt: 'desc' },
  });
};

export const addSavedItem = async (userId: string, productId: string) => {
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) {
    throw new HttpError(404, 'Product not found');
  }

  const saved = await prisma.savedItem.upsert({
    where: { userId_productId: { userId, productId } },
    update: {},
    create: { userId, productId },
    include: { product: { include: { media: true } } },
  });

  return saved;
};

export const removeSavedItem = async (userId: string, productId: string) => {
  await prisma.savedItem.delete({ where: { userId_productId: { userId, productId } } });
  return { success: true };
};