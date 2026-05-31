import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <div className="text-6xl mb-4">🏋️</div>
        <h1 className="text-3xl font-bold text-foreground">Página não encontrada</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          A página que você procura não existe ou foi movida.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Voltar ao início
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "VitaIA — Coach de Nutrição e Treino com IA" },
      { name: "description", content: "VitaIA cria planos personalizados de nutrição, treino e hidratação com inteligência artificial para você atingir seus objetivos de saúde." },
      { name: "author", content: "VitaIA" },
      { property: "og:title", content: "VitaIA — Coach de Nutrição e Treino com IA" },
      { property: "og:description", content: "Planos personalizados de nutrição e treino gerados por IA, com acompanhamento diário." },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "VitaIA" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:site", content: "@Lovable" },
      { name: "twitter:title", content: "VitaIA — Coach de Nutrição e Treino com IA" },
      { name: "twitter:description", content: "Planos personalizados de nutrição e treino gerados por IA, com acompanhamento diário." },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/TI6pShJ7nVSN38OqYQYqhtVDcvu1/social-images/social-1778430823069-ChatGPT_Image_10_de_mai._de_2026,_13_33_34.webp" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/TI6pShJ7nVSN38OqYQYqhtVDcvu1/social-images/social-1778430823069-ChatGPT_Image_10_de_mai._de_2026,_13_33_34.webp" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "VitaIA",
          url: "https://ai-coach-buddy-88.lovable.app",
          description: "Coach de nutrição e treino baseado em inteligência artificial.",
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "VitaIA",
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
