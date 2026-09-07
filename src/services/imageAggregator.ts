import { ExifResult } from './exifAnalysis';
import { ElaResult } from './elaAnalysis';

export type Verdict = 'CONFIAVEL' | 'DUVIDOSO' | 'FALSO' | 'SEM_DADOS_SUFICIENTES';

export interface ImageAggregatedResult {
  score: number;
  verdict: Verdict;
  summary: string;
}

/**
 * Combina os sinais de EXIF e ELA num score único.
 * Parte de uma base neutra-positiva (70) porque ausência de evidência de
 * manipulação não é o mesmo que prova de autenticidade — mas também não
 * devemos partir de "suspeito por padrão".
 */
export function aggregateImageScore(exif: ExifResult, ela: ElaResult): ImageAggregatedResult {
  let score = 70;
  const flags: string[] = [];

  if (exif.hasExifEdit) {
    score -= 25;
    flags.push(`os metadados indicam edição via ${exif.software}`);
  }

  if (!exif.cameraMake && !exif.software) {
    score -= 5;
    flags.push('os metadados EXIF estão ausentes (comum em imagens reenviadas por redes sociais, que removem essa informação)');
  }

  if (ela.anomalyScore > 60) {
    score -= 30;
    flags.push('a análise de nível de erro (ELA) detectou fortes inconsistências de compressão, possível sinal de edição localizada');
  } else if (ela.anomalyScore > 35) {
    score -= 12;
    flags.push('a ELA detectou inconsistências leves — pode ser edição sutil ou apenas recompressão normal');
  }

  score = Math.max(0, Math.min(100, score));

  const verdict: Verdict = score >= 70 ? 'CONFIAVEL' : score >= 40 ? 'DUVIDOSO' : 'FALSO';

  const summary =
    flags.length > 0
      ? `Encontramos os seguintes sinais: ${flags.join('; ')}.`
      : 'Não encontramos sinais claros de manipulação nos metadados ou na análise de compressão. Isso não garante autenticidade — apenas indica ausência dos sinais que sabemos checar automaticamente.';

  return { score, verdict, summary };
}
