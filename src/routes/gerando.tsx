import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useStore } from "@/lib/store";
import { gerarPlano } from "@/lib/gemini";
import { Sparkles, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/gerando")({
  beforeLoad: async ({ location }) => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/login", search: { redirect: location.href } });
  },
  component: Gerando,
});

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
  const [msgIdx, setMsgIdx] = useState(0);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    const interval = setInterval(() => setMsgIdx((i) => (i + 1) % mensagens.length), 2200);
    return () => clearInterval(interval);
  }, []);

  const tentar = async () => {
    setErro(null);
    if (!dados) {
      navigate({ to: "/onboarding" });
      return;
    }
    try {
      const plano = await gerarPlano(dados);
      setPlano(plano);
      navigate({ to: "/dashboard" });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erro desconhecido";
      setErro(msg);
    }
  };

  useEffect(() => {
    tentar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (erro) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background text-foreground">
        <div className="max-w-md text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-destructive" />
          </div>
          <h2 className="text-xl font-bold">Não foi possível gerar seu plano</h2>
          <p className="text-sm text-muted-foreground break-words">{erro}</p>
          <div className="flex gap-2 justify-center">
            <Button onClick={tentar}>Tentar novamente</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background text-foreground">
      <div className="text-center space-y-8 max-w-md">
        <motion.div
          animate={{ rotate: 360, scale: [1, 1.1, 1] }}
          transition={{ rotate: { repeat: Infinity, duration: 3, ease: "linear" }, scale: { repeat: Infinity, duration: 2 } }}
          className="w-24 h-24 mx-auto rounded-3xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center"
        >
          <Sparkles className="w-12 h-12 text-primary-foreground" />
        </motion.div>
        <div>
          <h2 className="text-2xl font-bold mb-3">Criando seu plano com IA</h2>
          <motion.p
            key={msgIdx}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-muted-foreground"
          >
            {mensagens[msgIdx]}
          </motion.p>
        </div>
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
