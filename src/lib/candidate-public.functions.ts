import { createServerFn, createServerOnlyFn } from "@tanstack/react-start";
import { fail } from "@/lib/errors";
import { getRequestHeader, getRequestIP } from "@tanstack/react-start/server";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { isValidCpf, normalizeCpf } from "@/lib/cpf";
import { runOcr } from "@/lib/ocr/provider.server";
import { isIllegible, ILLEGIBLE_MESSAGE, isCtpsDigital, CTPS_DIGITAL_MESSAGE } from "@/lib/ocr/legibility";
import { parseResumeFromStorage } from "@/lib/ai/resume-parser.server";
import { LGPD_TERMS_TEXT, LGPD_TERMS_VERSION, hashTerms } from "@/lib/lgpd/terms";
import { assertRateLimitPersisted } from "@/lib/rate-limit.server";
import type { Database } from "@/integrations/supabase/types";
import { advanceStage } from "@/lib/workflow/stage.server";
import { finalizeApplication } from "@/lib/admission/finalize.server";
import { requiredDocumentsFor, missingDocs } from "@/lib/requirements/requirements.server";
import { lookupCep, checkDuplicateCpf } from "@/lib/validation/field-checks";
import { signedDocumentUrl, assertUploadedFileIsSafe, PORTAL_SIGNED_URL_TTL_SECONDS } from "@/lib/security/storage.server";
import { sanitizePortalFormData } from "@/lib/validation/portal-form-data";
import { isAllowedExtension } from "@/lib/upload-rules";
import { candidateContactSchema, reviewedDocumentsSchema, reviewedOcrData, requiresCtps } from "@/lib/validation/candidate-submission";
import { crossCheckCandidate, extractDeclaredFromFormData, blockingIssues } from "@/lib/validation/cross-check";
import { resolveCandidateSex } from "@/lib/admission/candidate-sex";
import {
  DEPENDENT_NAME_PLACEHOLDER,
  dependentOcrPatch,
  normalizeDependentName,
} from "@/lib/dependent-record";

const clientIp = createServerOnlyFn((): string => {
  return getRequestIP({ xForwardedFor: true }) ?? "unknown";
});
// Limites por IP para bloquear brute-force de tokens no portal público.
const LIMIT_READ = { limit: 60, windowMs: 60_000 };      // 60 leituras/min
const LIMIT_WRITE = { limit: 30, windowMs: 60_000 };     // 30 gravações/min
const LIMIT_UPLOAD = { limit: 20, windowMs: 60_000 };    // 20 uploads/min
const LIMIT_CONSENT = { limit: 5, windowMs: 60_000 };    // 5 tentativas de assinatura/min

type DocType = Database["public"]["Enums"]["document_type"];
type DependentRow = Database["public"]["Tables"]["dependents"]["Row"];

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
  if (error) fail(error);
  if (!data) throw new Error("Link inválido");
  if (new Date(data.token_expires_at) < new Date()) throw new Error("Link expirado");
  if (data.token_revoked_at && new Date(data.token_revoked_at) <= new Date()) {
    const fd = (data.form_data ?? {}) as Record<string, unknown>;
    if (fd.conduzido_por_rh) throw new Error("Este link foi encerrado. O RH está concluindo sua admissão.");
    throw new Error("Link cancelado. Entre em contato com o RH.");
  }
  return data;
}

function requireConsent(candidate: { lgpd_accepted_at: string | null; deletion_requested_at: string | null }) {
  if (candidate.deletion_requested_at) throw new Error("Cadastro encerrado a pedido do candidato");
  if (!candidate.lgpd_accepted_at) throw new Error("Aceite do termo LGPD obrigatório");
}

function assertPathBelongsToCandidate(storagePath: string, candidateId: string) {
  const prefix = `${candidateId}/`;
  if (!storagePath.startsWith(prefix)) {
    throw new Error("Caminho do arquivo inválido.");
  }
}

