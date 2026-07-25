import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { logAudit } from "@/lib/audit.server";

export const parseCandidateFile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        filename: z.string().trim().min(1).max(255),
        base64: z.string().min(10).max(14_000_000),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { parseProfileFromFile } = await import("@/lib/ai/recruitment-parser.server");
    return parseProfileFromFile({ base64: data.base64, filename: data.filename });
  });

export const createCandidateFromProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        full_name: z.string().trim().min(2).max(160),
        email: z.string().trim().max(255).optional().or(z.literal("")),
        phone: z.string().trim().max(40).optional().or(z.literal("")),
        position: z.string().trim().max(160).optional().or(z.literal("")),
        idade: z.string().trim().max(10).optional().or(z.literal("")),
        data_nascimento: z.string().trim().max(30).optional().or(z.literal("")),
        endereco: z.string().trim().max(500).optional().or(z.literal("")),
        resumo_experiencias: z.string().trim().max(5000).optional().or(z.literal("")),
        palavras_chave: z.array(z.string().trim().max(60)).max(30).default([]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: created, error } = await supabase
      .from("candidates")
      .insert({
        created_by: userId,
        full_name: data.full_name,
        email: data.email || null,
        phone: data.phone || null,
        position: data.position || null,
        form_data: {
          perfil_recrutamento: {
            idade: data.idade || null,
            data_nascimento: data.data_nascimento || null,
            endereco: data.endereco || null,
            resumo_experiencias: data.resumo_experiencias || null,
            palavras_chave: data.palavras_chave,
          },
        } as never,
      })
      .select("id, access_token, full_name, phone")
      .single();
    if (error) throw new Error(error.message);

    await logAudit({
      actor_user_id: userId,
      action: "edit_basics",
      entity: "candidates",
      entity_id: created.id,
      metadata: { origem: "recrutamento", criado: true },
    });
    return created;
  });
