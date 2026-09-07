# Anti-Fake News — MVP (Módulo de Fact-Checking)

Plataforma para combater desinformação, analisando texto/links, imagens, vídeos e áudios.
**Esta é a fase 1: módulo de fact-checking de texto e links.**

## Como funciona

1. Usuário envia um link ou um texto
2. Se for link, o backend extrai o conteúdo do artigo (scraping)
3. Verifica a credibilidade do domínio numa tabela curada (`DomainReputation`)
4. Busca na Google Fact Check Tools API se a informação já foi checada por
   agências como Aos Fatos, Lupa, etc.
5. Agrega os dois sinais num score final (0-100) + veredito + explicação
6. Salva no Postgres (histórico + cache de 24h por link)

## Setup

```bash
npm install
cp .env.example .env
# preencha DATABASE_URL e GOOGLE_FACT_CHECK_API_KEY no .env

npx prisma migrate dev --name init
npm run dev
```

### Conseguindo a Google Fact Check API Key
1. Acesse o [Google Cloud Console](https://console.cloud.google.com/)
2. Crie um projeto (ou use um existente)
3. Habilite a "Fact Check Tools API"
4. Gere uma API Key em "Credenciais"
5. É gratuita, com limite de quota generoso para uso inicial

### Populando a tabela de domínios conhecidos
O arquivo `src/services/sourceCredibility.ts` tem uma função `seedKnownDomains()`
com alguns domínios de exemplo. Recomendo rodar isso via um script simples ou
endpoint temporário, e ir expandindo a lista com fontes como o
[Media Bias/Fact Check](https://mediabiasfactcheck.com/).

## Endpoint disponível

```
POST /api/factcheck
Content-Type: application/json

{ "url": "https://exemplo.com/noticia" }
```
ou
```
{ "text": "Alegação a ser verificada diretamente em texto" }
```

Resposta:
```json
{
  "cached": false,
  "result": {
    "score": 10,
    "verdict": "FALSO",
    "summary": "Encontramos 2 checagem(ns)...",
    "sourceCheck": { "domain": "...", "trustScore": 30 },
    "factCheck": [ { "publisher": "Aos Fatos", "textualRating": "Falso", ... } ]
  }
}
```

## Roadmap (próximas fases)

- [x] Fase 1 — Fact-checking de texto/link (este MVP)
- [ ] Fase 2 — Análise de imagem: EXIF, reverse image search, Error Level Analysis (ELA)
- [ ] Fase 3 — Análise de vídeo: extração de frames via ffmpeg + reuso do pipeline de imagem
- [ ] Fase 4 — Detecção de deepfake facial/voz via API paga (Hive, Sensity) — só depois de validar tração
- [ ] Front-end em React/TS/Tailwind consumindo essa API

O schema do Prisma (`prisma/schema.prisma`) já reserva os modelos `MediaAnalysisResult`
e o enum `MediaType` para as fases 2 e 3, então a estrutura de dados não vai precisar
de refatoração grande quando você chegar lá — só implementar os novos serviços e
plugar mais uma rota no `src/index.ts`.

## Ponto de atenção de produto

Deixe sempre claro na UI que isso é uma **ferramenta de apoio à checagem**, não um
veredito absoluto. "Fake news" é um espectro — uma informação pode ser parcialmente
verdadeira, desatualizada, ou tirada de contexto sem ser tecnicamente "falsa".