export const getCandidateByToken = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ token: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    await assertRateLimitPersisted(`portal:read:${clientIp()}`, LIMIT_READ);
    const candidate = await loadByToken(data.token);
    const { data: documents } = await supabaseAdmin
      .from("documents")
      .select("id, type, status, storage_path, ocr_data, ocr_confidence, uploaded_at, dependent_id, label")
      .eq("candidate_id", candidate.id)
      .is("deleted_at", null);

    const fd = (candidate.form_data ?? {}) as Record<string, unknown>;
    const profile = (fd.perfil_recrutamento ?? {}) as Record<string, unknown>;
    const sexo = resolveCandidateSex(candidate.sexo, { ...profile, ...fd }, documents ?? []);

    const docsWithUrls = await Promise.all(
      (documents ?? []).map(async (d) => {
        const signedUrl = await signedDocumentUrl(d.storage_path, PORTAL_SIGNED_URL_TTL_SECONDS);
        return { ...d, signed_url: signedUrl };
      }),
    );

    const { data: dependents } = await supabaseAdmin
      .from("dependents")
      .select("*")
      .eq("candidate_id", candidate.id)
      .order("created_at", { ascending: true });

    // Pendência de correção aberta pelo RH (aviso exibido no topo do portal).
    const { data: corrections } = await supabaseAdmin
      .from("correction_requests")
      .select("id, fields, documents, note, created_at")
      .eq("candidate_id", candidate.id)
      .eq("status", "aberta")
      .order("created_at", { ascending: false })
      .limit(1);

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
        sexo,
        cor_raca: candidate.cor_raca,
        estado_civil: candidate.estado_civil,
        lgpd_accepted_at: candidate.lgpd_accepted_at,
        deletion_requested_at: candidate.deletion_requested_at,
      },
      documents: docsWithUrls,
      dependents: (dependents ?? []).map((dependent) => ({
        ...dependent,
        full_name: normalizeDependentName(dependent.full_name),
      })),
      correction: (corrections?.[0] as
        | { id: string; fields: string[]; documents: { type: string; label: string }[]; note: string | null; created_at: string }
        | undefined) ?? null,
    };
  });

