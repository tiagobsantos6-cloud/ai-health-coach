import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Share2, RotateCcw, ShoppingCart } from "lucide-react";

export const Route = createFileRoute("/_app/compras")({
  head: () => ({
    meta: [
      { title: "Lista de Compras — AI Health Coach" },
      { name: "description", content: "Lista de compras semanal consolidada a partir do seu plano alimentar." },
      { property: "og:title", content: "Lista de Compras — AI Health Coach" },
      { property: "og:description", content: "Tudo que você precisa comprar para seguir seu plano da semana." },
    ],
  }),
  component: Compras,
});

type Categoria = "Proteínas" | "Carboidratos" | "Frutas" | "Laticínios" | "Gorduras" | "Outros";

type Unidade = "g" | "kg" | "un" | "L" | "ml";

type ItemCompra = {
  nome: string;
  quantidade: number;
  unidade: Unidade;
  categoria: Categoria;
  totalGramas: number;
};

const ORDEM_CATEGORIAS: Categoria[] = [
  "Proteínas",
  "Carboidratos",
  "Frutas",
  "Laticínios",
  "Gorduras",
  "Outros",
];

const PROTEINAS = [
  "frango", "peito de frango", "carne", "patinho", "alcatra", "coxao", "filé",
  "peixe", "tilápia", "salmão", "atum", "sardinha", "camarão",
  "ovo", "clara",
  "whey", "proteína", "proteina",
  "presunto", "peru",
];
const CARBOS = [
  "arroz", "macarrão", "macarrao", "pão", "pao", "batata", "mandioca", "inhame",
  "aveia", "tapioca", "cuscuz", "quinoa", "feijão", "feijao", "lentilha",
  "grão", "grao", "milho", "biscoito", "bolacha", "wrap", "torrada",
];
const FRUTAS = [
  "banana", "maçã", "maca", "pera", "laranja", "mexerica", "tangerina",
  "mamão", "mamao", "abacate", "uva", "morango", "kiwi", "manga", "abacaxi",
  "melancia", "melão", "melao", "limão", "limao", "fruta",
];
const LATICINIOS = [
  "leite", "iogurte", "queijo", "requeijão", "requeijao", "ricota", "mussarela",
  "muçarela", "manteiga",
];
const GORDURAS = [
  "azeite", "óleo", "oleo", "castanha", "amêndoa", "amendoa", "amendoim",
  "noz", "pasta de amendoim", "chia", "linhaça", "linhaca", "semente",
];

const FRUTAS_PESO_UNIDADE: Record<string, number> = {
  banana: 100,
  maçã: 150, maca: 150,
  pera: 150,
  laranja: 180,
  mexerica: 130, tangerina: 130,
  mamão: 400, mamao: 400,
  abacate: 300,
  manga: 300,
  kiwi: 80,
  morango: 15,
  uva: 5,
  abacaxi: 900,
  limão: 60, limao: 60,
};

const PROTEINAS_UN: Record<string, number> = {
  ovo: 50, ovos: 50, clara: 35,
};

const LATICINIOS_LIQUIDOS = ["leite", "iogurte"];

const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

const matchesAny = (nome: string, lista: string[]) => {
  const n = normalize(nome);
  return lista.some((k) => n.includes(normalize(k)));
};

function categorizar(nome: string): Categoria {
  if (matchesAny(nome, PROTEINAS)) return "Proteínas";
  if (matchesAny(nome, FRUTAS)) return "Frutas";
  if (matchesAny(nome, LATICINIOS)) return "Laticínios";
  if (matchesAny(nome, GORDURAS)) return "Gorduras";
  if (matchesAny(nome, CARBOS)) return "Carboidratos";
  return "Outros";
}

function converterUnidade(nome: string, categoria: Categoria, totalGramas: number): { quantidade: number; unidade: Unidade } {
  const n = normalize(nome);

  // Ovos / claras → unidades
  for (const k of Object.keys(PROTEINAS_UN)) {
    if (n.includes(k)) {
      return { quantidade: Math.max(1, Math.round(totalGramas / PROTEINAS_UN[k])), unidade: "un" };
    }
  }

  if (categoria === "Frutas") {
    for (const [k, peso] of Object.entries(FRUTAS_PESO_UNIDADE)) {
      if (n.includes(k)) {
        return { quantidade: Math.max(1, Math.round(totalGramas / peso)), unidade: "un" };
      }
    }
    // fallback fruta
    return { quantidade: Math.max(1, Math.round(totalGramas / 150)), unidade: "un" };
  }

  if (categoria === "Laticínios" && LATICINIOS_LIQUIDOS.some((k) => n.includes(k))) {
    if (totalGramas >= 1000) {
      return { quantidade: Math.round((totalGramas / 1000) * 10) / 10, unidade: "L" };
    }
    return { quantidade: Math.round(totalGramas), unidade: "ml" };
  }

  // Proteínas / Carboidratos / Gorduras / Outros → kg ou g
  if (totalGramas >= 1000) {
    return { quantidade: Math.round((totalGramas / 1000) * 10) / 10, unidade: "kg" };
  }
  return { quantidade: Math.round(totalGramas), unidade: "g" };
}

