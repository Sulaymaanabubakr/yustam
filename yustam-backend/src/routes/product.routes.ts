import type { Express } from 'express';
import { Router } from 'express';
import { ProductCondition, ProductStatus, Role } from '@prisma/client';
import { z } from 'zod';
import { authenticate, requireRole } from '../middleware/auth';
import { upload } from '../middleware/upload';
import { HttpError } from '../middleware/error-handler';
import {
  createProduct,
  deleteProduct,
  getProductById,
  listProducts,
  updateProduct,
} from '../services/product.service';
import { uploadBufferToCloudinary } from '../utils/cloudinary';

const router = Router();

const listQuerySchema = z.object({
  search: z.string().optional(),
  categorySlug: z.string().optional(),
  categoryId: z.string().optional(),
  locationState: z.string().optional(),
  locationCity: z.string().optional(),
  minPrice: z.coerce.number().nonnegative().optional(),
  maxPrice: z.coerce.number().nonnegative().optional(),
  ownerId: z.string().optional(),
  status: z.nativeEnum(ProductStatus).optional(),
  includeDrafts: z.coerce.boolean().optional(),
  isFeatured: z.coerce.boolean().optional(),
  isFlashSale: z.coerce.boolean().optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
});

router.get('/', async (req, res, next) => {
  try {
    const query = listQuerySchema.parse(req.query);
    const result = await listProducts(query);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const product = await getProductById(req.params.id);
    res.json({ product });
  } catch (error) {
    next(error);
  }
});

const productSchema = z.object({
  name: z.string(),
  description: z.string(),
  price: z.coerce.number().positive(),
  stock: z.coerce.number().int().nonnegative(),
  status: z.nativeEnum(ProductStatus).optional(),
  condition: z.nativeEnum(ProductCondition).optional(),
  categoryId: z.string().optional(),
  locationCity: z.string().optional(),
  locationState: z.string().optional(),
  tags: z.array(z.string()).optional(),
  isFeatured: z.coerce.boolean().optional(),
  isFlashSale: z.coerce.boolean().optional(),
  flashSaleEndsAt: z.string().datetime().or(z.literal('')).optional(),
  ownerId: z.string().optional(),
});

router.post(
  '/',
  authenticate,
  requireRole([Role.ADMIN, Role.VENDOR]),
  upload.array('media', 6),
  async (req, res, next) => {
    try {
      const payload = productSchema.parse(req.body);
      const files = req.files as Express.Multer.File[];

      const media = files
        ? await Promise.all(
            files.map(async (file, index) => {
              const uploaded = await uploadBufferToCloudinary(file.buffer, 'yustam/products');
              return { url: uploaded.url, publicId: uploaded.public_id, isPrimary: index === 0 };
            }),
          )
        : undefined;

      const ownerId = req.authUser?.role === Role.ADMIN ? payload.ownerId ?? req.authUser?.userId : req.authUser!.userId;
      const product = await createProduct(
        {
          ...payload,
          flashSaleEndsAt: payload.flashSaleEndsAt ? new Date(payload.flashSaleEndsAt) : undefined,
          media,
        },
        ownerId,
      );
      res.status(201).json({ product });
    } catch (error) {
      next(error);
    }
  },
);

router.patch(
  '/:id',
  authenticate,
  requireRole([Role.ADMIN, Role.VENDOR]),
  upload.array('media', 6),
  async (req, res, next) => {
    try {
      if (!req.params.id) {
        throw new HttpError(400, 'Product ID required');
      }
      const payload = productSchema.partial().parse(req.body);
      const files = req.files as Express.Multer.File[];
      const media = files?.length
        ? await Promise.all(
            files.map(async (file, index) => {
              const uploaded = await uploadBufferToCloudinary(file.buffer, 'yustam/products');
              return { url: uploaded.url, publicId: uploaded.public_id, isPrimary: index === 0 };
            }),
          )
        : undefined;

      if (req.authUser?.role !== Role.ADMIN) {
        const product = await getProductById(req.params.id);
        if (product.ownerId && product.ownerId !== req.authUser?.userId) {
          throw new HttpError(403, 'You can only update your listings');
        }
      }

      const product = await updateProduct(req.params.id, {
        ...payload,
        flashSaleEndsAt: payload.flashSaleEndsAt ? new Date(payload.flashSaleEndsAt) : undefined,
        media,
      });
      res.json({ product });
    } catch (error) {
      next(error);
    }
  },
);

router.delete('/:id', authenticate, requireRole([Role.ADMIN, Role.VENDOR]), async (req, res, next) => {
  try {
    const product = await getProductById(req.params.id);
    if (req.authUser?.role !== Role.ADMIN && product.ownerId !== req.authUser?.userId) {
      throw new HttpError(403, 'You can only delete your listings');
    }
    await deleteProduct(req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
