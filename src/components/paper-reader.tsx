'use client';

import { useEffect, useRef, useState } from 'react';
import { articleLanguages, type ArticleLanguage } from '@/lib/types';
import { translateArticle } from '@/lib/translation';
import { Download, ArrowUpRight } from 'lucide-react';
import { cleanHtml, plainText, readingMinutes } from '@/lib/content';
import { dateLabel } from '@/lib/i18n';
import type { PublicPaper } from '@/lib/types';
import { useLanguage } from './language-provider';

export function PaperReader({ paper, projectName, draft = false }: { paper: PublicPaper; projectName?: string; draft?: boolean }) {
  return <Reader key={JSON.stringify([paper.id, paper.title, paper.summary, paper.html, paper.originalLanguage, draft])} paper={paper} projectName={projectName} draft={draft} />;
}

function Reader({ paper, projectName, draft }: { paper: PublicPaper; projectName?: string; draft: boolean }) {
  const { language, t } = useLanguage();
  const source = paper.originalLanguage;
  const [selected, setSelected] = useState(source || '');
  const [display, setDisplay] = useState({ title: paper.title, summary: paper.summary, html: paper.html });
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);
  const [fallbackUrl, setFallbackUrl] = useState('');
  const [displayLanguage, setDisplayLanguage] = useState(source);
  const request = useRef<AbortController | null>(null);
  const cache = useRef(new Map<ArticleLanguage, typeof display>());
  useEffect(() => () => request.current?.abort(), []);

  async function selectLanguage(target: ArticleLanguage) {
    request.current?.abort();
    setSelected(target); setFailed(false); setPending(false); setFallbackUrl('');
    if (!source || draft) return;
    if (target === source) {
      setDisplay({ title: paper.title, summary: paper.summary, html: paper.html });
      setDisplayLanguage(source); return;
    }
    const cached = cache.current.get(target);
    if (cached) { setDisplay(cached); setDisplayLanguage(target); return; }
    const controller = new AbortController();
    request.current = controller;
    setPending(true);
    try {
      const translated = await translateArticle(paper, source, target, controller.signal);
      if (controller.signal.aborted) return;
      cache.current.set(target, translated); setDisplay(translated); setDisplayLanguage(target);
    } catch {
      if (!controller.signal.aborted) {
        setFailed(true); setSelected(displayLanguage || source);
        const url = new URL('https://translate.google.com/translate');
        url.searchParams.set('sl', source); url.searchParams.set('tl', target);
        url.searchParams.set('u', new URL(`/papers/${paper.id}`, window.location.origin).href);
        setFallbackUrl(url.href);
      }
    } finally {
      if (!controller.signal.aborted) setPending(false);
    }
  }
  const fileUrl = `/api/files/${paper.id}${draft ? '?draft=1' : ''}`;
  return <article className="paper-reader">
    <header className="paper-heading">
      <div className="eyebrow red-text">{projectName || t.independent}</div>
      <h1 lang={displayLanguage || undefined}>{display.title || t.untitled}</h1>
      {display.summary && <p lang={displayLanguage || undefined} className="paper-summary">{display.summary}</p>}
      <div className="paper-byline"><span>{t.by} <strong>{paper.author || '—'}</strong></span><span>{dateLabel(paper.publishedAt, language)}</span>
        {plainText(paper.html) && <span>{readingMinutes(paper.html)} {t.minutes}</span>}
      </div>
      <div className="article-translation">
        <span>{t.originalLanguage}: <strong>{source ? articleLanguages[source] : t.languageUnknown}</strong></span>
        {!draft && source && <label>{t.translateArticle}<select aria-label={t.translateArticle} value={selected} onChange={e => void selectLanguage(e.target.value as ArticleLanguage)}>
          {Object.entries(articleLanguages).map(([code, name]) => <option key={code} value={code}>{name}{code === source ? ` (${t.original})` : ''}</option>)}
        </select></label>}
        {!draft && source && <p className="small-text muted">{t.translationNote}</p>}
        {paper.attachment && <p className="small-text muted">{t.pdfTranslationNote}</p>}
        <p className="small-text" role="status">{pending ? t.translating : displayLanguage !== source ? t.translatedNote : ''}</p>
        {failed && <p className="small-text red-text" role="alert">{t.translationFailed} {fallbackUrl && <a className="text-link" href={fallbackUrl} target="_blank" rel="noopener noreferrer">{t.googleTranslation} <ArrowUpRight size={14} /></a>}</p>}
      </div>
    </header>
    {display.html && <div lang={displayLanguage || undefined} className="prose" aria-busy={pending} dangerouslySetInnerHTML={{ __html: cleanHtml(display.html) }} />}
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
