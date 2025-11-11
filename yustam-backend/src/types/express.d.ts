import type { Role } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      authUser?: {
        uid: string;
        userId: string;
        email: string;
        role: Role;
      };
    }
  }
}

export {};