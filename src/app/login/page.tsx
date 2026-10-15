import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft } from 'lucide-react';
import { redirect } from 'next/navigation';
import { authConfigured, isAdmin } from '@/lib/auth';
import { LoginForm } from '@/components/login-form';
import { LanguageSwitch } from '@/components/language-provider';
import { getLanguage } from '@/lib/server-language';
import { messages } from '@/lib/i18n';
export const metadata = { title: 'Editorial sign in', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';
export default async function LoginPage() {
  if (await isAdmin()) redirect('/admin');
  const t = messages[await getLanguage()];
  return <div className="login-page"><header className="login-header"><Link href="/" className="back-link"><ArrowLeft size={15}/>{t.backToJournal}</Link><LanguageSwitch/></header>
    <main id="main-content" className="login-main"><div className="login-brand"><Image src="/asht.png" alt="ASHT" width={480} height={270} priority/><span>{t.journal}</span></div><LoginForm configured={authConfigured()}/></main>
    <footer className="login-footer">ASHT <span>© {new Date().getFullYear()}</span></footer>
  </div>;
}
