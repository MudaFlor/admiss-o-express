// Validação cruzada de dados entre documentos extraídos por OCR e os dados
// declarados pelo candidato. Função pura — pode rodar no cliente e no servidor.

export type CrossCheckStatus = "ok" | "divergente" | "ausente";

export interface CrossCheckValue {
  origem: string; // ex.: "rg", "cpf", "declarado"
  origem_label: string;
  valor: string;
  confianca: number | null;
}

export interface CrossCheckField {
  campo: string;
  label: string;
  status: CrossCheckStatus;
  referencia: CrossCheckValue | null;
  valores: CrossCheckValue[];
}

export interface CrossCheckResult {
  fields: CrossCheckField[];
  summary: { ok: number; divergente: number; ausente: number; total: number };
}

export interface CrossCheckInput {
  declared: {
    full_name?: string | null;
    cpf?: string | null;
    data_nascimento?: string | null;
    nome_pai?: string | null;
    nome_mae?: string | null;
  };
  documents: Array<{
    type: string;
    dependent_id?: string | null;
    ocr_data?: unknown;
  }>;
}

// ---------- normalizadores ----------

function normName(v: string | null | undefined): string {
  if (!v) return "";
  return v
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z\s]/g, " ")
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim();
}

function normCpf(v: string | null | undefined): string {
  if (!v) return "";
  return v.replace(/\D/g, "");
}

function normDate(v: string | null | undefined): string {
  if (!v) return "";
  const m = v.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m) return `${m[1]}/${m[2]}/${m[3]}`;
  const iso = v.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;
  return v.trim();
}

function nameMatches(a: string, b: string): boolean {
  if (!a || !b) return false;
  if (a === b) return true;
  const wordsA = a.split(" ").filter(Boolean);
  const wordsB = b.split(" ").filter(Boolean);
  if (wordsA.length === 0 || wordsB.length === 0) return false;
  const setA = new Set(wordsA);
  const setB = new Set(wordsB);
  const subsetAB = wordsA.every((w) => setB.has(w));
  const subsetBA = wordsB.every((w) => setA.has(w));
  return subsetAB || subsetBA;
}

function eq(field: string, a: string, b: string): boolean {
  if (field === "cpf") return a === b && a.length === 11;
  if (field === "data_nascimento") return a === b && /^\d{2}\/\d{2}\/\d{4}$/.test(a);
  // names
  return nameMatches(a, b);
}

function normalize(field: string, raw: string): string {
  if (field === "cpf") return normCpf(raw);
  if (field === "data_nascimento") return normDate(raw);
  return normName(raw);
}

// ---------- mapeamento campo x documento ----------

// Origem → label amigável
const DOC_LABEL: Record<string, string> = {
  declarado: "Declarado pelo candidato",
  rg: "RG / CIN",
  cpf: "CPF",
  cnh: "CNH",
  certidao: "Certidão",
  titulo_eleitor: "Título de Eleitor",
  pis_pasep: "PIS/PASEP",
  cartao_sus: "Cartão SUS",
  curriculo: "Currículo",
};

// Quais documentos contribuem para cada campo (em ordem de prioridade — primeiro = referência)
const SOURCES: Record<string, string[]> = {
  cpf: ["cpf", "rg", "cnh"],
  full_name: ["rg", "cpf", "cnh", "certidao", "titulo_eleitor", "pis_pasep", "cartao_sus"],
  data_nascimento: ["rg", "cpf", "cnh", "certidao", "titulo_eleitor"],
  nome_mae: ["rg", "certidao"],
  nome_pai: ["rg", "certidao"],
};

// Em cada documento, qual chave do ocr_data.values traz o valor desse campo.
// Default: mesma chave do campo.
const FIELD_KEY_IN_DOC: Record<string, Record<string, string>> = {
  full_name: {
    rg: "nome", cpf: "nome", cnh: "nome", certidao: "nome",
    titulo_eleitor: "nome", pis_pasep: "nome", cartao_sus: "nome",
  },
};

