import { createServerFn } from "@tanstack/react-start";

const SYSTEM_PROMPT = `Você é um especialista em nutrição esportiva, personal trainer e coach de disciplina. Baseado nos dados do usuário, gere um plano 100% personalizado. Responda SOMENTE com um JSON válido, sem texto adicional, sem markdown, sem blocos de código. O JSON deve ter exatamente esta estrutura. IMPORTANTE: No objeto "resumo", envie apenas os números (ex: "2500" em vez de "2500 kcal").

{
  "resumo": { "imc": "", "tmb": "", "tdee": "", "meta_calorica": "", "proteinas_g": "", "carboidratos_g": "", "gorduras_g": "", "agua_diaria_ml": "", "sono_ideal_h": "" },
  "plano_alimentar": [ { "refeicao": "", "horario": "", "alimentos": [ { "nome": "", "quantidade_g": 0, "calorias": 0, "proteinas_g": 0, "carboidratos_g": 0, "gorduras_g": 0 } ], "total_calorias": 0 } ],
  "substituicoes": [ { "original": "", "substituto": "", "equivalencia": "" } ],
  "treino": { "divisao": "", "dias": [ { "dia": "", "foco": "", "exercicios": [ { "nome": "", "musculo": "", "series": 0, "repeticoes": "", "descanso_s": 0 } ], "cardio": { "tipo": "", "duracao_min": 0, "intensidade": "" } } ] },
  "rotina_semanal": [ { "dia_semana": "", "treino": "", "refeicoes_resumo": "", "meta_agua": "", "meta_sono": "" } ],
  "disciplina": { "metas_diarias": [], "checklist": [], "habitos": [], "estrategias": [] },
  "acompanhamento": { "frequencia": "", "metricas": [], "ajustes_automaticos": "" }
}`;

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-2.5-flash";

function parseJson(text: string): unknown {
  let clean = text.trim();
  clean = clean.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();
  try {
    return JSON.parse(clean);
  } catch {
    const start = clean.search(/[\{\[]/);
    const isArray = start !== -1 && clean[start] === "[";
    const end = clean.lastIndexOf(isArray ? "]" : "}");
    if (start !== -1 && end !== -1 && end > start) {
      try {
        return JSON.parse(clean.substring(start, end + 1));
      } catch {
        throw new Error("JSON incompleto recebido da IA. Por favor, tente novamente.");
      }
    }
    throw new Error("JSON incompleto recebido da IA. Por favor, tente novamente.");
  }
}

export const gerarPlanoFn = createServerFn({ method: "POST" })
  .inputValidator((data: { dados: unknown }) => data)
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY não configurada no servidor");

    const response = await fetch(GATEWAY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: JSON.stringify(data.dados) },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      if (response.status === 429) throw new Error("Muitas requisições. Aguarde um instante e tente novamente.");
      if (response.status === 402) throw new Error("Créditos da IA esgotados. Adicione créditos ao seu workspace Lovable.");
      throw new Error(`Erro da IA: ${response.status} ${err.slice(0, 200)}`);
    }
    const json = await response.json();
    const text = json?.choices?.[0]?.message?.content;
    const finishReason = json?.choices?.[0]?.finish_reason;
    if (!text) {
      if (finishReason === "length") throw new Error("Resposta truncada por limite de tokens. Tente novamente.");
      throw new Error("Resposta vazia da IA");
    }
    return parseJson(text) as Record<string, unknown>;
  });

export const gerarAjustesFn = createServerFn({ method: "POST" })
  .inputValidator((data: { dados: unknown; resumoPlano: unknown; historico: unknown }) => data)
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY não configurada no servidor");

    const prompt = `Com base nos dados do usuário, plano atual e histórico de evolução, sugira ajustes práticos e específicos no plano alimentar e de treino. Responda em português, em formato de lista com tópicos curtos e claros (sem JSON, sem markdown excessivo).\n\nDados: ${JSON.stringify(data.dados)}\n\nPlano atual (resumo): ${JSON.stringify(data.resumoPlano)}\n\nHistórico: ${JSON.stringify(data.historico)}`;

    const response = await fetch(GATEWAY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) throw new Error("Muitas requisições. Aguarde um instante.");
      if (response.status === 402) throw new Error("Créditos da IA esgotados.");
      throw new Error(`Erro ao gerar ajustes: ${response.status}`);
    }
    const json = await response.json();
    return (json?.choices?.[0]?.message?.content as string) ?? "";
  });
