'use client';

import { Download, ArrowUpRight } from 'lucide-react';
import { cleanHtml, plainText, readingMinutes } from '@/lib/content';
import { dateLabel } from '@/lib/i18n';
import type { PublicPaper } from '@/lib/types';
import { useLanguage } from './language-provider';

export function PaperReader({ paper, projectName, draft = false }: { paper: PublicPaper; projectName?: string; draft?: boolean }) {
  const { language, t } = useLanguage();
  const fileUrl = `/api/files/${paper.id}${draft ? '?draft=1' : ''}`;
  return <article className="paper-reader">
    <header className="paper-heading">
      <div className="eyebrow red-text">{projectName || t.independent}</div>
      <h1>{paper.title || t.untitled}</h1>
      {paper.summary && <p className="paper-summary">{paper.summary}</p>}
      <div className="paper-byline"><span>{t.by} <strong>{paper.author || '—'}</strong></span><span>{dateLabel(paper.publishedAt, language)}</span>
        {plainText(paper.html) && <span>{readingMinutes(paper.html)} {t.minutes}</span>}
      </div>
    </header>
    {paper.html && <div className="prose" dangerouslySetInnerHTML={{ __html: cleanHtml(paper.html) }} />}
    {paper.attachment && <section className="pdf-section" aria-label={t.attachment}>
      <div className="pdf-actions"><span className="file-name">{paper.attachment.name}</span><div>
        <a href={fileUrl} target="_blank" rel="noreferrer" className="text-link">{t.openPdf} <ArrowUpRight size={14} /></a>
        <a href={`${fileUrl}${draft ? '&' : '?'}download=1`} className="text-link"><Download size={14} />{t.downloadPdf}</a>
      </div></div>
      <iframe title={paper.attachment.name} src={fileUrl} className="pdf-frame" loading="lazy" />
      <p className="muted small-text">{t.pdfFallback}</p>
    </section>}
    <div className="article-end" aria-hidden="true">■</div>
  </article>;
}
