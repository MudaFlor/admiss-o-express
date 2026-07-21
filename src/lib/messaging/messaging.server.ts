// Camada de mensageria: resolve template, aplica variáveis e registra log.
// Envio de WhatsApp continua via wa.me (link). Envio real (Cloud API/Resend) pode ser plugado depois.
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { buildWhatsAppLink } from "@/lib/integrations/whatsapp";

export type TemplateKind =
  | "convite"
  | "solicitacao_documentos"
  | "pendencia"
  | "correcao"
  | "aprovacao"
  | "reprovacao"
  | "confirmacao_recebimento";

export type Channel = "whatsapp" | "email";

export interface TemplateRow {
  id: string;
  kind: string;
  channel: string;
  subject: string | null;
  body: string;
}

function interpolate(text: string, vars: Record<string, string | undefined>): string {
  return text.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_m, key: string) => vars[key] ?? "");
}

export async function loadTemplate(kind: TemplateKind, channel: Channel): Promise<TemplateRow | null> {
  const { data } = await supabaseAdmin
    .from("message_templates")
    .select("id, kind, channel, subject, body")
    .eq("kind", kind)
    .in("channel", [channel, "both"])
    .eq("is_active", true)
    .limit(1);
  return (data?.[0] as TemplateRow | undefined) ?? null;
}

export interface RenderedMessage {
  subject: string | null;
  body: string;
  waLink?: string;
}

export async function renderMessage(
  kind: TemplateKind,
  channel: Channel,
  opts: { vars: Record<string, string | undefined>; recipient?: string | null },
): Promise<RenderedMessage | null> {
  const tpl = await loadTemplate(kind, channel);
  if (!tpl) return null;
  const body = interpolate(tpl.body, opts.vars);
  const subject = tpl.subject ? interpolate(tpl.subject, opts.vars) : null;
  const waLink = channel === "whatsapp" ? buildWhatsAppLink(opts.recipient ?? null, body) : undefined;
  return { subject, body, waLink };
}

export async function logMessage(params: {
  candidate_id: string | null;
  kind: TemplateKind;
  channel: Channel;
  recipient: string;
  status?: "enviado" | "falha" | "preparado";
  error?: string | null;
  payload?: Record<string, unknown>;
  sent_by?: string | null;
}): Promise<void> {
  try {
    await supabaseAdmin.from("messages_log").insert({
      candidate_id: params.candidate_id,
      kind: params.kind,
      channel: params.channel,
      recipient: params.recipient,
      status: params.status ?? "enviado",
      error: params.error ?? null,
      payload: (params.payload ?? {}) as never,
      sent_by: params.sent_by ?? null,
    });
  } catch (e) {
    console.error("[messaging] log failed", e);
  }
}