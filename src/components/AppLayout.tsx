import { Link, Outlet, useRouterState, useNavigate } from "@tanstack/react-router";
import { LayoutDashboard, UtensilsCrossed, Dumbbell, TrendingUp, Droplets, User, Sparkles, Crown, LogOut } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useStore } from "@/lib/store";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getMyTierFn } from "@/lib/subscription.functions";
import { getMyDataFn, saveMyDataFn } from "@/lib/userdata.functions";

const sideItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/dieta", label: "Dieta", icon: UtensilsCrossed },
  { to: "/treino", label: "Treino", icon: Dumbbell },
  { to: "/agua", label: "Água", icon: Droplets },
  { to: "/evolucao", label: "Evolução", icon: TrendingUp },
  { to: "/planos", label: "Planos", icon: Crown },
  { to: "/perfil", label: "Perfil", icon: User },
] as const;

const bottomItems = [
  { to: "/dashboard", label: "Início", icon: LayoutDashboard },
  { to: "/dieta", label: "Dieta", icon: UtensilsCrossed },
  { to: "/treino", label: "Treino", icon: Dumbbell },
  { to: "/agua", label: "Água", icon: Droplets },
  { to: "/perfil", label: "Perfil", icon: User },
] as const;

export function AppLayout() {
  const setPlanoAssinatura = useStore((s) => s.setPlanoAssinatura);
  const hidratado = useStore((s) => s.hidratado);
  const hydrateFromServer = useStore((s) => s.hydrateFromServer);
  const plano = useStore((s) => s.plano);
  const dados = useStore((s) => s.dados);
  const navigate = useNavigate();
  const path = useRouterState({ select: (r) => r.location.pathname });

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
    lastSavedRef.current = payload;
    saveData({ data: { dados, plano } }).catch((e) => console.error("save user data", e));
  }, [dados, plano, hidratado, userId, saveData]);

  // Force dark theme — MyFitnessPal-inspired design
  useEffect(() => { document.documentElement.classList.add("dark"); }, []);

  useEffect(() => {
    if (!hidratado) return;
    if (!dados && !plano && path !== "/onboarding") navigate({ to: "/onboarding" });
  }, [hidratado, dados, plano, path, navigate]);

  const logout = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/login" });
  };

  return (
    <div className="min-h-screen flex w-full bg-background text-foreground">
      <aside className="hidden md:flex flex-col w-[220px] border-r border-border bg-sidebar p-4 sticky top-0 h-screen">
        <div className="flex items-center gap-2 mb-8 px-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-bold text-lg">VitaIA</span>
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
          Sair
        </button>
      </aside>

      <main className="flex-1 pb-24 md:pb-0 overflow-x-hidden">
        <header className="md:hidden flex items-center justify-between px-4 h-14 border-b border-border sticky top-0 bg-background/90 backdrop-blur z-30">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-bold">VitaIA</span>
          </div>
          <Link to="/perfil" className="text-muted-foreground hover:text-foreground">
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
            return (
              <Link
                key={it.to}
                to={it.to}
                className={`flex flex-col items-center justify-center gap-1 py-2.5 text-[11px] font-medium ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <Icon className={`w-[22px] h-[22px] ${active ? "scale-110" : ""} transition-transform`} />
                {it.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
