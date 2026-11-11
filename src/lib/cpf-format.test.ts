import { describe, it, expect } from "vitest";
import { maskCpf, formatCpf, cpfAware } from "@/lib/cpf";

describe("formato do CPF", () => {
  it("exibe CPF completo como 000.000.000-00", () => {
    expect(formatCpf("12345678901")).toBe("123.456.789-01");
  });
  it("aplica a máscara durante a digitação", () => {
    expect(maskCpf("1234567")).toBe("123.456.7");
    expect(maskCpf("123456789012345")).toBe("123.456.789-01");
  });
  it("formata apenas campos de CPF", () => {
    expect(cpfAware("cpf", "12345678901")).toBe("123.456.789-01");
    expect(cpfAware("rg", "12345678901")).toBe("12345678901");
  });
});
