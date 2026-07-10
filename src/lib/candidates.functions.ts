import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { isValidCpf, normalizeCpf } from "@/lib/cpf";

export const listLgpdConsentsForCandidate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ candidate_id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    // RLS já limita ao RH que gerencia o candidato
    const { error: chkErr, count } = await supabase
      .from("candidates").select("id", { count: "exact", head: true }).eq("id", data.candidate_id);
    if (chkErr) throw new Error(chkErr.message);
    if (!count) throw new Error("Candidato não encontrado");

    const { data: rows, error } = await supabaseAdmin
      .from("lgpd_consents")
      .select("*")
      .eq("candidate_id", data.candidate_id)
      .order("accepted_at", { ascending: false });
    if (error) throw new Error(error.message);
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
    if (error) throw new Error(error.message);

    await supabaseAdmin.from("notifications").insert({
      candidate_id: created.id,
      event: "candidate.created",
      payload: { by: userId },
    });

    return created;
  });

export const listCandidates = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        status: z.enum(["pendente", "em_analise", "aprovado", "rejeitado"]).optional(),
        search: z.string().trim().max(120).optional(),
      })
      .parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    let q = supabase
      .from("candidates")
      .select("id, full_name, email, phone, cpf, position, status, created_at, updated_at, access_token")
      .order("created_at", { ascending: false });
    if (data.status) q = q.eq("status", data.status);
    if (data.search) q = q.ilike("full_name", `%${data.search}%`);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const getDashboardStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await supabase.from("candidates").select("status");
    if (error) throw new Error(error.message);
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
    if (error) throw new Error(error.message);
    if (!candidate) throw new Error("Candidato não encontrado");

    const { data: documents } = await supabase
      .from("documents")
      .select("*")
      .eq("candidate_id", data.id)
      .is("deleted_at", null)
      .order("uploaded_at", { ascending: true });

    const docsWithUrls = await Promise.all(
      (documents ?? []).map(async (d) => {
        const { data: signed } = await supabaseAdmin.storage
          .from("candidate-documents")
          .createSignedUrl(d.storage_path, 60 * 10);
        return { ...d, signed_url: signed?.signedUrl ?? null };
      }),
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
      (trashed ?? []).map(async (d) => {
        const { data: signed } = await supabaseAdmin.storage
          .from("candidate-documents")
          .createSignedUrl(d.storage_path, 60 * 10);
        return { ...d, signed_url: signed?.signedUrl ?? null };
      }),
    );

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
    if (error) throw new Error(error.message);
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
    if (error) throw new Error(error.message);
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
    if (error) throw new Error(error.message);
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
    if (error) throw new Error(error.message);
    await supabaseAdmin.from("notifications").insert({
      candidate_id: data.id,
      event: "candidate.approved",
      payload: { by: userId },
    });
    return { ok: true };
  });

export const rejectCandidate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ id: z.string().uuid(), reason: z.string().trim().min(3).max(500) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("candidates")
      .update({
        status: "rejeitado",
        reviewed_by: userId,
        reviewed_at: new Date().toISOString(),
        rejection_reason: data.reason,
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    await supabaseAdmin.from("notifications").insert({
      candidate_id: data.id,
      event: "candidate.rejected",
      payload: { by: userId, reason: data.reason },
    });
    return { ok: true };
  });

export const reopenCandidate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("candidates")
      .update({
        status: "em_analise",
        rejection_reason: null,
        reviewed_by: null,
        reviewed_at: null,
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    await supabaseAdmin.from("notifications").insert({
      candidate_id: data.id,
      event: "candidate.reopened",
      payload: { by: userId },
    });
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
    if (error) throw new Error(error.message);
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
    if (error) throw new Error(error.message);
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
    if (error) throw new Error(error.message);
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
    if (selErr) throw new Error(selErr.message);
    if (!doc) throw new Error("Documento não encontrado");
    if (!doc.deleted_at) throw new Error("Documento não está na lixeira");
    await supabaseAdmin.storage.from("candidate-documents").remove([doc.storage_path]);
    const { error } = await supabaseAdmin.from("documents").delete().eq("id", doc.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });