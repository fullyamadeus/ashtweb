'use client';

import { useState } from 'react';
import { articleLanguages, type ArticleLanguage } from '@/lib/types';
import { Download, ArrowUpRight } from 'lucide-react';
import { cleanHtml, plainText, readingMinutes } from '@/lib/content';
import { dateLabel } from '@/lib/i18n';
import type { PublicPaper } from '@/lib/types';
import { useLanguage } from './language-provider';

export function PaperReader({ paper, projectName, draft = false, initialLanguage }: { initialLanguage?: ArticleLanguage; paper: PublicPaper; projectName?: string; draft?: boolean }) {
  return <Reader key={JSON.stringify([paper.id, paper.title, paper.summary, paper.html, paper.originalLanguage, paper.translations, draft, initialLanguage])} paper={paper} projectName={projectName} draft={draft} initialLanguage={initialLanguage} />;
}

function Reader({ paper, projectName, draft, initialLanguage }: { initialLanguage?: ArticleLanguage; paper: PublicPaper; projectName?: string; draft: boolean }) {
  const { language, t } = useLanguage();
  const source = paper.originalLanguage;
  const [selected, setSelected] = useState(initialLanguage || source || '');
  const translated = selected && selected !== source ? paper.translations?.[selected as ArticleLanguage] : undefined;
  const display = translated || paper;
  const displayLanguage = translated ? selected : source;
  const fileUrl = `/api/files/${paper.id}${draft ? '?draft=1' : ''}`;
  return <article className="paper-reader">
    <header className="paper-heading">
      <div className="eyebrow red-text">{projectName || t.independent}</div>
      <h1 lang={displayLanguage || undefined}>{display.title || t.untitled}</h1>
      {display.summary && <p lang={displayLanguage || undefined} className="paper-summary">{display.summary}</p>}
      <div className="paper-byline"><span>{t.by} <strong>{paper.author || '—'}</strong></span><span>{dateLabel(paper.publishedAt, language)}</span>
        {plainText(display.html) && <span>{readingMinutes(display.html)} {t.minutes}</span>}
      </div>
      <div className="article-translation">
        <span>{t.originalLanguage}: <strong>{source ? articleLanguages[source] : t.languageUnknown}</strong></span>
        {source && <label>{t.translateArticle}<select aria-label={t.translateArticle} value={selected} onChange={e => setSelected(e.target.value as ArticleLanguage)}>
          {Object.entries(articleLanguages).filter(([code]) => code === source || paper.translations?.[code as ArticleLanguage]).map(([code, name]) => <option key={code} value={code}>{name}{code === source ? ` (${t.original})` : ''}</option>)}
        </select></label>}
        {paper.attachment && <p className="small-text muted">{t.pdfTranslationNote}</p>}
      </div>
    </header>
    {display.html && <div lang={displayLanguage || undefined} className="prose" dangerouslySetInnerHTML={{ __html: cleanHtml(display.html) }} />}
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
