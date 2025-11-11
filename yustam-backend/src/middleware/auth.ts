import type { NextFunction, Request, Response } from 'express';
import { Role } from '@prisma/client';
import { getFirebaseAuth } from '../config/firebase';
import { prisma } from '../db/client';
import { HttpError } from './error-handler';

export const authenticate = async (req: Request, _res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new HttpError(401, 'Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const decoded = await getFirebaseAuth().verifyIdToken(token);

    const user = await prisma.user.upsert({
      where: { firebaseUid: decoded.uid },
      update: {
        email: decoded.email ?? undefined,
        displayName: decoded.name ?? undefined,
        photoUrl: decoded.picture ?? undefined,
      },
      create: {
        firebaseUid: decoded.uid,
        email: decoded.email ?? `${decoded.uid}@placeholder.yustam`,
        displayName: decoded.name,
        photoUrl: decoded.picture,
      },
    });

    req.authUser = {
      uid: decoded.uid,
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    next();
  } catch (error) {
    const message = error instanceof HttpError ? error.message : 'Invalid or expired token';
    next(new HttpError(401, message));
  }
};

export const requireRole = (roles: Role | Role[]) => {
  const allowed = Array.isArray(roles) ? roles : [roles];
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.authUser) {
      return next(new HttpError(401, 'Not authenticated'));
    }

    if (!allowed.includes(req.authUser.role)) {
      return next(new HttpError(403, 'Insufficient permissions'));
    }

    return next();
  };
};