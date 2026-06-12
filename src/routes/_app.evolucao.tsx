import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useStore } from "@/lib/store";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";
import { Sparkles, Loader2, Lock, TrendingUp } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { gerarAjustes } from "@/lib/gemini";
import { temAcesso, NOMES_PLANOS, RECURSO_MIN, LIMITE_HISTORICO_GRATUITO } from "@/lib/planos";

export const Route = createFileRoute("/_app/evolucao")({
  head: () => ({
    meta: [
      { title: "Evolução — AI Health Coach" },
      { name: "description", content: "Acompanhe sua evolução de peso, medidas e progresso em relação à meta com gráficos e ajustes da IA." },
      { property: "og:title", content: "Evolução — AI Health Coach" },
      { property: "og:description", content: "Gráficos de evolução, progresso da meta e ajustes inteligentes do plano." },
    ],
  }),
  component: Evolucao,
});


function Evolucao() {
  const { t, i18n: i18nInstance } = useTranslation();
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
        <h1 className="text-2xl md:text-3xl font-bold">{t("evolucao.titulo")}</h1>
        <p className="text-muted-foreground">{t("evolucao.subtitulo")}</p>
      </div>

      <Card id="registro-form" className="p-5 space-y-4">
        <h2 className="font-semibold">{t("evolucao.novo_registro")}</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>{t("evolucao.peso")}</Label>
            <Input type="number" value={peso} onChange={(e) => setPeso(Number(e.target.value))} />
          </div>
          <div className="space-y-2">
            <Label>{t("evolucao.energia", { v: energia })}</Label>
            <Slider value={[energia]} min={1} max={10} step={1} onValueChange={(v) => setEnergia(v[0])} />
          </div>
          <div className="space-y-2">
            <Label>{t("evolucao.fome", { v: fome })}</Label>
            <Slider value={[fome]} min={1} max={10} step={1} onValueChange={(v) => setFome(v[0])} />
          </div>
          <div className="space-y-2">
            <Label>{t("evolucao.qualidade_treino", { v: treino })}</Label>
            <Slider value={[treino]} min={1} max={10} step={1} onValueChange={(v) => setTreino(v[0])} />
          </div>
        </div>
        <div className="space-y-2">
          <Label>{t("evolucao.obs")}</Label>
          <Textarea value={obs} onChange={(e) => setObs(e.target.value)} placeholder={t("evolucao.como_foi")} />
        </div>
        <Button onClick={salvar}>{t("evolucao.salvar")}</Button>
      </Card>

      {plano.metas && plano.metas.peso_desejado > 0 && (() => {
        const meta = plano.metas;
        const pesoInicial = dados.peso;
        const pesoAtual = evolucao.length > 0 ? evolucao[evolucao.length - 1].peso : pesoInicial;
        const totalAPerder = pesoInicial - meta.peso_desejado;
        const jaPerdeu = pesoInicial - pesoAtual;
        const pct = totalAPerder > 0 ? Math.max(0, Math.min(100, (jaPerdeu / totalAPerder) * 100)) : 0;
        const restante = Math.max(0, pesoAtual - meta.peso_desejado);
        const ritmoSemanalEsperado = meta.perda_semanal_kg;

        let semanasRestantes = 0;
        let mensagem = "";
        let tom: "ok" | "alerta" | "parabens" = "ok";

        if (evolucao.length >= 2) {
          const primeiro = evolucao[0];
          const ultimo = evolucao[evolucao.length - 1];
          const dias = Math.max(
            1,
            (new Date(ultimo.data).getTime() - new Date(primeiro.data).getTime()) / (1000 * 60 * 60 * 24),
          );
          const semanas = dias / 7;
          const ritmoReal = (primeiro.peso - ultimo.peso) / Math.max(0.5, semanas);
          if (ritmoReal > 0) {
            semanasRestantes = Math.ceil(restante / ritmoReal);
          }
          if (ritmoReal < ritmoSemanalEsperado * 0.7) {
            tom = "alerta";
            mensagem = t("evolucao.ritmo_abaixo", { real: ritmoReal.toFixed(2), meta: ritmoSemanalEsperado.toFixed(2) });
          } else if (ritmoReal > ritmoSemanalEsperado * 1.1) {
            tom = "parabens";
            mensagem = t("evolucao.ritmo_parabens", { real: ritmoReal.toFixed(2) });
          } else {
            mensagem = t("evolucao.ritmo_certo", { real: ritmoReal.toFixed(2) });
          }
        } else {
          semanasRestantes = ritmoSemanalEsperado > 0 ? Math.ceil(restante / ritmoSemanalEsperado) : meta.prazo_semanas;
          mensagem = t("evolucao.registre_mais");
        }

        const previsao = new Date();
        previsao.setDate(previsao.getDate() + semanasRestantes * 7);
        const locale = i18nInstance.language === "en" ? "en-US" : "pt-BR";
        const previsaoStr = previsao.toLocaleDateString(locale, { day: "2-digit", month: "long", year: "numeric" });

        return (
          <Card className="p-5 space-y-4">
            <div className="flex items-baseline justify-between flex-wrap gap-2">
              <h2 className="font-semibold">{t("evolucao.meta_progresso")}</h2>
              <span className="text-sm text-muted-foreground">
                {pesoAtual.toFixed(1)}kg → {meta.peso_desejado}kg
              </span>
            </div>
            <div className="space-y-1">
              <div className="h-3 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{t("evolucao.ja_perdeu")} {jaPerdeu.toFixed(1)}kg</span>
                <span>{t("evolucao.faltam")} {restante.toFixed(1)}kg</span>
                <span>{pct.toFixed(0)}%</span>
              </div>
            </div>
            {restante > 0 && (
              <p className="text-sm">
                <span className="font-medium">{t("evolucao.previsao")}</span> {t("evolucao.atingir_meta")}{" "}
                <span className="text-primary font-medium">{previsaoStr}</span>
                {" "}({semanasRestantes} {semanasRestantes === 1 ? t("evolucao.semana_um") : t("evolucao.semana_outros")}).
              </p>
            )}
            <p
              className={`text-sm ${
                tom === "alerta"
                  ? "text-destructive"
                  : tom === "parabens"
                    ? "text-primary font-medium"
                    : "text-muted-foreground"
              }`}
            >
              {mensagem}
            </p>
          </Card>
        );
      })()}

      {evolucao.length === 0 && (
        <Card className="p-8 flex flex-col items-center text-center space-y-4">
          <TrendingUp className="w-12 h-12 text-primary" />
          <h3 className="text-lg font-semibold">{t("evolucao.sem_dados")}</h3>
          <p className="text-sm text-muted-foreground max-w-xs">
            {t("evolucao.sem_dados_desc")}
          </p>
          <Button onClick={() => document.getElementById("registro-form")?.scrollIntoView({ behavior: "smooth" })}>
            {t("evolucao.primeiro_registro")}
          </Button>
        </Card>
      )}

      {evolucao.length === 1 && (
        <Card className="p-5" aria-label={`Gráfico de evolução do peso com 1 registro: ${evolucao[0].peso}kg em ${evolucao[0].data}`}>
          <h2 className="font-semibold mb-3">{t("evolucao.evolucao_peso")}</h2>
          <div className="h-64" role="img" aria-label={`Gráfico de linha mostrando 1 registro de peso: ${evolucao[0].peso}kg`}>
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
          <p className="text-sm text-muted-foreground text-center mt-3">
            Registre mais semanas para ver sua evolução completa 📈
          </p>
        </Card>
      )}

      {evolucao.length >= 2 && (() => {
        const primeiro = evolucao[0];
        const ultimo = evolucao[evolucao.length - 1];
        const delta = (ultimo.peso - primeiro.peso).toFixed(1);
        const sentido = Number(delta) < 0 ? "perda" : Number(delta) > 0 ? "ganho" : "manutenção";
        const ariaLabel = `Gráfico de linha da evolução do peso com ${evolucao.length} registros: variação de ${primeiro.peso}kg em ${primeiro.data} para ${ultimo.peso}kg em ${ultimo.data} (${sentido} de ${Math.abs(Number(delta))}kg).`;
        return (
          <Card className="p-5" aria-label={ariaLabel}>
            <h2 className="font-semibold mb-3">{t("evolucao.evolucao_peso")}</h2>
            <div className="h-64" role="img" aria-label={ariaLabel}>
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
        );
      })()}


      <Card className="p-5">
        <div className="flex justify-between items-center mb-3">
          <h2 className="font-semibold">{t("evolucao.ajustes")}</h2>
          {podeAjustesIA ? (
            <Button onClick={gerar} disabled={loading || evolucao.length === 0} size="sm">
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
              {t("evolucao.gerar_ajustes")}
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
          <h2 className="font-semibold mb-3">{t("evolucao.historico")}</h2>
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
