// Catálogo (client-safe) de itens que o RH pode marcar como pendentes de correção.
export const CORRECTION_FIELDS = [
  { key: "full_name", label: "Nome completo" },
  { key: "cpf", label: "CPF" },
  { key: "rg", label: "RG / documento de identidade" },
  { key: "birth_date", label: "Data de nascimento" },
  { key: "email", label: "E-mail" },
  { key: "phone", label: "Telefone" },
  { key: "address", label: "Endereço / CEP" },
  { key: "bank", label: "Dados bancários" },
  { key: "ctps", label: "Dados da carteira de trabalho" },
  { key: "pis", label: "PIS/PASEP" },
  { key: "escolaridade", label: "Escolaridade" },
  { key: "dependents", label: "Dependentes" },
] as const;

export type CorrectionFieldKey = (typeof CORRECTION_FIELDS)[number]["key"];

export const CORRECTION_FIELD_LABEL: Record<string, string> = Object.fromEntries(
  CORRECTION_FIELDS.map((f) => [f.key, f.label]),
);

export type CorrectionRequest = {
  id: string;
  candidate_id: string;
  fields: string[];
  documents: { type: string; label: string }[];
  note: string | null;
  status: string;
  created_at: string;
  resolved_at: string | null;
};
