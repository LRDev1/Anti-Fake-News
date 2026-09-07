import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import os from 'os';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from 'ffmpeg-static';
import { PrismaClient } from '@prisma/client';
import { analyzeELA } from '../services/elaAnalysis';
import { aggregateImageScore } from '../services/imageAggregator';

if (ffmpegPath) {
  ffmpeg.setFfmpegPath(ffmpegPath);
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 80 * 1024 * 1024 }, // 80MB
});

const router = Router();
const prisma = new PrismaClient();

/**
 * Extrai N frames igualmente espaçados do vídeo usando ffmpeg,
 * devolve os buffers dos frames (PNG) e limpa os arquivos temporários.
 */
async function extractFrames(videoBuffer: Buffer, count = 3): Promise<Buffer[]> {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'antifake-'));
  const videoPath = path.join(tmpDir, 'input.mp4');
  await fs.writeFile(videoPath, videoBuffer);

  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .on('end', async () => {
        try {
          const files = await fs.readdir(tmpDir);
          const frameFiles = files.filter((f) => f.startsWith('frame-'));
          const buffers = await Promise.all(
            frameFiles.map((f) => fs.readFile(path.join(tmpDir, f)))
          );
          await fs.rm(tmpDir, { recursive: true, force: true });
          resolve(buffers);
        } catch (err) {
          reject(err);
        }
      })
      .on('error', async (err) => {
        await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
        reject(err);
      })
      .screenshots({
        count,
        filename: 'frame-%i.png',
        folder: tmpDir,
      });
  });
}

/**
 * POST /api/video-check
 * Multipart/form-data com campo "video"
 */
router.post('/', upload.single('video'), async (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Envie um vídeo no campo "video".' });
  }

  try {
    const frames = await extractFrames(req.file.buffer, 3);

    if (frames.length === 0) {
      return res.status(422).json({ error: 'Não foi possível extrair frames desse vídeo.' });
    }

    const elaResults = await Promise.all(frames.map((f) => analyzeELA(f)));
    const avgAnomaly = Math.round(
      elaResults.reduce((sum, r) => sum + r.anomalyScore, 0) / elaResults.length
    );

    // Vídeos reencodados não carregam EXIF de câmera nos frames extraídos,
    // então essa análise se apoia só na ELA média dos frames-chave.
    const aggregated = aggregateImageScore(
      { hasExifEdit: false, software: null, cameraMake: null, cameraModel: null, originalDate: null },
      { anomalyScore: avgAnomaly }
    );

    const savedCheck = await prisma.check.create({
      data: {
        mediaType: 'VIDEO',
        score: aggregated.score,
        verdict: aggregated.verdict,
        summary: `${aggregated.summary} (análise baseada em ${frames.length} frames extraídos do vídeo)`,
        mediaAnalysis: {
          create: {
            elaAnomalyScore: avgAnomaly,
          },
        },
      },
      include: { mediaAnalysis: true },
    });

    return res.json({ result: savedCheck, framesAnalyzed: frames.length });
  } catch (error) {
    console.error('Erro ao analisar vídeo:', error);
    return res.status(500).json({
      error: 'Erro ao processar o vídeo. Tente novamente.',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

export default router;
