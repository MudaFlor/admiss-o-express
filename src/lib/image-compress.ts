// Compressão de fotos no navegador antes do envio. Mantém legibilidade para OCR:
// lado maior até 2400 px e JPEG qualidade 0.85. PDFs e arquivos pequenos ficam intactos.
export const MAX_IMAGE_SIDE = 2400;
export const COMPRESS_ABOVE_BYTES = 1.5 * 1024 * 1024;
export const JPEG_QUALITY = 0.85;

export function targetSize(w: number, h: number, max = MAX_IMAGE_SIDE) {
  const longest = Math.max(w, h);
  if (longest <= max) return { width: w, height: h };
  const k = max / longest;
  return { width: Math.round(w * k), height: Math.round(h * k) };
}

export function shouldCompress(type: string, size: number, w: number, h: number) {
  if (type !== "image/jpeg" && type !== "image/png") return false;
  return size > COMPRESS_ABOVE_BYTES || Math.max(w, h) > MAX_IMAGE_SIDE;
}

export async function compressImageFile(file: File): Promise<File> {
  if (typeof window === "undefined" || !/^image\/(jpeg|png)$/.test(file.type)) return file;
  try {
    const bmp = await createImageBitmap(file, { imageOrientation: "from-image" } as ImageBitmapOptions);
    try {
      if (!shouldCompress(file.type, file.size, bmp.width, bmp.height)) return file;
      const { width, height } = targetSize(bmp.width, bmp.height);
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return file;
      ctx.fillStyle = "#ffffff"; // fundo branco para PNG com transparência
      ctx.fillRect(0, 0, width, height);
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(bmp, 0, 0, width, height);
      const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", JPEG_QUALITY));
      canvas.width = canvas.height = 0;
      if (!blob || blob.size >= file.size) return file;
      const name = file.name.replace(/\.(png|jpe?g)$/i, "") + ".jpg";
      return new File([blob], name, { type: "image/jpeg", lastModified: file.lastModified });
    } finally {
      bmp.close();
    }
  } catch {
    return file; // em caso de falha, envia o original
  }
}
