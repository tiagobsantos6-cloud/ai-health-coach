import type { PlanoAssinatura } from "./store";

export const ORDEM_PLANOS: PlanoAssinatura[] = ["gratuito", "basico", "intermediario", "completo"];

export const NOMES_PLANOS: Record<PlanoAssinatura, string> = {
  gratuito: "Gratuito",
  basico: "Básico",
  intermediario: "Intermediário",
  completo: "Completo",
};

export type Recurso =
  | "substituicoes_alimentares"
  | "historico_completo_evolucao"
  | "regenerar_plano"
  | "ajustes_ia_evolucao"
  | "lista_compras"
  | "analise_inteligente"
  | "coach_chat"
  | "fases_treino"
  | "receitas_exclusivas"
  | "biomarcadores";

export const RECURSO_MIN: Record<Recurso, PlanoAssinatura> = {
  substituicoes_alimentares: "basico",
  historico_completo_evolucao: "basico",
  regenerar_plano: "basico",
  ajustes_ia_evolucao: "intermediario",
  lista_compras: "intermediario",
  analise_inteligente: "intermediario",
  coach_chat: "completo",
  fases_treino: "completo",
  receitas_exclusivas: "completo",
  biomarcadores: "completo",
};

export const LIMITE_HISTORICO_GRATUITO = 4;

export function nivelPlano(p: PlanoAssinatura) {
  return ORDEM_PLANOS.indexOf(p);
}

export function temAcesso(planoAtual: PlanoAssinatura, recurso: Recurso) {
  return nivelPlano(planoAtual) >= nivelPlano(RECURSO_MIN[recurso]);
}
