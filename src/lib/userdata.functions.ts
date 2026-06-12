import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { attachSupabaseAuth } from "@/integrations/supabase/auth-header.middleware";

export const getMyDataFn = createServerFn({ method: "GET" })
  .middleware([attachSupabaseAuth, requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("user_data")
      .select("dados, plano, updated_at")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) {
      console.error("[user_data] read error", error);
      throw new Error("Não foi possível carregar seus dados.");
    }
    return { dados: data?.dados ?? null, plano: data?.plano ?? null, updatedAt: data?.updated_at ?? null };
  });

const MAX_PAYLOAD_BYTES = 512_000; // 512 KB total across dados + plano

const payloadSchema = z
  .object({
    dados: z.unknown().nullable().optional(),
    plano: z.unknown().nullable().optional(),
  })
  .refine(
    (val) => {
      try {
        const size =
          JSON.stringify(val.dados ?? null).length +
          JSON.stringify(val.plano ?? null).length;
        return size <= MAX_PAYLOAD_BYTES;
      } catch {
        return false;
      }
    },
    { message: "Payload muito grande. Limite de 512KB." }
  );

export const saveMyDataFn = createServerFn({ method: "POST" })
  .middleware([attachSupabaseAuth, requireSupabaseAuth])
  .inputValidator((input: unknown) => payloadSchema.parse(input))
  .handler(async ({ data, context }) => {
    const row = {
      user_id: context.userId,
      dados: (data.dados ?? null) as never,
      plano: (data.plano ?? null) as never,
    };
    const { error } = await context.supabase
      .from("user_data")
      .upsert(row, { onConflict: "user_id" });
    if (error) {
      console.error("[user_data] write error", error);
      throw new Error("Não foi possível salvar seus dados.");
    }
    return { ok: true };
  });

export const getMyIndicacoesCountFn = createServerFn({ method: "GET" })
  .middleware([attachSupabaseAuth, requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { count, error } = await context.supabase
      .from("indicacoes")
      .select("*", { count: "exact", head: true })
      .eq("indicador_id", context.userId);
    if (error) {
      console.error("[indicacoes] count error", error);
      return { count: 0 };
    }
    return { count: count ?? 0 };
  });

