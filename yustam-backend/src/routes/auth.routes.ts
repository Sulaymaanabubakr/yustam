import { Router } from 'express';
import { Role } from '@prisma/client';
import { z } from 'zod';
import { authenticate, requireRole } from '../middleware/auth';
import { HttpError } from '../middleware/error-handler';
import { prisma } from '../db/client';
import { createSessionFromIdToken, listUsers, registerUser, updateProfile } from '../services/auth.service';

const router = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  displayName: z.string().optional(),
  phoneNumber: z.string().optional(),
});

router.post('/register', async (req, res, next) => {
  try {
    const payload = registerSchema.parse(req.body);
    const { dbUser } = await registerUser(payload);
    res.status(201).json({ user: dbUser });
  } catch (error) {
    next(error);
  }
});

const sessionSchema = z.object({ idToken: z.string().min(10) });

router.post('/session', async (req, res, next) => {
  try {
    const { idToken } = sessionSchema.parse(req.body);
    const { user, token } = await createSessionFromIdToken(idToken);
    res.json({ user, token });
  } catch (error) {
    next(error);
  }
});

router.get('/me', authenticate, async (req, res, next) => {
  try {
    const me = await prisma.user.findUnique({ where: { id: req.authUser!.userId } });
    if (!me) {
      throw new HttpError(404, 'User not found');
    }
    res.json({ user: me });
  } catch (error) {
    next(error);
  }
});

const updateProfileSchema = z.object({
  displayName: z.string().optional(),
  phone: z.string().optional(),
  photoUrl: z.string().url().optional(),
});

router.patch('/me', authenticate, async (req, res, next) => {
  try {
    const payload = updateProfileSchema.parse(req.body);
    const user = await updateProfile(req.authUser!.userId, payload);
    res.json({ user });
  } catch (error) {
    next(error);
  }
});

router.get('/', authenticate, requireRole(Role.ADMIN), async (_req, res, next) => {
  try {
    const users = await listUsers();
    res.json({ users });
  } catch (error) {
    next(error);
  }
});

export default router;