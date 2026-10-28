export const DUPLICATE_ID_MESSAGE = "CADASTRO JÁ EXISTE";
export const CPF_EXISTS_CODE = "CPF_EXISTS";

export const normalizeMatricula = (v: string | null | undefined) => (v ?? "").trim();
export const normalizeCpf = (v: string | null | undefined) => (v ?? "").replace(/\D/g, "");

export type EmployeeIdCheck =
  | { ok: true }
  | { ok: false; code: "MATRICULA_REQUIRED" | "DUPLICATE_ID" | "CPF_EXISTS"; message: string };

/** Regras de cadastro de colaborador: matrícula obrigatória e única; CPF repetido pede confirmação. */
export function checkNewEmployee(args: {
  matricula: string;
  cpf?: string | null;
  existing: { matricula: string | null; cpf: string | null }[];
  confirmDuplicateCpf?: boolean;
}): EmployeeIdCheck {
  const m = normalizeMatricula(args.matricula);
  if (!m) return { ok: false, code: "MATRICULA_REQUIRED", message: "Nº de matrícula é obrigatório" };
  if (args.existing.some((e) => normalizeMatricula(e.matricula).toLowerCase() === m.toLowerCase()))
    return { ok: false, code: "DUPLICATE_ID", message: DUPLICATE_ID_MESSAGE };
  const cpf = normalizeCpf(args.cpf);
  if (cpf && !args.confirmDuplicateCpf && args.existing.some((e) => normalizeCpf(e.cpf) === cpf))
    return { ok: false, code: "CPF_EXISTS", message: CPF_EXISTS_CODE };
  return { ok: true };
}
