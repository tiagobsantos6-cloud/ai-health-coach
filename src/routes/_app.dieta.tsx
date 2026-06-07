import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useStore, type Alimento } from "@/lib/store";
import { Card } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Clock, Replace, ArrowLeftRight, Check, RotateCcw } from "lucide-react";
import { medidaCaseira } from "@/lib/medidaCaseira";

export const Route = createFileRoute("/_app/dieta")({
  head: () => ({
    meta: [
      { title: "Dieta — AI Health Coach" },
      {
        name: "description",
        content:
          "Seu plano alimentar do dia: refeições, macros, substituições e progresso de calorias.",
      },
      { property: "og:title", content: "Dieta — AI Health Coach" },
      {
        property: "og:description",
        content: "Plano alimentar personalizado com macros e substituições inteligentes.",
      },
    ],
  }),
  component: Dieta,
});

const cleanNum = (val: string | number) => {
  if (typeof val === "number") return val;
  return Number(val.toString().replace(/[^0-9.]/g, "")) || 0;
};

function Dieta() {
  const { t } = useTranslation();
  const plano = useStore((s) => s.plano);
  
  const trocarAlimento = useStore((s) => s.trocarAlimento);
  const refeicoesFeitas = useStore((s) => s.refeicoesFeitas);
  const toggleRefeicao = useStore((s) => s.toggleRefeicaoFeita);
  const carregarRefeicoesFeitasHoje = useStore((s) => s.carregarRefeicoesFeitasHoje);
  const [openSub, setOpenSub] = useState(false);
  const [openItems, setOpenItems] = useState<string[]>(["item-0"]);

  // Ao entrar na página /dieta, restaura as refeições marcadas no dia atual.
  // Chaves antigas são limpas automaticamente no store.
  useEffect(() => {
    carregarRefeicoesFeitasHoje();
  }, [carregarRefeicoesFeitasHoje]);

  

  // Compute per-meal kcal/macros from the food list (single source of truth).
  const refeicoesCalc = useMemo(
    () =>
      (plano?.plano_alimentar ?? []).map((r) => {
        const acc = r.alimentos.reduce(
          (a, al) => ({
            kcal: a.kcal + (Number(al.calorias) || 0),
            p: a.p + (Number(al.proteinas_g) || 0),
            c: a.c + (Number(al.carboidratos_g) || 0),
            g: a.g + (Number(al.gorduras_g) || 0),
          }),
          { kcal: 0, p: 0, c: 0, g: 0 },
        );
        return { kcal: Math.round(acc.kcal), p: acc.p, c: acc.c, g: acc.g };
      }),
    [plano],
  );

  // Daily planned totals: sum of ALL meals.
  const totals = useMemo(
    () =>
      refeicoesCalc.reduce(
        (acc, m) => ({
          kcal: acc.kcal + m.kcal,
          p: acc.p + m.p,
          c: acc.c + m.c,
          g: acc.g + m.g,
        }),
        { kcal: 0, p: 0, c: 0, g: 0 },
      ),
    [refeicoesCalc],
  );

  // Consumido: only meals marked as done.
  const consumido = useMemo(
    () =>
      refeicoesCalc.reduce(
        (acc, m, i) =>
          refeicoesFeitas[i]
            ? { kcal: acc.kcal + m.kcal, p: acc.p + m.p, c: acc.c + m.c, g: acc.g + m.g }
            : acc,
        { kcal: 0, p: 0, c: 0, g: 0 },
      ),
    [refeicoesCalc, refeicoesFeitas],
  );

  // Meta calórica = soma real das refeições do plano (fonte da verdade).
  // Macros mantêm a meta do resumo do plano.
  const meta = {
    kcal: totals.kcal,
    p: cleanNum(plano?.resumo.proteinas_g ?? 0),
    c: cleanNum(plano?.resumo.carboidratos_g ?? 0),
    g: cleanNum(plano?.resumo.gorduras_g ?? 0),
  };
  const metaResumo = cleanNum(plano?.resumo.meta_calorica ?? 0);
  const diferenca = totals.kcal - metaResumo;

  if (!plano) return null;

  return (
    <div className="space-y-6 pb-24">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">{t("dieta.titulo")}</h1>
          <p className="text-muted-foreground">{t("dieta.subtitulo")}</p>
        </div>
        <Dialog open={openSub} onOpenChange={setOpenSub}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Replace className="w-4 h-4 mr-1" /> {t("dieta.substituicoes")}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t("dieta.subs_equivalentes")}</DialogTitle>
            </DialogHeader>
            <div className="space-y-2">
              {plano.substituicoes.map((s, i) => (
                <div key={i} className="p-3 rounded-lg border border-border">
                  <div className="font-medium text-sm">{s.original}</div>
                  <div className="text-xs text-muted-foreground">→ {s.substituto}</div>
                  <div className="text-xs text-orange-700 dark:text-primary mt-1">{s.equivalencia}</div>
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Resumo diário — começa em zero, acumula apenas ao marcar refeição como feita */}
      <Card className="p-5 bg-card border-border rounded-2xl">
        <div className="flex items-end justify-between mb-1">
          <h2 className="card-title">{t("dieta.resumo")}</h2>
          <div className="text-right">
            <div className="text-2xl font-bold text-primary leading-none">
              {Math.round(consumido.kcal)}
              <span className="text-sm text-muted-foreground font-medium"> / {meta.kcal} kcal</span>
            </div>
            <div className="text-[11px] text-muted-foreground mt-1">
              {t("dieta.planejado")}: <span className="text-foreground font-semibold">{totals.kcal}</span> kcal
              {" · "}{t("dieta.restante")}:{" "}
              <span className="text-foreground font-semibold">
                {Math.max(0, meta.kcal - Math.round(consumido.kcal))}
              </span>{" "}
              kcal
            </div>
          </div>
        </div>
        <div className="space-y-3 mt-4">
          <MacroBar label={t("dieta.proteinas")} value={consumido.p} goal={meta.p} color="var(--success)" />
          <MacroBar label={t("dieta.carboidratos")} value={consumido.c} goal={meta.c} color="var(--chart-3)" />
          <MacroBar label={t("dieta.gorduras")} value={consumido.g} goal={meta.g} color="var(--destructive)" />
        </div>
      </Card>

      <Accordion
        type="multiple"
        className="space-y-3"
        value={openItems}
        onValueChange={setOpenItems}
      >
        {plano.plano_alimentar.map((r, i) => {
          const macros = { p: refeicoesCalc[i].p, c: refeicoesCalc[i].c, g: refeicoesCalc[i].g };
          const mealKcal = refeicoesCalc[i].kcal;
          const feita = !!refeicoesFeitas[i];
          return (
            <Card
              key={i}
              className={`overflow-hidden transition-all ${feita ? "border-success/60 bg-success/5" : ""}`}
              style={
                feita
                  ? { borderColor: "color-mix(in oklab, var(--success) 60%, transparent)" }
                  : undefined
              }
            >
              <AccordionItem value={`item-${i}`} className="border-0">
                <AccordionTrigger className="px-4 hover:no-underline">
                  <div className="flex items-center justify-between w-full pr-3 gap-2">
                    <div className="text-left flex items-center gap-2 min-w-0">
                      {feita && (
                        <span
                          className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                          style={{ background: "var(--success)" }}
                        >
                          <Check className="w-3 h-3 text-white" />
                        </span>
                      )}
                      <div className="min-w-0">
                        <div className="font-semibold truncate">{r.refeicao}</div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {r.horario}
                        </div>
                      </div>
                    </div>
                    <div className="text-sm font-bold text-primary shrink-0">{mealKcal} kcal</div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <div className="space-y-2">
                    {r.alimentos.map((a, j) => {
                      const opcoes = (a.opcoes || []).filter(
                        (o) => o && o.nome && o.nome.toLowerCase() !== a.nome.toLowerCase(),
                      );
                      return (
                        <div
                          key={j}
                          className="flex justify-between items-center gap-2 py-2 border-b border-border last:border-0"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium flex items-center gap-1.5">
                              <span className="truncate">{a.nome}</span>
                              {opcoes.length > 0 && (
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <button
                                      type="button"
                                      aria-label={t("dieta.trocar_alimento")}
                                      className="shrink-0 p-1 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10"
                                      title={t("dieta.trocar_alimento")}
                                    >
                                      <ArrowLeftRight className="w-3.5 h-3.5" />
                                    </button>
                                  </PopoverTrigger>
                                  <PopoverContent align="start" className="w-72 p-2">
                                    <div className="text-xs font-semibold px-2 py-1 text-muted-foreground">
                                      {t("dieta.trocar")}
                                    </div>
                                    <div className="space-y-1 max-h-64 overflow-y-auto">
                                      {opcoes.map((o, k) => (
                                        <button
                                          key={k}
                                          type="button"
                                          onClick={() => trocarAlimento(i, j, o as Alimento)}
                                          className="w-full text-left p-2 rounded-md hover:bg-muted text-xs"
                                        >
                                          <div className="font-medium text-foreground">
                                            {o.nome}
                                          </div>
                                          <div className="text-muted-foreground">
                                            {o.quantidade_g}g —{" "}
                                            {medidaCaseira(
                                              o.nome,
                                              o.quantidade_g,
                                              o.medida_caseira,
                                            )}
                                          </div>
                                          <div className="text-muted-foreground">
                                            {o.calorias} kcal · P {Math.round(o.proteinas_g || 0)}g
                                            · C {Math.round(o.carboidratos_g || 0)}g · G{" "}
                                            {Math.round(o.gorduras_g || 0)}g
                                          </div>
                                        </button>
                                      ))}
                                    </div>
                                  </PopoverContent>
                                </Popover>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {a.quantidade_g}g —{" "}
                              {medidaCaseira(a.nome, a.quantidade_g, a.medida_caseira)}
                            </div>
                          </div>
                          <div className="text-xs text-muted-foreground shrink-0">
                            {a.calorias} kcal
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex gap-3 mt-3 text-xs text-muted-foreground">
                    <span>P: {Math.round(macros.p)}g</span>
                    <span>C: {Math.round(macros.c)}g</span>
                    <span>G: {Math.round(macros.g)}g</span>
                  </div>

                  <div className="mt-4 pt-3 border-t border-border">
                    {feita ? (
                      <div className="flex items-center justify-between gap-2">
                        <div
                          className="flex items-center gap-2 text-sm font-medium"
                          style={{ color: "var(--success)" }}
                        >
                          <Check className="w-4 h-4" /> {t("dieta.feita")}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleRefeicao(i)}
                          className="text-muted-foreground"
                        >
                          <RotateCcw className="w-3.5 h-3.5 mr-1" /> {t("dieta.desfazer")}
                        </Button>
                      </div>
                    ) : (
                      <Button
                        onClick={() => toggleRefeicao(i)}
                        className="w-full pulse-success"
                        style={{ background: "var(--success)", color: "white" }}
                      >
                        <Check className="w-4 h-4 mr-1" /> {t("dieta.marcar")}
                      </Button>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Card>
          );
        })}
      </Accordion>

      <div className="fixed bottom-16 md:bottom-4 left-4 right-4 md:left-auto md:right-8 md:w-auto bg-card border border-border rounded-xl shadow-lg p-3 z-30">
        <div className="flex justify-around md:gap-6 text-xs items-center">
          <div className="text-center">
            <div className="text-muted-foreground">{t("dieta.total")}</div>
            <div className="font-bold text-primary">{totals.kcal} kcal</div>
          </div>
          <div className="text-center">
            <div className="text-muted-foreground">{t("dieta.meta")}</div>
            <div className="font-bold">{metaResumo} kcal</div>
          </div>
          <div className="text-center">
            <div className="text-muted-foreground">{t("dieta.diferenca")}</div>
            <div
              className="font-bold"
              style={{
                color: Math.abs(diferenca) <= 100 ? "var(--success)" : "var(--destructive)",
              }}
            >
              {diferenca >= 0 ? "+" : ""}
              {diferenca} kcal
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MacroBar({
  label,
  value,
  goal,
  color,
}: {
  label: string;
  value: number;
  goal: number;
  color: string;
}) {
  const rounded = Math.round(value);
  const goalR = Math.round(goal);
  const pct = Math.min(100, goal ? Math.round((value / goal) * 100) : 0);
  const over = goal > 0 && rounded > goalR;
  const exact = goal > 0 && rounded === goalR;
  const numColor = over ? "#f59e0b" : exact ? "var(--success)" : "var(--foreground)";
  const barColor = over ? "#f59e0b" : color;
  return (
    <div>
      <div className="flex justify-between items-baseline text-xs mb-1.5">
        <span className="font-semibold text-foreground">{label}</span>
        <span className="text-muted-foreground inline-flex items-center gap-1">
          <span className="font-bold" style={{ color: numColor }}>
            {rounded}g
          </span>
          {over && <span aria-hidden>⚠️</span>}
          <span>/ {goalR}g</span>
        </span>
      </div>
      <div className="h-2 bg-secondary rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: barColor }}
        />
      </div>
    </div>
  );
}
