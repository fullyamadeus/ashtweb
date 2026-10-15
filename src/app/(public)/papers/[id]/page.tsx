import Link from 'next/link';
import { notFound } from 'next/navigation';
import { z } from 'zod';
import { ArrowLeft } from 'lucide-react';
import { PaperReader } from '@/components/paper-reader';
import { getPublicPaper, listProjects } from '@/lib/storage';
import { getLanguage } from '@/lib/server-language';
import { messages } from '@/lib/i18n';
export const dynamic = 'force-dynamic';
type Props = { params: Promise<{ id: string }> };
export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return { title: 'Paper not found' };
  const paper = await getPublicPaper(id);
  return { title: paper?.title || 'Paper not found', description: paper?.summary || undefined };
}
export default async function PaperPage({ params }: Props) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const paper = await getPublicPaper(id);
  if (!paper) notFound();
  const [projects, language] = await Promise.all([listProjects(), getLanguage()]);
  return <div className="article-page page-width"><Link href="/" className="back-link"><ArrowLeft size={15}/>{messages[language].backToPapers}</Link><PaperReader paper={paper} projectName={projects.find(p => p.id === paper.projectId)?.name}/></div>;
}
