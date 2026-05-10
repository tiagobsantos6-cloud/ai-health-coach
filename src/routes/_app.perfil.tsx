import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useStore } from "@/lib/store";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Lock } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { temAcesso, NOMES_PLANOS, RECURSO_MIN } from "@/lib/planos";

export const Route = createFileRoute("/_app/perfil")({
  component: Perfil,
});

function Perfil() {
  const navigate = useNavigate();
  const dados = useStore((s) => s.dados);
  const plano = useStore((s) => s.plano);
  const planoAss = useStore((s) => s.planoAssinatura);
  const reset = useStore((s) => s.reset);
  const podeRegenerar = temAcesso(planoAss, "regenerar_plano");
  const [apiKey, setApiKey] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setApiKey(localStorage.getItem("gemini_api_key") || "");
    setSaved(!!localStorage.getItem("gemini_api_key"));
  }, []);

  const salvar = () => {
    if (apiKey.trim()) {
      localStorage.setItem("gemini_api_key", apiKey.trim());
      setSaved(true);
    }
  };

  const refazer = () => {
    reset();
    navigate({ to: "/onboarding" });
  };

  const limparTudo = () => {
    localStorage.clear();
    location.href = "/onboarding";
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Perfil</h1>
        <p className="text-muted-foreground">Seus dados e configurações</p>
      </div>

      {dados && plano && (
        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">Resumo</h3>
            <Link to="/planos" className="text-[11px] font-semibold uppercase tracking-wide px-2 py-1 rounded-full bg-primary/10 text-primary hover:bg-primary/20">
              Plano {NOMES_PLANOS[planoAss]}
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
            <Info label="Nome" value={dados.nome} />
            <Info label="Objetivo" value={dados.objetivo} />
            <Info label="IMC" value={plano.resumo.imc} />
            <Info label="TMB" value={plano.resumo.tmb} />
            <Info label="TDEE" value={plano.resumo.tdee} />
            <Info label="Meta calórica" value={`${plano.resumo.meta_calorica.toString().replace(/ kcal/gi, "")} kcal`} />
          </div>
        </Card>
      )}

      <Card className="p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Chave da API Google Gemini</h3>
          {saved ? (
            <span className="text-xs flex items-center gap-1 text-primary"><CheckCircle2 className="w-4 h-4" /> Configurada</span>
          ) : (
            <span className="text-xs flex items-center gap-1 text-destructive"><XCircle className="w-4 h-4" /> Não configurada</span>
          )}
        </div>
        <div className="space-y-2">
          <Label>Chave da API Google Gemini</Label>
          <Input
            type="password"
            value={apiKey}
            onChange={(e) => { setApiKey(e.target.value); setSaved(false); }}
            placeholder="Cole sua chave do Google AI Studio aqui"
          />
          <a
            href="https://aistudio.google.com/apikey"
            target="_blank" rel="noopener noreferrer"
            className="text-xs text-primary flex items-center gap-1 hover:underline"
          >
            Obter chave gratuita em aistudio.google.com/apikey <ExternalLink className="w-3 h-3" />
          </a>
        </div>
        <Button onClick={salvar}>Salvar chave</Button>
      </Card>

      <Card className="p-5 space-y-3">
        <h3 className="font-semibold">Ações</h3>
        <div className="flex flex-wrap gap-2">
          {podeRegenerar ? (
            <Button variant="outline" onClick={refazer}>Refazer plano completo</Button>
          ) : (
            <Button asChild variant="outline" title={`Disponível no plano ${NOMES_PLANOS[RECURSO_MIN.regenerar_plano]}`}>
              <Link to="/planos"><Lock className="w-4 h-4 mr-2" /> Refazer plano (plano {NOMES_PLANOS[RECURSO_MIN.regenerar_plano]})</Link>
            </Button>
          )}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">Limpar todos os dados</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
                <AlertDialogDescription>
                  Isso vai apagar seu plano, registros e a chave da API. Não dá pra desfazer.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={limparTudo}>Limpar tudo</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </Card>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-semibold truncate">{value}</div>
    </div>
  );
}
