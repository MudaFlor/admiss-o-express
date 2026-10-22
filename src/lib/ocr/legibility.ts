// Regra de recusa de documento ilegível (função pura, testável).
export const ILLEGIBLE_MESSAGE =
  "Imagem do documento está ilegível, por gentileza reenviar documento.";

export const OCR_TYPES = new Set([
  "rg", "cpf", "cnh", "comprovante_residencia", "titulo_eleitor", "certidao",
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
