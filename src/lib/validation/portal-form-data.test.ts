import { describe, it, expect } from "vitest";
import { sanitizePortalFormData } from "./portal-form-data";
describe("sanitizePortalFormData", () => {
  it("drops server-managed keys and keeps stored values", () => {
    const r = sanitizePortalFormData({ email: "a@b.c", conduzido_por_rh: { x: 1 }, perfil_recrutamento: { y: 1 } }, { perfil_recrutamento: { orig: true } });
    expect(r).toEqual({ email: "a@b.c", perfil_recrutamento: { orig: true } });
  });
  it("drops fields outside the candidate form", () => {
    const r = sanitizePortalFormData({ full_name: "ANA", status_extra: "x", aprovado: true }, {});
    expect(r).toEqual({ full_name: "ANA" });
  });
  it("rejects non-text values in form fields", () => {
    expect(() => sanitizePortalFormData({ cpf: { $gt: 1 } }, {})).toThrow();
  });
});
