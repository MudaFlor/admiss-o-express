import { getRequestHeader, getRequestIP } from "@tanstack/react-start/server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type AuditAction =
  | "view_candidate"
  | "edit_basics"
  | "edit_form"
  | "edit_ocr"
  | "approve"
  | "reject"
  | "reopen"
  | "soft_delete_doc"
  | "restore_doc"
  | "purge_doc"
  | "export"
  | "view_lgpd_consent"
  | "download_receipt";

export async function logAudit(params: {
  actor_user_id: string;
  action: AuditAction;
  entity: string;
  entity_id?: string | null;
  metadata?: Record<string, unknown>;
  actor_role?: string | null;
}): Promise<void> {
  try {
    const ip = getRequestIP({ xForwardedFor: true }) ?? null;
    const ua = getRequestHeader("user-agent") ?? null;
    await supabaseAdmin.from("audit_logs").insert({
      actor_user_id: params.actor_user_id,
      actor_role: params.actor_role ?? null,
      action: params.action,
      entity: params.entity,
      entity_id: params.entity_id ?? null,
      metadata: (params.metadata ?? {}) as never,
      ip_address: ip,
      user_agent: ua,
    });
  } catch (e) {
    // Auditoria nunca deve derrubar a operação principal
    console.error("[audit] failed to log", e);
  }
}