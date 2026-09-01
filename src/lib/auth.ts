import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
import { JWT_COOKIE_MAX_AGE } from './constants';

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}
const JWT_SECRET = process.env.JWT_SECRET;

/**
 * Fix #19: Generate DUMMY_HASH at module startup so the bcrypt cost factor
 * always matches the real user hash rounds. A static string would drift if
 * the cost factor is ever bumped.
 */
export const DUMMY_HASH = await bcrypt.hash(
  'dl_timing_guard_' + Math.random().toString(36),
  10
);

export const signToken = (userId: string, role: string) => {
  return jwt.sign({ userId, role }, JWT_SECRET, { expiresIn: '1d' });
};

export const verifyToken = (token: string) => {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: string; role: string };
  } catch {
    return null;
  }
};

export const getUserSession = async () => {
  const cookieStore = await cookies();
  const token = cookieStore.get('dl_token')?.value;
  if (!token) return null;
  return verifyToken(token);
};

/** Cookie options enforced consistently across all auth routes */
export const AUTH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: '/',
  maxAge: JWT_COOKIE_MAX_AGE, // Fix #13: align cookie lifetime with JWT expiry (1 day)
};
