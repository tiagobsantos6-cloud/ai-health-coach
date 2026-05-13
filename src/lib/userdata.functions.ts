import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { attachSupabaseAuth } from "@/integrations/supabase/auth-header.middleware";

export const getMyDataFn = createServerFn({ method: "GET" })
  .middleware([attachSupabaseAuth, requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("user_data")
      .select("dados, plano")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) {
      console.error("[user_data] read error", error);
      throw new Error("Não foi possível carregar seus dados.");
    }
    return { dados: data?.dados ?? null, plano: data?.plano ?? null };
  });

const payloadSchema = z.object({
  dados: z.unknown().nullable().optional(),
  plano: z.unknown().nullable().optional(),
});

export const saveMyDataFn = createServerFn({ method: "POST" })
  .middleware([attachSupabaseAuth, requireSupabaseAuth])
  .inputValidator((input: unknown) => payloadSchema.parse(input))
  .handler(async ({ data, context }) => {
    const row: Record<string, unknown> = { user_id: context.userId };
    if (data.dados !== undefined) row.dados = data.dados;
    if (data.plano !== undefined) row.plano = data.plano;
    const { error } = await context.supabase
      .from("user_data")
      .upsert(row, { onConflict: "user_id" });
    if (error) {
      console.error("[user_data] write error", error);
      throw new Error("Não foi possível salvar seus dados.");
    }
    return { ok: true };
  });
