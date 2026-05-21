import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { getMyDataFn } from "@/lib/userdata.functions";
import { LoadingPlano } from "@/components/LoadingPlano";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const navigate = useNavigate();
  const fetchData = useServerFn(getMyDataFn);
  const hydrateFromServer = useStore((s) => s.hydrateFromServer);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        navigate({ to: "/login" });
        return;
      }
      try {
        const r = await fetchData();
        hydrateFromServer({
          dados: (r.dados as Parameters<typeof hydrateFromServer>[0]["dados"]) ?? null,
          plano: (r.plano as Parameters<typeof hydrateFromServer>[0]["plano"]) ?? null,
        });
        navigate({ to: r.plano ? "/dashboard" : "/onboarding" });
      } catch {
        navigate({ to: "/onboarding" });
      }
    })();
  }, [navigate, fetchData, hydrateFromServer]);

  return <LoadingPlano mensagem="Carregando seu plano..." />;
}
