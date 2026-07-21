// Server functions autenticadas para RH gerenciarem workflow de admissão.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { logAudit } from "@/lib/audit.server";

const STAGE_VALUES = [
  "cadastro_iniciado","aceite_lgpd","curriculo_enviado","documentos_enviados",
  "ocr_concluido","em_analise","pendencia_documental","correcao_solicitada",
  "aguardando_aprovacao","aprovado","admitido",
] as const;
const StageEnum = z.enum(STAGE_VALUES);

export const changeCandidateStage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      candidate_id: z.string().uuid(),
      stage: StageEnum,
      note: z.string().trim().max(500).optional(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { setStage } = await import("@/lib/workflow/stage.server");
    await setStage(data.candidate_id, data.stage, {
      actor_user_id: context.userId,
      note: data.note ?? null,
    });
    await logAudit({
      actor_user_id: context.userId,
      action: "edit_form",
      entity: "candidates",
      entity_id: data.candidate_id,
      metadata: { field: "stage", to: data.stage, note: data.note ?? null },
    });
    return { ok: true };
  });

export const listStageHistory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ candidate_id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("candidate_stage_history")
      .select("id, from_stage, to_stage, actor_user_id, note, created_at")
      .eq("candidate_id", data.candidate_id)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const listDocumentRequirements = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("document_requirements")
      .select("id, document_type, label, condition, is_active")
      .order("label", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const upsertDocumentRequirement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      id: z.string().uuid().optional(),
      document_type: z.string().min(2).max(60),
      label: z.string().trim().min(2).max(120),
      condition: z.record(z.string(), z.unknown()).default({}),
      is_active: z.boolean().default(true),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const payload = {
      document_type: data.document_type as never,
      label: data.label,
      condition: data.condition as never,
      is_active: data.is_active,
    };
    if (data.id) {
      const { error } = await context.supabase.from("document_requirements").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await context.supabase.from("document_requirements").insert(payload);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const deleteDocumentRequirement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("document_requirements").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listMessageTemplates = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("message_templates")
      .select("id, kind, channel, subject, body, is_active, updated_at")
      .order("kind", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const upsertMessageTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      id: z.string().uuid().optional(),
      kind: z.string().min(2).max(60),
      channel: z.enum(["whatsapp","email","both"]),
      subject: z.string().trim().max(200).optional().or(z.literal("")),
      body: z.string().trim().min(2).max(4000),
      is_active: z.boolean().default(true),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const payload = {
      kind: data.kind,
      channel: data.channel,
      subject: data.subject || null,
      body: data.body,
      is_active: data.is_active,
    };
    if (data.id) {
      const { error } = await context.supabase.from("message_templates").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await context.supabase.from("message_templates").insert(payload);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const composeCandidateMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      candidate_id: z.string().uuid(),
      kind: z.enum([
        "convite","solicitacao_documentos","pendencia","correcao",
        "aprovacao","reprovacao","confirmacao_recebimento",
      ]),
      channel: z.enum(["whatsapp","email"]),
      extra_vars: z.record(z.string(), z.string()).optional(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: cand, error } = await context.supabase
      .from("candidates")
      .select("id, full_name, phone, email, access_token")
      .eq("id", data.candidate_id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!cand) throw new Error("Candidato não encontrado");

    const origin = (globalThis as { location?: { origin?: string } }).location?.origin ?? "";
    const link = `${origin}/c/${cand.access_token}`;
    const vars: Record<string,string> = {
      nome: cand.full_name,
      link,
      ...(data.extra_vars ?? {}),
    };
    const { renderMessage, logMessage } = await import("@/lib/messaging/messaging.server");
    const rendered = await renderMessage(data.kind, data.channel, {
      vars,
      recipient: data.channel === "whatsapp" ? cand.phone : cand.email,
    });
    if (!rendered) throw new Error("Template não encontrado");
    const recipient = (data.channel === "whatsapp" ? cand.phone : cand.email) ?? "";
    await logMessage({
      candidate_id: cand.id,
      kind: data.kind,
      channel: data.channel,
      recipient,
      status: "preparado",
      sent_by: context.userId,
      payload: { subject: rendered.subject, body: rendered.body },
    });
    return { subject: rendered.subject, body: rendered.body, wa_link: rendered.waLink ?? null };
  });