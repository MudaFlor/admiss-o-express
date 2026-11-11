import { describe, expect, it } from "vitest";
import { candidateRegistrationDateSchema, candidateRegistrationRangeSchema, currentRegistrationDate, hasCandidateRegistrationDateChanged } from "./candidate-registration-date";

describe("data de cadastro do candidato", () => {
  it("exige a data para cadastrar", () => {
    expect(candidateRegistrationDateSchema.safeParse(undefined).success).toBe(false);
    expect(candidateRegistrationDateSchema.safeParse("").success).toBe(false);
    expect(candidateRegistrationDateSchema.parse("2026-11-10")).toBe("2026-11-10");
  });
  it("preenche hoje no horário de São Paulo mesmo próximo à meia-noite UTC", () => {
    expect(currentRegistrationDate(new Date("2026-11-10T02:59:00Z"))).toBe("2026-11-09");
    expect(currentRegistrationDate(new Date("2026-11-10T10:51:00Z"))).toBe("2026-11-10");
  });
  it("permite alterar a data e recusa datas inexistentes", () => {
    expect(candidateRegistrationDateSchema.parse("2026-10-05")).toBe("2026-10-05");
    expect(candidateRegistrationDateSchema.safeParse("2026-02-30").success).toBe(false);
  });
  it("aceita limites inclusivos e impede período invertido", () => {
    expect(candidateRegistrationRangeSchema.parse({ cadastro_de: "2026-11-10", cadastro_ate: "2026-11-10" }))
      .toEqual({ cadastro_de: "2026-11-10", cadastro_ate: "2026-11-10" });
    expect(candidateRegistrationRangeSchema.safeParse({ cadastro_de: "2026-11-11", cadastro_ate: "2026-11-10" }).success).toBe(false);
  });
  it("só exige confirmação quando a data de inclusão realmente muda", () => {
    expect(hasCandidateRegistrationDateChanged("2026-11-11", "2026-11-11")).toBe(false);
    expect(hasCandidateRegistrationDateChanged(null, "")).toBe(false);
    expect(hasCandidateRegistrationDateChanged("2026-11-11", "2026-11-12")).toBe(true);
  });
});