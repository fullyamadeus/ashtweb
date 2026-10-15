import { aboutContent } from '@/lib/site-content';
import { getLanguage } from '@/lib/server-language';
import { messages } from '@/lib/i18n';
export async function generateMetadata() {
  return { title: aboutContent[await getLanguage()].title };
}

export default async function AboutPage() {
  const language = await getLanguage();
  const content = aboutContent[language];
  const t = messages[language];
  return <div className="about-page page-width">
    <header className="about-heading">
      <div className="eyebrow red-text">{t.about}</div>
      <h1>{content.title}</h1>
      <p className="about-motto">{content.motto}</p>
    </header>
    <div className="about-layout">
      <nav className="about-contents" aria-label={t.contents}>
        <span className="eyebrow">{t.contents}</span>
        <ol>{content.sections.map((section, index) => <li key={section.id}>
          <a href={`#${section.id}`}><span aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>{section.title}</a>
        </li>)}</ol>
      </nav>
      <article className="prose about-copy">
        {content.sections.map(section => <section key={section.id} id={section.id} aria-labelledby={`${section.id}-heading`}>
          <h2 id={`${section.id}-heading`}>{section.title}</h2>
          {section.paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)}
          {section.statement && <p className="about-statement">{section.statement}</p>}
        </section>)}
        <p className="about-contact">{content.contact}</p>
        <span className="red-square" aria-hidden="true"/>
      </article>
    </div>
  </div>;
}
