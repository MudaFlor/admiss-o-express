import { describe, it, expect } from "vitest";
import { sanitizePortalFormData } from "./portal-form-data";
describe("sanitizePortalFormData", () => {
  it("drops server-managed keys and keeps stored values", () => {
    const r = sanitizePortalFormData({ email: "a@b.c", conduzido_por_rh: { x: 1 }, perfil_recrutamento: { y: 1 } }, { perfil_recrutamento: { orig: true } });
    expect(r).toEqual({ email: "a@b.c", perfil_recrutamento: { orig: true } });
  });
});
