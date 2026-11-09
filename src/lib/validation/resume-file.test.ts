import { describe, expect, it } from "vitest";
import { resumeDocumentValues, validateResumePdf } from "./resume-file";

const pdf = new TextEncoder().encode("%PDF-1.7\nconteúdo");

 describe("anexo do currículo em PDF", () => {
  it("aceita um PDF válido dentro do limite", () => {
    expect(validateResumePdf("curriculo.pdf", pdf)).toBeNull();
  });

  it("recusa outro formato mesmo quando a extensão informada é PDF", () => {
    expect(validateResumePdf("curriculo.pdf", new TextEncoder().encode("arquivo de texto")))
      .toBe("O arquivo não é um PDF válido. Anexe o currículo novamente.");
    expect(validateResumePdf("curriculo.docx", pdf)).toBe("Anexe o currículo em formato PDF.");
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
