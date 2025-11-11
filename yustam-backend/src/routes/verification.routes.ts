import type { Express } from 'express';
import { Router } from 'express';
import { Role, VerificationStatus } from '@prisma/client';
import { z } from 'zod';
import { authenticate, requireRole } from '../middleware/auth';
import {
  getLatestVerificationRequest,
  listVerificationRequests,
  submitVerificationRequest,
  updateVerificationRequest,
} from '../services/verification.service';
import { upload } from '../middleware/upload';
import { uploadBufferToCloudinary } from '../utils/cloudinary';

const router = Router();

router.use(authenticate);

router.get('/', requireRole([Role.VENDOR, Role.ADMIN]), async (req, res, next) => {
  try {
    const request = await getLatestVerificationRequest(req.authUser!.userId);
    res.json({ request });
  } catch (error) {
    next(error);
  }
});

router.post('/', requireRole([Role.VENDOR, Role.ADMIN]), upload.array('documents', 5), async (req, res, next) => {
  try {
    const files = req.files as Express.Multer.File[];
    const provided = Array.isArray(req.body.documents)
      ? req.body.documents
      : typeof req.body.documents === 'string' && req.body.documents.trim().startsWith('[')
        ? JSON.parse(req.body.documents)
        : [];

    let documents: { type: string; url: string }[] = provided;

    if (files?.length) {
      const docTypesRaw = req.body.documentTypes;
      const docTypes = Array.isArray(docTypesRaw)
        ? docTypesRaw
        : typeof docTypesRaw === 'string'
          ? docTypesRaw.split(',').map((item) => item.trim())
          : [];

      documents = (
        await Promise.all(
          files.map(async (file, index) => {
            const uploaded = await uploadBufferToCloudinary(file.buffer, 'yustam/vendor-verifications');
            return {
              type: docTypes[index] ?? 'document',
              url: uploaded.url,
            };
          }),
        )
      ).concat(documents ?? []);
    }

    const payload = z.object({ notes: z.string().optional() }).parse(req.body);

    const request = await submitVerificationRequest(req.authUser!.userId, documents, payload.notes);
    res.status(201).json({ request });
  } catch (error) {
    next(error);
  }
});

router.get('/requests', requireRole(Role.ADMIN), async (_req, res, next) => {
  try {
    const requests = await listVerificationRequests();
    res.json({ requests });
  } catch (error) {
    next(error);
  }
});

router.patch('/requests/:id', requireRole(Role.ADMIN), async (req, res, next) => {
  try {
    const payload = z
      .object({ status: z.nativeEnum(VerificationStatus), notes: z.string().optional() })
      .parse(req.body);
    const request = await updateVerificationRequest(req.params.id, payload.status, req.authUser!.userId, payload.notes);
    res.json({ request });
  } catch (error) {
    next(error);
  }
});

export default router;