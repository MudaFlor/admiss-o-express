/** Importação temporária de cadastros antigos: parser de planilha colada/CSV e validação pura. */
import { isValidCpf } from "@/lib/cpf";

/** Último dia (inclusive, horário de São Paulo) em que a importação fica disponível. */
export const LEGACY_IMPORT_UNTIL = "2027-01-31";
export const LEGACY_IMPORT_MAX_ROWS = 500;

export function isLegacyImportOpen(today: string): boolean {
  return today <= LEGACY_IMPORT_UNTIL;
}

export type ImportKind = "candidatos" | "colaboradores";

const strip = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");

const HEADERS: Record<ImportKind, Record<string, string[]>> = {
  candidatos: {
    data_cadastro: ["datadeinclusao", "datainclusao", "datacadastro", "datadecadastro", "data"],
    full_name: ["nome", "nomecompleto"],
    cpf: ["cpf"],
    email: ["email"],
    phone: ["telefone", "celular", "whatsapp", "fone"],
    position: ["cargo", "vaga"],
    cidade: ["cidade"],
    departamento: ["departamento", "setor"],
    status: ["status", "situacao"],
  },
  colaboradores: {
    matricula: ["matricula", "id", "idmatricula", "matriculaesocial", "codigo"],
    full_name: ["nome", "nomecompleto"],
    cpf: ["cpf"],
    admission_date: ["admissao", "dataadmissao", "datadeadmissao"],
    position: ["cargo", "funcao"],
    department: ["departamento", "setor"],
    termination_date: ["desligamento", "datadesligamento", "datadedesligamento"],
    termination_reason: ["motivo", "motivodesligamento", "motivododesligamento"],
  },
};

export const TEMPLATE_COLUMNS: Record<ImportKind, string[]> = {
  candidatos: ["Data de inclusão", "Nome", "CPF", "E-mail", "Telefone", "Cargo", "Cidade", "Departamento", "Status"],
  colaboradores: ["Matrícula", "Nome", "CPF", "Admissão", "Cargo", "Departamento", "Data desligamento", "Motivo desligamento"],
};

/** Divide texto colado do Excel (tab) ou CSV (; ou ,), respeitando aspas. */
export function parseTable(text: string): string[][] {
  const lines = text.replace(/\r\n?/g, "\n").split("\n").filter((l) => l.trim() !== "");
  const first = lines[0] ?? "";
  const sep = first.includes("\t") ? "\t" : first.includes(";") ? ";" : ",";
  return lines.map((line) => {
    const out: string[] = [];
    let cur = "";
    let quoted = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]!;
      if (ch === '"') {
        if (quoted && line[i + 1] === '"') { cur += '"'; i++; } else quoted = !quoted;
      } else if (ch === sep && !quoted) { out.push(cur.trim()); cur = ""; }
      else cur += ch;
    }
    out.push(cur.trim());
    return out;
  });
}

