import { describe, it, expect } from "vitest";
import { resolveCertidaoParents } from "./certidao-parents";

const rg = { nome_mae: "Maria da Silva", nome_pai: "José da Silva" };

describe("resolveCertidaoParents", () => {
  it("troca para o bloco que confere com o RG quando a IA pegou os pais do cônjuge", () => {
    const r = resolveCertidaoParents({ nome_mae: "Ana Souza", nome_pai: "Pedro Souza", conjuge_nome_mae: "MARIA DA SILVA", conjuge_nome_pai: "José da Silva" }, [rg]);
    expect(r.nome_mae).toBe("MARIA DA SILVA");
    expect(r.nome_pai).toBe("José da Silva");
  });
  it("mantém quando já confere com o RG", () => {
    const r = resolveCertidaoParents({ nome_mae: "Maria da Silva", nome_pai: "Outro" }, [rg]);
    expect(r.nome_mae).toBe("Maria da Silva");
  });
  it("descarta filiação que não confere com nenhum documento", () => {
    const r = resolveCertidaoParents({ nome_mae: "Ana Souza", nome_pai: "Pedro Souza" }, [rg]);
    expect(r.nome_mae).toBeNull();
  });
  it("sem RG/CNH mantém o lido", () => {
    expect(resolveCertidaoParents({ nome_mae: "Ana" }, []).nome_mae).toBe("Ana");
  });
});
