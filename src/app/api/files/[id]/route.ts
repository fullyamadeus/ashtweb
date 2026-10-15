import { NextRequest } from 'next/server';
import { z } from 'zod';
import { isAdmin } from '@/lib/auth';
import { downloadFile, getPaper, getPublicPaper } from '@/lib/storage';
import { errorResponse } from '@/lib/http';
import { AppError } from '@/lib/errors';

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const parsed = z.uuid().safeParse((await context.params).id);
    if (!parsed.success) throw new AppError('notFound', 404);
    const draft = request.nextUrl.searchParams.get('draft') === '1';
    // Check access on every request; no public bucket or long-lived signed URL can expose a withdrawn draft.
    if (draft && !await isAdmin()) throw new AppError('notFound', 404);
    const paper = draft ? await getPaper(parsed.data) : await getPublicPaper(parsed.data);
    const file = paper?.attachment;
    if (!file) throw new AppError('notFound', 404);
    const download = request.nextUrl.searchParams.get('download') === '1';
    return new Response(await downloadFile(file.key), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `${download ? 'attachment' : 'inline'}; filename="document.pdf"; filename*=UTF-8''${encodeURIComponent(file.name).replace(/'/g, '%27')}`,
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
        'Content-Security-Policy': "sandbox; default-src 'none'",
        'X-Robots-Tag': 'noindex',
      },
    });
  } catch (error) { return errorResponse(error); }
}
