import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useStore, type PlanoAssinatura } from "@/lib/store";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Sparkles, Crown, Zap, Gift } from "lucide-react";
import { motion } from "framer-motion";

export const Route = createFileRoute("/_app/planos")({
  head: () => ({
    meta: [
      { title: "Planos — AI Health Coach" },
      { name: "description", content: "Conheça os planos do AI Health Coach e desbloqueie recursos avançados de IA para nutrição e treino." },
      { property: "og:title", content: "Planos — AI Health Coach" },
      { property: "og:description", content: "Escolha o plano ideal para o seu acompanhamento de saúde com IA." },
    ],
  }),
  component: Planos,
});


type Tier = {
  id: PlanoAssinatura;
  nome: string;
  preco: string;
  periodoKey: "planos.periodo_gratuito" | "planos.periodo_mensal";
  destaque?: boolean;
  icon: typeof Gift;
  cor: string;
  beneficiosKeys: string[];
};

const tiers: Tier[] = [
  {
    id: "gratuito",
    nome: "Gratuito",
    preco: "R$ 0",
    periodoKey: "planos.periodo_gratuito",
    icon: Gift,
    cor: "text-muted-foreground",
    beneficiosKeys: [
      "planos.ben.gratuito.0",
      "planos.ben.gratuito.1",
      "planos.ben.gratuito.2",
      "planos.ben.gratuito.3",
    ],
  },
  {
    id: "basico",
    nome: "Básico",
    preco: "R$ 9,99",
    periodoKey: "planos.periodo_mensal",
    icon: Zap,
    cor: "text-chart-2",
    beneficiosKeys: [
      "planos.ben.basico.0",
      "planos.ben.basico.1",
      "planos.ben.basico.2",
      "planos.ben.basico.3",
    ],
  },
  {
    id: "intermediario",
    nome: "Intermediário",
    preco: "R$ 14,99",
    periodoKey: "planos.periodo_mensal",
    destaque: true,
    icon: Sparkles,
    cor: "text-primary",
    beneficiosKeys: [
      "planos.ben.intermediario.0",
      "planos.ben.intermediario.1",
      "planos.ben.intermediario.2",
      "planos.ben.intermediario.3",
      "planos.ben.intermediario.4",
    ],
  },
  {
    id: "completo",
    nome: "Completo",
    preco: "R$ 19,99",
    periodoKey: "planos.periodo_mensal",
    icon: Crown,
    cor: "text-chart-3",
    beneficiosKeys: [
      "planos.ben.completo.0",
      "planos.ben.completo.1",
      "planos.ben.completo.2",
      "planos.ben.completo.3",
      "planos.ben.completo.4",
    ],
  },
];

function Planos() {
  const { t } = useTranslation();
  const planoAtual = useStore((s) => s.planoAssinatura);

  return (
    <div className="space-y-8">
      <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground text-center">
        {t("planos.pagamentos_em_breve")}
      </div>
      <div className="text-center max-w-2xl mx-auto">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">{t("planos.titulo")}</h1>
        <p className="text-muted-foreground mt-2">
          {t("planos.subtitulo")}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {tiers.map((tier, i) => {
          const Icon = tier.icon;
          const ativo = planoAtual === tier.id;
          return (
            <motion.div
              key={tier.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
            >
              <Card
                className={`relative p-6 h-full flex flex-col gap-4 transition-shadow ${
                  tier.destaque ? "border-primary shadow-lg ring-1 ring-primary/30" : ""
                }`}
              >
                {tier.destaque && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[11px] font-semibold px-3 py-1 rounded-full">
                    {t("planos.mais_popular")}
                  </span>
                )}
                <div className="flex items-center gap-2">
                  <div className={`w-10 h-10 rounded-xl bg-muted flex items-center justify-center ${tier.cor}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="font-bold text-lg leading-tight">{tier.nome}</h2>
                    <p className="text-xs text-muted-foreground">{t(tier.periodoKey)}</p>
                  </div>
                </div>

                <div>
                  <span className="text-3xl font-bold">{tier.preco}</span>
                  {tier.id !== "gratuito" && (
                    <span className="text-sm text-muted-foreground">/mês</span>
                  )}
                </div>

                <ul className="space-y-2 flex-1">
                  {tier.beneficiosKeys.map((bKey) => (
                    <li key={bKey} className="flex items-start gap-2 text-sm">
                      <Check className={`w-4 h-4 mt-0.5 shrink-0 ${tier.cor}`} />
                      <span>{t(bKey)}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  variant={ativo ? "outline" : tier.destaque ? "default" : "secondary"}
                  disabled
                  className="w-full"
                >
                  {ativo ? t("planos.plano_atual") : t("planos.em_breve")}
                </Button>
              </Card>
            </motion.div>
          );
        })}
      </div>

      <p className="text-center text-xs text-muted-foreground">
        {t("planos.cancele")}
      </p>
    </div>
  );
}
