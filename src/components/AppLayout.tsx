import { Link, Outlet, useRouterState, useNavigate } from "@tanstack/react-router";
import { LayoutDashboard, UtensilsCrossed, Dumbbell, TrendingUp, Droplets, User, Sparkles, Crown, LogOut, Menu, ShoppingCart } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useStore } from "@/lib/store";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getMyTierFn } from "@/lib/subscription.functions";
import { getMyDataFn, saveMyDataFn } from "@/lib/userdata.functions";
import { LoadingPlano } from "@/components/LoadingPlano";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { loadLembretes, setupLembretes, loadPendentes, limparPendente, type Pendentes } from "@/lib/lembretes";

const sideItems = [
  { to: "/dashboard", k: "nav.dashboard", icon: LayoutDashboard },
  { to: "/dieta", k: "nav.dieta", icon: UtensilsCrossed },
  { to: "/treino", k: "nav.treino", icon: Dumbbell },
  { to: "/agua", k: "nav.agua", icon: Droplets },
  { to: "/compras", k: "nav.compras", icon: ShoppingCart },
  { to: "/evolucao", k: "nav.evolucao", icon: TrendingUp },
  { to: "/planos", k: "nav.planos", icon: Crown },
  { to: "/perfil", k: "nav.perfil", icon: User },
] as const;

const bottomItems = [
  { to: "/dashboard", k: "nav.inicio", icon: LayoutDashboard },
  { to: "/dieta", k: "nav.dieta", icon: UtensilsCrossed },
  { to: "/treino", k: "nav.treino", icon: Dumbbell },
  { to: "/agua", k: "nav.agua", icon: Droplets },
] as const;

const menuItems = [
  { to: "/compras", k: "nav.compras", icon: ShoppingCart },
  { to: "/evolucao", k: "nav.evolucao", icon: TrendingUp },
  { to: "/planos", k: "nav.planos", icon: Crown },
  { to: "/perfil", k: "nav.perfil", icon: User },
] as const;

