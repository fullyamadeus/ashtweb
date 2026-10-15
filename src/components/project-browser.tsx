'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronRight, FileText, Folder, FolderOpen, BookOpen, ArrowUpRight } from 'lucide-react';
import { useLanguage } from './language-provider';
import { PaperReader } from './paper-reader';
import type { Project, PublicPaper } from '@/lib/types';

export function ProjectBrowser({ projects, papers, initialId }: { projects: Project[]; papers: PublicPaper[]; initialId?: string }) {
  const { t } = useLanguage();
  const [selectedId, setSelectedId] = useState(initialId);
  const initial = papers.find(p => p.id === initialId);
  const [expanded, setExpanded] = useState<string[]>(initial ? [initial.projectId || 'independent'] : []);
  const selected = papers.find(p => p.id === selectedId);
  function toggle(id: string) { setExpanded(value => value.includes(id) ? value.filter(p => p !== id) : [...value, id]); }
  function select(id: string) {
    setSelectedId(id);
    window.history.replaceState(null, '', `/projects?paper=${id}`);
    if (window.innerWidth < 760) document.getElementById('project-reading-pane')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  const groups = [...projects, ...(papers.some(p => !p.projectId) ? [{ id: 'independent', name: t.independent, createdAt: '' }] : [])];
  return <div className="project-workspace">
    <aside className="project-sidebar"><div className="sidebar-heading"><span className="eyebrow">{t.projects}</span><span className="small-count">{projects.length}</span></div>
      <div className="folder-tree">{groups.length === 0 && <p className="sidebar-empty">{t.noProjects}</p>}
        {groups.map(project => {
          const open = expanded.includes(project.id);
          const children = papers.filter(p => (p.projectId || 'independent') === project.id);
          return <div key={project.id} className="folder-group">
            <button className="folder-toggle" onClick={() => toggle(project.id)} aria-expanded={open}>
              <ChevronRight size={13} className={open ? 'chevron expanded' : 'chevron'}/>{open ? <FolderOpen size={16}/> : <Folder size={16}/>}<span>{project.name}</span><span className="small-count">{children.length}</span>
            </button>
            {open && <div className="folder-children">{children.map(paper => <button key={paper.id} onClick={() => select(paper.id)} className={`tree-paper ${selectedId === paper.id ? 'selected' : ''}`} aria-current={selectedId === paper.id ? 'page' : undefined}><FileText size={14}/><span>{paper.title}</span></button>)}</div>}
          </div>;
        })}
      </div>
      <div className="sidebar-bottom">{papers.length} {t.paperCount}</div>
    </aside>
    <section className="project-reading-pane" id="project-reading-pane" aria-label={t.read}>
      {selected ? <><div className="reading-pane-bar"><span className="small-text muted">{selected.title}</span><Link className="text-link" href={`/papers/${selected.id}`}>{t.readPaper}<ArrowUpRight size={14}/></Link></div><PaperReader paper={selected} projectName={projects.find(p => p.id === selected.projectId)?.name}/></>
        : <div className="reading-empty"><BookOpen size={34} strokeWidth={1}/><div className="eyebrow red-text">ASHT / {t.projects}</div><h1>{t.selectPaper}</h1><p>{groups.length ? t.selectPaperDetail : t.noProjectsDetail}</p></div>}
    </section>
  </div>;
}
