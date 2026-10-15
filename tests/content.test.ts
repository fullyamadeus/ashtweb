import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cleanHtml, plainText } from '../src/lib/content';
import { hasUnpublishedChanges, publicVersion, type Paper } from '../src/lib/types';

test('article HTML removes scripts, active embeds, malicious links and arbitrary styling', () => {
  const html = cleanHtml('<p onclick="alert(1)">Text<script>alert(1)</script><img src=x onerror="alert(1)"></p><iframe src="https://example.com"></iframe><a href="javascript:alert(1)">bad</a><a href="//evil.example">bad</a><span style="position:fixed;font-size:24px;color:red">large</span>');
  assert.doesNotMatch(html, /script|iframe|<img|onclick|onerror|javascript|evil\.example|position:|color:/);
  assert.match(html, /font-size:24px/);
});

test('supported editorial formatting and safe links survive sanitizing', () => {
  const html = cleanHtml('<h2>Research</h2><p><strong>Bold</strong> <em>Italic</em> <u>Underline</u></p><blockquote>Quotation</blockquote><a href="https://example.com">Source</a><ul><li>Item</li></ul>');
  assert.match(html, /<h2>Research<\/h2>/);
  assert.match(html, /<strong>Bold<\/strong>/);
  assert.match(html, /rel="noopener noreferrer"/);
  assert.match(html, /href="https:\/\/example.com"/);
  assert.equal(plainText('<p>First</p><p>Second &amp; third</p>'), 'First Second & third');
});

test('public projection never includes private revisions or edits', () => {
  const shared = { title: 'Public title', author: 'Author', summary: '', html: '<p>Published</p>', projectId: null, attachment: null };
  const paper: Paper = { ...shared, id: 'id', title: 'Secret new title', html: '<p>Private edit</p>', revision: 3, createdAt: '2026-01-01', updatedAt: '2026-01-02', published: { ...shared, publishedAt: '2026-01-01' } };
  assert.equal(publicVersion(paper)?.title, 'Public title');
  assert.doesNotMatch(JSON.stringify(publicVersion(paper)), /Secret|Private|revision|updatedAt/);
  assert.equal(hasUnpublishedChanges(paper), true);
  assert.equal(publicVersion({ ...paper, published: null }), null);
});
