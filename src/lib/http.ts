import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { AppError } from './errors';
import { StorageError } from './storage-diagnostics';

export function sameOrigin(request: NextRequest) {
  const origin = request.headers.get('origin');
  // All browser writes, including sign-in, must originate from this site.
  // NextURL normalizes loopback addresses to localhost; the Host header retains the browser's actual origin.
  const host = request.headers.get('host');
  if (!origin || !host || origin !== `${request.nextUrl.protocol}//${host}`) throw new AppError('failed', 403);
}
export async function readJson(request: NextRequest) {
  const size = Number(request.headers.get('content-length') || 0);
  if (size > 2_000_000) throw new AppError('failed', 413);
  const body = await request.text();
  if (Buffer.byteLength(body) > 2_000_000) throw new AppError('failed', 413);
  try { return JSON.parse(body); } catch { throw new AppError('failed'); }
}
export function errorResponse(error: unknown) {
  if (error instanceof StorageError) console.warn(`[ASHT storage] ${error.message}`);
  const known = error instanceof AppError;
  const status = known ? error.status : error instanceof ZodError ? 400 : 500;
  if (status === 500) console.error('Request failed:', error instanceof Error ? error.message : 'Unknown error');
  return NextResponse.json({ error: known ? error.code : 'failed' }, { status, headers: { 'Cache-Control': 'no-store' } });
}
