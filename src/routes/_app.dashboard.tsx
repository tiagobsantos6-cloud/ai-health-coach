import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Droplet, Dumbbell, Moon, Scale, Plus } from "lucide-react";

export const Route = createFileRoute("/_app/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — AI Health Coach" },
      { name: "description", content: "Resumo diário do seu plano: calorias, macros, água, treino e checklist de disciplina." },
      { property: "og:title", content: "Dashboard — AI Health Coach" },
      { property: "og:description", content: "Acompanhe suas metas diárias de nutrição, treino e hidratação." },
    ],
  }),
  component: Dashboard,
});


const cleanNum = (val: string | number) => {
  if (typeof val === "number") return val;
  return Number(val.toString().replace(/[^0-9.]/g, "")) || 0;
};

function Dashboard() {
  const [hidratado, setHidratado] = useState(false);
  const plano = useStore((s) => s.plano);
  const dados = useStore((s) => s.dados);
  const checklist = useStore((s) => s.checklist);
  const toggle = useStore((s) => s.toggleChecklist);
  const resetCheck = useStore((s) => s.resetChecklistIfNewDay);
  const agua = useStore((s) => s.agua);
  const resetAgua = useStore((s) => s.resetAguaIfNewDay);
  const refeicoesFeitas = useStore((s) => s.refeicoesFeitas);
  const resetRefeicoes = useStore((s) => s.resetRefeicoesIfNewDay);

  useEffect(() => { resetCheck(); resetAgua(); resetRefeicoes(); }, [resetCheck, resetAgua, resetRefeicoes]);

  useEffect(() => {
    const t = setTimeout(() => setHidratado(true), 400);
    return () => clearTimeout(t);
  }, []);

  const macros = useMemo(() => {
    if (!plano) return null;
    // Meta calórica = soma real das refeições do plano (fonte da verdade).
    const kcalSum = plano.plano_alimentar.reduce((acc, r) => {
      const m = r.alimentos.reduce((a, al) => a + (Number(al.calorias) || 0), 0);
      return acc + m;
    }, 0);
    return {
      kcal: Math.round(kcalSum),
      p: cleanNum(plano.resumo.proteinas_g),
      c: cleanNum(plano.resumo.carboidratos_g),
      g: cleanNum(plano.resumo.gorduras_g),
      agua: cleanNum(plano.resumo.agua_diaria_ml),
    };
  }, [plano]);

  const consumido = useMemo(() => {
    if (!plano) return { kcal: 0, p: 0, c: 0, g: 0 };
    return plano.plano_alimentar.reduce(
      (acc, r, i) => {
        if (!refeicoesFeitas[i]) return acc;
        const m = r.alimentos.reduce(
          (a, al) => ({
            kcal: a.kcal + (Number(al.calorias) || 0),
            p: a.p + (Number(al.proteinas_g) || 0),
            c: a.c + (Number(al.carboidratos_g) || 0),
            g: a.g + (Number(al.gorduras_g) || 0),
          }),
          { kcal: 0, p: 0, c: 0, g: 0 },
        );
        return { kcal: acc.kcal + m.kcal, p: acc.p + m.p, c: acc.c + m.c, g: acc.g + m.g };
      },
      { kcal: 0, p: 0, c: 0, g: 0 },
    );
  }, [plano, refeicoesFeitas]);

  useEffect(() => {
    if (!macros) return;
    // eslint-disable-next-line no-console
    console.debug("[Dashboard] meta:", macros, "consumido:", consumido);
  }, [macros, consumido]);

  if (!hidratado || !plano || !macros) {
    return (
      <div className="space-y-5">
        {/* Header skeleton */}
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-4 w-24 bg-muted rounded animate-pulse" />
            <div className="h-6 w-48 bg-muted rounded animate-pulse" />
          </div>
          <div className="w-11 h-11 shrink-0 rounded-full bg-muted animate-pulse" />
        </div>

        {/* Calories ring skeleton */}
        <Card className="p-6 flex flex-col items-center bg-card border-border rounded-2xl">
          <div className="h-5 w-32 bg-muted rounded animate-pulse mb-3" />
          <div className="w-[200px] h-[200px] rounded-full bg-muted animate-pulse" />
          <div className="grid grid-cols-3 gap-3 w-full mt-6">
            <div className="h-20 bg-muted rounded-xl animate-pulse" />
            <div className="h-20 bg-muted rounded-xl animate-pulse" />
            <div className="h-20 bg-muted rounded-xl animate-pulse" />
          </div>
        </Card>

        {/* Quick stats skeleton */}
        <div className="grid grid-cols-2 gap-3">
          <div className="h-24 bg-muted rounded-2xl animate-pulse" />
          <div className="h-24 bg-muted rounded-2xl animate-pulse" />
          <div className="h-24 bg-muted rounded-2xl animate-pulse" />
          <div className="h-24 bg-muted rounded-2xl animate-pulse" />
        </div>

        {/* Checklist skeleton */}
        <Card className="p-5 bg-card border-border rounded-2xl space-y-3">
          <div className="flex justify-between items-center">
            <div className="h-5 w-32 bg-muted rounded animate-pulse" />
            <div className="h-5 w-10 bg-muted rounded animate-pulse" />
          </div>
          <div className="h-1.5 bg-muted rounded-full animate-pulse" />
          <div className="space-y-2">
            <div className="h-10 bg-muted rounded-xl animate-pulse" />
            <div className="h-10 bg-muted rounded-xl animate-pulse" />
            <div className="h-10 bg-muted rounded-xl animate-pulse" />
          </div>
        </Card>

        {/* Weekly routine skeleton */}
        <Card className="p-5 bg-card border-border rounded-2xl space-y-3">
          <div className="h-5 w-36 bg-muted rounded animate-pulse" />
          <div className="grid grid-cols-7 gap-1.5">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="h-14 bg-muted rounded-xl animate-pulse" />
            ))}
          </div>
        </Card>
      </div>
    );
  }

  const consumed = Math.round(consumido.kcal);
  const kcalPct = Math.min(100, Math.max(0, Math.round((consumed / Math.max(1, macros.kcal)) * 100)));

  const items = plano.disciplina.checklist || [];
  const done = items.filter((i) => checklist[i]).length;
  const checkPct = items.length ? Math.round((done / items.length) * 100) : 0;

  const aguaTotal = agua.reduce((a, r) => a + r.ml, 0);
  const aguaPct = Math.min(100, Math.round((aguaTotal / macros.agua) * 100));

  const hora = new Date().getHours();
  const saudacao = hora < 12 ? "Bom dia" : hora < 18 ? "Boa tarde" : "Boa noite";
  const nome = dados?.nome?.split(" ")[0] || "";
  const iniciais = (dados?.nome || "U")
    .split(" ").filter(Boolean).slice(0, 2).map((s) => s[0]?.toUpperCase()).join("");

  const treinoHoje = (() => {
    const dia = ["Domingo","Segunda","Terça","Quarta","Quinta","Sexta","Sábado"][new Date().getDay()];
    return plano.rotina_semanal.find((d) => d.dia_semana?.toLowerCase().startsWith(dia.toLowerCase().slice(0,3)))?.treino || "Descanso";
  })();

  // SVG ring
  const r = 90;
  const c = 2 * Math.PI * r;
  const offset = c - (kcalPct / 100) * c;
  const restante = Math.max(0, macros.kcal - consumed);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-[20px] md:text-2xl font-bold truncate">
            Olá, {nome || "você"} 👋
          </h1>
          <p className="text-sm text-muted-foreground">Resumo do seu dia</p>
        </div>
        <div className="w-11 h-11 shrink-0 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-primary-foreground font-bold">
          {iniciais}
        </div>
      </div>

      {/* Calories ring */}
      <Card className="p-6 flex flex-col items-center bg-card border-border rounded-2xl">
        <h2 className="card-title mb-3">Calorias do dia</h2>
        <div className="relative">
          <svg width="220" height="220" viewBox="0 0 220 220" className="-rotate-90">
            <circle cx="110" cy="110" r={r} fill="none" stroke="var(--muted)" strokeWidth="14" />
            <circle
              cx="110" cy="110" r={r} fill="none"
              stroke="var(--primary)" strokeWidth="14" strokeLinecap="round"
              strokeDasharray={c} style={{ strokeDashoffset: offset, transition: "stroke-dashoffset 0.7s ease" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-4xl font-bold">{restante}</div>
            <div className="text-xs text-muted-foreground mt-1">kcal restantes</div>
            <div className="text-[11px] text-muted-foreground mt-2">{consumed} / {macros.kcal}</div>
          </div>
        </div>

        {/* Macro pills */}
        <div className="grid grid-cols-3 gap-3 w-full mt-6">
          <MacroPill label="Proteínas" value={consumido.p} goal={macros.p} unit="g" color="var(--success)" />
          <MacroPill label="Carbos" value={consumido.c} goal={macros.c} unit="g" color="var(--chart-3)" />
          <MacroPill label="Gorduras" value={consumido.g} goal={macros.g} unit="g" color="var(--destructive)" />
        </div>
      </Card>

      {/* Quick stats grid 2x2 */}
      <div className="grid grid-cols-2 gap-3">
        <QuickCard icon={<Droplet className="w-4 h-4" />} title="Água" value={`${aguaTotal}ml`} sub={`${aguaPct}% da meta`} />
        <QuickCard icon={<Dumbbell className="w-4 h-4" />} title="Treino do dia" value={treinoHoje} />
        <SonoCard metaHoras={Number(plano.resumo.sono_ideal_h) || (dados?.sono ?? 8)} />
        <QuickCard icon={<Scale className="w-4 h-4" />} title="Peso atual" value={`${dados?.peso || "—"}kg`} />
      </div>

      {/* Checklist */}
      <Card className="p-5 bg-card border-border rounded-2xl">
        <div className="flex justify-between items-center mb-4">
          <h2 className="card-title">Checklist do dia</h2>
          <span className="text-sm text-primary font-bold">{checkPct}%</span>
        </div>
        <div className="h-1.5 bg-secondary rounded-full overflow-hidden mb-4">
          <div className="h-full bg-primary transition-all duration-500" style={{ width: `${checkPct}%` }} />
        </div>
        <div className="space-y-1">
          {items.length === 0 && <p className="text-sm text-muted-foreground">Nenhum item</p>}
          {items.map((it) => {
            const checked = !!checklist[it];
            return (
              <button
                key={it}
                onClick={() => toggle(it)}
                className={`flex items-center gap-3 w-full text-left p-2.5 rounded-xl hover:bg-secondary/50 ${checked ? "pulse-success" : ""}`}
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
                <span className={`text-sm ${checked ? "line-through text-muted-foreground" : "text-foreground"}`}>
                  {it}
                </span>
              </button>
            );
          })}
        </div>
      </Card>

      {/* Weekly routine */}
      <Card className="p-5 bg-card border-border rounded-2xl">
        <h2 className="card-title mb-3">Rotina da semana</h2>
        <div className="grid grid-cols-7 gap-1.5">
          {plano.rotina_semanal.map((d, i) => (
            <div key={i} className="p-2 rounded-xl bg-secondary text-center">
              <div className="text-[10px] font-bold uppercase text-muted-foreground">{d.dia_semana.slice(0, 3)}</div>
              <div className="text-[11px] mt-1 truncate text-foreground">{d.treino || "Off"}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function MacroPill({ label, value, goal, unit, color }: { label: string; value: number; goal: number; unit: string; color: string }) {
  const pct = Math.min(100, Math.max(0, goal ? Math.round((value / goal) * 100) : 0));
  return (
    <div className="bg-secondary rounded-xl p-3 text-center">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</div>
      <div className="text-lg font-bold mt-1">
        {Math.round(value)}
        <span className="text-xs text-muted-foreground">/{Math.round(goal)}{unit}</span>
      </div>
      <div className="h-1 mt-2 rounded-full overflow-hidden bg-background/40">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

function QuickCard({ icon, title, value, sub }: { icon: React.ReactNode; title: string; value: string; sub?: string }) {
  return (
    <Card className="p-4 bg-card border-border rounded-2xl">
      <div className="flex items-center gap-2 text-muted-foreground text-[11px] uppercase tracking-wider font-semibold">
        <span className="text-primary">{icon}</span>
        {title}
      </div>
      <div className="text-xl font-bold mt-2 truncate">{value}</div>
      {sub && <div className="text-[11px] text-muted-foreground mt-0.5">{sub}</div>}
    </Card>
  );
}

function sonoStorageKey() {
  const d = new Date();
  const ymd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return `sono_hoje_${ymd}`;
}

function SonoCard({ metaHoras }: { metaHoras: number }) {
  const key = sonoStorageKey();
  const [registrado, setRegistrado] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [valor, setValor] = useState<number>(8);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw != null) {
        const n = Number(raw);
        if (!Number.isNaN(n)) setRegistrado(n);
      }
    } catch { /* ignore */ }
  }, [key]);

  const salvar = () => {
    try { localStorage.setItem(key, String(valor)); } catch { /* ignore */ }
    setRegistrado(valor);
    setOpen(false);
  };

  const meta = metaHoras || 8;
  const atingiu = registrado != null && registrado >= meta;
  const faltou = registrado != null && registrado < meta ? meta - registrado : 0;

  return (
    <Card className="p-4 bg-card border-border rounded-2xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-muted-foreground text-[11px] uppercase tracking-wider font-semibold">
          <span className="text-primary"><Moon className="w-4 h-4" /></span>
          Sono
        </div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (o) setValor(registrado ?? meta); }}>
          <DialogTrigger asChild>
            <button
              className="w-6 h-6 rounded-full bg-primary/15 text-primary flex items-center justify-center hover:bg-primary/25"
              aria-label="Registrar sono"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Quantas horas você dormiu?</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="text-center">
                <div className="text-4xl font-bold text-primary">{valor.toFixed(1)}h</div>
                <div className="text-xs text-muted-foreground mt-1">Meta: {meta}h</div>
              </div>
              <Slider
                value={[valor]}
                min={4}
                max={12}
                step={0.5}
                onValueChange={(v) => setValor(v[0])}
              />
              <div className="flex justify-between text-[11px] text-muted-foreground">
                <span>4h</span>
                <span>12h</span>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={salvar} className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
                Salvar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <div className="text-xl font-bold mt-2 truncate">
        {registrado != null ? `${registrado}h` : `${meta}h`}
      </div>
      {registrado != null ? (
        <div className={`text-[11px] mt-0.5 font-medium ${atingiu ? "text-success" : "text-primary"}`}>
          {atingiu ? "✓ Meta atingida!" : `Faltou ${faltou.toFixed(1)}h para a meta`}
          <span className="text-muted-foreground font-normal"> · hoje</span>
        </div>
      ) : (
        <div className="text-[11px] text-muted-foreground mt-0.5">meta diária</div>
      )}
    </Card>
  );
}
