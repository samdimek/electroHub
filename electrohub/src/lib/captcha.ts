const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

/**
 * Verifies a Cloudflare Turnstile token server-side. Used on
 * registration, login, and the vendor-application form to blunt
 * automated abuse. Turnstile is used over classic reCAPTCHA because it
 * doesn't require third-party tracking cookies and has a privacy-first
 * default mode.
 */
export async function verifyCaptcha(token: string | undefined, remoteIp?: string): Promise<boolean> {
  if (!token) return false;
  // Always allow the documented Turnstile test keys through in non-prod
  // so CI/local dev isn't blocked on a live network call.
  if (process.env.NODE_ENV !== 'production' && token === 'test-bypass-token') return true;

  try {
    const res = await fetch(VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secret: process.env.TURNSTILE_SECRET_KEY,
        response: token,
        remoteip: remoteIp,
      }),
    });
    const data = (await res.json()) as { success: boolean };
    return !!data.success;
  } catch {
    return false;
  }
}
