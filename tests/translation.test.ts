import { test } from 'node:test';
import assert from 'node:assert/strict';
import { translationChunks, translateText } from '../src/lib/translation';
import { hasUnpublishedChanges, publicVersion, type Paper } from '../src/lib/types';

test('segments preserve UTF-8, whitespace and full article text within provider limits', () => {
  for (const text of ['Здраво свету! '.repeat(200), 'ë'.repeat(600), '😀'.repeat(400), 'A sentence. '.repeat(300), '']) {
    const chunks = translationChunks(text);
    assert.equal(chunks.join(''), text);
    for (const chunk of chunks) assert.ok(Buffer.byteLength(chunk, 'utf8') <= 500);
  }
});

test('the original language is snapshotted and draft language changes stay private', () => {
  const content = { title: 'Title', author: 'Author', html: '<p>Hello</p>', summary: '', projectId: null, attachment: null, originalLanguage: 'en' as const };
  const paper: Paper = { ...content, id: 'id', revision: 1, createdAt: '', updatedAt: '', published: { ...content, publishedAt: '' } };
  assert.equal(hasUnpublishedChanges(paper), false);
  paper.originalLanguage = 'sq';
  assert.equal(hasUnpublishedChanges(paper), true);
  assert.equal(publicVersion(paper)?.originalLanguage, 'en');
});

test('provider failure never becomes translated article content', async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => Response.json({ responseStatus: 403, responseData: { translatedText: 'QUOTA EXCEEDED' } });
    await assert.rejects(translateText('Hello', 'en', 'sq', new AbortController().signal), /translationFailed/);
  } finally { globalThis.fetch = originalFetch; }
});
