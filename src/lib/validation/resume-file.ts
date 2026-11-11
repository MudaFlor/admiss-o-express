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

const RESUME_TYPES: Record<string, string> = {
  pdf: "application/pdf", jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png",
  webp: "image/webp", doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

export const RESUME_ACCEPT = ".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/jpeg,image/png,image/webp";

export function resumeFileType(filename: string) {
  const extension = filename.trim().split(".").pop()?.toLowerCase() ?? "";
  const mime = RESUME_TYPES[extension];
  return mime ? { extension, mime } : null;
}

export function validateResumeFile(filename: string, bytes: Uint8Array): string | null {
  const type = resumeFileType(filename);
  if (!type) return "Anexe o currículo em PDF, Word (DOC ou DOCX) ou imagem (JPG, PNG ou WEBP).";
  if (bytes.byteLength === 0) return "O arquivo do currículo está vazio.";
  if (bytes.byteLength > MAX_FILE_BYTES) return "O currículo deve ter no máximo 10 MB.";
  const starts = (signature: number[]) => bytes.length >= signature.length && signature.every((byte, index) => bytes[index] === byte);
  const valid = type.extension === "pdf" ? starts([0x25, 0x50, 0x44, 0x46, 0x2d])
    : ["jpg", "jpeg"].includes(type.extension) ? starts([0xff, 0xd8, 0xff])
    : type.extension === "png" ? starts([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    : type.extension === "webp" ? starts([0x52, 0x49, 0x46, 0x46]) && new TextDecoder().decode(bytes.slice(8, 12)) === "WEBP"
    : type.extension === "doc" ? starts([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])
    : starts([0x50, 0x4b, 0x03, 0x04]);
  if (!valid) return "O conteúdo do arquivo não corresponde ao formato informado. Anexe o currículo novamente.";
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
