import { NextRequest, NextResponse } from 'next/server';
import { COOKIE_NAME } from '@/lib/auth';
import { errorResponse, sameOrigin } from '@/lib/http';

export async function POST(request: NextRequest) {
  try {
    sameOrigin(request);
    const response = NextResponse.json({ ok: true });
    response.cookies.set(COOKIE_NAME, '', { httpOnly: true, path: '/', maxAge: 0, sameSite: 'lax', secure: process.env.NODE_ENV === 'production' });
    return response;
  } catch (error) { return errorResponse(error); }
}
