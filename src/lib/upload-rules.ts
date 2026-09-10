// Regras de arquivo compartilhadas entre portal (cliente) e servidor.
// Mantidas em um módulo client-safe para que a validação seja idêntica nos dois lados.

export const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB por arquivo

export const ALLOWED_EXTENSIONS = [
  "pdf",
  "jpg",
  "jpeg",
  "png",
  "webp",
  "heic",
  "heif",
  "docx",
] as const;

export const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
] as const;

export function isAllowedExtension(ext: string): boolean {
  return (ALLOWED_EXTENSIONS as readonly string[]).includes(ext.toLowerCase());
}

export function isAllowedMime(mime: string | null | undefined): boolean {
  if (!mime) return false;
  return (ALLOWED_MIME_TYPES as readonly string[]).includes(mime.toLowerCase().split(";")[0]!.trim());
}

/** Validação no cliente antes de subir o arquivo. Devolve mensagem de erro ou null. */
export function validateFile(file: { name: string; size: number; type: string }): string | null {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!isAllowedExtension(ext)) {
    return "Formato não aceito. Envie PDF, DOCX ou foto (JPG/PNG/WEBP/HEIC).";
  }
  if (file.size > MAX_FILE_BYTES) {
    return "Arquivo maior que 10 MB. Reduza a qualidade da foto e tente novamente.";
  }
  if (file.size === 0) return "Arquivo vazio.";
  if (file.type && !isAllowedMime(file.type)) {
    return "Tipo de arquivo não aceito. Envie PDF, DOCX ou foto.";
  }
  return null;
}
