import { describe, it, expect } from "vitest";
import { buildBuckets, bucketRange, sameDepartment } from "./management-filter";

describe("filtro de gestão", () => {
  it("anual mostra janeiro a dezembro do ano escolhido", () => {
    const b = buildBuckets({ period: "anual", year: 2025, count: 6 });
    expect(b.map((x) => x.key)).toEqual(Array.from({ length: 12 }, (_, i) => `2025-${String(i + 1).padStart(2, "0")}`));
    expect(bucketRange(b)).toEqual({ fromISO: "2025-01-01", toISO: "2025-12-31" });
  });
  it("mensal termina no mês escolhido", () => {
    const b = buildBuckets({ period: "mensal", year: 2026, month: 2, count: 6 });
    expect(b[0].key).toBe("2025-09");
    expect(b[b.length - 1].key).toBe("2026-02");
    expect(bucketRange(b).toISO).toBe("2026-02-28");
  });
  it("departamento ignora maiúsculas e vazio mostra todos", () => {
    expect(sameDepartment("Produção", "produção")).toBe(true);
    expect(sameDepartment("Vendas", "Produção")).toBe(false);
    expect(sameDepartment(null, "")).toBe(true);
  });
});
