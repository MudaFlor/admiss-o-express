import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { fail } from "@/lib/errors";

/**
 * Gera um link assinado e temporário (15 min) para o comprovante de aceite LGPD.
 * Só RH/Admin pode gerar; o comprovante em si valida a assinatura.
 */
export const getConsentReceiptUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ consentId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Autorização: precisa enxergar o consentimento pelas políticas do banco (RH/Admin).
    const { data: consent, error } = await supabase
      .from("lgpd_consents")
      .select("id, candidate_id")
      .eq("id", data.consentId)
      .maybeSingle();
    if (error) fail(error, "Não foi possível gerar o comprovante.");
    if (!consent) throw new Error("Comprovante não encontrado ou sem permissão de acesso.");

    const { signedReceiptQuery } = await import("@/lib/security/signing.server");
    const { logAudit } = await import("@/lib/audit.server");
    const query = await signedReceiptQuery(consent.id);

    await logAudit({
      actor_user_id: userId,
      action: "download_receipt",
      entity: "lgpd_consents",
      entity_id: consent.id,
      metadata: { candidate_id: consent.candidate_id },
    });

    return { url: `/api/consent-receipt/${consent.id}?${query}` };
  });
