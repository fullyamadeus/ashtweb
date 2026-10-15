import { redirect } from 'next/navigation';
import { isAdmin } from '@/lib/auth';
import { isLocal, listPapers, listProjects } from '@/lib/storage';
import { Workspace } from '@/components/workspace';
import { storageUnavailable } from '@/components/storage-unavailable';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Editorial workspace', robots: { index: false, follow: false } };
export default async function AdminPage() {
  if (!await isAdmin()) redirect('/login');
  try {
    const [papers, projects] = await Promise.all([listPapers(), listProjects()]);
    return <Workspace initialPapers={papers} initialProjects={projects} local={isLocal()}/>;
  } catch (error) { return storageUnavailable(error, true); }
}
