import { describe, expect, it } from "vitest";
import { candidateRegistrationAddress, registrationDuplicateReasons as reasons } from "./candidate-registration-duplicates";

describe("alerta de cadastro duplicado", () => {
  it("compara nome completo ignorando acentos e caixa", () => {
    expect(reasons({ full_name: "Marcelo Patrício da Silva" }, { full_name: "MARCELO PATRICIO DA SILVA" })).toEqual(["Nome"]);
    expect(reasons({ full_name: "Marcelo" }, { full_name: "Marcelo Patrício" })).toEqual([]);
  });
  it("compara telefone com DDD e prefixo brasileiro", () => {
    expect(reasons({ phone: "+55 (11) 99999-8888" }, { phone: "11999998888" })).toEqual(["Telefone"]);
    expect(reasons({ phone: "21999998888" }, { phone: "11999998888" })).toEqual([]);
  });
  it("compara e-mail sem diferenciar caixa", () => {
    expect(reasons({ email: " Marta@exemplo.com " }, { email: "marta@exemplo.com" })).toEqual(["E-mail"]);
  });
  it("compara endereço sem confundir números distintos", () => {
    expect(reasons({ endereco: "Rua São José, 123" }, { endereco: "RUA SAO JOSE 123" })).toEqual(["Endereço"]);
    expect(reasons({ endereco: "Rua São José, 123" }, { endereco: "Rua São José, 124" })).toEqual([]);
  });
  it("não alerta para campos vazios ou candidatos distintos", () => {
    expect(reasons({}, {})).toEqual([]);
    expect(reasons({ full_name: "Marta de Lima", email: "marta@exemplo.com" }, { full_name: "Ana da Silva", email: "ana@exemplo.com" })).toEqual([]);
  });
  it("lê endereço tanto da ficha quanto do currículo", () => {
    expect(candidateRegistrationAddress({ ficha: { endereco: "Rua A 123" }, perfil_recrutamento: { endereco: "Rua B 456" } })).toBe("Rua A 123");
    expect(candidateRegistrationAddress({ perfil_recrutamento: { endereco: "Rua B 456" } })).toBe("Rua B 456");
  });
});