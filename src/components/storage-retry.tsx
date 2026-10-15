'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from './language-provider';

export function StorageRetry() {
  const router = useRouter();
  const { t } = useLanguage();
  const [pending, startTransition] = useTransition();
  return <button className="button primary" disabled={pending} onClick={() => startTransition(() => router.refresh())}>{pending ? t.loading : t.retry}</button>;
}
