import type { ArticleLanguage } from './types';
import { cleanHtml } from './content';

// MyMemory accepts at most 500 UTF-8 bytes per segment, including Cyrillic.
export function translationChunks(text: string): string[] {
  const chunks: string[] = [];
  let chunk = '';
  const encoder = new TextEncoder();
  for (const token of text.match(/\S+\s*|\s+/gu) || []) {
    if (encoder.encode(chunk + token).length <= 500) { chunk += token; continue; }
    if (chunk) { chunks.push(chunk); chunk = ''; }
    for (const char of token) {
      if (encoder.encode(chunk + char).length > 500) { chunks.push(chunk); chunk = ''; }
      chunk += char;
    }
  }
  if (chunk) chunks.push(chunk);
  return chunks;
}

export async function translateText(text: string, source: ArticleLanguage, target: ArticleLanguage, signal: AbortSignal): Promise<string> {
  if (source === target || !text.trim()) return text;
  const translated: string[] = [];
  for (const chunk of translationChunks(text)) {
    signal.throwIfAborted();
    if (!chunk.trim()) { translated.push(chunk); continue; }
    const url = new URL('https://api.mymemory.translated.net/get');
    url.searchParams.set('q', chunk.trim());
    url.searchParams.set('langpair', `${source}|${target}`);
    const response = await fetch(url, { signal: AbortSignal.any([signal, AbortSignal.timeout(20000)]), credentials: 'omit', referrerPolicy: 'no-referrer' });
    if (!response.ok) throw new Error('translationFailed');
    const data = await response.json();
    if (Number(data.responseStatus) !== 200 || data.quotaFinished || typeof data.responseData?.translatedText !== 'string' || !data.responseData.translatedText.trim()) {
      throw new Error('translationFailed');
    }
    translated.push((chunk.match(/^\s*/u)?.[0] || '') + data.responseData.translatedText + (chunk.match(/\s*$/u)?.[0] || ''));
  }
  return translated.join('');
}

export async function translateArticle(content: { title: string; summary: string; html: string }, source: ArticleLanguage, target: ArticleLanguage, signal: AbortSignal) {
  const title = await translateText(content.title, source, target, signal);
  const summary = await translateText(content.summary, source, target, signal);
  const doc = new DOMParser().parseFromString(cleanHtml(content.html), 'text/html');
  const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  while (walker.nextNode()) {
    const node = walker.currentNode as Text;
    if (node.textContent?.trim() && !node.parentElement?.closest('pre, code')) nodes.push(node);
  }
  // Only replace text nodes: provider output can never create links or executable HTML.
  for (const node of nodes) node.textContent = await translateText(node.textContent || '', source, target, signal);
  return { title, summary, html: cleanHtml(doc.body.innerHTML) };
}
