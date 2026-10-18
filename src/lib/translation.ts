import { z } from 'zod';
import { cleanHtml, plainText } from './content';
import { AppError } from './errors';
import type { ArticleLanguage, ArticleTranslations } from './types';

const translationSchema = z.object({
  title: z.string().trim().max(240),
  summary: z.string().trim().max(600),
  html: z.string().max(1_500_000),
}).strict();
export const translationsSchema = z.object({
  sq: translationSchema.optional(), mk: translationSchema.optional(), en: translationSchema.optional(),
}).strict();

export function cleanTranslations(translations: ArticleTranslations = {}): ArticleTranslations {
  return Object.fromEntries(Object.entries(translations).map(([language, content]) => [language, { ...content, html: cleanHtml(content.html) }]));
}

export function publicationTranslations(translations: ArticleTranslations = {}, source: ArticleLanguage): ArticleTranslations {
  const cleaned = cleanTranslations(translations);
  for (const [language, content] of Object.entries(cleaned)) {
    if (language === source) throw new AppError('translationLanguageConflict');
    if (!content.title.trim() || !plainText(content.html)) throw new AppError('translationIncomplete');
  }
  return cleaned;
}
