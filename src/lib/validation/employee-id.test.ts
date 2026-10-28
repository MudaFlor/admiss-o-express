import { describe, expect, it } from "vitest";
import { checkNewEmployee } from "./employee-id";

const existing = [{ matricula: "123", cpf: "111.222.333-44" }];

describe("checkNewEmployee", () => {
  it("recusa matrícula vazia", () => {
    expect(checkNewEmployee({ matricula: "  ", existing })).toMatchObject({ ok: false, code: "MATRICULA_REQUIRED" });
  });
  it("bloqueia matrícula repetida com CADASTRO JÁ EXISTE", () => {
    expect(checkNewEmployee({ matricula: "123", existing })).toEqual({ ok: false, code: "DUPLICATE_ID", message: "CADASTRO JÁ EXISTE" });
  });
  it("CPF repetido pede confirmação", () => {
    expect(checkNewEmployee({ matricula: "999", cpf: "11122233344", existing })).toMatchObject({ ok: false, code: "CPF_EXISTS" });
  });
  it("CPF repetido confirmado segue com nova matrícula", () => {
    expect(checkNewEmployee({ matricula: "999", cpf: "11122233344", existing, confirmDuplicateCpf: true })).toEqual({ ok: true });
  });
  it("CPF confirmado ainda exige matrícula nova", () => {
    expect(checkNewEmployee({ matricula: "123", cpf: "11122233344", existing, confirmDuplicateCpf: true })).toMatchObject({ code: "DUPLICATE_ID" });
  });
});
