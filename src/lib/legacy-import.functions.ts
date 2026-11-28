import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { logAudit } from "@/lib/audit.server";
import { currentRegistrationDate } from "@/lib/validation/candidate-registration-date";
import { isLegacyImportOpen, LEGACY_IMPORT_MAX_ROWS, parseRows } from "@/lib/import/legacy-import";

const schema = z.object({
  kind: z.enum(["candidatos", "colaboradores"]),
  text: z.string().max(1_000_000),
});

/** Importação temporária e restrita ao RH de cadastros antigos. Nunca sobrescreve registros existentes. */
export const importLegacyRecords = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => schema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    if (!isLegacyImportOpen(currentRegistrationDate())) throw new Error("O prazo da importação de dados antigos terminou.");
    const { data: isHr } = await supabase.rpc("is_hr", { _user_id: userId });
    if (!isHr) throw new Error("Acesso restrito ao RH.");

    const skipped: { line: number; reason: string }[] = [];
    let created = 0;

    if (data.kind === "candidatos") {
      const { rows, missing } = parseRows("candidatos", data.text);
      if (missing.length) throw new Error("Colunas obrigatórias ausentes.");
      if (rows.length > LEGACY_IMPORT_MAX_ROWS) throw new Error(`Máximo de ${LEGACY_IMPORT_MAX_ROWS} linhas por vez.`);
      const { data: existing, error } = await supabase.from("candidates").select("cpf").not("cpf", "is", null);
      if (error) throw new Error("Não foi possível conferir os cadastros existentes.");
      const cpfs = new Set((existing ?? []).map((c) => (c.cpf ?? "").replace(/\D/g, "")));
      const toInsert = [];
      for (const r of rows) {
        if (!r.value) { skipped.push({ line: r.line, reason: r.errors.join("; ") }); continue; }
        if (r.value.cpf && cpfs.has(r.value.cpf)) { skipped.push({ line: r.line, reason: "CPF já cadastrado" }); continue; }
        const v = r.value;
        toInsert.push({
          created_by: userId, full_name: v.full_name, data_cadastro: v.data_cadastro, cpf: v.cpf, email: v.email,
          phone: v.phone, position: v.position, cidade: v.cidade, departamento: v.departamento, status: v.status,
          ...(v.status === "admitido" ? { stage: "admitido" as const, admitido: "Sim" } : {}),
          origem: "importacao",
        });
      }
      if (toInsert.length) {
        const { error: insErr } = await supabase.from("candidates").insert(toInsert);
        if (insErr) throw new Error("Falha ao gravar candidatos. Nada foi importado.");
        created = toInsert.length;
      }
    } else {
      const { rows, missing } = parseRows("colaboradores", data.text);
      if (missing.length) throw new Error("Colunas obrigatórias ausentes.");
      if (rows.length > LEGACY_IMPORT_MAX_ROWS) throw new Error(`Máximo de ${LEGACY_IMPORT_MAX_ROWS} linhas por vez.`);
      const { data: existing, error } = await supabase.from("employees").select("matricula_esocial, cpf");
      if (error) throw new Error("Não foi possível conferir os cadastros existentes.");
      const mats = new Set((existing ?? []).map((e) => (e.matricula_esocial ?? "").trim().toLowerCase()).filter(Boolean));
      const cpfs = new Set((existing ?? []).map((e) => (e.cpf ?? "").replace(/\D/g, "")).filter(Boolean));
      for (const r of rows) {
        if (!r.value) { skipped.push({ line: r.line, reason: r.errors.join("; ") }); continue; }
        const v = r.value;
        if (mats.has(v.matricula.toLowerCase())) { skipped.push({ line: r.line, reason: "CADASTRO JÁ EXISTE" }); continue; }
        if (v.cpf && cpfs.has(v.cpf)) { skipped.push({ line: r.line, reason: "CPF já cadastrado" }); continue; }
        const { data: row, error: insErr } = await supabase.from("employees").insert({
          created_by: userId, matricula_esocial: v.matricula, full_name: v.full_name, cpf: v.cpf,
          admission_date: v.admission_date, position: v.position, department: v.department,
          termination_date: v.termination_date,
          termination_reason: v.termination_reason as "pedido_demissao" | null,
        }).select("id").single();
        if (insErr || !row) { skipped.push({ line: r.line, reason: insErr?.code === "23505" ? "CADASTRO JÁ EXISTE" : "Falha ao gravar" }); continue; }
        mats.add(v.matricula.toLowerCase());
        if (v.cpf) cpfs.add(v.cpf);
        created++;
        await supabase.from("employee_history").insert({
          employee_id: row.id, kind: "admissao", description: "Importado de cadastro antigo.", actor_user_id: userId,
        });
      }
    }
    await logAudit({ actor_user_id: userId, action: "legacy_import", entity: data.kind, metadata: { created, skipped: skipped.length } });
    return { created, skipped };
  });
