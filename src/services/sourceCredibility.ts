import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface SourceCredibility {
  domain: string;
  trustScore: number; // 0-100
  category: string | null;
  isKnown: boolean;
}

/**
 * Verifica a reputação de um domínio na tabela curada.
 * Se o domínio não estiver cadastrado ainda, devolve um score neutro (50)
 * e marca isKnown=false, para o front sinalizar "fonte não avaliada ainda".
 */
export async function checkDomainCredibility(domain: string): Promise<SourceCredibility> {
  const record = await prisma.domainReputation.findUnique({
    where: { domain },
  });

  if (!record) {
    return {
      domain,
      trustScore: 50,
      category: null,
      isKnown: false,
    };
  }

  return {
    domain: record.domain,
    trustScore: record.trustScore,
    category: record.category,
    isKnown: true,
  };
}

/**
 * Seed inicial de domínios conhecidos. Rodar uma vez ou expandir aos poucos.
 * Valores de exemplo — recomendo revisar e complementar com fontes tipo
 * Media Bias/Fact Check antes de usar em produção.
 */
export async function seedKnownDomains() {
  const seedData = [
    { domain: 'g1.globo.com', trustScore: 85, category: 'agência de notícias' },
    { domain: 'aosfatos.org', trustScore: 95, category: 'agência de fact-checking' },
    { domain: 'lupa.uol.com.br', trustScore: 95, category: 'agência de fact-checking' },
    { domain: 'apublica.org', trustScore: 90, category: 'jornalismo investigativo' },
    { domain: 'bbc.com', trustScore: 88, category: 'agência de notícias' },
  ];

  for (const item of seedData) {
    await prisma.domainReputation.upsert({
      where: { domain: item.domain },
      update: item,
      create: item,
    });
  }
}
