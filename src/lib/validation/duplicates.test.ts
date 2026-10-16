import { describe, it, expect } from "vitest";
import { similarity, DUPLICATE_THRESHOLD } from "./duplicates";

describe("similarity", () => {
  it("mesmo CPF válido = 100", () => {
    expect(similarity({ names: ["A"], cpf: "498.938.998-00" }, { names: ["B"], cpf: "49893899800" }).score).toBe(100);
  });
  it("CPF diferente nunca une", () => {
    expect(similarity({ names: ["Ana"], cpf: "49893899800", email: "x@y" }, { names: ["Ana"], cpf: "41388756897", email: "x@y" }).score).toBe(0);
  });
  it("só nome igual não é duplicidade", () => {
    expect(similarity({ names: ["Marta de Lima"], email: "a@a" }, { names: ["Marta de Lima"] }).score).toBe(0);
  });
  it("nome + nascimento iguais passa de 90%", () => {
    const r = similarity({ names: ["MARTA DE LIMA"], birth: "19/10/1993" }, { names: ["Marta de Lima"], birth: "19/10/1993" });
    expect(r.score).toBeGreaterThanOrEqual(DUPLICATE_THRESHOLD);
  });
  it("nome igual com e-mail diferente fica abaixo de 90%", () => {
    const r = similarity({ names: ["Marta de Lima"], email: "a@a.com" }, { names: ["Marta de Lima"], email: "b@b.com" });
    expect(r.score).toBeLessThan(DUPLICATE_THRESHOLD);
  });
});
