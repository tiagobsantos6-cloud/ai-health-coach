import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { medidaCaseira } from "./medidaCaseira";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { attachSupabaseAuth } from "@/integrations/supabase/auth-header.middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Alimento, Plano } from "./store";

const GENERIC_AI_ERROR = "Erro ao contactar serviço de IA. Tente novamente.";
const SERVICE_UNAVAILABLE = "Serviço temporariamente indisponível.";

const SYSTEM_PROMPT = `Você é um especialista em nutrição esportiva, personal trainer e coach de disciplina. Baseado nos dados do usuário, gere um plano 100% personalizado. Responda SOMENTE com um JSON válido, sem texto adicional, sem markdown, sem blocos de código.

Mantenha o JSON compacto: frases curtas, no máximo 5 alimentos por refeição e no máximo 6 exercícios por dia. NÃO inclua arrays "opcoes" dentro dos alimentos e NÃO preencha "substituicoes"; o sistema adicionará as substituições equivalentes automaticamente. No objeto "resumo", envie apenas números em string (ex: "2500" em vez de "2500 kcal").

⚠️ OBRIGATÓRIO — QUANTIDADE DE REFEIÇÕES: gere EXATAMENTE o número de refeições que o usuário informou no campo "refeicoes". Se o usuário pediu 3 refeições, gere apenas 3. Se pediu 4, gere 4. Se pediu 5, gere 5. NUNCA gere mais nem menos que o solicitado. plano_alimentar.length DEVE ser igual a refeicoes.

O JSON deve ter exatamente esta estrutura:

{
  "resumo": { "imc": "", "tmb": "", "tdee": "", "meta_calorica": "", "proteinas_g": "", "carboidratos_g": "", "gorduras_g": "", "agua_diaria_ml": "", "sono_ideal_h": "" },
  "plano_alimentar": [ { "refeicao": "", "horario": "", "alimentos": [ { "nome": "", "quantidade_g": 0, "calorias": 0, "proteinas_g": 0, "carboidratos_g": 0, "gorduras_g": 0 } ], "total_calorias": 0 } ],
  "substituicoes": [],
  "treino": { "divisao": "", "dias": [ { "dia": "", "foco": "", "exercicios": [ { "nome": "", "musculo": "", "series": 0, "repeticoes": "", "descanso_s": 0 } ], "cardio": { "tipo": "", "duracao_min": 0, "intensidade": "" } } ] },
  "rotina_semanal": [ { "dia_semana": "", "treino": "", "refeicoes_resumo": "", "meta_agua": "", "meta_sono": "" } ],
  "disciplina": { "metas_diarias": [], "checklist": [], "habitos": [], "estrategias": [] },
  "acompanhamento": { "frequencia": "", "metricas": [], "ajustes_automaticos": "" },
  "metas": { "peso_desejado": 0, "prazo_semanas": 0, "perda_semanal_kg": 0, "perda_mensal_kg": 0 }
}

IMPORTANTE: Quando o usuário informar peso_desejado e prazo_semanas (objetivos de Emagrecimento ou Definição), calibre a meta calórica, distribuição de macros e intensidade do treino para suportar exatamente o ritmo de perda informado. Não recomende perda acima de 1kg/semana. Repita os valores recebidos no campo "metas" do JSON.

REGRA CRÍTICA: A soma de total_calorias de TODAS as refeições em plano_alimentar DEVE ser EXATAMENTE igual ao valor de meta_calorica em resumo. Da mesma forma, a soma de proteinas_g, carboidratos_g e gorduras_g de TODOS os alimentos de TODAS as refeições deve bater EXATAMENTE com os valores de proteinas_g, carboidratos_g e gorduras_g do resumo.

DISTRIBUIÇÃO PADRÃO POR NÚMERO DE REFEIÇÕES (use estes percentuais da meta_calorica E aplique a MESMA proporção para cada macro: proteínas, carboidratos e gorduras):
- 3 refeições: 25% / 40% / 35%
- 4 refeições: 20% / 35% / 15% / 30%
- 5 refeições: 20% / 30% / 10% / 25% / 15%
- 6 refeições: 15% / 25% / 10% / 20% / 15% / 15%

Antes de retornar o JSON, confira: (a) número de refeições é exatamente o solicitado, (b) soma das calorias bate com meta_calorica, (c) soma de cada macro bate com o respectivo valor no resumo.`;

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

// Supabase-backed per-user rate limiter. Janela fixa de 1 minuto, máx 5 req.
// Best-effort em ambiente serverless: usa upsert atômico em row única por usuário.
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 5;

