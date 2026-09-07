-- CreateEnum
CREATE TYPE "MediaType" AS ENUM ('TEXT_LINK', 'IMAGE', 'VIDEO', 'AUDIO');

-- CreateEnum
CREATE TYPE "Verdict" AS ENUM ('CONFIAVEL', 'DUVIDOSO', 'FALSO', 'SEM_DADOS_SUFICIENTES');

-- CreateTable
CREATE TABLE "Check" (
    "id" TEXT NOT NULL,
    "mediaType" "MediaType" NOT NULL,
    "inputUrl" TEXT,
    "inputText" TEXT,
    "score" INTEGER NOT NULL,
    "verdict" "Verdict" NOT NULL,
    "summary" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Check_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SourceCredibilityResult" (
    "id" TEXT NOT NULL,
    "checkId" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "trustScore" INTEGER NOT NULL,
    "category" TEXT,

    CONSTRAINT "SourceCredibilityResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DomainReputation" (
    "id" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "trustScore" INTEGER NOT NULL,
    "category" TEXT,
    "notes" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DomainReputation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FactCheckMatch" (
    "id" TEXT NOT NULL,
    "checkId" TEXT NOT NULL,
    "publisher" TEXT NOT NULL,
    "claimReviewed" TEXT NOT NULL,
    "textualRating" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,

    CONSTRAINT "FactCheckMatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaAnalysisResult" (
    "id" TEXT NOT NULL,
    "checkId" TEXT NOT NULL,
    "hasExifEdit" BOOLEAN,
    "reverseSearchHits" INTEGER,
    "elaAnomalyScore" INTEGER,
    "deepfakeScore" INTEGER,
    "rawProviderData" JSONB,

    CONSTRAINT "MediaAnalysisResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Check_inputUrl_idx" ON "Check"("inputUrl");

-- CreateIndex
CREATE INDEX "Check_createdAt_idx" ON "Check"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SourceCredibilityResult_checkId_key" ON "SourceCredibilityResult"("checkId");

-- CreateIndex
CREATE UNIQUE INDEX "DomainReputation_domain_key" ON "DomainReputation"("domain");

-- CreateIndex
CREATE UNIQUE INDEX "MediaAnalysisResult_checkId_key" ON "MediaAnalysisResult"("checkId");

-- AddForeignKey
ALTER TABLE "SourceCredibilityResult" ADD CONSTRAINT "SourceCredibilityResult_checkId_fkey" FOREIGN KEY ("checkId") REFERENCES "Check"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FactCheckMatch" ADD CONSTRAINT "FactCheckMatch_checkId_fkey" FOREIGN KEY ("checkId") REFERENCES "Check"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaAnalysisResult" ADD CONSTRAINT "MediaAnalysisResult_checkId_fkey" FOREIGN KEY ("checkId") REFERENCES "Check"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
