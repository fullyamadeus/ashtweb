'use client';
import Link from 'next/link';
import { useLanguage } from '@/components/language-provider';
export default function NotFound() {
  const { t } = useLanguage();
  return <main id="main-content" className="error-page"><span className="eyebrow red-text">ASHT / 404</span><h1>{t.notFound}</h1><p>{t.notFoundDetail}</p><Link href="/" className="button primary">{t.backToJournal}</Link></main>;
}
