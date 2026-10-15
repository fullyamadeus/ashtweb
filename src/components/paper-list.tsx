'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Search, X, Feather } from 'lucide-react';
import type { Project, PublicPaper } from '@/lib/types';
import { dateLabel } from '@/lib/i18n';
import { plainText, readingMinutes } from '@/lib/content';
import { useLanguage } from './language-provider';

export function PaperList({ papers, projects }: { papers: PublicPaper[]; projects: Project[] }) {
  const { language, t } = useLanguage();
  const [query, setQuery] = useState('');
  const results = papers.filter(p => `${p.title} ${p.author} ${p.summary}`.toLowerCase().includes(query.toLowerCase()));
  return <section className="latest-section page-width" aria-labelledby="recent-heading">
    <div className="section-heading"><div><div className="eyebrow red-text">{t.publications}</div><h1 id="recent-heading">{t.recent}</h1></div>
      <span className="publication-count">{String(papers.length).padStart(2, '0')} <span>{t.papers}</span></span>
    </div>
    {papers.length > 0 && <div className="archive-tools"><span className="eyebrow">{t.publishedPapers}</span><label className="search-box"><Search size={15}/><input aria-label={t.search} value={query} onChange={e => setQuery(e.target.value)} placeholder={t.search}/>{query && <button aria-label={t.clearSearch} onClick={() => setQuery('')}><X size={14}/></button>}</label></div>}
    {papers.length === 0 ? <div className="journal-empty"><Feather size={30} strokeWidth={1}/><h2>{t.noPapers}</h2><p>{t.noPapersDetail}</p><span className="empty-rule" /></div>
      : results.length === 0 ? <div className="search-empty">{t.noResults}</div>
      : <div className="paper-list">{results.map((paper, index) => <Link href={`/papers/${paper.id}`} key={paper.id} className={`paper-list-item ${index === 0 && !query ? 'lead-paper' : ''}`}>
        <div className="paper-index">{String(index + 1).padStart(2, '0')}</div>
        <div className="paper-card-body"><div className="eyebrow red-text">{projects.find(p => p.id === paper.projectId)?.name || t.independent}</div>
          <h2>{paper.title}</h2><p>{paper.summary || plainText(paper.html).slice(0, 220) + (plainText(paper.html).length > 220 ? '…' : '')}</p>
          <div className="card-byline"><span>{paper.author}</span><span>{dateLabel(paper.publishedAt, language)}</span></div>
        </div>
        <div className="paper-card-aside"><ArrowUpRight size={25} strokeWidth={1.3}/><span>{paper.attachment ? 'PDF' : `${readingMinutes(paper.html)} ${t.minutes}`}</span></div>
      </Link>)}</div>}
  </section>;
}
