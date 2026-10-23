import { describe, expect, it } from "vitest";
import { candidateContactIssues, RACE_OPTIONS, requiresCtps, reviewedOcrData } from "./candidate-submission";

describe("candidate submission", () => {
  it("requires email", () => {
    expect(candidateContactIssues({ email: "", cor_raca: "parda" })).toHaveProperty("email");
    expect(candidateContactIssues({ email: "marta@example.com", cor_raca: "parda" })).toEqual({});
  });
  it("rejects invalid email", () => {
    expect(candidateContactIssues({ email: "marta", cor_raca: "parda" })).toHaveProperty("email");
  });
  it("accepts only offered race choices, including non-disclosure", () => {
    for (const option of RACE_OPTIONS) {
      expect(candidateContactIssues({ email: "marta@example.com", cor_raca: option.value })).toEqual({});
    }
    expect(candidateContactIssues({ email: "marta@example.com", cor_raca: "" })).toHaveProperty("cor_raca");
    expect(candidateContactIssues({ email: "marta@example.com", cor_raca: "arbitrario" })).toHaveProperty("cor_raca");
  });
  it("requires CTPS regardless of other configured documents", () => {
    expect(requiresCtps(["rg", "cpf"])).toBe(true);
    expect(requiresCtps(["rg", "cpf", "ctps"])).toBe(false);
  });
  it("retains OCR and exposes candidate corrections without injecting fields", () => {
    const original = { values: { nome: "MARTA DE L1MA", data_emissao: "01/02/2020", cpf: "52998224725" }, evidences: { nome: "MARTA DE L1MA" } };
    const result = reviewedOcrData(original, { nome: "MARTA DE LIMA", unexpected: "ignored" });
    expect(result.values).toEqual({ nome: "MARTA DE LIMA", data_emissao: "01/02/2020", cpf: "52998224725" });
    expect(original.values.nome).toBe("MARTA DE L1MA");
    expect(result.evidences).toEqual(original.evidences);
  });
});