import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sparkles } from "lucide-react";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

const errosPtBr: Record<string, string> = {
  "Invalid login credentials": "Email ou senha incorretos. Tente novamente.",
  "Email not confirmed": "Email ainda não confirmado. Verifique sua caixa de entrada.",
  "User not found": "Usuário não encontrado.",
  "Rate limit exceeded": "Muitas tentativas. Aguarde um pouco.",
};

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Entrar — AI Health Coach" },
      { name: "description", content: "Acesse sua conta AI Health Coach para continuar seu plano personalizado de nutrição e treino." },
      { property: "og:title", content: "Entrar — AI Health Coach" },
      { property: "og:description", content: "Faça login no AI Health Coach e continue seu acompanhamento de saúde." },
    ],
  }),
  component: LoginPage,
});


function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/" });
    });
  }, [navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      const msg = errosPtBr[error.message] ?? "E-mail ou senha inválidos.";
      setError(msg);
      return;
    }
    navigate({ to: "/" });
  };

  const signInGoogle = async () => {
    setGoogleLoading(true);
    setError(null);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setError("Não foi possível entrar com Google.");
      setGoogleLoading(false);
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/" });
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background">
      <Card className="w-full max-w-sm p-6 space-y-5 rounded-2xl">
        <div className="flex items-center gap-2 justify-center">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/30">
            <Sparkles className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-bold text-xl bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">AI Health Coach</span>
        </div>
        <div className="text-center">
          <h1 className="text-xl font-semibold">Entrar</h1>
          <p className="text-sm text-muted-foreground">Acesse seu plano personalizado</p>
        </div>

        <button
          type="button"
          onClick={signInGoogle}
          disabled={googleLoading}
          className="w-full flex items-center justify-center gap-2 h-10 rounded-md bg-white text-gray-900 font-medium text-sm border border-gray-200 hover:bg-gray-50 transition disabled:opacity-60"
        >
          <GoogleIcon />
          {googleLoading ? "Conectando..." : "Entrar com Google"}
        </button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">ou</span>
          </div>
        </div>

        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Senha</Label>
            <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Entrando..." : "Entrar"}
          </Button>
        </form>
        <p className="text-sm text-center text-muted-foreground">
          Não tem conta?{" "}
          <Link to="/signup" className="text-primary font-medium">Cadastre-se</Link>
        </p>
      </Card>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M21.6 12.227c0-.708-.064-1.39-.182-2.045H12v3.868h5.382a4.602 4.602 0 0 1-1.996 3.018v2.51h3.232c1.892-1.742 2.982-4.31 2.982-7.351z"/>
      <path fill="#34A853" d="M12 22c2.7 0 4.964-.895 6.618-2.422l-3.232-2.51c-.896.6-2.041.957-3.386.957-2.605 0-4.81-1.76-5.598-4.124H3.064v2.59A9.996 9.996 0 0 0 12 22z"/>
      <path fill="#FBBC05" d="M6.402 13.901A5.996 5.996 0 0 1 6.09 12c0-.66.114-1.301.312-1.901V7.509H3.064A9.996 9.996 0 0 0 2 12c0 1.614.386 3.14 1.064 4.491l3.338-2.59z"/>
      <path fill="#EA4335" d="M12 5.977c1.47 0 2.787.505 3.823 1.496l2.868-2.868C16.96 2.99 14.696 2 12 2 8.094 2 4.72 4.243 3.064 7.509l3.338 2.59C7.19 7.737 9.395 5.977 12 5.977z"/>
    </svg>
  );
}