export function AppLayout() {
  const { t } = useTranslation();
  const setPlanoAssinatura = useStore((s) => s.setPlanoAssinatura);
  const hidratado = useStore((s) => s.hidratado);
  const hydrateFromServer = useStore((s) => s.hydrateFromServer);
  const plano = useStore((s) => s.plano);
  const dados = useStore((s) => s.dados);
  const navigate = useNavigate();
  const path = useRouterState({ select: (r) => r.location.pathname });
  const [menuOpen, setMenuOpen] = useState(false);

  // Track auth session — gate all server fns on this
  const [userId, setUserId] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUserId(data.session?.user?.id ?? null);
      setAuthReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUserId(session?.user?.id ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const fetchTier = useServerFn(getMyTierFn);
  const tierQuery = useQuery({
    queryKey: ["my-tier", userId],
    queryFn: () => fetchTier(),
    staleTime: 60_000,
    enabled: !!userId,
  });

  const fetchData = useServerFn(getMyDataFn);
  const dataQuery = useQuery({
    queryKey: ["my-data", userId],
    queryFn: () => fetchData(),
    staleTime: 30_000,
    enabled: !!userId,
  });

  const saveData = useServerFn(saveMyDataFn);
  const lastSavedRef = useRef<string>("");
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (tierQuery.data?.tier) setPlanoAssinatura(tierQuery.data.tier);
  }, [tierQuery.data, setPlanoAssinatura]);

  useEffect(() => {
    if (hidratado || !dataQuery.data) return;
    const localHasData = dados !== null || plano !== null;
    if (localHasData) { useStore.setState({ hidratado: true }); return; }
    hydrateFromServer({
      dados: (dataQuery.data.dados as ReturnType<typeof useStore.getState>["dados"]) ?? null,
      plano: (dataQuery.data.plano as ReturnType<typeof useStore.getState>["plano"]) ?? null,
    });
  }, [dataQuery.data, hidratado, hydrateFromServer, dados, plano]);

  useEffect(() => {
    if (!hidratado || !userId) return;
    if (dados === null && plano === null) return;
    const payload = JSON.stringify({ dados, plano });
    if (payload === lastSavedRef.current) return;

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      lastSavedRef.current = payload;
      saveData({ data: { dados, plano } }).catch((e) => console.error("save user data", e));
    }, 2000);

    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, [dados, plano, hidratado, userId, saveData]);

  // Respect the user's saved theme preference.
  const tema = useStore((s) => s.tema);
  useEffect(() => {
    const root = document.documentElement;
    if (tema === "dark") {
      root.classList.add("dark");
      root.classList.remove("light");
    } else {
      root.classList.remove("dark");
      root.classList.add("light");
    }
  }, [tema]);

  useEffect(() => {
    if (!hidratado) return;
    if (dataQuery.isLoading || dataQuery.isFetching) return;
    if (!dados && !plano && path !== "/onboarding") navigate({ to: "/onboarding" });
  }, [hidratado, dados, plano, path, navigate, dataQuery.isLoading, dataQuery.isFetching]);

  // Close the bottom-sheet menu whenever the route changes.
  useEffect(() => { setMenuOpen(false); }, [path]);

  // Schedule local reminders for the current day based on saved config.
  const [cfgTick, setCfgTick] = useState(0);
  useEffect(() => {
    const bump = () => setCfgTick((n) => n + 1);
    window.addEventListener("lembretes:config", bump);
    return () => window.removeEventListener("lembretes:config", bump);
  }, []);
  useEffect(() => {
    if (!hidratado) return;
    const cfg = loadLembretes();
    const horariosRefeicoes = (plano?.plano_alimentar ?? [])
      .map((r) => r.horario ?? "")
      .filter(Boolean);
    const cleanup = setupLembretes(cfg, {
      horariosRefeicoes,
      horarioTreino: dados?.horario,
    });
    return cleanup;
  }, [hidratado, plano, dados, cfgTick]);

  // Track pending reminder badges (water/diet/training).
  const [pendentes, setPendentes] = useState<Pendentes>(() => loadPendentes());
  useEffect(() => {
    const sync = () => setPendentes(loadPendentes());
    window.addEventListener("lembretes:pendentes", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("lembretes:pendentes", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  useEffect(() => {
    if (path === "/agua") limparPendente("agua");
    if (path === "/dieta") limparPendente("dieta");
    if (path === "/treino") limparPendente("treino");
  }, [path]);

  const badgeFor = (to: string): boolean => {
    if (to === "/agua") return !!pendentes.agua;
    if (to === "/dieta") return !!pendentes.dieta;
    if (to === "/treino") return !!pendentes.treino;
    return false;
  };

  const logout = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/login" });
  };

  // Show loading screen while fetching server data — never expose an empty dashboard.
  if (authReady && userId && (!hidratado || dataQuery.isLoading || dataQuery.isFetching) && path !== "/onboarding" && path !== "/gerando") {
    return <LoadingPlano mensagem={t("geral.carregando")} />;
  }

  return (
    <div className="min-h-screen flex w-full bg-background text-foreground">
      <aside className="hidden md:flex flex-col w-[220px] border-r border-border bg-sidebar p-4 sticky top-0 h-screen">
        <div className="flex items-center gap-2 mb-8 px-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-bold text-lg">AI Health Coach</span>
        </div>
        <nav className="flex flex-col gap-1 flex-1">
          {sideItems.map((it) => {
            const active = path === it.to;
            const Icon = it.icon;
            return (
              <Link
                key={it.to}
                to={it.to}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium ${
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                <Icon className="w-[18px] h-[18px]" />
                {it.label}
              </Link>
            );
          })}
        </nav>
        <button
          onClick={logout}
          className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <LogOut className="w-4 h-4" />
          {t("nav.sair")}
        </button>
      </aside>

      <main className="flex-1 pb-20 md:pb-0 overflow-x-hidden">
        <header className="md:hidden flex items-center justify-between px-4 h-14 border-b border-border sticky top-0 bg-background/90 backdrop-blur z-30">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-bold">AI Health Coach</span>
          </div>
          <Link to="/perfil" aria-label={t("nav.perfil")} className="text-muted-foreground hover:text-foreground">
            <User className="w-5 h-5" />
          </Link>

        </header>
        <div className="p-4 md:p-8 max-w-6xl mx-auto">
          <Outlet />
        </div>
      </main>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border z-40 pb-[env(safe-area-inset-bottom)]">
        <div className="grid grid-cols-5">
          {bottomItems.map((it) => {
            const active = path === it.to;
            const Icon = it.icon;
            const hasBadge = badgeFor(it.to);
            return (
              <Link
                key={it.to}
                to={it.to}
                className={`flex flex-col items-center justify-center gap-1 py-2.5 text-[11px] font-medium ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <span className="relative">
                  <Icon className={`w-[22px] h-[22px] ${active ? "scale-110" : ""} transition-transform`} />
                  {hasBadge && (
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-destructive ring-2 ring-card" />
                  )}
                </span>
                {t(it.k)}
              </Link>
            );
          })}
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild>
              {(() => {
                const activeMenuItem = menuItems.find((m) => m.to === path);
                const isMenuActive = !!activeMenuItem;
                return (
                  <button
                    className={`flex flex-col items-center justify-center gap-1 py-2.5 text-[11px] font-medium ${
                      isMenuActive ? "text-primary" : "text-muted-foreground"
                    }`}
                    aria-label={t("nav.mais_opcoes")}
                  >
                    <Menu className={`w-[22px] h-[22px] ${isMenuActive ? "scale-110" : ""} transition-transform`} />
                    {activeMenuItem ? t(activeMenuItem.k) : t("nav.menu")}
                  </button>
                );
              })()}
            </SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-2xl pb-[env(safe-area-inset-bottom)]">
              <SheetHeader>
                <SheetTitle>{t("nav.mais_opcoes")}</SheetTitle>
              </SheetHeader>
              <div className="flex flex-col gap-1 mt-4">
                {menuItems.map((it) => {
                  const active = path === it.to;
                  const Icon = it.icon;
                  return (
                    <Link
                      key={it.to}
                      to={it.to}
                      onClick={() => setMenuOpen(false)}
                      className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium ${
                        active ? "border-l-2 border-primary bg-primary/10 text-primary" : "text-foreground hover:bg-secondary"
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      {t(it.k)}
                    </Link>
                  );
                })}
                <button
                  onClick={() => { setMenuOpen(false); logout(); }}
                  className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
                >
                  <LogOut className="w-5 h-5" />
                  {t("nav.sair")}
                </button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </div>
  );
}
