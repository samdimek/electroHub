import { hash, verify } from '@node-rs/argon2';

// @node-rs/argon2 ships prebuilt native binaries per-platform (unlike the
// `argon2` package, which compiles from source), which is what makes it
// reliable on Vercel's build/runtime images without extra build steps.
//
// Params below follow OWASP's current Argon2id guidance for a
// general-purpose web login (memory-hard, tuned for ~a few hundred ms
// per hash on serverless-class CPU).
const ARGON2_OPTIONS = {
  memoryCost: 19456, // 19 MiB
  timeCost: 2,
  outputLen: 32,
  parallelism: 1,
  algorithm: 2, // Argon2id
} as const;

export async function hashPassword(plain: string): Promise<string> {
  return hash(plain, ARGON2_OPTIONS);
}

export async function verifyPassword(plain: string, hashed: string): Promise<boolean> {
  try {
    return await verify(hashed, plain);
  } catch {
    return false;
  }
}

/** Minimum password policy, enforced server-side (never trust client-only checks). */
export function isPasswordStrongEnough(plain: string): boolean {
  if (plain.length < 10) return false;
  const hasLower = /[a-z]/.test(plain);
  const hasUpper = /[A-Z]/.test(plain);
  const hasDigit = /[0-9]/.test(plain);
  const hasSymbol = /[^a-zA-Z0-9]/.test(plain);
  const varietyCount = [hasLower, hasUpper, hasDigit, hasSymbol].filter(Boolean).length;
  return varietyCount >= 3;
}
