import 'server-only';
import { cookies } from 'next/headers';
import type { Language } from './types';
export async function getLanguage(): Promise<Language> {
  return (await cookies()).get('asht-language')?.value === 'sq' ? 'sq' : 'en';
}
