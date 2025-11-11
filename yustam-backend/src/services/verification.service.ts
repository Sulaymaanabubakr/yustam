import { VerificationStatus } from '@prisma/client';
import { prisma } from '../db/client';
import { HttpError } from '../middleware/error-handler';
import { ensureVendorProfile } from './vendor.service';

export const getLatestVerificationRequest = async (userId: string) => {
  return prisma.verificationRequest.findFirst({
    where: { userId },
    orderBy: { submittedAt: 'desc' },
    include: { documents: true },
  });
};

interface VerificationDocumentInput {
  type: string;
  url: string;
}

export const submitVerificationRequest = async (userId: string, documents: VerificationDocumentInput[], notes?: string) => {
  if (!documents.length) {
    throw new HttpError(400, 'At least one document is required');
  }
  await ensureVendorProfile(userId);
  const request = await prisma.verificationRequest.create({
    data: {
      userId,
      status: VerificationStatus.PENDING,
      notes,
      documents: {
        createMany: {
          data: documents.map((doc) => ({ type: doc.type, url: doc.url })),
        },
      },
    },
    include: { documents: true },
  });

  await prisma.vendorProfile.update({ where: { userId }, data: { verificationStatus: VerificationStatus.PENDING, verificationSubmittedAt: new Date() } });

  return request;
};

export const listVerificationRequests = async () => {
  return prisma.verificationRequest.findMany({ include: { user: true, documents: true }, orderBy: { submittedAt: 'desc' } });
};

export const updateVerificationRequest = async (requestId: string, status: VerificationStatus, reviewerId: string, notes?: string) => {
  const request = await prisma.verificationRequest.update({
    where: { id: requestId },
    data: { status, reviewerId, reviewedAt: new Date(), notes },
    include: { user: true, documents: true },
  });

  await prisma.vendorProfile.update({ where: { userId: request.userId }, data: { verificationStatus: status, verificationReviewedAt: new Date(), verificationNotes: notes } });

  return request;
};