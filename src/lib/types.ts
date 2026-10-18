export const articleLanguages = { sq: 'Shqip', mk: 'Македонски', en: 'English' } as const;
export type ArticleLanguage = keyof typeof articleLanguages;

export type Language = 'en' | 'sq';

export type Attachment = {
  key: string;
  name: string;
  size: number;
  type: 'application/pdf';
};

export type Project = {
  id: string;
  name: string;
  createdAt: string;
};

export type PaperContent = {
  originalLanguage?: ArticleLanguage | null;
  title: string;
  author: string;
  summary: string;
  html: string;
  projectId: string | null;
  attachment: Attachment | null;
};

export type Publication = PaperContent & { publishedAt: string };

export type Paper = PaperContent & {
  id: string;
  createdAt: string;
  updatedAt: string;
  revision: number;
  published: Publication | null;
};

export type PublicPaper = Publication & { id: string };

export function hasUnpublishedChanges(paper: Paper) {
  if (!paper.published) return true;
  return (['originalLanguage', 'title', 'author', 'summary', 'html', 'projectId', 'attachment'] as const)
    .some(key => JSON.stringify(paper[key]) !== JSON.stringify(paper.published![key]));
}

export function publicVersion(paper: Paper): PublicPaper | null {
  return paper.published ? { id: paper.id, ...paper.published } : null;
}
