import { Router, Request, Response } from 'express';
import multer from 'multer';
import { PrismaClient } from '@prisma/client';
import { analyzeExif } from '../services/exifAnalysis';
import { analyzeELA } from '../services/elaAnalysis';
import { aggregateImageScore } from '../services/imageAggregator';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB
});

const router = Router();
const prisma = new PrismaClient();

/**
 * POST /api/image-check
 * Multipart/form-data com campo "image"
 */
router.post('/', upload.single('image'), async (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Envie uma imagem no campo "image".' });
  }

  try {
    const buffer = req.file.buffer;

    const [exif, ela] = await Promise.all([analyzeExif(buffer), analyzeELA(buffer)]);
    const aggregated = aggregateImageScore(exif, ela);

    const savedCheck = await prisma.check.create({
      data: {
        mediaType: 'IMAGE',
        score: aggregated.score,
        verdict: aggregated.verdict,
        summary: aggregated.summary,
        mediaAnalysis: {
          create: {
            hasExifEdit: exif.hasExifEdit,
            elaAnomalyScore: ela.anomalyScore,
            rawProviderData: {
              software: exif.software,
              cameraMake: exif.cameraMake,
              cameraModel: exif.cameraModel,
              originalDate: exif.originalDate,
            },
          },
        },
      },
      include: { mediaAnalysis: true },
    });

    return res.json({ result: savedCheck });
  } catch (error) {
    console.error('Erro ao analisar imagem:', error);
    return res.status(500).json({
      error: 'Erro ao processar a imagem. Tente novamente.',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

export default router;