async function rateLimit(userId: string) {
  const now = new Date();
  const { data: existing, error: selErr } = await supabaseAdmin
    .from("rate_limits")
    .select("hits, window_start")
    .eq("user_id", userId)
    .maybeSingle();

  if (selErr) {
    console.error("rate_limits select error", selErr);
    return; // fail-open para não derrubar a feature por erro de infra
  }

  const windowStart = existing?.window_start ? new Date(existing.window_start) : null;
  const dentroDaJanela = windowStart && now.getTime() - windowStart.getTime() < RATE_WINDOW_MS;

  if (dentroDaJanela && (existing?.hits ?? 0) >= RATE_MAX) {
    throw new Error("Muitas requisições. Aguarde um minuto e tente novamente.");
  }

  const novoRegistro = dentroDaJanela
    ? { user_id: userId, hits: (existing!.hits ?? 0) + 1, window_start: existing!.window_start }
    : { user_id: userId, hits: 1, window_start: now.toISOString() };

  const { error: upErr } = await supabaseAdmin
    .from("rate_limits")
    .upsert(novoRegistro, { onConflict: "user_id" });
  if (upErr) console.error("rate_limits upsert error", upErr);
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

  // Validação: soma das calorias das refeições deve bater com meta_calorica (±150 kcal).
  const metaKcal = Number(String(p.resumo?.meta_calorica ?? "").replace(/[^0-9.]/g, "")) || 0;
  const somaKcal = p.plano_alimentar.reduce((acc, r) => acc + (r.total_calorias || 0), 0);
  if (metaKcal > 0 && somaKcal > 0 && Math.abs(somaKcal - metaKcal) > 150) {
    const fator = metaKcal / somaKcal;
    console.warn(
      `[gerarPlano] Soma das refeições (${somaKcal} kcal) difere da meta (${metaKcal} kcal). Ajustando por fator ${fator.toFixed(3)}.`,
    );
    p.plano_alimentar = p.plano_alimentar.map((r) => {
      const alimentos = r.alimentos.map((a) => ({
        ...a,
        calorias: Math.round((a.calorias || 0) * fator),
      }));
      return {
        ...r,
        alimentos,
        total_calorias: Math.round(alimentos.reduce((acc, a) => acc + (a.calorias || 0), 0)),
      };
    });
  }

  // Validação proporcional de cada macro (proteínas, carboidratos, gorduras):
  // a soma do macro em todas as refeições deve bater com o alvo do resumo.
  // Se diferir mais que 10g, ajusta cada alimento proporcionalmente.
  const macroKeys = ["proteinas_g", "carboidratos_g", "gorduras_g"] as const;
  macroKeys.forEach((key) => {
    const alvo = Number(String((p.resumo as Record<string, string>)?.[key] ?? "").replace(/[^0-9.]/g, "")) || 0;
    const soma = p.plano_alimentar.reduce(
      (acc, r) => acc + r.alimentos.reduce((a, al) => a + (Number(al[key]) || 0), 0),
      0,
    );
    if (alvo > 0 && soma > 0 && Math.abs(soma - alvo) > 10) {
      const fator = alvo / soma;
      console.warn(
        `[gerarPlano] ${key}: soma ${soma.toFixed(1)}g difere do alvo ${alvo}g. Ajustando por fator ${fator.toFixed(3)}.`,
      );
      p.plano_alimentar = p.plano_alimentar.map((r) => ({
        ...r,
        alimentos: r.alimentos.map((a) => ({
          ...a,
          [key]: Math.round(((Number(a[key]) || 0) * fator) * 10) / 10,
        })),
      }));
    }
  });

  // Sincroniza resumo.meta_calorica com a soma real das refeições (fonte da verdade).
  const somaFinal = p.plano_alimentar.reduce((acc, r) => acc + (r.total_calorias || 0), 0);
  p.resumo = { ...p.resumo, meta_calorica: String(somaFinal) };

  return p;
}

