import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth';
import { deletePaper, getPaper, pruneAttachments, replacePaper } from '@/lib/storage';
import { errorResponse, readJson, sameOrigin } from '@/lib/http';
import { AppError } from '@/lib/errors';
import { translationsSchema, cleanTranslations } from '@/lib/translation';
import { cleanHtml } from '@/lib/content';

type Context = { params: Promise<{ id: string }> };
const revisionSchema = z.number().int().positive();
export async function PATCH(request: NextRequest, context: Context) {
  try {
    sameOrigin(request); await requireAdmin();
    const id = z.uuid().parse((await context.params).id);
    const input = z.object({
      translations: translationsSchema.optional(),
      originalLanguage: z.enum(['sq', 'mk', 'en']).nullable().optional(),
      title: z.string().trim().max(240), author: z.string().trim().max(160),
      summary: z.string().trim().max(600), html: z.string().max(1_500_000),
      projectId: z.uuid().nullable(), revision: revisionSchema,
      removeAttachment: z.boolean().optional(),
    }).parse(await readJson(request));
    const paper = await getPaper(id);
    if (!paper) throw new AppError('notFound', 404);
    const { revision, removeAttachment, ...content } = input;
    const translations = cleanTranslations(content.translations ?? paper.translations);
    const source = content.originalLanguage === undefined ? paper.originalLanguage : content.originalLanguage;
    if (source && translations[source]) throw new AppError('translationLanguageConflict');
    const next = await replacePaper({ ...paper, ...content, translations, html: cleanHtml(content.html), attachment: removeAttachment ? null : paper.attachment }, revision);
    await pruneAttachments(paper, next);
    return NextResponse.json(next);
  } catch (error) { return errorResponse(error); }
}
export async function DELETE(request: NextRequest, context: Context) {
  try {
    sameOrigin(request); await requireAdmin();
    const id = z.uuid().parse((await context.params).id);
    const { revision } = z.object({ revision: revisionSchema }).parse(await readJson(request));
    const paper = await getPaper(id);
    if (!paper) throw new AppError('notFound', 404);
    await deletePaper(id, revision);
    await pruneAttachments(paper);
    return NextResponse.json({ ok: true });
  } catch (error) { return errorResponse(error); }
}
