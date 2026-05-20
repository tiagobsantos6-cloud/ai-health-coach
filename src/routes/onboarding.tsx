import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useStore, type DadosUsuario } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Sparkles, ArrowRight, ArrowLeft, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const biotipoDesc: Record<string, string> = {
  Ectomorfo: "Corpo naturalmente magro, metabolismo acelerado, dificuldade em ganhar peso e massa muscular. Ombros e quadris estreitos, pouca gordura corporal.",
  Mesomorfo: "Corpo atlético e musculoso naturalmente, responde bem ao treino, ganha músculo e perde gordura com facilidade. Ombros largos e cintura definida.",
  Endomorfo: "Tendência a acumular gordura facilmente, metabolismo mais lento, dificuldade em emagrecer. Corpo mais arredondado, ganha peso com facilidade.",
};

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "Personalização do seu Plano — VitaIA" },
      { name: "description", content: "Responda algumas perguntas para que a IA gere seu plano personalizado de nutrição e treino." },
      { property: "og:title", content: "Personalização do seu Plano — VitaIA" },
      { property: "og:description", content: "Conte-nos sobre você para criarmos um plano sob medida." },
    ],
  }),
  beforeLoad: async ({ location }) => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/login", search: { redirect: location.href } });
  },
  component: Onboarding,
});


const objetivos = ["Hipertrofia", "Emagrecimento", "Definição", "Performance", "Corrida", "Saúde", "Reeducação Alimentar"];
const restricoesList = ["Lactose", "Glúten", "Vegano", "Vegetariano", "Outro"];

