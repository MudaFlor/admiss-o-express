// Regra de recusa de documento ilegível (função pura, testável).
export const ILLEGIBLE_MESSAGE =
  "Imagem do documento está ilegível, por gentileza reenviar documento.";

export const CTPS_DIGITAL_MESSAGE =
  "Documento recusado: aceitamos somente a Carteira de Trabalho Digital (deve constar \"Carteira de Trabalho Digital\" no arquivo). Por gentileza, reenvie o documento correto.";

export const OCR_TYPES = new Set([
  "rg", "cpf", "cnh", "ctps", "comprovante_residencia", "titulo_eleitor", "certidao",
  "pis_pasep", "cartao_sus", "dependente_certidao", "dependente_rg_cpf",
]);

export function typeRequiresOcr(type: string): boolean {
  return OCR_TYPES.has(type);
}

export function isIllegible(
  type: string,
  ocr: { status: "sucesso" | "falha"; fields: Record<string, string> },
): boolean {
  if (!typeRequiresOcr(type)) return false;
  return ocr.status === "falha" || Object.keys(ocr.fields).length === 0;
}

const norm = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ");

/** CTPS só é aceita se o termo "Carteira de Trabalho Digital" foi lido no arquivo. */
export function isCtpsDigital(fields: Record<string, string>): boolean {
  const termo = fields.termo_ctps_digital ?? "";
  return norm(termo).includes("carteira de trabalho digital");
}
