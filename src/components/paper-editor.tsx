'use client';

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Check, Circle, Download, Eye, FileText, Paperclip, Save, Upload, X } from 'lucide-react';
import TurndownService from 'turndown';
import type { Paper, Project } from '@/lib/types';
import { articleLanguages, type ArticleLanguage, hasUnpublishedChanges } from '@/lib/types';
import { api, errorKey, RequestError } from '@/lib/client-api';
import { plainText } from '@/lib/content';
import type { MessageKey } from '@/lib/i18n';
import { useLanguage } from './language-provider';
import { RichEditor } from './rich-editor';
import { PaperReader } from './paper-reader';

export type EditorHandle = { save: () => Promise<Paper> };
type Props = {
  paper: Paper;
  projects: Project[];
  onSaved: (paper: Paper) => void;
  onPublish: () => void;
  onAttach: (file: File) => void;
  busy: boolean;
};

export const PaperEditor = forwardRef<EditorHandle, Props>(function PaperEditor({ paper, projects, onSaved, onPublish, onAttach, busy }, ref) {
  const { t } = useLanguage();
  const [working, setWorking] = useState(paper);
  const [mode, setMode] = useState<'write' | 'preview'>('write');
  const [status, setStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const [error, setError] = useState<MessageKey | null>(null);
  const [editTick, setEditTick] = useState(0);
  const workingRef = useRef(paper);
  const persisted = useRef(paper);
  const dirty = useRef(false);
  const version = useRef(0);
  const inFlight = useRef<Promise<Paper> | null>(null);
  const halted = useRef(false);
  const attachInput = useRef<HTMLInputElement>(null);

  function update(patch: Partial<Paper>) {
    const next = { ...workingRef.current, ...patch };
    workingRef.current = next; setWorking(next);
    dirty.current = true; version.current++;
    setStatus('unsaved'); setEditTick(value => value + 1);
  }

  async function save(): Promise<Paper> {
    if (inFlight.current) { await inFlight.current; return save(); }
    if (!dirty.current) return persisted.current;
    if (halted.current) throw new RequestError(error || 'conflict', 409);
    const snapshot = workingRef.current;
    const atVersion = version.current;
    setStatus('saving'); setError(null);
    const request = api<Paper>(`/api/papers/${paper.id}`, {
      method: 'PATCH', body: JSON.stringify({ title: snapshot.title, author: snapshot.author,
        originalLanguage: snapshot.originalLanguage ?? null, summary: snapshot.summary, html: snapshot.html, projectId: snapshot.projectId,
        revision: persisted.current.revision, removeAttachment: persisted.current.attachment !== null && snapshot.attachment === null }),
    }).then(saved => {
      persisted.current = saved;
      dirty.current = version.current !== atVersion;
      const next = dirty.current ? { ...workingRef.current, revision: saved.revision, updatedAt: saved.updatedAt } : saved;
      workingRef.current = next; setWorking(next); onSaved(saved);
      setStatus(dirty.current ? 'unsaved' : 'saved');
      return saved;
    }).catch(error => {
      const key = errorKey(error); setError(key); setStatus('unsaved');
      if (key === 'conflict' || key === 'sessionExpired') halted.current = true;
      throw error;
    }).finally(() => { inFlight.current = null; });
    inFlight.current = request;
    const saved = await request;
    return dirty.current ? save() : saved;
  }

  useImperativeHandle(ref, () => ({ save }));

  useEffect(() => {
    if (paper.revision > persisted.current.revision && !dirty.current && !inFlight.current) {
      persisted.current = paper; workingRef.current = paper; setWorking(paper); setError(null);
    }
  }, [paper]);

  useEffect(() => {
    if (!editTick || halted.current) return;
    const timer = setTimeout(() => { void save().catch(() => {}); }, 1000);
    return () => clearTimeout(timer);
    // Save reads current refs so typing during an in-flight request cannot overwrite newer edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editTick]);

  useEffect(() => {
    const beforeUnload = (e: BeforeUnloadEvent) => { if (dirty.current || inFlight.current) { e.preventDefault(); e.returnValue = ''; } };
    const keyboard = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); void save().catch(() => {}); } };
    window.addEventListener('beforeunload', beforeUnload); window.addEventListener('keydown', keyboard);
    return () => { window.removeEventListener('beforeunload', beforeUnload); window.removeEventListener('keydown', keyboard); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function exportMarkdown() {
    const current = workingRef.current;
    const markdown = `# ${current.title || t.untitled}\n\n${current.author ? `*${current.author}*\n\n` : ''}${new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced' }).turndown(current.html)}\n`;
    const link = document.createElement('a');
    const url = URL.createObjectURL(new Blob([markdown], { type: 'text/markdown;charset=utf-8' }));
    link.href = url; link.download = `${(current.title || 'untitled').replace(/[/\\:*?"<>|]/g, '-').slice(0, 100)}.md`;
    link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  const changed = hasUnpublishedChanges(working);
  return <section className="editor-pane" aria-label={t.editor}>
    <div className="editor-topbar"><div className="document-path"><FileText size={14}/><span>{working.title || t.untitled}</span></div>
      <div className="editor-top-actions"><span className="save-status" role="status">{status === 'saved' ? <Check size={13}/> : <Circle size={8}/>} {t[status]}</span>
        <button className="button small" onClick={() => void save().catch(() => {})} disabled={busy || status === 'saving'}><Save size={14}/><span>{t.saveDraft}</span></button>
        <button className="button primary small" onClick={onPublish} disabled={busy || (working.published !== null && !changed)}><Upload size={14}/>{working.published && changed ? t.publishChanges : working.published ? t.published : t.publish}</button>
      </div>
    </div>
    {error && <div className="error-banner" role="alert">{t[error] || t.failed}</div>}
    <div className="editor-scroll">
      <div className="editor-document">
        <div className="document-status-row"><span className={`status-label ${working.published ? 'is-published' : ''}`}><span/>{working.published ? changed ? t.newChanges : t.published : t.draft}</span><span className="small-text muted">{t.privateNote}</span></div>
        <input className="document-title" aria-label={t.title} placeholder={t.titlePlaceholder} value={working.title} maxLength={240} onChange={e => update({ title: e.target.value })}/>
        <div className="document-fields"><label>{t.author}<input value={working.author} placeholder={t.authorPlaceholder} aria-label={t.author} maxLength={160} onChange={e => update({ author: e.target.value })}/></label>
          <label>{t.originalLanguage}<select aria-label={t.originalLanguage} value={working.originalLanguage || ''} onChange={e => update({ originalLanguage: (e.target.value || null) as ArticleLanguage | null })}><option value="">{t.selectLanguage}</option>{Object.entries(articleLanguages).map(([code, name]) => <option key={code} value={code}>{name}</option>)}</select></label>
          <label>{t.project}<select aria-label={t.project} value={working.projectId || ''} onChange={e => update({ projectId: e.target.value || null })}><option value="">{t.noProject}</option>{projects.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label></div>
        <label className="summary-field">{t.summary}<textarea value={working.summary} placeholder={t.summaryPlaceholder} rows={2} maxLength={600} onChange={e => update({ summary: e.target.value })}/></label>
        <div className="editor-mode-bar"><div className="editor-tabs" role="tablist"><button role="tab" aria-selected={mode === 'write'} onClick={() => setMode('write')}><FileText size={13}/>{t.editor}</button><button role="tab" aria-selected={mode === 'preview'} onClick={() => setMode('preview')}><Eye size={14}/>{t.preview}</button></div>
          <div className="editor-file-tools"><button className="icon-button" title={t.attachPdf} aria-label={t.attachPdf} disabled={busy} onClick={() => attachInput.current?.click()}><Paperclip size={16}/></button><button className="icon-button" title={t.export} aria-label={t.export} onClick={exportMarkdown}><Download size={16}/></button></div>
        </div>
        <div hidden={mode !== 'write'}><RichEditor initialHtml={paper.html} onChange={html => update({ html })}/></div>
        {mode === 'preview' && <div className="editor-preview"><PaperReader paper={{ ...working, publishedAt: working.published?.publishedAt || working.updatedAt }} projectName={projects.find(p => p.id === working.projectId)?.name} draft/></div>}
        {working.attachment && mode === 'write' && <div className="attachment-card"><FileText size={23} strokeWidth={1.3}/><div><a href={`/api/files/${paper.id}?draft=1`} target="_blank" rel="noreferrer">{working.attachment.name}</a><span>{(working.attachment.size / 1000).toFixed(0)} KB · PDF</span></div><button className="icon-button" aria-label={t.removeAttachment} onClick={() => update({ attachment: null })} disabled={busy}><X size={16}/></button></div>}
      </div>
    </div>
    <div className="editor-statusbar"><span>{plainText(working.html).split(/\s+/).filter(Boolean).length} {t.words}</span><span>{t.savedHint}</span></div>
    <input type="file" ref={attachInput} accept=".pdf,application/pdf" className="visually-hidden" tabIndex={-1} onChange={e => { const file = e.target.files?.[0]; if (file) onAttach(file); e.target.value = ''; }}/>
  </section>;
});
