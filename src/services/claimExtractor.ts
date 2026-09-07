import axios from 'axios';

const ANTHROPIC_ENDPOINT = 'https://api.anthropic.com/v1/messages';

const SYSTEM_PROMPT = `Você extrai a alegação factual central de uma pergunta ou texto em português.

Regras:
- Devolva APENAS a alegação em si, como uma frase curta e objetiva (máximo 15 palavras).
- Não responda a pergunta, não dê sua opinião, não adicione contexto.
- Transforme perguntas em afirmações. Ex: "é verdade que vacinas causam autismo?" → "vacinas causam autismo"
- Se o texto já for uma afirmação direta, apenas limpe e resuma se necessário.
- Se não houver uma alegação factual clara (ex: pedido de opinião, pergunta muito vaga), devolva o texto original sem alteração.
- Responda SOMENTE com a alegação extraída, sem aspas, sem explicação, sem prefixo.`;

/**
 * Usa a API da Anthropic pra transformar uma pergunta/texto em linguagem natural
 * numa claim objetiva e curta, ideal pra buscar em APIs de fact-check.
 *
 * Ex: "será que é verdade que vão aumentar o IR em 2026?"
 *   → "aumento do imposto de renda em 2026"
 */
export async function extractClaim(rawText: string): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    // Sem chave configurada, devolve o texto original (degrada graciosamente
    // para o comportamento antigo, sem extração via LLM).
    return rawText;
  }

  try {
    const response = await axios.post(
      ANTHROPIC_ENDPOINT,
      {
        model: 'claude-sonnet-4-6',
        max_tokens: 100,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: rawText.slice(0, 3000) }],
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
      }
    );

    const textBlock = response.data?.content?.find((c: any) => c.type === 'text');
    const extracted = textBlock?.text?.trim();

    return extracted && extracted.length > 0 ? extracted : rawText;
  } catch (error) {
    console.error('Erro ao extrair claim via LLM, usando texto original:', error);
    // Fallback: se a API falhar, não trava o fluxo — usa o texto cru.
    return rawText;
  }
}
