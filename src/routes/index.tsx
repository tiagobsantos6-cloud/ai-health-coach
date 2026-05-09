import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const navigate = useNavigate();
  const plano = useStore((s) => s.plano);
  useEffect(() => {
    navigate({ to: plano ? "/dashboard" : "/onboarding" });
  }, [plano, navigate]);
  return null;
}
