import Link from 'next/link';
import { getLanguage } from '@/lib/server-language';
import { messages } from '@/lib/i18n';
import { StorageError } from '@/lib/storage-diagnostics';
import { StorageRetry } from './storage-retry';

export async function storageUnavailable(error: unknown, admin = false) {
  if (!(error instanceof StorageError)) throw error;
  console.warn(`[ASHT storage] ${error.message}`);
  const t = messages[await getLanguage()];
  return <section className="storage-unavailable page-width" aria-labelledby="storage-heading">
    <span className="eyebrow red-text">ASHT</span>
    <h1 id="storage-heading">{t.storageTitle}</h1>
    <p>{t.storageNotice}</p>
    {(admin || process.env.NODE_ENV !== 'production') && <aside className="storage-guidance">
      <p>{t[error.code]}</p><code>npm run check:storage</code>
    </aside>}
    <div className="storage-actions"><StorageRetry/><Link href="/about" className="text-link">{t.about}</Link></div>
  </section>;
}
