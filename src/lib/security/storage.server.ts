// Verificação server-side do arquivo já enviado ao storage.
// O cliente pode mentir sobre extensão/tipo, então conferimos o objeto real
// (tamanho e mimetype registrados pelo storage) e apagamos o que não passar.
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { MAX_FILE_BYTES, isAllowedMime } from "@/lib/upload-rules";

const BUCKET = "candidate-documents";

/** Validade curta para links de documentos (dados pessoais sensíveis). */
export const SIGNED_URL_TTL_SECONDS = 5 * 60;

export async function signedDocumentUrl(path: string): Promise<string | null> {
  const { data } = await supabaseAdmin.storage.from(BUCKET).createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
  return data?.signedUrl ?? null;
}

/**
 * Confere o objeto recém-enviado. Em caso de reprovação o arquivo é removido
 * e a função lança um erro com mensagem amigável.
 */
export async function assertUploadedFileIsSafe(storagePath: string): Promise<void> {
  const slash = storagePath.lastIndexOf("/");
  const folder = slash > 0 ? storagePath.slice(0, slash) : "";
  const name = slash > 0 ? storagePath.slice(slash + 1) : storagePath;

  const { data, error } = await supabaseAdmin.storage.from(BUCKET).list(folder, {
    search: name,
    limit: 100,
  });
  if (error) {
    console.error("[storage] falha ao inspecionar arquivo", error.message);
    return; // não bloqueia o candidato por falha de inspeção
  }

  const obj = (data ?? []).find((o) => o.name === name);
  if (!obj) throw new Error("Arquivo não encontrado. Envie novamente.");

  const meta = (obj.metadata ?? {}) as { size?: number; mimetype?: string };
  const size = typeof meta.size === "number" ? meta.size : null;
  const mime = meta.mimetype ?? null;

  const remove = async () => {
    await supabaseAdmin.storage.from(BUCKET).remove([storagePath]);
  };

  if (size !== null && size <= 0) {
    await remove();
    throw new Error("Arquivo vazio. Envie novamente.");
  }
  if (size !== null && size > MAX_FILE_BYTES) {
    await remove();
    throw new Error("Arquivo maior que 10 MB. Reduza a qualidade da foto e tente novamente.");
  }
  if (mime && !isAllowedMime(mime)) {
    await remove();
    throw new Error("Tipo de arquivo não aceito. Envie PDF, DOCX ou foto.");
  }
}
