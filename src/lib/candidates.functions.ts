import { createServerFn } from "@tanstack/react-start";
import { fail } from "@/lib/errors";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { isValidCpf, normalizeCpf } from "@/lib/cpf";
import { logAudit } from "@/lib/audit.server";
import { signedDocumentUrl } from "@/lib/security/storage.server";
import { similarity, DUPLICATE_THRESHOLD, type DupProfile } from "@/lib/validation/duplicates";

export const listLgpdConsentsForCandidate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ candidate_id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    // RLS já limita ao RH que gerencia o candidato
    const { error: chkErr, count } = await supabase
      .from("candidates").select("id", { count: "exact", head: true }).eq("id", data.candidate_id);
    if (chkErr) fail(chkErr);
    if (!count) throw new Error("Candidato não encontrado");

    const { data: rows, error } = await supabaseAdmin
      .from("lgpd_consents")
      .select("*")
      .eq("candidate_id", data.candidate_id)
      .order("accepted_at", { ascending: false });
    if (error) fail(error);
    await logAudit({
      actor_user_id: context.userId,
      action: "view_lgpd_consent",
      entity: "candidate",
      entity_id: data.candidate_id,
    });
    return rows ?? [];
  });

const createSchema = z.object({
  full_name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(255).optional().or(z.literal("")),
  phone: z.string().trim().max(20).optional().or(z.literal("")),
  cpf: z.string().trim().max(20).optional().or(z.literal("")),
  position: z.string().trim().max(120).optional().or(z.literal("")),
});

export const createCandidate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => createSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const cpf = data.cpf ? normalizeCpf(data.cpf) : null;
    if (cpf && !isValidCpf(cpf)) throw new Error("CPF inválido");

    const { data: created, error } = await supabase
      .from("candidates")
      .insert({
        created_by: userId,
        full_name: data.full_name,
        email: data.email || null,
        phone: data.phone || null,
        cpf,
        position: data.position || null,
      })
      .select("id, access_token")
      .single();
    if (error) fail(error);

    await supabaseAdmin.from("notifications").insert({
      candidate_id: created.id,
      event: "candidate.created",
      payload: { by: userId },
    });

    return created;
  });

const filterText = z.string().trim().max(120).optional();

export const listCandidates = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        status: z.enum(["pendente", "em_analise", "aprovado", "rejeitado", "admitido"]).optional(),
        search: filterText,
        cidade: filterText,
        position: filterText,
        departamento: filterText,
        recrutador: filterText,
        situacao_entrevista: filterText,
        teste: filterText,
        admitido: filterText,
        categoria: filterText,
        integracao: filterText,
        meio_recebimento: filterText,
        recontratar: filterText,
        entrevista_de: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")),
        entrevista_ate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")),
      })
      .parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    let q = supabase
      .from("candidates")
      .select("id, codigo, full_name, email, phone, cpf, position, status, stage, created_at, updated_at, access_token, cidade, departamento, recrutador, data_entrevista, situacao_entrevista, teste, admitido, categoria, integracao, meio_recebimento, indicacao_colaborador, recontratar")
      .order("created_at", { ascending: false });
    const esc = (s: string) => s.replace(/[%_,()]/g, " ");
    if (data.status) q = q.eq("status", data.status);
    if (data.search) q = q.ilike("full_name", `%${esc(data.search)}%`);
    for (const k of ["cidade", "position", "departamento", "recrutador"] as const) {
      const v = data[k];
      if (v) q = q.ilike(k, `%${esc(v)}%`);
    }
    for (const k of ["situacao_entrevista", "teste", "admitido", "categoria", "integracao", "meio_recebimento", "recontratar"] as const) {
      const v = data[k];
      if (v) q = q.eq(k, v);
    }
    if (data.entrevista_de) q = q.gte("data_entrevista", data.entrevista_de);
    if (data.entrevista_ate) q = q.lte("data_entrevista", data.entrevista_ate);
    const { data: rows, error } = await q;
    if (error) fail(error);
    return rows ?? [];
  });

