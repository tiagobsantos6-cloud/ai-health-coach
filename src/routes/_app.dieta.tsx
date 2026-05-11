import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useStore, type Alimento } from "@/lib/store";
import { Card } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Clock, Replace, Lock, ArrowLeftRight } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { temAcesso, NOMES_PLANOS, RECURSO_MIN } from "@/lib/planos";
import { medidaCaseira } from "@/lib/medidaCaseira";

export const Route = createFileRoute("/_app/dieta")({
  component: Dieta,
});

function Dieta() {
  const plano = useStore((s) => s.plano);
  const planoAss = useStore((s) => s.planoAssinatura);
  const trocarAlimento = useStore((s) => s.trocarAlimento);
  const [openSub, setOpenSub] = useState(false);
  if (!plano) return null;
  const podeSubstituir = temAcesso(planoAss, "substituicoes_alimentares");

  const totals = plano.plano_alimentar.reduce(
    (acc, r) => {
      const macros = r.alimentos.reduce(
        (a, al) => ({
          p: a.p + (al.proteinas_g || 0),
          c: a.c + (al.carboidratos_g || 0),
          g: a.g + (al.gorduras_g || 0),
        }),
        { p: 0, c: 0, g: 0 },
      );
      return {
        kcal: acc.kcal + (r.total_calorias || 0),
        p: acc.p + macros.p,
        c: acc.c + macros.c,
        g: acc.g + macros.g,
      };
    },
    { kcal: 0, p: 0, c: 0, g: 0 },
  );

  return (
    <div className="space-y-6 pb-24">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Plano alimentar</h1>
          <p className="text-muted-foreground">Suas refeições do dia</p>
        </div>
        {podeSubstituir ? (
          <Dialog open={openSub} onOpenChange={setOpenSub}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Replace className="w-4 h-4 mr-1" /> Substituições
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Substituições equivalentes</DialogTitle>
              </DialogHeader>
              <div className="space-y-2">
                {plano.substituicoes.map((s, i) => (
                  <div key={i} className="p-3 rounded-lg border border-border">
                    <div className="font-medium text-sm">{s.original}</div>
                    <div className="text-xs text-muted-foreground">→ {s.substituto}</div>
                    <div className="text-xs text-primary mt-1">{s.equivalencia}</div>
                  </div>
                ))}
              </div>
            </DialogContent>
          </Dialog>
        ) : (
          <Button asChild variant="outline" size="sm" title={`Disponível no plano ${NOMES_PLANOS[RECURSO_MIN.substituicoes_alimentares]}`}>
            <Link to="/planos"><Lock className="w-4 h-4 mr-1" /> Substituições</Link>
          </Button>
        )}
      </div>

      <Accordion type="multiple" className="space-y-3">
        {plano.plano_alimentar.map((r, i) => {
          const macros = r.alimentos.reduce(
            (a, al) => ({
              p: a.p + (al.proteinas_g || 0),
              c: a.c + (al.carboidratos_g || 0),
              g: a.g + (al.gorduras_g || 0),
            }),
            { p: 0, c: 0, g: 0 },
          );
          return (
            <Card key={i} className="overflow-hidden">
              <AccordionItem value={`item-${i}`} className="border-0">
                <AccordionTrigger className="px-4 hover:no-underline">
                  <div className="flex items-center justify-between w-full pr-3">
                    <div className="text-left">
                      <div className="font-semibold">{r.refeicao}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {r.horario}
                      </div>
                    </div>
                    <div className="text-sm font-bold text-primary">{r.total_calorias} kcal</div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <div className="space-y-2">
                    {r.alimentos.map((a, j) => {
                      const opcoes = (a.opcoes || []).filter(
                        (o) => o && o.nome && o.nome.toLowerCase() !== a.nome.toLowerCase(),
                      );
                      return (
                        <div key={j} className="flex justify-between items-center gap-2 py-2 border-b border-border last:border-0">
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium flex items-center gap-1.5">
                              <span className="truncate">{a.nome}</span>
                              {opcoes.length > 0 && (
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <button
                                      type="button"
                                      className="shrink-0 p-1 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10"
                                      title="Trocar alimento"
                                    >
                                      <ArrowLeftRight className="w-3.5 h-3.5" />
                                    </button>
                                  </PopoverTrigger>
                                  <PopoverContent align="start" className="w-72 p-2">
                                    <div className="text-xs font-semibold px-2 py-1 text-muted-foreground">
                                      Trocar por equivalente
                                    </div>
                                    <div className="space-y-1 max-h-64 overflow-y-auto">
                                      {opcoes.map((o, k) => (
                                        <button
                                          key={k}
                                          type="button"
                                          onClick={() => trocarAlimento(i, j, o as Alimento)}
                                          className="w-full text-left p-2 rounded-md hover:bg-muted text-xs"
                                        >
                                          <div className="font-medium text-foreground">{o.nome}</div>
                                          <div className="text-muted-foreground">
                                            {o.quantidade_g}g — {medidaCaseira(o.nome, o.quantidade_g, o.medida_caseira)}
                                          </div>
                                          <div className="text-muted-foreground">
                                            {o.calorias} kcal · P {Math.round(o.proteinas_g || 0)}g · C {Math.round(o.carboidratos_g || 0)}g · G {Math.round(o.gorduras_g || 0)}g
                                          </div>
                                        </button>
                                      ))}
                                    </div>
                                  </PopoverContent>
                                </Popover>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {a.quantidade_g}g — {medidaCaseira(a.nome, a.quantidade_g, a.medida_caseira)}
                            </div>
                          </div>
                          <div className="text-xs text-muted-foreground shrink-0">{a.calorias} kcal</div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex gap-3 mt-3 text-xs text-muted-foreground">
                    <span>P: {Math.round(macros.p)}g</span>
                    <span>C: {Math.round(macros.c)}g</span>
                    <span>G: {Math.round(macros.g)}g</span>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Card>
          );
        })}
      </Accordion>

      <div className="fixed bottom-16 md:bottom-4 left-4 right-4 md:left-auto md:right-8 md:w-auto bg-card border border-border rounded-xl shadow-lg p-3 z-30">
        <div className="flex justify-around md:gap-6 text-xs">
          <div className="text-center"><div className="text-muted-foreground">kcal</div><div className="font-bold text-primary">{Math.round(totals.kcal)}</div></div>
          <div className="text-center"><div className="text-muted-foreground">P</div><div className="font-bold">{Math.round(totals.p)}g</div></div>
          <div className="text-center"><div className="text-muted-foreground">C</div><div className="font-bold">{Math.round(totals.c)}g</div></div>
          <div className="text-center"><div className="text-muted-foreground">G</div><div className="font-bold">{Math.round(totals.g)}g</div></div>
        </div>
      </div>
    </div>
  );
}
