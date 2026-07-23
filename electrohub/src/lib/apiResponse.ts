import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { AuthError } from './auth';

/**
 * Central error → HTTP response translator. Every API route wraps its
 * body in this so error shapes are consistent and so nothing ever
 * leaks a raw stack trace / SQL error to the client (Prisma errors are
 * caught generically and returned as a plain 500).
 */
export async function withApiErrorHandling(fn: () => Promise<NextResponse>): Promise<NextResponse> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof AuthError) {
      const status = err.code === 'UNAUTHENTICATED' ? 401 : err.code === 'LOCKED' ? 423 : 403;
      return NextResponse.json({ error: err.message }, { status });
    }
    if (err instanceof ZodError) {
      return NextResponse.json({ error: 'Validation failed', issues: err.flatten() }, { status: 422 });
    }
    if (err instanceof ApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }

    console.error(err);
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export function ok<T>(data: T, init?: number) {
  return NextResponse.json(data, { status: init ?? 200 });
}
