import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile, rename, rm } from 'node:fs/promises';
import path from 'node:path';
import type { Paper, Project, PublicPaper } from './types';
import { publicVersion } from './types';
import { AppError } from './errors';

type LocalData = {
  papers: Paper[];
  projects: Project[];
  attempts: Record<string, { count: number; start: number }>;
};

export const isLocal = () => process.env.STORAGE_MODE === 'local' && !process.env.VERCEL && process.env.NODE_ENV !== 'production';
const dataDir = () => path.resolve(/* turbopackIgnore: true */ process.env.ASHT_DATA_DIR || '.data');

export function database() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key || process.env.STORAGE_MODE !== 'supabase') throw new AppError('storageSetup', 503);
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function localRead(): Promise<LocalData> {
  try { return JSON.parse(await readFile(path.join(dataDir(), 'journal.json'), 'utf8')); }
  catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return { papers: [], projects: [], attempts: {} };
    throw e;
  }
}

// An atomic file lock also protects development requests handled by different workers.
async function localWrite<T>(fn: (data: LocalData) => T): Promise<T> {
  await mkdir(dataDir(), { recursive: true });
  const lock = path.join(dataDir(), '.lock');
  const start = Date.now();
  for (;;) {
    try { await mkdir(lock); break; }
    catch (e) {
      if ((e as NodeJS.ErrnoException).code !== 'EEXIST') throw e;
      if (Date.now() - start > 5000) throw new AppError('failed', 503);
      await new Promise(resolve => setTimeout(resolve, 30));
    }
  }
  try {
    const data = await localRead();
    const result = fn(data);
    const temp = path.join(dataDir(), `journal-${randomUUID()}.tmp`);
    await writeFile(temp, JSON.stringify(data), { mode: 0o600 });
    await rename(temp, path.join(dataDir(), 'journal.json'));
    return result;
  } finally { await rm(lock, { recursive: true, force: true }); }
}

type Row = Record<string, unknown>;
function fromRow(row: Row): Paper {
  return {
    id: row.id as string, title: row.title as string, author: row.author as string,
    summary: row.summary as string, html: row.content_html as string,
    projectId: row.project_id as string | null, attachment: row.attachment as Paper['attachment'],
    revision: row.revision as number, createdAt: row.created_at as string,
    updatedAt: row.updated_at as string, published: row.published_snapshot as Paper['published'],
  };
}
function toRow(paper: Paper) {
  return {
    id: paper.id, title: paper.title, author: paper.author, summary: paper.summary,
    content_html: paper.html, project_id: paper.projectId, attachment: paper.attachment,
    revision: paper.revision, created_at: paper.createdAt, updated_at: paper.updatedAt,
    published_snapshot: paper.published,
  };
}
function dbError(error: { code?: string; message?: string } | null) {
  if (!error) return;
  if (error.code === '23505') throw new AppError('duplicateProject', 409);
  if (error.code === '23503') throw new AppError('conflict', 409);
  throw new AppError('storageSetup', 503);
}

export async function listPapers(): Promise<Paper[]> {
  if (isLocal()) return (await localRead()).papers.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const { data, error } = await database().from('papers').select('*').order('updated_at', { ascending: false });
  dbError(error);
  return (data || []).map(fromRow);
}
export async function getPaper(id: string): Promise<Paper | null> {
  if (isLocal()) return (await localRead()).papers.find(p => p.id === id) || null;
  const { data, error } = await database().from('papers').select('*').eq('id', id).maybeSingle();
  dbError(error);
  return data ? fromRow(data) : null;
}
export async function listPublicPapers(): Promise<PublicPaper[]> {
  let papers: PublicPaper[];
  if (isLocal()) papers = (await localRead()).papers.map(publicVersion).filter((p): p is PublicPaper => !!p);
  else {
    const { data, error } = await database().from('papers').select('id, published_snapshot').not('published_snapshot', 'is', null);
    dbError(error);
    papers = (data || []).map(row => ({ id: row.id, ...row.published_snapshot } as PublicPaper));
  }
  return papers.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}
