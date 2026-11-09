import { MAX_FILE_BYTES } from "@/lib/upload-rules";

export type ResumeProfileForDocument = {
  full_name?: string | null;
  data_nascimento?: string | null;
  idade?: string | number | null;
  endereco?: string | null;
  email?: string | null;
  telefone?: string | null;
  cargo?: string | null;
  resumo_experiencias?: string | null;
  palavras_chave?: string[];
};

export function validateResumePdf(filename: string, bytes: Uint8Array): string | null {
  if (!/\.pdf$/i.test(filename.trim())) return "Anexe o currículo em formato PDF.";
  if (bytes.byteLength === 0) return "O arquivo do currículo está vazio.";
  if (bytes.byteLength > MAX_FILE_BYTES) return "O currículo deve ter no máximo 10 MB.";
  const signature = [0x25, 0x50, 0x44, 0x46, 0x2d]; // %PDF-
  if (bytes.byteLength < signature.length || signature.some((byte, index) => bytes[index] !== byte)) {
    return "O arquivo não é um PDF válido. Anexe o currículo novamente.";
  }
  return null;
}

export function resumeDocumentValues(profile: ResumeProfileForDocument): Record<string, string> {
  const values: Record<string, string> = {
    full_name: profile.full_name ?? "",
    data_nascimento: profile.data_nascimento ?? "",
    idade: profile.idade == null ? "" : String(profile.idade),
    endereco: profile.endereco ?? "",
    email: profile.email ?? "",
    telefone: profile.telefone ?? "",
    cargo: profile.cargo ?? "",
    resumo_experiencias: profile.resumo_experiencias ?? "",
    palavras_chave: (profile.palavras_chave ?? []).join(", "),
  };
  return Object.fromEntries(
    Object.entries(values).filter(([, value]) => value.trim().length > 0),
  );
}
