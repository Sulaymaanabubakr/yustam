import { TicketPriority, TicketStatus } from '@prisma/client';
import { prisma } from '../db/client';
import { HttpError } from '../middleware/error-handler';

export const listTickets = async (userId: string) =>
  prisma.supportTicket.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, include: { messages: true } });

export const listAllTickets = async () =>
  prisma.supportTicket.findMany({ include: { user: true, messages: true }, orderBy: { createdAt: 'desc' } });

export const createTicket = async (userId: string, input: { subject: string; category: string; description: string; priority?: TicketPriority }) => {
  return prisma.supportTicket.create({
    data: {
      userId,
      subject: input.subject,
      category: input.category,
      description: input.description,
      priority: input.priority ?? TicketPriority.MEDIUM,
    },
  });
};

export const getTicket = async (ticketId: string, userId: string, isAdmin: boolean) => {
  const ticket = await prisma.supportTicket.findUnique({
    where: { id: ticketId },
    include: { messages: { orderBy: { sentAt: 'asc' }, include: { sender: { select: { id: true, displayName: true } } } }, user: true },
  });
  if (!ticket) {
    throw new HttpError(404, 'Ticket not found');
  }
  if (!isAdmin && ticket.userId !== userId) {
    throw new HttpError(403, 'Unauthorized');
  }
  return ticket;
};

export const addTicketMessage = async (
  ticketId: string,
  senderId: string,
  body: string,
  isInternal = false,
  status?: TicketStatus,
) => {
  const ticket = await prisma.supportTicket.findUnique({ where: { id: ticketId } });
  if (!ticket) {
    throw new HttpError(404, 'Ticket not found');
  }

  const message = await prisma.supportMessage.create({
    data: { ticketId, senderId, body, isInternal },
  });

  if (status) {
    await prisma.supportTicket.update({ where: { id: ticketId }, data: { status } });
  }

  return message;
};