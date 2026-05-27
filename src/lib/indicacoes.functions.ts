import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { attachSupabaseAuth } from "@/integrations/supabase/auth-header.middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const registrarIndicacaoFn = createServerFn({ method: "POST" })
  .middleware([attachSupabaseAuth, requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ ref: z.string().min(4).max(16).regex(/^[a-f0-9-]+$/i) }).parse(input)
  )
  .handler(async ({ data, context }) => {
    const indicadoId = context.userId;
    const code = data.ref.toLowerCase().replace(/-/g, "").slice(0, 8);
    if (!code || code.length < 8) return { ok: false, reason: "invalid_code" };

    // Already registered?
    const { data: existing } = await supabaseAdmin
      .from("indicacoes")
      .select("id")
      .eq("indicado_id", indicadoId)
      .maybeSingle();
    if (existing) return { ok: false, reason: "already_registered" };

    // Find indicador by first 8 chars of user_id (via profiles).
    const { data: profiles, error: pErr } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .ilike("id", `${code}%`)
      .limit(2);
    if (pErr) {
      console.error("[indicacoes] profiles lookup error", pErr);
      return { ok: false, reason: "lookup_error" };
    }
    if (!profiles || profiles.length === 0) return { ok: false, reason: "not_found" };
    if (profiles.length > 1) return { ok: false, reason: "ambiguous" };
    const indicadorId = profiles[0].id as string;
    if (indicadorId === indicadoId) return { ok: false, reason: "self" };

    // Insert indicação.
    const { error: insErr } = await supabaseAdmin
      .from("indicacoes")
      .insert({ indicador_id: indicadorId, indicado_id: indicadoId });
    if (insErr) {
      console.error("[indicacoes] insert error", insErr);
      return { ok: false, reason: "insert_error" };
    }

    // Add 7 days to indicador's bonus_ate.
    const { data: sub } = await supabaseAdmin
      .from("subscriptions")
      .select("bonus_ate")
      .eq("user_id", indicadorId)
      .maybeSingle();
    const base =
      sub?.bonus_ate && new Date(sub.bonus_ate as string).getTime() > Date.now()
        ? new Date(sub.bonus_ate as string)
        : new Date();
    const novo = new Date(base.getTime() + 7 * 24 * 60 * 60 * 1000);
    const { error: upErr } = await supabaseAdmin
      .from("subscriptions")
      .update({ bonus_ate: novo.toISOString() })
      .eq("user_id", indicadorId);
    if (upErr) console.error("[indicacoes] bonus update error", upErr);

    return { ok: true };
  });

export const contarIndicacoesFn = createServerFn({ method: "GET" })
  .middleware([attachSupabaseAuth, requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { count, error } = await context.supabase
      .from("indicacoes")
      .select("id", { count: "exact", head: true })
      .eq("indicador_id", context.userId);
    if (error) {
      console.error("[indicacoes] count error", error);
      return { count: 0 };
    }
    return { count: count ?? 0 };
  });
