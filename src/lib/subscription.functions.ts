import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { attachSupabaseAuth } from "@/integrations/supabase/auth-header.middleware";

export const getMyTierFn = createServerFn({ method: "GET" })
  .middleware([attachSupabaseAuth, requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("subscriptions")
      .select("tier")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) {
      console.error("[subscription] read error", error);
      throw new Error("Erro ao carregar assinatura.");
    }
    return { tier: (data?.tier ?? "gratuito") as "gratuito" | "basico" | "intermediario" | "completo" };
  });