function Onboarding() {
  const navigate = useNavigate();
  const setDados = useStore((s) => s.setDados);
  const tema = useStore((s) => s.tema);
  const [step, setStep] = useState(1);
  const [d, setD] = useState<DadosUsuario>({
    nome: "", sexo: "masculino", idade: 0,
    peso: 0, altura: 0, gordura: undefined, biotipo: "Mesomorfo",
    objetivo: "", pesoDesejado: undefined, prazoSemanas: 12, diasTreino: 4, tempoTreino: 60, local: "Academia", horario: "Manhã",
    restricoes: [], restricaoOutro: "", favoritos: "", naoGosta: "", refeicoes: 4, orcamento: 800, suplementos: false, suplementosQuais: "",
    saude: "", sono: 7, estresse: 5,
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", tema === "dark");
  }, [tema]);

  const update = (p: Partial<DadosUsuario>) => setD({ ...d, ...p });

  const canNext = () => {
    if (step === 1) return d.nome.trim() && d.idade > 0;
    if (step === 2) return d.peso > 0 && d.altura > 0;
    if (step === 3) return !!d.objetivo;
    return true;
  };

  const finish = () => {
    setDados(d);
    navigate({ to: "/gerando" });
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="flex items-center gap-2 p-6">
        <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-primary-foreground" />
        </div>
        <span className="font-bold text-lg">VitaIA</span>
      </header>

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 pb-12">
        <h1 className="sr-only">Personalização do seu Plano</h1>
        <div className="mb-8">

          <div className="flex items-center justify-between mb-2 text-sm text-muted-foreground">
            <span>Etapa {step} de 5</span>
            <span>{Math.round((step / 5) * 100)}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-primary"
              initial={false}
              animate={{ width: `${(step / 5) * 100}%` }}
              transition={{ type: "spring", stiffness: 100, damping: 20 }}
            />
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
            className="space-y-6"
          >
            {step === 1 && (
              <>
                <div>
                  <h2 className="text-2xl font-bold">Vamos nos conhecer</h2>
                  <p className="text-muted-foreground">Conte um pouco sobre você</p>
                </div>
                <div className="space-y-2">
                  <Label>Nome</Label>
                  <Input value={d.nome} onChange={(e) => update({ nome: e.target.value })} placeholder="Seu nome" />
                </div>
                <div className="space-y-2">
                  <Label>Sexo</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {["masculino", "feminino", "outro"].map((s) => (
                      <button
                        key={s}
                        onClick={() => update({ sexo: s })}
                        className={`px-3 py-3 rounded-lg border text-sm capitalize transition-colors ${
                          d.sexo === s ? "border-primary bg-primary/10 text-primary" : "border-border"
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Idade</Label>
                  <Input type="number" placeholder="Ex: 25" value={d.idade || ""} onChange={(e) => update({ idade: Number(e.target.value) })} />
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <div>
                  <h2 className="text-2xl font-bold">Dados físicos</h2>
                  <p className="text-muted-foreground">Para calcular suas necessidades</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Peso (kg)</Label>
                    <Input type="number" placeholder="Ex: 70" value={d.peso || ""} onChange={(e) => update({ peso: Number(e.target.value) })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Altura (cm)</Label>
                    <Input type="number" placeholder="Ex: 170" value={d.altura || ""} onChange={(e) => update({ altura: Number(e.target.value) })} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>% gordura corporal (opcional)</Label>
                  <Input type="number" value={d.gordura ?? ""} onChange={(e) => update({ gordura: e.target.value ? Number(e.target.value) : undefined })} />
                </div>
                <div className="space-y-2">
                  <Label>Biotipo</Label>
                  <TooltipProvider delayDuration={150}>
                    <div className="grid grid-cols-3 gap-2">
                      {["Ectomorfo", "Mesomorfo", "Endomorfo"].map((b) => (
                        <Tooltip key={b}>
                          <TooltipTrigger asChild>
                            <button
                              onClick={() => update({ biotipo: b })}
                              className={`px-3 py-3 rounded-lg border text-sm transition-colors ${
                                d.biotipo === b ? "border-primary bg-primary/10 text-primary" : "border-border"
                              }`}
                            >
                              {b}
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="bottom" className="max-w-xs text-center">
                            {biotipoDesc[b]}
                          </TooltipContent>
                        </Tooltip>
                      ))}
                    </div>
                  </TooltipProvider>
                </div>
              </>
            )}

            {step === 3 && (
              <>
                <div>
                  <h2 className="text-2xl font-bold">Qual seu objetivo?</h2>
                  <p className="text-muted-foreground">Selecione sua principal meta</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {objetivos.map((o) => (
                    <button
                      key={o}
                      onClick={() => update({ objetivo: o })}
                      className={`px-4 py-5 rounded-xl border text-sm font-medium transition-all ${
                        d.objetivo === o
                          ? "border-primary bg-primary/10 text-primary scale-[1.02]"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      {o}
                    </button>
                  ))}
                </div>
                {(d.objetivo === "Emagrecimento" || d.objetivo === "Definição") && (() => {
                  const prazo = d.prazoSemanas ?? 12;
                  const pesoAtual = d.peso || 0;
                  const pesoAlvo = d.pesoDesejado ?? 0;
                  const diff = pesoAtual - pesoAlvo;
                  const perdaSemanal = diff > 0 && prazo > 0 ? diff / prazo : 0;
                  const perdaMensal = perdaSemanal * 4;
                  const agressiva = perdaSemanal > 1;
                  return (
                    <div className="space-y-4 mt-2 p-4 rounded-xl border border-border bg-muted/30">
                      <div className="space-y-2">
                        <Label>Peso desejado (kg)</Label>
                        <Input
                          type="number"
                          placeholder="Ex: 65"
                          value={d.pesoDesejado ?? ""}
                          onChange={(e) => update({ pesoDesejado: e.target.value ? Number(e.target.value) : undefined })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Prazo para atingir o objetivo: {prazo} {prazo === 1 ? "semana" : "semanas"}</Label>
                        <Slider value={[prazo]} min={1} max={24} step={1} onValueChange={(v) => update({ prazoSemanas: v[0] })} />
                      </div>
                      {diff > 0 && perdaSemanal > 0 && (
                        <div className="space-y-2">
                          <p className="text-sm">
                            <span className="font-medium">Meta:</span> perder {diff.toFixed(1)}kg — aprox. {perdaSemanal.toFixed(2)}kg por semana e {perdaMensal.toFixed(2)}kg por mês.
                          </p>
                          {agressiva && (
                            <p className="text-sm text-destructive font-medium">
                              ⚠️ Meta muito agressiva — recomendamos no máximo 1kg por semana para preservar a saúde.
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </>
            )}

            {step === 4 && (
              <>
                <div>
                  <h2 className="text-2xl font-bold">Sua rotina</h2>
                  <p className="text-muted-foreground">Como será seu treino</p>
                </div>
                <div className="space-y-2">
                  <Label>Dias de treino por semana: {d.diasTreino}</Label>
                  <Slider value={[d.diasTreino]} min={1} max={7} step={1} onValueChange={(v) => update({ diasTreino: v[0] })} />
                </div>
                <div className="space-y-2">
                  <Label>Tempo por treino (min)</Label>
                  <div className="grid grid-cols-4 gap-2">
                    {[30, 45, 60, 90].map((t) => (
                      <button key={t} onClick={() => update({ tempoTreino: t })} className={`px-3 py-2 rounded-lg border text-sm ${d.tempoTreino === t ? "border-primary bg-primary/10 text-primary" : "border-border"}`}>
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Local</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {["Academia", "Casa", "Rua"].map((l) => (
                      <button key={l} onClick={() => update({ local: l })} className={`px-3 py-2 rounded-lg border text-sm ${d.local === l ? "border-primary bg-primary/10 text-primary" : "border-border"}`}>
                        {l}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Horário preferido</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {["Manhã", "Tarde", "Noite"].map((h) => (
                      <button key={h} onClick={() => update({ horario: h })} className={`px-3 py-2 rounded-lg border text-sm ${d.horario === h ? "border-primary bg-primary/10 text-primary" : "border-border"}`}>
                        {h}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {step === 5 && (
              <>
                <div>
                  <h2 className="text-2xl font-bold">Alimentação e saúde</h2>
                  <p className="text-muted-foreground">Personalizando o plano</p>
                </div>
                <div className="space-y-2">
                  <Label>Restrições alimentares</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {restricoesList.map((r) => (
                      <label key={r} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border cursor-pointer">
                        <Checkbox
                          checked={d.restricoes.includes(r)}
                          onCheckedChange={(c) =>
                            update({ restricoes: c ? [...d.restricoes, r] : d.restricoes.filter((x) => x !== r) })
                          }
                        />
                        <span className="text-sm">{r}</span>
                      </label>
                    ))}
                  </div>
                  {d.restricoes.includes("Outro") && (
                    <Input
                      value={d.restricaoOutro ?? ""}
                      onChange={(e) => update({ restricaoOutro: e.target.value })}
                      placeholder="Especifique sua restrição"
                      className="mt-2"
                    />
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Alimentos favoritos</Label>
                  <Textarea value={d.favoritos} onChange={(e) => update({ favoritos: e.target.value })} placeholder="Ex: frango, arroz, banana..." />
                </div>
                <div className="space-y-2">
                  <Label>Alimentos que não gosta</Label>
                  <Textarea value={d.naoGosta} onChange={(e) => update({ naoGosta: e.target.value })} placeholder="Ex: brócolis, peixe..." />
                </div>
                <div className="space-y-2">
                  <Label>Refeições por dia: {d.refeicoes}</Label>
                  <Slider value={[d.refeicoes]} min={3} max={6} step={1} onValueChange={(v) => update({ refeicoes: v[0] })} />
                </div>
                <div className="space-y-2">
                  <Label>Orçamento mensal: R$ {d.orcamento}</Label>
                  <Slider value={[d.orcamento]} min={200} max={2000} step={50} onValueChange={(v) => update({ orcamento: v[0] })} />
                </div>
                <div className="space-y-2">
                  <Label>Usa suplementos?</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {[{l:"Sim",v:true},{l:"Não",v:false}].map((o) => (
                      <button key={o.l} onClick={() => update({ suplementos: o.v })} className={`px-3 py-2 rounded-lg border text-sm ${d.suplementos === o.v ? "border-primary bg-primary/10 text-primary" : "border-border"}`}>
                        {o.l}
                      </button>
                    ))}
                  </div>
                  {d.suplementos && (
                    <Input
                      value={d.suplementosQuais ?? ""}
                      onChange={(e) => update({ suplementosQuais: e.target.value })}
                      placeholder="Quais? Ex: whey, creatina..."
                      className="mt-2"
                    />
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Problemas de saúde / lesões (opcional)</Label>
                  <Textarea value={d.saude} onChange={(e) => update({ saude: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Qualidade do sono: {d.sono}/10</Label>
                  <Slider value={[d.sono]} min={1} max={10} step={1} onValueChange={(v) => update({ sono: v[0] })} />
                </div>
                <div className="space-y-2">
                  <Label>Nível de estresse: {d.estresse}/10</Label>
                  <Slider value={[d.estresse]} min={1} max={10} step={1} onValueChange={(v) => update({ estresse: v[0] })} />
                </div>
              </>
            )}
          </motion.div>
        </AnimatePresence>

        <div className="flex gap-3 mt-8">
          {step > 1 && (
            <Button variant="outline" onClick={() => setStep(step - 1)} className="flex-1">
              <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
            </Button>
          )}
          {step < 5 ? (
            <Button onClick={() => setStep(step + 1)} disabled={!canNext()} className="flex-1">
              Continuar <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={finish} className="flex-1">
              Gerar meu plano <Check className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>
      </main>
    </div>

  );
}
