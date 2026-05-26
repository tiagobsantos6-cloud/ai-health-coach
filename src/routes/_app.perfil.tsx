import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { LogOut, Save, RefreshCw, Trash2, Moon, Sun } from "lucide-react";
import { NOMES_PLANOS } from "@/lib/planos";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { getMyDataFn } from "@/lib/userdata.functions";

export const Route = createFileRoute("/_app/perfil")({
  head: () => ({
    meta: [
      { title: "Perfil — VitaIA" },
      { name: "description", content: "Gerencie seus dados, plano atual e configurações da conta no VitaIA." },
      { property: "og:title", content: "Perfil — VitaIA" },
      { property: "og:description", content: "Dados pessoais, plano e configurações da sua conta VitaIA." },
    ],
  }),
  component: Perfil,
});

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
  const tema = useStore((s) => s.tema);
  const setTema = useStore((s) => s.setTema);
  const evolucao = useStore((s) => s.evolucao);
  const fetchMyData = useServerFn(getMyDataFn);

  const [confirmarTexto, setConfirmarTexto] = useState("");
  const [openLimpar, setOpenLimpar] = useState(false);

  const [email, setEmail] = useState<string | null>(null);
  const [createdAt, setCreatedAt] = useState<string | null>(null);
  const [planoCriadoEm, setPlanoCriadoEm] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null);
      setCreatedAt(data.user?.created_at ?? null);
    });
  }, []);

  // Busca data de geração do plano direto do Supabase (user_data.updated_at).
  useEffect(() => {
    let cancelled = false;
    fetchMyData()
      .then((res) => { if (!cancelled) setPlanoCriadoEm(res?.updatedAt ?? null); })
      .catch(() => { if (!cancelled) setPlanoCriadoEm(null); });
    return () => { cancelled = true; };
  }, [fetchMyData, plano]);

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

  const refazer = () => {
    reset();
    navigate({ to: "/onboarding" });
  };

  const limparTudo = async () => {
    try { localStorage.clear(); } catch { /* ignore */ }
    reset();
    await supabase.auth.signOut();
    navigate({ to: "/login" });
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
        <p className="text-sm text-muted-foreground">Seus dados e plano</p>
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
            <h2 className="font-semibold">Meus dados</h2>
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

        {/* Meu plano */}
        <Card className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold">Meu plano</h2>
              <p className="text-xs text-muted-foreground">Resumo do plano gerado</p>
            </div>
            <Button variant="outline" size="sm" onClick={refazer}>
              <RefreshCw className="w-4 h-4 mr-2" /> Regenerar
            </Button>
          </div>
          {plano && dados ? (
            <div className="grid grid-cols-2 gap-3">
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
          <h2 className="font-semibold">Ações</h2>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setTema(tema === "dark" ? "light" : "dark")}>
              {tema === "dark" ? <Sun className="w-4 h-4 mr-2" /> : <Moon className="w-4 h-4 mr-2" />}
              {tema === "dark" ? "Tema claro" : "Tema escuro"}
            </Button>
            <AlertDialog open={openLimpar} onOpenChange={(o) => { setOpenLimpar(o); if (!o) setConfirmarTexto(""); }}>
              <AlertDialogTrigger asChild>
                <Button variant="outline">
                  <Trash2 className="w-4 h-4 mr-2" /> Limpar todos os dados
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Tem certeza? Esta ação não pode ser desfeita.</AlertDialogTitle>
                  <AlertDialogDescription asChild>
                    <div className="space-y-3">
                      <div>Você vai perder:</div>
                      <ul className="list-disc pl-5 space-y-1 text-sm">
                        <li>Seu plano alimentar e de treino</li>
                        <li>Histórico de evolução ({evolucao.length} {evolucao.length === 1 ? "semana registrada" : "semanas registradas"})</li>
                        <li>Registros de água</li>
                        <li>Configurações pessoais</li>
                      </ul>
                      <div className="pt-1">
                        Para confirmar, digite <span className="font-mono font-bold text-foreground">CONFIRMAR</span> abaixo:
                      </div>
                      <Input
                        value={confirmarTexto}
                        onChange={(e) => setConfirmarTexto(e.target.value)}
                        placeholder="CONFIRMAR"
                        autoFocus
                      />
                    </div>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="bg-secondary text-foreground hover:bg-secondary/80">Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    disabled={confirmarTexto !== "CONFIRMAR"}
                    onClick={limparTudo}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50 disabled:pointer-events-none"
                  >
                    Sim, apagar tudo
                  </AlertDialogAction>
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

