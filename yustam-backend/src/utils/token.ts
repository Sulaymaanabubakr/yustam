import jwt from 'jsonwebtoken';
import { env } from '../config/env';

interface TokenPayload {
  userId: string;
  role: string;
}

export const signAppToken = (payload: TokenPayload) => {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: '7d' });
};

export const verifyAppToken = (token: string) => {
  return jwt.verify(token, env.JWT_SECRET) as TokenPayload;
};