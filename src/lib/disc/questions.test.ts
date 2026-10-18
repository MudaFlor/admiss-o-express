import { describe, expect, it } from "vitest";
import { scoreDisc, DISC_GROUPS } from "./questions";

describe("scoreDisc", () => {
  it("perfil predominante D quando maioria é D", () => {
    const a = Array(24).fill("S") as never[];
    for (let i = 0; i < 16; i++) a[i] = "D" as never;
    const r = scoreDisc(a);
    expect(r.profile).toBe("D");
    expect(r.scores.D).toBe(67);
  });
  it("perfil combinado quando dois fatores estão próximos", () => {
    const a = [...Array(12).fill("I"), ...Array(11).fill("C"), "D"] as never[];
    expect(scoreDisc(a).profile).toBe("IC");
  });
  it("questionário tem 24 grupos", () => expect(DISC_GROUPS.length).toBe(24));
});