export const updateCandidateBasics = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        token: z.string().uuid(),
        full_name: z.string().trim().min(2).max(120),
        cpf: z.string().trim().min(11).max(20),
        email: candidateContactSchema.shape.email,
        phone: z.string().trim().max(20).optional().or(z.literal("")),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    await assertRateLimitPersisted(`portal:write:${clientIp()}`, LIMIT_WRITE);
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
    if (error) fail(error);
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
    await assertRateLimitPersisted(`portal:upload:${clientIp()}`, LIMIT_UPLOAD);
    const candidate = await loadByToken(data.token);
    requireConsent(candidate);
    const ext = data.ext.toLowerCase();
    if (!isAllowedExtension(ext)) throw new Error("Formato não aceito. Envie apenas PDF, JPG ou PNG.");
    const path = `${candidate.id}/${data.type}-${crypto.randomUUID()}.${ext}`;
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
        create_dependent: z.boolean().optional(),
        label: z.string().trim().max(120).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    await assertRateLimitPersisted(`portal:upload:${clientIp()}`, LIMIT_UPLOAD);
    const candidate = await loadByToken(data.token);
    requireConsent(candidate);
    assertPathBelongsToCandidate(data.storage_path, candidate.id);
    await assertUploadedFileIsSafe(data.storage_path);

    const canCreateDependent = data.type === "dependente_certidao" || data.type === "dependente_rg_cpf";
    if (data.create_dependent && !canCreateDependent) {
      throw new Error("Para iniciar o cadastro, anexe a certidão de nascimento ou o RG/CPF do dependente.");
    }
    if (data.create_dependent && data.dependent_id) {
      throw new Error("Não é possível criar e vincular um dependente ao mesmo tempo.");
    }

    // Um documento nunca pode ser associado ao dependente de outro candidato.
    let existingDependent: DependentRow | null = null;
    if (data.dependent_id) {
      const { data: dependent, error } = await supabaseAdmin
        .from("dependents")
        .select("*")
        .eq("id", data.dependent_id)
        .eq("candidate_id", candidate.id)
        .maybeSingle();
      if (error) fail(error);
      if (!dependent) throw new Error("Dependente não encontrado");
      existingDependent = dependent;
    }

    // Run OCR (no-op para tipos sem extração)
    // Sem IA (créditos/instabilidade): aceita o arquivo e libera digitação manual.
    let ocr: Awaited<ReturnType<typeof runOcr>>;
    let aiUnavailable = false;
    try {
      ocr = await runOcr(data.type, data.storage_path);
    } catch {
      aiUnavailable = true;
      ocr = { status: "falha", confidence: 0, fields: {}, motivo: "IA indisponível — preenchimento manual" };
    }
    if (!aiUnavailable && isIllegible(data.type, ocr)) {
      await supabaseAdmin.storage.from("candidate-documents").remove([data.storage_path]);
      throw new Error(ILLEGIBLE_MESSAGE);
    }
    if (!aiUnavailable && data.type === "ctps" && !isCtpsDigital(ocr.fields)) {
      await supabaseAdmin.storage.from("candidate-documents").remove([data.storage_path]);
      throw new Error(CTPS_DIGITAL_MESSAGE);
    }

    // No fluxo "documento primeiro", o OCR cria o cadastro já preenchido.
    // Sem nome legível, um campo provisório obriga a revisão manual na tela.
    let dependentId = data.dependent_id ?? null;
    let createdDependent: DependentRow | null = null;
    if (data.create_dependent) {
      const extracted = dependentOcrPatch({}, ocr.fields);
      const { data: dependent, error } = await supabaseAdmin
        .from("dependents")
        .insert({
          candidate_id: candidate.id,
          full_name: extracted.full_name ?? DEPENDENT_NAME_PLACEHOLDER,
          relationship: "filho",
          birth_date: extracted.birth_date ?? null,
          cpf: extracted.cpf ?? null,
          rg: extracted.rg ?? null,
        })
        .select("*")
        .single();
      if (error) fail(error);
      createdDependent = dependent;
      dependentId = dependent.id;
    }

    // Tipos single-file: substitui o anterior. Multi-file: mantém histórico.
    if (!MULTI_FILE_TYPES.has(data.type)) {
      let del = supabaseAdmin
        .from("documents")
        .delete()
        .eq("candidate_id", candidate.id)
        .eq("type", data.type);
      if (dependentId) del = del.eq("dependent_id", dependentId);
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
        dependent_id: dependentId,
        label: data.label ?? null,
      })
      .select("id, type, ocr_data, ocr_confidence, status, dependent_id, label")
      .single();
    if (error) fail(error);

    if (existingDependent && ocr.status === "sucesso" && canCreateDependent) {
      const patch = dependentOcrPatch(existingDependent, ocr.fields);
      if (Object.keys(patch).length) {
        const { error: patchError } = await supabaseAdmin
          .from("dependents")
          .update(patch)
          .eq("id", existingDependent.id)
          .eq("candidate_id", candidate.id);
        if (patchError) fail(patchError);
      }
    }

    if (candidate.status === "pendente") {
      await supabaseAdmin
        .from("candidates")
        .update({ status: "em_analise" })
        .eq("id", candidate.id);
    }

    if (data.type === "curriculo") {
      await advanceStage(candidate.id, "curriculo_enviado", { note: "Currículo recebido" });
    } else {
      await advanceStage(candidate.id, "documentos_enviados", { note: `Documento enviado: ${data.type}` });
      if (ocr.status === "sucesso" && Object.keys(ocr.fields).length > 0) {
        await advanceStage(candidate.id, "ocr_concluido", { note: `OCR concluído: ${data.type}` });
      }
    }

    return { ...doc, ocr_fields: ocr.fields, ai_unavailable: aiUnavailable, dependent: createdDependent };
  });

export const submitCandidateApplication = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        token: z.string().uuid(),
        form_data: z.record(z.string(), z.unknown()),
        sexo: z.enum(["feminino", "masculino"], { error: "Selecione o sexo: Feminino ou Masculino." }),
        cor_raca: z.string().optional(),
        estado_civil: z.string().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    await assertRateLimitPersisted(`portal:write:${clientIp()}`, LIMIT_WRITE);
    const candidate = await loadByToken(data.token);
    requireConsent(candidate);

    const existing = (candidate.form_data ?? {}) as Record<string, unknown>;
    const form_data = sanitizePortalFormData(data.form_data, existing);
    await finalizeApplication(candidate, { ...data, form_data }, "Envio finalizado pelo candidato");

    return { ok: true };
  });

// ===== Validações auxiliares expostas ao portal =====

export const lookupCepPublic = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ token: z.string().uuid(), cep: z.string().min(8).max(10) }).parse(input))
  .handler(async ({ data }) => {
    await assertRateLimitPersisted(`portal:read:${clientIp()}`, LIMIT_READ);
    await loadByToken(data.token); // valida token
    return await lookupCep(data.cep);
  });

