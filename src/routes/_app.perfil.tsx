import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useStore } from "@/lib/store";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { LogOut, Save, RefreshCw, Trash2, Moon, Sun, Bell, Users, Copy, Share2 } from "lucide-react";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { NOMES_PLANOS } from "@/lib/planos";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { getMyDataFn, getMyIndicacoesCountFn } from "@/lib/userdata.functions";

import { Switch } from "@/components/ui/switch";
import {
  loadLembretes,
  saveLembretes,
  pedirPermissaoNotificacao,
  type LembretesConfig,
} from "@/lib/lembretes";

export const Route = createFileRoute("/_app/perfil")({
  head: () => ({
    meta: [
      { title: "Perfil — AI Health Coach" },
      { name: "description", content: "Gerencie seus dados, plano atual e configurações da conta no AI Health Coach." },
      { property: "og:title", content: "Perfil — AI Health Coach" },
      { property: "og:description", content: "Dados pessoais, plano e configurações da sua conta AI Health Coach." },
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
  const { t } = useTranslation();
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
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null);
      setCreatedAt(data.user?.created_at ?? null);
      setUserId(data.user?.id ?? null);
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
      toast.error(t("perfil.preencha_dados"));
      return;
    }
    setDados({ ...dados, nome: nome.trim(), peso: p, altura: a });
    toast.success(t("perfil.dados_atualizados"));
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
        <h1 className="text-2xl md:text-3xl font-bold">{t("perfil.titulo")}</h1>
        <p className="text-sm text-muted-foreground">{t("perfil.subtitulo")}</p>
      </div>

      {/* Identidade */}
      <Card className="p-5">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-primary-foreground font-bold text-xl shrink-0">
            {iniciais(dados?.nome ?? "")}
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-bold text-lg truncate">{dados?.nome ?? t("perfil.visitante")}</div>
            <div className="text-sm text-muted-foreground truncate">
              {dados?.objetivo ?? t("perfil.sem_objetivo")}
              {email ? <> · {email}</> : null}
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              <Link to="/planos" className="text-[11px] font-semibold uppercase tracking-wide px-2 py-1 rounded-full bg-primary/15 text-primary hover:bg-primary/25">
                {t("perfil.plano_atual", { nome: NOMES_PLANOS[planoAss] })}
              </Link>
              <span className="text-[11px] font-medium px-2 py-1 rounded-full bg-secondary text-muted-foreground">
                {t("perfil.cadastro", { data: formatDate(createdAt) })}
              </span>
              <span className="text-[11px] font-medium px-2 py-1 rounded-full bg-secondary text-muted-foreground">
                {t("perfil.plano_gerado", { data: formatDate(planoCriadoEm) })}
              </span>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-5 md:grid-cols-2">
        {/* Meus dados */}
        <Card className="p-5 space-y-4">
          <div>
            <h2 className="font-semibold">{t("perfil.meus_dados")}</h2>
            <p className="text-xs text-muted-foreground">{t("perfil.atualizar")}</p>
          </div>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="nome">{t("perfil.nome")}</Label>
              <Input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="peso">{t("perfil.peso")}</Label>
                <Input id="peso" inputMode="decimal" value={peso} onChange={(e) => setPeso(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="altura">{t("perfil.altura")}</Label>
                <Input id="altura" inputMode="decimal" value={altura} onChange={(e) => setAltura(e.target.value)} />
              </div>
            </div>
          </div>
          <Button onClick={salvarDados} disabled={!dados} className="w-full">
            <Save className="w-4 h-4 mr-2" /> {t("perfil.salvar")}
          </Button>
        </Card>

        {/* Meu plano */}
        <Card className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold">{t("perfil.meu_plano")}</h2>
              <p className="text-xs text-muted-foreground">{t("perfil.resumo_plano")}</p>
            </div>
            <Button variant="outline" size="sm" onClick={refazer}>
              <RefreshCw className="w-4 h-4 mr-2" /> {t("perfil.regenerar")}
            </Button>
          </div>
          {plano && dados ? (
            <div className="grid grid-cols-2 gap-3">
              <Info label={t("perfil.objetivo")} value={dados.objetivo} />
              <Info label={t("perfil.gerado_em")} value={formatDate(planoCriadoEm)} />
              <Info label={t("perfil.tmb")} value={plano.resumo.tmb} />
              <Info label={t("perfil.tdee")} value={plano.resumo.tdee} />
              <Info label={t("perfil.meta_calorica")} value={`${plano.resumo.meta_calorica.toString().replace(/ kcal/gi, "")} kcal`} />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{t("perfil.sem_plano")}</p>
          )}
        </Card>

        {/* Idioma */}
        <Card className="p-5 space-y-3 md:col-span-2">
          <h2 className="font-semibold">Idioma / Language</h2>
          <LanguageSwitcher />
        </Card>

        {/* Ações */}
        <Card className="p-5 space-y-3 md:col-span-2">
          <h2 className="font-semibold">{t("perfil.acoes")}</h2>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setTema(tema === "dark" ? "light" : "dark")}>
              {tema === "dark" ? <Sun className="w-4 h-4 mr-2" /> : <Moon className="w-4 h-4 mr-2" />}
              {tema === "dark" ? t("perfil.tema_claro") : t("perfil.tema_escuro")}
            </Button>
            <AlertDialog open={openLimpar} onOpenChange={(o) => { setOpenLimpar(o); if (!o) setConfirmarTexto(""); }}>
              <AlertDialogTrigger asChild>
                <Button variant="outline">
                  <Trash2 className="w-4 h-4 mr-2" /> {t("perfil.limpar")}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t("perfil.confirmar_apagar")}</AlertDialogTitle>
                  <AlertDialogDescription asChild>
                    <div className="space-y-3">
                      <div>{t("perfil.vai_perder")}</div>
                      <ul className="list-disc pl-5 space-y-1 text-sm">
                        <li>{t("perfil.perder_plano")}</li>
                        <li>{evolucao.length === 1 ? t("perfil.perder_evolucao_um", { count: evolucao.length }) : t("perfil.perder_evolucao_outros", { count: evolucao.length })}</li>
                        <li>{t("perfil.perder_agua")}</li>
                        <li>{t("perfil.perder_config")}</li>
                      </ul>
                      <div className="pt-1">
                        {t("perfil.para_confirmar")} <span className="font-mono font-bold text-foreground">CONFIRMAR</span>:
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
                  <AlertDialogCancel className="bg-secondary text-foreground hover:bg-secondary/80">{t("perfil.cancelar")}</AlertDialogCancel>
                  <AlertDialogAction
                    disabled={confirmarTexto !== "CONFIRMAR"}
                    onClick={limparTudo}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50 disabled:pointer-events-none"
                  >
                    {t("perfil.apagar_tudo")}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <Button variant="destructive" onClick={sair}>
              <LogOut className="w-4 h-4 mr-2" /> {t("perfil.sair")}
            </Button>
          </div>
        </Card>

        {/* Lembretes */}
        <Card className="p-5 space-y-4 md:col-span-2">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-primary" />
            <h2 className="font-semibold">{t("perfil.lembretes")}</h2>
          </div>
          <p className="text-xs text-muted-foreground -mt-2">
            {t("perfil.lembretes_desc")}
          </p>
          <LembretesSection plano={plano} dados={dados} />
        </Card>

        {/* Indique um amigo */}
        <Card className="p-5 space-y-4 md:col-span-2">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            <h2 className="font-semibold">{t("perfil.indicacoes")}</h2>
          </div>
          <p className="text-xs text-muted-foreground -mt-2">
            {t("perfil.indicacoes_desc")}
          </p>
          <IndicacaoSection userId={userId} />
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


type PlanoMini = { plano_alimentar?: Array<{ horario?: string }> } | null;
type DadosMini = { horario?: string } | null;

function LembretesSection({ plano, dados }: { plano: PlanoMini; dados: DadosMini }) {
  void plano; void dados; // agendamento global é feito no AppLayout via evento "lembretes:config".
  const [cfg, setCfg] = useState<LembretesConfig>(() => loadLembretes());

  useEffect(() => {
    saveLembretes(cfg);
  }, [cfg]);

  const toggle = async (key: keyof LembretesConfig, value: boolean) => {
    if (value) {
      const perm = await pedirPermissaoNotificacao();
      if (perm !== "granted") {
        toast.error("Permissão de notificação negada. Ative nas configurações do navegador.");
        return;
      }
    }
    setCfg((c) => ({ ...c, [key]: value }));
  };

  const itens: Array<{ key: keyof LembretesConfig; titulo: string; desc: string }> = [
    { key: "agua", titulo: "Lembrete de água", desc: "A cada 2h entre 7h e 22h" },
    { key: "refeicao", titulo: "Lembrete de refeição", desc: "15 min antes de cada horário do plano" },
    { key: "treino", titulo: "Lembrete de treino", desc: "30 min antes do horário preferido" },
  ];

  return (
    <div className="space-y-3">
      {itens.map((it) => (
        <div key={it.key} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-secondary/40">
          <div className="min-w-0">
            <div className="font-medium text-sm">{it.titulo}</div>
            <div className="text-xs text-muted-foreground">{it.desc}</div>
          </div>
          <Switch checked={cfg[it.key]} onCheckedChange={(v) => toggle(it.key, v)} />
        </div>
      ))}
    </div>
  );
}

function IndicacaoSection({ userId }: { userId: string | null }) {
  const contarFn = useServerFn(getMyIndicacoesCountFn);
  const [count, setCount] = useState<number>(0);

  useEffect(() => {
    if (!userId) return;
    contarFn().then((r) => setCount(r?.count ?? 0)).catch(() => setCount(0));
  }, [userId, contarFn]);

  if (!userId) {
    return <p className="text-sm text-muted-foreground">Carregando...</p>;
  }

  const code = userId.replace(/-/g, "").slice(0, 8);
  const link = `https://vitalia.app/cadastro?ref=${code}`;
  const wppText = `Vem comigo no AI Health Coach! Plano de nutrição e treino feito por IA. Cadastre-se: ${link}`;

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(link);
      toast("Link copiado!", {
        description: "Compartilhe com seus amigos.",
        duration: 3000,
      });
    } catch {
      toast.error("Não foi possível copiar.");
    }
  };

  const compartilharWpp = () => {
    const url = `whatsapp://send?text=${encodeURIComponent(wppText)}`;
    window.open(url, "_blank");
  };

  return (
    <div className="space-y-3">
      <div className="rounded-xl bg-secondary/40 p-3 space-y-2">
        <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Seu link</div>
        <div className="font-mono text-sm break-all">{link}</div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={copiar} aria-label="Copiar link de indicação">
          <Copy className="w-4 h-4 mr-2" /> Copiar link
        </Button>
        <Button onClick={compartilharWpp} aria-label="Compartilhar no WhatsApp">
          <Share2 className="w-4 h-4 mr-2" /> Compartilhar no WhatsApp
        </Button>
      </div>
      <div className="text-sm text-muted-foreground">
        <span className="font-semibold text-foreground">{count}</span> {count === 1 ? "amigo indicado" : "amigos indicados"}
      </div>
    </div>
  );
}


