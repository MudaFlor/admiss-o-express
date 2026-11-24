import { describe, expect, it } from "vitest";
import { filterEmployees } from "./employee-filter";

const rows = [
  { full_name: "Ana Lima", matricula_esocial: "1001" },
  { full_name: "Bruno Reis", matricula_esocial: "1002" },
  { full_name: "Zilda Souza", matricula_esocial: null },
  { full_name: "Zilda Souza", matricula_esocial: "2001" },
];

describe("filtros da lista de colaboradores", () => {
  it("filtra por matrícula exata e parcial", () => {
    expect(filterEmployees(rows, { search: "", matricula: "1002" }).map((r) => r.full_name)).toEqual(["Bruno Reis"]);
    expect(filterEmployees(rows, { search: "", matricula: "20" }).map((r) => r.matricula_esocial)).toEqual(["2001"]);
  });

  it("filtra por matrícula ignorando pontos e traços", () => {
    const dotted = [
      { full_name: "Ana Lima", matricula_esocial: "123456.01.55" },
      { full_name: "Bruno Reis", matricula_esocial: "999" },
    ];
    expect(filterEmployees(dotted, { search: "", matricula: "123456.01" }).map((r) => r.full_name)).toEqual(["Ana Lima"]);
    expect(filterEmployees(dotted, { search: "", matricula: "60155" }).map((r) => r.full_name)).toEqual(["Ana Lima"]);
  });

  it("filtra por nome e por matrícula ao mesmo tempo", () => {
    expect(filterEmployees(rows, { search: "zilda", matricula: "2001" }).map((r) => r.full_name)).toEqual(["Zilda Souza"]);
    expect(filterEmployees(rows, { search: "zilda", matricula: "1001" })).toEqual([]);
  });

  it("sem filtros mantém todas as linhas, inclusive quem não tem matrícula", () => {
    expect(filterEmployees(rows, { search: "", matricula: "" })).toHaveLength(4);
  });
});
