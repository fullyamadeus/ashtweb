import 'server-only';
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { AppError } from './errors';

export const COOKIE_NAME = 'asht-session';
export const SESSION_SECONDS = 60 * 60 * 12;
const digest = (value: string) => createHash('sha256').update(value).digest();
export function authConfigured() {
  return !!process.env.ADMIN_USERNAME && (process.env.ADMIN_PASSWORD?.length || 0) >= 12 && (process.env.SESSION_SECRET?.length || 0) >= 32;
}
function secret() {
  if (!authConfigured()) throw new AppError('loginSetup', 503);
  return new TextEncoder().encode(process.env.SESSION_SECRET!);
}
function credentialVersion() {
  return createHmac('sha256', process.env.SESSION_SECRET!).update(`${process.env.ADMIN_USERNAME}\0${process.env.ADMIN_PASSWORD}`).digest('hex');
}
export function validCredentials(username: string, password: string) {
  if (!authConfigured()) throw new AppError('loginSetup', 503);
  const userMatch = timingSafeEqual(digest(username), digest(process.env.ADMIN_USERNAME!));
  const passwordMatch = timingSafeEqual(digest(password), digest(process.env.ADMIN_PASSWORD!));
  return userMatch && passwordMatch;
}
export async function createSession() {
  return new SignJWT({ role: 'admin', version: credentialVersion() })
    .setProtectedHeader({ alg: 'HS256' }).setIssuedAt().setExpirationTime(`${SESSION_SECONDS}s`)
    .setIssuer('asht').setAudience('asht-admin').sign(secret());
}
export async function isAdmin() {
  if (!authConfigured()) return false;
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, secret(), { issuer: 'asht', audience: 'asht-admin', algorithms: ['HS256'] });
    return payload.role === 'admin' && payload.version === credentialVersion();
  } catch { return false; }
}
export async function requireAdmin() {
  if (!await isAdmin()) throw new AppError('sessionExpired', 401);
}
