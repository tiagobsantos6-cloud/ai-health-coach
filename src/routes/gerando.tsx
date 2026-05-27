import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useStore } from "@/lib/store";
import { gerarPlano } from "@/lib/gemini";
import { Sparkles, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { saveMyDataFn } from "@/lib/userdata.functions";
import { registrarIndicacaoFn } from "@/lib/indicacoes.functions";

export const Route = createFileRoute("/gerando")({
  head: () => ({
    meta: [
      { title: "Gerando seu Plano — VitaIA" },
      { name: "description", content: "Estamos criando seu plano personalizado de nutrição e treino com inteligência artificial." },
      { property: "og:title", content: "Gerando seu Plano — VitaIA" },
      { property: "og:description", content: "Sua IA está montando seu plano sob medida." },
    ],
  }),
  beforeLoad: async ({ location }) => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/login", search: { redirect: location.href } });
  },
  component: Gerando,
});

const MAX_TENTATIVAS = 3;

const mensagens = [
  "Calculando suas necessidades calóricas...",
  "Montando o plano alimentar perfeito...",
  "Personalizando seus treinos...",
  "Definindo metas de hidratação...",
  "Preparando estratégias de disciplina...",
  "Quase lá! Finalizando seu plano...",
];

function Gerando() {
  const navigate = useNavigate();
  const dados = useStore((s) => s.dados);
  const setPlano = useStore((s) => s.setPlano);
  const saveData = useServerFn(saveMyDataFn);
  const [msgIdx, setMsgIdx] = useState(0);
  const [erro, setErro] = useState<string | null>(null);
  const [tentativa, setTentativa] = useState(1);
  const [elapsed, setElapsed] = useState(0);
  const startedAtRef = useRef<number>(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setMsgIdx((i) => (i + 1) % mensagens.length), 2200);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (erro) return;
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - startedAtRef.current) / 1000)), 1000);
    return () => clearInterval(t);
  }, [erro]);

  const tentar = async () => {
    setErro(null);
    setTentativa(1);
    setElapsed(0);
    startedAtRef.current = Date.now();
    if (!dados) {
      navigate({ to: "/onboarding" });
      return;
    }
    let ultimoErro: unknown = null;
    for (let i = 1; i <= MAX_TENTATIVAS; i++) {
      setTentativa(i);
      try {
        const plano = await gerarPlano(dados);
        setPlano(plano);
        try {
          await saveData({ data: { dados, plano } });
        } catch (e) {
          console.error("[gerando] failed to persist plano", e);
        }
        navigate({ to: "/dashboard" });
        return;
      } catch (e) {
        ultimoErro = e;
        // pequena espera antes de retentar
        if (i < MAX_TENTATIVAS) await new Promise((r) => setTimeout(r, 1500));
      }
    }
    const msg = ultimoErro instanceof Error ? ultimoErro.message : "Erro desconhecido";
    setErro(msg);
  };

  useEffect(() => {
    tentar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (erro) {
    const mensagemAmigavel = /429|Muitas requisi/i.test(erro)
      ? "Muitas tentativas. Aguarde 1 minuto e tente novamente."
      : `Não conseguimos após ${MAX_TENTATIVAS} tentativas. Tente novamente.`;
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background text-foreground">
        <div className="max-w-md text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-destructive" />
          </div>
          <h2 className="text-xl font-bold">Não foi possível gerar seu plano</h2>
          <p className="text-sm text-muted-foreground break-words">{mensagemAmigavel}</p>
          <div className="flex gap-2 justify-center">
            <Button onClick={tentar}>Tentar novamente</Button>
            <Button variant="outline" onClick={() => navigate({ to: "/onboarding" })}>
              Voltar ao início
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background text-foreground">
      <div className="text-center space-y-6 max-w-md w-full">
        <motion.div
          animate={{ rotate: 360, scale: [1, 1.1, 1] }}
          transition={{ rotate: { repeat: Infinity, duration: 3, ease: "linear" }, scale: { repeat: Infinity, duration: 2 } }}
          className="w-24 h-24 mx-auto rounded-3xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center"
        >
          <Sparkles className="w-12 h-12 text-primary-foreground" />
        </motion.div>
        <div>
          <h1 className="text-2xl font-bold mb-3">Gerando seu Plano de Saúde</h1>
          {tentativa > 1 && (
            <p className="text-sm text-primary font-semibold mb-2">
              Tentativa {tentativa} de {MAX_TENTATIVAS} — ajustando o plano...
            </p>
          )}
          <motion.p
            key={msgIdx}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-muted-foreground"
          >
            {mensagens[msgIdx]}
          </motion.p>
          <p className="text-xs text-muted-foreground mt-2">
            Isso costuma levar entre 15 e 40 segundos
          </p>
        </div>

        {/* Indeterminate progress bar */}
        <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden mx-auto max-w-xs">
          <div className="h-full w-1/3 bg-primary rounded-full animate-indeterminate" />
        </div>

        {elapsed > 30 && (
          <p className="text-sm text-muted-foreground">
            Está demorando mais que o esperado... mas já estamos quase lá!
          </p>
        )}

        <div className="flex justify-center gap-1.5">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-2 h-2 rounded-full bg-primary"
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ repeat: Infinity, duration: 1.2, delay: i * 0.2 }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
