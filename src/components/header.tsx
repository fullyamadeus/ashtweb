'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowUpRight } from 'lucide-react';
import { LanguageSwitch, useLanguage } from './language-provider';

export function Header() {
  const { t } = useLanguage();
  const path = usePathname();
  const home = path === '/';
  return <header className={`site-header ${home ? 'masthead' : 'compact-header'}`}>
    <div className="utility-bar page-width">
      <span className="journal-label">{t.journal}</span>
      <div className="utility-actions"><LanguageSwitch /><span className="utility-divider" /><Link href="/login" className="admin-link">{t.admin}<ArrowUpRight size={13} /></Link></div>
    </div>
    <div className="brand-row page-width">
      <Link href="/" className="wordmark" aria-label="ASHT — Home">ASHT<span className="wordmark-period">.</span></Link>
      {!home && <span className="compact-descriptor">{t.journal}</span>}
    </div>
    <nav className="main-nav page-width" aria-label="Main">
      {[['/', t.home], ['/projects', t.projects], ['/about', t.about]].map(([href, name]) =>
        <Link key={href} href={href} aria-current={path === href ? 'page' : undefined}>{name}</Link>)}
    </nav>
  </header>;
}
