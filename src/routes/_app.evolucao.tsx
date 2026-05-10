import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";
import { Sparkles, Loader2, Lock } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { gerarAjustes } from "@/lib/gemini";
import { temAcesso, NOMES_PLANOS, RECURSO_MIN, LIMITE_HISTORICO_GRATUITO } from "@/lib/planos";

export const Route = createFileRoute("/_app/evolucao")({
  component: Evolucao,
});

function Evolucao() {
  const plano = useStore((s) => s.plano);
  const dados = useStore((s) => s.dados);
  const evolucao = useStore((s) => s.evolucao);
  const planoAss = useStore((s) => s.planoAssinatura);
  const addEvolucao = useStore((s) => s.addEvolucao);
  const podeAjustesIA = temAcesso(planoAss, "ajustes_ia_evolucao");
  const podeHistoricoCompleto = temAcesso(planoAss, "historico_completo_evolucao");
  const [peso, setPeso] = useState(dados?.peso ?? 70);
  const [energia, setEnergia] = useState(7);
  const [fome, setFome] = useState(5);
  const [treino, setTreino] = useState(7);
  const [obs, setObs] = useState("");
  const [ajustes, setAjustes] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!plano || !dados) return null;

  const salvar = () => {
    addEvolucao({
      data: new Date().toISOString().slice(0, 10),
      peso, energia, fome, treino, observacoes: obs,
    });
    setObs("");
  };

  const gerar = async () => {
    setLoading(true);
    try {
      const r = await gerarAjustes(dados, plano, evolucao);
      setAjustes(r);
    } catch (e) {
      setAjustes(`Erro: ${e instanceof Error ? e.message : "tente novamente"}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Evolução</h1>
        <p className="text-muted-foreground">Acompanhe seu progresso semanal</p>
      </div>

      <Card className="p-5 space-y-4">
        <h3 className="font-semibold">Novo registro semanal</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Peso atual (kg)</Label>
            <Input type="number" value={peso} onChange={(e) => setPeso(Number(e.target.value))} />
          </div>
          <div className="space-y-2">
            <Label>Energia: {energia}/10</Label>
            <Slider value={[energia]} min={1} max={10} step={1} onValueChange={(v) => setEnergia(v[0])} />
          </div>
          <div className="space-y-2">
            <Label>Fome: {fome}/10</Label>
            <Slider value={[fome]} min={1} max={10} step={1} onValueChange={(v) => setFome(v[0])} />
          </div>
          <div className="space-y-2">
            <Label>Qualidade do treino: {treino}/10</Label>
            <Slider value={[treino]} min={1} max={10} step={1} onValueChange={(v) => setTreino(v[0])} />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Observações</Label>
          <Textarea value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Como foi sua semana?" />
        </div>
        <Button onClick={salvar}>Salvar registro</Button>
      </Card>

      {evolucao.length > 0 && (
        <Card className="p-5">
          <h3 className="font-semibold mb-3">Evolução do peso</h3>
          <div className="h-64">
            <ResponsiveContainer>
              <LineChart data={evolucao}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="data" stroke="var(--muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--muted-foreground)" fontSize={12} />
                <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
                <Line type="monotone" dataKey="peso" stroke="var(--primary)" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      <Card className="p-5">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-semibold">Ajustes inteligentes</h3>
          {podeAjustesIA ? (
            <Button onClick={gerar} disabled={loading || evolucao.length === 0} size="sm">
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
              Gerar ajustes com IA
            </Button>
          ) : (
            <Button asChild size="sm" variant="outline">
              <Link to="/planos"><Lock className="w-4 h-4 mr-2" /> Plano {NOMES_PLANOS[RECURSO_MIN.ajustes_ia_evolucao]}</Link>
            </Button>
          )}
        </div>
        {!podeAjustesIA && (
          <p className="text-sm text-muted-foreground">
            Os ajustes automáticos pela IA estão disponíveis no plano <span className="font-medium text-foreground">{NOMES_PLANOS[RECURSO_MIN.ajustes_ia_evolucao]}</span> ou superior.
          </p>
        )}
        {podeAjustesIA && ajustes && (
          <div className="p-4 rounded-lg bg-primary/5 border border-primary/20 whitespace-pre-wrap text-sm">
            {ajustes}
          </div>
        )}
        {podeAjustesIA && !ajustes && evolucao.length === 0 && (
          <p className="text-sm text-muted-foreground">Registre pelo menos uma semana para gerar ajustes.</p>
        )}
      </Card>

      {evolucao.length > 0 && (
        <Card className="p-5 overflow-x-auto">
          <h3 className="font-semibold mb-3">Histórico</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground border-b border-border">
                <th className="py-2">Data</th>
                <th>Peso</th>
                <th>Energia</th>
                <th>Fome</th>
                <th>Treino</th>
                <th>Obs</th>
              </tr>
            </thead>
            <tbody>
              {(podeHistoricoCompleto ? [...evolucao].reverse() : [...evolucao].reverse().slice(0, LIMITE_HISTORICO_GRATUITO)).map((r, i) => (
                <tr key={i} className="border-b border-border last:border-0">
                  <td className="py-2">{r.data}</td>
                  <td>{r.peso}</td>
                  <td>{r.energia}</td>
                  <td>{r.fome}</td>
                  <td>{r.treino}</td>
                  <td className="max-w-xs truncate text-muted-foreground">{r.observacoes}</td>
                </tr>
              ))}
              {!podeHistoricoCompleto && evolucao.length > LIMITE_HISTORICO_GRATUITO && (
                <tr>
                  <td colSpan={6} className="py-3 text-center text-xs text-muted-foreground">
                    <Link to="/planos" className="text-primary hover:underline inline-flex items-center gap-1">
                      <Lock className="w-3 h-3" /> Veja todo o histórico no plano {NOMES_PLANOS[RECURSO_MIN.historico_completo_evolucao]}
                    </Link>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
