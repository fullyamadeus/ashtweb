import { PaperList } from '@/components/paper-list';
import { listProjects, listPublicPapers } from '@/lib/storage';
import { storageUnavailable } from '@/components/storage-unavailable';
export const dynamic = 'force-dynamic';
export default async function HomePage() {
  try {
    const [papers, projects] = await Promise.all([listPublicPapers(), listProjects()]);
    return <PaperList papers={papers} projects={projects.filter(project => papers.some(p => p.projectId === project.id))}/>;
  } catch (error) { return storageUnavailable(error); }
}
