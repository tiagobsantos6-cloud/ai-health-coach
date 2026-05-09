import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { useStore } from "@/lib/store";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Droplet } from "lucide-react";

export const Route = createFileRoute("/_app/agua")({
  component: Agua,
});

function Agua() {
  const plano = useStore((s) => s.plano);
  const agua = useStore((s) => s.agua);
  const addAgua = useStore((s) => s.addAgua);
  const reset = useStore((s) => s.resetAguaIfNewDay);

  useEffect(() => { reset(); }, [reset]);

  const meta = Number(plano.resumo.agua_diaria_ml) || 2500;
  const total = agua.reduce((a, r) => a + r.ml, 0);
  const pct = Math.min(100, Math.round((total / meta) * 100));

  const r = 80;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;

  const msg =
    pct >= 100 ? "🎉 Meta atingida! Continue se hidratando." :
    pct >= 75 ? "💪 Quase lá! Falta pouco." :
    pct >= 50 ? "👏 Boa! Mantenha o ritmo." :
    pct >= 25 ? "💧 Beba mais um copo agora." :
    "💦 Vamos começar! Beba água.";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Hidratação</h1>
        <p className="text-muted-foreground">Meta diária: {meta} ml</p>
      </div>

      <Card className="p-6 flex flex-col items-center">
        <div className="relative">
          <svg width="200" height="200" viewBox="0 0 200 200" className="-rotate-90">
            <circle cx="100" cy="100" r={r} fill="none" stroke="var(--muted)" strokeWidth="14" />
            <circle
              cx="100" cy="100" r={r} fill="none" stroke="var(--primary)" strokeWidth="14"
              strokeLinecap="round" strokeDasharray={c}
              style={{ strokeDashoffset: offset, transition: "stroke-dashoffset 0.6s ease" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-3xl font-bold">{total}</div>
            <div className="text-xs text-muted-foreground">de {meta} ml</div>
            <div className="text-sm text-primary font-bold mt-1">{pct}%</div>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mt-4">{msg}</p>
      </Card>

      <div className="grid grid-cols-4 gap-2">
        {[200, 300, 500, 1000].map((ml) => (
          <Button key={ml} variant="outline" onClick={() => addAgua(ml)} className="flex-col h-auto py-3">
            <Droplet className="w-4 h-4 mb-1" />
            +{ml}ml
          </Button>
        ))}
      </div>

      <Card className="p-5">
        <h3 className="font-semibold mb-3">Histórico de hoje</h3>
        {agua.length === 0 && <p className="text-sm text-muted-foreground">Nenhum registro ainda</p>}
        <div className="space-y-2">
          {[...agua].reverse().map((r, i) => (
            <div key={i} className="flex justify-between items-center text-sm py-2 border-b border-border last:border-0">
              <span className="flex items-center gap-2"><Droplet className="w-4 h-4 text-primary" /> {r.ml} ml</span>
              <span className="text-muted-foreground">{r.horario}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
