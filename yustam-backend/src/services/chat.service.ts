import { Role } from '@prisma/client';
import { getFirestore } from '../config/firebase';
import { prisma } from '../db/client';
import { HttpError } from '../middleware/error-handler';

export const createChatThread = async (userId: string, adminId?: string) => {
  const firestore = getFirestore();
  const threadRef = firestore.collection('threads').doc();

  await threadRef.set({
    participants: [userId, adminId ?? null].filter(Boolean),
    createdAt: new Date().toISOString(),
  });

  return prisma.chatThread.create({
    data: {
      firebaseThreadId: threadRef.id,
      userId,
      adminId,
    },
  });
};

export const listChatThreads = async (requester: { userId: string; role: Role }) => {
  const where = requester.role === Role.ADMIN ? {} : { userId: requester.userId };
  return prisma.chatThread.findMany({
    where,
    include: { user: true, admin: true },
    orderBy: { updatedAt: 'desc' },
  });
};

export const attachAdminToThread = async (threadId: string, adminId: string) => {
  const thread = await prisma.chatThread.update({
    where: { id: threadId },
    data: { adminId },
  });

  return thread;
};

export const recordChatMessage = async (
  threadId: string,
  payload: { firebaseMessageId: string; senderId: string; preview: string },
) => {
  const thread = await prisma.chatThread.findUnique({ where: { id: threadId } });
  if (!thread) {
    throw new HttpError(404, 'Thread not found');
  }

  return prisma.chatMessage.create({
    data: {
      threadId,
      senderId: payload.senderId,
      preview: payload.preview,
      firebaseKey: payload.firebaseMessageId,
    },
  });
};