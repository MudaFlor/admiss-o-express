import { describe, expect, it } from "vitest";
import { buildWhatsAppLink } from "./whatsapp";

describe("buildWhatsAppLink", () => {
  it("adiciona 55 a celular brasileiro com DDD", () => {
    expect(buildWhatsAppLink("(11) 99999-8888", "oi")).toBe("https://wa.me/5511999998888?text=oi");
  });
  it("mantém número que já tem 55", () => {
    expect(buildWhatsAppLink("5511999998888", "oi")).toBe("https://wa.me/5511999998888?text=oi");
  });
});
