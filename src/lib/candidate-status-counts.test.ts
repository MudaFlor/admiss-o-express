import { describe, expect, it } from "vitest";
import { countCandidateStatuses } from "./candidate-status-counts";

describe("contagem do pipeline", () => {
  it("mantém aprovados e admitidos em contagens independentes", () => {
    const { counts, total } = countCandidateStatuses([
      { status: "aprovado" }, { status: "aprovado" },
      { status: "admitido" }, { status: "pendente" },
      { status: "em_analise" }, { status: "rejeitado" },
    ]);
    expect(counts).toEqual({ pendente: 1, em_analise: 1, aprovado: 2, admitido: 1, rejeitado: 1 });
    expect(total).toBe(6);
  });
  it("move a contagem de aprovado para admitido após a admissão", () => {
    const candidate = { status: "aprovado" };
    expect(countCandidateStatuses([candidate]).counts.aprovado).toBe(1);
    candidate.status = "admitido";
    expect(countCandidateStatuses([candidate])).toEqual({
      counts: { pendente: 0, em_analise: 0, aprovado: 0, admitido: 1, rejeitado: 0 }, total: 1,
    });
  });
  it("retorna zeros sem candidatos e não gera NaN para status desconhecido", () => {
    expect(countCandidateStatuses([])).toEqual({
      counts: { pendente: 0, em_analise: 0, aprovado: 0, admitido: 0, rejeitado: 0 }, total: 0,
    });
    expect(Object.values(countCandidateStatuses([{ status: "outro" }]).counts)).toEqual([0, 0, 0, 0, 0]);
  });
});