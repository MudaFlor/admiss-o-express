import { describe, expect, it } from "vitest";
import { consolidateFicha } from "./ficha-consolidation";

const docs = [
  { type: "titulo_eleitor", ocr_data: { values: { data_nascimento: "23/05/1973" } } },
  { type: "rg", ocr_data: { values: { nome: "ANA SILVA", data_nascimento: "23/05/1978", nome_mae: "MARIA SILVA" } } },
  { type: "certidao", ocr_data: { values: { nome_mae: "OUTRA PESSOA" } } },
];

describe("consolidateFicha", () => {
  it("prefere o RG ao título para data de nascimento", () => {
    expect(consolidateFicha({}, docs).data.data_nascimento).toBe("23/05/1978");
  });
  it("documento oficial prevalece sobre o declarado", () => {
    expect(consolidateFicha({ nome_mae: "OUTRA PESSOA" }, docs).data.nome_mae).toBe("MARIA SILVA");
  });
  it("correção do RH prevalece sobre documento", () => {
    expect(consolidateFicha({ nome_mae: "MARIA S. SILVA", _rh_overrides: ["nome_mae"] }, docs).data.nome_mae).toBe("MARIA S. SILVA");
  });
});
