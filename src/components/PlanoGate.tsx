import { Link } from "@tanstack/react-router";
import { Lock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";
import { NOMES_PLANOS, RECURSO_MIN, temAcesso, type Recurso } from "@/lib/planos";

export function PlanoGate({
  recurso,
  children,
  titulo,
}: {
  recurso: Recurso;
  children: React.ReactNode;
  titulo?: string;
}) {
  const plano = useStore((s) => s.planoAssinatura);
  if (temAcesso(plano, recurso)) return <>{children}</>;
  const min = RECURSO_MIN[recurso];
  return (
    <Card className="p-5 border-dashed text-center space-y-3">
      <div className="mx-auto w-10 h-10 rounded-full bg-muted flex items-center justify-center">
        <Lock className="w-5 h-5 text-muted-foreground" />
      </div>
      <div>
        <div className="font-semibold">{titulo ?? "Recurso bloqueado"}</div>
        <p className="text-sm text-muted-foreground">
          Disponível a partir do plano <span className="font-medium text-foreground">{NOMES_PLANOS[min]}</span>.
        </p>
      </div>
      <Button asChild size="sm">
        <Link to="/planos">Ver planos</Link>
      </Button>
    </Card>
  );
}

export function BadgePlano() {
  const plano = useStore((s) => s.planoAssinatura);
  return (
    <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-primary/10 text-primary">
      {NOMES_PLANOS[plano]}
    </span>
  );
}
