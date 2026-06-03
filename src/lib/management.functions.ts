import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const periodSchema = z
  .object({
    months: z.number().int().min(1).max(24).optional(),
  })
  .optional();

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function buildMonths(months: number) {
  const out: { key: string; label: string; year: number; month: number }[] = [];
  const now = new Date();
  const cur = new Date(now.getFullYear(), now.getMonth(), 1);
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(cur.getFullYear(), cur.getMonth() - i, 1);
    out.push({
      key: monthKey(d),
      label: d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", ""),
      year: d.getFullYear(),
      month: d.getMonth() + 1,
    });
  }
  return out;
}

function daysBetween(a: string, b: string) {
  const ms = new Date(b).getTime() - new Date(a).getTime();
  return Math.max(1, Math.round(ms / 86400000) + 1);
}

/** Visão consolidada para a tela inicial de Gestão. */
export const getManagementOverview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => periodSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const months = data?.months ?? 6;
    const buckets = buildMonths(months);
    const fromISO = `${buckets[0].key}-01`;

    const [employeesRes, absencesRes, candidatesRes] = await Promise.all([
      supabase.from("employees").select("id, admission_date, termination_date, termination_reason, department, full_name"),
      supabase.from("absences").select("id, employee_id, start_date, end_date, reason, hours_lost").gte("start_date", fromISO),
      supabase.from("candidates").select("id, status, full_name, position, created_at"),
    ]);

    const employees = employeesRes.data ?? [];
    const absences = absencesRes.data ?? [];
    const candidates = candidatesRes.data ?? [];

    const activeNow = employees.filter((e) => !e.termination_date).length;

    // Series
    const series = buckets.map((b) => {
      const startOfMonth = new Date(b.year, b.month - 1, 1);
      const endOfMonth = new Date(b.year, b.month, 0);
      const activeStart = employees.filter(
        (e) =>
          new Date(e.admission_date) <= startOfMonth &&
          (!e.termination_date || new Date(e.termination_date) >= startOfMonth),
      ).length || 1;

      const hires = employees.filter((e) => monthKey(new Date(e.admission_date)) === b.key).length;
      const terms = employees.filter(
        (e) => e.termination_date && monthKey(new Date(e.termination_date)) === b.key,
      ).length;
      const hoursLost = absences
        .filter((a) => monthKey(new Date(a.start_date)) === b.key)
        .reduce((sum, a) => sum + Number(a.hours_lost ?? 0), 0);

      const absenteeism = (hoursLost / (activeStart * 220)) * 100;
      const turnover = ((hires + terms) / 2 / activeStart) * 100;

      return {
        month: b.label,
        key: b.key,
        admissions: hires,
        terminations: terms,
        hours_lost: Math.round(hoursLost * 10) / 10,
        absenteeism_rate: Math.round(absenteeism * 100) / 100,
        turnover_rate: Math.round(turnover * 100) / 100,
      };
    });

    const fromDate = new Date(fromISO);
    const periodAdmissions = employees.filter((e) => new Date(e.admission_date) >= fromDate).length;
    const periodTerminations = employees.filter(
      (e) => e.termination_date && new Date(e.termination_date) >= fromDate,
    ).length;
    const probationTerminations = employees.filter((e) => {
      if (!e.termination_date) return false;
      if (new Date(e.termination_date) < fromDate) return false;
      return daysBetween(e.admission_date, e.termination_date) <= 90;
    }).length;

    const last = series[series.length - 1];
    const prev = series[series.length - 2] ?? last;

    // Absence breakdown
    const absencesByReason = ["atestado", "falta_justificada", "falta_injustificada", "licenca"].map((r) => ({
      reason: r,
      hours: Math.round(
        absences.filter((a) => a.reason === r).reduce((s, a) => s + Number(a.hours_lost ?? 0), 0) * 10,
      ) / 10,
    }));

    // Top absentees
    const byEmp = new Map<string, number>();
    for (const a of absences) byEmp.set(a.employee_id, (byEmp.get(a.employee_id) ?? 0) + Number(a.hours_lost ?? 0));
    const empMap = new Map(employees.map((e) => [e.id, e]));
    const topAbsentees = [...byEmp.entries()]
      .map(([id, hours]) => ({
        id,
        name: empMap.get(id)?.full_name ?? "—",
        department: empMap.get(id)?.department ?? "—",
        hours: Math.round(hours * 10) / 10,
      }))
      .sort((a, b) => b.hours - a.hours)
      .slice(0, 10);

    // Termination reasons
    const termReasons = ["pedido_demissao", "sem_justa_causa", "justa_causa", "fim_experiencia", "acordo"].map((r) => ({
      reason: r,
      count: employees.filter(
        (e) => e.termination_reason === r && e.termination_date && new Date(e.termination_date) >= fromDate,
      ).length,
    }));

    // Recent terminations
    const recentTerminations = employees
      .filter((e) => e.termination_date)
      .sort((a, b) => (a.termination_date! < b.termination_date! ? 1 : -1))
      .slice(0, 10)
      .map((e) => ({
        id: e.id,
        name: e.full_name,
        department: e.department ?? "—",
        admission_date: e.admission_date,
        termination_date: e.termination_date,
        reason: e.termination_reason ?? "—",
        days: daysBetween(e.admission_date, e.termination_date!),
      }));

    // Pipeline
    const pipeline = {
      curriculos: candidates.length,
      em_analise: candidates.filter((c) => c.status === "em_analise").length,
      aprovados_aguardando: candidates.filter((c) => c.status === "aprovado").length,
      pendentes: candidates.filter((c) => c.status === "pendente").length,
      rejeitados: candidates.filter((c) => c.status === "rejeitado").length,
    };

    const pendingOnboarding = candidates
      .filter((c) => c.status === "aprovado")
      .map((c) => ({ id: c.id, name: c.full_name, position: c.position ?? "—", created_at: c.created_at }));

    return {
      months,
      kpis: {
        active_employees: activeNow,
        absenteeism_rate: last?.absenteeism_rate ?? 0,
        absenteeism_delta: (last?.absenteeism_rate ?? 0) - (prev?.absenteeism_rate ?? 0),
        turnover_rate: last?.turnover_rate ?? 0,
        turnover_delta: (last?.turnover_rate ?? 0) - (prev?.turnover_rate ?? 0),
        period_admissions: periodAdmissions,
        period_terminations: periodTerminations,
        probation_terminations: probationTerminations,
        curriculos_periodo: candidates.filter((c) => new Date(c.created_at) >= fromDate).length,
        em_integracao: pipeline.aprovados_aguardando,
      },
      series,
      absences_by_reason: absencesByReason,
      top_absentees: topAbsentees,
      termination_reasons: termReasons,
      recent_terminations: recentTerminations,
      pipeline,
      pending_onboarding: pendingOnboarding,
    };
  });

