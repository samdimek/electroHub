import { PrismaClient } from '@prisma/client';

// Serverless functions can spin up many isolated instances; caching the
// client on `globalThis` in dev prevents exhausting Postgres connections
// during hot-reload. In production each function invocation gets its own
// cold-started client, which is the standard Prisma-on-serverless pattern.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;
