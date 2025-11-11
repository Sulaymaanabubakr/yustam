import { createApp } from './app';
import { env } from './config/env';
import { prisma } from './db/client';

const app = createApp();
const port = Number(env.PORT);

const server = app.listen(port, () => {
  console.log(`🚀 Yustam API listening on port ${port}`);
});

process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
});