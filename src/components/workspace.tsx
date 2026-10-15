'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowUpRight, ChevronRight, FilePlus2, FileText, Folder, FolderOpen, FolderPlus, LogOut, MoreHorizontal, PenLine, Plus, Search, Trash2, Upload, X } from 'lucide-react';
import { marked } from 'marked';
import { api, errorKey } from '@/lib/client-api';
import { cleanHtml } from '@/lib/content';
import type { MessageKey } from '@/lib/i18n';
import { hasUnpublishedChanges, type Paper, type Project } from '@/lib/types';
import { LanguageSwitch, useLanguage } from './language-provider';
import { Modal } from './modal';
import { PaperEditor, type EditorHandle } from './paper-editor';

type Action = { kind: 'publish' | 'unpublish' | 'delete'; paper: Paper } | { kind: 'deleteProject' | 'renameProject'; project: Project } | { kind: 'newProject' };

export function Workspace({ initialPapers, initialProjects, local }: { initialPapers: Paper[]; initialProjects: Project[]; local: boolean }) {
  const { t } = useLanguage();
  const router = useRouter();
  const [papers, setPapers] = useState(initialPapers);
  const [projects, setProjects] = useState(initialProjects);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string[]>(['independent']);
  const [filter, setFilter] = useState<'all' | 'drafts' | 'published'>('all');
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<MessageKey | null>(null);
  const [action, setAction] = useState<Action | null>(null);
  const [projectName, setProjectName] = useState('');
  const editor = useRef<EditorHandle>(null);
  const importInput = useRef<HTMLInputElement>(null);
  const selected = papers.find(p => p.id === selectedId);

  useEffect(() => {
    const closeMenus = (event: MouseEvent) => document.querySelectorAll<HTMLDetailsElement>('details.paper-menu[open]').forEach(menu => { if (!menu.contains(event.target as Node)) menu.open = false; });
    const escapeMenus = (event: KeyboardEvent) => { if (event.key === 'Escape') document.querySelectorAll<HTMLDetailsElement>('details.paper-menu[open]').forEach(menu => { menu.open = false; }); };
    document.addEventListener('click', closeMenus); document.addEventListener('keydown', escapeMenus);
    return () => { document.removeEventListener('click', closeMenus); document.removeEventListener('keydown', escapeMenus); };
  }, []);

  function updatePaper(paper: Paper) { setPapers(current => current.some(p => p.id === paper.id) ? current.map(p => p.id === paper.id ? paper : p) : [paper, ...current]); }
  function openPaper(paper: Paper) {
    setSelectedId(paper.id);
    setExpanded(current => [...new Set([...current, paper.projectId || 'independent'])]);
    if (window.innerWidth < 760) setTimeout(() => document.querySelector('.editor-pane')?.scrollIntoView({ behavior: 'smooth' }), 100);
  }
  async function run(work: () => Promise<void>) {
    if (busy) return;
    setBusy(true); setError(null);
    try { await work(); } catch (error) { setError(errorKey(error)); }
    finally { setBusy(false); }
  }
  async function flush() { return editor.current ? editor.current.save() : undefined; }
  async function choose(paper: Paper) { if (paper.id === selectedId) return; await run(async () => { await flush(); openPaper(paper); }); }
  async function create(projectId: string | null = null) {
    await run(async () => {
      await flush(); const paper = await api<Paper>('/api/papers', { method: 'POST', body: JSON.stringify({ projectId }) });
      updatePaper(paper); setFilter('all'); setQuery(''); openPaper(paper);
    });
  }
  async function upload(paper: Paper, file: File) {
    const form = new FormData(); form.set('file', file); form.set('revision', String(paper.revision));
    return api<Paper>(`/api/papers/${paper.id}/attachment`, { method: 'POST', body: form });
  }
  async function attach(file: File) {
    await run(async () => {
      const paper = await flush(); if (!paper) return;
      if (file.size > 4_000_000 || !file.name.toLowerCase().endsWith('.pdf')) { setError('uploadError'); return; }
      updatePaper(await upload(paper, file));
    });
  }
  async function importFile(file: File) {
    await run(async () => {
      const extension = file.name.split('.').pop()?.toLowerCase();
      if (file.size > 4_000_000 || !['pdf', 'md', 'txt'].includes(extension || '')) { setError('uploadError'); return; }
      await flush();
      let html = '';
      if (extension !== 'pdf') {
        const text = await file.text();
        html = extension === 'md' ? cleanHtml(await marked.parse(text)) : text.split(/\n\s*\n/).map(p => `<p>${p.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>')}</p>`).join('');
        if (html.length > 1_500_000) { setError('uploadError'); return; }
      } else if (await file.slice(0, 5).text() !== '%PDF-') { setError('uploadError'); return; }
      let paper = await api<Paper>('/api/papers', { method: 'POST', body: JSON.stringify({ projectId: selected?.projectId || null }) });
      updatePaper(paper);
      paper = await api<Paper>(`/api/papers/${paper.id}`, { method: 'PATCH', body: JSON.stringify({ title: file.name.replace(/\.[^.]+$/, '').slice(0, 240), author: '', summary: '', html, projectId: paper.projectId, revision: paper.revision }) });
      updatePaper(paper);
      if (extension === 'pdf') { paper = await upload(paper, file); updatePaper(paper); }
      setFilter('all'); setQuery(''); openPaper(paper);
    });
  }
  function requestAction(next: Action) {
    document.querySelectorAll<HTMLDetailsElement>('details.paper-menu[open]').forEach(menu => { menu.open = false; });
    setError(null); setProjectName(next.kind === 'renameProject' ? next.project.name : ''); setAction(next);
  }
  async function confirmAction() {
    if (!action) return;
    await run(async () => {
      const current = await flush();
      if (action.kind === 'newProject' || action.kind === 'renameProject') {
        const project = await api<Project>(action.kind === 'newProject' ? '/api/projects' : `/api/projects/${action.project.id}`, { method: action.kind === 'newProject' ? 'POST' : 'PATCH', body: JSON.stringify({ name: projectName }) });
        setProjects(value => [...value.filter(p => p.id !== project.id), project].sort((a, b) => a.name.localeCompare(b.name)));
        setExpanded(value => [...new Set([...value, project.id])]);
      } else if (action.kind === 'deleteProject') {
        const result = await api<{ papers: Paper[] }>(`/api/projects/${action.project.id}`, { method: 'DELETE' });
        setProjects(value => value.filter(p => p.id !== action.project.id)); setPapers(result.papers);
      } else if ('paper' in action) {
        const target = current?.id === action.paper.id ? current : papers.find(p => p.id === action.paper.id)!;
        if (!target) { setError('notFound'); return; }
        if (action.kind === 'delete') {
          await api(`/api/papers/${target.id}`, { method: 'DELETE', body: JSON.stringify({ revision: target.revision }) });
          setPapers(value => value.filter(p => p.id !== target.id)); if (selectedId === target.id) setSelectedId(null);
        } else {
          const next = await api<Paper>(`/api/papers/${target.id}/publish`, { method: 'POST', body: JSON.stringify({ action: action.kind, revision: target.revision }) });
          updatePaper(next);
        }
      }
      setAction(null);
    });
  }

  const visible = papers.filter(p => (filter === 'all' || (filter === 'drafts' ? !p.published || hasUnpublishedChanges(p) : !!p.published)) && `${p.title} ${p.author}`.toLowerCase().includes(query.toLowerCase()));
  const groups = [...projects, { id: 'independent', name: t.independent, createdAt: '' }];
  const menu = (paper: Paper) => <details className="paper-menu"><summary aria-label={`${t.more}: ${paper.title || t.untitled}`}><MoreHorizontal size={17}/></summary><div className="menu-popover">
    <button disabled={busy} onClick={() => requestAction({ kind: 'publish', paper })}><Upload size={14}/>{paper.published ? t.publishChanges : t.publish}</button>
    {paper.published && <button disabled={busy} onClick={() => requestAction({ kind: 'unpublish', paper })}><X size={14}/>{t.unpublish}</button>}
    <button className="danger-text" disabled={busy} onClick={() => requestAction({ kind: 'delete', paper })}><Trash2 size={14}/>{t.delete}</button>
  </div></details>;
  const actionTitle = action ? t[`${action.kind}Title` as MessageKey] : '';
  const projectAction = action?.kind === 'newProject' || action?.kind === 'renameProject';

  return <div className="admin-shell"><header className="admin-header"><div className="admin-brand"><span className="admin-wordmark">ASHT<span>.</span></span><span>{t.workspace}</span></div><div className="admin-header-actions"><LanguageSwitch/><button className="text-link" disabled={busy} onClick={() => void run(async () => { await flush(); router.push('/'); })}>{t.viewSite}<ArrowUpRight size={14}/></button><button className="icon-button" title={t.signOut} aria-label={t.signOut} disabled={busy} onClick={() => void run(async () => { await flush(); await api('/api/auth/logout', { method: 'POST' }); router.replace('/login'); router.refresh(); })}><LogOut size={17}/></button></div></header>
    <main id="main-content" className="admin-workspace">
      <aside className="admin-sidebar"><div className="admin-sidebar-title"><span className="eyebrow">{t.library}</span><button className="icon-button" title={t.newProject} aria-label={t.newProject} onClick={() => requestAction({ kind: 'newProject' })} disabled={busy}><FolderPlus size={17}/></button></div>
        <div className="sidebar-create"><button className="button primary" onClick={() => void create()} disabled={busy}><Plus size={15}/>{t.newPaper}</button><button className="button import-button" title={t.importHint} onClick={() => importInput.current?.click()} disabled={busy}><Upload size={14}/>{t.import}</button></div>
        <label className="sidebar-search"><Search size={14}/><input aria-label={t.search} placeholder={t.search} value={query} onChange={e => setQuery(e.target.value)}/></label>
        <div className="sidebar-filters" role="group" aria-label={t.filter}>{(['all','drafts','published'] as const).map(value => <button key={value} aria-pressed={filter === value} onClick={() => setFilter(value)}>{t[value]}</button>)}</div>
        <div className="admin-tree">{groups.map(project => {
          const open = expanded.includes(project.id) || !!query;
          const items = visible.filter(p => (p.projectId || 'independent') === project.id);
          if (query && !items.length) return null;
          return <div className="folder-group" key={project.id}><div className="folder-row"><button className="folder-toggle" aria-expanded={open} onClick={() => setExpanded(value => value.includes(project.id) ? value.filter(id => id !== project.id) : [...value, project.id])}><ChevronRight size={12} className={`chevron ${open ? 'expanded' : ''}`}/>{open ? <FolderOpen size={15}/> : <Folder size={15}/>}<span>{project.name}</span><span className="small-count">{items.length}</span></button>
            {project.id !== 'independent' && <details className="paper-menu"><summary aria-label={`${t.more}: ${project.name}`}><MoreHorizontal size={16}/></summary><div className="menu-popover"><button disabled={busy} onClick={() => { document.querySelectorAll<HTMLDetailsElement>('details[open]').forEach(e => { e.open = false; }); void create(project.id); }}><FilePlus2 size={14}/>{t.newPaper}</button><button disabled={busy} onClick={() => requestAction({ kind: 'renameProject', project })}><PenLine size={14}/>{t.rename}</button><button className="danger-text" disabled={busy} onClick={() => requestAction({ kind: 'deleteProject', project })}><Trash2 size={14}/>{t.delete}</button></div></details>}
          </div>{open && <div className="folder-children">{items.map(paper => <div className={`admin-paper-row ${selectedId === paper.id ? 'selected' : ''}`} key={paper.id}><button className="tree-paper" aria-label={paper.title || t.untitled} disabled={busy} onClick={() => void choose(paper)} aria-current={selectedId === paper.id ? 'page' : undefined}><FileText size={14}/><span>{paper.title || t.untitled}</span><span className={`tree-status ${paper.published ? 'published' : ''}`} title={paper.published ? t.published : t.draft}/></button>{menu(paper)}</div>)}{items.length === 0 && <p className="folder-empty">{t.folderEmpty}</p>}</div>}</div>;
        })}{query && !visible.length && <p className="sidebar-empty">{t.noResults}</p>}</div>
        <div className="admin-sidebar-footer"><span>{papers.length} {t.papers}</span><span>{local ? t.localMode : 'ASHT'}</span></div>
      </aside>
      <div className="admin-main">{error && !action && <div className="error-banner" role="alert">{t[error] || t.failed}<button className="icon-button" aria-label={t.close} onClick={() => setError(null)}><X size={15}/></button></div>}
        {selected ? <PaperEditor ref={editor} key={selected.id} paper={selected} projects={projects} onSaved={updatePaper} onPublish={() => requestAction({ kind: 'publish', paper: selected })} onAttach={file => void attach(file)} busy={busy}/>
          : <div className="workspace-empty"><PenLine size={37} strokeWidth={1}/><div className="eyebrow red-text">ASHT / {t.workspace}</div><h1>{t.deskEmpty}</h1><p>{t.deskEmptyDetail}</p><button className="button primary" onClick={() => void create()} disabled={busy}><Plus size={15}/>{t.newPaper}</button><div className="empty-hint">{t.privateNote}</div></div>}
      </div>
    </main>
    <input ref={importInput} className="visually-hidden" tabIndex={-1} type="file" accept=".md,.txt,.pdf,text/markdown,text/plain,application/pdf" onChange={e => { const file = e.target.files?.[0]; if (file) void importFile(file); e.target.value = ''; }}/>
    {action && <Modal title={actionTitle} onClose={() => { setAction(null); setError(null); }} busy={busy}><form onSubmit={e => { e.preventDefault(); void confirmAction(); }}>
      {projectAction ? <label>{t.projectName}<input value={projectName} onChange={e => setProjectName(e.target.value)} required maxLength={100} autoFocus/></label>
        : <><p className="modal-description">{t[`${action.kind}Body` as MessageKey]}</p><p className="modal-document-name">{'paper' in action ? action.paper.title || t.untitled : 'project' in action ? action.project.name : ''}</p></>}
      {error && <p className="error-message" role="alert">{t[error] || t.failed}</p>}
      <div className="modal-actions"><button type="button" className="button" onClick={() => { setAction(null); setError(null); }} disabled={busy} autoFocus={!projectAction}>{t.cancel}</button><button type="submit" className="button primary" disabled={busy || (projectAction && !projectName.trim())}>{busy ? t.loading : action.kind === 'newProject' ? t.create : action.kind === 'renameProject' ? t.rename : action.kind === 'deleteProject' ? t.delete : t[action.kind]}</button></div>
    </form></Modal>}
  </div>;
}
