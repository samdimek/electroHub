import bcrypt from 'bcryptjs';

// bcryptjs is a pure-JavaScript implementation — no native binary, so it
// needs no special bundler configuration and behaves identically in any
// Node.js environment (local, Docker, Vercel serverless). This replaces
// an earlier native (Rust/NAPI) implementation that required a webpack
// externals exemption — which is the leading suspect for the build
// failures we've been chasing.
const SALT_ROUNDS = 12;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export async function verifyPassword(plain: string, hashed: string): Promise<boolean> {
  try {
    return await bcrypt.compare(plain, hashed);
  } catch {
    return false;
  }
}

export function isPasswordStrongEnough(plain: string): boolean {
  if (plain.length < 10) return false;
  const hasLower = /[a-z]/.test(plain);
  const hasUpper = /[A-Z]/.test(plain);
  const hasDigit = /[0-9]/.test(plain);
  const hasSymbol = /[^a-zA-Z0-9]/.test(plain);
  const varietyCount = [hasLower, hasUpper, hasDigit, hasSymbol].filter(Boolean).length;
  return varietyCount >= 3;
}