export const gerarPlanoFn = createServerFn({ method: "POST" })
  .middleware([attachSupabaseAuth, requireSupabaseAuth])
  .inputValidator((data: { dados: unknown }) => ({
    dados: dadosSchema.parse((data as { dados: unknown }).dados),
  }))
  .handler(async ({ data, context }) => {
    await rateLimit(context.userId);
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) {
      console.error("LOVABLE_API_KEY missing on server");
      throw new Error(SERVICE_UNAVAILABLE);
    }

    const dd = data.dados;
    const wantsLoss = dd.objetivo === "Emagrecimento" || dd.objetivo === "Definição";
    const pesoAlvo = dd.pesoDesejado ?? 0;
    const prazo = dd.prazoSemanas ?? 0;
    const diff = dd.peso - pesoAlvo;
    const metas: Plano["metas"] | undefined =
      wantsLoss && pesoAlvo > 0 && prazo > 0 && diff > 0
        ? {
            peso_desejado: pesoAlvo,
            prazo_semanas: prazo,
            perda_semanal_kg: Number((diff / prazo).toFixed(2)),
            perda_mensal_kg: Number(((diff / prazo) * 4).toFixed(2)),
          }
        : undefined;

    const refeicoesPedidas = dd.refeicoes;
    const diasTreinoPedidos = dd.diasTreino;
    const MAPA_DIAS: Record<number, string[]> = {
      1: ["Segunda"],
      2: ["Segunda", "Quinta"],
      3: ["Segunda", "Quarta", "Sexta"],
      4: ["Segunda", "Terça", "Quinta", "Sexta"],
      5: ["Segunda", "Terça", "Quarta", "Quinta", "Sexta"],
      6: ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"],
      7: ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"],
    };
    const diasEsperados = MAPA_DIAS[diasTreinoPedidos] ?? MAPA_DIAS[5];
    const priorityPrompt =
      `MAPEAMENTO OBRIGATÓRIO DE DIAS: Para ${diasTreinoPedidos} dias de treino, use EXATAMENTE estes dias nesta ordem: ${diasEsperados.join(", ")}. Não use outros dias da semana.\n\n` +
      `REGRA OBRIGATÓRIA DE TREINO: O usuário selecionou ${diasTreinoPedidos} dias de treino por semana. Gere EXATAMENTE ${diasTreinoPedidos} objetos no array treino.dias. Cada objeto deve ter um dia da semana diferente (Segunda, Terça, Quarta, Quinta, Sexta, Sábado ou Domingo) com exercícios reais. NÃO gere dias vazios, NÃO gere dias de descanso no array, NÃO repita dias. Se dias_treino=5, gere 5 objetos com 5 dias diferentes, todos com exercícios.\n\n` +
      `INSTRUÇÃO PRIORITÁRIA NÚMERO 1 — NÃO IGNORE: O usuário solicitou EXATAMENTE ${refeicoesPedidas} refeições. Você deve gerar SOMENTE ${refeicoesPedidas} itens no array plano_alimentar. Se gerar mais ou menos que ${refeicoesPedidas} refeições, a resposta será considerada inválida e rejeitada. Conte os itens antes de responder.\n\n`;

    const callGateway = async (extraReinforcement?: string) => {
      const systemContent = priorityPrompt + SYSTEM_PROMPT + (extraReinforcement ? `\n\n${extraReinforcement}` : "");
      const response = await fetch(GATEWAY_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: MODEL,
          messages: [
            { role: "system", content: systemContent },
            { role: "user", content: JSON.stringify({ ...data.dados, metas_calculadas: metas }) },
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
      if (!text) throw new Error(GENERIC_AI_ERROR);
      return parseJson(text) as Plano;
    };

    // Até 3 tentativas (1 inicial + 2 retries) para garantir nº correto de refeições E dias de treino.
    let plano: Plano | null = null;
    let lastMealCount = 0;
    let lastTrainingIssue = "";
    for (let attempt = 1; attempt <= 3; attempt++) {
      const reinforcementParts: string[] = [];
      if (attempt > 1 && lastMealCount !== refeicoesPedidas) {
        reinforcementParts.push(
          `⚠️ TENTATIVA ${attempt}: Na resposta anterior você gerou ${lastMealCount} refeições, mas o usuário pediu EXATAMENTE ${refeicoesPedidas}. Gere SOMENTE ${refeicoesPedidas} itens no array plano_alimentar.`,
        );
      }
      if (attempt > 1 && lastTrainingIssue) {
        reinforcementParts.push(
          `⚠️ TENTATIVA ${attempt} — TREINO: ${lastTrainingIssue}. Gere EXATAMENTE ${diasTreinoPedidos} dias diferentes em treino.dias, todos com exercícios reais.`,
        );
      }
      const reinforcement = reinforcementParts.length ? reinforcementParts.join("\n\n") : undefined;
      const raw = await callGateway(reinforcement);
      lastMealCount = raw?.plano_alimentar?.length ?? 0;

      // Validação dupla dos dias de treino.
      const dias = raw?.treino?.dias ?? [];
      lastTrainingIssue = "";
      if (dias.length !== diasTreinoPedidos) {
        lastTrainingIssue = `recebeu ${dias.length} dias mas esperava ${diasTreinoPedidos}`;
      } else if (dias.some((d) => !d?.exercicios || d.exercicios.length === 0)) {
        lastTrainingIssue = "havia dias com array de exercícios vazio";
      } else {
        const nomesDias = dias.map((d) => (d.dia || "").trim().toLowerCase());
        const unicos = new Set(nomesDias);
        if (unicos.size !== diasTreinoPedidos) {
          lastTrainingIssue = "havia dias duplicados";
        } else {
          const diasRecebidos = dias.map((d) => (d.dia || "").trim());
          const diasCorretos = diasEsperados.every((d, i) => diasRecebidos[i] === d);
          if (!diasCorretos) {
            lastTrainingIssue = `dias incorretos: recebeu [${diasRecebidos.join(", ")}] mas esperava [${diasEsperados.join(", ")}]`;
          }
        }
      }

      if (lastMealCount === refeicoesPedidas && !lastTrainingIssue) {
        plano = raw;
        break;
      }
      console.warn(
        `[gerarPlano] tentativa ${attempt}: refeições=${lastMealCount}/${refeicoesPedidas}, treino=${lastTrainingIssue || "ok"}. ${attempt < 3 ? "Tentando novamente..." : "Limite atingido."}`,
      );
    }
    if (!plano) {
      throw new Error(
        `Não foi possível gerar um plano válido após 3 tentativas. Por favor, tente novamente.`,
      );
    }
    const planoFinal = completarPlano(plano);
    if (metas) planoFinal.metas = metas;
    return { json: JSON.stringify(planoFinal) };
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
