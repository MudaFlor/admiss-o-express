export interface RegistrationProfile {
  full_name?: string | null;
  phone?: string | null;
  email?: string | null;
  endereco?: string | null;
}

const normalize = (value?: string | null) => (value ?? "").normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const phone = (value?: string | null) => {
  const digits = (value ?? "").replace(/\D/g, "");
  return digits.startsWith("55") && digits.length >= 12 ? digits.slice(2) : digits;
};

// Advisory only: do not reuse these broad matches for automatic merging.
export function registrationDuplicateReasons(draft: RegistrationProfile, existing: RegistrationProfile): string[] {
  const reasons: string[] = [];
  const a = normalize(draft.full_name).split(" ").filter(Boolean);
  const b = normalize(existing.full_name).split(" ").filter(Boolean);
  if (a.length >= 2 && b.length >= 2) {
    const shared = a.filter((word) => b.includes(word)).length;
    const union = new Set([...a, ...b]).size;
    if (a.join(" ") === b.join(" ") || shared / union >= 0.9) reasons.push("Nome");
  }
  const pa = phone(draft.phone), pb = phone(existing.phone);
  if (pa.length >= 10 && pa === pb) reasons.push("Telefone");
  const ea = draft.email?.trim().toLowerCase(), eb = existing.email?.trim().toLowerCase();
  if (ea && ea.includes("@") && ea === eb) reasons.push("E-mail");
  const aa = normalize(draft.endereco), ab = normalize(existing.endereco);
  if (aa.length >= 10 && aa === ab) reasons.push("Endereço");
  return reasons;
}

export function candidateRegistrationAddress(formData: unknown): string {
  if (!formData || typeof formData !== "object" || Array.isArray(formData)) return "";
  const form = formData as Record<string, unknown>;
  for (const section of [form.ficha, form.perfil_recrutamento, form]) {
    if (!section || typeof section !== "object" || Array.isArray(section)) continue;
    const record = section as Record<string, unknown>;
    if (typeof record.endereco === "string" && record.endereco.trim()) return record.endereco;
    if (typeof record.logradouro === "string" && record.logradouro.trim()) {
      return [record.logradouro, record.numero, record.bairro, record.cidade, record.uf].filter(Boolean).join(" ");
    }
  }
  return "";
}