const hrStr = (max: number) => z.string().trim().max(max).optional().nullable();
export const updateCandidateHrIndicators = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        id: z.string().uuid(),
        cidade: hrStr(120),
        departamento: hrStr(120),
        recrutador: hrStr(120),
        data_entrevista: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable().or(z.literal("")),
        situacao_entrevista: hrStr(60),
        observacoes_entrevista: hrStr(4000),
        teste: hrStr(60),
        admitido: hrStr(60),
        categoria: hrStr(60),
        integracao: hrStr(60),
        observacoes_rh: hrStr(4000),
        meio_recebimento: hrStr(60),
        indicacao_colaborador: hrStr(160),
        recontratar: hrStr(30),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { id, ...rest } = data;
    const patch: Record<string, string | null> = {};
    for (const [k, v] of Object.entries(rest)) patch[k] = v ? String(v) : null;
    if (!(patch.meio_recebimento ?? "").toLowerCase().startsWith("indica")) patch.indicacao_colaborador = null;
    const { error } = await context.supabase.from("candidates").update(patch as never).eq("id", id);
    if (error) fail(error);
    await logAudit({ actor_user_id: context.userId, action: "edit_hr_indicators", entity: "candidate", entity_id: id });
    return { ok: true };
  });

export const getDashboardStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await supabase.from("candidates").select("status");
    if (error) fail(error);
    const counts = { pendente: 0, em_analise: 0, aprovado: 0, rejeitado: 0 };
    for (const r of data ?? []) counts[r.status as keyof typeof counts]++;
    return { counts, total: data?.length ?? 0 };
  });

export const getCandidateById = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: candidate, error } = await supabase
      .from("candidates")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) fail(error);
    if (!candidate) throw new Error("Candidato não encontrado");

    const { data: documents } = await supabase
      .from("documents")
      .select("*")
      .eq("candidate_id", data.id)
      .is("deleted_at", null)
      .order("uploaded_at", { ascending: true });

    const docsWithUrls = await Promise.all(
      (documents ?? []).map(async (d) => ({
        ...d,
        signed_url: await signedDocumentUrl(d.storage_path),
      })),
    );

    const { data: dependents } = await supabase
      .from("dependents")
      .select("*")
      .eq("candidate_id", data.id)
      .order("created_at", { ascending: true });

    const { data: trashed } = await supabase
      .from("documents")
      .select("*")
      .eq("candidate_id", data.id)
      .not("deleted_at", "is", null)
      .order("deleted_at", { ascending: false });

    const trashWithUrls = await Promise.all(
      (trashed ?? []).map(async (d) => ({
        ...d,
        signed_url: await signedDocumentUrl(d.storage_path),
      })),
    );

    await logAudit({
      actor_user_id: context.userId,
      action: "view_candidate",
      entity: "candidate",
      entity_id: data.id,
    });
    return { candidate, documents: docsWithUrls, dependents: dependents ?? [], trash: trashWithUrls };
  });

export const updateCandidateForm = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        id: z.string().uuid(),
        form_data: z.record(z.string(), z.unknown()),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase
      .from("candidates")
      .update({ form_data: data.form_data as never })
      .eq("id", data.id);
    if (error) fail(error);
    await logAudit({ actor_user_id: context.userId, action: "edit_form", entity: "candidate", entity_id: data.id });
    return { ok: true };
  });

export const updateCandidateBasicsRH = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        id: z.string().uuid(),
        full_name: z.string().trim().min(2).max(120),
        email: z.string().trim().max(255).optional().or(z.literal("")),
        phone: z.string().trim().max(20).optional().or(z.literal("")),
        cpf: z.string().trim().max(20).optional().or(z.literal("")),
        position: z.string().trim().max(120).optional().or(z.literal("")),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase
      .from("candidates")
      .update({
        full_name: data.full_name,
        email: data.email || null,
        phone: data.phone || null,
        cpf: data.cpf ? normalizeCpf(data.cpf) : null,
        position: data.position || null,
      })
      .eq("id", data.id);
    if (error) fail(error);
    await logAudit({ actor_user_id: context.userId, action: "edit_basics", entity: "candidate", entity_id: data.id });
    return { ok: true };
  });

