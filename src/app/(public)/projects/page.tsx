import { ProjectBrowser } from '@/components/project-browser';
import { listProjects, listPublicPapers } from '@/lib/storage';
export const metadata = { title: 'Projects' };
export const dynamic = 'force-dynamic';
export default async function ProjectsPage({ searchParams }: { searchParams: Promise<{ paper?: string }> }) {
  const [papers, projects, params] = await Promise.all([listPublicPapers(), listProjects(), searchParams]);
  const visibleProjects = projects.filter(project => papers.some(p => p.projectId === project.id));
  return <ProjectBrowser projects={visibleProjects} papers={papers} initialId={params.paper}/>;
}
