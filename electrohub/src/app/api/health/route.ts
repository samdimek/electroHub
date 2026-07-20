import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { redis } from '@/lib/redis';

/**
 * Lightweight health check for uptime monitors / load balancers. Verifies
 * the app can reach both Postgres and Redis, not just that the process
 * is running.
 */
export async function GET() {
  const checks: Record<string, 'ok' | 'error'> = { db: 'ok', redis: 'ok' };

  try {
    await db.$queryRaw`SELECT 1`;
  } catch {
    checks.db = 'error';
  }

  try {
    await redis.ping();
  } catch {
    checks.redis = 'error';
  }

  const healthy = Object.values(checks).every((v) => v === 'ok');
  return NextResponse.json({ status: healthy ? 'ok' : 'degraded', checks }, { status: healthy ? 200 : 503 });
}
