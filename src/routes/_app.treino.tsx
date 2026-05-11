import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { useStore } from "@/lib/store";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Timer, Activity, Pause, Play, RotateCcw, PlayCircle, ExternalLink } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export const Route = createFileRoute("/_app/treino")({
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
        {dias.map((d, i) => (
          <TabsContent key={i} value={d.dia ?? String(i)} className="space-y-3 mt-4">
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
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

function ExercicioCard({ ex }: { ex: { nome: string; musculo: string; series: number; repeticoes: string; descanso_s: number } }) {
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
        <ExecucaoModal nome={ex.nome} />
      </div>

      {(timer > 0 || running) && (
        <div className="mt-3 p-3 rounded-lg bg-primary/10 flex items-center justify-between">
          <div className="text-2xl font-bold text-primary tabular-nums">{timer}s</div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setRunning(!running)}>
              {running ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </Button>
            <Button size="sm" variant="outline" onClick={() => { setTimer(0); setRunning(false); }}>
              <RotateCcw className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
