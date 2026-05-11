import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { z } from "zod";

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

// Strip AI control tokens / role markers from free-text inputs to mitigate prompt injection.
function sanitizeText(s: string): string {
  return s
    .replace(/<\|.*?\|>/g, " ")
    .replace(/\b(system|assistant|user)\s*:/gi, " ")
    .replace(/```/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const shortText = (max: number) =>
  z.string().max(max).transform(sanitizeText).optional().default("");

const dadosSchema = z.object({
  nome: z.string().max(100).transform(sanitizeText),
  sexo: z.string().max(20).transform(sanitizeText),
  idade: z.number().min(0).max(120),
  peso: z.number().min(0).max(500),
  altura: z.number().min(0).max(300),
  gordura: z.number().min(0).max(100).optional(),
  biotipo: z.string().max(50).transform(sanitizeText),
  objetivo: z.string().max(100).transform(sanitizeText),
  diasTreino: z.number().min(0).max(7),
  tempoTreino: z.number().min(0).max(600),
  local: z.string().max(50).transform(sanitizeText),
  horario: z.string().max(50).transform(sanitizeText),
  restricoes: z.array(z.string().max(100).transform(sanitizeText)).max(20),
  restricaoOutro: shortText(300),
  favoritos: shortText(500),
  naoGosta: shortText(500),
  refeicoes: z.number().min(1).max(10),
  orcamento: z.number().min(0).max(100000),
  suplementos: z.boolean(),
  suplementosQuais: shortText(300),
  saude: shortText(500),
  sono: z.number().min(0).max(24),
  estresse: z.number().min(0).max(10),
});

const resumoPlanoSchema = z.record(z.string(), z.string().max(50)).optional().default({});

const historicoSchema = z
  .array(
    z.object({
      data: z.string().max(30),
      peso: z.number().min(0).max(500),
      energia: z.number().min(0).max(10),
      fome: z.number().min(0).max(10),
      treino: z.number().min(0).max(10),
      observacoes: z.string().max(300).transform(sanitizeText).optional().default(""),
    }),
  )
  .max(60);

// Lightweight in-memory per-IP rate limiter. Best-effort mitigation; not a
// substitute for real auth (see security memory).
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 5;
const hits = new Map<string, number[]>();
function rateLimit() {
  const ip =
    getRequestHeader("cf-connecting-ip") ||
    getRequestHeader("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown";
  const now = Date.now();
  const arr = (hits.get(ip) || []).filter((t) => now - t < RATE_WINDOW_MS);
  if (arr.length >= RATE_MAX) {
    throw new Error("Muitas requisições. Aguarde um minuto e tente novamente.");
  }
  arr.push(now);
  hits.set(ip, arr);
  if (hits.size > 1000) {
    // basic cleanup
    for (const [k, v] of hits) if (!v.some((t) => now - t < RATE_WINDOW_MS)) hits.delete(k);
  }
}

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
  .inputValidator((data: { dados: unknown }) => ({
    dados: dadosSchema.parse((data as { dados: unknown }).dados),
  }))
  .handler(async ({ data }) => {
    rateLimit();
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
        max_tokens: 8000,
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
    parseJson(text); // validate
    return { json: text };
  });

export const gerarAjustesFn = createServerFn({ method: "POST" })
  .inputValidator((data: { dados: unknown; resumoPlano: unknown; historico: unknown }) => ({
    dados: dadosSchema.parse(data.dados),
    resumoPlano: resumoPlanoSchema.parse(data.resumoPlano),
    historico: historicoSchema.parse(data.historico),
  }))
  .handler(async ({ data }) => {
    rateLimit();
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
        max_tokens: 2000,
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
