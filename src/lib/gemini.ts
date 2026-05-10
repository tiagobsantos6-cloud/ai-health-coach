import type { DadosUsuario, Plano } from "./store";

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

function parseJson(text: string): Plano {
  let clean = text.trim();
  clean = clean.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();
  try {
    return JSON.parse(clean);
  } catch {
    const start = clean.search(/[\{\[]/);
    const isArray = start !== -1 && clean[start] === "[";
    const end = clean.lastIndexOf(isArray ? "]" : "}");
    if (start !== -1 && end !== -1 && end > start) {
      const sliced = clean.substring(start, end + 1);
      try {
        return JSON.parse(sliced);
      } catch {
        throw new Error("JSON incompleto recebido da IA. Por favor, tente novamente.");
      }
    }
    throw new Error("JSON incompleto recebido da IA. Por favor, tente novamente.");
  }
}

export async function gerarPlano(dados: DadosUsuario): Promise<Plano> {
  const apiKey = localStorage.getItem("gemini_api_key");
  if (!apiKey) throw new Error("API_KEY_MISSING");

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ role: "user", parts: [{ text: JSON.stringify(dados) }] }],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.7,
          maxOutputTokens: 65536,
        },
      }),
    },
  );

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Erro da API: ${response.status} ${err.slice(0, 200)}`);
  }
  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  const finishReason = data?.candidates?.[0]?.finishReason;
  if (!text) {
    if (finishReason === "MAX_TOKENS") {
      throw new Error("Resposta da IA foi truncada por limite de tokens. Tente novamente.");
    }
    throw new Error("Resposta vazia da IA");
  }
  return parseJson(text);
}

export async function gerarAjustes(dados: DadosUsuario, plano: Plano, historico: unknown): Promise<string> {
  const apiKey = localStorage.getItem("gemini_api_key");
  if (!apiKey) throw new Error("API_KEY_MISSING");
  const prompt = `Com base nos dados do usuário, plano atual e histórico de evolução, sugira ajustes práticos e específicos no plano alimentar e de treino. Responda em português, em formato de lista com tópicos curtos e claros (sem JSON, sem markdown excessivo).\n\nDados: ${JSON.stringify(dados)}\n\nPlano atual (resumo): ${JSON.stringify(plano.resumo)}\n\nHistórico: ${JSON.stringify(historico)}`;
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 2048 },
      }),
    },
  );
  if (!response.ok) throw new Error("Erro ao gerar ajustes");
  const data = await response.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}
