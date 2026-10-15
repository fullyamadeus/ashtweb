import { loadEnvConfig } from '@next/env';
import { createClient } from '@supabase/supabase-js';
import { readStorageConfig, storageFailure, StorageError } from '../src/lib/storage-diagnostics';

async function main() {
  loadEnvConfig(process.cwd(), !process.argv.includes('--production'));
  if (process.env.STORAGE_MODE === 'local' && !process.env.VERCEL && !process.argv.includes('--production')) {
    console.log('Local development storage is selected. Set STORAGE_MODE=supabase to check the hosted database.');
    return;
  }
  const { url, key } = readStorageConfig(process.env);
  const db = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(12_000) }) },
  });
  // Zero-row reads check access and schema without retrieving papers or changing data.
  // Unlike HEAD requests, these retain Supabase's useful error code in the response.
  for (const [table, columns] of [
    ['projects', 'id,name,created_at'],
    ['papers', 'id,title,author,summary,content_html,project_id,attachment,revision,created_at,updated_at,published_snapshot'],
    ['login_attempts', 'key,attempts,window_start'],
  ]) {
    const { error, status } = await db.from(table).select(columns).limit(0);
    if (error) throw storageFailure({ ...error, status });
    console.log(`OK: ${table} table is accessible.`);
  }
  const { data: bucket, error } = await db.storage.getBucket('papers');
  if (error) throw error.status === 404 ? new StorageError('storageSchema') : storageFailure(error);
  if (!bucket || bucket.public) throw new StorageError('storagePermissions');
  console.log('OK: private papers bucket is accessible. Supabase connection checks passed.');
}

main().catch(error => {
  console.error(error instanceof StorageError ? error.message : 'The storage check could not complete. Check your project status and network connection.');
  process.exitCode = 1;
});
