import { extract } from '@extractus/article-extractor';

export interface ExtractedContent {
  title: string | null;
  text: string;
  domain: string;
  publishedAt: string | null;
}

/**
 * Recebe uma URL, faz o scraping e devolve o texto limpo do artigo,
 * já sem menus, anúncios e outros ruídos de página.
 */
export async function extractFromUrl(url: string): Promise<ExtractedContent> {
  const article = await extract(url);

  if (!article || !article.content) {
    throw new Error('Não foi possível extrair conteúdo dessa URL.');
  }

  const domain = new URL(url).hostname.replace(/^www\./, '');

  // Remove tags HTML residuais que o extractor às vezes deixa
  const plainText = article.content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

  return {
    title: article.title ?? null,
    text: plainText,
    domain,
    publishedAt: article.published ?? null,
  };
}
