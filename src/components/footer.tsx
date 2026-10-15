'use client';

import { useLanguage } from './language-provider';

export function Footer() {
  const { t } = useLanguage();
  return <footer className="site-footer page-width">
    <div className="footer-main"><div><span className="footer-wordmark">ASHT<span>.</span></span><p>{t.journal}</p></div>
      <section className="contact-section" aria-label={t.contact}><h2>{t.contact}</h2>
        {process.env.NEXT_PUBLIC_CONTACT_EMAIL && <a href={`mailto:${process.env.NEXT_PUBLIC_CONTACT_EMAIL}`}>{process.env.NEXT_PUBLIC_CONTACT_EMAIL}</a>}
        {process.env.NEXT_PUBLIC_CONTACT_ADDRESS && <p>{process.env.NEXT_PUBLIC_CONTACT_ADDRESS}</p>}
      </section>
    </div>
    <div className="footer-bottom"><span>© {new Date().getFullYear()} ASHT</span><span className="red-square" aria-hidden="true" /></div>
  </footer>;
}
