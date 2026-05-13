import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { isValidCpf, normalizeCpf } from "@/lib/cpf";
import { runOcr } from "@/lib/ocr/provider";
import type { Database } from "@/integrations/supabase/types";

type DocType = Database["public"]["Enums"]["document_type"];
const DOC_TYPES: readonly DocType[] = ["rg", "cpf", "cnh", "comprovante_residencia"] as const;

async function loadByToken(token: string) {
  const { data, error } = await supabaseAdmin
    .from("candidates")
    .select("*")
    .eq("access_token", token)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Link inválido");
  if (new Date(data.token_expires_at) < new Date()) throw new Error("Link expirado");
  return data;
}

export const getCandidateByToken = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ token: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const candidate = await loadByToken(data.token);
    const { data: documents } = await supabaseAdmin
      .from("documents")
      .select("id, type, status, ocr_data, ocr_confidence, uploaded_at")
      .eq("candidate_id", candidate.id);

    return {
      candidate: {
        id: candidate.id,
        full_name: candidate.full_name,
        cpf: candidate.cpf,
        email: candidate.email,
        phone: candidate.phone,
        position: candidate.position,
        status: candidate.status,
        form_data: candidate.form_data,
      },
      documents: documents ?? [],
    };
  });

export const updateCandidateBasics = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        token: z.string().uuid(),
        full_name: z.string().trim().min(2).max(120),
        cpf: z.string().trim().min(11).max(20),
        email: z.string().trim().email().max(255).optional().or(z.literal("")),
        phone: z.string().trim().max(20).optional().or(z.literal("")),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const candidate = await loadByToken(data.token);
    const cpf = normalizeCpf(data.cpf);
    if (!isValidCpf(cpf)) throw new Error("CPF inválido");
    const { error } = await supabaseAdmin
      .from("candidates")
      .update({
        full_name: data.full_name,
        cpf,
        email: data.email || null,
        phone: data.phone || null,
        status: candidate.status === "pendente" ? "em_analise" : candidate.status,
      })
      .eq("id", candidate.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const createDocumentUploadUrl = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        token: z.string().uuid(),
        type: z.enum(["rg", "cpf", "cnh", "comprovante_residencia"]),
        ext: z.string().regex(/^[a-z0-9]{1,5}$/i),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const candidate = await loadByToken(data.token);
    const path = `${candidate.id}/${data.type}-${crypto.randomUUID()}.${data.ext.toLowerCase()}`;
    const { data: signed, error } = await supabaseAdmin.storage
      .from("candidate-documents")
      .createSignedUploadUrl(path);
    if (error || !signed) throw new Error(error?.message ?? "Falha ao gerar upload");
    return { path, token: signed.token, signedUrl: signed.signedUrl };
  });

export const finalizeDocumentUpload = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        token: z.string().uuid(),
        type: z.enum(["rg", "cpf", "cnh", "comprovante_residencia"]),
        storage_path: z.string().min(3).max(300),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const candidate = await loadByToken(data.token);
    // Run mock OCR
    const ocr = await runOcr(data.type, data.storage_path);

    // Replace any existing document of same type for this candidate
    await supabaseAdmin
      .from("documents")
      .delete()
      .eq("candidate_id", candidate.id)
      .eq("type", data.type);

    const { data: doc, error } = await supabaseAdmin
      .from("documents")
      .insert({
        candidate_id: candidate.id,
        type: data.type,
        storage_path: data.storage_path,
        ocr_data: ocr.fields,
        ocr_confidence: ocr.confidence,
        status: "pendente",
      })
      .select("id, type, ocr_data, ocr_confidence, status")
      .single();
    if (error) throw new Error(error.message);

    if (candidate.status === "pendente") {
      await supabaseAdmin
        .from("candidates")
        .update({ status: "em_analise" })
        .eq("id", candidate.id);
    }

    return doc;
  });

export const submitCandidateApplication = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        token: z.string().uuid(),
        form_data: z.record(z.string(), z.unknown()),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const candidate = await loadByToken(data.token);

    // Ensure all 4 documents uploaded
    const { data: docs } = await supabaseAdmin
      .from("documents")
      .select("type")
      .eq("candidate_id", candidate.id);
    const present = new Set((docs ?? []).map((d) => d.type));
    const missing = DOC_TYPES.filter((t) => !present.has(t));
    if (missing.length) throw new Error(`Faltam documentos: ${missing.join(", ")}`);

    const { error } = await supabaseAdmin
      .from("candidates")
      .update({ form_data: data.form_data as never, status: "em_analise" })
      .eq("id", candidate.id);
    if (error) throw new Error(error.message);

    await supabaseAdmin.from("notifications").insert({
      candidate_id: candidate.id,
      event: "candidate.submitted",
      payload: {},
    });

    return { ok: true };
  });