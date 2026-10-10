import { describe, expect, it } from "vitest";
import { CreditHudPresentation } from "../src/ui/credit-hud-presentation";

describe("CreditHudPresentation", () => {
  it("keeps canonical reward pending until crystal presentation arrives", () => {
    const hud = new CreditHudPresentation();
    expect(hud.sync(100)).toBe(100);
    expect(hud.claimApplied(7, 107)).toBe(100);
    expect(hud.display(107)).toBe(100);
    expect(hud.pendingDelta()).toBe(7);

    expect(hud.present(3, 107)).toBe(103);
    expect(hud.present(4, 107)).toBe(107);
    expect(hud.pendingDelta()).toBe(0);
  });

  it("syncs instead of applying stale pending animation after an external wallet change", () => {
    const hud = new CreditHudPresentation();
    hud.sync(100);
    hud.claimApplied(10, 110);
    const beforeEpoch = hud.presentationEpoch();

    expect(hud.display(85)).toBe(85);
    expect(hud.presentationEpoch()).toBe(beforeEpoch + 1);
    expect(hud.pendingDelta()).toBe(0);

    expect(hud.present(10, 85)).toBe(85);
  });

  it("handles a capped wallet delta smaller than nominal reward", () => {
    const hud = new CreditHudPresentation();
    hud.sync(999_998);
    expect(hud.claimApplied(1, 999_999)).toBe(999_998);
    expect(hud.present(20, 999_999)).toBe(999_999);
  });
});
