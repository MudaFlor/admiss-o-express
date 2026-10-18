import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { fail } from "@/lib/errors";
import { logAudit } from "@/lib/audit.server";
import { DISC_GROUPS, scoreDisc, type DiscFactor } from "@/lib/disc/questions";

const Target = z
  .object({ candidate_id: z.string().uuid().optional(), employee_id: z.string().uuid().optional() })
  .refine((v) => v.candidate_id || v.employee_id, "Informe candidato ou colaborador");

export const listDiscAssessments = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => Target.parse(i))
  .handler(async ({ data, context }) => {
    let q = context.supabase.from("disc_assessments").select("*").order("created_at", { ascending: false });
    q = data.candidate_id ? q.eq("candidate_id", data.candidate_id) : q.eq("employee_id", data.employee_id!);
    const { data: rows, error } = await q;
    if (error) fail(error);
    return rows ?? [];
  });

export const createDiscAssessment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z
      .object({
        candidate_id: z.string().uuid().optional(),
        employee_id: z.string().uuid().optional(),
        respondent_name: z.string().trim().min(2).max(120),
        phone: z.string().trim().max(20).optional().or(z.literal("")),
      })
      .refine((v) => v.candidate_id || v.employee_id)
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("disc_assessments")
      .insert({
        candidate_id: data.candidate_id ?? null,
        employee_id: data.employee_id ?? null,
        respondent_name: data.respondent_name,
        phone: data.phone || null,
        created_by: context.userId,
      })
      .select("id, token")
      .single();
    if (error) fail(error);
    await logAudit({ actor_user_id: context.userId, action: "create_disc", entity: "disc_assessment", entity_id: row.id });
    return row;
  });

async function admin() {
  return (await import("@/integrations/supabase/client.server")).supabaseAdmin;
}

export const getDiscByToken = createServerFn({ method: "POST" })
  .inputValidator((i) => z.object({ token: z.string().uuid() }).parse(i))
  .handler(async ({ data }) => {
    const db = await admin();
    const { data: row } = await db
      .from("disc_assessments")
      .select("respondent_name, status, token_expires_at")
      .eq("token", data.token)
      .maybeSingle();
    if (!row) return { state: "invalid" as const };
    if (row.status === "concluido") return { state: "done" as const, name: row.respondent_name };
    if (new Date(row.token_expires_at) < new Date()) return { state: "expired" as const };
    return { state: "open" as const, name: row.respondent_name };
  });

export const submitDisc = createServerFn({ method: "POST" })
  .inputValidator((i) =>
    z
      .object({
        token: z.string().uuid(),
        answers: z.array(z.enum(["D", "I", "S", "C"])).length(DISC_GROUPS.length),
      })
      .parse(i),
  )
  .handler(async ({ data }) => {
    const db = await admin();
    const { data: row } = await db
      .from("disc_assessments")
      .select("id, status, token_expires_at")
      .eq("token", data.token)
      .maybeSingle();
    if (!row) throw new Error("Link inválido");
    if (row.status === "concluido") throw new Error("Questionário já respondido");
    if (new Date(row.token_expires_at) < new Date()) throw new Error("Link expirado");
    const { scores, profile } = scoreDisc(data.answers as DiscFactor[]);
    const { error } = await db
      .from("disc_assessments")
      .update({ answers: data.answers, scores, profile, status: "concluido", completed_at: new Date().toISOString() })
      .eq("id", row.id)
      .eq("status", "enviado");
    if (error) throw new Error("Não foi possível salvar as respostas");
    return { ok: true };
  });
