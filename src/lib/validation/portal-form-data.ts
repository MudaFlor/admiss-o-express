// Saneia o form_data enviado pelo portal público: campos controlados pelo RH/servidor
// nunca vêm do candidato, e o tamanho do objeto é limitado.
export const SERVER_MANAGED_FORM_KEYS = ["perfil_recrutamento", "conduzido_por_rh", "ficha", "merged_from", "hr"] as const;
const FORBIDDEN = new Set(["__proto__", "constructor", "prototype"]);
const MAX_KEYS = 200;
const MAX_JSON_BYTES = 200_000;

export function sanitizePortalFormData(input: Record<string, unknown>, existing: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  let count = 0;
  for (const [k, v] of Object.entries(input)) {
    if (FORBIDDEN.has(k) || k.startsWith("_") || (SERVER_MANAGED_FORM_KEYS as readonly string[]).includes(k)) continue;
    if (k.length > 80) continue;
    if (++count > MAX_KEYS) throw new Error("Formulário com campos demais.");
    out[k] = v;
  }
  if (JSON.stringify(out).length > MAX_JSON_BYTES) throw new Error("Formulário muito grande.");
  for (const k of SERVER_MANAGED_FORM_KEYS) if (k in existing) out[k] = existing[k];
  return out;
}
