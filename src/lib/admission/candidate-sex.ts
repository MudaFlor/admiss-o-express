import { consolidateFicha, type FichaDoc } from "@/lib/ficha-consolidation";

export type CandidateSex = "feminino" | "masculino";

/** Usa a mesma consolidação exibida na ficha cadastral para validar a admissão. */
export function resolveCandidateSex(
  candidateSex: unknown,
  formData: Record<string, unknown>,
  documents: FichaDoc[],
): CandidateSex | null {
  const declared = {
    ...formData,
    sexo: typeof formData.sexo === "string" && formData.sexo.trim()
      ? formData.sexo
      : typeof candidateSex === "string" ? candidateSex : "",
  };
  const value = consolidateFicha(declared, documents).data.sexo?.trim().toLowerCase() ?? "";
  if (value.startsWith("f")) return "feminino";
  if (value.startsWith("m")) return "masculino";
  return null;
}
