# Verifica — Anti-Fake News

Plataforma que investiga a veracidade de informações antes que elas se espalhem: checa textos, links, imagens e vídeos e devolve um veredito com as fontes que embasam a resposta.

> "Investigue antes de compartilhar."

## O que o projeto faz

**Texto e links** — cola um link de notícia ou escreve a alegação diretamente. O sistema extrai o conteúdo, cruza com a [Google Fact Check Tools API](https://developers.google.com/fact-check/tools/api) (agências como Aos Fatos, Lupa, Estadão Verifica) e avalia a credibilidade da fonte contra uma base curada de domínios.

**Imagens** — analisa metadados EXIF (detecta se a imagem passou por Photoshop, GIMP, etc.) e roda Error Level Analysis (ELA), que evidencia inconsistências de compressão típicas de edição localizada.

**Vídeos** — extrai frames-chave com `ffmpeg` e aplica a mesma análise de ELA nos frames extraídos.

Cada checagem recebe um **score de 0 a 100** e um veredito (Confiável / Duvidoso / Falso / Sem dados suficientes), sempre com uma explicação de por que chegou naquele resultado — a ferramenta nunca inventa confiança quando não tem evidência.

## Stack

**Backend:** Node.js, Express, TypeScript, Prisma, PostgreSQL
**Frontend:** React, TypeScript, Tailwind CSS, Vite
**Análise de mídia:** `sharp` (processamento de imagem), `exifr` (metadados), `fluent-ffmpeg` + `ffmpeg-static` (extração de frames)
**Fact-checking:** Google Fact Check Tools API

## Como rodar localmente

### Pré-requisitos
- Node.js 18+
- PostgreSQL rodando localmente (ou um banco na nuvem, tipo Neon/Supabase)
- Uma chave gratuita da [Google Fact Check Tools API](https://console.cloud.google.com/)

### Backend

```bash
npm install
cp .env.example .env
# preencha DATABASE_URL e GOOGLE_FACT_CHECK_API_KEY no .env

npx prisma migrate dev
npm run dev
```

A API sobe em `http://localhost:3333`.

### Frontend

Em outro terminal:

```bash
cd frontend
npm install
npm run dev
```

A interface sobe em `http://localhost:5173`.

## Variáveis de ambiente

| Variável | Obrigatória | Descrição |
|---|---|---|
| `DATABASE_URL` | Sim | Connection string do PostgreSQL |
| `GOOGLE_FACT_CHECK_API_KEY` | Sim | Chave gratuita da Fact Check Tools API |
| `ANTHROPIC_API_KEY` | Não | Se configurada, o sistema usa a API da Anthropic pra extrair a alegação central de perguntas em linguagem natural antes de buscar (ex: "é verdade que..." → alegação objetiva). Sem ela, o texto é usado diretamente na busca. |

## Endpoints da API

```
POST /api/factcheck
Body: { "url": "https://..." } ou { "text": "alegação a checar" }
```

```
POST /api/image-check
Multipart/form-data, campo "image" (JPG/PNG, até 15MB)
```

## Roadmap

- [x] Fact-checking de texto e links
- [x] Análise de imagem (EXIF + ELA)
- [x] Análise de vídeo (frames + ELA)
- [x] Interface web
- [ ] Extração de claim via LLM para perguntas em linguagem natural (implementado, aguardando billing da API)
- [ ] Reverse image search (encontrar onde mais a imagem já circulou)
- [ ] Detecção de deepfake facial/voz via API especializada
- [ ] Fallback com navegador headless (Puppeteer) para sites com conteúdo carregado via JavaScript
- [ ] Expansão contínua da base de domínios curados

## Aviso importante

Essa ferramenta é um **apoio à checagem**, não um veredito absoluto. "Fake news" é um espectro — uma informação pode ser parcialmente verdadeira, desatualizada ou tirada de contexto sem ser tecnicamente falsa. A ausência de sinais de manipulação numa imagem não garante autenticidade; apenas indica ausência dos sinais que sabemos checar automaticamente.

## Autor

Desenvolvido por Lucas Roberto ([LRDev](https://github.com/) / NokkiaDev).
