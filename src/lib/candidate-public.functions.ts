import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader, getRequestIP } from "@tanstack/react-start/server";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { isValidCpf, normalizeCpf } from "@/lib/cpf";
import { runOcr } from "@/lib/ocr/provider.server";
import { parseResumeFromStorage } from "@/lib/ai/resume-parser.server";
import { LGPD_TERMS_TEXT, LGPD_TERMS_VERSION, hashTerms } from "@/lib/lgpd/terms";
import { assertRateLimit } from "@/lib/rate-limit.server";
import type { Database } from "@/integrations/supabase/types";

function clientIp(): string {
  return getRequestIP({ xForwardedFor: true }) ?? "unknown";
}
// Limites por IP para bloquear brute-force de tokens no portal público.
const LIMIT_READ = { limit: 60, windowMs: 60_000 };      // 60 leituras/min
const LIMIT_WRITE = { limit: 30, windowMs: 60_000 };     // 30 gravações/min
const LIMIT_UPLOAD = { limit: 20, windowMs: 60_000 };    // 20 uploads/min
const LIMIT_CONSENT = { limit: 5, windowMs: 60_000 };    // 5 tentativas de assinatura/min

type DocType = Database["public"]["Enums"]["document_type"];

const ALL_DOC_TYPES: readonly DocType[] = [
  "rg", "cpf", "cnh", "ctps", "titulo_eleitor", "foto_3x4", "certidao",
  "reservista", "pis_pasep", "comprovante_residencia", "escolaridade",
  "certificado_curso", "vacinacao_covid", "cartao_sus", "curriculo",
  "dependente_certidao", "dependente_rg_cpf", "dependente_vacinacao", "dependente_escolar",
] as const;
const DocTypeEnum = z.enum(ALL_DOC_TYPES as unknown as [DocType, ...DocType[]]);

// Documentos do titular obrigatórios. Reservista é exigido só quando sexo = masculino (validado em submit).
const REQUIRED_HOLDER_DOCS: readonly DocType[] = [
  "rg", "cpf", "ctps", "titulo_eleitor", "foto_3x4", "certidao",
  "pis_pasep", "comprovante_residencia", "escolaridade",
];
// Tipos que aceitam múltiplos arquivos (cursos, vacinação extra).
const MULTI_FILE_TYPES: ReadonlySet<DocType> = new Set<DocType>([
  "certificado_curso", "vacinacao_covid",
  "dependente_certidao", "dependente_rg_cpf", "dependente_vacinacao", "dependente_escolar",
]);

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

function requireConsent(candidate: { lgpd_accepted_at: string | null; deletion_requested_at: string | null }) {
  if (candidate.deletion_requested_at) throw new Error("Cadastro encerrado a pedido do candidato");
  if (!candidate.lgpd_accepted_at) throw new Error("Aceite do termo LGPD obrigatório");
}

export const getCandidateByToken = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ token: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const candidate = await loadByToken(data.token);
    const { data: documents } = await supabaseAdmin
      .from("documents")
      .select("id, type, status, storage_path, ocr_data, ocr_confidence, uploaded_at, dependent_id, label")
      .eq("candidate_id", candidate.id)
      .is("deleted_at", null);

    const docsWithUrls = await Promise.all(
      (documents ?? []).map(async (d) => {
        const { data: signed } = await supabaseAdmin.storage
          .from("candidate-documents")
          .createSignedUrl(d.storage_path, 60 * 10);
        return { ...d, signed_url: signed?.signedUrl ?? null };
      }),
    );

    const { data: dependents } = await supabaseAdmin
      .from("dependents")
      .select("*")
      .eq("candidate_id", candidate.id)
      .order("created_at", { ascending: true });

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
        sexo: candidate.sexo,
        cor_raca: candidate.cor_raca,
        estado_civil: candidate.estado_civil,
        lgpd_accepted_at: candidate.lgpd_accepted_at,
        deletion_requested_at: candidate.deletion_requested_at,
      },
      documents: docsWithUrls,
      dependents: dependents ?? [],
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
    requireConsent(candidate);
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
        type: DocTypeEnum,
        ext: z.string().regex(/^[a-z0-9]{1,5}$/i),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const candidate = await loadByToken(data.token);
    requireConsent(candidate);
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
        type: DocTypeEnum,
        storage_path: z.string().min(3).max(300),
        dependent_id: z.string().uuid().optional(),
        label: z.string().trim().max(120).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const candidate = await loadByToken(data.token);
    requireConsent(candidate);
    // Run OCR (no-op para tipos sem extração)
    const ocr = await runOcr(data.type, data.storage_path);

    // Tipos single-file: substitui o anterior. Multi-file: mantém histórico.
    if (!MULTI_FILE_TYPES.has(data.type)) {
      let del = supabaseAdmin
        .from("documents")
        .delete()
        .eq("candidate_id", candidate.id)
        .eq("type", data.type);
      if (data.dependent_id) del = del.eq("dependent_id", data.dependent_id);
      else del = del.is("dependent_id", null);
      await del;
    }

    const ocrPayload = {
      values: ocr.fields,
      confidences: ocr.field_confidences ?? {},
      evidences: ocr.evidences ?? {},
    };

    const { data: doc, error } = await supabaseAdmin
      .from("documents")
      .insert({
        candidate_id: candidate.id,
        type: data.type,
        storage_path: data.storage_path,
        ocr_data: ocrPayload as never,
        ocr_confidence: ocr.confidence,
        status: "pendente",
        dependent_id: data.dependent_id ?? null,
        label: data.label ?? null,
      })
      .select("id, type, ocr_data, ocr_confidence, status, dependent_id, label")
      .single();
    if (error) throw new Error(error.message);

    if (candidate.status === "pendente") {
      await supabaseAdmin
        .from("candidates")
        .update({ status: "em_analise" })
        .eq("id", candidate.id);
    }

    return { ...doc, ocr_fields: ocr.fields };
  });

