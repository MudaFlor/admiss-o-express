import { describe, it, expect } from "vitest";
import { isIllegible } from "./legibility";

describe("isIllegible", () => {
  it("recusa RG quando a leitura falha", () => {
    expect(isIllegible("rg", { status: "falha", fields: {} })).toBe(true);
  });
  it("recusa CPF sem nenhum campo extraído", () => {
    expect(isIllegible("cpf", { status: "sucesso", fields: {} })).toBe(true);
  });
  it("aceita RG com dados extraídos", () => {
    expect(isIllegible("rg", { status: "sucesso", fields: { nome: "A" } })).toBe(false);
  });
  it("recusa CTPS sem leitura", () => {
    expect(isIllegible("ctps", { status: "sucesso", fields: {} })).toBe(true);
  });
  it("aceita CTPS com nome, emissão e CPF extraídos", () => {
    expect(isIllegible("ctps", { status: "sucesso", fields: { nome: "MARTA DE LIMA", data_emissao: "01/02/2020", cpf: "52998224725" } })).toBe(false);
  });
});
