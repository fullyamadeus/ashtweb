'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, LockKeyhole } from 'lucide-react';
import { api, errorKey } from '@/lib/client-api';
import { useLanguage } from './language-provider';
import type { MessageKey } from '@/lib/i18n';

export function LoginForm({ configured }: { configured: boolean }) {
  const { t } = useLanguage();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<MessageKey | null>(null);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setBusy(true); setError(null);
    const data = new FormData(e.currentTarget);
    try {
      await api('/api/auth/login', { method: 'POST', body: JSON.stringify({ username: data.get('username'), password: data.get('password') }) });
      router.replace('/admin'); router.refresh();
    } catch (error) { setError(errorKey(error)); setBusy(false); }
  }
  return <div className="login-form-wrap"><div className="eyebrow red-text"><LockKeyhole size={13}/> ASHT / {t.workspace}</div><h1>{t.loginTitle}</h1><p className="login-intro">{t.loginIntro}</p>
    {!configured && <p className="notice" role="status">{t.loginSetup}</p>}
    <form onSubmit={submit} className="login-form">
      <label>{t.username}<input name="username" autoComplete="username" required maxLength={100} autoCapitalize="none" spellCheck={false}/></label>
      <label>{t.password}<input name="password" type="password" autoComplete="current-password" required maxLength={1024}/></label>
      {error && <p className="error-message" role="alert">{t[error] || t.failed}</p>}
      <button type="submit" className="button primary" disabled={busy || !configured}>{busy ? t.signingIn : t.signIn}<ArrowRight size={16}/></button>
    </form>
  </div>;
}
