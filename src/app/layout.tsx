import type { Metadata } from 'next';
import { LanguageProvider } from '@/components/language-provider';
import { getLanguage } from '@/lib/server-language';
import { messages } from '@/lib/i18n';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'ASHT — Academic & political journal', template: '%s — ASHT' },
  description: 'Papers, research and writings from ASHT, an academic and political journal.',
  icons: { icon: '/icon.svg', apple: '/asht.png' },
};
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const language = await getLanguage();
  return <html lang={language} data-scroll-behavior="smooth"><body><LanguageProvider initialLanguage={language}><a href="#main-content" className="skip-link">{messages[language].skip}</a>{children}</LanguageProvider></body></html>;
}
