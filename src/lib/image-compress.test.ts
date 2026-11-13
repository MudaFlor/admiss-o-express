import { describe, it, expect } from "vitest";
import { targetSize, shouldCompress } from "./image-compress";
describe("image compression rules", () => {
  it("reduz foto 4000x3000 para lado maior 2400", () => {
    expect(targetSize(4000, 3000)).toEqual({ width: 2400, height: 1800 });
  });
  it("não amplia imagens pequenas", () => {
    expect(targetSize(1200, 800)).toEqual({ width: 1200, height: 800 });
  });
  it("nunca comprime PDF", () => {
    expect(shouldCompress("application/pdf", 9e6, 0, 0)).toBe(false);
  });
  it("mantém foto pequena e leve intacta", () => {
    expect(shouldCompress("image/jpeg", 500_000, 1600, 1200)).toBe(false);
  });
  it("comprime foto pesada de celular", () => {
    expect(shouldCompress("image/jpeg", 12e6, 4000, 3000)).toBe(true);
  });
});
