import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth';
import { createPaper } from '@/lib/storage';
import { errorResponse, readJson, sameOrigin } from '@/lib/http';

export async function POST(request: NextRequest) {
  try {
    sameOrigin(request); await requireAdmin();
    const { projectId } = z.object({ projectId: z.uuid().nullable().default(null) }).parse(await readJson(request));
    return NextResponse.json(await createPaper(projectId), { status: 201 });
  } catch (error) { return errorResponse(error); }
}
