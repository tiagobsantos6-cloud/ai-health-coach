import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sparkles, Mail } from "lucide-react";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

const errosPtBr: Record<string, string> = {
  "User already registered": "Este email já está cadastrado. Tente fazer login.",
  "Invalid email": "Email inválido. Verifique e tente novamente.",
  "Password should be at least 6 characters": "A senha deve ter pelo menos 6 caracteres.",
  "Email rate limit exceeded": "Muitos emails enviados. Aguarde alguns minutos.",
  "Signup requires a valid password": "Informe uma senha válida.",
  "Unable to validate email": "Não foi possível validar o email.",
};

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Criar conta — AI Health Coach" },
      { name: "description", content: "Crie sua conta no AI Health Coach e receba um plano personalizado de nutrição e treino gerado por IA." },
      { property: "og:title", content: "Criar conta — AI Health Coach" },
      { property: "og:description", content: "Cadastre-se no AI Health Coach e comece seu plano personalizado." },
    ],
  }),
  component: SignupPage,
});

type Etapa = "form" | "confirmar-email";


function SignupPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [etapa, setEtapa] = useState<Etapa>("form");
  const [countdown, setCountdown] = useState(0);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const ref = params.get("ref");
      if (ref) localStorage.setItem("indicacao_ref", ref);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  const traduzirErro = (msg: string): string => {
    return errosPtBr[msg] ?? msg;
  };

  const startCountdown = () => {
    setCountdown(60);
    if (countdownRef.current) clearInterval(countdownRef.current);
    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (countdownRef.current) clearInterval(countdownRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password !== confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }
    if (password.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres.");
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { nome },
      },
    });
    setLoading(false);
    if (error) {
      setError(traduzirErro(error.message));
      return;
    }
    if (data.session) {
      navigate({ to: "/onboarding" });
    } else {
      setEtapa("confirmar-email");
      startCountdown();
    }
  };

  const reenviar = async () => {
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
    });
    setLoading(false);
    if (error) {
      setError(traduzirErro(error.message));
      return;
    }
    startCountdown();
  };

  if (etapa === "confirmar-email") {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-background relative">
        <LanguageSwitcher className="absolute top-4 right-4" />
        <Card className="w-full max-w-sm p-6 space-y-6 rounded-2xl text-center">
          <div className="flex items-center gap-2 justify-center">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg">AI Health Coach</span>
          </div>
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary/15 flex items-center justify-center">
              <Mail className="w-8 h-8 text-primary" />
            </div>
            <div className="space-y-1">
              <h1 className="text-xl font-semibold">{t("signup.verificar_email")}</h1>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {t("signup.verificar_desc", { email })}
              </p>
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="space-y-3">
            <Button
              type="button"
              className="w-full"
              disabled={loading || countdown > 0}
              onClick={reenviar}
            >
              {loading ? t("signup.enviando") : countdown > 0 ? t("signup.reenviar_em", { s: countdown }) : t("signup.reenviar")}
            </Button>
            <p className="text-sm text-muted-foreground">
              <Link to="/login" className="text-primary font-medium">{t("signup.voltar_login")}</Link>
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background relative">
      <LanguageSwitcher className="absolute top-4 right-4" />
      <Card className="w-full max-w-sm p-6 space-y-5 rounded-2xl">
        <div className="flex items-center gap-2 justify-center">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-bold text-lg">AI Health Coach</span>
        </div>
        <div className="text-center">
          <h1 className="text-xl font-semibold">{t("signup.titulo")}</h1>
          <p className="text-sm text-muted-foreground">{t("signup.subtitulo")}</p>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="nome">{t("signup.nome")}</Label>
            <Input id="nome" required value={nome} onChange={(e) => setNome(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">{t("login.email")}</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">{t("login.senha")}</Label>
            <Input id="password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirm">{t("signup.confirmar_senha")}</Label>
            <Input id="confirm" type="password" required minLength={6} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? t("signup.criando") : t("signup.criar")}
          </Button>
        </form>
        <p className="text-sm text-center text-muted-foreground">
          {t("signup.ja_tem")}{" "}
          <Link to="/login" className="text-primary font-medium">{t("signup.entrar")}</Link>
        </p>
      </Card>
    </div>
  );
}
