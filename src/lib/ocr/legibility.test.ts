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
  it("aceita CTPS mesmo sem leitura", () => {
    expect(isIllegible("ctps", { status: "sucesso", fields: {} })).toBe(false);
  });
});
