import { aboutContent } from '@/lib/site-content';
import { getLanguage } from '@/lib/server-language';
import { messages } from '@/lib/i18n';
export const metadata = { title: 'About' };
export default async function AboutPage() {
  const language = await getLanguage();
  return <section className="about-page page-width"><div className="eyebrow red-text">ASHT</div><h1>{messages[language].about}</h1><div className="prose">{aboutContent[language].split('\n\n').filter(Boolean).map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div></section>;
}
