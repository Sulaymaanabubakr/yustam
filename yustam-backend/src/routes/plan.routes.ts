import { Role } from '@prisma/client';
import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import { getUserSubscriptions, listPlans, subscribeToPlan } from '../services/plan.service';

const router = Router();

router.get('/', async (_req, res, next) => {
  try {
    const plans = await listPlans();
    res.json({ plans });
  } catch (error) {
    next(error);
  }
});

router.use(authenticate);

router.get('/subscriptions/me', requireRole([Role.VENDOR, Role.ADMIN]), async (req, res, next) => {
  try {
    const subscriptions = await getUserSubscriptions(req.authUser!.userId);
    res.json({ subscriptions });
  } catch (error) {
    next(error);
  }
});

router.post('/:planId/subscribe', requireRole([Role.VENDOR, Role.ADMIN]), async (req, res, next) => {
  try {
    const subscription = await subscribeToPlan(req.authUser!.userId, req.params.planId);
    res.status(201).json({ subscription });
  } catch (error) {
    next(error);
  }
});

export default router;