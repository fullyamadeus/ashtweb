import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth';
import { deleteProject, listPapers, saveProject } from '@/lib/storage';
import { errorResponse, readJson, sameOrigin } from '@/lib/http';

type Context = { params: Promise<{ id: string }> };
export async function PATCH(request: NextRequest, context: Context) {
  try {
    sameOrigin(request); await requireAdmin();
    const id = z.uuid().parse((await context.params).id);
    const { name } = z.object({ name: z.string().trim().min(1).max(100) }).parse(await readJson(request));
    return NextResponse.json(await saveProject(name, id));
  } catch (error) { return errorResponse(error); }
}
export async function DELETE(request: NextRequest, context: Context) {
  try {
    sameOrigin(request); await requireAdmin();
    const id = z.uuid().parse((await context.params).id);
    await deleteProject(id);
    return NextResponse.json({ papers: await listPapers() });
  } catch (error) { return errorResponse(error); }
}