export const updateDocumentOcr = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        document_id: z.string().uuid(),
        ocr_data: z.record(z.string(), z.unknown()),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase
      .from("documents")
      .update({ ocr_data: data.ocr_data as never })
      .eq("id", data.document_id);
    if (error) fail(error);
    await logAudit({ actor_user_id: context.userId, action: "edit_ocr", entity: "document", entity_id: data.document_id });
    return { ok: true };
  });

export const approveCandidate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("candidates")
      .update({ status: "aprovado", reviewed_by: userId, reviewed_at: new Date().toISOString(), rejection_reason: null })
      .eq("id", data.id);
    if (error) fail(error);
    await supabaseAdmin.from("notifications").insert({
      candidate_id: data.id,
      event: "candidate.approved",
      payload: { by: userId },
    });
    await logAudit({ actor_user_id: userId, action: "approve", entity: "candidate", entity_id: data.id });
    return { ok: true };
  });

export const rejectCandidate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ id: z.string().uuid(), reason: z.string().trim().min(3).max(500) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: isHr } = await supabase.rpc("is_hr", { _user_id: userId });
    if (!isHr) throw new Error("Apenas RH pode realizar esta ação.");
    const { data: updated, error } = await supabase
      .from("candidates")
      .update({
        status: "rejeitado",
        reviewed_by: userId,
        reviewed_at: new Date().toISOString(),
        rejection_reason: data.reason,
      })
      .eq("id", data.id)
      .select("id");
    if (error) fail(error);
    if (!updated?.length) throw new Error("Candidato não encontrado ou sem permissão.");
    await supabaseAdmin.from("notifications").insert({
      candidate_id: data.id,
      event: "candidate.rejected",
      payload: { by: userId, reason: data.reason },
    });
    await logAudit({ actor_user_id: userId, action: "reject", entity: "candidate", entity_id: data.id, metadata: { reason: data.reason } });
    return { ok: true };
  });

export const reopenCandidate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: isHr } = await supabase.rpc("is_hr", { _user_id: userId });
    if (!isHr) throw new Error("Apenas RH pode realizar esta ação.");
    const { data: updated, error } = await supabase
      .from("candidates")
      .update({
        status: "em_analise",
        rejection_reason: null,
        reviewed_by: null,
        reviewed_at: null,
      })
      .eq("id", data.id)
      .select("id");
    if (error) fail(error);
    if (!updated?.length) throw new Error("Candidato não encontrado ou sem permissão.");
    await supabaseAdmin.from("notifications").insert({
      candidate_id: data.id,
      event: "candidate.reopened",
      payload: { by: userId },
    });
    await logAudit({ actor_user_id: userId, action: "reopen", entity: "candidate", entity_id: data.id });
    return { ok: true };
  });

export const getCandidateNotifications = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: rows, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("candidate_id", data.id)
      .order("created_at", { ascending: false });
    if (error) fail(error);
    return rows ?? [];
  });

export const softDeleteDocumentRH = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ document_id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("documents")
      .update({ deleted_at: new Date().toISOString(), deleted_by: userId })
      .eq("id", data.document_id);
    if (error) fail(error);
    await logAudit({ actor_user_id: userId, action: "soft_delete_doc", entity: "document", entity_id: data.document_id });
    return { ok: true };
  });

export const restoreDocumentRH = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ document_id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase
      .from("documents")
      .update({ deleted_at: null, deleted_by: null })
      .eq("id", data.document_id);
    if (error) fail(error);
    await logAudit({ actor_user_id: context.userId, action: "restore_doc", entity: "document", entity_id: data.document_id });
    return { ok: true };
  });