const FIELD_LABEL: Record<string, string> = {
  cpf: "CPF",
  full_name: "Nome completo",
  data_nascimento: "Data de nascimento",
  nome_mae: "Nome da mãe",
  nome_pai: "Nome do pai",
};

function getDocValue(field: string, docType: string, ocrData: unknown): { valor: string; confianca: number | null } | null {
  if (!ocrData || typeof ocrData !== "object") return null;
  const raw = ocrData as { values?: Record<string, unknown>; confidences?: Record<string, number> };
  const values = raw.values && typeof raw.values === "object" ? raw.values : raw as Record<string, unknown>;
  const key = FIELD_KEY_IN_DOC[field]?.[docType] ?? field;
  const v = values?.[key];
  if (typeof v !== "string" || !v.trim()) return null;
  const c = raw.confidences && typeof raw.confidences === "object" ? raw.confidences[key] : undefined;
  return { valor: v, confianca: typeof c === "number" ? c : null };
}

function getDeclared(field: string, declared: CrossCheckInput["declared"]): string | null {
  const v = declared[field as keyof CrossCheckInput["declared"]];
  return typeof v === "string" && v.trim() ? v : null;
}

export function crossCheckCandidate(input: CrossCheckInput): CrossCheckResult {
  const holderDocs = input.documents.filter((d) => !d.dependent_id);
  const fields: CrossCheckField[] = [];

  for (const campo of Object.keys(SOURCES)) {
    const sources = SOURCES[campo];
    const collected: CrossCheckValue[] = [];

    // Documentos, em ordem de prioridade
    for (const docType of sources) {
      const doc = holderDocs.find((d) => d.type === docType);
      if (!doc) continue;
      const v = getDocValue(campo, docType, doc.ocr_data);
      if (!v) continue;
      collected.push({
        origem: docType,
        origem_label: DOC_LABEL[docType] ?? docType,
        valor: v.valor,
        confianca: v.confianca,
      });
    }
    // Declarado pelo candidato
    const decl = getDeclared(campo, input.declared);
    if (decl) {
      collected.push({
        origem: "declarado",
        origem_label: DOC_LABEL.declarado,
        valor: decl,
        confianca: null,
      });
    }

    if (collected.length === 0) {
      fields.push({ campo, label: FIELD_LABEL[campo] ?? campo, status: "ausente", referencia: null, valores: [] });
      continue;
    }

    const referencia = collected[0];
    if (collected.length === 1) {
      fields.push({ campo, label: FIELD_LABEL[campo] ?? campo, status: "ok", referencia, valores: collected });
      continue;
    }

    const refNorm = normalize(campo, referencia.valor);
    const allMatch = collected.every((c) => eq(campo, normalize(campo, c.valor), refNorm));
    fields.push({
      campo,
      label: FIELD_LABEL[campo] ?? campo,
      status: allMatch ? "ok" : "divergente",
      referencia,
      valores: collected,
    });
  }

  const summary = fields.reduce(
    (acc, f) => {
      acc.total += 1;
      acc[f.status] += 1;
      return acc;
    },
    { ok: 0, divergente: 0, ausente: 0, total: 0 },
  );

  return { fields, summary };
}

// Helpers para extrair input das estruturas usadas no app
export function extractDeclaredFromFormData(formData: Record<string, unknown> | null | undefined, fallback?: { full_name?: string | null; cpf?: string | null }): CrossCheckInput["declared"] {
  const f = (formData ?? {}) as Record<string, unknown>;
  const pick = (k: string) => (typeof f[k] === "string" ? (f[k] as string) : null);
  return {
    full_name: pick("full_name") ?? fallback?.full_name ?? null,
    cpf: pick("cpf") ?? fallback?.cpf ?? null,
    data_nascimento: pick("data_nascimento"),
    nome_pai: pick("nome_pai"),
    nome_mae: pick("nome_mae"),
  };
}