// Workflow de admissão em 11 estágios. Server helpers.
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Database } from "@/integrations/supabase/types";

export type CandidateStage = Database["public"]["Enums"]["candidate_stage"];

export const STAGE_ORDER: readonly CandidateStage[] = [
  "cadastro_iniciado",
  "aceite_lgpd",
  "curriculo_enviado",
  "documentos_enviados",
  "ocr_concluido",
  "em_analise",
  "pendencia_documental",
  "correcao_solicitada",
  "aguardando_aprovacao",
  "aprovado",
  "admitido",
] as const;

export const STAGE_LABEL: Record<CandidateStage, string> = {
  cadastro_iniciado: "Cadastro iniciado",
  aceite_lgpd: "Aceite LGPD",
  curriculo_enviado: "Currículo enviado",
  documentos_enviados: "Documentos enviados",
  ocr_concluido: "OCR concluído",
  em_analise: "Em análise",
  pendencia_documental: "Pendência documental",
  correcao_solicitada: "Correção solicitada",
  aguardando_aprovacao: "Aguardando aprovação",
  aprovado: "Aprovado",
  admitido: "Admitido",
};

function rank(stage: CandidateStage): number {
  return STAGE_ORDER.indexOf(stage);
}

/**
 * Avança o estágio somente se o próximo for posterior ao atual, evitando regressões
 * automáticas por eventos do candidato (uploads, etc). Ações do RH usam setStage.
 */
export async function advanceStage(
  candidateId: string,
  next: CandidateStage,
  opts: { actor_user_id?: string | null; note?: string | null } = {},
): Promise<void> {
  const { data: cand } = await supabaseAdmin
    .from("candidates").select("stage").eq("id", candidateId).maybeSingle();
  if (!cand) return;
  const current = cand.stage as CandidateStage;
  if (rank(next) <= rank(current)) return;
  await writeStage(candidateId, current, next, opts);
}

/** Movimenta explicitamente (RH), permitindo voltar/avançar. */
export async function setStage(
  candidateId: string,
  next: CandidateStage,
  opts: { actor_user_id?: string | null; note?: string | null } = {},
): Promise<void> {
  const { data: cand } = await supabaseAdmin
    .from("candidates").select("stage").eq("id", candidateId).maybeSingle();
  if (!cand) return;
  const current = cand.stage as CandidateStage;
  if (current === next) return;
  await writeStage(candidateId, current, next, opts);
}

async function writeStage(
  candidateId: string,
  current: CandidateStage,
  next: CandidateStage,
  opts: { actor_user_id?: string | null; note?: string | null },
) {
  const now = new Date().toISOString();
  await supabaseAdmin
    .from("candidates")
    .update({
      stage: next,
      stage_updated_at: now,
      stage_updated_by: opts.actor_user_id ?? null,
      stage_note: opts.note ?? null,
    })
    .eq("id", candidateId);
  await supabaseAdmin.from("candidate_stage_history").insert({
    candidate_id: candidateId,
    from_stage: current,
    to_stage: next,
    actor_user_id: opts.actor_user_id ?? null,
    note: opts.note ?? null,
  });
}