// Solicitação de correção ao candidato (RH) + geração da mensagem de aviso via WhatsApp.
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { logAudit } from "@/lib/audit.server";

const ItemSchema = z.object({ type: z.string().min(1).max(60), label: z.string().min(1).max(120) });

function originFromRequest(): string {
  const origin = getRequestHeader("origin");
  if (origin) return origin;
  const host = getRequestHeader("host");
  return host ? `https://${host}` : "";
}

export const requestCandidateCorrection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        candidate_id: z.string().uuid(),
        fields: z.array(z.string().min(1).max(60)).default([]),
        documents: z.array(ItemSchema).default([]),
        note: z.string().trim().max(800).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    if (data.fields.length === 0 && data.documents.length === 0 && !data.note) {
      throw new Error("Selecione ao menos um item ou escreva uma observação");
    }

    const { data: cand, error } = await context.supabase
      .from("candidates")
      .select("id, full_name, phone, access_token")
      .eq("id", data.candidate_id)
      .maybeSingle();
    if (error) fail(error);
    if (!cand) throw new Error("Candidato não encontrado");

    const { error: insErr } = await context.supabase.from("correction_requests").insert({
      candidate_id: cand.id,
      requested_by: context.userId,
      fields: data.fields as never,
      documents: data.documents as never,
      note: data.note ?? null,
      status: "aberta",
    });
    if (insErr) fail(insErr);

    const { setStage } = await import("@/lib/workflow/stage.server");
    await setStage(cand.id, "correcao_solicitada", {
      actor_user_id: context.userId,
      note: data.note ?? "Correção solicitada ao candidato",
    });

    const { CORRECTION_FIELD_LABEL } = await import("@/lib/corrections");
    const itens = [
      ...data.fields.map((f) => `• ${CORRECTION_FIELD_LABEL[f] ?? f}`),
      ...data.documents.map((d) => `• ${d.label} (reenviar arquivo)`),
    ].join("\n");

    const link = `${originFromRequest()}/c/${cand.access_token}`;
    const { renderMessage, logMessage } = await import("@/lib/messaging/messaging.server");
    const rendered = await renderMessage("correcao", "whatsapp", {
      vars: { nome: cand.full_name, itens, observacao: data.note ?? "", link },
      recipient: cand.phone,
    });

    const fallbackBody =
      `Olá ${cand.full_name}! Revisamos seu cadastro de admissão e precisamos de alguns ajustes:\n\n${itens}\n\n` +
      (data.note ? `${data.note}\n\n` : "") +
      `Acesse seu link para corrigir e reenviar:\n${link}`;

    const body = rendered?.body ?? fallbackBody;
    const { buildWhatsAppLink } = await import("@/lib/integrations/whatsapp");
    const waLink = buildWhatsAppLink(cand.phone, body);

    await logMessage({
      candidate_id: cand.id,
      kind: "correcao",
      channel: "whatsapp",
      recipient: cand.phone ?? "",
      status: "preparado",
      sent_by: context.userId,
      payload: { body },
    });

    await logAudit({
      actor_user_id: context.userId,
      action: "edit_form",
      entity: "candidates",
      entity_id: cand.id,
      metadata: { correction: { fields: data.fields, documents: data.documents } },
    });

    return { body, wa_link: waLink, link };
  });

export const listCorrectionRequests = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ candidate_id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("correction_requests")
      .select("id, candidate_id, fields, documents, note, status, created_at, resolved_at")
      .eq("candidate_id", data.candidate_id)
      .order("created_at", { ascending: false });
    if (error) fail(error);
    return rows ?? [];
  });

export const resolveCorrectionRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("correction_requests")
      .update({ status: "resolvida", resolved_at: new Date().toISOString() })
      .eq("id", data.id);
    if (error) fail(error);
    return { ok: true };
  });
