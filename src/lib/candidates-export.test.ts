import { describe, it, expect } from "vitest";
import { CANDIDATE_EXPORT_HEADERS, candidateExportRows } from "./candidates-export";

describe("planilha de candidatos", () => {
  it("mantém a ordem de colunas pedida pelo RH", () => {
    expect(CANDIDATE_EXPORT_HEADERS).toEqual([
      "Nome", "Cidade", "Cargo", "Departamento", "Solicitante da Vaga", "Recrutador",
      "Data da entrevista", "Situação da entrevista", "Observações da entrevista", "Teste",
      "Admissão", "Categoria", "Integração", "Meio de recebimento do Curriculo", "Recontratar?",
    ]);
  });
  it("preenche cada coluna com o dado do candidato", () => {
    const [r] = candidateExportRows([{ full_name: "Ana", position: "Auxiliar", solicitante_vaga: "Carlos Souza", data_entrevista: "2026-11-10", recontratar: "Sim" }]);
    expect(r[0]).toBe("Ana");
    expect(r[2]).toBe("Auxiliar");
    expect(r[4]).toBe("Carlos Souza");
    expect(r[6]).toBe("10/11/2026");
    expect(r[14]).toBe("Sim");
  });
});
