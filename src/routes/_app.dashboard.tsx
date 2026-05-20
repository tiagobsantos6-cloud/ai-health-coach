import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";
import { useStore } from "@/lib/store";
import { Card } from "@/components/ui/card";
import { Droplet, Dumbbell, Moon, Scale } from "lucide-react";

export const Route = createFileRoute("/_app/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — VitaIA" },
      { name: "description", content: "Resumo diário do seu plano: calorias, macros, água, treino e checklist de disciplina." },
      { property: "og:title", content: "Dashboard — VitaIA" },
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

  const macros = useMemo(() => {
    if (!plano) return null;
    return {
      kcal: cleanNum(plano.resumo.meta_calorica),
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

  if (!plano || !macros) return null;

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
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{saudacao},</p>
          <h1 className="text-2xl font-bold">Painel de {nome || "você"} — Resumo Diário</h1>
        </div>
        <div className="w-11 h-11 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-primary-foreground font-bold">
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
        <QuickCard icon={<Moon className="w-4 h-4" />} title="Sono" value={`${dados?.sono ?? 8}h`} sub="meta diária" />
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

function MacroPill({ label, value, unit, color }: { label: string; value: number; unit: string; color: string }) {
  return (
    <div className="bg-secondary rounded-xl p-3 text-center">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</div>
      <div className="text-lg font-bold mt-1">{value}<span className="text-xs text-muted-foreground">{unit}</span></div>
      <div className="h-1 mt-2 rounded-full overflow-hidden bg-background/40">
        <div className="h-full rounded-full" style={{ width: "100%", background: color }} />
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
