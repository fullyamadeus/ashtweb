import { NextRequest, NextResponse } from 'next/server';
import { createHmac } from 'node:crypto';
import { z } from 'zod';
import { authConfigured, COOKIE_NAME, createSession, SESSION_SECONDS, validCredentials } from '@/lib/auth';
import { consumeLoginAttempt } from '@/lib/storage';
import { AppError } from '@/lib/errors';
import { errorResponse, readJson, sameOrigin } from '@/lib/http';

export async function POST(request: NextRequest) {
  try {
    sameOrigin(request);
    if (!authConfigured()) throw new AppError('loginSetup', 503);
    const { username, password } = z.object({ username: z.string().max(100), password: z.string().max(1024) }).parse(await readJson(request));
    // Vercel overwrites x-forwarded-for. Other hosts use one shared bucket unless adapted to their trusted proxy.
    const ip = process.env.VERCEL ? request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown' : 'local';
    const key = createHmac('sha256', process.env.SESSION_SECRET!).update(ip).digest('hex');
    if (!await consumeLoginAttempt(key)) throw new AppError('loginRate', 429);
    if (!validCredentials(username, password)) throw new AppError('loginError', 401);
    const response = NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
    response.cookies.set(COOKIE_NAME, await createSession(), {
      httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax',
      path: '/', maxAge: SESSION_SECONDS,
    });
    return response;
  } catch (error) { return errorResponse(error); }
}
