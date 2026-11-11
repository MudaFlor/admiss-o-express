import { reviewedOcrData } from "@/lib/validation/candidate-submission";

export const DEPENDENT_CERTIFICATE_FIELDS = [
  "nome", "nome_pai", "nome_mae", "data_nascimento", "cpf", "numero_nativivo",
  "matricula", "registro", "livro", "pagina",
];

export const DEPENDENT_CERTIFICATE_INSTRUCTION = "Certidão de Nascimento de dependente — 'nome_pai' e 'nome_mae' são os pais do registrado (a criança), nunca os avós. 'numero_nativivo' é o número da Declaração de Nascido Vivo (DNV), também chamado número do nascido vivo/nativivo: extraia somente quando explicitamente identificado na certidão; nunca use matrícula, termo, registro ou CPF nesse campo. 'matricula' é a matrícula do registro civil, preserve todos os dígitos e zeros iniciais; 'registro' é o número de registro/termo quando explicitamente presente. 'livro' e 'pagina' (folha) são opcionais e só devem ser extraídos quando escritos; não derive esses valores da matrícula. Extraia CPF e nascimento somente do registrado. Retorne null para qualquer dado ausente ou ilegível.";

export type DependentIdentity = {
  id: string;
  full_name: string;
  birth_date: string | null;
  cpf: string | null;
  relationship: string | null;
};

export type DependentDocument = {
  id: string;
  type: string;
  dependent_id: string | null;
  ocr_data: unknown;
  label?: string | null;
  storage_path: string;
};

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

export function formatDependentCpf(value: string | null): string {
  const digits = (value ?? "").replace(/\D/g, "");
  return digits.length === 11 ? digits.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3.$4") : value || "—";
}

export function formatDependentBirthDate(value: string | null): string {
  if (!value) return "—";
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : value;
}

// Identity remains the candidate declaration; certificate details are derived without mutating OCR.
export function buildDependentRecord(dep: DependentIdentity, documents: DependentDocument[], formData?: unknown) {
  const linked = documents.filter((doc) => doc.dependent_id === dep.id);
  const reviews = record(record(formData).documentos_revisados);
  function documentValue(types: string[], ...keys: string[]): string | null {
    let best: { value: string; confidence: number } | undefined;
    for (const doc of linked.filter((item) => types.includes(item.type))) {
      const review = record(reviews[doc.id]);
      const corrections = Object.fromEntries(Object.entries(review).filter((entry): entry is [string, string] => typeof entry[1] === "string"));
      const raw = record(doc.ocr_data);
      const values = "values" in raw ? reviewedOcrData(raw, corrections).values : raw;
      const confidences = record(raw.confidences);
      for (const key of keys) {
        const value = values[key];
        if (typeof value !== "string" || !value.trim()) continue;
        const confidence = typeof corrections[key] === "string" ? 2 : typeof confidences[key] === "number" ? confidences[key] as number : 0;
        if (!best || confidence > best.confidence) best = { value: value.trim(), confidence };
      }
    }
    return best?.value ?? null;
  }
  const certificateValue = (...keys: string[]) => documentValue(["dependente_certidao"], ...keys);
  return {
    fullName: dep.full_name || certificateValue("nome") || "—",
    birthDate: formatDependentBirthDate(dep.birth_date || certificateValue("data_nascimento")),
    cpf: formatDependentCpf(dep.cpf || documentValue(["dependente_certidao", "dependente_rg_cpf"], "cpf")),
    liveBirthNumber: certificateValue("numero_nativivo", "numero_nascido_vivo", "dnv") || "—",
    registration: certificateValue("matricula", "registro") || "—",
    book: certificateValue("livro") || "—",
    page: certificateValue("pagina", "folha") || "—",
    documents: linked,
  };
}