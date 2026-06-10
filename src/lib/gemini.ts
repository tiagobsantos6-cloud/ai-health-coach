import type { DadosUsuario, Plano } from "./store";
import { gerarPlanoFn, gerarAjustesFn } from "./gemini.functions";

export async function gerarPlano(dados: DadosUsuario): Promise<Plano> {
  const idioma = (typeof window !== "undefined" && localStorage.getItem("idioma")) || "pt";
  const res = await gerarPlanoFn({ data: { dados: { ...dados, idioma } } });
  return JSON.parse(res.json) as Plano;
}

export async function gerarAjustes(dados: DadosUsuario, plano: Plano, historico: unknown): Promise<string> {
  return await gerarAjustesFn({ data: { dados, resumoPlano: plano.resumo, historico } });
}
