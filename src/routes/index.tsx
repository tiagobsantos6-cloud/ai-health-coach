import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { getMyDataFn } from "@/lib/userdata.functions";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const navigate = useNavigate();
  const fetchData = useServerFn(getMyDataFn);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        navigate({ to: "/login" });
        return;
      }
      try {
        const r = await fetchData();
        navigate({ to: r.plano ? "/dashboard" : "/onboarding" });
      } catch {
        navigate({ to: "/onboarding" });
      }
    })();
  }, [navigate, fetchData]);

  return null;
}
