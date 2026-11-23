import { describe, expect, it } from "vitest";
import { sortEmployees, type EmployeeSortKey } from "./employee-sort";

const rows = [
  { full_name: "Zilda Souza", position: "Analista", department: "Financeiro", admission_date: "2026-03-10", termination_date: "2026-04-01" },
  { full_name: "Ana Lima", position: "Coordenadora", department: "RH", admission_date: "2025-01-15", termination_date: null },
  { full_name: "Bruno Reis", position: "Assistente", department: "Logística", admission_date: "2026-01-20", termination_date: null },
];

describe("ordenação da lista de colaboradores", () => {
  it("ordena nomes em ordem crescente e decrescente", () => {
    expect(sortEmployees(rows, { key: "full_name", direction: "asc" }).map((row) => row.full_name)).toEqual([
      "Ana Lima", "Bruno Reis", "Zilda Souza",
    ]);
    expect(sortEmployees(rows, { key: "full_name", direction: "desc" }).map((row) => row.full_name)).toEqual([
      "Zilda Souza", "Bruno Reis", "Ana Lima",
    ]);
  });

  it.each([
    ["position", ["Analista", "Assistente", "Coordenadora"]],
    ["department", ["Financeiro", "Logística", "RH"]],
    ["admission_date", ["2025-01-15", "2026-01-20", "2026-03-10"]],
  ] as const)("ordena %s pelos valores exibidos", (key, expected) => {
    const sortKey: EmployeeSortKey = key;
    expect(sortEmployees(rows, { key: sortKey, direction: "asc" }).map((row) => row[sortKey])).toEqual(expected);
    expect(sortEmployees(rows, { key: sortKey, direction: "desc" }).map((row) => row[sortKey])).toEqual([...expected].reverse());
  });

  it("ordena status ativo e desligado nas duas direções", () => {
    expect(sortEmployees(rows, { key: "status", direction: "asc" }).map((row) => row.full_name)).toEqual([
      "Ana Lima", "Bruno Reis", "Zilda Souza",
    ]);
    expect(sortEmployees(rows, { key: "status", direction: "desc" }).map((row) => row.full_name)).toEqual([
      "Zilda Souza", "Ana Lima", "Bruno Reis",
    ]);
  });
});
