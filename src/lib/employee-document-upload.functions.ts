import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { isAllowedExtension, validateFile } from "@/lib/upload-rules";
import { validateResumeFile } from "@/lib/validation/resume-file";
import { fail } from "@/lib/errors";

async function authorize(supabase: SupabaseClient<Database>, userId: string, employeeId: string) {
  const { data: hr, error: roleError } = await supabase.rpc("is_hr", { _user_id: userId });
  if (roleError || !hr) throw new Error("Apenas RH pode anexar documentos de colaboradores.");
  const { data: employee, error } = await supabase.from("employees").select("id").eq("id", employeeId).maybeSingle();
  if (error) fail(error);
  if (!employee) throw new Error("Colaborador não encontrado.");
}

export const createEmployeeDocumentUploadUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ employee_id: z.string().uuid(), ext: z.string().max(5) }).parse(input))
  .handler(async ({ data, context }) => {
    await authorize(context.supabase, context.userId, data.employee_id);
    const ext = data.ext.toLowerCase();
    if (!isAllowedExtension(ext)) throw new Error("Formato não aceito. Envie apenas PDF, JPG ou PNG.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const path = `employees/${data.employee_id}/${crypto.randomUUID()}.${ext}`;
    const { data: signed, error } = await supabaseAdmin.storage.from("candidate-documents").createSignedUploadUrl(path);
    if (error || !signed) throw new Error("Não foi possível preparar o upload.");
    return { path, token: signed.token };
  });

export const finalizeEmployeeDocumentUpload = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({
    employee_id: z.string().uuid(), storage_path: z.string().max(300), label: z.string().trim().min(1).max(200),
  }).refine((data) => {
    const prefix = `employees/${data.employee_id}/`;
    return data.storage_path.startsWith(prefix) && /^[0-9a-f-]{36}\.(pdf|jpg|jpeg|png)$/.test(data.storage_path.slice(prefix.length));
  }, "Caminho de documento inválido.").parse(input))
  .handler(async ({ data, context }) => {
    await authorize(context.supabase, context.userId, data.employee_id);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const bucket = supabaseAdmin.storage.from("candidate-documents");
    const { data: existing, error: existingError } = await context.supabase.from("employee_documents")
      .select("id").eq("employee_id", data.employee_id).eq("storage_path", data.storage_path).maybeSingle();
    if (existingError) fail(existingError);
    if (existing) return { id: existing.id };
    const { assertUploadedFileIsSafe } = await import("@/lib/security/storage.server");
    await assertUploadedFileIsSafe(data.storage_path);
    const { data: file, error: downloadError } = await bucket.download(data.storage_path);
    if (downloadError || !file) throw new Error("Arquivo não encontrado. Envie novamente.");
    const invalid = validateFile({ name: data.storage_path, size: file.size, type: file.type });
    const signatureError = invalid ? null : validateResumeFile(data.storage_path, new Uint8Array(await file.arrayBuffer()));
    if (invalid || signatureError) {
      await bucket.remove([data.storage_path]);
      throw new Error(invalid || "O conteúdo do arquivo não corresponde ao formato informado.");
    }
    const { data: doc, error } = await context.supabase.from("employee_documents").insert({
      employee_id: data.employee_id, storage_path: data.storage_path, label: data.label, type: "outro", source: "RH",
    }).select("id").single();
    if (error || !doc) {
      if (error) fail(error);
      throw new Error("Não foi possível salvar o documento.");
    }
    await context.supabase.from("employee_history").insert({
      employee_id: data.employee_id, kind: "outro", description: `Documento anexado pelo RH: ${data.label}`, actor_user_id: context.userId,
    });
    const { logAudit } = await import("@/lib/audit.server");
    await logAudit({ actor_user_id: context.userId, action: "hr_upload_doc", entity: "employee_documents", entity_id: doc.id, metadata: { employee_id: data.employee_id } });
    return { id: doc.id };
  });