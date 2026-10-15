'use client';
import { useLanguage } from '@/components/language-provider';
export default function ErrorPage({ retry }: { retry: () => void }) {
  const { t } = useLanguage();
  return <main id="main-content" className="error-page"><span className="eyebrow red-text">ASHT</span><h1>{t.errorTitle}</h1><button className="button primary" onClick={() => retry()}>{t.retry}</button></main>;
}