/* ------------ CRUD para alimentar dados ------------ */

const createEmployeeSchema = z.object({
  full_name: z.string().trim().min(2).max(120),
  position: z.string().trim().max(120).optional().or(z.literal("")),
  department: z.string().trim().max(120).optional().or(z.literal("")),
  admission_date: z.string().min(8).max(20),
  candidate_id: z.string().uuid().optional(),
});

export const createEmployee = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => createEmployeeSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error, data: row } = await supabase
      .from("employees")
      .insert({
        created_by: userId,
        full_name: data.full_name,
        position: data.position || null,
        department: data.department || null,
        admission_date: data.admission_date,
        candidate_id: data.candidate_id ?? null,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

const terminateSchema = z.object({
  employee_id: z.string().uuid(),
  termination_date: z.string().min(8).max(20),
  reason: z.enum(["pedido_demissao", "sem_justa_causa", "justa_causa", "fim_experiencia", "acordo"]),
});

export const terminateEmployee = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => terminateSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase
      .from("employees")
      .update({ termination_date: data.termination_date, termination_reason: data.reason })
      .eq("id", data.employee_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const createAbsenceSchema = z.object({
  employee_id: z.string().uuid(),
  start_date: z.string().min(8).max(20),
  end_date: z.string().min(8).max(20),
  reason: z.enum(["atestado", "falta_justificada", "falta_injustificada", "licenca"]),
  hours_lost: z.number().min(0).max(999).default(8),
  notes: z.string().max(500).optional(),
});

export const createAbsence = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => createAbsenceSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("absences").insert({
      created_by: userId,
      employee_id: data.employee_id,
      start_date: data.start_date,
      end_date: data.end_date,
      reason: data.reason,
      hours_lost: data.hours_lost,
      notes: data.notes ?? null,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listEmployees = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await supabase
      .from("employees")
      .select("id, full_name, position, department, admission_date, termination_date, termination_reason")
      .order("admission_date", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);
    return data ?? [];
  });