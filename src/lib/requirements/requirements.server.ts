// Requisitos dinâmicos de documentos por perfil de candidato.
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Database } from "@/integrations/supabase/types";

export type DocType = Database["public"]["Enums"]["document_type"];

export interface CandidateProfile {
  position?: string | null;
  sexo?: string | null;
  estado_civil?: string | null;
}

export interface RequirementRule {
  id: string;
  document_type: DocType;
  label: string;
  condition: Record<string, unknown>;
  is_active: boolean;
}

function matches(rule: RequirementRule, profile: CandidateProfile): boolean {
  const c = rule.condition ?? {};
  const roleContains = typeof c.role_contains === "string" ? c.role_contains.toLowerCase() : null;
  if (roleContains && !(profile.position ?? "").toLowerCase().includes(roleContains)) return false;
  const sexo = typeof c.sexo === "string" ? c.sexo.toLowerCase() : null;
  if (sexo && (profile.sexo ?? "").toLowerCase() !== sexo) return false;
  const estadoCivil = typeof c.estado_civil === "string" ? c.estado_civil.toLowerCase() : null;
  if (estadoCivil && (profile.estado_civil ?? "").toLowerCase() !== estadoCivil) return false;
  return true;
}

export async function requiredDocumentsFor(profile: CandidateProfile): Promise<RequirementRule[]> {
  const { data } = await supabaseAdmin
    .from("document_requirements")
    .select("id, document_type, label, condition, is_active")
    .eq("is_active", true);
  const rules = ((data ?? []) as unknown as RequirementRule[]).filter((r) => matches(r, profile));
  // Deduplica por document_type mantendo a primeira label
  const seen = new Set<DocType>();
  const out: RequirementRule[] = [];
  for (const r of rules) {
    if (seen.has(r.document_type)) continue;
    seen.add(r.document_type);
    out.push(r);
  }
  return out;
}

export function missingDocs(required: RequirementRule[], present: DocType[]): RequirementRule[] {
  const set = new Set(present);
  return required.filter((r) => !set.has(r.document_type));
}