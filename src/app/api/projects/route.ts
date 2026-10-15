import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth';
import { saveProject } from '@/lib/storage';
import { errorResponse, readJson, sameOrigin } from '@/lib/http';

export async function POST(request: NextRequest) {
  try {
    sameOrigin(request); await requireAdmin();
    const { name } = z.object({ name: z.string().trim().min(1).max(100) }).parse(await readJson(request));
    return NextResponse.json(await saveProject(name), { status: 201 });
  } catch (error) { return errorResponse(error); }
}
