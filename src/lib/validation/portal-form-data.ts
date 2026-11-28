// Saneia o form_data enviado pelo portal público: só os campos do formulário do candidato
// (lista fechada) são aceitos; campos controlados pelo RH/servidor vêm do registro salvo.
export const SERVER_MANAGED_FORM_KEYS = ["perfil_recrutamento", "conduzido_por_rh", "ficha", "merged_from", "hr"] as const;
export const PORTAL_FORM_KEYS = [
  "full_name", "cpf", "rg", "rg_emissao", "data_nascimento", "local_nascimento", "nome_pai", "nome_mae",
  "email", "telefone", "endereco", "linkedin", "formacao", "experiencias", "competencias", "sexo",
  "cor_raca", "estado_civil", "ctps_emissao",
] as const;
const MAX_TEXT = 5_000;
const MAX_JSON_BYTES = 200_000;

export function sanitizePortalFormData(input: Record<string, unknown>, existing: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k of PORTAL_FORM_KEYS) {
    if (!Object.prototype.hasOwnProperty.call(input, k)) continue;
    const v = input[k];
    if (v == null) continue;
    if (typeof v !== "string") throw new Error("Formulário inválido.");
    out[k] = v.slice(0, MAX_TEXT);
  }
  // Valores revisados dos documentos: validados campo a campo na finalização.
  const reviewed = input["documentos_revisados"];
  if (reviewed && typeof reviewed === "object" && !Array.isArray(reviewed)) out["documentos_revisados"] = reviewed;
  if (JSON.stringify(out).length > MAX_JSON_BYTES) throw new Error("Formulário muito grande.");
  for (const k of SERVER_MANAGED_FORM_KEYS) if (k in existing) out[k] = existing[k];
  return out;
}
