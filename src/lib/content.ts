import sanitize from 'sanitize-html';

export function cleanHtml(html: string) {
  return sanitize(html, {
    allowedTags: ['p', 'br', 'h1', 'h2', 'h3', 'h4', 'strong', 'b', 'em', 'i', 'u', 's', 'del', 'blockquote', 'ul', 'ol', 'li', 'a', 'code', 'pre', 'hr', 'span'],
    allowedAttributes: { a: ['href', 'title', 'target', 'rel'], span: ['style'], ol: ['start'] },
    allowedStyles: { span: { 'font-size': [/^(12|14|16|18|20|24|28|32|36|48)px$/] } },
    allowedSchemes: ['http', 'https', 'mailto'],
    allowProtocolRelative: false,
    transformTags: { a: sanitize.simpleTransform('a', { target: '_blank', rel: 'noopener noreferrer' }) },
  });
}

export function plainText(html: string) {
  return sanitize(html.replace(/<\/(p|h[1-6]|li|blockquote)>/g, ' '), { allowedTags: [], allowedAttributes: {} })
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim();
}

export function readingMinutes(html: string) {
  return Math.max(1, Math.ceil(plainText(html).split(/\s+/).filter(Boolean).length / 220));
}
