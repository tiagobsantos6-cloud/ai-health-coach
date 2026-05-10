import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";
import { useStore } from "@/lib/store";
import { Card } from "@/components/ui/card";
import { Flame, Beef, Wheat, Droplet, Moon } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

export const Route = createFileRoute("/_app/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const plano = useStore((s) => s.plano);
  const dados = useStore((s) => s.dados);
  const checklist = useStore((s) => s.checklist);
  const toggle = useStore((s) => s.toggleChecklist);
  const resetCheck = useStore((s) => s.resetChecklistIfNewDay);

  useEffect(() => {
    resetCheck();
  }, [resetCheck]);

  const macros = useMemo(() => {
    if (!plano) return [];
    const cleanValue = (val: string | number) => {
      if (typeof val === "number") return val;
      return Number(val.toString().replace(/[^0-9.]/g, "")) || 0;
    };
    const p = cleanValue(plano.resumo.proteinas_g);
    const c = cleanValue(plano.resumo.carboidratos_g);
    const g = cleanValue(plano.resumo.gorduras_g);
    return [
      { name: "Proteínas", value: p, color: "var(--chart-1)" },
      { name: "Carboidratos", value: c, color: "var(--chart-3)" },
      { name: "Gorduras", value: g, color: "var(--chart-5)" },
    ];
  }, [plano]);

  if (!plano) return null;
  const total = macros.reduce((a, b) => a + b.value, 0);
  const items = plano.disciplina.checklist || [];
  const done = items.filter((i) => checklist[i]).length;
  const pct = items.length ? Math.round((done / items.length) * 100) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Olá, {dados?.nome?.split(" ")[0]} 👋</h1>
        <p className="text-muted-foreground">Aqui está o seu plano de hoje</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard 
          icon={<Flame className="w-4 h-4" />} 
          label="Meta calórica" 
          value={`${plano.resumo.meta_calorica.toString().replace(/ kcal/gi, "")} kcal`} 
        />
        <StatCard 
          icon={<Beef className="w-4 h-4" />} 
          label="Proteínas" 
          value={`${plano.resumo.proteinas_g.toString().replace(/ g/gi, "")} g`} 
        />
        <StatCard 
          icon={<Wheat className="w-4 h-4" />} 
          label="Carboidratos" 
          value={`${plano.resumo.carboidratos_g.toString().replace(/ g/gi, "")} g`} 
        />
        <StatCard 
          icon={<Droplet className="w-4 h-4" />} 
          label="Água" 
          value={`${plano.resumo.agua_diaria_ml.toString().replace(/ ml/gi, "")} ml`} 
        />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card className="p-5">
          <h3 className="font-semibold mb-3">Distribuição de macros</h3>
          <div className="h-56">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={macros} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2}>
                  {macros.map((m, i) => (
                    <Cell key={i} fill={m.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }}
                  formatter={(v: number, n: string) => [`${v}g (${total ? Math.round((v / total) * 100) : 0}%)`, n]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-4 text-xs">
            {macros.map((m) => (
              <div key={m.name} className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded" style={{ background: m.color }} />
                {m.name}
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-semibold">Checklist do dia</h3>
            <span className="text-sm text-primary font-semibold">{pct}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden mb-4">
            <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
          </div>
          <div className="space-y-2 max-h-56 overflow-y-auto">
            {items.length === 0 && <p className="text-sm text-muted-foreground">Nenhum item de checklist</p>}
            {items.map((it) => (
              <label key={it} className="flex items-start gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!checklist[it]}
                  onChange={() => toggle(it)}
                  className="mt-0.5 accent-primary"
                />
                <span className={checklist[it] ? "line-through text-muted-foreground" : ""}>{it}</span>
              </label>
            ))}
          </div>
        </Card>
      </div>

      <Card className="p-5">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <Moon className="w-4 h-4" /> Rotina semanal
        </h3>
        <div className="grid grid-cols-7 gap-2">
          {plano.rotina_semanal.map((d, i) => (
            <div key={i} className="p-2 rounded-lg bg-muted text-center">
              <div className="text-[10px] font-bold uppercase text-muted-foreground">{d.dia_semana.slice(0, 3)}</div>
              <div className="text-xs mt-1 truncate">{d.treino || "Descanso"}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
        {icon}
        {label}
      </div>
      <div className="text-lg md:text-xl font-bold">{value}</div>
    </Card>
  );
}
