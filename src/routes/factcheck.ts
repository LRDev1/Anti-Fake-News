import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { extractFromUrl } from '../services/extractContent';
import { checkDomainCredibility } from '../services/sourceCredibility';
import { searchFactChecks } from '../services/googleFactCheck';
import { aggregateScore } from '../services/scoreAggregator';
import { extractClaim } from '../services/claimExtractor';

const router = Router();
const prisma = new PrismaClient();

/**
 * POST /api/factcheck
 * Body: { url?: string, text?: string }
 *
 * Aceita um link OU um texto direto. Se for link, extrai o conteúdo primeiro.
 */
router.post('/', async (req: Request, res: Response) => {
  const { url, text } = req.body as { url?: string; text?: string };

  if (!url && !text) {
    return res.status(400).json({ error: 'Envie "url" ou "text" no corpo da requisição.' });
  }

  try {
    let claimText = text ?? '';
    let domain = 'texto-direto';

    if (url) {
      // Verifica cache: já checamos esse link antes?
      const cached = await prisma.check.findFirst({
        where: { inputUrl: url },
        orderBy: { createdAt: 'desc' },
        include: { sourceCheck: true, factCheck: true },
      });

      // Cache válido por 24h — evita rechecar o mesmo link toda hora
      if (cached && Date.now() - cached.createdAt.getTime() < 1000 * 60 * 60 * 24) {
        return res.json({ cached: true, result: cached });
      }

      const extracted = await extractFromUrl(url);
      claimText = extracted.title ? `${extracted.title}. ${extracted.text}` : extracted.text;
      domain = extracted.domain;
    }

    // Transforma a pergunta/texto em linguagem natural numa alegação
    // objetiva e curta, ideal pra bater com fact-checks já publicados.
    const extractedClaim = await extractClaim(claimText.slice(0, 3000));

    const [sourceCredibility, factChecks] = await Promise.all([
      checkDomainCredibility(domain),
      searchFactChecks(extractedClaim),
    ]);

    const aggregated = aggregateScore(sourceCredibility, factChecks);

    const savedCheck = await prisma.check.create({
      data: {
        mediaType: 'TEXT_LINK',
        inputUrl: url ?? null,
        inputText: claimText.slice(0, 2000),
        extractedClaim,
        score: aggregated.score,
        verdict: aggregated.verdict,
        summary: aggregated.summary,
        sourceCheck: {
          create: {
            domain: sourceCredibility.domain,
            trustScore: sourceCredibility.trustScore,
            category: sourceCredibility.category,
          },
        },
        factCheck: {
          create: factChecks.map((f) => ({
            publisher: f.publisher,
            claimReviewed: f.claimReviewed,
            textualRating: f.textualRating,
            sourceUrl: f.sourceUrl,
          })),
        },
      },
      include: { sourceCheck: true, factCheck: true },
    });

    return res.json({ cached: false, result: savedCheck });
  } catch (error) {
    console.error('Erro no fact-check:', error);
    return res.status(500).json({
      error: 'Erro ao processar a checagem. Tente novamente.',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

export default router;
