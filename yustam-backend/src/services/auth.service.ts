import { Role } from '@prisma/client';
import { getFirebaseAuth } from '../config/firebase';
import { env } from '../config/env';
import { prisma } from '../db/client';
import { signAppToken } from '../utils/token';

export interface RegisterInput {
  email: string;
  password: string;
  displayName?: string;
  phoneNumber?: string;
  role?: Role;
}

export const registerUser = async (input: RegisterInput) => {
  const auth = getFirebaseAuth();

  const firebaseUser = await auth.createUser({
    email: input.email,
    password: input.password,
    displayName: input.displayName,
    phoneNumber: input.phoneNumber,
  });

  const dbUser = await prisma.user.create({
    data: {
      firebaseUid: firebaseUser.uid,
      email: firebaseUser.email!,
      displayName: firebaseUser.displayName ?? input.displayName,
      phone: firebaseUser.phoneNumber ?? input.phoneNumber,
      role: input.role ?? Role.BUYER,
    },
  });

  return { firebaseUser, dbUser };
};

export const createSessionFromIdToken = async (idToken: string) => {
  const auth = getFirebaseAuth();
  const decoded = await auth.verifyIdToken(idToken);

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
      role: decoded.email === env.DEFAULT_ADMIN_EMAIL ? Role.ADMIN : Role.BUYER,
    },
  });

  const token = signAppToken({ userId: user.id, role: user.role });

  return { user, token };
};

export const updateProfile = async (userId: string, data: { displayName?: string; phone?: string; photoUrl?: string }) => {
  const user = await prisma.user.update({
    where: { id: userId },
    data,
  });

  if (data.displayName || data.photoUrl) {
    await getFirebaseAuth().updateUser(user.firebaseUid, {
      displayName: data.displayName ?? undefined,
      photoURL: data.photoUrl ?? undefined,
      phoneNumber: data.phone ?? undefined,
    });
  }

  return user;
};

export const listUsers = async () => prisma.user.findMany({ orderBy: { createdAt: 'desc' } });
