import { Link, Outlet, useRouterState, useNavigate } from "@tanstack/react-router";
import { LayoutDashboard, UtensilsCrossed, Dumbbell, TrendingUp, Droplets, User, Moon, Sun, Sparkles } from "lucide-react";
import { useEffect } from "react";
import { useStore } from "@/lib/store";

const items = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/dieta", label: "Dieta", icon: UtensilsCrossed },
  { to: "/treino", label: "Treino", icon: Dumbbell },
  { to: "/evolucao", label: "Evolução", icon: TrendingUp },
  { to: "/agua", label: "Água", icon: Droplets },
  { to: "/perfil", label: "Perfil", icon: User },
] as const;

export function AppLayout() {
  const tema = useStore((s) => s.tema);
  const setTema = useStore((s) => s.setTema);
  const plano = useStore((s) => s.plano);
  const dados = useStore((s) => s.dados);
  const navigate = useNavigate();
  const path = useRouterState({ select: (r) => r.location.pathname });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", tema === "dark");
  }, [tema]);

  useEffect(() => {
    if (!dados && !plano) navigate({ to: "/onboarding" });
  }, [dados, plano, navigate]);

  return (
    <div className="min-h-screen flex w-full bg-background text-foreground">
      <aside className="hidden md:flex flex-col w-60 border-r border-border bg-sidebar p-4 sticky top-0 h-screen">
        <div className="flex items-center gap-2 mb-8 px-2">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-bold text-lg">VitaIA</span>
        </div>
        <nav className="flex flex-col gap-1 flex-1">
          {items.map((it) => {
            const active = path === it.to;
            const Icon = it.icon;
            return (
              <Link
                key={it.to}
                to={it.to}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <Icon className="w-4 h-4" />
                {it.label}
              </Link>
            );
          })}
        </nav>
        <button
          onClick={() => setTema(tema === "dark" ? "light" : "dark")}
          className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
        >
          {tema === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          Tema {tema === "dark" ? "claro" : "escuro"}
        </button>
      </aside>

      <main className="flex-1 pb-20 md:pb-0 overflow-x-hidden">
        <header className="md:hidden flex items-center justify-between px-4 h-14 border-b border-border sticky top-0 bg-background/80 backdrop-blur z-30">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-bold">VitaIA</span>
          </div>
          <button onClick={() => setTema(tema === "dark" ? "light" : "dark")}>
            {tema === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
        </header>
        <div className="p-4 md:p-8 max-w-6xl mx-auto">
          <Outlet />
        </div>
      </main>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border z-40">
        <div className="grid grid-cols-6">
          {items.map((it) => {
            const active = path === it.to;
            const Icon = it.icon;
            return (
              <Link
                key={it.to}
                to={it.to}
                className={`flex flex-col items-center gap-0.5 py-2 text-[10px] ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <Icon className="w-5 h-5" />
                {it.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
