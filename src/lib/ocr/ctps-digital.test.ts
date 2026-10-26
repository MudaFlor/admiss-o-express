import { describe, expect, test } from "bun:test";
import { isCtpsDigital } from "./legibility";

describe("isCtpsDigital", () => {
  test("aceita quando consta 'Carteira de Trabalho Digital'", () => {
    expect(isCtpsDigital({ termo_ctps_digital: "Carteira de Trabalho Digital" })).toBe(true);
  });
  test("recusa carteira física sem o termo", () => {
    expect(isCtpsDigital({ nome: "MARTA DE LIMA", cpf: "52998224725" })).toBe(false);
  });
  test("recusa termo diferente", () => {
    expect(isCtpsDigital({ termo_ctps_digital: "Carteira de Trabalho e Previdência Social" })).toBe(false);
  });
});
