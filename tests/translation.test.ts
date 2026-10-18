import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cleanTranslations, publicationTranslations, translationsSchema } from '../src/lib/translation';
import { hasUnpublishedChanges, publicVersion, type Paper } from '../src/lib/types';

const translation = { title: 'Përshëndetje', summary: '', html: '<p>Një <strong>tekst</strong>.</p>' };

test('translations reject unsupported languages and sanitize rich text', () => {
  assert.equal(translationsSchema.safeParse({ fr: translation }).success, false);
  assert.equal(translationsSchema.safeParse({ sq: { ...translation, title: 'x'.repeat(241) } }).success, false);
  const cleaned = cleanTranslations({ sq: { ...translation, html: '<p onclick="bad()">Safe<script>bad()</script><strong>text</strong></p>' } });
  assert.equal(cleaned.sq?.html, '<p>Safe<strong>text</strong></p>');
});

test('unfinished translations save as drafts but cannot be published', () => {
  const draft = { sq: { title: '', summary: '', html: '<p></p>' } };
  assert.equal(translationsSchema.safeParse(draft).success, true);
  assert.throws(() => publicationTranslations(draft, 'en'), /translationIncomplete/);
  assert.throws(() => publicationTranslations({ en: translation }, 'en'), /translationLanguageConflict/);
  assert.deepEqual(publicationTranslations({ sq: translation }, 'en'), { sq: translation });
});

test('translation edits and removal remain private until publication', () => {
  const content = { title: 'Title', author: 'Author', html: '<p>Hello</p>', summary: '', projectId: null, attachment: null, originalLanguage: 'en' as const, translations: { sq: translation } };
  const paper: Paper = { ...content, id: 'id', revision: 1, createdAt: '', updatedAt: '', published: { ...content, publishedAt: '' } };
  assert.equal(hasUnpublishedChanges(paper), false);
  paper.translations = { sq: { ...translation, title: 'Private edit' } };
  assert.equal(hasUnpublishedChanges(paper), true);
  assert.equal(publicVersion(paper)?.translations?.sq?.title, translation.title);
  paper.translations = {};
  assert.equal(hasUnpublishedChanges(paper), true);
  assert.equal(publicVersion(paper)?.translations?.sq?.title, translation.title);
  delete paper.translations;
  delete paper.published!.translations;
  assert.equal(hasUnpublishedChanges(paper), false);
});