export const checkCpfDuplicate = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ token: z.string().uuid(), cpf: z.string().min(11).max(20) }).parse(input))
  .handler(async ({ data }) => {
    await assertRateLimitPersisted(`portal:read:${clientIp()}`, LIMIT_READ);
    const candidate = await loadByToken(data.token);
    return await checkDuplicateCpf(data.cpf, candidate.id);
  });

export const getRequiredDocuments = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ token: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    await assertRateLimitPersisted(`portal:read:${clientIp()}`, LIMIT_READ);
    const candidate = await loadByToken(data.token);
    const { data: documents, error } = await supabaseAdmin
      .from("documents")
      .select("type, dependent_id, ocr_data")
      .eq("candidate_id", candidate.id)
      .is("deleted_at", null);
    if (error) fail(error);
    const fd = (candidate.form_data ?? {}) as Record<string, unknown>;
    const profile = (fd.perfil_recrutamento ?? {}) as Record<string, unknown>;
    const rules = await requiredDocumentsFor({
      position: candidate.position,
      sexo: resolveCandidateSex(candidate.sexo, { ...profile, ...fd }, documents ?? []),
      estado_civil: candidate.estado_civil,
    });
    return rules.map((r) => ({ document_type: r.document_type, label: r.label }));
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
    await assertRateLimitPersisted(`portal:write:${clientIp()}`, LIMIT_WRITE);
    const candidate = await loadByToken(data.token);
    requireConsent(candidate);
    const payload = {
      candidate_id: candidate.id,
      full_name: normalizeDependentName(data.full_name),
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
      if (error) fail(error);
      return row;
    }
    const { data: row, error } = await supabaseAdmin
      .from("dependents")
      .insert(payload)
      .select("*")
      .single();
    if (error) fail(error);
    return row;
  });

export const removeDependent = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ token: z.string().uuid(), id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    await assertRateLimitPersisted(`portal:write:${clientIp()}`, LIMIT_WRITE);
    const candidate = await loadByToken(data.token);
    requireConsent(candidate);
    const { error } = await supabaseAdmin
      .from("dependents")
      .delete()
      .eq("id", data.id)
      .eq("candidate_id", candidate.id);
    if (error) fail(error);
    return { ok: true };
  });

export const deleteDocument = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ token: z.string().uuid(), id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    await assertRateLimitPersisted(`portal:write:${clientIp()}`, LIMIT_WRITE);
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
    await assertRateLimitPersisted(`portal:consent:${clientIp()}`, LIMIT_CONSENT);
    const { data: candidate, error } = await supabaseAdmin
      .from("candidates")
      .select("id, token_expires_at, deletion_requested_at, lgpd_accepted_at, full_name, cpf, token_revoked_at")
      .eq("access_token", data.token)
      .maybeSingle();
    if (error) fail(error);
    if (!candidate) throw new Error("Link inválido");
    if (new Date(candidate.token_expires_at) < new Date()) throw new Error("Link expirado");
    if (candidate.token_revoked_at && new Date(candidate.token_revoked_at) <= new Date()) {
      throw new Error("Link cancelado. Entre em contato com o RH.");
    }
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
    await advanceStage(candidate.id, "aceite_lgpd", { note: "Aceite LGPD registrado" });
    return { ok: true, terms_version: LGPD_TERMS_VERSION, terms_hash: termsHash };
  });

export const parseResumeForCandidate = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({ token: z.string().uuid(), storage_path: z.string().min(3).max(300) }).parse(input),
  )
  .handler(async ({ data }) => {
    await assertRateLimitPersisted(`portal:upload:${clientIp()}`, LIMIT_UPLOAD);
    const candidate = await loadByToken(data.token);
    requireConsent(candidate);
    assertPathBelongsToCandidate(data.storage_path, candidate.id);
    await assertUploadedFileIsSafe(data.storage_path);
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
    await assertRateLimitPersisted(`portal:write:${clientIp()}`, LIMIT_WRITE);
    const { data: candidate, error } = await supabaseAdmin
      .from("candidates")
      .select("id, token_expires_at, token_revoked_at")
      .eq("access_token", data.token)
      .maybeSingle();
    if (error) fail(error);
    if (!candidate) throw new Error("Link inválido");
    if (new Date(candidate.token_expires_at) < new Date()) throw new Error("Link expirado");
    if (candidate.token_revoked_at && new Date(candidate.token_revoked_at) <= new Date()) {
      throw new Error("Link cancelado. Entre em contato com o RH.");
    }
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
