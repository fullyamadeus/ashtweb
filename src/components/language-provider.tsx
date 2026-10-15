'use client';

import { createContext, useContext, useState } from 'react';
import { useRouter } from 'next/navigation';
import { messages } from '@/lib/i18n';
import type { Language } from '@/lib/types';

const LanguageContext = createContext<{ language: Language; setLanguage: (value: Language) => void }>({ language: 'en', setLanguage: () => {} });
export function LanguageProvider({ children, initialLanguage }: { children: React.ReactNode; initialLanguage: Language }) {
  const [language, update] = useState(initialLanguage);
  const router = useRouter();
  function setLanguage(value: Language) {
    document.cookie = `asht-language=${value}; path=/; max-age=31536000; SameSite=Lax`;
    document.documentElement.lang = value;
    update(value);
    router.refresh();
  }
  return <LanguageContext.Provider value={{ language, setLanguage }}>{children}</LanguageContext.Provider>;
}
export function useLanguage() {
  const context = useContext(LanguageContext);
  return { ...context, t: messages[context.language] };
}
export function LanguageSwitch() {
  const { language, setLanguage, t } = useLanguage();
  return <div className="language-switch" role="group" aria-label={t.language}>
    <button type="button" lang="en" aria-label="English" aria-pressed={language === 'en'} onClick={() => setLanguage('en')}>EN</button>
    <span aria-hidden="true">/</span>
    <button type="button" lang="sq" aria-label="Shqip" aria-pressed={language === 'sq'} onClick={() => setLanguage('sq')}>SQ</button>
  </div>;
}
