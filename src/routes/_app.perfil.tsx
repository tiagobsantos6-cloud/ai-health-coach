import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { LogOut, ExternalLink, Save, RefreshCw, Trash2, Sparkles } from "lucide-react";
import { NOMES_PLANOS } from "@/lib/planos";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/perfil")({
  component: Perfil,
});

const GEMINI_KEY_STORAGE = "gemini_api_key";

function iniciais(nome: string) {
  if (!nome) return "?";
  const partes = nome.trim().split(/\s+/);
  return ((partes[0]?.[0] ?? "") + (partes[partes.length - 1]?.[0] ?? "")).toUpperCase().slice(0, 2);
}

function formatDate(iso?: string | null) {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" }); }
  catch { return "—"; }
}

function Perfil() {
  const navigate = useNavigate();
  const dados = useStore((s) => s.dados);
  const plano = useStore((s) => s.plano);
  const planoAss = useStore((s) => s.planoAssinatura);
  const setDados = useStore((s) => s.setDados);
  const reset = useStore((s) => s.reset);

  const [email, setEmail] = useState<string | null>(null);
  const [createdAt, setCreatedAt] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null);
      setCreatedAt(data.user?.created_at ?? null);
    });
  }, []);

  // Editable fields
  const [nome, setNome] = useState(dados?.nome ?? "");
  const [peso, setPeso] = useState<string>(dados?.peso?.toString() ?? "");
  const [altura, setAltura] = useState<string>(dados?.altura?.toString() ?? "");
  useEffect(() => {
    setNome(dados?.nome ?? "");
    setPeso(dados?.peso?.toString() ?? "");
    setAltura(dados?.altura?.toString() ?? "");
  }, [dados]);

  const salvarDados = () => {
    if (!dados) return;
    const p = parseFloat(peso.replace(",", "."));
    const a = parseFloat(altura.replace(",", "."));
    if (!nome.trim() || isNaN(p) || isNaN(a)) {
      toast.error("Preencha nome, peso e altura corretamente.");
      return;
    }
    setDados({ ...dados, nome: nome.trim(), peso: p, altura: a });
    toast.success("Dados atualizados!");
  };

  // Gemini API key
  const [apiKey, setApiKey] = useState("");
  useEffect(() => {
    if (typeof window !== "undefined") {
      setApiKey(localStorage.getItem(GEMINI_KEY_STORAGE) ?? "");
    }
  }, []);
  const apiConfigurada = apiKey.trim().length > 0;
  const salvarApiKey = () => {
    localStorage.setItem(GEMINI_KEY_STORAGE, apiKey.trim());
    toast.success(apiKey.trim() ? "Chave salva." : "Chave removida.");
  };

  const planoCriadoEm = useMemo(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("plano_gerado_em");
  }, [plano]);

  const refazer = () => {
    reset();
    navigate({ to: "/onboarding" });
  };

  const limparTudo = () => {
    localStorage.clear();
    location.href = "/onboarding";
  };

  const sair = async () => {
    await supabase.auth.signOut();
    localStorage.clear();
    location.href = "/login";
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Perfil</h1>
        <p className="text-sm text-muted-foreground">Seus dados, IA e plano</p>
      </div>

      {/* Identidade */}
      <Card className="p-5">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-primary-foreground font-bold text-xl shrink-0">
            {iniciais(dados?.nome ?? "")}
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-bold text-lg truncate">{dados?.nome ?? "Visitante"}</div>
            <div className="text-sm text-muted-foreground truncate">
              {dados?.objetivo ?? "Sem objetivo definido"}
              {email ? <> · {email}</> : null}
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              <Link to="/planos" className="text-[11px] font-semibold uppercase tracking-wide px-2 py-1 rounded-full bg-primary/15 text-primary hover:bg-primary/25">
                Plano {NOMES_PLANOS[planoAss]}
              </Link>
              <span className="text-[11px] font-medium px-2 py-1 rounded-full bg-secondary text-muted-foreground">
                Cadastro: {formatDate(createdAt)}
              </span>
              <span className="text-[11px] font-medium px-2 py-1 rounded-full bg-secondary text-muted-foreground">
                Plano gerado: {formatDate(planoCriadoEm)}
              </span>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-5 md:grid-cols-2">
        {/* Meus dados */}
        <Card className="p-5 space-y-4">
          <div>
            <h3 className="font-semibold">Meus dados</h3>
            <p className="text-xs text-muted-foreground">Atualize seus dados pessoais</p>
          </div>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="nome">Nome</Label>
              <Input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="peso">Peso (kg)</Label>
                <Input id="peso" inputMode="decimal" value={peso} onChange={(e) => setPeso(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="altura">Altura (cm)</Label>
                <Input id="altura" inputMode="decimal" value={altura} onChange={(e) => setAltura(e.target.value)} />
              </div>
            </div>
          </div>
          <Button onClick={salvarDados} disabled={!dados} className="w-full">
            <Save className="w-4 h-4 mr-2" /> Salvar alterações
          </Button>
        </Card>

        {/* Configuração da IA */}
        <Card className="p-5 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-semibold flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" /> Configuração da IA
              </h3>
              <p className="text-xs text-muted-foreground">Chave opcional do Google Gemini</p>
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <span className={`w-2.5 h-2.5 rounded-full ${apiConfigurada ? "bg-green-500" : "bg-red-500"}`} />
              <span className="text-muted-foreground">{apiConfigurada ? "Configurada" : "Não configurada"}</span>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="apikey">Chave da API Google Gemini</Label>
            <Input
              id="apikey"
              type="password"
              placeholder="AIza..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              autoComplete="off"
            />
            <a
              href="https://aistudio.google.com/apikey"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              Obter chave gratuita → aistudio.google.com/apikey
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <Button onClick={salvarApiKey} variant="outline" className="w-full">
            <Save className="w-4 h-4 mr-2" /> Salvar chave
          </Button>
        </Card>

        {/* Meu plano */}
        <Card className="p-5 space-y-4 md:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Meu plano</h3>
              <p className="text-xs text-muted-foreground">Resumo do plano gerado</p>
            </div>
            <Button variant="outline" size="sm" onClick={refazer}>
              <RefreshCw className="w-4 h-4 mr-2" /> Regenerar plano
            </Button>
          </div>
          {plano && dados ? (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <Info label="Objetivo" value={dados.objetivo} />
              <Info label="Gerado em" value={formatDate(planoCriadoEm)} />
              <Info label="TMB" value={plano.resumo.tmb} />
              <Info label="TDEE" value={plano.resumo.tdee} />
              <Info label="Meta calórica" value={`${plano.resumo.meta_calorica.toString().replace(/ kcal/gi, "")} kcal`} />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhum plano gerado ainda.</p>
          )}
        </Card>

        {/* Ações */}
        <Card className="p-5 space-y-3 md:col-span-2">
          <h3 className="font-semibold">Ações</h3>
          <div className="flex flex-wrap gap-2">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline">
                  <Trash2 className="w-4 h-4 mr-2" /> Limpar todos os dados
                </Button>
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
            <Button variant="destructive" onClick={sair}>
              <LogOut className="w-4 h-4 mr-2" /> Sair da conta
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-secondary/40 rounded-lg p-3">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="font-semibold truncate text-sm mt-0.5">{value}</div>
    </div>
  );
}
