import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  createRootRouteWithContext,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  const { i18n } = useTranslation();
  const lang = i18n.language;
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 p-8 bg-background text-foreground">
      <div className="text-6xl">🏋️</div>
      <h1 className="text-2xl font-bold">
        {lang === "en" ? "Page not found" : "Página não encontrada"}
      </h1>
      <p className="text-muted-foreground text-center">
        {lang === "en"
          ? "The page you are looking for does not exist or has been moved."
          : "A página que você procura não existe ou foi movida."}
      </p>
      <a href="/" className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-medium">
        {lang === "en" ? "Back to home" : "Voltar ao início"}
      </a>
    </div>
  );
}

function ErrorComponent({ error }: { error: Error; reset: () => void }) {
  console.error(error);
  const { i18n } = useTranslation();
  const lang = i18n.language;
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 p-8 bg-background text-foreground">
      <div className="text-6xl">⚠️</div>
      <h1 className="text-2xl font-bold">
        {lang === "en" ? "Something went wrong" : "Algo deu errado"}
      </h1>
      <p className="text-muted-foreground text-center">
        {lang === "en"
          ? "An unexpected error occurred. Please try again."
          : "Ocorreu um erro inesperado. Por favor, tente novamente."}
      </p>
      <a href="/" className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-medium">
        {lang === "en" ? "Back to home" : "Voltar ao início"}
      </a>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "AI Health Coach — Coach de Nutrição e Treino com IA" },
      { name: "description", content: "AI Health Coach cria planos personalizados de nutrição, treino e hidratação com inteligência artificial para você atingir seus objetivos de saúde." },
      { name: "author", content: "AI Health Coach" },
      { property: "og:title", content: "AI Health Coach — Coach de Nutrição e Treino com IA" },
      { property: "og:description", content: "Planos personalizados de nutrição e treino gerados por IA, com acompanhamento diário." },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "AI Health Coach" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:site", content: "@Lovable" },
      { name: "twitter:title", content: "AI Health Coach — Coach de Nutrição e Treino com IA" },
      { name: "twitter:description", content: "Planos personalizados de nutrição e treino gerados por IA, com acompanhamento diário." },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/TI6pShJ7nVSN38OqYQYqhtVDcvu1/social-images/social-1778430823069-ChatGPT_Image_10_de_mai._de_2026,_13_33_34.webp" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/TI6pShJ7nVSN38OqYQYqhtVDcvu1/social-images/social-1778430823069-ChatGPT_Image_10_de_mai._de_2026,_13_33_34.webp" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "AI Health Coach",
          url: "https://ai-coach-buddy-88.lovable.app",
          description: "Coach de nutrição e treino baseado em inteligência artificial.",
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "AI Health Coach",
          url: "https://ai-coach-buddy-88.lovable.app",
          description: "Planos personalizados de nutrição e treino gerados por IA.",
        }),
      },
    ],

  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
    </QueryClientProvider>
  );
}
