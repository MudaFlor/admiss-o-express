// Gestão do link de acesso do candidato pelo RH: estado, renovação, cancelamento e lembrete.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { fail } from "@/lib/errors";
import { logAudit } from "@/lib/audit.server";

const LINK_DAYS = 7;

const idInput = (input: unknown) => z.object({ id: z.string().uuid() }).parse(input);

async function loadCandidateForHr(supabase: { from: typeof supabaseAdmin.from }, id: string) {
  // A leitura passa pelo cliente com RLS: garante que o usuário é RH/Admin.
  const { data, error } = await supabase
    .from("candidates")
    .select("id, full_name, phone, access_token, token_expires_at, token_revoked_at, token_rotated_at, last_reminder_at")
    .eq("id", id)
    .maybeSingle();
  if (error) fail(error);
  if (!data) throw new Error("Candidato não encontrado");
  return data;
}

export const getCandidateLinkState = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(idInput)
  .handler(async ({ data, context }) => {
    const row = await loadCandidateForHr(context.supabase as never, data.id);
    const now = Date.now();
    const expired = new Date(row.token_expires_at).getTime() < now;
    const revoked = !!row.token_revoked_at && new Date(row.token_revoked_at).getTime() <= now;
    return {
      token: revoked || expired ? null : row.access_token,
      expires_at: row.token_expires_at,
      revoked_at: row.token_revoked_at,
      rotated_at: row.token_rotated_at,
      last_reminder_at: row.last_reminder_at,
      status: revoked ? ("cancelado" as const) : expired ? ("expirado" as const) : ("ativo" as const),
      full_name: row.full_name,
      phone: row.phone,
    };
  });

export const rotateCandidateToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(idInput)
  .handler(async ({ data, context }) => {
    await loadCandidateForHr(context.supabase as never, data.id);
    const now = new Date();
    const expires = new Date(now.getTime() + LINK_DAYS * 24 * 60 * 60 * 1000);
    const { data: updated, error } = await supabaseAdmin
      .from("candidates")
      .update({
        access_token: crypto.randomUUID(),
        token_expires_at: expires.toISOString(),
        token_revoked_at: null,
        token_rotated_at: now.toISOString(),
      })
      .eq("id", data.id)
      .select("access_token, token_expires_at")
      .single();
    if (error) fail(error);
    await logAudit({
      actor_user_id: context.userId,
      action: "rotate_token",
      entity: "candidate",
      entity_id: data.id,
    });
    return { token: updated.access_token, expires_at: updated.token_expires_at };
  });

export const revokeCandidateToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(idInput)
  .handler(async ({ data, context }) => {
    await loadCandidateForHr(context.supabase as never, data.id);
    const { error } = await supabaseAdmin
      .from("candidates")
      .update({ token_revoked_at: new Date().toISOString() })
      .eq("id", data.id);
    if (error) fail(error);
    await logAudit({
      actor_user_id: context.userId,
      action: "revoke_token",
      entity: "candidate",
      entity_id: data.id,
    });
    return { ok: true };
  });

export const markReminderSent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(idInput)
  .handler(async ({ data, context }) => {
    await loadCandidateForHr(context.supabase as never, data.id);
    const now = new Date().toISOString();
    const { error } = await supabaseAdmin
      .from("candidates")
      .update({ last_reminder_at: now })
      .eq("id", data.id);
    if (error) fail(error);
    await supabaseAdmin.from("notifications").insert({
      candidate_id: data.id,
      event: "candidate.reminder_sent",
      payload: { by: context.userId },
    });
    await logAudit({
      actor_user_id: context.userId,
      action: "send_reminder",
      entity: "candidate",
      entity_id: data.id,
    });
    return { last_reminder_at: now };
  });
