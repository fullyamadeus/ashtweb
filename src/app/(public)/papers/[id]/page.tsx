import Link from 'next/link';
import { notFound } from 'next/navigation';
import { z } from 'zod';
import { ArrowLeft } from 'lucide-react';
import { PaperReader } from '@/components/paper-reader';
import { getPublicPaper, listProjects } from '@/lib/storage';
import { getLanguage } from '@/lib/server-language';
import { messages } from '@/lib/i18n';
import { StorageError } from '@/lib/storage-diagnostics';
import { storageUnavailable } from '@/components/storage-unavailable';
export const dynamic = 'force-dynamic';
type Props = { params: Promise<{ id: string }> };
export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return { title: 'Paper not found' };
  try {
    const paper = await getPublicPaper(id);
    return { title: paper?.title || 'Paper not found', description: paper?.summary || undefined };
  } catch (error) {
    if (!(error instanceof StorageError)) throw error;
    return { title: messages[await getLanguage()].storageTitle, robots: { index: false } };
  }
}
export default async function PaperPage({ params }: Props) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  try {
    const paper = await getPublicPaper(id);
    if (!paper) notFound();
    const [projects, language] = await Promise.all([listProjects(), getLanguage()]);
    return <div className="article-page page-width"><Link href="/" className="back-link"><ArrowLeft size={15}/>{messages[language].backToPapers}</Link><PaperReader paper={paper} projectName={projects.find(p => p.id === paper.projectId)?.name}/></div>;
  } catch (error) { return storageUnavailable(error); }
}
