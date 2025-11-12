import { Prisma, ProductCondition, ProductStatus } from '@prisma/client';
import { prisma } from '../db/client';
import { HttpError } from '../middleware/error-handler';

export interface ProductMediaInput {
  url: string;
  publicId: string;
  isPrimary?: boolean;
}

export interface ProductInput {
  name: string;
  description: string;
  price: number;
  stock: number;
  status?: ProductStatus;
  condition?: ProductCondition;
  categoryId?: string;
  locationCity?: string;
  locationState?: string;
  tags?: string[];
  isFeatured?: boolean;
  isFlashSale?: boolean;
  flashSaleEndsAt?: Date | string | null;
  media?: ProductMediaInput[];
}

export interface ProductListParams {
  search?: string;
  categorySlug?: string;
  categoryId?: string;
  locationState?: string;
  locationCity?: string;
  minPrice?: number;
  maxPrice?: number;
  ownerId?: string;
  status?: ProductStatus;
  includeDrafts?: boolean;
  isFeatured?: boolean;
  isFlashSale?: boolean;
  page?: number;
  pageSize?: number;
}

export const listProducts = async (params: ProductListParams = {}) => {
  const {
    search,
    categorySlug,
    categoryId,
    locationState,
    locationCity,
    minPrice,
    maxPrice,
    ownerId,
    status,
    includeDrafts = false,
    isFeatured,
    isFlashSale,
    page = 1,
    pageSize = 20,
  } = params;

  const filters: Prisma.ProductWhereInput[] = [];
  if (ownerId) filters.push({ ownerId });
  if (locationState) filters.push({ locationState });
  if (locationCity) filters.push({ locationCity });
  if (categoryId) filters.push({ categoryId });
  if (categorySlug) filters.push({ category: { slug: categorySlug } });
  if (status) filters.push({ status });
  else if (!includeDrafts) filters.push({ status: ProductStatus.ACTIVE });
  if (isFeatured !== undefined) filters.push({ isFeatured });
  if (isFlashSale !== undefined) filters.push({ isFlashSale });
  if (search) {
    filters.push({
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ],
    });
  }
  if (minPrice) {
    filters.push({ price: { gte: minPrice } });
  }
  if (maxPrice) {
    filters.push({ price: { lte: maxPrice } });
  }

  const where = filters.length ? { AND: filters } : {};

  const skip = (page - 1) * pageSize;

  const [items, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: {
        media: true,
        category: true,
        owner: {
          include: { vendorProfile: true },
        },
      },
      orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
      skip,
      take: pageSize,
    }),
    prisma.product.count({ where }),
  ]);

  return {
    items,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize) || 1,
    },
  };
};

export const getProductById = async (productId: string) => {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      media: true,
      category: true,
      owner: {
        include: { vendorProfile: true },
      },
    },
  });

  if (!product) {
    throw new HttpError(404, 'Product not found');
  }

  return product;
};

export const createProduct = async (input: ProductInput, ownerId?: string) => {
  return prisma.product.create({
    data: {
      name: input.name,
      description: input.description,
      price: input.price,
      stock: input.stock,
      status: input.status ?? ProductStatus.ACTIVE,
      condition: input.condition,
      categoryId: input.categoryId,
      locationCity: input.locationCity,
      locationState: input.locationState,
      tags: input.tags ?? [],
      isFeatured: input.isFeatured ?? false,
      isFlashSale: input.isFlashSale ?? false,
      flashSaleEndsAt: input.flashSaleEndsAt ? new Date(input.flashSaleEndsAt) : undefined,
      ownerId,
      media: input.media
        ? {
            createMany: {
              data: input.media.map((media, index) => ({
                url: media.url,
                publicId: media.publicId,
                isPrimary: media.isPrimary ?? index === 0,
              })),
            },
          }
        : undefined,
    },
    include: { media: true, category: true },
  });
};

export const updateProduct = async (productId: string, input: Partial<ProductInput>) => {
  await getProductById(productId);

  return prisma.product.update({
    where: { id: productId },
    data: {
      name: input.name,
      description: input.description,
      price: input.price,
      stock: input.stock,
      status: input.status,
      condition: input.condition,
      categoryId: input.categoryId,
      locationCity: input.locationCity,
      locationState: input.locationState,
      tags: input.tags,
      isFeatured: input.isFeatured,
      isFlashSale: input.isFlashSale,
      flashSaleEndsAt:
        input.flashSaleEndsAt === undefined
          ? undefined
          : input.flashSaleEndsAt
            ? new Date(input.flashSaleEndsAt)
            : null,
      media: input.media
        ? {
            deleteMany: {},
            createMany: {
              data: input.media.map((media, index) => ({
                url: media.url,
                publicId: media.publicId,
                isPrimary: media.isPrimary ?? index === 0,
              })),
            },
          }
        : undefined,
    },
    include: { media: true, category: true },
  });
};

export const deleteProduct = async (productId: string) => {
  await getProductById(productId);
  await prisma.productImage.deleteMany({ where: { productId } });
  await prisma.product.delete({ where: { id: productId } });
  return { success: true };
};
