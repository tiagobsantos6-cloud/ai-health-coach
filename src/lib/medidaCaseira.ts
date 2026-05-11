// Fallback automático para medida caseira quando a IA não fornecer.
// Heurística baseada no nome do alimento.
const REGRAS: Array<{ match: RegExp; calc: (g: number) => string }> = [
  { match: /\b(ovo|ovos)\b/i, calc: (g) => `${Math.max(1, Math.round(g / 50))} unidade(s)` },
  { match: /\b(banana|maçã|maca|pera|laranja|kiwi|fruta)\b/i, calc: (g) => `${Math.max(1, Math.round(g / 120))} unidade(s) média(s)` },
  { match: /\b(pão|pao|fatia)\b/i, calc: (g) => `${Math.max(1, Math.round(g / 25))} fatia(s)` },
  { match: /\b(arroz|quinoa|cuscuz)\b/i, calc: (g) => `${(g / 50).toFixed(1)} colher(es) de servir` },
  { match: /\b(feijão|feijao|lentilha|grão|grao)\b/i, calc: (g) => `${Math.max(1, Math.round(g / 80))} concha(s)` },
  { match: /\b(aveia|granola|farinha|chia|linhaça|linhaca)\b/i, calc: (g) => `${Math.max(1, Math.round(g / 15))} colher(es) de sopa` },
  { match: /\b(azeite|óleo|oleo|manteiga|mel|geléia|geleia|pasta de amendoim)\b/i, calc: (g) => `${Math.max(1, Math.round(g / 5))} colher(es) de chá` },
  { match: /\b(leite|iogurte|suco|água|agua|bebida)\b/i, calc: (g) => g >= 200 ? `${(g / 200).toFixed(1)} copo(s)` : `${Math.round(g)}ml` },
  { match: /\b(frango|peito|peixe|tilápia|tilapia|salmão|salmao|carne|patinho|filé|file)\b/i, calc: (g) => `${Math.max(1, Math.round(g / 100))} filé(s) (~100g)` },
  { match: /\b(batata|mandioca|inhame)\b/i, calc: (g) => `${Math.max(1, Math.round(g / 130))} unidade(s) média(s)` },
  { match: /\b(salada|alface|rúcula|rucula|tomate|pepino|cenoura|brócolis|brocolis|couve)\b/i, calc: (g) => `${Math.max(1, Math.round(g / 80))} pires` },
  { match: /\b(queijo)\b/i, calc: (g) => `${Math.max(1, Math.round(g / 30))} fatia(s)` },
  { match: /\b(whey|proteína|proteina|suplemento)\b/i, calc: (g) => `${Math.max(1, Math.round(g / 30))} scoop(s)` },
];

export function medidaCaseira(nome: string, gramas: number, dado?: string): string {
  if (dado && dado.trim()) return dado.trim();
  for (const r of REGRAS) if (r.match.test(nome)) return r.calc(gramas);
  if (gramas >= 200) return `${(gramas / 100).toFixed(1)} porção(ões)`;
  return `${Math.max(1, Math.round(gramas / 15))} colher(es) de sopa`;
}
