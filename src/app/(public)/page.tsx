import { PaperList } from '@/components/paper-list';
import { listProjects, listPublicPapers } from '@/lib/storage';
export const dynamic = 'force-dynamic';
export default async function HomePage() {
  const [papers, projects] = await Promise.all([listPublicPapers(), listProjects()]);
  return <PaperList papers={papers} projects={projects.filter(project => papers.some(p => p.projectId === project.id))}/>;
}
