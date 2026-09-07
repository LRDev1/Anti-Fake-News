import axios from 'axios';

export interface FactCheckMatch {
  publisher: string;
  claimReviewed: string;
  textualRating: string;
  sourceUrl: string;
}

const GOOGLE_FACT_CHECK_ENDPOINT =
  'https://factchecktools.googleapis.com/v1alpha1/claims:search';

/**
 * Busca na Google Fact Check Tools API se a claim (ou termos próximos)
 * já foi checada por alguma agência de fact-checking cadastrada no Google.
 * Doc: https://developers.google.com/fact-check/tools/api
 */
export async function searchFactChecks(query: string): Promise<FactCheckMatch[]> {
  const apiKey = process.env.GOOGLE_FACT_CHECK_API_KEY;

  if (!apiKey) {
    throw new Error('GOOGLE_FACT_CHECK_API_KEY não configurada no .env');
  }

  const response = await axios.get(GOOGLE_FACT_CHECK_ENDPOINT, {
    params: {
      query,
      languageCode: 'pt',
      key: apiKey,
    },
  });

  const claims = response.data?.claims ?? [];

  const matches: FactCheckMatch[] = [];

  for (const claim of claims) {
    const reviews = claim.claimReview ?? [];
    for (const review of reviews) {
      matches.push({
        publisher: review.publisher?.name ?? 'Desconhecido',
        claimReviewed: claim.text ?? query,
        textualRating: review.textualRating ?? 'Sem classificação',
        sourceUrl: review.url ?? '',
      });
    }
  }

  return matches;
}