/** Aceita dd/mm/aaaa, dd-mm-aaaa ou aaaa-mm-dd; devolve aaaa-mm-dd válido ou null. */
export function toIsoDate(v: string): string | null {
  const s = v.trim();
  let y: string, m: string, d: string;
  let r = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (r) { y = r[1]!; m = r[2]!; d = r[3]!; }
  else {
    r = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
    if (!r) return null;
    d = r[1]!; m = r[2]!; y = r[3]!;
  }
  const iso = `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  const dt = new Date(`${iso}T12:00:00Z`);
  return !Number.isNaN(dt.getTime()) && dt.toISOString().slice(0, 10) === iso ? iso : null;
}

const STATUS: Record<string, "pendente" | "em_analise" | "aprovado" | "rejeitado" | "admitido"> = {
  pendente: "pendente", emanalise: "em_analise", analise: "em_analise", aprovado: "aprovado",
  rejeitado: "rejeitado", reprovado: "rejeitado", admitido: "admitido", contratado: "admitido",
};
const REASONS: Record<string, string> = {
  pedidodedemissao: "pedido_demissao", pedidodemissao: "pedido_demissao", semjustacausa: "sem_justa_causa",
  justacausa: "justa_causa", fimdeexperiencia: "fim_experiencia", fimexperiencia: "fim_experiencia", acordo: "acordo",
};

export type CandidateRow = {
  data_cadastro: string; full_name: string; cpf: string | null; email: string | null; phone: string | null;
  position: string | null; cidade: string | null; departamento: string | null;
  status: "pendente" | "em_analise" | "aprovado" | "rejeitado" | "admitido";
};
export type EmployeeRow = {
  matricula: string; full_name: string; cpf: string | null; admission_date: string; position: string | null;
  department: string | null; termination_date: string | null; termination_reason: string | null;
};
export type ParsedRow<T> = { line: number; value: T | null; errors: string[] };

function mapHeader(kind: ImportKind, header: string[]) {
  const idx: Record<string, number> = {};
  header.forEach((h, i) => {
    const k = strip(h);
    for (const [field, names] of Object.entries(HEADERS[kind])) if (idx[field] === undefined && names.includes(k)) idx[field] = i;
  });
  return idx;
}

export function parseRows(kind: "candidatos", text: string): { rows: ParsedRow<CandidateRow>[]; missing: string[] };
export function parseRows(kind: "colaboradores", text: string): { rows: ParsedRow<EmployeeRow>[]; missing: string[] };
export function parseRows(kind: ImportKind, text: string) {
  const table = parseTable(text);
  const [header, ...body] = table;
  const idx = mapHeader(kind, header ?? []);
  const required = kind === "candidatos" ? ["full_name", "data_cadastro"] : ["matricula", "full_name", "admission_date"];
  const missing = required.filter((r) => idx[r] === undefined);
  if (missing.length) return { rows: [], missing };
  const get = (cells: string[], f: string) => { const i = idx[f]; return i === undefined ? "" : (cells[i] ?? "").trim(); };
  const seenKey = new Set<string>();
  const rows = body.map((cells, n) => {
    const errors: string[] = [];
    const line = n + 2;
    const name = get(cells, "full_name");
    if (name.length < 2) errors.push("Nome obrigatório");
    const cpfRaw = get(cells, "cpf").replace(/\D/g, "");
    const cpf = cpfRaw ? cpfRaw.padStart(11, "0") : null;
    if (cpf && !isValidCpf(cpf)) errors.push("CPF inválido");
    if (kind === "candidatos") {
      const date = toIsoDate(get(cells, "data_cadastro"));
      if (!date) errors.push("Data de inclusão inválida");
      const email = get(cells, "email") || null;
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push("E-mail inválido");
      const st = get(cells, "status");
      const status = st ? STATUS[strip(st)] : "pendente";
      if (!status) errors.push("Status desconhecido");
      if (cpf) { if (seenKey.has(cpf)) errors.push("CPF repetido na planilha"); seenKey.add(cpf); }
      const value: CandidateRow | null = errors.length ? null : {
        data_cadastro: date!, full_name: name, cpf, email, phone: get(cells, "phone") || null,
        position: get(cells, "position") || null, cidade: get(cells, "cidade") || null,
        departamento: get(cells, "departamento") || null, status: status!,
      };
      return { line, value, errors };
    }
    const matricula = get(cells, "matricula");
    if (!matricula) errors.push("Matrícula obrigatória");
    else { const k = matricula.toLowerCase(); if (seenKey.has(k)) errors.push("Matrícula repetida na planilha"); seenKey.add(k); }
    const adm = toIsoDate(get(cells, "admission_date"));
    if (!adm) errors.push("Data de admissão inválida");
    const termRaw = get(cells, "termination_date");
    const term = termRaw ? toIsoDate(termRaw) : null;
    if (termRaw && !term) errors.push("Data de desligamento inválida");
    if (term && adm && term < adm) errors.push("Desligamento antes da admissão");
    const reasonRaw = get(cells, "termination_reason");
    const reason = reasonRaw ? REASONS[strip(reasonRaw)] ?? null : null;
    if (reasonRaw && !reason) errors.push("Motivo de desligamento desconhecido");
    const value: EmployeeRow | null = errors.length ? null : {
      matricula, full_name: name, cpf, admission_date: adm!, position: get(cells, "position") || null,
      department: get(cells, "department") || null, termination_date: term, termination_reason: reason,
    };
    return { line, value, errors };
  });
  return { rows, missing };
}
