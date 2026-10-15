import { AppError } from './errors';

export const storageHelp = {
  storageSetup: 'Set STORAGE_MODE=supabase, SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env or your hosting environment. Local storage is available only in development.',
  storageCredentials: 'Supabase rejected the API key, or a public key was supplied. Copy the project URL and a complete Secret API key from the same Supabase project into SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY. Restart the local server or redeploy after updating hosted environment variables.',
  storagePermissions: 'Supabase denied database access. Use a Secret API key (or legacy service_role key) and run supabase/schema.sql in that project. Keep the tables and file bucket private.',
  storageSchema: 'The Supabase database setup is missing or incomplete. Run the entire supabase/schema.sql file in the SQL Editor of the configured project.',
  storageUnavailable: 'Supabase could not be reached or completed the request unsuccessfully. Check the project status and network connection, then try again.',
};

export type StorageErrorCode = keyof typeof storageHelp;

export class StorageError extends AppError {
  declare code: StorageErrorCode;
  constructor(code: StorageErrorCode) {
    super(code, 503);
    this.name = 'StorageError';
    // Only fixed, actionable messages: never include credentials or raw database errors.
    this.message = storageHelp[code];
  }
}

export function readStorageConfig(env: Record<string, string | undefined>) {
  const url = env.SUPABASE_URL?.trim();
  const key = env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (env.STORAGE_MODE !== 'supabase' || !url || !key) throw new StorageError('storageSetup');
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password) throw new Error();
  } catch { throw new StorageError('storageSetup'); }

  let serviceRole = false;
  if (key.split('.').length === 3) {
    try { serviceRole = JSON.parse(Buffer.from(key.split('.')[1], 'base64url').toString()).role === 'service_role'; }
    catch { /* Supabase will verify the actual signature; this only checks the key type. */ }
  }
  if (!key.startsWith('sb_secret_') && !serviceRole) throw new StorageError('storageCredentials');
  return { url, key };
}

export function storageFailure(error: { code?: string; message?: string; status?: number; statusCode?: string }) {
  if (error.code === '42501' || error.status === 403 || error.statusCode === '403') return new StorageError('storagePermissions');
  if (['42P01', '42703', '42883', 'PGRST202', 'PGRST204', 'PGRST205', 'NoSuchBucket'].includes(error.code || '') || /^bucket not found$/i.test(error.message || '')) return new StorageError('storageSchema');
  if (error.status === 401 || error.statusCode === '401' || ['PGRST301', 'PGRST302', 'PGRST303'].includes(error.code || '') || /invalid api key|invalid jwt|jwt expired/i.test(error.message || '')) return new StorageError('storageCredentials');
  return new StorageError('storageUnavailable');
}
