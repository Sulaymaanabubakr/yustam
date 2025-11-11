import { Role, TicketPriority, TicketStatus } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth';
import { addTicketMessage, createTicket, getTicket, listAllTickets, listTickets } from '../services/support.service';

const router = Router();

router.use(authenticate);

router.get('/', async (req, res, next) => {
  try {
    const scopeAll = req.query.all === 'true' && req.authUser?.role === Role.ADMIN;
    const tickets = scopeAll ? await listAllTickets() : await listTickets(req.authUser!.userId);
    res.json({ tickets });
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const payload = z
      .object({
        subject: z.string(),
        category: z.string(),
        description: z.string(),
        priority: z.nativeEnum(TicketPriority).optional(),
      })
      .parse(req.body);
    const ticket = await createTicket(req.authUser!.userId, payload);
    res.status(201).json({ ticket });
  } catch (error) {
    next(error);
  }
});

router.get('/:ticketId', async (req, res, next) => {
  try {
    const ticket = await getTicket(req.params.ticketId, req.authUser!.userId, req.authUser?.role === Role.ADMIN);
    res.json({ ticket });
  } catch (error) {
    next(error);
  }
});

router.post('/:ticketId/messages', async (req, res, next) => {
  try {
    const payload = z
      .object({
        body: z.string(),
        status: z.nativeEnum(TicketStatus).optional(),
        internal: z.coerce.boolean().optional(),
      })
      .parse(req.body);

    const message = await addTicketMessage(
      req.params.ticketId,
      req.authUser!.userId,
      payload.body,
      payload.internal && req.authUser?.role === Role.ADMIN,
      payload.status,
    );
    res.status(201).json({ message });
  } catch (error) {
    next(error);
  }
});

export default router;