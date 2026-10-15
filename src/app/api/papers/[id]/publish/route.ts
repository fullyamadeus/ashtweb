import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth';
import { getPaper, pruneAttachments, replacePaper } from '@/lib/storage';
import { errorResponse, readJson, sameOrigin } from '@/lib/http';
import { AppError } from '@/lib/errors';
import { cleanHtml, plainText } from '@/lib/content';

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    sameOrigin(request); await requireAdmin();
    const id = z.uuid().parse((await context.params).id);
    const { revision, action } = z.object({ revision: z.number().int().positive(), action: z.enum(['publish', 'unpublish']) }).parse(await readJson(request));
    const paper = await getPaper(id);
    if (!paper) throw new AppError('notFound', 404);
    if (paper.revision !== revision) throw new AppError('conflict', 409);
    let published = null;
    if (action === 'publish') {
      if (!paper.title.trim() || !paper.author.trim()) throw new AppError('requiredPublish');
      const html = cleanHtml(paper.html);
      if (!plainText(html) && !paper.attachment) throw new AppError('contentRequired');
      published = {
        title: paper.title, author: paper.author, summary: paper.summary, html,
        projectId: paper.projectId, attachment: paper.attachment, publishedAt: new Date().toISOString(),
      };
    }
    const next = await replacePaper({ ...paper, published }, revision);
    await pruneAttachments(paper, next);
    return NextResponse.json(next);
  } catch (error) { return errorResponse(error); }
}
