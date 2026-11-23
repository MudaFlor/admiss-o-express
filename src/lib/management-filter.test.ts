import { describe, it, expect } from "vitest";
import { buildBuckets, bucketRange, periodSummary, sameDepartment, selectedPeriodRange } from "./management-filter";

describe("filtro de gestão", () => {
  it("anual mostra janeiro a dezembro do ano escolhido", () => {
    const b = buildBuckets({ period: "anual", year: 2025, count: 6 });
    expect(b.map((x) => x.key)).toEqual(Array.from({ length: 12 }, (_, i) => `2025-${String(i + 1).padStart(2, "0")}`));
    expect(bucketRange(b)).toEqual({ fromISO: "2025-01-01", toISO: "2025-12-31" });
  });
  it("mensal termina no mês escolhido", () => {
    const b = buildBuckets({ period: "mensal", year: 2026, month: 2, count: 6 });
    expect(b[0]?.key).toBe("2025-09");
    expect(b[b.length - 1]?.key).toBe("2026-02");
    expect(bucketRange(b).toISO).toBe("2026-02-28");
  });
  it("totais anuais consideram somente o ano selecionado", () => {
    expect(selectedPeriodRange({ period: "anual", year: 2024, month: 11 })).toEqual({
      fromISO: "2024-01-01",
      toISO: "2024-12-31",
    });
    expect(periodSummary({ period: "anual", year: 2024, month: 11 })).toBe("Ano 2024");
  });
  it("totais mensais consideram somente o mês selecionado", () => {
    expect(selectedPeriodRange({ period: "mensal", year: 2024, month: 2 })).toEqual({
      fromISO: "2024-02-01",
      toISO: "2024-02-29",
    });
    expect(periodSummary({ period: "mensal", year: 2024, month: 2 })).toBe("Fevereiro de 2024");
  });
  it("departamento ignora maiúsculas e vazio mostra todos", () => {
    expect(sameDepartment("Produção", "produção")).toBe(true);
    expect(sameDepartment("Vendas", "Produção")).toBe(false);
    expect(sameDepartment(null, "")).toBe(true);
  });
});
