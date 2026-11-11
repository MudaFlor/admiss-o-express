import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { fail } from "@/lib/errors";
import { logAudit } from "@/lib/audit.server";
import { isAllowedExtension } from "@/lib/upload-rules";

// Tipos de documento que o RH pode anexar em nome do candidato (titular).
export const HR_UPLOAD_TYPES = [
  "rg", "cpf", "cnh", "ctps", "titulo_eleitor", "foto_3x4", "certidao",
  "reservista", "pis_pasep", "comprovante_residencia", "escolaridade",
  "certificado_curso", "vacinacao_covid", "cartao_sus",
] as const;
const MULTI = new Set<string>(["certificado_curso", "vacinacao_covid"]);
const TypeEnum = z.enum(HR_UPLOAD_TYPES);

async function assertHr(supabase: any, userId: string, candidateId: string) {
  const { data: isHr } = await supabase.rpc("is_hr", { _user_id: userId });
  if (!isHr) throw new Error("Apenas RH pode realizar esta ação.");
  const { count } = await supabase.from("candidates").select("id", { count: "exact", head: true }).eq("id", candidateId);
  if (!count) throw new Error("Candidato não encontrado");
}

export const createHrDocumentUploadUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ candidate_id: z.string().uuid(), type: TypeEnum, ext: z.string().regex(/^[a-z0-9]{1,5}$/i) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertHr(context.supabase, context.userId, data.candidate_id);
    const ext = data.ext.toLowerCase();
    if (!isAllowedExtension(ext)) throw new Error("Formato não aceito. Envie apenas PDF, JPG ou PNG.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const path = `${data.candidate_id}/${data.type}-${crypto.randomUUID()}.${ext}`;
    const { data: signed, error } = await supabaseAdmin.storage.from("candidate-documents").createSignedUploadUrl(path);
    if (error || !signed) throw new Error("Falha ao preparar o envio");
    return { path, token: signed.token };
  });

export const finalizeHrDocumentUpload = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ candidate_id: z.string().uuid(), type: TypeEnum, storage_path: z.string().min(3).max(300) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertHr(context.supabase, context.userId, data.candidate_id);
    if (!data.storage_path.startsWith(`${data.candidate_id}/`) || data.storage_path.includes("..")) {
      throw new Error("Caminho inválido");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { assertUploadedFileIsSafe } = await import("@/lib/security/storage.server");
    const { runOcr } = await import("@/lib/ocr/provider.server");
    const { isIllegible, ILLEGIBLE_MESSAGE, isCtpsDigital, CTPS_DIGITAL_MESSAGE } = await import("@/lib/ocr/legibility");
    const { advanceStage } = await import("@/lib/workflow/stage.server");
    await assertUploadedFileIsSafe(data.storage_path);

    let ocr;
    try {
      ocr = await runOcr(data.type, data.storage_path);
    } catch {
      throw new Error("Não foi possível analisar o documento agora, tente novamente em instantes.");
    }
    if (isIllegible(data.type, ocr)) {
      await supabaseAdmin.storage.from("candidate-documents").remove([data.storage_path]);
      throw new Error(ILLEGIBLE_MESSAGE);
    }
    if (data.type === "ctps" && !isCtpsDigital(ocr.fields)) {
      await supabaseAdmin.storage.from("candidate-documents").remove([data.storage_path]);
      throw new Error(CTPS_DIGITAL_MESSAGE);
    }
    if (!MULTI.has(data.type)) {
      await supabaseAdmin.from("documents").delete()
        .eq("candidate_id", data.candidate_id).eq("type", data.type).is("dependent_id", null);
    }
    const { data: doc, error } = await supabaseAdmin.from("documents").insert({
      candidate_id: data.candidate_id,
      type: data.type,
      storage_path: data.storage_path,
      ocr_data: { values: ocr.fields, confidences: ocr.field_confidences ?? {}, evidences: ocr.evidences ?? {} } as never,
      ocr_confidence: ocr.confidence,
      status: "pendente",
      label: "Enviado pelo RH",
    }).select("id").single();
    if (error) fail(error);

    await advanceStage(data.candidate_id, "documentos_enviados", { note: `Documento anexado pelo RH: ${data.type}` });
    if (ocr.status === "sucesso" && Object.keys(ocr.fields).length > 0) {
      await advanceStage(data.candidate_id, "ocr_concluido", { note: `OCR concluído: ${data.type}` });
    }
    await logAudit({ actor_user_id: context.userId, action: "hr_upload_doc", entity: "document", entity_id: doc!.id, metadata: { type: data.type } });
    return { id: doc!.id, fields: Object.keys(ocr.fields).length };
  });