export const purgeDocumentRH = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ document_id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: doc, error: selErr } = await supabase
      .from("documents")
      .select("id, storage_path, deleted_at")
      .eq("id", data.document_id)
      .maybeSingle();
    if (selErr) fail(selErr);
    if (!doc) throw new Error("Documento não encontrado");
    if (!doc.deleted_at) throw new Error("Documento não está na lixeira");
    await supabaseAdmin.storage.from("candidate-documents").remove([doc.storage_path]);
    const { error } = await supabaseAdmin.from("documents").delete().eq("id", doc.id);
    if (error) fail(error);
    await logAudit({ actor_user_id: context.userId, action: "purge_doc", entity: "document", entity_id: doc.id });
    return { ok: true };
  });
// Gera um link novo (5 min) para o RH abrir ou baixar o documento, com auditoria.
export const getDocumentLinkRH = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ document_id: z.string().uuid(), download: z.boolean().default(false) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: doc, error } = await context.supabase
      .from("documents")
      .select("id, type, storage_path")
      .eq("id", data.document_id)
      .maybeSingle();
    if (error) fail(error);
    if (!doc) throw new Error("Documento não encontrado");
    const ext = doc.storage_path.split(".").pop() ?? "pdf";
    const { data: s } = await supabaseAdmin.storage
      .from("candidate-documents")
      .createSignedUrl(doc.storage_path, 5 * 60, data.download ? { download: `${doc.type}.${ext}` } : undefined);
    if (!s?.signedUrl) throw new Error("Não foi possível gerar o link do documento");
    await logAudit({ actor_user_id: context.userId, action: "view_document", entity: "document", entity_id: doc.id, metadata: { download: data.download } });
    return { url: s.signedUrl };
  });

// ---------- Duplicidades ----------
type CandRow = { id: string; full_name: string; cpf: string | null; email: string | null; phone: string | null; form_data: unknown; created_at: string };

function profileOf(c: CandRow, docs: Array<{ candidate_id: string; ocr_data: unknown }>): DupProfile {
  const fd = (c.form_data ?? {}) as Record<string, unknown>;
  const pr = (fd.perfil_recrutamento ?? {}) as Record<string, unknown>;
  const names = [c.full_name, typeof fd.full_name === "string" ? fd.full_name : ""];
  let birth = (typeof fd.data_nascimento === "string" && fd.data_nascimento) || (typeof pr.data_nascimento === "string" && pr.data_nascimento) || null;
  let cpf = c.cpf;
  for (const d of docs.filter((x) => x.candidate_id === c.id)) {
    const v = ((d.ocr_data ?? {}) as { values?: Record<string, unknown> }).values ?? {};
    if (typeof v.nome === "string") names.push(v.nome);
    if (!birth && typeof v.data_nascimento === "string") birth = v.data_nascimento;
    if (!cpf && typeof v.cpf === "string" && v.cpf.replace(/\D/g, "").length === 11) cpf = v.cpf;
  }
  return { names, cpf, birth, email: c.email, phone: c.phone };
}

export const findDuplicateCandidates = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: rows, error } = await supabase
      .from("candidates").select("id, full_name, cpf, email, phone, form_data, created_at");
    if (error) fail(error);
    const all = (rows ?? []) as CandRow[];
    const me = all.find((r) => r.id === data.id);
    if (!me) return [];
    const { data: docs } = await supabase
      .from("documents").select("candidate_id, ocr_data")
      .in("type", ["rg", "cpf", "cnh", "certidao"]).is("deleted_at", null).is("dependent_id", null);
    const d = docs ?? [];
    const mine = profileOf(me, d);
    return all
      .filter((r) => r.id !== me.id)
      .map((r) => ({ id: r.id, full_name: r.full_name, email: r.email, phone: r.phone, created_at: r.created_at, ...similarity(mine, profileOf(r, d)) }))
      .filter((r) => r.score >= DUPLICATE_THRESHOLD)
      .sort((a, b) => b.score - a.score);
  });

export const mergeCandidates = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ primary_id: z.string().uuid(), duplicate_id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("merge_candidates", { _primary: data.primary_id, _dup: data.duplicate_id });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
