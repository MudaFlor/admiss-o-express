import { describe, expect, it } from "vitest";
import { candidatePortalUrl } from "./public-url";
import { buildWhatsAppLink } from "./integrations/whatsapp";

describe("candidate correction links", () => {
  it("uses the published candidate portal address", () => {
    expect(candidatePortalUrl("11111111-1111-4111-8111-111111111111")).toBe(
      "https://docu-hire-buddy.lovable.app/c/11111111-1111-4111-8111-111111111111",
    );
  });

  it("preserves the public portal URL in the WhatsApp message", () => {
    const link = candidatePortalUrl("11111111-1111-4111-8111-111111111111");
    const message = new URL(buildWhatsAppLink("11999998888", `Corrija seus documentos: ${link}`));
    expect(message.searchParams.get("text")).toBe(
      "Corrija seus documentos: https://docu-hire-buddy.lovable.app/c/11111111-1111-4111-8111-111111111111",
    );
  });
});