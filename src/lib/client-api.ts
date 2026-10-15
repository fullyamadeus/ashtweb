import type { MessageKey } from './i18n';

export class RequestError extends Error {
  constructor(public code: MessageKey, public status: number) { super(code); }
}
export async function api<T>(url: string, options: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, { ...options, headers: { ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }), ...options.headers } });
  } catch { throw new RequestError('networkError', 0); }
  const data = await response.json().catch(() => ({ error: 'failed' }));
  if (!response.ok) throw new RequestError(data.error || 'failed', response.status);
  return data as T;
}
export function errorKey(error: unknown): MessageKey {
  return error instanceof RequestError ? error.code : 'failed';
}
