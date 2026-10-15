import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth';
import { getPaper, pruneAttachments, removeFiles, replacePaper, uploadFile } from '@/lib/storage';
import { errorResponse, sameOrigin } from '@/lib/http';
import { AppError } from '@/lib/errors';

export const maxDuration = 30;
export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    sameOrigin(request); await requireAdmin();
    const id = z.uuid().parse((await context.params).id);
    if (Number(request.headers.get('content-length') || 0) > 4_300_000) throw new AppError('uploadError', 413);
    const form = await request.formData();
    const file = form.get('file');
    const revision = z.coerce.number().int().positive().parse(form.get('revision'));
    if (!(file instanceof File) || !file.name.toLowerCase().endsWith('.pdf') || file.size > 4_000_000 || file.size < 5) throw new AppError('uploadError');
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (new TextDecoder().decode(bytes.slice(0, 5)) !== '%PDF-') throw new AppError('uploadError');
    const paper = await getPaper(id);
    if (!paper) throw new AppError('notFound', 404);
    if (paper.revision !== revision) throw new AppError('conflict', 409);
    const key = `${randomUUID()}.pdf`;
    await uploadFile(key, bytes);
    let next;
    try {
      next = await replacePaper({ ...paper, attachment: { key, name: file.name.slice(0, 240), size: file.size, type: 'application/pdf' } }, revision);
    } catch (error) { await removeFiles([key]).catch(() => {}); throw error; }
    await pruneAttachments(paper, next);
    return NextResponse.json(next);
  } catch (error) { return errorResponse(error); }
}
