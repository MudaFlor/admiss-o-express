import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { candidateRegistrationAddress, registrationDuplicateReasons } from "@/lib/validation/candidate-registration-duplicates";

export const checkCandidateRegistrationDuplicates = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({
    full_name: z.string().max(160).default(""),
    phone: z.string().max(40).default(""),
    email: z.string().max(255).default(""),
    endereco: z.string().max(500).default(""),
  }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: isHr, error: roleError } = await context.supabase.rpc("is_hr", { _user_id: context.userId });
    if (roleError || !isHr) throw new Error("Acesso restrito ao RH.");
    if (!Object.values(data).some((value) => value.trim())) return [];
    const matches: { id: string; full_name: string; created_at: string; reasons: string[] }[] = [];
    // Page through the authorized rows; never silently miss candidates after the API row limit.
    for (let offset = 0; ; offset += 500) {
      const { data: rows, error } = await context.supabase.from("candidates")
        .select("id, full_name, phone, email, form_data, created_at")
        .order("id").range(offset, offset + 499);
      if (error) throw new Error("Não foi possível verificar cadastros semelhantes. Tente novamente.");
      for (const row of rows ?? []) {
        const reasons = registrationDuplicateReasons(data, { ...row, endereco: candidateRegistrationAddress(row.form_data) });
        if (reasons.length) matches.push({ id: row.id, full_name: row.full_name, created_at: row.created_at, reasons });
      }
      if (!rows || rows.length < 500) break;
    }
    return matches.sort((a, b) => b.reasons.length - a.reasons.length || a.created_at.localeCompare(b.created_at)).slice(0, 5);
  });