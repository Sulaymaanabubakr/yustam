import { NotificationType, Role } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';
import { authenticate, requireRole } from '../middleware/auth';
import { createNotification, listNotifications, markAllNotificationsRead, markNotificationsRead } from '../services/notification.service';

const router = Router();

const querySchema = z.object({
  type: z.nativeEnum(NotificationType).optional(),
  unreadOnly: z.coerce.boolean().optional(),
});

router.use(authenticate);

router.get('/', async (req, res, next) => {
  try {
    const filters = querySchema.parse(req.query);
    const notifications = await listNotifications(req.authUser!.userId, filters);
    res.json({ notifications });
  } catch (error) {
    next(error);
  }
});

router.post('/read', async (req, res, next) => {
  try {
    const payload = z.object({ ids: z.array(z.string()) }).parse(req.body);
    const result = await markNotificationsRead(req.authUser!.userId, payload.ids);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.post('/read-all', async (req, res, next) => {
  try {
    const result = await markAllNotificationsRead(req.authUser!.userId);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.post('/', requireRole(Role.ADMIN), async (req, res, next) => {
  try {
    const payload = z
      .object({
        userId: z.string(),
        title: z.string(),
        body: z.string(),
        type: z.nativeEnum(NotificationType).optional(),
        data: z.record(z.any()).optional(),
      })
      .parse(req.body);
    const notification = await createNotification(payload);
    res.status(201).json({ notification });
  } catch (error) {
    next(error);
  }
});

export default router;