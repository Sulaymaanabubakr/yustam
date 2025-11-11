import { Router } from 'express';
import { Role } from '@prisma/client';
import { authenticate, requireRole } from '../middleware/auth';
import { prisma } from '../db/client';

const router = Router();

router.use(authenticate, requireRole(Role.ADMIN));

router.get('/dashboard', async (_req, res, next) => {
  try {
    const [userCount, productCount, vendorCount, openChats] = await Promise.all([
      prisma.user.count(),
      prisma.product.count(),
      prisma.vendorProfile.count(),
      prisma.chatThread.count({ where: { status: 'OPEN' } }),
    ]);

    res.json({
      stats: {
        users: userCount,
        products: productCount,
        vendors: vendorCount,
        openChats,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.get('/products', async (_req, res, next) => {
  try {
    const products = await prisma.product.findMany({ include: { media: true, category: true, owner: true } });
    res.json({ products });
  } catch (error) {
    next(error);
  }
});

router.get('/users', async (_req, res, next) => {
  try {
    const users = await prisma.user.findMany({ orderBy: { createdAt: 'desc' } });
    res.json({ users });
  } catch (error) {
    next(error);
  }
});

router.get('/vendors', async (_req, res, next) => {
  try {
    const vendors = await prisma.vendorProfile.findMany({
      include: { user: true, currentPlan: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ vendors });
  } catch (error) {
    next(error);
  }
});

router.get('/verifications', async (_req, res, next) => {
  try {
    const requests = await prisma.verificationRequest.findMany({
      include: { user: true, documents: true },
      orderBy: { submittedAt: 'desc' },
    });
    res.json({ requests });
  } catch (error) {
    next(error);
  }
});

router.get('/support/tickets', async (_req, res, next) => {
  try {
    const tickets = await prisma.supportTicket.findMany({
      include: { user: true, messages: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ tickets });
  } catch (error) {
    next(error);
  }
});

router.get('/plans', async (_req, res, next) => {
  try {
    const plans = await prisma.plan.findMany({ include: { subscriptions: true } });
    res.json({ plans });
  } catch (error) {
    next(error);
  }
});

export default router;
