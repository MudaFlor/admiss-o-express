import { describe, expect, it } from "vitest";
import { resolveCandidateSex } from "./candidate-sex";

describe("resolveCandidateSex", () => {
  it("reconhece o sexo salvo na ficha mesmo quando o campo principal está vazio", () => {
    expect(resolveCandidateSex("", { sexo: " Feminino " }, [])).toBe("feminino");
    expect(resolveCandidateSex(null, { sexo: "MASCULINO" }, [])).toBe("masculino");
  });

  it("reconhece o sexo consolidado do RG exibido na ficha", () => {
    const documents = [{ type: "rg", ocr_data: { values: { sexo: "F" } } }];
    expect(resolveCandidateSex(null, {}, documents)).toBe("feminino");
  });

  it("mantém a correção do RH como prioridade sobre o documento", () => {
    const documents = [{ type: "rg", ocr_data: { values: { sexo: "feminino" } } }];
    expect(resolveCandidateSex(null, { sexo: "masculino", _rh_overrides: ["sexo"] }, documents)).toBe("masculino");
  });

  it("continua exigindo o sexo quando ele não está preenchido", () => {
    expect(resolveCandidateSex(null, { sexo: "" }, [])).toBeNull();
  });
});
