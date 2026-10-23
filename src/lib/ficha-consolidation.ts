// Consolida a ficha cadastral a partir dos documentos oficiais (função pura).
// Prioridade: correção manual do RH > documento mais confiável > declarado.

export type FichaDoc = { type: string; dependent_id?: string | null; ocr_data?: unknown };

export const FICHA_FIELDS: Array<[string, string]> = [
  ["full_name", "Nome completo"],
  ["cpf", "CPF"],
  ["rg", "RG / CIN"],
  ["orgao_emissor", "Órgão emissor"],
  ["rg_emissao", "Data de emissão do RG"],
  ["data_nascimento", "Data de nascimento"],
  ["sexo", "Sexo"],
  ["nacionalidade", "Nacionalidade"],
  ["local_nascimento", "Naturalidade"],
  ["nome_mae", "Nome da mãe"],
  ["nome_pai", "Nome do pai"],
  ["email", "E-mail"],
  ["phone", "Telefone"],
  ["endereco", "Endereço"],
  ["cidade", "Cidade"],
  ["uf", "UF"],
  ["cep", "CEP"],
  ["pis", "PIS / NIT"],
  ["titulo_eleitor", "Título de eleitor"],
  ["ctps_numero", "CTPS (número/série)"],
  ["ctps_emissao", "Data de emissão da CTPS"],
  ["cnh", "CNH (registro / categoria)"],
];

// [campo da ficha] -> lista ordenada de [tipo de documento, chave no OCR]
const SOURCES: Record<string, Array<[string, string]>> = {
  full_name: [["rg", "nome"], ["cnh", "nome"], ["cpf", "nome"], ["ctps", "nome"], ["pis_pasep", "nome"], ["titulo_eleitor", "nome"]],
  cpf: [["cpf", "cpf"], ["rg", "cpf"], ["cnh", "cpf"], ["ctps", "cpf"]],
  rg: [["rg", "rg"]],
  orgao_emissor: [["rg", "orgao_emissor"]],
  rg_emissao: [["rg", "data_emissao"]],
  data_nascimento: [["rg", "data_nascimento"], ["cnh", "data_nascimento"], ["cpf", "data_nascimento"], ["titulo_eleitor", "data_nascimento"]],
  sexo: [["rg", "sexo"], ["cnh", "sexo"], ["cpf", "sexo"]],
  nacionalidade: [["rg", "nacionalidade"], ["cnh", "nacionalidade"], ["cpf", "nacionalidade"]],
  local_nascimento: [["rg", "naturalidade"], ["cnh", "naturalidade"]],
  nome_mae: [["rg", "nome_mae"], ["cnh", "nome_mae"]],
  nome_pai: [["rg", "nome_pai"], ["cnh", "nome_pai"]],
  cidade: [["comprovante_residencia", "cidade"]],
  uf: [["comprovante_residencia", "uf"]],
  cep: [["comprovante_residencia", "cep"]],
  pis: [["pis_pasep", "nit"], ["pis_pasep", "pis"], ["ctps", "pis"]],
  titulo_eleitor: [["titulo_eleitor", "inscricao"]],
  ctps_numero: [["ctps", "numero"]],
  ctps_emissao: [["ctps", "data_emissao"]],
};

function values(doc: FichaDoc): Record<string, string> {
  const o = (doc.ocr_data ?? {}) as { values?: Record<string, unknown> };
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(o.values ?? {})) if (v != null && String(v).trim()) out[k] = String(v).trim();
  return out;
}

export type FichaValue = { value: string; origem: string };

export function consolidateFicha(
  declared: Record<string, unknown>,
  documents: FichaDoc[],
): { data: Record<string, string>; origem: Record<string, string> } {
  const own = documents.filter((d) => !d.dependent_id);
  const byType = new Map<string, Record<string, string>>();
  for (const d of own) {
    const v = values(d);
    const prev = byType.get(d.type);
    byType.set(d.type, { ...v, ...(prev ?? {}) });
  }
  const overrides = new Set(Array.isArray(declared._rh_overrides) ? (declared._rh_overrides as string[]) : []);
  const reviewed = (declared.documentos_revisados ?? {}) as Record<string, Record<string, string>>;
  void reviewed;
  const data: Record<string, string> = {};
  const origem: Record<string, string> = {};
  const decl = (k: string) => {
    const v = declared[k];
    return typeof v === "string" ? v.trim() : "";
  };
  const fromDocs = (k: string): FichaValue | null => {
    if (k === "endereco") {
      const c = byType.get("comprovante_residencia");
      if (c?.logradouro) {
        const parts = [[c.logradouro, c.numero].filter(Boolean).join(", "), c.complemento, c.bairro].filter(Boolean);
        return { value: parts.join(" — "), origem: "comprovante_residencia" };
      }
      return null;
    }
    if (k === "cnh") {
      const c = byType.get("cnh");
      if (c?.numero_registro) return { value: [c.numero_registro, c.categoria].filter(Boolean).join(" / "), origem: "cnh" };
      return null;
    }
    for (const [type, key] of SOURCES[k] ?? []) {
      const v = byType.get(type)?.[key];
      if (v) return { value: v, origem: type };
    }
    return null;
  };
  const aliases: Record<string, string[]> = { phone: ["phone", "telefone"] };
  for (const [k] of FICHA_FIELDS) {
    const declaredValue = (aliases[k] ?? [k]).map(decl).find(Boolean) ?? "";
    const doc = overrides.has(k) ? null : fromDocs(k);
    if (doc) {
      data[k] = doc.value;
      origem[k] = doc.origem;
    } else {
      data[k] = declaredValue;
      origem[k] = declaredValue ? (overrides.has(k) ? "rh" : "declarado") : "";
    }
  }
  data.cor_raca = decl("cor_raca");
  data.estado_civil = decl("estado_civil");
  return { data, origem };
}

export const ORIGEM_LABEL: Record<string, string> = {
  rg: "RG / CIN",
  cnh: "CNH",
  cpf: "CPF",
  ctps: "CTPS",
  pis_pasep: "PIS",
  titulo_eleitor: "Título",
  comprovante_residencia: "Comprovante de residência",
  declarado: "Declarado",
  rh: "Corrigido pelo RH",
};
