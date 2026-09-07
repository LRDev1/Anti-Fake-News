import { SourceCredibility } from './sourceCredibility';
import { FactCheckMatch } from './googleFactCheck';

export type Verdict = 'CONFIAVEL' | 'DUVIDOSO' | 'FALSO' | 'SEM_DADOS_SUFICIENTES';

export interface AggregatedResult {
  score: number; // 0-100
  verdict: Verdict;
  summary: string;
}

// Classificações do Google Fact Check que consideramos "negativas"
const NEGATIVE_RATINGS = ['falso', 'enganoso', 'sem evidências', 'distorcido', 'exagerado'];
const POSITIVE_RATINGS = ['verdadeiro', 'correto', 'confirmado'];

/**
 * Combina o score de credibilidade da fonte com os resultados de fact-check
 * num score final único (0-100) e um veredito categórico.
 *
 * Regra de peso: se existir fact-check direto da claim, ele pesa mais que
 * a credibilidade genérica do domínio — uma fonte boa também pode publicar
 * uma informação errada pontualmente.
 */
export function aggregateScore(
  source: SourceCredibility,
  factChecks: FactCheckMatch[]
): AggregatedResult {
  // Caso 1: não achou nenhum fact-check e a fonte é desconhecida
  if (factChecks.length === 0 && !source.isKnown) {
    return {
      score: 50,
      verdict: 'SEM_DADOS_SUFICIENTES',
      summary:
        'Não encontramos checagens específicas sobre essa informação e a fonte ainda não está na nossa base de credibilidade. Recomendamos cautela e checagem manual.',
    };
  }

  // Caso 2: existem fact-checks diretos — eles dominam o score
  if (factChecks.length > 0) {
    const ratingsText = factChecks.map((f) => f.textualRating.toLowerCase());
    const hasNegative = ratingsText.some((r) =>
      NEGATIVE_RATINGS.some((neg) => r.includes(neg))
    );
    const hasPositive = ratingsText.some((r) =>
      POSITIVE_RATINGS.some((pos) => r.includes(pos))
    );

    if (hasNegative && !hasPositive) {
      return {
        score: 10,
        verdict: 'FALSO',
        summary: `Encontramos ${factChecks.length} checagem(ns) de agências independentes classificando essa informação como falsa ou enganosa.`,
      };
    }

    if (hasPositive && !hasNegative) {
      return {
        score: 90,
        verdict: 'CONFIAVEL',
        summary: `Agências de fact-checking confirmaram essa informação como verdadeira.`,
      };
    }

    return {
      score: 40,
      verdict: 'DUVIDOSO',
      summary:
        'Encontramos checagens com classificações mistas ou parciais sobre essa informação. Vale ler as fontes com atenção.',
    };
  }

  // Caso 3: sem fact-check direto, mas a fonte é conhecida — usa o trustScore dela
  const verdict: Verdict =
    source.trustScore >= 70 ? 'CONFIAVEL' : source.trustScore >= 40 ? 'DUVIDOSO' : 'FALSO';

  return {
    score: source.trustScore,
    verdict,
    summary: `Não há checagem específica dessa claim, mas o domínio "${source.domain}" tem histórico ${
      source.trustScore >= 70 ? 'confiável' : 'questionável'
    } em nossa base.`,
  };
}
