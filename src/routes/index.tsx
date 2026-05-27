import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { getMyDataFn } from "@/lib/userdata.functions";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Sparkles, Brain, Utensils, Dumbbell, Droplets, TrendingUp, ShieldCheck, ArrowRight,
} from "lucide-react";

const TITLE = "VitaIA — Seu coach de saúde com Inteligência Artificial";
const DESC = "Plano personalizado de nutrição, treino e hidratação gerado por IA em 1 minuto. Acompanhamento diário, lista de compras e evolução semanal.";
const URL = "https://ai-coach-buddy-88.lovable.app/";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:url", content: URL },
      { property: "og:type", content: "website" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESC },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: URL }],
  }),
  component: Landing,
});

function Landing() {
  const navigate = useNavigate();
  const fetchData = useServerFn(getMyDataFn);
  const hydrateFromServer = useStore((s) => s.hydrateFromServer);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) { setChecking(false); return; }
      try {
        const r = await fetchData();
        hydrateFromServer({
          dados: (r.dados as Parameters<typeof hydrateFromServer>[0]["dados"]) ?? null,
          plano: (r.plano as Parameters<typeof hydrateFromServer>[0]["plano"]) ?? null,
        });
        navigate({ to: r.plano ? "/dashboard" : "/onboarding" });
      } catch {
        navigate({ to: "/onboarding" });
      }
    })();
  }, [navigate, fetchData, hydrateFromServer]);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Sparkles className="w-8 h-8 text-primary animate-pulse" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border/40">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg">VitaIA</span>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/login"><Button variant="ghost" size="sm">Entrar</Button></Link>
            <Link to="/signup"><Button size="sm">Começar grátis</Button></Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="px-4 py-16 md:py-24">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" /> Powered by IA
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-tight">
            Seu coach de saúde com{" "}
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Inteligência Artificial
            </span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            Receba um plano personalizado de nutrição, treino e hidratação em 1 minuto.
            Acompanhamento diário, lista de compras semanal e evolução em tempo real.
          </p>
          <div className="flex flex-wrap gap-3 justify-center pt-2">
            <Link to="/signup">
              <Button size="lg" className="text-base">
                Criar meu plano grátis <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <Link to="/login">
              <Button size="lg" variant="outline" className="text-base">Já tenho conta</Button>
            </Link>
          </div>
          <p className="text-xs text-muted-foreground">Sem cartão de crédito · Primeiro plano grátis</p>
        </div>
      </section>

      {/* Benefícios */}
      <section className="px-4 py-12 md:py-16 bg-secondary/30">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-10">
            Tudo que você precisa para evoluir
          </h2>
          <div className="grid gap-4 md:grid-cols-3">
            <Beneficio icon={Brain} titulo="IA personalizada" desc="Cálculo de TMB, TDEE e meta calórica baseados no seu biotipo, objetivo e rotina." />
            <Beneficio icon={Utensils} titulo="Dieta completa" desc="Plano alimentar com horários, calorias e medidas caseiras prontas para seguir." />
            <Beneficio icon={Dumbbell} titulo="Treino guiado" desc="Modo treino fullscreen com timer de descanso e progresso por exercício." />
            <Beneficio icon={Droplets} titulo="Hidratação inteligente" desc="Meta diária de água com lembretes locais a cada 2 horas." />
            <Beneficio icon={TrendingUp} titulo="Evolução semanal" desc="Registre peso, medidas e fotos. Veja sua jornada em gráficos." />
            <Beneficio icon={ShieldCheck} titulo="Seus dados, seguros" desc="Tudo criptografado e armazenado com segurança de nível bancário." />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 py-16 md:py-20">
        <div className="max-w-2xl mx-auto text-center space-y-5">
          <h2 className="text-3xl md:text-4xl font-bold">Comece sua transformação hoje</h2>
          <p className="text-muted-foreground">
            Mais de mil pessoas já criaram seu plano com a VitaIA. Leva 1 minuto e é grátis.
          </p>
          <Link to="/signup">
            <Button size="lg" className="text-base">
              Criar meu plano grátis <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </section>

      <footer className="border-t border-border/40 px-4 py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} VitaIA · Coach de saúde com IA
      </footer>
    </div>
  );
}

function Beneficio({ icon: Icon, titulo, desc }: { icon: typeof Brain; titulo: string; desc: string }) {
  return (
    <Card className="p-5 space-y-3">
      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
        <Icon className="w-5 h-5 text-primary" />
      </div>
      <div className="font-semibold">{titulo}</div>
      <p className="text-sm text-muted-foreground">{desc}</p>
    </Card>
  );
}