function formatarQuantidade(q: number, u: Unidade) {
  if (u === "kg" || u === "L") return `${q.toString().replace(".", ",")}${u}`;
  return `${q}${u}`;
}

function Compras() {
  const plano = useStore((s) => s.plano);

  const itens = useMemo<ItemCompra[]>(() => {
    if (!plano) return [];
    const acc = new Map<string, { totalGramas: number; nome: string }>();
    for (const ref of plano.plano_alimentar) {
      for (const al of ref.alimentos) {
        const nome = (al.nome || "").trim();
        if (!nome) continue;
        const qtd = Number(al.quantidade_g) || 0;
        const semanal = qtd * 7;
        const chave = normalize(nome);
        const cur = acc.get(chave);
        if (cur) {
          cur.totalGramas += semanal;
        } else {
          acc.set(chave, { totalGramas: semanal, nome });
        }
      }
    }
    return Array.from(acc.values()).map((it) => {
      const categoria = categorizar(it.nome);
      const { quantidade, unidade } = converterUnidade(it.nome, categoria, it.totalGramas);
      return {
        nome: it.nome,
        categoria,
        totalGramas: it.totalGramas,
        quantidade,
        unidade,
      };
    });
  }, [plano]);

  const [marcados, setMarcados] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      const raw = localStorage.getItem("compras_marcados");
      if (raw) setMarcados(JSON.parse(raw));
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    try { localStorage.setItem("compras_marcados", JSON.stringify(marcados)); } catch { /* ignore */ }
  }, [marcados]);

  const toggle = (chave: string) => setMarcados((m) => ({ ...m, [chave]: !m[chave] }));
  const resetar = () => setMarcados({});

  const porCategoria = useMemo(() => {
    const grupos = new Map<Categoria, ItemCompra[]>();
    for (const it of itens) {
      const arr = grupos.get(it.categoria) ?? [];
      arr.push(it);
      grupos.set(it.categoria, arr);
    }
    // ordenar: não marcados primeiro, depois marcados; alfabético dentro
    for (const [k, arr] of grupos) {
      arr.sort((a, b) => {
        const ma = marcados[normalize(a.nome)] ? 1 : 0;
        const mb = marcados[normalize(b.nome)] ? 1 : 0;
        if (ma !== mb) return ma - mb;
        return a.nome.localeCompare(b.nome, "pt-BR");
      });
      grupos.set(k, arr);
    }
    return grupos;
  }, [itens, marcados]);

  const compartilharWhatsApp = () => {
    const linhas: string[] = ["🛒 *LISTA DE COMPRAS — AI Health Coach*", ""];
    for (const cat of ORDEM_CATEGORIAS) {
      const arr = porCategoria.get(cat);
      if (!arr || arr.length === 0) continue;
      linhas.push(`*${cat}*`);
      for (const it of arr) {
        const check = marcados[normalize(it.nome)] ? "✅" : "▫️";
        linhas.push(`${check} ${it.nome} — ${formatarQuantidade(it.quantidade, it.unidade)}`);
      }
      linhas.push("");
    }
    const texto = encodeURIComponent(linhas.join("\n"));
    window.open(`https://wa.me/?text=${texto}`, "_blank");
  };

  if (!plano) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl md:text-3xl font-bold">Lista de Compras</h1>
        <Card className="p-6 text-sm text-muted-foreground">
          Gere seu plano alimentar primeiro para ver sua lista de compras semanal.
        </Card>
      </div>
    );
  }

  if (itens.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl md:text-3xl font-bold">Lista de Compras</h1>
        <Card className="p-6 text-sm text-muted-foreground">
          Seu plano não tem alimentos suficientes para montar uma lista.
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <ShoppingCart className="w-6 h-6 text-primary" />
            Lista de Compras
          </h1>
          <p className="text-sm text-muted-foreground">Consolidado para 7 dias do seu plano</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={resetar}>
            <RotateCcw className="w-4 h-4 mr-2" />
            Resetar lista
          </Button>
          <Button onClick={compartilharWhatsApp}>
            <Share2 className="w-4 h-4 mr-2" />
            Compartilhar no WhatsApp
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {ORDEM_CATEGORIAS.map((cat) => {
          const arr = porCategoria.get(cat);
          if (!arr || arr.length === 0) return null;
          return (
            <Card key={cat} className="p-4 bg-card border-border rounded-2xl">
              <h2 className="card-title mb-3">{cat}</h2>
              <ul className="divide-y divide-border">
                {arr.map((it) => {
                  const chave = normalize(it.nome);
                  const checked = !!marcados[chave];
                  return (
                    <li key={chave}>
                      <button
                        onClick={() => toggle(chave)}
                        className="flex items-center gap-3 w-full text-left py-2.5 hover:bg-secondary/40 rounded-md px-2 -mx-2"
                      >
                        <span
                          className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 ${
                            checked ? "bg-primary border-primary" : "border-muted-foreground/40"
                          }`}
                        >
                          {checked && (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          )}
                        </span>
                        <span className={`flex-1 text-sm capitalize ${checked ? "line-through text-muted-foreground" : "text-foreground"}`}>
                          {it.nome}
                        </span>
                        <span className={`text-sm font-semibold ${checked ? "text-muted-foreground line-through" : "text-primary"}`}>
                          {formatarQuantidade(it.quantidade, it.unidade)}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
