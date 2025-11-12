import { createApp } from '../src/app';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const app = createApp();

export default function handler(req: VercelRequest, res: VercelResponse) {
  return app(req as any, res as any);
}