export const submitCandidateApplication = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        token: z.string().uuid(),
        form_data: z.record(z.string(), z.unknown()),
        sexo: z.string().optional(),
        cor_raca: z.string().optional(),
        estado_civil: z.string().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const candidate = await loadByToken(data.token);
    requireConsent(candidate);

    // Validação de documentos obrigatórios
    const { data: docs } = await supabaseAdmin
      .from("documents")
      .select("type, dependent_id")
      .eq("candidate_id", candidate.id);
    const holderDocs = new Set((docs ?? []).filter((d) => !d.dependent_id).map((d) => d.type));
    // RG ou CNH: pelo menos um
    const hasIdentidade = holderDocs.has("rg") || holderDocs.has("cnh");
    const missing: string[] = [];
    for (const t of REQUIRED_HOLDER_DOCS) if (!holderDocs.has(t)) missing.push(t);
    if (!hasIdentidade && !missing.includes("rg")) missing.push("rg_ou_cnh");
    const sexo = data.sexo ?? candidate.sexo;
    if (sexo === "masculino" && !holderDocs.has("reservista")) missing.push("reservista");
    if (missing.length) throw new Error(`Faltam documentos: ${missing.join(", ")}`);

    const { error } = await supabaseAdmin
      .from("candidates")
      .update({
        form_data: data.form_data as never,
        status: "em_analise",
        sexo: data.sexo ?? candidate.sexo ?? null,
        cor_raca: data.cor_raca ?? candidate.cor_raca ?? null,
        estado_civil: data.estado_civil ?? candidate.estado_civil ?? null,
      })
      .eq("id", candidate.id);
    if (error) throw new Error(error.message);

    await supabaseAdmin.from("notifications").insert({
      candidate_id: candidate.id,
      event: "candidate.submitted",
      payload: {},
    });

    return { ok: true };
  });

// ===== Dependentes =====

