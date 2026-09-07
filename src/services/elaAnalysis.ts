import sharp from 'sharp';

export interface ElaResult {
  anomalyScore: number; // 0-100, quanto maior, mais sinais de inconsistência
}

/**
 * Error Level Analysis (ELA): recomprime a imagem numa qualidade JPEG conhecida
 * e compara com a original. Áreas editadas tendem a "reagir" diferente à
 * recompressão do que áreas originais, porque já passaram por compressão antes.
 *
 * Importante: isso é uma heurística, não uma prova definitiva de manipulação.
 * Uma imagem pode ter diferenças de compressão por motivos legítimos (edição
 * de brilho/contraste feita pelo próprio fotógrafo, por exemplo).
 */
export async function analyzeELA(buffer: Buffer): Promise<ElaResult> {
  try {
    const normalized = sharp(buffer).jpeg({ quality: 100 });
    const originalBuffer = await normalized.toBuffer();

    const recompressedBuffer = await sharp(originalBuffer).jpeg({ quality: 90 }).toBuffer();

    const { data: origData } = await sharp(originalBuffer)
      .raw()
      .toBuffer({ resolveWithObject: true });
    const { data: reData } = await sharp(recompressedBuffer)
      .raw()
      .toBuffer({ resolveWithObject: true });

    const len = Math.min(origData.length, reData.length);
    if (len === 0) {
      return { anomalyScore: 0 };
    }

    let totalDiff = 0;
    for (let i = 0; i < len; i++) {
      totalDiff += Math.abs(origData[i] - reData[i]);
    }
    const avgDiff = totalDiff / len; // escala aproximada 0-255

    // Normaliza pra 0-100. O divisor foi calibrado empiricamente — vale
    // ajustar conforme for testando com imagens reais.
    const anomalyScore = Math.min(100, Math.round((avgDiff / 20) * 100));

    return { anomalyScore };
  } catch (error) {
    console.error('Erro na análise ELA:', error);
    return { anomalyScore: 0 };
  }
}
