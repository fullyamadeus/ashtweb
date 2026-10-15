import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readStorageConfig, storageFailure, StorageError } from '../src/lib/storage-diagnostics';

const config = { STORAGE_MODE: 'supabase', SUPABASE_URL: 'https://example.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'sb_secret_test-only' };
const jwt = (role: string) => `header.${Buffer.from(JSON.stringify({ role })).toString('base64url')}.signature`;
const isStorageError = (code: string) => (error: unknown) => error instanceof StorageError && error.code === code && error.status === 503;

test('Supabase configuration rejects missing values and public keys before a database request', () => {
  assert.throws(() => readStorageConfig({}), isStorageError('storageSetup'));
  assert.throws(() => readStorageConfig({ ...config, SUPABASE_URL: 'not-a-url' }), isStorageError('storageSetup'));
  for (const key of ['sb_publishable_test-only', jwt('anon'), jwt('authenticated'), 'invalid-key']) {
    assert.throws(() => readStorageConfig({ ...config, SUPABASE_SERVICE_ROLE_KEY: key }), isStorageError('storageCredentials'));
  }
  assert.equal(readStorageConfig(config).key, config.SUPABASE_SERVICE_ROLE_KEY);
  assert.equal(readStorageConfig({ ...config, SUPABASE_SERVICE_ROLE_KEY: jwt('service_role') }).key, jwt('service_role'));
});

test('database errors distinguish credentials, missing schema, permissions and connection failures', () => {
  assert.equal(storageFailure({ message: 'Invalid API key' }).code, 'storageCredentials');
  assert.equal(storageFailure({ status: 401 }).code, 'storageCredentials');
  assert.equal(storageFailure({ code: '42501', status: 401 }).code, 'storagePermissions');
  assert.equal(storageFailure({ code: 'PGRST205' }).code, 'storageSchema');
  assert.equal(storageFailure({ code: 'PGRST202' }).code, 'storageSchema');
  assert.equal(storageFailure({ code: '42703' }).code, 'storageSchema');
  assert.equal(storageFailure({ message: 'Bucket not found' }).code, 'storageSchema');
  assert.equal(storageFailure({ message: 'TypeError: fetch failed' }).code, 'storageUnavailable');
});

test('storage diagnostics never include raw provider errors or credentials', () => {
  const error = storageFailure({ message: `Invalid API key: ${config.SUPABASE_SERVICE_ROLE_KEY}` });
  assert.equal(error.code, 'storageCredentials');
  assert.ok(!error.message.includes(config.SUPABASE_SERVICE_ROLE_KEY));
  assert.ok(!JSON.stringify(error).includes(config.SUPABASE_SERVICE_ROLE_KEY));
});
