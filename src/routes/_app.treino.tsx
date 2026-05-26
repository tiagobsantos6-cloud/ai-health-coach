import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useStore } from "@/lib/store";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Timer, Activity, Pause, Play, RotateCcw, PlayCircle, ExternalLink, ChevronDown, AlertTriangle, X, SkipForward, Check } from "lucide-react";

export const Route = createFileRoute("/_app/treino")({
  head: () => ({
    meta: [
      { title: "Treino — VitaIA" },
      { name: "description", content: "Acompanhe seu plano de treino personalizado, séries, repetições e tempo de descanso." },
      { property: "og:title", content: "Treino — VitaIA" },
      { property: "og:description", content: "Plano de treino personalizado com timer e demonstração de execução." },
    ],
  }),
  component: Treino,
});


function Treino() {
  const plano = useStore((s) => s.plano);
  if (!plano) return null;
  const dias = plano.treino.dias;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Plano de treino</h1>
        <p className="text-muted-foreground">{plano.treino.divisao}</p>
      </div>

      <Tabs defaultValue={dias[0]?.dia ?? "0"}>
        <TabsList className="w-full overflow-x-auto flex justify-start">
          {dias.map((d, i) => (
            <TabsTrigger key={i} value={d.dia ?? String(i)} className="text-xs">
              {d.dia?.slice(0, 3) || `D${i + 1}`}
            </TabsTrigger>
          ))}
        </TabsList>
        {dias.map((d, i) => {
          const semExercicios = !d.exercicios || d.exercicios.length === 0;
          return (
            <TabsContent key={i} value={d.dia ?? String(i)} className="space-y-3 mt-4">
              {semExercicios ? (
                <Card className="p-8 text-center">
                  <div className="text-3xl mb-2">💪</div>
                  <div className="font-semibold">Dia de descanso</div>
                  <div className="text-sm text-muted-foreground mt-1">Aproveite para recuperar!</div>
                </Card>
              ) : (
                <>
                  <div className="text-sm text-muted-foreground">Foco: <span className="text-foreground font-medium">{d.foco}</span></div>
                  {d.exercicios.map((ex, j) => (
                    <ExercicioCard key={j} ex={ex} />
                  ))}
                  {d.cardio?.tipo && (
                    <Card className="p-4 border-primary/30 bg-primary/5">
                      <div className="flex items-center gap-2 mb-1">
                        <Activity className="w-4 h-4 text-primary" />
                        <span className="font-semibold">Cardio</span>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        <Badge variant="secondary">{d.cardio.tipo}</Badge>
                        <Badge variant="secondary">{d.cardio.duracao_min} min</Badge>
                        <Badge variant="secondary">{d.cardio.intensidade}</Badge>
                      </div>
                    </Card>
                  )}
                </>
              )}
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}

type Exercicio = {
  nome: string;
  musculo: string;
  series: number;
  repeticoes: string;
  descanso_s: number;
  execucao?: string;
  erros_comuns?: string;
};

function ExercicioCard({ ex }: { ex: Exercicio }) {
  const [timer, setTimer] = useState(0);
  const [running, setRunning] = useState(false);
  const ref = useRef<number | null>(null);

  useEffect(() => {
    if (running && timer > 0) {
      ref.current = window.setTimeout(() => setTimer((t) => t - 1), 1000);
    }
    if (running && timer === 0) {
      setRunning(false);
      try {
        const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = 880;
        osc.start();
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
        osc.stop(ctx.currentTime + 0.5);
      } catch {}
    }
    return () => { if (ref.current) clearTimeout(ref.current); };
  }, [running, timer]);

  const startTimer = () => {
    setTimer(ex.descanso_s);
    setRunning(true);
  };

  const progresso = ex.descanso_s > 0 ? (timer / ex.descanso_s) * 100 : 0;

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <div className="font-semibold">{ex.nome}</div>
          <div className="text-xs text-muted-foreground">{ex.musculo}</div>
        </div>
        <div className="text-right text-sm">
          <div className="font-bold">{ex.series} × {ex.repeticoes}</div>
          <button onClick={startTimer} className="text-xs text-primary flex items-center gap-1 mt-1 hover:underline">
            <Timer className="w-3 h-3" /> {ex.descanso_s}s
          </button>
        </div>
      </div>

      <div className="mt-3">
        <ExecucaoPanel ex={ex} onStartTimer={startTimer} />
      </div>

      {(timer > 0 || running) && (
        <div className="mt-3 p-3 rounded-lg bg-primary/10 space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-2xl font-bold text-primary tabular-nums">{timer}s</div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setRunning(!running)} aria-label={running ? "Pausar" : "Retomar"}>
                {running ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </Button>
              <Button size="sm" variant="outline" onClick={() => { setTimer(0); setRunning(false); }} aria-label="Reiniciar">
                <RotateCcw className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <div className="h-2 w-full rounded-full bg-primary/20 overflow-hidden">
            <div
              className="h-full bg-primary transition-[width] duration-1000 ease-linear"
              style={{ width: `${progresso}%` }}
            />
          </div>
        </div>
      )}
    </Card>
  );
}

function ExecucaoPanel({ ex, onStartTimer }: { ex: Exercicio; onStartTimer: () => void }) {
  const [open, setOpen] = useState(false);
  const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(ex.nome + " execução correta")}`;

  return (
    <div className="space-y-2">
      <Button
        size="sm"
        variant="outline"
        className="w-full"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <PlayCircle className="w-4 h-4 mr-2" />
        Ver execução
        <ChevronDown className={`w-4 h-4 ml-auto transition-transform ${open ? "rotate-180" : ""}`} />
      </Button>

      {open && (
        <div className="rounded-lg border border-border bg-secondary/30 p-3 space-y-3 text-sm">
          <a
            href={searchUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-primary hover:underline font-medium"
          >
            <ExternalLink className="w-4 h-4" /> Ver no YouTube
          </a>

          {ex.execucao ? (
            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Como executar</div>
              <p className="whitespace-pre-line leading-relaxed">{ex.execucao}</p>
            </div>
          ) : (
            <p className="text-muted-foreground text-xs">
              Clique em &quot;Ver no YouTube&quot; para ver a execução correta deste exercício.
            </p>
          )}

          {ex.erros_comuns && (
            <div>
              <div className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-destructive mb-1">
                <AlertTriangle className="w-3.5 h-3.5" /> Erros comuns
              </div>
              <p className="whitespace-pre-line leading-relaxed text-muted-foreground">{ex.erros_comuns}</p>
            </div>
          )}

          <Button size="sm" variant="secondary" className="w-full" onClick={onStartTimer}>
            <Timer className="w-4 h-4 mr-2" /> Iniciar descanso ({ex.descanso_s}s)
          </Button>
        </div>
      )}
    </div>
  );
}

