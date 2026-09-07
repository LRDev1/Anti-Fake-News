import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import factcheckRouter from './routes/factcheck';
import imageCheckRouter from './routes/imageCheck';
import videoCheckRouter from './routes/videoCheck';
import { seedKnownDomains } from './services/sourceCredibility';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3333;

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Rota temporária pra popular a tabela de domínios conhecidos.
// Rode uma vez (POST /api/seed) e depois pode remover essa rota.
app.post('/api/seed', async (_req, res) => {
  try {
    await seedKnownDomains();
    res.json({ message: 'Domínios conhecidos cadastrados com sucesso.' });
  } catch (error) {
    res.status(500).json({ error: 'Falha ao rodar o seed.', details: String(error) });
  }
});

// Módulo 1: fact-checking de texto/link
app.use('/api/factcheck', factcheckRouter);

// Módulo 2: análise de imagem (EXIF + ELA)
app.use('/api/image-check', imageCheckRouter);

// Módulo 3: análise de vídeo (frames + ELA)
app.use('/api/video-check', videoCheckRouter);

app.listen(PORT, () => {
  console.log(`🕵️  Anti-Fake News API rodando em http://localhost:${PORT}`);
});
