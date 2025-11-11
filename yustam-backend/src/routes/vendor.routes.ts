import { Role } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';
import { authenticate, requireRole } from '../middleware/auth';
import {
  ensureVendorProfile,
  getStorefrontBySlug,
  getVendorAnalytics,
  getVendorDashboard,
  getVendorProfile,
  updateVendorProfile,
} from '../services/vendor.service';

const router = Router();

router.post('/activate', authenticate, async (req, res, next) => {
  try {
    const payload = z.object({ businessName: z.string().min(2).optional() }).parse(req.body ?? {});
    const profile = await ensureVendorProfile(req.authUser!.userId, payload);
    res.status(201).json({ profile });
  } catch (error) {
    next(error);
  }
});

router.get('/storefront/:slug', async (req, res, next) => {
  try {
    const storefront = await getStorefrontBySlug(req.params.slug);
    res.json(storefront);
  } catch (error) {
    next(error);
  }
});

router.use(authenticate);

router.get('/me', requireRole([Role.VENDOR, Role.ADMIN]), async (req, res, next) => {
  try {
    const profile = await getVendorProfile(req.authUser!.userId);
    res.json({ profile });
  } catch (error) {
    next(error);
  }
});

router.patch('/me', requireRole([Role.VENDOR, Role.ADMIN]), async (req, res, next) => {
  try {
    const profile = await updateVendorProfile(req.authUser!.userId, req.body ?? {});
    res.json({ profile });
  } catch (error) {
    next(error);
  }
});

router.get('/me/dashboard', requireRole([Role.VENDOR, Role.ADMIN]), async (req, res, next) => {
  try {
    const dashboard = await getVendorDashboard(req.authUser!.userId);
    res.json(dashboard);
  } catch (error) {
    next(error);
  }
});

router.get('/me/analytics', requireRole([Role.VENDOR, Role.ADMIN]), async (req, res, next) => {
  try {
    const analytics = await getVendorAnalytics(req.authUser!.userId);
    res.json(analytics);
  } catch (error) {
    next(error);
  }
});

export default router;
