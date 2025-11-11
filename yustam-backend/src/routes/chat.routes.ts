import { Router } from 'express';
import { Role } from '@prisma/client';
import { z } from 'zod';
import { authenticate, requireRole } from '../middleware/auth';
import { attachAdminToThread, createChatThread, listChatThreads, recordChatMessage } from '../services/chat.service';

const router = Router();

router.use(authenticate);

router.get('/', async (req, res, next) => {
  try {
    const threads = await listChatThreads({ userId: req.authUser!.userId, role: req.authUser!.role });
    res.json({ threads });
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const thread = await createChatThread(req.authUser!.userId);
    res.status(201).json({ thread });
  } catch (error) {
    next(error);
  }
});

router.post('/:threadId/assign', requireRole(Role.ADMIN), async (req, res, next) => {
  try {
    const thread = await attachAdminToThread(req.params.threadId, req.authUser!.userId);
    res.json({ thread });
  } catch (error) {
    next(error);
  }
});

const messageSchema = z.object({
  firebaseMessageId: z.string().min(1),
  senderId: z.string().min(1),
  preview: z.string().min(1),
});

router.post('/:threadId/messages', requireRole([Role.ADMIN, Role.BUYER, Role.VENDOR]), async (req, res, next) => {
  try {
    const payload = messageSchema.parse(req.body);
    const message = await recordChatMessage(req.params.threadId, payload);
    res.status(201).json({ message });
  } catch (error) {
    next(error);
  }
});

export default router;
