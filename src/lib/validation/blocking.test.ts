import { describe, it, expect } from "vitest";
import { crossCheckCandidate, blockingIssues } from "./cross-check";

const rg = { type: "rg", ocr_data: { values: { nome: "MARIA SILVA", cpf: "52998224725", data_nascimento: "01/02/1990", nome_mae: "ANA SILVA" } } };
const ok = { full_name: "Maria Silva", cpf: "529.982.247-25", data_nascimento: "01/02/1990", nome_mae: "Ana Silva" };

describe("blockingIssues", () => {
  it("libera envio quando tudo confere", () => {
    const r = crossCheckCandidate({ declared: ok, documents: [rg] });
    expect(blockingIssues(r, ok)).toEqual({});
  });
  it("bloqueia campo de referência vazio", () => {
    const d = { ...ok, nome_mae: "" };
    const r = crossCheckCandidate({ declared: d, documents: [] });
    expect(Object.keys(blockingIssues(r, d))).toContain("nome_mae");
  });
  it("bloqueia data divergente do RG", () => {
    const d = { ...ok, data_nascimento: "02/02/1990" };
    const r = crossCheckCandidate({ declared: d, documents: [rg] });
    expect(Object.keys(blockingIssues(r, d))).toEqual(["data_nascimento"]);
  });
});
