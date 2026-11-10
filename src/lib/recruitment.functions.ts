import { createServerFn } from "@tanstack/react-start";
import { fail } from "@/lib/errors";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { logAudit } from "@/lib/audit.server";
import { resumeDocumentValues, validateResumePdf } from "@/lib/validation/resume-file";
import { candidateRegistrationDateSchema } from "@/lib/validation/candidate-registration-date";

export const parseCandidateFile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        filename: z.string().trim().min(1).max(255),
        base64: z.string().min(10).max(14_000_000),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { parseProfileFromFile } = await import("@/lib/ai/recruitment-parser.server");
    return parseProfileFromFile({ base64: data.base64, filename: data.filename });
  });

export const createCandidateFromProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        full_name: z.string().trim().min(2).max(160),
        data_cadastro: candidateRegistrationDateSchema,
        email: z.string().trim().max(255).optional().or(z.literal("")),
        phone: z.string().trim().max(40).optional().or(z.literal("")),
        position: z.string().trim().max(160).optional().or(z.literal("")),
        idade: z.string().trim().max(10).optional().or(z.literal("")),
        data_nascimento: z.string().trim().max(30).optional().or(z.literal("")),
        endereco: z.string().trim().max(500).optional().or(z.literal("")),
        resumo_experiencias: z.string().trim().max(5000).optional().or(z.literal("")),
        palavras_chave: z.array(z.string().trim().max(60)).max(30).default([]),
        resume: z.object({
          filename: z.string().trim().min(1).max(255),
          base64: z.string().min(10).max(14_000_000),
        }).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    let resumeBytes: Uint8Array | null = null;
    if (data.resume) {
      resumeBytes = new Uint8Array(Buffer.from(data.resume.base64, "base64"));
      const validationError = validateResumePdf(data.resume.filename, resumeBytes);
      if (validationError) throw new Error(validationError);
    }

    const { data: created, error } = await supabase
      .from("candidates")
      .insert({
        created_by: userId,
        full_name: data.full_name,
        data_cadastro: data.data_cadastro,
        email: data.email || null,
        phone: data.phone || null,
        position: data.position || null,
        form_data: {
          perfil_recrutamento: {
            idade: data.idade || null,
            data_nascimento: data.data_nascimento || null,
            endereco: data.endereco || null,
            resumo_experiencias: data.resumo_experiencias || null,
            palavras_chave: data.palavras_chave,
          },
        } as never,
      })
      .select("id, access_token, full_name, phone")
      .single();
    if (error) fail(error);

    let resumeDocumentId: string | null = null;
    if (data.resume && resumeBytes) {
      const storagePath = `${created.id}/curriculo-${crypto.randomUUID()}.pdf`;
      try {
        // O middleware já validou o usuário; o acesso privilegiado é necessário
        // apenas para gravar no bucket privado, que não aceita upload direto do RH.
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { error: uploadError } = await supabaseAdmin.storage
          .from("candidate-documents")
          .upload(storagePath, resumeBytes, { contentType: "application/pdf", upsert: false });
        if (uploadError) fail(uploadError);

        const { assertUploadedFileIsSafe } = await import("@/lib/security/storage.server");
        await assertUploadedFileIsSafe(storagePath);

        const { data: document, error: documentError } = await supabase
          .from("documents")
          .insert({
            candidate_id: created.id,
            type: "curriculo",
            storage_path: storagePath,
            label: data.resume.filename,
            status: "processado",
            ocr_data: {
              values: resumeDocumentValues({
                full_name: data.full_name,
                data_nascimento: data.data_nascimento,
                idade: data.idade,
                endereco: data.endereco,
                email: data.email,
                telefone: data.phone,
                cargo: data.position,
                resumo_experiencias: data.resumo_experiencias,
                palavras_chave: data.palavras_chave,
              }),
              confidences: {},
            } as never,
            ocr_confidence: null,
          })
          .select("id")
          .single();
        if (documentError) fail(documentError);
        resumeDocumentId = document.id;

        const { advanceStage } = await import("@/lib/workflow/stage.server");
        await advanceStage(created.id, "curriculo_enviado", {
          actor_user_id: userId,
          note: "Currículo em PDF anexado pelo RH",
        });
      } catch (attachmentError) {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        await supabaseAdmin.storage.from("candidate-documents").remove([storagePath]);
        await supabase.from("candidates").delete().eq("id", created.id);
        fail(attachmentError, "Não foi possível salvar o currículo. O cadastro não foi criado; tente novamente.");
      }
    }

    await logAudit({
      actor_user_id: userId,
      action: "edit_basics",
      entity: "candidates",
      entity_id: created.id,
      metadata: { origem: "recrutamento", criado: true, curriculo_anexado: Boolean(resumeDocumentId) },
    });
    return { ...created, resume_document_id: resumeDocumentId };
  });
