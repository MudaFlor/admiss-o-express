import { describe, expect, it } from "vitest";
import { resumeDocumentValues, validateResumeFile, resumeFileType } from "./resume-file";

const pdf = new TextEncoder().encode("%PDF-1.7\nconteúdo");

describe("anexo do currículo em PDF", () => {
  it("aceita um PDF válido dentro do limite", () => {
    expect(validateResumeFile("curriculo.pdf", pdf)).toBeNull();
  });

  it("recusa outro formato mesmo quando a extensão informada é PDF", () => {
    expect(validateResumeFile("curriculo.pdf", new TextEncoder().encode("arquivo de texto"))).not.toBeNull();
    expect(validateResumeFile("curriculo.docx", pdf)).not.toBeNull();
  });

  it.each([
    ["jpg", [0xff, 0xd8, 0xff], "image/jpeg"],
    ["jpeg", [0xff, 0xd8, 0xff], "image/jpeg"],
    ["png", [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], "image/png"],
    ["webp", [82, 73, 70, 70, 0, 0, 0, 0, 87, 69, 66, 80], "image/webp"],
    ["doc", [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1], "application/msword"],
    ["docx", [0x50, 0x4b, 0x03, 0x04], "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
  ])("aceita currículo %s e preserva seu tipo", (extension, signature, mime) => {
    expect(validateResumeFile(`curriculo.${extension}`, new Uint8Array(signature))).toBeNull();
    expect(resumeFileType(`curriculo.${extension}`)?.mime).toBe(mime);
    expect(validateResumeFile(`curriculo.${extension}`, pdf)).not.toBeNull();
  });

  it("mantém na ficha somente os dados realmente extraídos do currículo", () => {
    expect(resumeDocumentValues({
      full_name: "Maria Teste",
      idade: 32,
      palavras_chave: ["Atendimento", "Vendas"],
      email: null,
    })).toEqual({
      full_name: "Maria Teste",
      idade: "32",
      palavras_chave: "Atendimento, Vendas",
    });
  });
});