export const upsertDependent = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({
      token: z.string().uuid(),
      id: z.string().uuid().optional(),
      full_name: z.string().trim().min(2).max(120),
      relationship: z.string().trim().max(40).optional(),
      birth_date: z.string().optional(),
      cpf: z.string().trim().max(20).optional(),
      rg: z.string().trim().max(30).optional(),
    }).parse(input),
  )
  .handler(async ({ data }) => {
    const candidate = await loadByToken(data.token);
    requireConsent(candidate);
    const payload = {
      candidate_id: candidate.id,
      full_name: data.full_name,
      relationship: data.relationship || null,
      birth_date: data.birth_date || null,
      cpf: data.cpf || null,
      rg: data.rg || null,
    };
    if (data.id) {
      const { data: row, error } = await supabaseAdmin
        .from("dependents")
        .update(payload)
        .eq("id", data.id)
        .eq("candidate_id", candidate.id)
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      return row;
    }
    const { data: row, error } = await supabaseAdmin
      .from("dependents")
      .insert(payload)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const removeDependent = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ token: z.string().uuid(), id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const candidate = await loadByToken(data.token);
    requireConsent(candidate);
    const { error } = await supabaseAdmin
      .from("dependents")
      .delete()
      .eq("id", data.id)
      .eq("candidate_id", candidate.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteDocument = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ token: z.string().uuid(), id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const candidate = await loadByToken(data.token);
    requireConsent(candidate);
    const { data: doc } = await supabaseAdmin
      .from("documents").select("storage_path, candidate_id").eq("id", data.id).maybeSingle();
    if (!doc || doc.candidate_id !== candidate.id) throw new Error("Documento não encontrado");
    await supabaseAdmin
      .from("documents")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", data.id);
    return { ok: true };
  });

export const acceptLgpdConsent = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        token: z.string().uuid(),
        signature_name: z.string().trim().min(2).max(160),
        signature_cpf: z.string().trim().min(11).max(20),
        device_info: z
          .object({
            user_agent: z.string().max(500).optional(),
            platform: z.string().max(80).optional(),
            language: z.string().max(40).optional(),
            timezone: z.string().max(80).optional(),
            screen: z.object({ w: z.number().int(), h: z.number().int() }).optional(),
            device_type: z.enum(["mobile", "tablet", "desktop"]).optional(),
          })
          .partial()
          .optional(),
        geo_consent: z.boolean(),
        geolocation: z
          .object({
            lat: z.number(),
            lng: z.number(),
            accuracy: z.number().optional(),
            source: z.enum(["gps", "ip"]).default("gps"),
          })
          .optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { data: candidate, error } = await supabaseAdmin
      .from("candidates")
      .select("id, token_expires_at, deletion_requested_at, lgpd_accepted_at, full_name, cpf")
      .eq("access_token", data.token)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!candidate) throw new Error("Link inválido");
    if (new Date(candidate.token_expires_at) < new Date()) throw new Error("Link expirado");
    if (candidate.deletion_requested_at) throw new Error("Cadastro encerrado");

    // Validar assinatura
    const cpfNorm = normalizeCpf(data.signature_cpf);
    if (!isValidCpf(cpfNorm)) throw new Error("CPF inválido");
    if (candidate.cpf && normalizeCpf(candidate.cpf) !== cpfNorm) {
      throw new Error("CPF não confere com o cadastro");
    }
    const nameA = data.signature_name.trim().toLowerCase().replace(/\s+/g, " ");
    const nameB = (candidate.full_name || "").trim().toLowerCase().replace(/\s+/g, " ");
    if (nameA !== nameB) {
      throw new Error("Nome digitado não confere com o cadastro");
    }

    const ip = getRequestIP({ xForwardedFor: true }) ?? null;
    const ua = getRequestHeader("user-agent") ?? null;
    const termsHash = await hashTerms(LGPD_TERMS_TEXT, LGPD_TERMS_VERSION);

    await supabaseAdmin.from("lgpd_consents").insert({
      candidate_id: candidate.id,
      ip_address: ip,
      user_agent: ua,
      terms_version: LGPD_TERMS_VERSION,
      terms_text: LGPD_TERMS_TEXT,
      terms_hash: termsHash,
      signature_name: data.signature_name.trim(),
      signature_cpf: cpfNorm,
      device_info: (data.device_info ?? {}) as never,
      geolocation: (data.geo_consent && data.geolocation ? data.geolocation : null) as never,
      geo_consent: data.geo_consent,
    });

    if (!candidate.lgpd_accepted_at) {
      await supabaseAdmin
        .from("candidates")
        .update({ lgpd_accepted_at: new Date().toISOString() })
        .eq("id", candidate.id);
    }
    return { ok: true, terms_version: LGPD_TERMS_VERSION, terms_hash: termsHash };
  });

export const parseResumeForCandidate = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({ token: z.string().uuid(), storage_path: z.string().min(3).max(300) }).parse(input),
  )
  .handler(async ({ data }) => {
    const candidate = await loadByToken(data.token);
    requireConsent(candidate);
    const parsed = await parseResumeFromStorage(data.storage_path);

    // Save curriculo doc reference (replace existing)
    await supabaseAdmin.from("documents").delete().eq("candidate_id", candidate.id).eq("type", "curriculo");
    await supabaseAdmin.from("documents").insert({
      candidate_id: candidate.id,
      type: "curriculo",
      storage_path: data.storage_path,
      ocr_data: parsed as never,
      ocr_confidence: 0.9,
      status: "pendente",
    });

    return parsed;
  });

export const requestDataDeletion = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ token: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const { data: candidate, error } = await supabaseAdmin
      .from("candidates")
      .select("id, token_expires_at")
      .eq("access_token", data.token)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!candidate) throw new Error("Link inválido");
    if (new Date(candidate.token_expires_at) < new Date()) throw new Error("Link expirado");
    await supabaseAdmin
      .from("candidates")
      .update({ deletion_requested_at: new Date().toISOString() })
      .eq("id", candidate.id);
    await supabaseAdmin.from("notifications").insert({
      candidate_id: candidate.id,
      event: "candidate.deletion_requested",
      payload: {},
    });
    return { ok: true };
  });