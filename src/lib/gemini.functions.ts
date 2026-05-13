import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import { medidaCaseira } from "./medidaCaseira";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { attachSupabaseAuth } from "@/integrations/supabase/auth-header.middleware";
import type { Alimento, Plano } from "./store";

const GENERIC_AI_ERROR = "Erro ao contactar serviço de IA. Tente novamente.";
const SERVICE_UNAVAILABLE = "Serviço temporariamente indisponível.";

const SYSTEM_PROMPT = `Você é um especialista em nutrição esportiva, personal trainer e coach de disciplina. Baseado nos dados do usuário, gere um plano 100% personalizado. Responda SOMENTE com um JSON válido, sem texto adicional, sem markdown, sem blocos de código.

Mantenha o JSON compacto: frases curtas, no máximo 5 alimentos por refeição e no máximo 6 exercícios por dia. NÃO inclua arrays "opcoes" dentro dos alimentos e NÃO preencha "substituicoes"; o sistema adicionará as substituições equivalentes automaticamente. No objeto "resumo", envie apenas números em string (ex: "2500" em vez de "2500 kcal").

O JSON deve ter exatamente esta estrutura:

{
  "resumo": { "imc": "", "tmb": "", "tdee": "", "meta_calorica": "", "proteinas_g": "", "carboidratos_g": "", "gorduras_g": "", "agua_diaria_ml": "", "sono_ideal_h": "" },
  "plano_alimentar": [ { "refeicao": "", "horario": "", "alimentos": [ { "nome": "", "quantidade_g": 0, "calorias": 0, "proteinas_g": 0, "carboidratos_g": 0, "gorduras_g": 0 } ], "total_calorias": 0 } ],
  "substituicoes": [],
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
  pesoDesejado: z.number().min(0).max(500).optional(),
  prazoSemanas: z.number().min(1).max(52).optional(),
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

function repairJson(s: string): string {
  // Remove última vírgula e tenta fechar strings/objetos/arrays abertos.
  let str = s;
  // Se a última posição estiver dentro de uma string (nº ímpar de aspas não escapadas), corta até a última vírgula segura.
  let inStr = false;
  let escape = false;
  const stack: string[] = [];
  let lastSafe = -1;
  for (let i = 0; i < str.length; i++) {
    const c = str[i];
    if (escape) { escape = false; continue; }
    if (c === "\\") { escape = true; continue; }
    if (c === '"') { inStr = !inStr; continue; }
    if (inStr) continue;
    if (c === "{" || c === "[") stack.push(c === "{" ? "}" : "]");
    else if (c === "}" || c === "]") stack.pop();
    if (!inStr && (c === "}" || c === "]" || c === ",")) lastSafe = i;
  }
  if (inStr) {
    // corta antes do início da string aberta
    str = str.substring(0, lastSafe + 1);
  }
  // remove vírgula final
  str = str.replace(/,\s*$/, "");
  // recomputa stack após corte
  const stack2: string[] = [];
  let inStr2 = false;
  let esc2 = false;
  for (let i = 0; i < str.length; i++) {
    const c = str[i];
    if (esc2) { esc2 = false; continue; }
    if (c === "\\") { esc2 = true; continue; }
    if (c === '"') { inStr2 = !inStr2; continue; }
    if (inStr2) continue;
    if (c === "{") stack2.push("}");
    else if (c === "[") stack2.push("]");
    else if (c === "}" || c === "]") stack2.pop();
  }
  while (stack2.length) str += stack2.pop();
  return str;
}

function parseJson(text: string): unknown {
  let clean = text.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();
  try { return JSON.parse(clean); } catch {}
  const start = clean.search(/[\{\[]/);
  if (start !== -1) clean = clean.substring(start);
  try { return JSON.parse(clean); } catch {}
  try { return JSON.parse(repairJson(clean)); } catch {
    throw new Error("JSON incompleto recebido da IA. Por favor, tente novamente.");
  }
}

const SUBSTITUICOES: Array<{ match: RegExp; nomes: string[] }> = [
  { match: /\b(frango|peito de frango|ave)\b/i, nomes: ["Patinho moído grelhado", "Filé de tilápia grelhado", "Ovos cozidos"] },
  { match: /\b(carne|patinho|bife|alcatra)\b/i, nomes: ["Peito de frango grelhado", "Filé de peixe grelhado", "Ovos mexidos"] },
  { match: /\b(peixe|tilápia|tilapia|salmão|salmao|atum)\b/i, nomes: ["Peito de frango grelhado", "Patinho moído grelhado", "Ovos cozidos"] },
  { match: /\b(ovo|ovos|omelete)\b/i, nomes: ["Peito de frango desfiado", "Queijo cottage", "Iogurte grego natural"] },
  { match: /\b(whey|proteína|proteina)\b/i, nomes: ["Iogurte grego natural", "Claras de ovo", "Queijo cottage"] },
  { match: /\b(arroz|macarrão|macarrao|quinoa|cuscuz)\b/i, nomes: ["Batata-doce cozida", "Mandioca cozida", "Pão integral"] },
  { match: /\b(batata|mandioca|inhame)\b/i, nomes: ["Arroz integral cozido", "Macarrão integral cozido", "Quinoa cozida"] },
  { match: /\b(feijão|feijao|lentilha|grão|grao de bico|ervilha)\b/i, nomes: ["Lentilha cozida", "Grão-de-bico cozido", "Feijão carioca cozido"] },
  { match: /\b(aveia|granola|cereal)\b/i, nomes: ["Pão integral", "Tapioca", "Batata-doce cozida"] },
  { match: /\b(banana|maçã|maca|pera|laranja|fruta|mamão|mamao)\b/i, nomes: ["Maçã", "Banana", "Mamão"] },
  { match: /\b(leite|iogurte|cottage|queijo)\b/i, nomes: ["Iogurte natural", "Queijo cottage", "Leite desnatado"] },
  { match: /\b(azeite|óleo|oleo|castanha|amendoim|abacate)\b/i, nomes: ["Castanhas", "Abacate", "Pasta de amendoim"] },
  { match: /\b(salada|alface|rúcula|rucula|tomate|brócolis|brocolis|legumes|verdura)\b/i, nomes: ["Brócolis cozido", "Salada verde", "Legumes refogados"] },
];

function opcoesParaAlimento(alimento: Alimento): Alimento[] {
  const grupo = SUBSTITUICOES.find((s) => s.match.test(alimento.nome));
  const nomes = grupo?.nomes ?? ["Opção equivalente 1", "Opção equivalente 2", "Opção equivalente 3"];
  return nomes.slice(0, 3).map((nome) => ({
    ...alimento,
    nome,
    medida_caseira: medidaCaseira(nome, alimento.quantidade_g),
  }));
}

function completarPlano(plano: unknown): Plano {
  const p = plano as Plano;
  const substituicoes: Plano["substituicoes"] = [];
  p.plano_alimentar = (p.plano_alimentar || []).map((refeicao) => {
    const alimentos = (refeicao.alimentos || []).map((alimento) => {
      const base = {
        ...alimento,
        medida_caseira: medidaCaseira(alimento.nome, alimento.quantidade_g, alimento.medida_caseira),
      };
      const opcoes = base.opcoes?.length ? base.opcoes.slice(0, 3) : opcoesParaAlimento(base);
      const opcoesComMedida = opcoes.map((opcao) => ({
        ...opcao,
        medida_caseira: medidaCaseira(opcao.nome, opcao.quantidade_g, opcao.medida_caseira),
      }));
      opcoesComMedida.forEach((opcao) => {
        substituicoes.push({
          original: base.nome,
          substituto: opcao.nome,
          equivalencia: `${opcao.quantidade_g}g — macros equivalentes ao alimento original`,
        });
      });
      return { ...base, opcoes: opcoesComMedida };
    });
    return {
      ...refeicao,
      alimentos,
      total_calorias: Math.round(alimentos.reduce((acc, a) => acc + (a.calorias || 0), 0)),
    };
  });
  p.substituicoes = substituicoes;
  return p;
}

export const gerarPlanoFn = createServerFn({ method: "POST" })
  .middleware([attachSupabaseAuth, requireSupabaseAuth])
  .inputValidator((data: { dados: unknown }) => ({
    dados: dadosSchema.parse((data as { dados: unknown }).dados),
  }))
  .handler(async ({ data }) => {
    rateLimit();
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) {
      console.error("LOVABLE_API_KEY missing on server");
      throw new Error(SERVICE_UNAVAILABLE);
    }

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
        max_tokens: 24000,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error(`AI gateway error ${response.status}: ${err.slice(0, 500)}`);
      if (response.status === 429) throw new Error("Muitas requisições. Aguarde um instante e tente novamente.");
      if (response.status === 402) throw new Error("Serviço de IA temporariamente indisponível.");
      throw new Error(GENERIC_AI_ERROR);
    }
    const json = await response.json();
    const text = json?.choices?.[0]?.message?.content;
    const finishReason = json?.choices?.[0]?.finish_reason;
    if (finishReason === "length" || finishReason === "MAX_TOKENS") {
      throw new Error("Resposta da IA foi cortada por limite de tamanho. Tente gerar novamente.");
    }
    if (!text) {
      throw new Error(GENERIC_AI_ERROR);
    }
    const plano = completarPlano(parseJson(text));
    return { json: JSON.stringify(plano) };
  });

export const gerarAjustesFn = createServerFn({ method: "POST" })
  .middleware([attachSupabaseAuth, requireSupabaseAuth])
  .inputValidator((data: { dados: unknown; resumoPlano: unknown; historico: unknown }) => ({
    dados: dadosSchema.parse(data.dados),
    resumoPlano: resumoPlanoSchema.parse(data.resumoPlano),
    historico: historicoSchema.parse(data.historico),
  }))
  .handler(async ({ data, context }) => {
    rateLimit();

    // Server-side subscription tier gate (matches `ajustes_ia_evolucao` recurso).
    const { data: sub, error: subErr } = await context.supabase
      .from("subscriptions")
      .select("tier")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (subErr) {
      console.error("[subscription] read error", subErr);
      throw new Error(SERVICE_UNAVAILABLE);
    }
    const tier = sub?.tier ?? "gratuito";
    if (tier !== "intermediario" && tier !== "completo") {
      throw new Error("Recurso disponível apenas nos planos Intermediário ou Completo.");
    }

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) {
      console.error("LOVABLE_API_KEY missing on server");
      throw new Error(SERVICE_UNAVAILABLE);
    }

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
      const err = await response.text();
      console.error(`AI gateway error ${response.status}: ${err.slice(0, 500)}`);
      if (response.status === 429) throw new Error("Muitas requisições. Aguarde um instante.");
      if (response.status === 402) throw new Error("Serviço de IA temporariamente indisponível.");
      throw new Error(GENERIC_AI_ERROR);
    }
    const json = await response.json();
    return (json?.choices?.[0]?.message?.content as string) ?? "";
  });