export async function getPublicPaper(id: string): Promise<PublicPaper | null> {
  if (isLocal()) { const paper = await getPaper(id); return paper ? publicVersion(paper) : null; }
  const { data, error } = await database().from('papers').select('id, published_snapshot').eq('id', id).not('published_snapshot', 'is', null).maybeSingle();
  dbError(error);
  return data ? { id: data.id, ...data.published_snapshot } as PublicPaper : null;
}
export async function createPaper(projectId: string | null): Promise<Paper> {
  const now = new Date().toISOString();
  const paper: Paper = {
    id: randomUUID(), title: '', author: '', summary: '', html: '', projectId,
    attachment: null, revision: 1, createdAt: now, updatedAt: now, published: null,
  };
  if (isLocal()) return localWrite(data => {
    if (projectId && !data.projects.some(p => p.id === projectId)) throw new AppError('conflict', 409);
    data.papers.push(paper); return paper;
  });
  const { error } = await database().from('papers').insert(toRow(paper));
  dbError(error); return paper;
}
export async function replacePaper(paper: Paper, expectedRevision: number): Promise<Paper> {
  const next = { ...paper, revision: expectedRevision + 1, updatedAt: new Date().toISOString() };
  if (isLocal()) return localWrite(data => {
    const index = data.papers.findIndex(p => p.id === paper.id);
    if (index < 0) throw new AppError('notFound', 404);
    if (data.papers[index].revision !== expectedRevision) throw new AppError('conflict', 409);
    if (next.projectId && !data.projects.some(p => p.id === next.projectId)) throw new AppError('conflict', 409);
    data.papers[index] = next; return next;
  });
  const { data, error } = await database().from('papers').update(toRow(next)).eq('id', next.id).eq('revision', expectedRevision).select('id');
  dbError(error);
  if (!data?.length) throw new AppError('conflict', 409);
  return next;
}
export async function deletePaper(id: string, revision: number) {
  if (isLocal()) return localWrite(data => {
    const paper = data.papers.find(p => p.id === id);
    if (!paper || paper.revision !== revision) throw new AppError('conflict', 409);
    data.papers = data.papers.filter(p => p.id !== id);
  });
  const { data, error } = await database().from('papers').delete().eq('id', id).eq('revision', revision).select('id');
  dbError(error);
  if (!data?.length) throw new AppError('conflict', 409);
}
export async function listProjects(): Promise<Project[]> {
  if (isLocal()) return (await localRead()).projects.sort((a, b) => a.name.localeCompare(b.name));
  const { data, error } = await database().from('projects').select('*').order('name');
  dbError(error);
  return (data || []).map(row => ({ id: row.id, name: row.name, createdAt: row.created_at }));
}
export async function saveProject(name: string, id?: string): Promise<Project> {
  const project: Project = { id: id || randomUUID(), name, createdAt: new Date().toISOString() };
  if (isLocal()) return localWrite(data => {
    if (data.projects.some(p => p.id !== project.id && p.name.toLowerCase() === name.toLowerCase())) throw new AppError('duplicateProject', 409);
    const old = data.projects.find(p => p.id === id);
    if (id && !old) throw new AppError('notFound', 404);
    project.createdAt = old?.createdAt || project.createdAt;
    data.projects = [...data.projects.filter(p => p.id !== project.id), project];
    return project;
  });
  const db = database();
  const { data, error } = id
    ? await db.from('projects').update({ name }).eq('id', id).select().maybeSingle()
    : await db.from('projects').insert({ id: project.id, name }).select().single();
  dbError(error);
  if (!data) throw new AppError('notFound', 404);
  return { id: data.id, name: data.name, createdAt: data.created_at };
}
export async function deleteProject(id: string) {
  if (isLocal()) return localWrite(data => {
    data.projects = data.projects.filter(p => p.id !== id);
    data.papers = data.papers.map(p => {
      if (p.projectId !== id && p.published?.projectId !== id) return p;
      return { ...p, projectId: p.projectId === id ? null : p.projectId,
        published: p.published?.projectId === id ? { ...p.published, projectId: null } : p.published,
        revision: p.revision + 1, updatedAt: new Date().toISOString() };
    });
  });
  // A database trigger updates draft and published folder references atomically.
  const { error } = await database().from('projects').delete().eq('id', id);
  dbError(error);
}

const BUCKET = 'papers';
const validKey = (key: string) => /^[a-f0-9-]{36}\.pdf$/.test(key);
export async function uploadFile(key: string, bytes: Uint8Array) {
  if (!validKey(key)) throw new AppError('uploadError');
  if (isLocal()) {
    await mkdir(path.join(dataDir(), 'uploads'), { recursive: true });
    await writeFile(path.join(dataDir(), 'uploads', key), bytes, { mode: 0o600 });
    return;
  }
  const { error } = await database().storage.from(BUCKET).upload(key, bytes, { contentType: 'application/pdf', upsert: false });
  dbError(error);
}
export async function downloadFile(key: string): Promise<ArrayBuffer> {
  if (!validKey(key)) throw new AppError('notFound', 404);
  if (isLocal()) {
    try { const buffer = await readFile(path.join(dataDir(), 'uploads', key)); return Uint8Array.from(buffer).buffer; }
    catch { throw new AppError('notFound', 404); }
  }
  const { data, error } = await database().storage.from(BUCKET).download(key);
  if (error || !data) throw new AppError('notFound', 404);
  return data.arrayBuffer();
}
export async function removeFiles(keys: string[]) {
  const safe = [...new Set(keys.filter(validKey))];
  if (!safe.length) return;
  if (isLocal()) { await Promise.all(safe.map(key => rm(path.join(dataDir(), 'uploads', key), { force: true }))); return; }
  const { error } = await database().storage.from(BUCKET).remove(safe);
  dbError(error);
}
export async function pruneAttachments(before: Paper, after?: Paper) {
  const oldKeys = [before.attachment?.key, before.published?.attachment?.key].filter((k): k is string => !!k);
  const keep = [after?.attachment?.key, after?.published?.attachment?.key];
  // An orphaned private file is safer than reporting an already-saved paper as failed.
  await removeFiles(oldKeys.filter(k => !keep.includes(k))).catch(() => console.error('Private attachment cleanup failed.'));
}
export async function consumeLoginAttempt(key: string): Promise<boolean> {
  if (isLocal()) return localWrite(data => {
    const now = Date.now();
    for (const [k, entry] of Object.entries(data.attempts)) if (now - entry.start > 900000) delete data.attempts[k];
    const entry = data.attempts[key] || { count: 0, start: now };
    entry.count++;
    data.attempts[key] = entry;
    return entry.count <= 10;
  });
  const { data, error } = await database().rpc('consume_login_attempt', { attempt_key: key });
  dbError(error);
  return data === true;
}
