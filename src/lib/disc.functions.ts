import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { fail } from "@/lib/errors";
import { logAudit } from "@/lib/audit.server";
import { DISC_GROUPS, scoreDisc, type DiscFactor } from "@/lib/disc/questions";
import { isV2Set, nextQuestionSet, profileAnswersSchema, profileIntroSchema, questionSetById } from "@/lib/profile/questions";

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
        cycle_reason: z.string().trim().max(300).optional().or(z.literal("")),
      })
      .refine((v) => v.candidate_id || v.employee_id)
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    let prev = context.supabase.from("disc_assessments").select("question_set").eq("kind", "perfil_aberto");
    prev = data.candidate_id ? prev.eq("candidate_id", data.candidate_id) : prev.eq("employee_id", data.employee_id!);
    const { data: used } = await prev;
    const set = nextQuestionSet((used ?? []).map((r) => r.question_set));
    const { data: row, error } = await context.supabase
      .from("disc_assessments")
      .insert({
        kind: "perfil_aberto",
        question_set: set.id,
        cycle_reason: data.cycle_reason || null,
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
      .select("respondent_name, status, token_expires_at, kind, question_set, candidate_id, employee_id")
      .eq("token", data.token)
      .maybeSingle();
    if (!row) return { state: "invalid" as const };
    const set = questionSetById(row.question_set);
    if (row.status === "concluido") return { state: "done" as const, name: row.respondent_name };
    if (new Date(row.token_expires_at) < new Date()) return { state: "expired" as const };
    let cargo = "";
    if (row.employee_id) {
      const { data: e } = await db.from("employees").select("position").eq("id", row.employee_id).maybeSingle();
      cargo = (e as { position?: string | null } | null)?.position ?? "";
    } else if (row.candidate_id) {
      const { data: c } = await db.from("candidates").select("position").eq("id", row.candidate_id).maybeSingle();
      cargo = (c as { position?: string | null } | null)?.position ?? "";
    }
    return { state: "open" as const, name: row.respondent_name, cargo, kind: row.kind, v2: isV2Set(row.question_set), q1: set.q1, q2: set.q2 };
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

type Db = Awaited<ReturnType<typeof admin>>;

/** Gera a análise (e o parecer de evolução, se houver ciclo anterior). Falhas ficam registradas sem perder as respostas. */
async function runAnalysis(db: Db, id: string) {
  const { analyzeProfile, analyzeProfileV2, compareProfiles } = await import("@/lib/profile/analysis.server");
  const { data: row } = await db.from("disc_assessments").select("*").eq("id", id).single();
  if (!row) return;
  const answers = row.answers as { q1: string; q2: string; nome?: string; cargo?: string };
  const v2 = isV2Set(row.question_set);
  await db.from("disc_assessments").update({ analysis_status: "processando", analysis_error: null }).eq("id", id);
  try {
    const questions = questionSetById(row.question_set);
    const analysis = v2
      ? await analyzeProfileV2({ questions, q1: answers.q1, q2: answers.q2, nome: answers.nome, cargo: answers.cargo })
      : await analyzeProfile({ questions, q1: answers.q1, q2: answers.q2, reason: row.cycle_reason });
    let prevQ = db.from("disc_assessments").select("analysis, completed_at").eq("kind", "perfil_aberto").eq("question_set", row.question_set ?? "")
      .not("analysis", "is", null).neq("id", id).lt("completed_at", row.completed_at ?? new Date().toISOString())
      .order("completed_at", { ascending: false }).limit(1);
    prevQ = row.candidate_id ? prevQ.eq("candidate_id", row.candidate_id) : prevQ.eq("employee_id", row.employee_id!);
    const { data: prev } = await prevQ;
    let evolution = null;
    if (prev?.[0]?.analysis) {
      const months = Math.max(1, Math.round((Date.now() - new Date(prev[0].completed_at!).getTime()) / (30 * 864e5)));
      evolution = await compareProfiles(prev[0].analysis, analysis, months);
    }
    await db.from("disc_assessments").update({ analysis, evolution, analysis_status: "concluida", profile: "Perfil aberto" }).eq("id", id);
  } catch (e) {
    console.error("profile analysis failed", e);
    await db.from("disc_assessments").update({ analysis_status: "falhou", analysis_error: "Não foi possível gerar a análise agora. Tente gerar novamente." }).eq("id", id);
  }
}

export const submitProfileAnswers = createServerFn({ method: "POST" })
  .inputValidator((i) => z.object({ token: z.string().uuid() }).merge(profileAnswersSchema).merge(profileIntroSchema.partial()).parse(i))
  .handler(async ({ data }) => {
    const db = await admin();
    const { data: row } = await db
      .from("disc_assessments")
      .select("id, status, token_expires_at, kind")
      .eq("token", data.token)
      .maybeSingle();
    if (!row || row.kind !== "perfil_aberto") throw new Error("Link inválido");
    if (row.status === "concluido") throw new Error("Questionário já respondido");
    if (new Date(row.token_expires_at) < new Date()) throw new Error("Link expirado");
    const { data: updated, error } = await db
      .from("disc_assessments")
      .update({ answers: { q1: data.q1, q2: data.q2, nome: data.nome ?? null, cargo: data.cargo ?? null }, analysis_status: "pendente", status: "concluido", completed_at: new Date().toISOString() })
      .eq("id", row.id)
      .eq("status", "enviado")
      .select("id");
    if (error || !updated?.length) throw new Error("Não foi possível salvar as respostas");
    // A IA só roda quando o RH clicar em "Gerar Perfil Comportamental".
    return { ok: true };
  });

export const regenerateProfileAnalysis = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: isHr } = await context.supabase.rpc("is_hr", { _user_id: context.userId });
    if (!isHr) throw new Error("Acesso restrito ao RH");
    const db = await admin();
    const { data: row } = await db.from("disc_assessments").select("id, kind, status").eq("id", data.id).maybeSingle();
    if (!row || row.kind !== "perfil_aberto" || row.status !== "concluido") throw new Error("Análise indisponível");
    await runAnalysis(db, row.id);
    await logAudit({ actor_user_id: context.userId, action: "regenerate_profile_analysis", entity: "disc_assessment", entity_id: row.id });
    return { ok: true };
  });

