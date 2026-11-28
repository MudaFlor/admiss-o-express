import { describe, expect, it } from "vitest";
import { isLegacyImportOpen, parseRows, toIsoDate } from "@/lib/import/legacy-import";

describe("importação de cadastros antigos", () => {
  it("fica disponível só até o prazo", () => {
    expect(isLegacyImportOpen("2027-01-31")).toBe(true);
    expect(isLegacyImportOpen("2027-02-01")).toBe(false);
  });
  it("converte datas brasileiras e rejeita inválidas", () => {
    expect(toIsoDate("05/01/2026")).toBe("2026-01-05");
    expect(toIsoDate("31/02/2026")).toBeNull();
  });
  it("lê planilha colada de colaboradores e exige matrícula única", () => {
    const text = "Matrícula\tNome\tAdmissão\n10\tANA\t02/01/2026\n10\tBIA\t03/01/2026\n\tCAIO\t03/01/2026";
    const { rows } = parseRows("colaboradores", text);
    expect(rows[0]!.value?.matricula).toBe("10");
    expect(rows[1]!.errors).toContain("Matrícula repetida na planilha");
    expect(rows[2]!.errors).toContain("Matrícula obrigatória");
  });
  it("aponta colunas obrigatórias ausentes", () => {
    expect(parseRows("candidatos", "Nome;CPF\nAna;").missing).toEqual(["data_cadastro"]);
  });
});