/** Lista central de análises de perfil para o RH (aba Análise de Perfil). */
export const listProfileAnalyses = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isHr } = await context.supabase.rpc("is_hr", { _user_id: context.userId });
    if (!isHr) throw new Error("Acesso restrito ao RH");
    const { data: rows, error } = await context.supabase
      .from("disc_assessments")
      .select("id, token, created_at, completed_at, status, answers, question_set, cycle_reason, analysis, evolution, analysis_status, analysis_error, respondent_name, candidate_id, employee_id")
      .eq("kind", "perfil_aberto")
      .order("created_at", { ascending: false });
    if (error) fail(error);
    const list = rows ?? [];
    const cIds = [...new Set(list.map((r) => r.candidate_id).filter(Boolean))] as string[];
    const eIds = [...new Set(list.map((r) => r.employee_id).filter(Boolean))] as string[];
    const [cs, es] = await Promise.all([
      cIds.length ? context.supabase.from("candidates").select("id, full_name, position").in("id", cIds) : Promise.resolve({ data: [] as { id: string; full_name: string | null; position: string | null }[] }),
      eIds.length ? context.supabase.from("employees").select("id, full_name, position").in("id", eIds) : Promise.resolve({ data: [] as { id: string; full_name: string | null; position: string | null }[] }),
    ]);
    const cMap = new Map((cs.data ?? []).map((c) => [c.id, c]));
    const eMap = new Map((es.data ?? []).map((e) => [e.id, e]));
    return list.map((r) => {
      const ans = (r.answers ?? {}) as { cargo?: string | null };
      const c = r.candidate_id ? cMap.get(r.candidate_id) : undefined;
      const e = r.employee_id ? eMap.get(r.employee_id) : undefined;
      return {
        ...r,
        tipo: (r.employee_id ? "colaborador" : "candidato") as "colaborador" | "candidato",
        nome: e?.full_name ?? c?.full_name ?? r.respondent_name,
        cargo: ans.cargo || e?.position || c?.position || "",
      };
    });
  });

/** Busca candidatos e colaboradores pelo nome para enviar uma nova análise de perfil. */
export const searchProfilePeople = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ q: z.string().trim().min(2).max(80) }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: isHr } = await context.supabase.rpc("is_hr", { _user_id: context.userId });
    if (!isHr) throw new Error("Acesso restrito ao RH");
    const like = `%${data.q.replace(/[%_]/g, "")}%`;
    const [cs, es] = await Promise.all([
      context.supabase.from("candidates").select("id, full_name, position, phone").ilike("full_name", like).limit(10),
      context.supabase.from("employees").select("id, full_name, position, phone").ilike("full_name", like).limit(10),
    ]);
    return [
      ...(es.data ?? []).map((e) => ({ ...e, tipo: "colaborador" as const })),
      ...(cs.data ?? []).map((c) => ({ ...c, tipo: "candidato" as const })),
    ];
  });
